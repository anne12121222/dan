
import React, { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { Session } from '@supabase/supabase-js';
import {
  AllUserTypes, UserRole, FightStatus, Bet, FightResult, UpcomingFight,
  Player, Agent, MasterAgent, Transaction, Message, PlayerFightHistoryEntry,
  CoinRequest, NotificationMessage, FightWinner
} from './types';
import AuthView from './components/AuthView';
import Header from './components/Header';
import PlayerView from './components/PlayerView';
import OperatorView from './components/OperatorView';
import MasterAgentView from './components/MasterAgentView';
import AgentView from './components/AgentView';
import ChatModal from './components/ChatModal';
import NotificationComponent from './components/Notification';
import ChangePasswordModal from './components/ChangePasswordModal';

const BETTING_TIMER_SECONDS = 60;

const App: React.FC = () => {
    // Auth & User State
    const [session, setSession] = useState<Session | null>(null);
    const [currentUser, setCurrentUser] = useState<AllUserTypes | null>(null);
    const [allUsers, setAllUsers] = useState<{ [id: string]: AllUserTypes }>({});
    const [loading, setLoading] = useState(true);

    // Fight State
    const [fightId, setFightId] = useState<number>(0);
    const [fightStatus, setFightStatus] = useState<FightStatus>(FightStatus.SETTLED);
    const [lastWinner, setLastWinner] = useState<FightWinner | null>(null);
    const [timer, setTimer] = useState(BETTING_TIMER_SECONDS);
    const [fightHistory, setFightHistory] = useState<FightResult[]>([]);
    const [upcomingFights, setUpcomingFights] = useState<UpcomingFight[]>([]);

    // Betting State
    const [currentBets, setCurrentBets] = useState<Bet[]>([]);
    const [pools, setPools] = useState<{ meron: number; wala: number }>({ meron: 0, wala: 0 });
    const [playerBet, setPlayerBet] = useState<Bet | null>(null);
    const [playerBetHistory, setPlayerBetHistory] = useState<Bet[]>([]);

    // Agent/MA State
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [coinRequests, setCoinRequests] = useState<CoinRequest[]>([]);

    // UI State
    const [isDrawerOpen, setDrawerOpen] = useState(false);
    const [isSettingsOpen, setSettingsOpen] = useState(false);
    const [chatTargetUser, setChatTargetUser] = useState<AllUserTypes | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [unreadMessageCounts, setUnreadMessageCounts] = useState<{ [senderId: string]: number }>({});
    const [notification, setNotification] = useState<NotificationMessage | null>(null);

    const showNotification = (message: string, type: 'success' | 'error') => {
        setNotification({ message, type });
    };

    const fetchAllUsers = useCallback(async () => {
        if (!supabase) return;
        const { data, error } = await supabase.from('profiles').select('*');
        if (data) {
            const usersMap = data.reduce((acc, user) => {
                acc[user.id] = {
                    id: user.id, name: user.name, email: user.email, 
                    role: user.role as UserRole,
                    coinBalance: user.coin_balance,
                    ...(user.role === 'PLAYER' && { agentId: user.agent_id }),
                    ...(user.role === 'AGENT' && { masterAgentId: user.master_agent_id }),
                    ...(user.role === 'MASTER_AGENT' && { commissionBalance: user.commission_balance }),
                };
                return acc;
            }, {} as { [id: string]: AllUserTypes });
            setAllUsers(usersMap);
        } else if (error) {
            console.error('Error fetching users:', error);
        }
    }, []);

    const fetchAppData = useCallback(async (user: AllUserTypes) => {
        if (!supabase) return;

        // Player-specific data
        if (user.role === UserRole.PLAYER) {
            const { data: betHistoryData } = await supabase.from('bets').select('*').eq('user_id', user.id);
            if (betHistoryData) setPlayerBetHistory(betHistoryData.map(b => ({ id: b.id, userId: b.user_id, fightId: b.fight_id, choice: b.choice, amount: b.amount })));
        }

        // Agent/MA specific data
        if (user.role === UserRole.AGENT || user.role === UserRole.MASTER_AGENT) {
            const { data: txData } = await supabase.rpc('get_transactions_for_user');
            if (txData) setTransactions(txData.map(tx => ({ id: tx.id, from: tx.from_user_id || 'MINT', to: tx.to_user_id || '', amount: tx.amount, type: tx.type, timestamp: tx.timestamp })));

            const { data: crData } = await supabase.rpc('get_coin_requests_for_user');
            if(crData) setCoinRequests(crData.map(cr => ({ id: cr.id, fromUserId: cr.from_user_id, toUserId: cr.to_user_id, amount: cr.amount, status: cr.status, createdAt: cr.created_at })));
        }

    }, []);

    useEffect(() => {
        if (!supabase) { setLoading(false); return; }
        supabase.auth.getSession().then(({ data: { session } }) => { setSession(session); setLoading(false); });
        const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setCurrentUser(null);
            setLoading(false);
        });
        return () => authListener.subscription.unsubscribe();
    }, []);

    useEffect(() => {
        const fetchInitialState = async () => {
            if (!supabase) return;
            setLoading(true);
            await fetchAllUsers();

            const { data: fightData } = await supabase.from('fights').select('*').order('id', { ascending: false }).limit(1).single();
            if (fightData) {
                setFightId(fightData.id);
                setFightStatus(fightData.status as FightStatus);
                setLastWinner(fightData.winner as FightWinner | null);
            }
            const { data: historyData } = await supabase.from('fights').select('*').order('id', { ascending: false }).limit(50);
            if (historyData) setFightHistory(historyData as FightResult[]);

            const { data: upcomingData } = await supabase.from('upcoming_fights').select('*').order('id', { ascending: true });
            if (upcomingData) setUpcomingFights(upcomingData as UpcomingFight[]);
            
            setLoading(false);
        };
        fetchInitialState();
    }, [fetchAllUsers]);

    useEffect(() => {
        if (session?.user && supabase) {
            const fetchCurrentUser = async () => {
                const { data, error } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
                if (data) {
                    const user: AllUserTypes = {
                        id: data.id, name: data.name, email: data.email, 
                        role: data.role as UserRole,
                        coinBalance: data.coin_balance,
                        ...(data.role === 'PLAYER' && { agentId: data.agent_id }),
                        ...(data.role === 'AGENT' && { masterAgentId: data.master_agent_id }),
                        ...(data.role === 'MASTER_AGENT' && { commissionBalance: data.commission_balance }),
                    };
                    setCurrentUser(user);
                    await fetchAppData(user);
                } else if (error) {
                    console.error('Error fetching user profile:', error);
                    handleLogout();
                }
            };
            fetchCurrentUser();
        }
    }, [session, fetchAppData]);
    
    // Timer logic based on fight creation time
    useEffect(() => {
        let interval: NodeJS.Timeout | undefined;
        if (fightStatus === FightStatus.BETTING_OPEN && fightHistory.length > 0 && fightHistory[0].id === fightId) {
            const currentFight = fightHistory[0];
            const startTime = new Date(currentFight.created_at).getTime();
            
            const updateTimer = () => {
                const now = new Date().getTime();
                const elapsed = Math.floor((now - startTime) / 1000);
                const newTime = Math.max(0, BETTING_TIMER_SECONDS - elapsed);
                setTimer(newTime);
                if (newTime === 0) {
                   // Backend should handle closing, this is just for UI
                }
            };
            updateTimer();
            interval = setInterval(updateTimer, 1000);
        }
        return () => clearInterval(interval);
    }, [fightStatus, fightId, fightHistory]);

    // Supabase Realtime Subscriptions
    useEffect(() => {
        if (!supabase || !currentUser) return;

        const fightChannel = supabase.channel('fight-updates').on('postgres_changes', { event: '*', schema: 'public', table: 'fights' }, payload => {
            const newFight = payload.new as FightResult;
            if (payload.eventType === 'INSERT') {
                setFightId(newFight.id);
                setFightStatus(newFight.status);
                setLastWinner(null);
                setFightHistory(prev => [newFight, ...prev]);
                setUpcomingFights(prev => prev.slice(1));
                setCurrentBets([]);
                setPools({ meron: 0, wala: 0 });
                setPlayerBet(null);
            } else if (payload.eventType === 'UPDATE') {
                const updatedFight = payload.new as FightResult;
                if (updatedFight.id === fightId) {
                    setFightStatus(updatedFight.status);
                    setLastWinner(updatedFight.winner);
                }
                setFightHistory(prev => prev.map(f => f.id === updatedFight.id ? updatedFight : f));
            }
        }).subscribe();

        const upcomingFightsChannel = supabase.channel('upcoming-fights-updates').on('postgres_changes', { event: '*', schema: 'public', table: 'upcoming_fights' }, () => {
            supabase.from('upcoming_fights').select('*').order('id', { ascending: true }).then(({ data }) => {
                if(data) setUpcomingFights(data as UpcomingFight[]);
            });
        }).subscribe();

        const betChannel = supabase.channel('bet-updates').on('postgres_changes', { event: '*', schema: 'public', table: 'bets', filter: `fight_id=eq.${fightId}` }, async () => {
            const { data: betsData } = await supabase.from('bets').select('*').eq('fight_id', fightId);
            if (betsData) {
                const typedBets = betsData.map(b => ({ id: b.id, userId: b.user_id, fightId: b.fight_id, choice: b.choice, amount: b.amount }));
                setCurrentBets(typedBets);
                setPools(typedBets.reduce((acc, bet) => {
                    if (bet.choice === 'RED') acc.meron += bet.amount;
                    if (bet.choice === 'WHITE') acc.wala += bet.amount;
                    return acc;
                }, { meron: 0, wala: 0 }));
                if (currentUser.role === UserRole.PLAYER) {
                   setPlayerBet(typedBets.find(b => b.userId === currentUser.id) || null);
                }
            }
        }).subscribe();
        
        const profileChannel = supabase.channel('profile-updates').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, payload => {
            const updatedProfile = payload.new;
            if (updatedProfile.id === currentUser.id) {
                setCurrentUser(prev => prev ? { ...prev, coinBalance: updatedProfile.coin_balance, commissionBalance: updatedProfile.commission_balance } : null);
            }
            setAllUsers(prev => ({...prev, [updatedProfile.id]: {...prev[updatedProfile.id], coinBalance: updatedProfile.coin_balance, commissionBalance: updatedProfile.commission_balance}}));
        }).subscribe();

        const requestChannel = supabase.channel('coin-request-updates').on('postgres_changes', { event: '*', schema: 'public', table: 'coin_requests' }, () => {
            if (currentUser.role === UserRole.AGENT || currentUser.role === UserRole.MASTER_AGENT) {
                supabase.rpc('get_coin_requests_for_user').then(({data}) => {
                    if(data) setCoinRequests(data.map(cr => ({ id: cr.id, fromUserId: cr.from_user_id, toUserId: cr.to_user_id, amount: cr.amount, status: cr.status, createdAt: cr.created_at })));
                });
            }
        }).subscribe();

        const transactionChannel = supabase.channel('transaction-updates').on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
            if (currentUser.role === UserRole.AGENT || currentUser.role === UserRole.MASTER_AGENT) {
                supabase.rpc('get_transactions_for_user').then(({data}) => {
                    if(data) setTransactions(data.map(tx => ({ id: tx.id, from: tx.from_user_id || 'MINT', to: tx.to_user_id || '', amount: tx.amount, type: tx.type, timestamp: tx.timestamp })));
                });
            }
        }).subscribe();
        
        return () => {
            supabase.removeAllChannels();
        };

    }, [currentUser, fightId]);


    // Handlers
    const handleLogin = async (email: string, password: string) => {
        if (!supabase) return "Supabase not configured";
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return error ? error.message : null;
    };
    
    const handleRegister = async (name: string, email: string, password: string, agentId: string | null) => {
        if (!supabase) return "Supabase not configured";
        const { error } = await supabase.auth.signUp({ 
            email, password, 
            options: { data: { name, agent_id: agentId } } 
        });
        return error ? error.message : null;
    };

    const handleLogout = async () => {
        if (supabase) await supabase.auth.signOut();
        setCurrentUser(null); setSession(null);
    };

    const handleChangePassword = async (_oldPassword: string, newPassword: string) => {
        if (!supabase) return "Supabase not configured";
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if(error) return error.message;
        showNotification("Password updated successfully!", 'success');
        return null;
    };
    
    const handleStartNextFight = async () => {
        if (!supabase || upcomingFights.length === 0) return;
        const { error } = await supabase.rpc('start_next_fight');
        if (error) showNotification(error.message, 'error');
    };
    
    const handleCloseBetting = async () => {
        if (!supabase) return;
        const { error } = await supabase.rpc('close_betting', { p_fight_id: fightId });
         if (error) showNotification(error.message, 'error');
    };
    
    const handleDeclareWinner = async (winner: FightWinner) => {
        if (!supabase) return;
        const { error } = await supabase.rpc('declare_winner', { p_fight_id: fightId, p_winner: winner });
        if (error) showNotification(error.message, 'error');
        else showNotification(`Winner declared: ${winner}`, 'success');
    };

    const handleAddUpcomingFight = async (red: string, white: string) => {
        if(!supabase) return "Supabase not configured";
        const { error } = await supabase.from('upcoming_fights').insert({ participants: { red, white } });
        if (error) { showNotification(error.message, 'error'); return error.message; }
        showNotification('Fight added to the queue!', 'success');
        return null;
    };
    
    const handlePlaceBet = async (amount: number, choice: 'RED' | 'WHITE') => {
        if (!supabase || !currentUser) return "Not logged in.";
        const { error } = await supabase.rpc('place_bet', { p_fight_id: fightId, p_amount: amount, p_choice: choice });
        if (error) { showNotification(error.message, 'error'); return error.message; }
        showNotification(`Bet of ${amount} on ${choice} placed!`, 'success');
        return null;
    };
    
    const handleCreateCoinRequest = async (amount: number) => {
        if (!supabase || !currentUser) return "Not logged in.";
        const { error } = await supabase.rpc('create_coin_request', { p_amount: amount });
        if (error) { showNotification(error.message, 'error'); return error.message; }
        showNotification('Coin request sent successfully!', 'success');
        return null;
    };

    const handleRespondToCoinRequest = async (requestId: string, response: 'APPROVED' | 'DECLINED') => {
        if (!supabase) return "Supabase error";
        const { error } = await supabase.rpc('respond_to_coin_request', { p_request_id: requestId, p_response: response });
        if (error) { showNotification(error.message, 'error'); return error.message; }
        showNotification(`Request ${response.toLowerCase()}!`, 'success');
        return null;
    };
    
    const handleCreateUser = async (name: string, email: string, password: string, role: UserRole) => {
        if (!supabase) return "Supabase error";
        const { error } = await supabase.rpc('create_user', { p_name: name, p_email: email, p_password: password, p_role: role });
        if (error) { showNotification(error.message, 'error'); return error.message; }
        showNotification(`${role} created successfully!`, 'success');
        await fetchAllUsers();
        return null;
    };

    const handleOpenChat = async (targetUser: AllUserTypes) => {
        if (!supabase || !currentUser) return;
        setChatTargetUser(targetUser);
        const { data, error } = await supabase.rpc('get_messages', { p_other_user_id: targetUser.id });
        if(error) { showNotification("Failed to load messages", 'error'); return; }
        if(data) setMessages(data.map(m => ({ id: m.id, senderId: m.sender_id, receiverId: m.receiver_id, text: m.text || '', createdAt: m.created_at })));
    };

    const handleSendMessage = async (text: string, amount: number) => {
        if (!supabase || !chatTargetUser) return;
        const { error } = await supabase.rpc('send_message_and_coins', { p_receiver_id: chatTargetUser.id, p_text: text, p_amount: amount });
        if (error) { showNotification(error.message, 'error'); }
        if(amount > 0) showNotification(`${amount} coins sent to ${chatTargetUser.name}`, 'success');
    };

    // Rendering Logic
    if (loading) {
        return <div className="bg-zinc-900 h-screen flex items-center justify-center text-white">Loading...</div>;
    }

    if (!session || !currentUser) {
        return <AuthView onLogin={handleLogin} onRegister={handleRegister} agents={Object.values(allUsers).filter(u => u.role === UserRole.AGENT) as Agent[]} isSupabaseConfigured={isSupabaseConfigured} />;
    }

    const playerFightHistory: PlayerFightHistoryEntry[] = fightHistory.map(fh => {
       const betOnThisFight = playerBetHistory.find(b => b.fightId === fh.id);
       let outcome: PlayerFightHistoryEntry['outcome'] = null;
       if (betOnThisFight) {
           if (fh.winner === 'DRAW' || fh.winner === 'CANCELLED') outcome = 'REFUND';
           else if (fh.winner === betOnThisFight.choice) outcome = 'WIN';
           else outcome = 'LOSS';
       }
        return { ...fh, bet: betOnThisFight || null, outcome };
    });

    const renderContent = () => {
        switch (currentUser.role) {
            case UserRole.PLAYER:
                return <PlayerView currentUser={currentUser as Player} fightStatus={fightStatus} lastWinner={lastWinner} fightId={fightId} timer={timer} pools={pools} fightHistory={playerFightHistory} onPlaceBet={handlePlaceBet} currentBet={playerBet} isDrawerOpen={isDrawerOpen} onCloseDrawer={() => setDrawerOpen(false)} upcomingFights={upcomingFights} onCreateCoinRequest={handleCreateCoinRequest} />;
            case UserRole.OPERATOR:
                return <OperatorView currentUser={currentUser} fightStatus={fightStatus} lastWinner={lastWinner} fightId={fightId} timer={timer} fightHistory={fightHistory} upcomingFights={upcomingFights} currentBets={currentBets} allUsers={allUsers} onStartNextFight={handleStartNextFight} onCloseBetting={handleCloseBetting} onDeclareWinner={handleDeclareWinner} onAddUpcomingFight={handleAddUpcomingFight} />;
            case UserRole.AGENT:
                 return <AgentView currentUser={currentUser as Agent} players={Object.values(allUsers).filter(u => u.role === UserRole.PLAYER && (u as Player).agentId === currentUser.id) as Player[]} transactions={transactions} onOpenChat={handleOpenChat} allUsers={allUsers} unreadMessageCounts={unreadMessageCounts} pendingCoinRequests={coinRequests} onCreateCoinRequest={handleCreateCoinRequest} onRespondToCoinRequest={handleRespondToCoinRequest} />
            case UserRole.MASTER_AGENT:
                return <MasterAgentView currentUser={currentUser as MasterAgent} agents={Object.values(allUsers).filter(u => u.role === UserRole.AGENT && (u as Agent).masterAgentId === currentUser.id) as Agent[]} transactions={transactions} onOpenChat={handleOpenChat} allUsers={allUsers} unreadMessageCounts={unreadMessageCounts} pendingCoinRequests={coinRequests} onCreateAgent={(name, email, password) => handleCreateUser(name, email, password, UserRole.AGENT)} onRespondToCoinRequest={handleRespondToCoinRequest} />
            default:
                return <div className="text-white">Unknown user role. Please contact support.</div>;
        }
    };

    return (
        <div className="bg-zinc-900 text-gray-300 min-h-screen font-sans">
            <Header currentUser={currentUser} onLogout={handleLogout} onSettings={() => setSettingsOpen(true)} onToggleDrawer={() => setDrawerOpen(!isDrawerOpen)} />
            <main className="p-4 sm:p-6 lg:p-8">
                {renderContent()}
            </main>
            {chatTargetUser && (
                <ChatModal currentUser={currentUser} chatTargetUser={chatTargetUser} messages={messages} onClose={() => setChatTargetUser(null)} onSendMessage={handleSendMessage} />
            )}
             {isSettingsOpen && (
                <ChangePasswordModal onClose={() => setSettingsOpen(false)} onChangePassword={handleChangePassword} />
            )}
            {notification && (
                <NotificationComponent message={notification.message} type={notification.type} onClose={() => setNotification(null)} />
            )}
        </div>
    );
};

export default App;