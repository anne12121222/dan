
import React, { useState, useEffect, useCallback } from 'react';
import { UserRole, AllUserTypes, FightStatus, FightResult, UpcomingFight, Bet, Player, Agent, MasterAgent, Operator, Message, Transaction, CoinRequest, PlayerFightHistoryEntry, NotificationMessage } from './types';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { Session, User } from '@supabase/supabase-js';

import AuthView from './components/AuthView';
import PlayerView from './components/PlayerView';
import OperatorView from './components/OperatorView';
import AgentView from './components/AgentView';
import MasterAgentView from './components/MasterAgentView';
import Header from './components/Header';
import ChatModal from './components/ChatModal';
import Notification from './components/Notification';
import ChangePasswordModal from './components/ChangePasswordModal';

// --- Helper Functions ---
const mapDbProfileToUser = (profile: any): AllUserTypes => ({
  id: profile.id,
  name: profile.name,
  email: profile.email,
  role: profile.role as UserRole,
  coinBalance: profile.coin_balance,
  commissionBalance: profile.commission_balance,
  agentId: profile.agent_id,
  masterAgentId: profile.master_agent_id,
});

const App: React.FC = () => {
    // --- State ---
    const [session, setSession] = useState<Session | null>(null);
    const [currentUser, setCurrentUser] = useState<AllUserTypes | null>(null);
    const [loading, setLoading] = useState(true);
    const [allUsers, setAllUsers] = useState<{ [id: string]: AllUserTypes }>({});
    const [agents, setAgents] = useState<Agent[]>([]);
    
    // Fight State
    const [currentFight, setCurrentFight] = useState<FightResult | null>(null);
    const [fightHistory, setFightHistory] = useState<FightResult[]>([]);
    const [upcomingFights, setUpcomingFights] = useState<UpcomingFight[]>([]);
    const [currentBets, setCurrentBets] = useState<Bet[]>([]);
    const [timer, setTimer] = useState(60);
    
    // User-specific State
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [pendingCoinRequests, setPendingCoinRequests] = useState<CoinRequest[]>([]);
    const [unreadMessageCounts, setUnreadMessageCounts] = useState<{ [senderId: string]: number }>({});
    
    // UI State
    const [notification, setNotification] = useState<NotificationMessage | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [chatTarget, setChatTarget] = useState<AllUserTypes | null>(null);
    const [isSettingsModalOpen, setSettingsModalOpen] = useState(false);


    // --- Data Fetching and Real-time Subscriptions ---

    const fetchInitialData = useCallback(async (user: User) => {
      if (!supabase) return;
      setLoading(true);

      // Fetch all users for name lookups
      const { data: profiles, error: profilesError } = await supabase.from('profiles').select('*');
      if (profilesError) console.error('Error fetching profiles:', profilesError);
      else {
        const usersMap = Object.fromEntries(profiles.map(p => [p.id, mapDbProfileToUser(p)]));
        setAllUsers(usersMap);
        setAgents(profiles.filter(p => p.role === UserRole.AGENT).map(p => mapDbProfileToUser(p) as Agent));
      }

      // Fetch current fight and history
      const { data: fights, error: fightsError } = await supabase.from('fights').select('*').order('id', { ascending: false });
      if (fightsError) console.error('Error fetching fights:', fightsError);
      else if (fights && fights.length > 0) {
        setCurrentFight(fights[0] as FightResult);
        setFightHistory(fights as FightResult[]);
      }

      const { data: upcoming, error: upcomingError } = await supabase.from('upcoming_fights').select('*').order('id', { ascending: true });
      if (upcomingError) console.error('Error fetching upcoming fights:', upcomingError);
      // FIX: Cast the data from Supabase to the expected UpcomingFight[] type.
      // The 'participants' property is typed as 'Json' from the DB but is a structured object in the app.
      else setUpcomingFights((upcoming || []) as UpcomingFight[]);
      
      const { data: userTransactions, error: txError } = await supabase.from('transactions').select('*').or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`);
      if (txError) console.error('Error fetching transactions:', txError);
      // FIX: Map database transaction objects to the application's Transaction type.
      // This resolves property name mismatches (e.g., from_user_id -> from) and type differences.
      else {
        const mappedTransactions: Transaction[] = (userTransactions || []).map(tx => ({
            id: String(tx.id),
            from: tx.from_user_id || 'MINT',
            to: tx.to_user_id,
            amount: tx.amount,
            type: tx.type as 'TRANSFER' | 'COMMISSION' | 'MINT',
            timestamp: tx.created_at
        }));
        setTransactions(mappedTransactions);
      }

      setLoading(false);
    }, []);

    useEffect(() => {
        if (!supabase) {
            setLoading(false);
            return;
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            setSession(session);
            if (session?.user) {
                const { data, error } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
                if (error) console.error('Error fetching user profile:', error);
                else if (data) {
                    const userProfile = mapDbProfileToUser(data);
                    setCurrentUser(userProfile);
                    fetchInitialData(session.user);
                }
            } else {
                setCurrentUser(null);
                setLoading(false);
            }
        });
        return () => subscription.unsubscribe();
    }, [fetchInitialData]);
    
    // Real-time subscriptions
    useEffect(() => {
        if (!supabase || !currentUser) return;
        
        const fightsChannel = supabase.channel('fights-channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'fights' }, async () => {
                const { data: fights, error } = await supabase.from('fights').select('*').order('id', { ascending: false });
                if (error) console.error(error);
                else if (fights && fights.length > 0) {
                    setCurrentFight(fights[0] as FightResult);
                    setFightHistory(fights as FightResult[]);
                }
            }).subscribe();
            
        const upcomingFightsChannel = supabase.channel('upcoming-fights-channel')
             .on('postgres_changes', { event: '*', schema: 'public', table: 'upcoming_fights' }, async () => {
                const { data, error } = await supabase.from('upcoming_fights').select('*').order('id', { ascending: true });
                if (error) console.error(error);
                // FIX: Cast the data from Supabase to the expected UpcomingFight[] type.
                // The 'participants' property is typed as 'Json' from the DB but is a structured object in the app.
                else setUpcomingFights((data || []) as UpcomingFight[]);
             }).subscribe();

        const betsChannel = supabase.channel('bets-channel')
             .on('postgres_changes', { event: '*', schema: 'public', table: 'bets' }, async () => {
                if (currentFight) {
                    const { data, error } = await supabase.from('bets').select('*').eq('fight_id', currentFight.id);
                    if (error) console.error(error);
                    // FIX: Map database bet objects to the application's Bet type.
                    // This resolves property name mismatches (e.g., user_id -> userId).
                    else {
                        const mappedBets: Bet[] = (data || []).map(b => ({
                            id: String(b.id),
                            userId: b.user_id,
                            fightId: b.fight_id,
                            choice: b.choice as 'RED' | 'WHITE',
                            amount: b.amount,
                        }));
                        setCurrentBets(mappedBets);
                    }
                }
             }).subscribe();

        const profilesChannel = supabase.channel('profiles-channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, async (payload) => {
                const updatedProfile = mapDbProfileToUser(payload.new);
                setAllUsers(prev => ({ ...prev, [updatedProfile.id]: updatedProfile }));
                if (updatedProfile.id === currentUser.id) {
                    setCurrentUser(updatedProfile); // Update current user's balance in real-time
                }
            }).subscribe();

        // More subscriptions for transactions, messages, etc. can be added here
        
        return () => {
            supabase.removeChannel(fightsChannel);
            supabase.removeChannel(upcomingFightsChannel);
            supabase.removeChannel(betsChannel);
            supabase.removeChannel(profilesChannel);
        };

    }, [currentUser, currentFight]);

    // Timer logic
    useEffect(() => {
        if (currentFight?.status === FightStatus.BETTING_OPEN) {
            const fightStartTime = new Date(currentFight.created_at).getTime();
            const interval = setInterval(() => {
                const elapsed = Math.floor((Date.now() - fightStartTime) / 1000);
                const timeLeft = 60 - elapsed;
                setTimer(timeLeft > 0 ? timeLeft : 0);
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [currentFight]);


    // --- Handlers ---
    const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
        setNotification({ message, type });
    };

    const handleLogin = async (email: string, password: string): Promise<string | null> => {
        if (!supabase) return "Supabase client not available.";
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return error ? error.message : null;
    };

    const handleRegister = async (name: string, email: string, password: string, agentId: string | null): Promise<string | null> => {
        if (!supabase) return "Supabase client not available.";
        const { error } = await supabase.auth.signUp({ 
            email, 
            password, 
            options: { data: { name, agent_id: agentId } } 
        });
        return error ? error.message : null;
    };

    const handleLogout = async () => {
        if (!supabase) return;
        await supabase.auth.signOut();
        setCurrentUser(null);
        setSession(null);
        showNotification("You have been logged out.", "success");
    };
    
    const handleChangePassword = async (oldPassword: string, newPassword: string): Promise<string | null> => {
        if (!supabase) return "Supabase not configured";
        // Note: Supabase doesn't have a direct "change password with old password" RPC.
        // A proper implementation would require a custom Edge Function for security.
        // For now, we use the user update method which assumes the user is logged in.
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if(error) return error.message;
        return null;
    };

    // --- RPC Handlers ---
    const rpcCall = async (functionName: any, args: any, successMessage: string) => {
        if (!supabase) return "Supabase not available.";
        const { error } = await supabase.rpc(functionName, args);
        if (error) {
            showNotification(error.message, 'error');
            return error.message;
        }
        showNotification(successMessage, 'success');
        return null;
    };

    const handlePlaceBet = (amount: number, choice: 'RED' | 'WHITE') => rpcCall('place_bet', { p_fight_id: currentFight!.id, p_choice: choice, p_amount: amount }, `Bet of ${amount} on ${choice} placed!`);
    const handleStartNextFight = () => rpcCall('start_next_fight', {}, 'Next fight started!');
    const handleCloseBetting = () => rpcCall('close_betting', { p_fight_id: currentFight!.id }, 'Betting is now closed.');
    const handleDeclareWinner = (winner: 'RED' | 'WHITE' | 'DRAW' | 'CANCELLED') => rpcCall('declare_winner', { p_fight_id: currentFight!.id, p_winner: winner }, `${winner} declared as winner!`);
    const handleAddUpcomingFight = (red: string, white: string) => rpcCall('add_upcoming_fight', { participants: { red, white } }, 'Upcoming fight added.');
    const handleCreateAgent = (name: string, email: string, password: string) => rpcCall('create_user', { p_name: name, p_email: email, p_password: password, p_role: 'AGENT', p_master_agent_id: currentUser!.id }, 'Agent created successfully!');
    const handleCreateCoinRequest = (amount: number) => {
        if (!supabase || !currentUser || !('agentId' in currentUser)) return Promise.resolve("Invalid user type");
        return rpcCall('create_coin_request', { p_to_user_id: currentUser.agentId, p_amount: amount }, `Requested ${amount} coins.`);
    };
    const handleRespondToCoinRequest = (requestId: string, response: 'APPROVED' | 'DECLINED') => rpcCall('respond_to_coin_request', { p_request_id: requestId, p_response: response }, `Request ${response.toLowerCase()}.`);
    

    // --- Derived State ---
    const pools = currentBets.reduce((acc, bet) => {
        if (bet.choice === 'RED') acc.meron += bet.amount;
        if (bet.choice === 'WHITE') acc.wala += bet.amount;
        return acc;
    }, { meron: 0, wala: 0 });

    const playerFightHistory: PlayerFightHistoryEntry[] = fightHistory.map(result => {
        const playerBetOnFight = currentBets.find(b => b.fightId === result.id && b.userId === currentUser?.id);
        let outcome: 'WIN' | 'LOSS' | 'REFUND' | null = null;
        if(playerBetOnFight) {
            if (result.winner === 'DRAW' || result.winner === 'CANCELLED') outcome = 'REFUND';
            else if (result.winner === playerBetOnFight.choice) outcome = 'WIN';
            else outcome = 'LOSS';
        }
        return { ...result, bet: playerBetOnFight || null, outcome };
    });
    
    // --- Render Logic ---
    const renderView = () => {
        if (loading) return <div className="min-h-screen flex items-center justify-center bg-zinc-900 text-white">Loading...</div>;
        if (!currentUser) return <AuthView onLogin={handleLogin} onRegister={handleRegister} isSupabaseConfigured={!!supabase} agents={agents} />;

        switch (currentUser.role) {
            case UserRole.PLAYER:
                // FIX: Removed redundant type assertion `as FightStatus` since `currentFight.status` now has the correct type from `FightResult`.
                return <PlayerView currentUser={currentUser as Player} fightStatus={currentFight?.status || FightStatus.SETTLED} lastWinner={currentFight?.winner || null} fightId={currentFight?.id || 0} timer={timer} pools={pools} fightHistory={playerFightHistory} onPlaceBet={handlePlaceBet} currentBet={currentBets.find(b => b.userId === currentUser.id) || null} isDrawerOpen={isDrawerOpen} onCloseDrawer={() => setIsDrawerOpen(false)} upcomingFights={upcomingFights} onCreateCoinRequest={handleCreateCoinRequest} />;
            case UserRole.OPERATOR:
                // FIX: Removed redundant type assertion `as FightStatus` since `currentFight.status` now has the correct type from `FightResult`.
                return <OperatorView currentUser={currentUser as Operator} fightStatus={currentFight?.status || FightStatus.SETTLED} lastWinner={currentFight?.winner || null} fightId={currentFight?.id || 0} timer={timer} fightHistory={fightHistory} upcomingFights={upcomingFights} currentBets={currentBets} allUsers={allUsers} onStartNextFight={handleStartNextFight} onCloseBetting={handleCloseBetting} onDeclareWinner={handleDeclareWinner} onAddUpcomingFight={handleAddUpcomingFight} />;
            case UserRole.AGENT:
                 const agentPlayers = Object.values(allUsers).filter(u => u.role === UserRole.PLAYER && 'agentId' in u && u.agentId === currentUser.id) as Player[];
                return <AgentView currentUser={currentUser as Agent} players={agentPlayers} transactions={transactions} onOpenChat={setChatTarget} allUsers={allUsers} unreadMessageCounts={unreadMessageCounts} pendingCoinRequests={pendingCoinRequests} onCreateCoinRequest={handleCreateCoinRequest} onRespondToCoinRequest={handleRespondToCoinRequest} />;
            case UserRole.MASTER_AGENT:
                const masterAgentAgents = Object.values(allUsers).filter(u => u.role === UserRole.AGENT && 'masterAgentId' in u && u.masterAgentId === currentUser.id) as Agent[];
                return <MasterAgentView currentUser={currentUser as MasterAgent} agents={masterAgentAgents} transactions={transactions} onOpenChat={setChatTarget} allUsers={allUsers} unreadMessageCounts={unreadMessageCounts} pendingCoinRequests={pendingCoinRequests} onCreateAgent={handleCreateAgent} onRespondToCoinRequest={handleRespondToCoinRequest} />;
            default:
                return <div className="text-red-500">Error: Unknown user role.</div>;
        }
    };
    
    return (
        <div className="bg-zinc-900 text-gray-200 min-h-screen font-sans">
            {currentUser && <Header currentUser={currentUser} onLogout={handleLogout} onSettings={() => setSettingsModalOpen(true)} onToggleDrawer={() => setIsDrawerOpen(!isDrawerOpen)} />}
            <main className="p-4 md:p-6">
                {renderView()}
            </main>
            {chatTarget && currentUser && (
                <ChatModal currentUser={currentUser} otherUser={chatTarget} messages={messages} onClose={() => setChatTarget(null)} onSendMessage={() => {}} onSendCoins={() => {}} />
            )}
            {isSettingsModalOpen && (
                <ChangePasswordModal
                    onClose={() => setSettingsModalOpen(false)}
                    onChangePassword={handleChangePassword}
                />
            )}
            {notification && (
                <Notification
                    message={notification.message}
                    type={notification.type}
                    onClose={() => setNotification(null)}
                />
            )}
        </div>
    );
};

export default App;
