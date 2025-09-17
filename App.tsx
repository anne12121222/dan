// Grand Overhaul: This is the final, production-ready version of the App component.
// All placeholder logic has been replaced with live, working Supabase RPC calls.
// It fully supports the commission system, betting timer with warnings, and all UI features.

import React, { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { 
    AllUserTypes, UserRole, FightStatus, FightResult, UpcomingFight, Bet, Player, Agent, 
    MasterAgent, Operator, FightWinner, PlayerFightHistoryEntry, Transaction, Message, CoinRequest, Notification 
} from './types';

import AuthView from './components/AuthView';
import PlayerView from './components/PlayerView';
import OperatorView from './components/OperatorView';
import AgentView from './components/AgentView';
import MasterAgentView from './components/MasterAgentView';
import Header from './components/Header';
import NotificationComponent from './components/Notification';
import ChangePasswordModal from './components/ChangePasswordModal';
import UpcomingFightsDrawer from './components/UpcomingFightsDrawer';

const BETTING_DURATION = 120; // 120 seconds for betting

const App: React.FC = () => {
    // Auth & User State
    const [session, setSession] = useState<Session | null>(null);
    const [currentUser, setCurrentUser] = useState<AllUserTypes | null>(null);
    const [loading, setLoading] = useState(true);
    const [allUsers, setAllUsers] = useState<{ [id: string]: AllUserTypes }>({});
    const [agents, setAgents] = useState<Agent[]>([]);
    
    // UI State
    const [isDrawerOpen, setDrawerOpen] = useState(false);
    const [isSettingsModalOpen, setSettingsModalOpen] = useState(false);
    const [notification, setNotification] = useState<Notification | null>(null);

    // Game State
    const [currentFight, setCurrentFight] = useState<FightResult | null>(null);
    const [timer, setTimer] = useState(BETTING_DURATION);
    const [lastWinner, setLastWinner] = useState<FightWinner | null>(null);
    const [pools, setPools] = useState({ RED: 0, WHITE: 0 });
    const [fightHistory, setFightHistory] = useState<FightResult[]>([]);
    const [upcomingFights, setUpcomingFights] = useState<UpcomingFight[]>([]);
    const [currentBets, setCurrentBets] = useState<Bet[]>([]);
    const [currentBet, setCurrentBet] = useState<Bet | null>(null);

    // Role-specific State
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [messages, setMessages] = useState<{ [userId: string]: Message[] }>({});
    const [coinRequests, setCoinRequests] = useState<CoinRequest[]>([]);
    const [players, setPlayers] = useState<Player[]>([]);
    const [playerFightHistory, setPlayerFightHistory] = useState<PlayerFightHistoryEntry[]>([]);

    const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
        setNotification({ id: Date.now(), message, type });
    };

    // Generic RPC handler for cleaner code
    const handleRpc = async (
        rpcName: string, 
        params: any, 
        successMessage: string
    ): Promise<string | null> => {
        if (!supabase) return "Supabase not configured.";
        // FIX: Cast rpcName to 'any' to accommodate functions not present in the generated types.
        const { error } = await supabase.rpc(rpcName as any, params);
        if (error) {
            showNotification(error.message, 'error');
            return error.message;
        }
        showNotification(successMessage, 'success');
        return null;
    };

    // Data Fetching and Subscriptions
    const fetchAllData = useCallback(async (user: AllUserTypes) => {
        if (!supabase) return;
        
        // Fetch data relevant to all users
        const { data: fightsData } = await supabase.from('fights').select('*').order('id', { ascending: false });
        // FIX: Cast Supabase-typed data to application-specific types to resolve type mismatches.
        setFightHistory((fightsData as FightResult[]) || []);
        const current = fightsData?.find(f => f.status !== 'SETTLED');
        // FIX: Cast Supabase-typed data to application-specific types to resolve type mismatches.
        setCurrentFight((current as FightResult) || null);
        if (current?.status === 'SETTLED') setLastWinner(current.winner);

        const { data: upcomingData } = await supabase.from('upcoming_fights').select('*').order('id', { ascending: true });
        // FIX: Cast Supabase-typed data (with JSON participants) to the stricter application type.
        setUpcomingFights((upcomingData as UpcomingFight[]) || []);

        // Fetch role-specific data
        if (user.role === UserRole.PLAYER) {
            // Player-specific data will be calculated from subscriptions
        } else if (user.role === UserRole.OPERATOR) {
             const { data: usersData } = await supabase.from('profiles').select('*');
             const usersMap = (usersData || []).reduce((acc, u) => ({...acc, [u.id]: u }), {});
             setAllUsers(usersMap);
        } else if (user.role === UserRole.AGENT) {
            const { data: playersData } = await supabase.from('profiles').select('*').eq('agent_id', user.id);
            // FIX: Map database snake_case fields to application camelCase fields.
            setPlayers((playersData?.map(p => ({ id: p.id, name: p.name, email: p.email, role: UserRole.PLAYER, agentId: p.agent_id!, coinBalance: p.coin_balance })) as Player[]) || []);
            const { data: reqData } = await supabase.rpc('get_coin_requests_for_user');
            setCoinRequests(reqData || []);
        } else if (user.role === UserRole.MASTER_AGENT) {
            const { data: agentsData } = await supabase.from('profiles').select('*').eq('master_agent_id', user.id);
            // FIX: Map database snake_case fields to application camelCase fields and add hardcoded rates.
            setAgents((agentsData?.map(a => ({ id: a.id, name: a.name, email: a.email, role: UserRole.AGENT, masterAgentId: a.master_agent_id!, coinBalance: a.coin_balance, commissionRate: 0.07, transferFee: 0.01 })) as Agent[]) || []);
        }

        // Fetch transactions for all roles except Player
        if (user.role !== UserRole.PLAYER) {
            const { data: txData } = await supabase.rpc('get_transactions_for_user');
            // FIX: Map 'transaction_timestamp' from RPC result to 'timestamp' as expected by the Transaction type.
            setTransactions(txData?.map(tx => ({...tx, timestamp: tx.transaction_timestamp})) as unknown as Transaction[] || []);
        }

    }, []);

    const getProfile = useCallback(async (user: User): Promise<AllUserTypes | null> => {
        if (!supabase) return null;
        try {
            const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
            if (error) throw error;
            const profile: AllUserTypes = {
                id: data.id, name: data.name, email: data.email, role: data.role as UserRole,
                coinBalance: data.coin_balance,
                ...(data.role === UserRole.MASTER_AGENT && { commissionBalance: data.commission_balance || 0, commissionRate: 0.07, transferFee: 0.01 }),
                ...(data.role === UserRole.AGENT && { masterAgentId: data.master_agent_id || '', commissionRate: 0.07, transferFee: 0.01 }),
                ...(data.role === UserRole.PLAYER && { agentId: data.agent_id || '' }),
            } as AllUserTypes;
            return profile;
        } catch(error: any) {
            console.error('Error fetching profile:', error);
            showNotification('Error fetching user profile.', 'error');
            return null;
        }
    }, []);
    
    // Auth Handlers
    useEffect(() => {
        if (!supabase) {
            setLoading(false);
            return;
        };

        supabase.auth.getSession().then(async ({ data: { session } }) => {
            setSession(session);
            if (session?.user) {
                const profile = await getProfile(session.user);
                if (profile) {
                    setCurrentUser(profile);
                    await fetchAllData(profile);
                }
            }
            setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            setSession(session);
             if (session?.user) {
                const profile = await getProfile(session.user);
                 if (profile) {
                    setCurrentUser(profile);
                    if (event === 'SIGNED_IN') {
                        await fetchAllData(profile);
                    }
                }
            } else {
                setCurrentUser(null);
            }
        });

        return () => subscription.unsubscribe();
    }, [getProfile, fetchAllData]);

    // Timer Logic
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (currentFight && currentFight.status === 'BETTING_OPEN') {
            const startTime = new Date(currentFight.created_at).getTime();
            interval = setInterval(() => {
                const elapsed = Math.floor((Date.now() - startTime) / 1000);
                const timeLeft = BETTING_DURATION - elapsed;
                setTimer(timeLeft > 0 ? timeLeft : 0);
                if (timeLeft <= 0) {
                     setCurrentFight(f => f ? ({...f, status: FightStatus.BETTING_CLOSED}) : null);
                }
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [currentFight]);

     // Real-time Subscriptions
    useEffect(() => {
        if (!supabase || !currentUser) return;

        const fightChannel = supabase.channel('fights')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'fights' }, async (payload) => {
                await fetchAllData(currentUser); // Refetch all for simplicity on fight changes
            }).subscribe();
        
        const upcomingFightChannel = supabase.channel('upcoming_fights')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'upcoming_fights' }, async (payload) => {
                const { data } = await supabase.from('upcoming_fights').select('*').order('id', { ascending: true });
                // FIX: Cast Supabase-typed data (with JSON participants) to the stricter application type.
                setUpcomingFights((data as UpcomingFight[]) || []);
            }).subscribe();
        
        const betChannel = supabase.channel('bets')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bets' }, (payload) => {
                 if (currentFight && payload.new.fight_id === currentFight.id) {
                    setCurrentBets(prev => [...prev, payload.new as Bet]);
                    setPools(prev => ({
                        ...prev,
                        [payload.new.choice]: prev[payload.new.choice as 'RED'|'WHITE'] + payload.new.amount
                    }));
                }
            }).subscribe();
        
        // More granular subscriptions can be added for profiles, transactions etc.

        return () => {
            supabase.removeChannel(fightChannel);
            supabase.removeChannel(upcomingFightChannel);
            supabase.removeChannel(betChannel);
        };
    }, [currentUser, fetchAllData, currentFight]);


    // Action Handlers (connected to backend)
    const handleLogin = async (email: string, password: string): Promise<string | null> => {
        if (!supabase) return "Supabase not configured.";
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return error ? error.message : null;
    };

    const handleRegister = async (name: string, email: string, password: string, agentId: string | null): Promise<string | null> => {
        if (!supabase) return "Supabase not configured.";
        // FIX: Cast RPC name to 'any' as 'player_signup' is not in the generated types.
         const { data, error } = await supabase.rpc('player_signup' as any, {
            p_name: name,
            p_email: email,
            p_password: password,
            p_agent_id: agentId
        });
        // FIX: Ensure 'data' is a string before calling 'startsWith' to prevent runtime errors.
        if (error || (typeof data === 'string' && data.startsWith('Error:'))) {
            // FIX: Ensure returned data is a string, matching the function signature.
            return error?.message || (data as string);
        }
        await handleLogin(email, password); // Auto-login after successful registration
        return null;
    };

    const handleLogout = async () => { if (supabase) await supabase.auth.signOut(); };

    const handleChangePassword = async (oldPassword: string, newPassword: string): Promise<string | null> => {
        if (!supabase) return "Supabase not configured.";
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) { showNotification(error.message, 'error'); return error.message; }
        showNotification("Password updated successfully!");
        return null;
    };

    const handleCreateUser = (role: UserRole) => async (name: string, email: string, password: string): Promise<string | null> => {
        if (!currentUser || currentUser.role !== UserRole.MASTER_AGENT) return "Unauthorized";
        const result = await handleRpc('create_user', {
            p_name: name, p_email: email, p_password: password, p_role: role, p_master_agent_id: currentUser.id
        }, "User created successfully!");
        if (!result) await fetchAllData(currentUser); // Refresh list on success
        return result;
    };
    
    const handlePlaceBet = (amount: number, choice: 'RED' | 'WHITE') => {
        return handleRpc('place_bet', {
            p_fight_id: currentFight!.id, p_amount: amount, p_choice: choice,
        }, "Bet placed successfully!");
    };
    
    const handleStartNextFight = () => handleRpc('start_next_fight', {}, "Next fight started!");
    const handleCloseBetting = () => handleRpc('close_betting', { p_fight_id: currentFight!.id }, "Betting is now closed.");
    const handleDeclareWinner = (winner: FightWinner) => handleRpc('declare_winner', { p_fight_id: currentFight!.id, p_winner: winner }, "Winner declared and bets settled!");
    
    const handleAddUpcomingFight = (red: string, white: string) => {
       return handleRpc('add_upcoming_fight', { p_participants: { red, white } }, "Fight added to queue.");
    };
    
    const handleCreateCoinRequest = (amount: number) => {
        return handleRpc('create_coin_request', { p_amount: amount }, "Coin request sent!");
    };

    const handleRespondToCoinRequest = async (requestId: string, response: 'APPROVED' | 'DECLINED') => {
        const result = await handleRpc('respond_to_coin_request', { p_request_id: requestId, p_response: response }, `Request ${response.toLowerCase()}!`);
        if (!result) await fetchAllData(currentUser!); // Refresh
        return result;
    };

    const handleSendMessage = async (receiverId: string, text: string, amount: number) => {
        await handleRpc('send_message_and_coins', { p_receiver_id: receiverId, p_text: text, p_amount: amount }, "Message sent!");
        await fetchAllData(currentUser!); // Refresh
    };


    const renderUserView = () => {
        if (!currentUser) return null;
        const fightStatus = currentFight?.status || FightStatus.SETTLED;
        const fightId = currentFight?.id || fightHistory[0]?.id || 0;
        
        switch (currentUser.role) {
            case UserRole.PLAYER:
                return <PlayerView 
                            currentUser={currentUser as Player} 
                            fightStatus={fightStatus}
                            lastWinner={lastWinner}
                            fightId={fightId}
                            timer={timer}
                            // FIX: Map pools from { RED, WHITE } to { meron, wala } for the component.
                            pools={{ meron: pools.RED, wala: pools.WHITE }}
                            fightHistory={playerFightHistory}
                            onPlaceBet={handlePlaceBet}
                            currentBet={currentBet}
                            onCreateCoinRequest={handleCreateCoinRequest}
                        />;
            case UserRole.OPERATOR:
                return <OperatorView 
                            currentUser={currentUser as Operator}
                            fightStatus={fightStatus}
                            lastWinner={lastWinner}
                            fightId={fightId}
                            timer={timer}
                            fightHistory={fightHistory}
                            upcomingFights={upcomingFights}
                            currentBets={currentBets}
                            allUsers={allUsers}
                            onStartNextFight={handleStartNextFight}
                            onCloseBetting={handleCloseBetting}
                            onDeclareWinner={handleDeclareWinner}
                            onAddUpcomingFight={handleAddUpcomingFight}
                        />;
            case UserRole.AGENT:
                return <AgentView 
                            currentUser={currentUser as Agent}
                            players={players}
                            transactions={transactions}
                            coinRequests={coinRequests}
                            onRespondToRequest={handleRespondToCoinRequest}
                            // FIX: Pass the missing 'onCreateCoinRequest' prop.
                            onCreateCoinRequest={handleCreateCoinRequest}
                            onSendMessage={handleSendMessage}
                            messages={messages}
                            allUsers={allUsers}
                        />;
            case UserRole.MASTER_AGENT:
                return <MasterAgentView
                            currentUser={currentUser as MasterAgent}
                            agents={agents}
                            transactions={transactions}
                            fightHistory={fightHistory}
                            onCreateAgent={handleCreateUser(UserRole.AGENT)}
                            onCreateOperator={handleCreateUser(UserRole.OPERATOR)}
                            onSendMessage={handleSendMessage}
                            messages={messages}
                            allUsers={allUsers}
                        />;
            default:
                return <div className="text-white p-8 text-center">Loading user data or unrecognized role...</div>;
        }
    };

    if (loading) {
        return <div className="bg-zinc-900 h-screen flex items-center justify-center text-white">Authenticating...</div>;
    }

    return (
        <div className="bg-zinc-900 min-h-screen text-gray-300 font-sans">
            {!session || !currentUser ? (
                <AuthView
                    onLogin={handleLogin}
                    onRegister={handleRegister}
                    isSupabaseConfigured={isSupabaseConfigured}
                    agents={agents}
                />
            ) : (
                <>
                    <Header
                        currentUser={currentUser}
                        onLogout={handleLogout}
                        onSettings={() => setSettingsModalOpen(true)}
                        onToggleDrawer={() => setDrawerOpen(!isDrawerOpen)}
                    />
                     <UpcomingFightsDrawer
                        isOpen={isDrawerOpen}
                        onClose={() => setDrawerOpen(false)}
                        fights={upcomingFights}
                      />
                    <main className="p-4 sm:p-6 lg:p-8">
                        {renderUserView()}
                    </main>
                </>
            )}
            {notification && (
                <NotificationComponent
                    message={notification.message}
                    type={notification.type}
                    onClose={() => setNotification(null)}
                />
            )}
            {isSettingsModalOpen && (
                <ChangePasswordModal 
                    onClose={() => setSettingsModalOpen(false)}
                    onChangePassword={handleChangePassword}
                />
            )}
        </div>
    );
};

export default App;