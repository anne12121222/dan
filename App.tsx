
import React, { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { AuthSession } from '@supabase/supabase-js';
import {
  UserRole,
  AllUserTypes,
  Player,
  Agent,
  MasterAgent,
  Operator,
  FightStatus,
  FightWinner,
  Bet,
  BetChoice,
  PlayerFightHistoryEntry,
  UpcomingFight,
  FightResult,
  Transaction,
  CoinRequest,
  Message,
} from './types';

// Component Imports
import AuthView from './components/AuthView';
import PlayerView from './components/PlayerView';
import AgentView from './components/AgentView';
import MasterAgentView from './components/MasterAgentView';
import OperatorView from './components/OperatorView';
import Header from './components/Header';
import NotificationComponent from './components/Notification';
import ChatModal from './components/ChatModal';
import ChangePasswordModal from './components/ChangePasswordModal';

// AppState Interface
interface AppState {
    fightStatus: FightStatus;
    lastWinner: FightWinner | null;
    fightId: number | null;
    timer: number;
    bettingPools: { meron: number; wala: number };
    fightHistory: PlayerFightHistoryEntry[];
    upcomingFights: UpcomingFight[];
    completedFights: FightResult[];
    transactions: Transaction[];
    coinRequests: CoinRequest[];
    liveBets: Bet[];
    myPlayers: Player[];
    myAgents: Agent[];
    masterAgents: MasterAgent[];
    agents: Agent[]; // All agents for registration
}

const App: React.FC = () => {
    // Auth State
    const [session, setSession] = useState<AuthSession | null>(null);
    const [currentUser, setCurrentUser] = useState<AllUserTypes | null>(null);
    const [loading, setLoading] = useState(true);

    // Global UI State
    const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
    const [isDrawerOpen, setDrawerOpen] = useState(false);
    const [isSettingsOpen, setSettingsOpen] = useState(false);
    
    // Chat State
    const [chatTargetUser, setChatTargetUser] = useState<AllUserTypes | null>(null);
    const [chatMessages, setChatMessages] = useState<Message[]>([]);

    // App Data State
    const [allUsers, setAllUsers] = useState<{ [id: string]: AllUserTypes }>({});
    const [appState, setAppState] = useState<AppState>({
        fightStatus: FightStatus.SETTLED,
        lastWinner: null,
        fightId: null,
        timer: 0,
        bettingPools: { meron: 0, wala: 0 },
        fightHistory: [],
        upcomingFights: [],
        completedFights: [],
        transactions: [],
        coinRequests: [],
        liveBets: [],
        myPlayers: [],
        myAgents: [],
        masterAgents: [],
        agents: [],
    });

    const showNotification = (message: string, type: 'success' | 'error') => {
        setNotification({ message, type });
    };

    const fetchAllData = useCallback(async (user: AllUserTypes | null) => {
        if (!supabase || !user) return;
        setLoading(true);
        try {
            // Fetch all users for lookups
            const { data: profilesData, error: profilesError } = await supabase.from('profiles').select('*');
            if (profilesError) throw profilesError;
            const usersMap = profilesData.reduce((acc, profile) => {
                acc[profile.id] = { ...profile, coinBalance: profile.coin_balance, commissionBalance: profile.commission_balance, commissionRate: profile.commission_rate, transferFee: profile.transfer_fee, agentId: profile.agent_id, masterAgentId: profile.master_agent_id } as AllUserTypes;
                return acc;
            }, {} as { [id: string]: AllUserTypes });
            setAllUsers(usersMap);

            // Fetch current fight state
            const { data: fightData, error: fightError } = await supabase.from('fights').select('*').order('id', { ascending: false }).limit(1);
            if (fightError) throw fightError;
            const currentFight = fightData?.[0];

            // Fetch upcoming fights
            const { data: upcomingFightsData, error: upcomingFightsError } = await supabase.from('upcoming_fights').select('*').order('id', { ascending: true });
            if (upcomingFightsError) throw upcomingFightsError;

            // Fetch completed fights
            const { data: completedFightsData, error: completedFightsError } = await supabase.from('fights').select('id, winner, commission').neq('status', 'BETTING_OPEN').neq('status', 'BETTING_CLOSED').order('id', { ascending: false }).limit(50);
            if (completedFightsError) throw completedFightsError;

            // Role-specific data
            let fightHistory: PlayerFightHistoryEntry[] = [];
            let transactions: Transaction[] = [];
            let coinRequests: CoinRequest[] = [];
            let myPlayers: Player[] = [];
            let myAgents: Agent[] = [];
            let liveBets: Bet[] = [];
            
            if (currentFight) {
                 const { data: betsData, error: betsError } = await supabase.from('bets').select('*').eq('fight_id', currentFight.id);
                 if (betsError) throw betsError;
                 liveBets = betsData.map(b => ({...b, userId: b.user_id, fightId: b.fight_id}));
            }
            
            if (user.role === UserRole.PLAYER) {
                const { data, error } = await supabase.rpc('get_player_fight_history', { p_user_id: user.id });
                if (error) throw error;
                // FIX: Cast the data from the RPC call to the expected PlayerFightHistoryEntry array type.
                // This resolves mismatches between the generic JSON/string types from the database function
                // and the more specific types used in the application.
                fightHistory = (data as unknown as PlayerFightHistoryEntry[]) || [];
            }
            
            const { data: txData, error: txError } = await supabase.rpc('get_user_transactions', { p_user_id: user.id });
            if (txError) throw txError;
            transactions = txData.map(tx => ({...tx, fromUserId: tx.from_user_id, toUserId: tx.to_user_id, transactionTimestamp: tx.transaction_timestamp})) || [];

            if (user.role === UserRole.AGENT) {
                 const { data: playersData, error: playersError } = await supabase.from('profiles').select('*').eq('agent_id', user.id);
                 if (playersError) throw playersError;
                 myPlayers = playersData.map(p => ({...p, coinBalance: p.coin_balance, agentId: p.agent_id})) as Player[];

                 const { data: requestsData, error: requestsError } = await supabase.from('coin_requests').select('*').eq('to_user_id', user.id).eq('status', 'PENDING');
                 if (requestsError) throw requestsError;
                 coinRequests = requestsData.map(r => ({...r, fromUserId: r.from_user_id, toUserId: r.to_user_id, createdAt: r.created_at}));
            }

            if (user.role === UserRole.MASTER_AGENT) {
                 const { data: agentsData, error: agentsError } = await supabase.from('profiles').select('*').eq('master_agent_id', user.id);
                 if (agentsError) throw agentsError;
                 myAgents = agentsData.map(a => ({...a, coinBalance: a.coin_balance, commissionBalance: a.commission_balance, commissionRate: a.commission_rate, transferFee: a.transfer_fee, masterAgentId: a.master_agent_id})) as Agent[];
                 
                 // FIX: Directly query coin_requests for master agent, instead of relying on RPC.
                 // Master agent should see requests where they are the recipient and status is PENDING.
                 const { data: requestsData, error: requestsError } = await supabase.from('coin_requests').select('*').eq('to_user_id', user.id).eq('status', 'PENDING');
                 if (requestsError) throw requestsError;
                 coinRequests = requestsData.map(r => ({...r, fromUserId: r.from_user_id, toUserId: r.to_user_id, createdAt: r.created_at}));
            }

            // Agents for registration form
            const agents = Object.values(usersMap).filter(u => u.role === UserRole.AGENT) as Agent[];
            const masterAgents = Object.values(usersMap).filter(u => u.role === UserRole.MASTER_AGENT) as MasterAgent[];


            setAppState(prev => ({
                ...prev,
                // FIX: Cast string literal from DB to FightStatus enum to resolve type mismatch.
                fightStatus: (currentFight?.status as FightStatus) || FightStatus.SETTLED,
                fightId: currentFight?.id || null,
                lastWinner: completedFightsData?.[0]?.winner || null,
                upcomingFights: upcomingFightsData?.map(f => ({id: f.id, participants: {red: f.red_participant, white: f.white_participant}})) || [],
                completedFights: completedFightsData?.map(f => ({id: f.id, winner: f.winner as FightWinner, commission: f.commission || 0})) || [],
                fightHistory,
                transactions,
                coinRequests,
                myPlayers,
                myAgents,
                agents,
                masterAgents,
                liveBets
            }));

        } catch (error: any) {
            console.error("Error fetching data:", error);
            showNotification(`Error fetching data: ${error.message}`, 'error');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchCurrentUserProfile = useCallback(async (userId: string) => {
        if (!supabase) return null;
        const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
        if (error) {
            console.error("Error fetching profile:", error);
            return null;
        }
        return { ...data, coinBalance: data.coin_balance, commissionBalance: data.commission_balance, commissionRate: data.commission_rate, transferFee: data.transfer_fee, agentId: data.agent_id, masterAgentId: data.master_agent_id } as AllUserTypes;
    }, []);


    useEffect(() => {
        if (!supabase) {
            setLoading(false);
            return;
        }
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session?.user) {
                fetchCurrentUserProfile(session.user.id).then(user => {
                    setCurrentUser(user);
                    if (user) {
                        fetchAllData(user);
                    } else {
                        setLoading(false);
                    }
                });
            } else {
                setLoading(false);
            }
        });

        const { data: authListener } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                setSession(session);
                if (session?.user) {
                    const user = await fetchCurrentUserProfile(session.user.id);
                    setCurrentUser(user);
                    if (user) {
                        fetchAllData(user);
                    }
                } else {
                    setCurrentUser(null);
                }
            }
        );

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, [fetchAllData, fetchCurrentUserProfile]);

    // REAL-TIME SUBSCRIPTIONS
    useEffect(() => {
        if (!supabase) return;

        const fightChannel = supabase.channel('fights-channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'fights' }, async (payload) => {
                console.log('Fight change received!', payload);
                // Simple re-fetch, could be optimized to use payload
                if (currentUser) {
                    await fetchAllData(currentUser);
                }
            }).subscribe();
        
        const upcomingFightsChannel = supabase.channel('upcoming-fights-channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'upcoming_fights' }, async (payload) => {
                console.log('Upcoming fight change received!', payload);
                if (currentUser) {
                    await fetchAllData(currentUser);
                }
            }).subscribe();

        const profileChannel = supabase.channel('profiles-channel')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, (payload) => {
                 console.log('Profile change received!', payload);
                 const updatedProfile = payload.new as any;
                 if (currentUser && updatedProfile.id === currentUser.id) {
                     setCurrentUser(prev => prev ? ({...prev, coinBalance: updatedProfile.coin_balance, commissionBalance: updatedProfile.commission_balance }) : null);
                 }
                 setAllUsers(prev => ({...prev, [updatedProfile.id]: {...prev[updatedProfile.id], coinBalance: updatedProfile.coin_balance, commissionBalance: updatedProfile.commission_balance}}));
            }).subscribe();
            
        const requestsChannel = supabase.channel('requests-channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'coin_requests' }, async (payload) => {
                 console.log('Coin request change received!', payload);
                 if (currentUser) {
                     await fetchAllData(currentUser); // re-fetch to update request list
                 }
            }).subscribe();
        
        const transactionsChannel = supabase.channel('transactions-channel')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions'}, async (payload) => {
                console.log('Transaction change received!', payload);
                if (currentUser) {
                     const newTx = payload.new as any;
                     if(newTx.to_user_id === currentUser.id || newTx.from_user_id === currentUser.id) {
                        await fetchAllData(currentUser);
                     }
                }
            }).subscribe();


        return () => {
            supabase.removeChannel(fightChannel);
            supabase.removeChannel(upcomingFightsChannel);
            supabase.removeChannel(profileChannel);
            supabase.removeChannel(requestsChannel);
            supabase.removeChannel(transactionsChannel);
        };
    }, [currentUser, fetchAllData]);
    
    // Timer Logic
    useEffect(() => {
        if (appState.fightStatus !== FightStatus.BETTING_OPEN) {
            setAppState(prev => ({ ...prev, timer: 0 }));
            return;
        }

        const interval = setInterval(async () => {
            if (!supabase || !appState.fightId) return;
            const { data, error } = await supabase.from('fights').select('betting_ends_at').eq('id', appState.fightId).single();
            if (error || !data || !data.betting_ends_at) {
                setAppState(prev => ({ ...prev, timer: 0 }));
                return;
            }
            const endTime = new Date(data.betting_ends_at).getTime();
            const now = new Date().getTime();
            const secondsLeft = Math.round(Math.max(0, endTime - now) / 1000);
            setAppState(prev => ({ ...prev, timer: secondsLeft }));

            if (secondsLeft <= 0 && appState.fightStatus === FightStatus.BETTING_OPEN) {
                 console.log("Timer expired, frontend forcing status update view.");
                 setAppState(prev => ({...prev, fightStatus: FightStatus.BETTING_CLOSED}));
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [appState.fightId, appState.fightStatus]);


    // Handlers
    const handleLogin = async (email: string, password: string):Promise<string | null> => {
        if (!supabase) return "Supabase client not available.";
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return error ? error.message : null;
    };
    
    const handleRegister = async (name: string, email: string, password: string, agentId: string): Promise<string | null> => {
        if (!supabase) return "Supabase client not available.";
        const { error } = await supabase.rpc('handle_new_player', { name, email, password, agent_id: agentId });
        if (error) {
            return error.message;
        }
        showNotification("Registration successful! Please log in.", "success");
        return null; 
    };

    const handleLogout = async () => {
        if (!supabase) return;
        await supabase.auth.signOut();
        setCurrentUser(null);
    };
    
    const handleChangePassword = async (oldPassword: string, newPassword: string): Promise<string|null> => {
        if (!supabase) return "Supabase client not available.";
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) {
            showNotification(error.message, 'error');
            return error.message;
        }
        showNotification("Password updated successfully.", 'success');
        return null;
    };

    const handlePlaceBet = async (amount: number, choice: BetChoice): Promise<string | null> => {
        if (!supabase || !currentUser || !appState.fightId) return "Cannot place bet now.";
        
        const { error } = await supabase.from('bets').insert({
            user_id: currentUser.id,
            fight_id: appState.fightId,
            amount: amount,
            choice: choice
        });
        
        if (error) {
            showNotification(error.message, 'error');
            return error.message;
        }
        showNotification("Bet placed successfully!", "success");
        setCurrentUser(prev => prev ? {...prev, coinBalance: prev.coinBalance - amount} : null);
        return null;
    };

    const handleRequestCoins = async (amount: number, targetUserId: string): Promise<string | null> => {
        if (!supabase || !currentUser) return "Not logged in.";
        
        const { error } = await supabase.from('coin_requests').insert({
            from_user_id: currentUser.id,
            to_user_id: targetUserId,
            amount: amount
        });

        if (error) {
            showNotification(error.message, 'error');
            return error.message;
        }
        showNotification("Coin request sent.", "success");
        return null;
    };
    
    const handleDeclareWinner = async (winner: FightWinner) => {
        if (!supabase || !appState.fightId) {
            console.error("Supabase client not available or no active fight to declare winner.");
            return;
        }
        console.log(`Attempting to declare winner: ${winner} for fight ID: ${appState.fightId}`);
        const { error } = await supabase.rpc('declare_winner', { p_fight_id: appState.fightId, p_winner: winner });
        if (error) {
            console.error("Error declaring winner:", error); // Added more detailed logging
            showNotification(error.message, 'error');
        } else {
            showNotification(`Winner declared: ${winner}`, 'success');
            // Explicitly refetch all data to ensure UI updates after winner declaration
            if (currentUser) {
                await fetchAllData(currentUser);
            }
        }
    };
    
    const handleAddUpcomingFight = async (red: string, white: string): Promise<string | null> => {
        if (!supabase) return "Supabase client not available.";
        const { error } = await supabase.from('upcoming_fights').insert({ red_participant: red, white_participant: white });
        if (error) {
            showNotification(error.message, 'error');
            return error.message;
        }
        showNotification("Fight added to queue.", "success");
        // Explicitly refetch all data to ensure UI updates after adding a fight
        if (currentUser) {
            await fetchAllData(currentUser);
        }
        return null;
    };
    
    const handleStartNextFight = async () => {
        if (!supabase) return;
        const { error } = await supabase.rpc('start_next_fight');
        if (error) {
            showNotification(error.message, 'error');
        } else {
            showNotification("Next fight started!", "success");
            if (currentUser) {
                await fetchAllData(currentUser); // Explicitly refresh data
            }
        }
    };

    const handleCloseBetting = async () => {
        if (!supabase || !appState.fightId) return;
        const { error } = await supabase.rpc('close_betting', { p_fight_id: appState.fightId });
        if (error) {
            showNotification(error.message, 'error');
        } else {
            showNotification("Betting closed.", 'success');
            if (currentUser) {
                await fetchAllData(currentUser); // Explicitly refresh data
            }
        }
    };

    const handleRespondToRequest = async (requestId: string, response: 'APPROVED' | 'DECLINED'): Promise<string | null> => {
        if (!supabase) return "Supabase not configured.";
        const { error } = await supabase.rpc('respond_to_coin_request', { p_request_id: requestId, p_response: response });
        if (error) {
            showNotification(error.message, 'error');
            return error.message;
        }
        showNotification(`Request has been ${response.toLowerCase()}.`, 'success');
        return null;
    };
    
    const createUserByMasterAgent = async (name: string, email: string, password: string, role: UserRole): Promise<string | null> => {
        if (!supabase || !currentUser || currentUser.role !== UserRole.MASTER_AGENT) return "Permission denied.";
        const { error } = await supabase.rpc('create_user_by_master_agent', {
            name, email, password, role, master_agent_id: currentUser.id
        });
        if (error) {
            showNotification(error.message, 'error');
            return error.message;
        }
        showNotification(`${role} created successfully.`, 'success');
        fetchAllData(currentUser); // Refresh user list
        return null;
    };
    
    const handleCreateAgent = (name: string, email: string, password: string) => createUserByMasterAgent(name, email, password, UserRole.AGENT);
    const handleCreateMasterAgent = (name: string, email: string, password: string) => createUserByMasterAgent(name, email, password, UserRole.MASTER_AGENT);
    const handleCreateOperator = (name: string, email: string, password: string) => createUserByMasterAgent(name, email, password, UserRole.OPERATOR);

    const handleStartChat = useCallback(async (targetUser: AllUserTypes) => {
        if (!supabase || !currentUser) return;
        setChatTargetUser(targetUser);
        const { data, error } = await supabase.rpc('get_messages', {
            user1_id: currentUser.id,
            user2_id: targetUser.id
        });
        if (error) {
            showNotification(error.message, 'error');
            setChatMessages([]);
        } else {
            setChatMessages(data.map(m => ({...m, senderId: m.sender_id, receiverId: m.receiver_id, createdAt: m.created_at})));
        }
    }, [currentUser]);
    
    const handleSendMessage = async (text: string, amount: number) => {
        if (!supabase || !chatTargetUser || !currentUser) return; // Added currentUser check
        const { error } = await supabase.rpc('send_message', {
            p_receiver_id: chatTargetUser.id,
            p_text: text,
            p_coin_amount: amount
        });
        if (error) {
            showNotification(error.message, 'error');
        } else {
            // Optimistically add the sent message to the chatMessages state
            setChatMessages(prev => [...prev, {
                id: Math.random().toString(), // Temporary ID, will be replaced by real-time update
                senderId: currentUser.id,
                receiverId: chatTargetUser.id,
                text: text,
                createdAt: new Date().toISOString()
            }]);
            showNotification("Message sent.", "success"); // Added success notification
        }
    };
    
    useEffect(() => {
        if (!supabase || !currentUser || !chatTargetUser) return;

        const messageChannel = supabase.channel(`messages-${currentUser.id}-${chatTargetUser.id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `or(and(sender_id.eq.${currentUser.id},receiver_id.eq.${chatTargetUser.id}),and(sender_id.eq.${chatTargetUser.id},receiver_id.eq.${currentUser.id}))`
            }, (payload) => {
                const newMessage = payload.new as any;
                setChatMessages(prev => [...prev, {id: newMessage.id, senderId: newMessage.sender_id, receiverId: newMessage.receiver_id, text: newMessage.text, createdAt: newMessage.created_at}]);
            }).subscribe();

        return () => {
            supabase.removeChannel(messageChannel);
        };
    }, [currentUser, chatTargetUser]);


    const renderContent = () => {
        if (loading) {
            return <div className="flex items-center justify-center h-screen bg-zinc-900 text-white">Loading...</div>;
        }
        
        if (!currentUser) {
            return <AuthView onLogin={handleLogin} onRegister={handleRegister} isSupabaseConfigured={isSupabaseConfigured} agents={appState.agents} />;
        }
        
        const playerCurrentBet = appState.liveBets.find(b => b.userId === currentUser.id && b.fightId === appState.fightId) || null;

        switch (currentUser.role) {
            case UserRole.PLAYER:
                return <PlayerView 
                    currentUser={currentUser as Player}
                    fightStatus={appState.fightStatus}
                    lastWinner={appState.lastWinner}
                    fightId={appState.fightId}
                    timer={appState.timer}
                    bettingPools={appState.bettingPools}
                    currentBet={playerCurrentBet}
                    onPlaceBet={handlePlaceBet}
                    fightHistory={appState.fightHistory}
                    upcomingFights={appState.upcomingFights}
                    onRequestCoins={handleRequestCoins}
                    agents={appState.agents}
                    isDrawerOpen={isDrawerOpen}
                    onToggleDrawer={() => setDrawerOpen(!isDrawerOpen)}
                    allUsers={allUsers}
                    onStartChat={handleStartChat}
                    liveBets={appState.liveBets}
                 />;
            case UserRole.AGENT:
                return <AgentView
                    currentUser={currentUser as Agent}
                    myPlayers={appState.myPlayers}
                    allUsers={allUsers}
                    transactions={appState.transactions}
                    coinRequests={appState.coinRequests}
                    masterAgents={appState.masterAgents}
                    liveBets={appState.liveBets}
                    fightId={appState.fightId}
                    onRespondToRequest={handleRespondToRequest}
                    onRequestCoins={handleRequestCoins}
                    onStartChat={handleStartChat}
                />;
            case UserRole.MASTER_AGENT:
                 return <MasterAgentView
                    currentUser={currentUser as MasterAgent}
                    myAgents={appState.myAgents}
                    allUsers={allUsers}
                    transactions={appState.transactions}
                    coinRequests={appState.coinRequests}
                    liveBets={appState.liveBets}
                    fightId={appState.fightId}
                    onRespondToRequest={handleRespondToRequest}
                    onCreateAgent={handleCreateAgent}
                    onCreateMasterAgent={handleCreateMasterAgent}
                    onCreateOperator={handleCreateOperator}
                    onStartChat={handleStartChat}
                />;
            case UserRole.OPERATOR:
                return <OperatorView
                    currentUser={currentUser as Operator}
                    fightStatus={appState.fightStatus}
                    lastWinner={appState.lastWinner}
                    fightId={appState.fightId}
                    timer={appState.timer}
                    bettingPools={appState.bettingPools}
                    liveBets={appState.liveBets}
                    upcomingFights={appState.upcomingFights}
                    completedFights={appState.completedFights}
                    allUsers={allUsers}
                    onDeclareWinner={handleDeclareWinner}
                    onAddUpcomingFight={handleAddUpcomingFight}
                    onStartNextFight={handleStartNextFight}
                    onCloseBetting={handleCloseBetting}
                 />;
            default:
                return <div className="flex items-center justify-center h-screen bg-zinc-900 text-white">Unknown user role.</div>;
        }
    };

    return (
        <>
            {currentUser && <Header currentUser={currentUser} onLogout={handleLogout} onSettings={() => setSettingsOpen(true)} onToggleDrawer={() => setDrawerOpen(!isDrawerOpen)} />}
            {renderContent()}
            {notification && <NotificationComponent message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
            {chatTargetUser && currentUser && <ChatModal currentUser={currentUser} chatTargetUser={chatTargetUser} messages={chatMessages} onClose={() => setChatTargetUser(null)} onSendMessage={handleSendMessage} />}
            {isSettingsOpen && <ChangePasswordModal onClose={() => setSettingsOpen(false)} onChangePassword={handleChangePassword} />}
        </>
    );
};

export default App;
