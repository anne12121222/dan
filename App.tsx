import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  AllUserTypes, UserRole, FightStatus, Player, Agent, MasterAgent, Operator,
  FightResult, UpcomingFight, Bet, Transaction, CoinRequest, Message,
  PlayerFightHistoryEntry, Notification as NotificationType, FightWinner, BetChoice
} from './types';
import AuthView from './components/AuthView';
import Header from './components/Header';
import PlayerView from './components/PlayerView';
import AgentView from './components/AgentView';
import MasterAgentView from './components/MasterAgentView';
import OperatorView from './components/OperatorView';
import NotificationComponent from './components/Notification';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import ChangePasswordModal from './components/ChangePasswordModal';


const FIGHT_TIMER_DURATION = 15; // 15 seconds for betting

const App: React.FC = () => {
    const [currentUser, setCurrentUser] = useState<AllUserTypes | null>(null);
    const [allUsers, setAllUsers] = useState<{ [id: string]: AllUserTypes }>({});
    
    // Global game state
    const [fightId, setFightId] = useState<number | null>(null);
    const [fightStatus, setFightStatus] = useState<FightStatus>(FightStatus.SETTLED);
    const [timer, setTimer] = useState(FIGHT_TIMER_DURATION);
    const [lastWinner, setLastWinner] = useState<FightWinner | null>(null);
    const [pools, setPools] = useState({ meron: 0, wala: 0 });
    const [fightHistory, setFightHistory] = useState<FightResult[]>([]);
    const [upcomingFights, setUpcomingFights] = useState<UpcomingFight[]>([]);
    const [currentBets, setCurrentBets] = useState<Bet[]>([]);

    // User-specific data
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [coinRequests, setCoinRequests] = useState<CoinRequest[]>([]);
    const [messages, setMessages] = useState<{ [userId: string]: Message[] }>({});
    
    // UI State
    const [isLoading, setIsLoading] = useState(true); // Global loading for auth check
    const [notification, setNotification] = useState<NotificationType | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [registerableAgents, setRegisterableAgents] = useState<Agent[]>([]);
    
    const realtimeChannel = useRef<any>(null);


    const showNotification = useCallback((message: string, type: 'success' | 'error') => {
        setNotification({ id: Date.now(), message, type });
    }, []);
    
    const handleRpcError = (error: any, defaultMessage: string) => {
        console.error(defaultMessage, error);
        showNotification(error?.message || defaultMessage, 'error');
        return error?.message || defaultMessage;
    };

    const mapProfileToUserType = (profile: any): AllUserTypes => {
        const user: AllUserTypes = {
            id: profile.id, name: profile.name, email: profile.email, role: profile.role, coinBalance: profile.coin_balance,
            commissionBalance: profile.commission_balance,
            commissionRate: profile.commission_rate,
            transferFee: profile.transfer_fee,
            ...(profile.role === UserRole.PLAYER && { agentId: profile.agent_id! }),
            ...(profile.role === UserRole.AGENT && { masterAgentId: profile.master_agent_id! }),
        };
        return user;
    };
    
    const refreshAllData = useCallback(async () => {
        if (!supabase) return;
        
        // Fetch all users/profiles
        const { data: profilesData, error: profilesError } = await supabase.from('profiles').select('*');
        if (profilesError) console.error("Error fetching profiles:", profilesError);
        else {
            const usersMap = profilesData.reduce((acc, p) => {
                acc[p.id] = mapProfileToUserType(p);
                return acc;
            }, {} as { [id: string]: AllUserTypes });
            setAllUsers(usersMap);
            // Also refresh current user's data from the new map
             if (currentUser && usersMap[currentUser.id]) {
                setCurrentUser(usersMap[currentUser.id]);
            }
        }
        
        // Fetch current fight state
        const { data: currentFight, error: currentFightError } = await supabase
            .from('fights')
            .select('*')
            .order('id', { ascending: false })
            .limit(1)
            .single();
        
        if (currentFightError && currentFightError.code !== 'PGRST116') { // Ignore "Row not found" error
            console.error('Error fetching current fight state:', currentFightError);
        } else if (currentFight) {
            setFightId(currentFight.id);
            setFightStatus(currentFight.status);
            setLastWinner(currentFight.winner);

            // Fetch bets for the current fight
            const { data: betsData, error: betsError } = await supabase.from('bets').select('*').eq('fight_id', currentFight.id);
            if (betsError) console.error('Error fetching bets:', betsError);
            else {
                setCurrentBets(betsData);
                const newPools = betsData.reduce((acc, bet) => {
                    if (bet.choice === 'RED') acc.meron += bet.amount;
                    if (bet.choice === 'WHITE') acc.wala += bet.amount;
                    return acc;
                }, { meron: 0, wala: 0 });
                setPools(newPools);
            }
        } else {
             setFightId(null);
        }

        // Fetch fight history
        const { data: historyData, error: historyError } = await supabase.from('fights').select('*').order('created_at', { ascending: false }).limit(50);
        if (historyError) console.error('Error fetching fight history:', historyError);
        else setFightHistory(historyData.map(f => ({...f, bets: []})));

        // Fetch upcoming fights
        const { data: upcomingData, error: upcomingError } = await supabase.from('upcoming_fights').select('*').order('id', { ascending: true });
        if (upcomingError) console.error('Error fetching upcoming fights:', upcomingError);
        else setUpcomingFights(upcomingData.map(uf => ({ ...uf, participants: uf.participants as any })));

        // Fetch user-specific data
        const { data: txs, error: txsError } = await supabase.rpc('get_transactions_for_user');
        if(txsError) console.error("Error fetching transactions:", txsError);
        else setTransactions(txs);

        const { data: reqs, error: reqsError } = await supabase.rpc('get_coin_requests_for_user');
        if(reqsError) console.error("Error fetching coin requests:", reqsError);
        else setCoinRequests(reqs);

    }, [currentUser]);

    useEffect(() => {
        const fetchAgentsForRegistration = async () => {
            if (!isSupabaseConfigured || !supabase) return;
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('role', UserRole.AGENT);

            if (error) {
                console.error("Error fetching agents for registration:", error.message || error);
            } else if (data) {
                setRegisterableAgents(data.map(mapProfileToUserType) as Agent[]);
            }
        };
        fetchAgentsForRegistration();
    }, []);

    // Effect for handling authentication state changes
    useEffect(() => {
        if (!isSupabaseConfigured || !supabase) {
            setIsLoading(false);
            return;
        }

        const handleAuthChange = async (session: any) => {
             if (session?.user) {
                const { data: profile, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();

                if (error || !profile) {
                    console.error("Login failed: Could not find a user profile.", error);
                    showNotification("Login failed: Your user profile could not be loaded.", 'error');
                    await supabase.auth.signOut();
                    setCurrentUser(null);
                } else {
                    setCurrentUser(mapProfileToUserType(profile));
                }
            } else {
                setCurrentUser(null);
                setAllUsers({});
            }
            setIsLoading(false); // Authentication check is complete, render the app
        };

        supabase.auth.getSession().then(({ data: { session } }) => handleAuthChange(session));
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => handleAuthChange(session));
        
        return () => subscription.unsubscribe();
    }, [showNotification]);

    // Effect for fetching data after a user has been authenticated
    useEffect(() => {
        if (currentUser) {
            refreshAllData();
        }
    }, [currentUser, refreshAllData]);

    // Effect for setting up real-time subscriptions
    useEffect(() => {
        if (!supabase || !currentUser) {
            if (realtimeChannel.current) {
                supabase.removeChannel(realtimeChannel.current);
                realtimeChannel.current = null;
            }
            return;
        };

        if (realtimeChannel.current) return; // Already subscribed

        realtimeChannel.current = supabase.channel('realtime-all')
            .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
                console.log('Realtime change received!', payload);
                refreshAllData();
            })
            .subscribe();

        return () => {
            if (realtimeChannel.current) {
                supabase.removeChannel(realtimeChannel.current);
                realtimeChannel.current = null;
            }
        };
    }, [currentUser, refreshAllData, supabase]);

    const handleLogin = async (email: string, password: string): Promise<string | null> => {
        if (!isSupabaseConfigured) return "Supabase is not configured.";
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return error.message;
        // onAuthStateChange listener will handle the rest
        return null;
    };
    
    const handleRegister = async (name: string, email: string, password: string, agentId: string | null): Promise<string | null> => {
        if (!isSupabaseConfigured) return "Supabase is not configured.";
        const { error } = await supabase.auth.signUp({
            email, password,
            options: { data: { name, agent_id: agentId, role: UserRole.PLAYER } }
        });
        if (error) return error.message;
        showNotification('Registration successful! Check your email for verification.', 'success');
        return null;
    };

    const handleLogout = async () => {
        if (!isSupabaseConfigured || !supabase) return;
        setIsLoading(true);
        const { error } = await supabase.auth.signOut();
        if (error) {
            showNotification(`Error logging out: ${error.message}`, 'error');
            setIsLoading(false);
        }
        // onAuthStateChange will handle setting user to null and isLoading to false
    };
    
    const handleStartNextFight = async () => {
        if (!supabase) return;
        const { error } = await supabase.rpc('start_next_fight');
        if (error) handleRpcError(error, "Failed to start next fight.");
        else showNotification(`Next fight started! Betting is open.`, 'success');
    };

    const handleCloseBetting = useCallback(async () => {
        if (!supabase || fightId === null) return;
        const { error } = await supabase.rpc('close_betting', { p_fight_id: fightId });
        if(error) handleRpcError(error, "Failed to close betting.");
        else showNotification('Betting is now closed.', 'success');
    }, [fightId, supabase]);

    useEffect(() => {
        let interval: ReturnType<typeof setInterval> | null = null;
        if (fightStatus === FightStatus.BETTING_OPEN && timer > 0) {
            interval = setInterval(() => setTimer(t => t - 1), 1000);
        } else if (fightStatus === FightStatus.BETTING_OPEN && timer === 0) {
            handleCloseBetting();
        } else if (fightStatus !== FightStatus.BETTING_OPEN) {
            setTimer(FIGHT_TIMER_DURATION);
        }
        
        return () => {
            if(interval) clearInterval(interval);
        };
    }, [fightStatus, timer, handleCloseBetting]);

    const onDeclareWinner = async (winner: FightWinner) => {
        if (!supabase || fightId === null) return;
        const { error } = await supabase.rpc('declare_winner', { p_fight_id: fightId, p_winner: winner });
        if(error) handleRpcError(error, "Failed to declare winner.");
        else showNotification(`Fight #${fightId} settled. Winner: ${winner}`, 'success');
    };
    
    const onAddUpcomingFight = async (red: string, white: string): Promise<string | null> => {
        if (!supabase) return "Not connected";
        const { error } = await supabase.rpc('add_upcoming_fight', { p_red: red, p_white: white });
        if (error) return handleRpcError(error, "Failed to add fight.");
        showNotification('New fight added to the queue.', 'success');
        return null;
    };
    
    const onPlaceBet = async (amount: number, choice: BetChoice): Promise<string | null> => {
        if (!supabase || fightId === null) return "Not connected";
        const { data, error } = await supabase.rpc('place_bet', { p_fight_id: fightId, p_amount: amount, p_choice: choice });
        if (error) return handleRpcError(error, "Failed to place bet.");
        if (data) return data; // Can return error messages from function
        showNotification(`Bet of ${amount} placed on ${choice}.`, 'success');
        return null;
    };
    
    const onCreateCoinRequest = async (amount: number): Promise<string | null> => {
        if (!supabase) return "Not connected";
        const { data, error } = await supabase.rpc('create_coin_request', { p_amount: amount });
        if (error) return handleRpcError(error, "Failed to create request.");
        if (data) return data;
        showNotification(`Coin request of ${amount} sent.`, 'success');
        return null;
    }
    
    const onRespondToRequest = async (requestId: string, response: 'APPROVED' | 'DECLINED'): Promise<string | null> => {
        if (!supabase) return "Not connected";
        const { data, error } = await supabase.rpc('respond_to_coin_request', { p_request_id: requestId, p_response: response });
        if(error) return handleRpcError(error, "Failed to respond to request.");
        if(data) return data;
        showNotification(`Request has been ${response.toLowerCase()}.`, 'success');
        return null;
    };

    const onSendMessage = async (receiverId: string, text: string, amount: number) => {
        if(!supabase) return;
        const { data, error } = await supabase.rpc('send_message_and_coins', {p_receiver_id: receiverId, p_text: text, p_amount: amount });
        if(error) handleRpcError(error, "Failed to send message/coins.");
        if(data) showNotification(data, 'error');
    };
    
    const onChangePassword = async (oldPassword: string, newPassword: string): Promise<string | null> => {
        if (!isSupabaseConfigured || !supabase) return "Supabase is not configured.";
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) return error.message;
        showNotification("Password updated successfully.", 'success');
        return null;
    };

    const handleCreateAgent = async (name: string, email: string, password: string):Promise<string|null> => {
        if (!supabase) return "Not connected";
        const { data, error } = await supabase.rpc('create_agent', { p_name: name, p_email: email, p_password: password });
        if(error) return handleRpcError(error, "Failed to create agent.");
        if(data && data.startsWith('Error:')) return data;
        showNotification(data || 'Agent created successfully!', 'success');
        return null;
    }

    const renderUserView = () => {
        if (!currentUser) {
            // This case should ideally not be hit if a user is logged in, but serves as a fallback.
            return <div className="text-center p-8 text-gray-400">Loading user data...</div>;
        }

        switch (currentUser.role) {
            case UserRole.PLAYER:
                const playerHistory: PlayerFightHistoryEntry[] = fightHistory.map(fh => {
                     const bet = currentBets.find(b => b.fightId === fh.id && b.userId === currentUser.id) 
                                || fightHistory.flatMap(f => f.bets ?? []).find(b => b.fightId === fh.id && b.userId === currentUser.id);
                    let outcome: PlayerFightHistoryEntry['outcome'] = undefined;
                    if(bet){
                        if(fh.winner === "DRAW" || fh.winner === "CANCELLED") outcome = 'REFUND';
                        else if(fh.winner === bet.choice) outcome = 'WIN';
                        else outcome = 'LOSS';
                    }
                    return {...fh, bet, outcome};
                });
                return (
                    <PlayerView
                        currentUser={currentUser as Player} fightStatus={fightStatus} lastWinner={lastWinner} fightId={fightId} timer={timer} pools={pools} fightHistory={playerHistory} onPlaceBet={onPlaceBet}
                        currentBet={currentBets.find(b => b.userId === currentUser.id && b.fightId === fightId) || null}
                        isDrawerOpen={isDrawerOpen} onCloseDrawer={() => setIsDrawerOpen(false)} upcomingFights={upcomingFights} onCreateCoinRequest={onCreateCoinRequest}
                    />
                );
            case UserRole.AGENT:
                return (
                    <AgentView
                        currentUser={currentUser as Agent}
                        players={Object.values(allUsers).filter(u => u.role === UserRole.PLAYER && u.agentId === currentUser.id) as Player[]}
                        transactions={transactions} coinRequests={coinRequests.filter(r => r.to_user_id === currentUser.id || r.from_user_id === currentUser.id)}
                        onRespondToRequest={onRespondToRequest} onCreateCoinRequest={onCreateCoinRequest} onSendMessage={onSendMessage} messages={messages} allUsers={allUsers}
                    />
                );
            case UserRole.MASTER_AGENT:
                 return (
                    <MasterAgentView
                        currentUser={currentUser as MasterAgent}
                        agents={Object.values(allUsers).filter(u => u.role === UserRole.AGENT && u.masterAgentId === currentUser.id) as Agent[]}
                        transactions={transactions} coinRequests={coinRequests.filter(r => r.to_user_id === currentUser.id || r.from_user_id === currentUser.id)}
                        onRespondToRequest={onRespondToRequest} onCreateCoinRequest={onCreateCoinRequest} onSendMessage={onSendMessage}
                        messages={messages} allUsers={allUsers} onCreateAgent={handleCreateAgent}
                    />
                );
            case UserRole.OPERATOR:
                return (
                    <OperatorView
                        currentUser={currentUser as Operator} fightStatus={fightStatus} lastWinner={lastWinner} fightId={fightId} timer={timer} fightHistory={fightHistory}
                        upcomingFights={upcomingFights} currentBets={currentBets} allUsers={allUsers} onStartNextFight={handleStartNextFight}
                        onCloseBetting={handleCloseBetting} onDeclareWinner={onDeclareWinner} onAddUpcomingFight={onAddUpcomingFight}
                    />
                );
            default:
                return <p>Loading view...</p>;
        }
    };
    
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-zinc-900 text-gray-400">
                Loading Application...
            </div>
        );
    }
    
    if (!currentUser) {
        return <AuthView onLogin={handleLogin} onRegister={handleRegister} isSupabaseConfigured={isSupabaseConfigured}
            agents={registerableAgents}
        />;
    }

    return (
        <div className="min-h-screen bg-zinc-900 text-gray-200">
            <Header currentUser={currentUser} onLogout={handleLogout} onSettings={() => setIsSettingsOpen(true)} onToggleDrawer={() => setIsDrawerOpen(!isDrawerOpen)} />
            <main className="p-4 sm:p-6 lg:p-8">
                {renderUserView()}
            </main>
            {notification && <NotificationComponent message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
            {isSettingsOpen && <ChangePasswordModal onClose={() => setIsSettingsOpen(false)} onChangePassword={onChangePassword} />}
        </div>
    );
};

export default App;