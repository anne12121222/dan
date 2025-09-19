

import React, { useState, useEffect, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import {
    UserRole,
    AllUserTypes,
    FightStatus,
    FightWinner,
    Bet,
    PlayerFightHistoryEntry,
    UpcomingFight,
    Transaction,
    CoinRequest,
    Message,
    Agent,
    MasterAgent,
    BetChoice,
    FightResult,
    Player,
    Operator,
} from './types';

// Import Views
import AuthView from './components/AuthView';
import PlayerView from './components/PlayerView';
import AgentView from './components/AgentView';
import MasterAgentView from './components/MasterAgentView';
import OperatorView from './components/OperatorView';
import Header from './components/Header';
import ChatModal from './components/ChatModal';
import ChangePasswordModal from './components/ChangePasswordModal';
import NotificationComponent from './components/Notification';

// This type represents the real-time state broadcast from the 'app_state' view/channel
interface AppState {
    fight_id: number | null;
    status: FightStatus;
    winner: FightWinner | null;
    betting_ends_at: string | null;
    meron_pool: number;
    wala_pool: number;
}

// FIX: Add a mapper function to convert snake_case data from Supabase to camelCase for the app's types.
const mapProfileToUser = (profile: any): AllUserTypes => {
    const baseUser = {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        role: profile.role as UserRole,
        coinBalance: profile.coin_balance,
    };

    switch (profile.role) {
        case UserRole.PLAYER:
            return {
                ...baseUser,
                role: UserRole.PLAYER,
                agentId: profile.agent_id,
            };
        case UserRole.AGENT:
            return {
                ...baseUser,
                role: UserRole.AGENT,
                masterAgentId: profile.master_agent_id,
                commissionBalance: profile.commission_balance,
                commissionRate: profile.commission_rate,
                transferFee: profile.transfer_fee,
            };
        case UserRole.MASTER_AGENT:
            return {
                ...baseUser,
                role: UserRole.MASTER_AGENT,
                commissionBalance: profile.commission_balance,
                commissionRate: profile.commission_rate,
                transferFee: profile.transfer_fee,
            };
        case UserRole.OPERATOR:
            return {
                ...baseUser,
                role: UserRole.OPERATOR,
            };
        default:
            // Fallback for any unexpected role, assuming Operator is the most basic.
            return { ...baseUser, role: UserRole.OPERATOR };
    }
};

const App: React.FC = () => {
    // Auth & User State
    const [session, setSession] = useState<Session | null>(null);
    const [currentUser, setCurrentUser] = useState<AllUserTypes | null>(null);
    const [allUsers, setAllUsers] = useState<{ [id: string]: AllUserTypes }>({});
    const [loading, setLoading] = useState(true);

    // App/Fight State
    const [appState, setAppState] = useState<AppState | null>(null);
    const [timer, setTimer] = useState(0);
    const [liveBets, setLiveBets] = useState<Bet[]>([]);
    const [currentBet, setCurrentBet] = useState<Bet | null>(null);
    
    // Data State
    const [fightHistory, setFightHistory] = useState<PlayerFightHistoryEntry[]>([]);
    const [completedFights, setCompletedFights] = useState<FightResult[]>([]);
    const [upcomingFights, setUpcomingFights] = useState<UpcomingFight[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [coinRequests, setCoinRequests] = useState<CoinRequest[]>([]);
    
    // UI State
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
    const [chatTargetUser, setChatTargetUser] = useState<AllUserTypes | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    
    const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
        setNotification({ message, type });
    };

    // --- AUTH & DATA FETCHING ---

    useEffect(() => {
        setLoading(true);
        if (!supabase) {
            setLoading(false);
            return;
        }
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (!session) {
                setCurrentUser(null);
                setLoading(false);
            }
        });
        // Initial session check
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoading(false);
        });
        return () => subscription.unsubscribe();
    }, []);

    const fetchAllData = useCallback(async (user: User) => {
        if (!supabase) return;
        setLoading(true);

        // Fetch current user profile
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (profileError || !profile) {
            console.error('Error fetching profile:', profileError);
            await supabase.auth.signOut();
            return;
        }
        // FIX: Use the mapper to correctly type the user profile.
        setCurrentUser(mapProfileToUser(profile));

        // Fetch all users for lookups
        const { data: users, error: usersError } = await supabase.from('profiles').select('*');
        if (users) {
            const userMap = users.reduce((acc, u) => {
                // FIX: Use the mapper to correctly type each user in the map.
                acc[u.id] = mapProfileToUser(u);
                return acc;
            }, {} as { [id: string]: AllUserTypes });
            setAllUsers(userMap);
        } else {
            console.error('Error fetching all users:', usersError);
        }

        // Fetch role-specific data
        if (profile.role === UserRole.PLAYER) {
            const { data, error } = await supabase.rpc('get_player_fight_history', { p_user_id: user.id });
            // FIX: Map snake_case properties (e.g., user_id) in the 'bet' object to camelCase.
            if (data) {
                const mappedHistory = data.map((entry: any): PlayerFightHistoryEntry => ({
                    id: entry.id,
                    winner: entry.winner,
                    commission: entry.commission,
                    outcome: entry.outcome,
                    bet: entry.bet ? ({
                        id: entry.bet.id,
                        userId: entry.bet.user_id,
                        fightId: entry.bet.fight_id,
                        amount: entry.bet.amount,
                        choice: entry.bet.choice,
                    } as Bet) : null,
                }));
                setFightHistory(mappedHistory);
            }
            else console.error('Error fetching fight history:', error);
        }

        if (profile.role !== UserRole.PLAYER) {
             const { data, error } = await supabase.rpc('get_user_transactions', { p_user_id: user.id });
            // FIX: Map snake_case properties (e.g., from_user_id) to camelCase.
            if (data) {
                const mappedTransactions = data.map((tx): Transaction => ({
                    id: tx.id,
                    type: tx.type,
                    fromUserId: tx.from_user_id,
                    toUserId: tx.to_user_id,
                    amount: tx.amount,
                    transactionTimestamp: tx.transaction_timestamp,
                }));
                setTransactions(mappedTransactions);
            }
             else console.error('Error getting transactions:', error);
        }
        
        if (profile.role === UserRole.AGENT) {
             const { data, error } = await supabase.from('coin_requests').select('*').eq('to_user_id', user.id);
            // FIX: Map snake_case properties (e.g., from_user_id) to camelCase.
            if(data) {
                const mappedRequests = data.map((req): CoinRequest => ({
                    id: req.id,
                    fromUserId: req.from_user_id,
                    toUserId: req.to_user_id,
                    amount: req.amount,
                    status: req.status,
                    createdAt: req.created_at,
                }));
                setCoinRequests(mappedRequests);
            }
            else console.error('Error getting coin requests:', error);
        }
        
         if (profile.role === UserRole.MASTER_AGENT) {
             const { data, error } = await supabase.rpc('get_agent_requests_for_master', { p_master_agent_id: user.id });
            // FIX: Map snake_case properties (e.g., from_user_id) to camelCase.
            if(data) {
                 const mappedRequests = data.map((req): CoinRequest => ({
                    id: req.id,
                    fromUserId: req.from_user_id,
                    toUserId: req.to_user_id,
                    amount: req.amount,
                    status: req.status,
                    createdAt: req.created_at,
                }));
                setCoinRequests(mappedRequests);
            }
            else console.error('Error getting coin requests for master:', error);
        }

        setLoading(false);
    }, []);

    useEffect(() => {
        if (session?.user) {
            fetchAllData(session.user);
        }
    }, [session, fetchAllData]);

    // --- REAL-TIME & POLLING ---
    const fetchCurrentState = useCallback(async () => {
        if (!supabase || !currentUser) return;
        
        const { data, error } = await supabase.from('fights').select('*').order('id', { ascending: false }).limit(1).single();
        if (data) {
            const fightId = data.id;
            const { data: bets, error: betsError } = await supabase.from('bets').select('choice, amount').eq('fight_id', fightId);
            if (betsError) console.error("Error fetching bets for pool", betsError);
            const pools = (bets || []).reduce((acc, bet) => {
                if (bet.choice === 'RED') acc.meron_pool += bet.amount;
                if (bet.choice === 'WHITE') acc.wala_pool += bet.amount;
                return acc;
            }, { meron_pool: 0, wala_pool: 0 });

            setAppState({
                fight_id: fightId,
                status: data.status as FightStatus,
                winner: data.winner as FightWinner,
                betting_ends_at: data.betting_ends_at,
                meron_pool: pools.meron_pool,
                wala_pool: pools.wala_pool,
            });

            const { data: liveBetsData } = await supabase.from('bets').select('*').eq('fight_id', fightId).order('created_at', { ascending: false });
            // FIX: Map snake_case properties (e.g., user_id) to camelCase for bets.
            setLiveBets((liveBetsData || []).map((bet): Bet => ({
                id: bet.id,
                userId: bet.user_id,
                fightId: bet.fight_id,
                amount: bet.amount,
                choice: bet.choice,
            })));
            
            if (currentUser.role === UserRole.PLAYER) {
                 const {data: currentBetData} = await supabase.from('bets').select('*').eq('fight_id', fightId).eq('user_id', currentUser.id).single();
                 // FIX: Map snake_case properties to camelCase for the current user's bet.
                 setCurrentBet(currentBetData ? {
                     id: currentBetData.id,
                     userId: currentBetData.user_id,
                     fightId: currentBetData.fight_id,
                     amount: currentBetData.amount,
                     choice: currentBetData.choice,
                 } : null);
            }
        } else if (!error) {
             setAppState({ fight_id: null, status: FightStatus.SETTLED, winner: null, betting_ends_at: null, meron_pool: 0, wala_pool: 0 });
        }
    }, [currentUser]);

    useEffect(() => {
        if (!supabase || !currentUser) return;

        fetchCurrentState(); // Initial fetch
        const stateInterval = setInterval(fetchCurrentState, 5000); // Poll for state

        // Subscriptions for instant updates
        const upcomingFightsChannel = supabase
          .channel('upcoming-fights')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'upcoming_fights' }, async () => {
            const { data } = await supabase.from('upcoming_fights').select('id, red_participant, white_participant').order('id', { ascending: true });
            setUpcomingFights((data || []).map(f => ({ id: f.id, participants: { red: f.red_participant, white: f.white_participant }})));
          }).subscribe();
        
        supabase.from('upcoming_fights').select('id, red_participant, white_participant').order('id', { ascending: true }).then(({data}) => {
            setUpcomingFights((data || []).map(f => ({ id: f.id, participants: { red: f.red_participant, white: f.white_participant }})));
        });
         
        if(currentUser.role === UserRole.OPERATOR) {
             supabase.from('fights').select('id, winner, commission').eq('status', FightStatus.SETTLED).order('id', { ascending: false }).then(({data}) => {
                setCompletedFights(data as FightResult[] || []);
             });
        }
        
        // Listen to profile changes for coin balance updates
        const profileChannel = supabase
            .channel('public:profiles')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${currentUser.id}`}, payload => {
                // FIX: Access snake_case 'coin_balance' from the database payload.
                setCurrentUser(old => old ? { ...old, coinBalance: (payload.new as any).coin_balance } : null);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(upcomingFightsChannel);
            supabase.removeChannel(profileChannel);
            clearInterval(stateInterval);
        };
    }, [currentUser, fetchCurrentState]);

    // --- TIMER ---
    useEffect(() => {
        if (appState?.betting_ends_at && appState.status === FightStatus.BETTING_OPEN) {
            const interval = setInterval(() => {
                const endsAt = new Date(appState.betting_ends_at!).getTime();
                const now = new Date().getTime();
                const diff = Math.round((endsAt - now) / 1000);
                setTimer(diff > 0 ? diff : 0);
            }, 1000);
            return () => clearInterval(interval);
        } else {
            setTimer(0);
        }
    }, [appState]);

    // --- HANDLERS ---
    const handleLogin = async (email: string, password: string) => {
        if (!supabase) return "Supabase not configured";
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return error.message;
        return null;
    };

    const handleRegister = async (name: string, email: string, password: string, agentId: string) => {
        if (!supabase) return "Supabase not configured";
        const { data, error } = await supabase.rpc('handle_new_player', { name, email, password, agent_id: agentId });
        if (error) return error.message;
        if (data) showNotification(data);
        return null;
    };
    
    const handleLogout = () => supabase.auth.signOut();

    const handlePlaceBet = async (amount: number, choice: BetChoice) => {
         if (!supabase || !currentUser || !appState?.fight_id) return "Cannot place bet now.";
         const { error } = await supabase.from('bets').insert({
             user_id: currentUser.id,
             fight_id: appState.fight_id,
             amount,
             choice
         });
         if(error) return error.message;
         showNotification(`Bet of ${amount} on ${choice} placed!`);
         setCurrentUser(u => u ? {...u, coinBalance: u.coinBalance - amount} : null);
         return null;
    }

    const handleRequestCoins = async (amount: number, targetUserId: string) => {
         if (!supabase || !currentUser) return "Not logged in.";
         const { error } = await supabase.from('coin_requests').insert({
             from_user_id: currentUser.id,
             to_user_id: targetUserId,
             amount
         });
         if (error) return error.message;
         showNotification("Coin request sent!");
         return null;
    };

    const handleRespondToRequest = async (requestId: string, response: 'APPROVED' | 'DECLINED') => {
         if (!supabase) return "Supabase not connected";
         const { error } = await supabase.rpc('respond_to_coin_request', {
             p_request_id: requestId,
             p_response: response
         });
         if (error) {
             showNotification(error.message, 'error');
             return error.message;
         }
         showNotification(`Request ${response.toLowerCase()}.`);
         setCoinRequests(reqs => reqs.filter(r => r.id !== requestId));
         return null;
    }

    const handleCreateUser = (roleToCreate: UserRole) => async (name: string, email: string, password: string) => {
        if (!supabase || !currentUser || currentUser.role !== UserRole.MASTER_AGENT) return "Permission denied.";
        const { error } = await supabase.rpc('create_user_by_master_agent', {
            name, email, password, role: roleToCreate, master_agent_id: currentUser.id
        });
         if (error) {
             showNotification(error.message, 'error');
             return error.message;
         }
         showNotification(`${roleToCreate} created successfully.`);
         return null;
    }

    const handleDeclareWinner = async (winner: FightWinner) => {
         if (!supabase || !appState?.fight_id) return;
         const { error } = await supabase.rpc('declare_winner', { p_fight_id: appState.fight_id, p_winner: winner });
         if (error) showNotification(error.message, 'error');
         else showNotification("Winner declared, bets are being settled.");
    }
    
    const handleAddUpcomingFight = async (red: string, white: string) => {
        if(!supabase) return "Not connected";
        const { error } = await supabase.from('upcoming_fights').insert({ red_participant: red, white_participant: white });
        if (error) return error.message;
        showNotification("Fight added to queue.");
        return null;
    }

    const handleStartNextFight = async () => {
         if (!supabase) return;
         const { error } = await supabase.rpc('start_next_fight');
         if (error) showNotification(error.message, 'error');
         else showNotification("Next fight started!");
    }

    const handleCloseBetting = async () => {
         if (!supabase || !appState?.fight_id) return;
         const { error } = await supabase.rpc('close_betting', { p_fight_id: appState.fight_id });
         if (error) showNotification(error.message, 'error');
         else showNotification("Betting closed for this fight.");
    }

    const handleChangePassword = async (_old: string, newPass: string) => {
        if (!supabase) return "Not connected";
        const { error } = await supabase.auth.updateUser({ password: newPass });
        if (error) return error.message;
        showNotification("Password updated successfully!");
        return null;
    };

    const handleStartChat = async (user: AllUserTypes) => {
        if(!supabase || !currentUser) return;
        setChatTargetUser(user);
        const {data, error} = await supabase.rpc('get_messages', { user1_id: currentUser.id, user2_id: user.id });
        // FIX: Map snake_case properties (e.g., sender_id) to camelCase for messages.
        if(data) {
            const mappedMessages = data.map((msg): Message => ({
                id: msg.id,
                senderId: msg.sender_id,
                receiverId: msg.receiver_id,
                text: msg.text,
                createdAt: msg.created_at,
            }));
            setMessages(mappedMessages);
        }
        else console.error(error);
    }

    const handleSendMessage = async (text: string, amount: number) => {
        if(!supabase || !chatTargetUser || !currentUser) return;
        const tempMessage: Message = {
            id: Date.now().toString(),
            senderId: currentUser.id,
            receiverId: chatTargetUser.id,
            text: text + (amount > 0 ? ` [Sent ${amount} coins]` : ''),
            createdAt: new Date().toISOString()
        };
        setMessages(m => [...m, tempMessage]);
        await supabase.rpc('send_message', { p_receiver_id: chatTargetUser.id, p_text: text, p_coin_amount: amount });
    }

    // --- RENDER LOGIC ---

    if (loading && !currentUser) {
        return <div className="bg-zinc-900 h-screen flex items-center justify-center text-white">Loading...</div>;
    }

    if (!session) {
        const agents = Object.values(allUsers).filter(u => u.role === UserRole.AGENT) as Agent[];
        return <AuthView onLogin={handleLogin} onRegister={handleRegister} isSupabaseConfigured={isSupabaseConfigured} agents={agents} />;
    }
    
    if (!currentUser || !appState) {
        return <div className="bg-zinc-900 h-screen flex items-center justify-center text-white">Loading User Data...</div>;
    }

    const renderView = () => {
        const commonProps = {
            currentUser,
            fightStatus: appState.status,
            lastWinner: appState.winner,
            fightId: appState.fight_id,
            timer,
            bettingPools: { meron: appState.meron_pool, wala: appState.wala_pool },
            allUsers,
            liveBets,
            onStartChat: handleStartChat
        };
        switch (currentUser.role) {
            case UserRole.PLAYER:
                return <PlayerView 
                    {...commonProps} 
                    currentUser={currentUser as Player}
                    currentBet={currentBet} 
                    onPlaceBet={handlePlaceBet}
                    fightHistory={fightHistory}
                    upcomingFights={upcomingFights}
                    onRequestCoins={handleRequestCoins}
                    agents={Object.values(allUsers).filter(u => u.role === UserRole.AGENT) as Agent[]}
                    isDrawerOpen={isDrawerOpen}
                    onToggleDrawer={() => setIsDrawerOpen(!isDrawerOpen)}
                    />;
            case UserRole.AGENT:
                return <AgentView 
                    {...commonProps}
                    currentUser={currentUser as Agent}
                    myPlayers={Object.values(allUsers).filter(u => u.role === UserRole.PLAYER && (u as Player).agentId === currentUser.id) as Player[]}
                    transactions={transactions}
                    coinRequests={coinRequests}
                    masterAgents={Object.values(allUsers).filter(u => u.role === UserRole.MASTER_AGENT) as MasterAgent[]}
                    onRespondToRequest={handleRespondToRequest}
                    onRequestCoins={handleRequestCoins}
                    />;
            case UserRole.MASTER_AGENT:
                return <MasterAgentView
                    {...commonProps}
                    currentUser={currentUser as MasterAgent}
                    myAgents={Object.values(allUsers).filter(u => u.role === UserRole.AGENT && (u as Agent).masterAgentId === currentUser.id) as Agent[]}
                    transactions={transactions}
                    coinRequests={coinRequests}
                    onRespondToRequest={handleRespondToRequest}
                    onCreateAgent={handleCreateUser(UserRole.AGENT)}
                    onCreateMasterAgent={handleCreateUser(UserRole.MASTER_AGENT)}
                    onCreateOperator={handleCreateUser(UserRole.OPERATOR)}
                    />;
            case UserRole.OPERATOR:
                return <OperatorView
                    {...commonProps}
                    currentUser={currentUser as Operator}
                    upcomingFights={upcomingFights}
                    completedFights={completedFights}
                    onDeclareWinner={handleDeclareWinner}
                    onAddUpcomingFight={handleAddUpcomingFight}
                    onStartNextFight={handleStartNextFight}
                    onCloseBetting={handleCloseBetting}
                    />;
            default:
                return <div>Unknown role</div>;
        }
    };

    return (
        <div className="bg-zinc-900">
          <Header 
            currentUser={currentUser} 
            onLogout={handleLogout} 
            onSettings={() => setIsChangePasswordOpen(true)}
            onToggleDrawer={() => setIsDrawerOpen(!isDrawerOpen)}
            />
          <main>
            {renderView()}
          </main>
          {chatTargetUser && (
              <ChatModal
                currentUser={currentUser}
                chatTargetUser={chatTargetUser}
                messages={messages}
                onClose={() => setChatTargetUser(null)}
                onSendMessage={handleSendMessage}
              />
          )}
          {isChangePasswordOpen && (
              <ChangePasswordModal
                onClose={() => setIsChangePasswordOpen(false)}
                onChangePassword={handleChangePassword}
              />
          )}
          {notification && (
              <NotificationComponent
                message={notification.message}
                type={notification.type}
                onClose={() => setNotification(null)}
              />
          )}
        </div>
    );
}

export default App;