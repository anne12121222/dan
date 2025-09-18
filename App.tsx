
import React, { useState, useEffect, useCallback } from 'react';
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


// Mock initial data
const INITIAL_UPCOMING_FIGHTS: UpcomingFight[] = [
  { id: 2, participants: { red: 'SabongeroX', white: 'KillaTari' } },
  { id: 3, participants: { red: 'ManokNaPula', white: 'WhiteStallion' } },
];
const INITIAL_FIGHT_HISTORY: FightResult[] = [
    { id: 1, winner: 'RED', commission: 1500, status: FightStatus.SETTLED, created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString() }
];
const FIGHT_TIMER_DURATION = 60; // 60 seconds for betting


const App: React.FC = () => {
    const [currentUser, setCurrentUser] = useState<AllUserTypes | null>(null);
    const [allUsers, setAllUsers] = useState<{ [id: string]: AllUserTypes }>({});
    
    // Global game state
    const [fightId, setFightId] = useState<number>(1);
    const [fightStatus, setFightStatus] = useState<FightStatus>(FightStatus.SETTLED);
    const [timer, setTimer] = useState(FIGHT_TIMER_DURATION);
    const [lastWinner, setLastWinner] = useState<FightWinner | null>('RED');
    const [pools, setPools] = useState({ meron: 12500, wala: 10500 });
    const [fightHistory, setFightHistory] = useState<FightResult[]>(INITIAL_FIGHT_HISTORY);
    const [upcomingFights, setUpcomingFights] = useState<UpcomingFight[]>(INITIAL_UPCOMING_FIGHTS);
    const [currentBets, setCurrentBets] = useState<Bet[]>([]);

    // User-specific data
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [coinRequests, setCoinRequests] = useState<CoinRequest[]>([]);
    const [messages, setMessages] = useState<{ [userId: string]: Message[] }>({});
    
    // UI State
    const [notification, setNotification] = useState<NotificationType | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const showNotification = (message: string, type: 'success' | 'error') => {
        setNotification({ id: Date.now(), message, type });
    };

    useEffect(() => {
        if (!isSupabaseConfigured) return;

        const fetchDataForUser = async (userId: string) => {
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (profileError || !profile) {
                console.error('Error fetching profile:', profileError);
                showNotification('Could not fetch your profile.', 'error');
                await supabase.auth.signOut();
                return;
            }

            const userProfile: AllUserTypes = {
                id: profile.id, name: profile.name, email: profile.email, role: profile.role, coinBalance: profile.coin_balance,
                ...(profile.role === UserRole.PLAYER && { agentId: profile.agent_id! }),
                ...(profile.role === UserRole.AGENT && { masterAgentId: profile.master_agent_id!, commissionRate: 0.07, transferFee: 0.01 }),
                ...(profile.role === UserRole.MASTER_AGENT && { commissionBalance: profile.commission_balance ?? 0, commissionRate: 0.07, transferFee: 0.01 }),
            };
            setCurrentUser(userProfile);

            const { data: allUsersData, error: allUsersError } = await supabase.from('profiles').select('*');
            if (allUsersError) {
                console.error('Error fetching all users:', allUsersError);
            } else {
                const usersMap = allUsersData.reduce((acc, user) => {
                    const mappedUser: AllUserTypes = {
                        id: user.id, name: user.name, email: user.email, role: user.role, coinBalance: user.coin_balance,
                        ...(user.role === UserRole.PLAYER && { agentId: user.agent_id! }),
                        ...(user.role === UserRole.AGENT && { masterAgentId: user.master_agent_id!, commissionRate: 0.07, transferFee: 0.01 }),
                        ...(user.role === UserRole.MASTER_AGENT && { commissionBalance: user.commission_balance ?? 0, commissionRate: 0.07, transferFee: 0.01 }),
                    };
                    acc[user.id] = mappedUser;
                    return acc;
                }, {} as { [id: string]: AllUserTypes });
                setAllUsers(usersMap);
            }
        };

        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                fetchDataForUser(session.user.id);
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session) {
                fetchDataForUser(session.user.id);
            } else if (event === 'SIGNED_OUT') {
                setCurrentUser(null);
                setAllUsers({});
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleLogin = async (email: string, password: string): Promise<string | null> => {
        if (!isSupabaseConfigured) return "Supabase is not configured.";
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            return error.message;
        }
        showNotification(`Welcome back!`, 'success');
        return null;
    };
    
    const handleRegister = async (name: string, email: string, password: string, agentId: string | null): Promise<string | null> => {
        if (!isSupabaseConfigured) return "Supabase is not configured.";
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { name, agent_id: agentId, role: UserRole.PLAYER }
            }
        });
        if (error) {
            return error.message;
        }
        showNotification('Registration successful! Check your email for verification.', 'success');
        return null;
    };

    const handleLogout = async () => {
        if (!isSupabaseConfigured) return;
        const { error } = await supabase.auth.signOut();
        if (error) {
            showNotification(`Error logging out: ${error.message}`, 'error');
        } else {
            showNotification('You have been logged out.', 'success');
        }
    };
    
    const handleStartNextFight = useCallback(() => {
        if (upcomingFights.length === 0) {
            showNotification("No upcoming fights to start.", 'error');
            return;
        }
        const nextFight = upcomingFights[0];
        setUpcomingFights(prev => prev.slice(1));
        setFightId(nextFight.id);
        setFightStatus(FightStatus.BETTING_OPEN);
        setTimer(FIGHT_TIMER_DURATION);
        setCurrentBets([]);
        setPools({ meron: 0, wala: 0 });
        setLastWinner(null);
        showNotification(`Fight #${nextFight.id} has started! Betting is open.`, 'success');
    }, [upcomingFights]);

    const handleCloseBetting = useCallback(() => {
        setFightStatus(FightStatus.BETTING_CLOSED);
        showNotification('Betting is now closed.', 'success');
    }, []);

    useEffect(() => {
        if (fightStatus === FightStatus.BETTING_OPEN && timer > 0) {
            const interval = setInterval(() => {
                setTimer(t => t - 1);
            }, 1000);
            return () => clearInterval(interval);
        } else if (fightStatus === FightStatus.BETTING_OPEN && timer === 0) {
            handleCloseBetting();
        }
    }, [fightStatus, timer, handleCloseBetting]);

    const onDeclareWinner = (winner: FightWinner) => {
        if (fightStatus !== FightStatus.BETTING_CLOSED) return;

        // Settle bets
        const updatedUsers = { ...allUsers };
        currentBets.forEach(bet => {
            const player = updatedUsers[bet.userId] as Player;
            if (winner === 'DRAW' || winner === 'CANCELLED') {
                player.coinBalance += bet.amount; // Refund
            } else if ((winner === 'RED' && bet.choice === 'RED') || (winner === 'WHITE' && bet.choice === 'WHITE')) {
                // Simplified payout logic
                const winningPool = bet.choice === 'RED' ? pools.wala : pools.meron;
                const bettorPool = bet.choice === 'RED' ? pools.meron : pools.wala;
                const payoutRatio = bettorPool > 0 ? (winningPool / bettorPool) : 0;
                const winnings = bet.amount + (bet.amount * payoutRatio);
                player.coinBalance += winnings;
            }
        });
        setAllUsers(updatedUsers);

        // FIX: Store the bets from the concluded fight into the fight history object.
        // This resolves an error where `fight.bets` was accessed on a `FightResult` type that did not contain it.
        const newFightResult: FightResult = {
            id: fightId,
            winner,
            commission: (pools.meron + pools.wala) * 0.1, // Mock 10% commission
            status: FightStatus.SETTLED,
            created_at: new Date().toISOString(),
            bets: currentBets,
        };
        setFightHistory(prev => [newFightResult, ...prev]);
        setLastWinner(winner);
        setFightStatus(FightStatus.SETTLED);
        showNotification(`Fight #${fightId} settled. Winner: ${winner}`, 'success');
    };
    
    const onAddUpcomingFight = async (red: string, white: string): Promise<string | null> => {
        const newFight: UpcomingFight = {
            id: (upcomingFights[upcomingFights.length - 1]?.id || fightHistory[0]?.id || 0) + 1,
            participants: { red, white }
        };
        setUpcomingFights(prev => [...prev, newFight]);
        showNotification('New fight added to the queue.', 'success');
        return null;
    };
    
    const onPlaceBet = async (amount: number, choice: BetChoice): Promise<string | null> => {
        if (!currentUser || currentUser.role !== UserRole.PLAYER) return "Only players can bet.";
        if (currentUser.coinBalance < amount) return "Insufficient balance.";

        const newBet: Bet = {
            id: `bet-${Date.now()}`,
            userId: currentUser.id,
            fightId: fightId,
            amount,
            choice
        };
        
        setCurrentUser(prev => prev ? {...prev, coinBalance: prev.coinBalance - amount} : null);
        setAllUsers(prev => ({...prev, [currentUser.id]: {...currentUser, coinBalance: currentUser.coinBalance - amount}}))
        
        setCurrentBets(prev => [...prev, newBet]);
        setPools(prev => ({
            ...prev,
            meron: choice === 'RED' ? prev.meron + amount : prev.meron,
            wala: choice === 'WHITE' ? prev.wala + amount : prev.wala
        }));
        showNotification(`Bet of ${amount} placed on ${choice}.`, 'success');
        return null;
    };
    
    const onCreateCoinRequest = async (amount: number): Promise<string | null> => {
        if (!currentUser) return "User not found.";
        const user = currentUser as (Player | Agent);
        const recipientId = 'agentId' in user ? user.agentId : ('masterAgentId' in user ? user.masterAgentId : null);
        
        if (!recipientId) return "Cannot determine recipient for coin request.";

        const newRequest: CoinRequest = {
            id: `req-${Date.now()}`,
            from_user_id: currentUser.id,
            to_user_id: recipientId,
            amount,
            status: 'PENDING',
            created_at: new Date().toISOString()
        };
        setCoinRequests(prev => [...prev, newRequest]);
        showNotification(`Coin request of ${amount} sent.`, 'success');
        return null;
    }
    
    const onRespondToRequest = async (requestId: string, response: 'APPROVED' | 'DECLINED'): Promise<string | null> => {
        const request = coinRequests.find(r => r.id === requestId);
        if (!request || !currentUser) return "Request not found.";

        if (response === 'APPROVED') {
            if (currentUser.coinBalance < request.amount) {
                showNotification("Insufficient balance to approve request.", 'error');
                return "Insufficient balance.";
            }
            // Update balances
            setAllUsers(prev => {
                const newAllUsers = {...prev};
                const requester = {...newAllUsers[request.from_user_id]};
                const responder = {...newAllUsers[request.to_user_id]};
                requester.coinBalance += request.amount;
                responder.coinBalance -= request.amount;
                newAllUsers[request.from_user_id] = requester;
                newAllUsers[request.to_user_id] = responder;
                return newAllUsers;
            });
            setCurrentUser(prev => prev ? {...prev, coinBalance: prev.coinBalance - request.amount} : null);
        }
        
        setCoinRequests(prev => prev.map(r => r.id === requestId ? {...r, status: response} : r));
        showNotification(`Request has been ${response.toLowerCase()}.`, 'success');
        return null;
    };

    const onSendMessage = async (receiverId: string, text: string, amount: number) => {
        if(!currentUser) return;
        // Mock sending message and coins logic
        console.log(`Sending ${text} and ${amount} coins from ${currentUser.id} to ${receiverId}`);
    };
    
    const onChangePassword = async (oldPassword: string, newPassword: string): Promise<string | null> => {
        if (!isSupabaseConfigured) return "Supabase is not configured.";
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) {
            return error.message;
        }
        showNotification("Password updated successfully.", 'success');
        return null;
    };


    const renderUserView = () => {
        if (!currentUser) return null;

        switch (currentUser.role) {
            case UserRole.PLAYER:
                const playerHistory: PlayerFightHistoryEntry[] = fightHistory.map(fh => {
                    const bet = currentBets.find(b => b.fightId === fh.id && b.userId === currentUser.id) 
                                || fightHistory.flatMap(f => f.bets ?? []).find(b => b.fightId === fh.id && b.userId === currentUser.id); // A bit hacky for mock
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
                        currentUser={currentUser as Player}
                        fightStatus={fightStatus}
                        lastWinner={lastWinner}
                        fightId={fightId}
                        timer={timer}
                        pools={pools}
                        fightHistory={playerHistory}
                        onPlaceBet={onPlaceBet}
                        currentBet={currentBets.find(b => b.userId === currentUser.id && b.fightId === fightId) || null}
                        isDrawerOpen={isDrawerOpen}
                        onCloseDrawer={() => setIsDrawerOpen(false)}
                        upcomingFights={upcomingFights}
                        onCreateCoinRequest={onCreateCoinRequest}
                    />
                );
            case UserRole.AGENT:
                return (
                    <AgentView
                        currentUser={currentUser as Agent}
                        players={Object.values(allUsers).filter(u => u.role === UserRole.PLAYER && u.agentId === currentUser.id) as Player[]}
                        transactions={transactions}
                        coinRequests={coinRequests.filter(r => r.to_user_id === currentUser.id)}
                        onRespondToRequest={onRespondToRequest}
                        onCreateCoinRequest={onCreateCoinRequest}
                        onSendMessage={onSendMessage}
                        messages={messages}
                        allUsers={allUsers}
                    />
                );
            case UserRole.MASTER_AGENT:
                 return (
                    <MasterAgentView
                        currentUser={currentUser as MasterAgent}
                        agents={Object.values(allUsers).filter(u => u.role === UserRole.AGENT && u.masterAgentId === currentUser.id) as Agent[]}
                        transactions={transactions}
                        coinRequests={coinRequests.filter(r => r.to_user_id === currentUser.id)}
                        onRespondToRequest={onRespondToRequest}
                        onCreateCoinRequest={onCreateCoinRequest}
                        onSendMessage={onSendMessage}
                        messages={messages}
                        allUsers={allUsers}
                    />
                );
            case UserRole.OPERATOR:
                return (
                    <OperatorView
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
                        onDeclareWinner={onDeclareWinner}
                        onAddUpcomingFight={onAddUpcomingFight}
                    />
                );
            default:
                return <p>Loading view...</p>;
        }
    };
    
    if (!currentUser) {
        return <AuthView
            onLogin={handleLogin}
            onRegister={handleRegister}
            isSupabaseConfigured={isSupabaseConfigured}
            agents={Object.values(allUsers).filter(u => u.role === UserRole.AGENT) as Agent[]}
        />;
    }

    return (
        <div className="min-h-screen bg-zinc-900 text-gray-200">
            <Header
                currentUser={currentUser}
                onLogout={handleLogout}
                onSettings={() => setIsSettingsOpen(true)}
                onToggleDrawer={() => setIsDrawerOpen(!isDrawerOpen)}
            />
            <main className="p-4 sm:p-6 lg:p-8">
                {renderUserView()}
            </main>
            {notification && (
                <NotificationComponent
                    message={notification.message}
                    type={notification.type}
                    onClose={() => setNotification(null)}
                />
            )}
            {isSettingsOpen && (
                <ChangePasswordModal 
                    onClose={() => setIsSettingsOpen(false)}
                    onChangePassword={onChangePassword}
                />
            )}
        </div>
    );
};

export default App;
