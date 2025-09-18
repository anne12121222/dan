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
    const [playerBets, setPlayerBets] = useState<Bet[]>([]); // For player bet history
    const [allMessages, setAllMessages] = useState<{ [conversationId: string]: Message[] }>({});
    
    // UI State
    const [isLoading, setIsLoading] = useState(true); // Global loading for auth check
    const [notification, setNotification] = useState<NotificationType | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [registerableAgents, setRegisterableAgents] = useState<{id: string, name: string}[]>([]);
    const [chatTargetUser, setChatTargetUser] = useState<AllUserTypes | null>(null);
    const [isMasquerading, setIsMasquerading] = useState(false);
    
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
            id: profile.id, 
            name: profile.name, 
            email: profile.email, 
            role: profile.role, 
            coinBalance: profile.coin_balance || 0,
            commissionBalance: profile.commission_balance || 0,
            commissionRate: profile.commission_rate || 0,
            transferFee: profile.transfer_fee || 0,
            ...(profile.role === UserRole.PLAYER && { agentId: profile.agent_id! }),
            ...(profile.role === UserRole.AGENT && { masterAgentId: profile.master_agent_id! }),
        };
        return user;
    };
    
    const refreshAllData = useCallback(async () => {
        if (!supabase || !currentUser) return;
        
        try {
            // Fetch all users/profiles with better error handling
            let profilesData;
            let profilesError;
            
            if (currentUser.role === UserRole.OPERATOR) {
                try {
                    const { data, error } = await supabase.rpc('get_all_users_for_operator');
                    profilesData = data;
                    profilesError = error;
                } catch (rpcError) {
                    console.warn("RPC function 'get_all_users_for_operator' failed, falling back to direct query", rpcError);
                    const { data, error } = await supabase.from('profiles').select('*');
                    profilesData = data;
                    profilesError = error;
                }
            } else {
                const { data, error } = await supabase.from('profiles').select('*');
                profilesData = data;
                profilesError = error;
            }
            
            if (profilesError) {
                console.error("Error fetching profiles:", profilesError);
            } else if (profilesData) {
                const usersMap = profilesData.reduce((acc, p) => {
                    acc[p.id] = mapProfileToUserType(p);
                    return acc;
                }, {} as { [id: string]: AllUserTypes });
                setAllUsers(usersMap);
                // Also refresh current user's data from the new map
                if (usersMap[currentUser.id]) {
                    setCurrentUser(usersMap[currentUser.id]);
                }
            }
            
            // Fetch current fight state with error handling
            try {
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
                    if (betsError) {
                        console.error('Error fetching bets:', betsError);
                    } else {
                        setCurrentBets(betsData || []);
                        const newPools = (betsData || []).reduce((acc, bet) => {
                            if (bet.choice === 'RED') acc.meron += bet.amount;
                            if (bet.choice === 'WHITE') acc.wala += bet.amount;
                            return acc;
                        }, { meron: 0, wala: 0 });
                        setPools(newPools);
                    }
                } else {
                    setFightId(null);
                }
            } catch (fightError) {
                console.error('Error in fight data fetching:', fightError);
            }

            // Fetch fight history with error handling
            try {
                const { data: historyData, error: historyError } = await supabase.from('fights').select('*').order('created_at', { ascending: false }).limit(50);
                if (historyError) {
                    console.error('Error fetching fight history:', historyError);
                } else {
                    setFightHistory(historyData || []);
                }
            } catch (historyError) {
                console.error('Error in fight history fetching:', historyError);
            }

            // Fetch upcoming fights with error handling
            try {
                const { data: upcomingData, error: upcomingError } = await supabase.from('upcoming_fights').select('*').order('id', { ascending: true });
                if (upcomingError) {
                    console.error('Error fetching upcoming fights:', upcomingError);
                } else {
                    setUpcomingFights((upcomingData || []).map(uf => ({ ...uf, participants: uf.participants as any })));
                }
            } catch (upcomingError) {
                console.error('Error in upcoming fights fetching:', upcomingError);
            }

            // Fetch user-specific data with error handling
            try {
                const { data: txs, error: txsError } = await supabase.rpc('get_transactions_for_user');
                if(txsError) {
                    console.error("Error fetching transactions:", txsError);
                } else {
                    setTransactions(txs || []);
                }
            } catch (txError) {
                console.error("RPC error fetching transactions:", txError);
                setTransactions([]);
            }

            try {
                const { data: reqs, error: reqsError } = await supabase.rpc('get_coin_requests_for_user');
                if(reqsError) {
                    console.error("Error fetching coin requests:", reqsError);
                } else {
                    setCoinRequests(reqs || []);
                }
            } catch (reqError) {
                console.error("RPC error fetching coin requests:", reqError);
                setCoinRequests([]);
            }
            
            if (currentUser.role === UserRole.PLAYER) {
                try {
                    const { data: allMyBets, error: betsError } = await supabase.from('bets').select('*').eq('user_id', currentUser.id);
                    if(betsError) {
                        console.error("Error fetching player bets:", betsError);
                    } else {
                        setPlayerBets(allMyBets || []);
                    }
                } catch (betError) {
                    console.error("Error in player bets fetching:", betError);
                }
            }

            // FIX: Also refresh messages for the currently open chat window to ensure real-time updates.
            if (chatTargetUser) {
                try {
                    const { data, error } = await supabase.rpc('get_messages', { p_other_user_id: chatTargetUser.id });
                    if (error) {
                        console.error(`Failed to refresh messages for ${chatTargetUser.name}`, error);
                    } else {
                        setAllMessages(prev => ({...prev, [chatTargetUser.id]: (data || []).map(m => ({ ...m, senderId: m.sender_id, receiverId: m.receiver_id, createdAt: m.created_at })) }));
                    }
                } catch (msgError) {
                    console.error("RPC error fetching messages:", msgError);
                }
            }
        } catch (globalError) {
            console.error("Global error in refreshAllData:", globalError);
        }
    }, [currentUser, chatTargetUser]);

    useEffect(() => {
        const fetchAgentsForRegistration = async () => {
            if (!isSupabaseConfigured || !supabase) return;
            
            try {
                // Fetch agents from the new secure RPC function
                const { data, error } = await supabase.rpc('get_registerable_agents');

                if (error) {
                    console.error("Error fetching agents for registration:", error.message || error);
                    // Fallback: try to fetch agents directly from profiles table
                    const { data: fallbackData, error: fallbackError } = await supabase
                        .from('profiles')
                        .select('id, name')
                        .eq('role', 'AGENT');
                    
                    if (fallbackError) {
                        console.error("Fallback agent fetch also failed:", fallbackError);
                        setRegisterableAgents([]);
                    } else {
                        setRegisterableAgents(fallbackData || []);
                    }
                } else if (data) {
                    setRegisterableAgents(data);
                }
            } catch (agentError) {
                console.error("Exception in fetchAgentsForRegistration:", agentError);
                setRegisterableAgents([]);
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
                try {
                    const { data: profile, error } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', session.user.id)
                        .single();

                    if (error || !profile) {
                        console.error("Login failed: Could not find a user profile.", error);
                        
                        // Check if this is a new user that needs a profile created
                        if (error?.code === 'PGRST116') {
                            // Try to create a profile from auth metadata
                            const userData = session.user.user_metadata;
                            if (userData && userData.name) {
                                try {
                                    const { data: newProfile, error: createError } = await supabase
                                        .from('profiles')
                                        .insert({
                                            id: session.user.id,
                                            name: userData.name,
                                            email: session.user.email,
                                            role: userData.role || UserRole.PLAYER,
                                            agent_id: userData.agent_id || null,
                                            coin_balance: 0,
                                            commission_balance: 0,
                                            commission_rate: 0,
                                            transfer_fee: 0
                                        })
                                        .select()
                                        .single();
                                
                                if (createError) {
                                    console.error("Failed to create profile:", createError);
                                    showNotification("Failed to create user profile. Please contact administrator.", 'error');
                                    await supabase.auth.signOut();
                                    setCurrentUser(null);
                                } else {
                                    console.log("Profile created successfully:", newProfile);
                                    setCurrentUser(mapProfileToUserType(newProfile));
                                }
                            } else {
                                showNotification("User profile data is incomplete. Please contact administrator.", 'error');
                                await supabase.auth.signOut();
                                setCurrentUser(null);
                            }
                        } else {
                            showNotification("Login failed: Your user profile could not be loaded.", 'error');
                            await supabase.auth.signOut();
                            setCurrentUser(null);
                        }
                    } else {
                        setCurrentUser(mapProfileToUserType(profile));
                    }
                } catch (authError) {
                    console.error("Exception in auth handling:", authError);
                    showNotification("Authentication error occurred. Please try again.", 'error');
                    await supabase.auth.signOut();
                    setCurrentUser(null);
                }
            } else {
                setCurrentUser(null);
                setAllUsers({});
                setIsMasquerading(false); // Reset masquerade on logout
            }
            setIsLoading(false);
        };

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            handleAuthChange(session);
        });
        
        return () => {
            if (subscription) {
                subscription.unsubscribe();
            }
        };
    }, [showNotification]);

    useEffect(() => {
        if (currentUser) {
            refreshAllData();
        }
    }, [currentUser, refreshAllData]);

    useEffect(() => {
        if (!supabase || !currentUser) {
            if (realtimeChannel.current) {
                supabase.removeChannel(realtimeChannel.current);
                realtimeChannel.current = null;
            }
            return;
        };

        if (realtimeChannel.current) return;

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
        
        try {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) return error.message;
            return null;
        } catch (loginError) {
            console.error("Login exception:", loginError);
            return "Login failed due to network error. Please try again.";
        }
    };
    
    const handleRegister = async (name: string, email: string, password: string, agentId: string | null): Promise<string | null> => {
        if (!isSupabaseConfigured) return "Supabase is not configured.";
        
        try {
            const { error } = await supabase.auth.signUp({
                email, password,
                options: { data: { name, agent_id: agentId, role: UserRole.PLAYER } }
            });
            if (error) return error.message;
            showNotification('Registration successful! Check your email for verification.', 'success');
            return null;
        } catch (registerError) {
            console.error("Registration exception:", registerError);
            return "Registration failed due to network error. Please try again.";
        }
    };

    const handleLogout = async () => {
        if (!isSupabaseConfigured || !supabase) return;
        setIsLoading(true);
        const { error } = await supabase.auth.signOut();
        if (error) {
            showNotification(`Error logging out: ${error.message}`, 'error');
            setIsLoading(false);
        }
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
        if (data) return data; 
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
    
    const handleOpenChat = async (targetUser: AllUserTypes) => {
        if (!supabase) return;
        setChatTargetUser(targetUser);
        const { data, error } = await supabase.rpc('get_messages', { p_other_user_id: targetUser.id });
        if (error) {
            handleRpcError(error, `Failed to fetch messages for ${targetUser.name}`);
        } else {
            setAllMessages(prev => ({...prev, [targetUser.id]: (data || []).map(m => ({ ...m, senderId: m.sender_id, receiverId: m.receiver_id, createdAt: m.created_at })) }));
        }
    };
    
    const onSendMessage = async (receiverId: string, text: string, amount: number) => {
        if(!supabase) return;
        const { data, error } = await supabase.rpc('send_message_and_coins', {p_receiver_id: receiverId, p_text: text, p_amount: amount });
        if(error) handleRpcError(error, "Failed to send message/coins.");
        if(data) showNotification(data, 'error');
        // No need to manually refresh, realtime will handle it
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
    };

    const handleCreateMasterAgent = async (name: string, email: string, password: string):Promise<string|null> => {
        if (!supabase) return "Not connected";
        const { data, error } = await supabase.rpc('create_master_agent', { p_name: name, p_email: email, p_password: password });
        if(error) return handleRpcError(error, "Failed to create master agent.");
        if(data && data.startsWith('Error:')) return data;
        showNotification(data || 'Master Agent created successfully!', 'success');
        return null;
    };
    
    const handleCreateOperator = async (name: string, email: string, password: string):Promise<string|null> => {
        if (!supabase) return "Not connected";
        const { data, error } = await supabase.rpc('create_operator', { p_name: name, p_email: email, p_password: password });
        if(error) return handleRpcError(error, "Failed to create operator.");
        if(data && data.startsWith('Error:')) return data;
        showNotification(data || 'Operator created successfully!', 'success');
        return null;
    };

    const renderUserView = () => {
        if (!currentUser) {
            return <div className="text-center p-8 text-gray-400">Loading user data...</div>;
        }

        const effectiveRole = isMasquerading && currentUser.role === UserRole.MASTER_AGENT ? UserRole.OPERATOR : currentUser.role;

        switch (effectiveRole) {
            case UserRole.PLAYER:
                const playerHistory: PlayerFightHistoryEntry[] = fightHistory.map(fh => {
                    const bet = playerBets.find(b => b.fightId === fh.id);
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
                const agentPlayers = Object.values(allUsers).filter((u: AllUserTypes): u is Player => 
                    u.role === UserRole.PLAYER && (u as Player).agentId === currentUser.id
                );
                return (
                    <AgentView
                        currentUser={currentUser as Agent}
                        players={agentPlayers}
                        transactions={transactions} coinRequests={coinRequests.filter(r => r.to_user_id === currentUser.id || r.from_user_id === currentUser.id)}
                        onRespondToRequest={onRespondToRequest} onCreateCoinRequest={onCreateCoinRequest} onSendMessage={onSendMessage} 
                        messages={allMessages} allUsers={allUsers} onOpenChat={handleOpenChat} chatTargetUser={chatTargetUser} onCloseChat={() => setChatTargetUser(null)}
                    />
                );
            case UserRole.MASTER_AGENT:
                const masterAgentAgents = Object.values(allUsers).filter((u: AllUserTypes): u is Agent => 
                    u.role === UserRole.AGENT && (u as Agent).masterAgentId === currentUser.id
                );
                 return (
                    <MasterAgentView
                        currentUser={currentUser as MasterAgent}
                        agents={masterAgentAgents}
                        transactions={transactions} coinRequests={coinRequests.filter(r => r.to_user_id === currentUser.id || r.from_user_id === currentUser.id)}
                        onRespondToRequest={onRespondToRequest} onSendMessage={onSendMessage}
                        messages={allMessages} allUsers={allUsers} onCreateAgent={handleCreateAgent} onOpenChat={handleOpenChat}
                        chatTargetUser={chatTargetUser} onCloseChat={() => setChatTargetUser(null)}
                        fightStatus={fightStatus} lastWinner={lastWinner} fightId={fightId} timer={timer} 
                        fightHistory={fightHistory} upcomingFights={upcomingFights}
                        onMasquerade={() => setIsMasquerading(true)}
                        onCreateOperator={handleCreateOperator}
                    />
                );
            case UserRole.OPERATOR:
                return (
                    <OperatorView
                        currentUser={currentUser as Operator} fightStatus={fightStatus} lastWinner={lastWinner} fightId={fightId} timer={timer} fightHistory={fightHistory}
                        upcomingFights={upcomingFights} currentBets={currentBets} allUsers={allUsers} onStartNextFight={handleStartNextFight}
                        onCloseBetting={handleCloseBetting} onDeclareWinner={onDeclareWinner} onAddUpcomingFight={onAddUpcomingFight} onCreateMasterAgent={handleCreateMasterAgent}
                        onExitMasquerade={isMasquerading ? () => setIsMasquerading(false) : undefined}
                        onOpenChat={handleOpenChat}
                        chatTargetUser={chatTargetUser} onCloseChat={() => setChatTargetUser(null)} onSendMessage={onSendMessage} messages={allMessages}
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