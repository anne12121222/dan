
import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { AllUserTypes, UserRole, FightStatus, FightResult, Bet, Player, Transaction, Message, UpcomingFight, PlayerFightHistoryEntry, Agent, MasterAgent, Operator, CoinRequest } from './types';

// Views
import AuthView from './components/AuthView';
import PlayerView from './components/PlayerView';
import AgentView from './components/AgentView';
import MasterAgentView from './components/MasterAgentView';
import OperatorView from './components/OperatorView';
import Header from './components/Header';
import ChatModal from './components/ChatModal';

const App: React.FC = () => {
  // Auth State
  const [session, setSession] = useState<Session | null>(null);
  const [currentUser, setCurrentUser] = useState<AllUserTypes | null>(null);
  const [loading, setLoading] = useState(true);

  // App-wide State
  const [allUsers, setAllUsers] = useState<{ [id: string]: AllUserTypes }>({});
  
  // Fight State
  const [fightStatus, setFightStatus] = useState<FightStatus>(FightStatus.SETTLED);
  const [fightId, setFightId] = useState(0);
  const [lastWinner, setLastWinner] = useState<'RED' | 'WHITE' | null>(null);
  const [timer, setTimer] = useState(60);
  const [fightHistory, setFightHistory] = useState<FightResult[]>([]);
  const [upcomingFights, setUpcomingFights] = useState<UpcomingFight[]>([]);
  
  // Betting State
  const [pools, setPools] = useState({ meron: 0, wala: 0 });
  const [currentBets, setCurrentBets] = useState<Bet[]>([]);
  const [playerBet, setPlayerBet] = useState<Bet | null>(null);

  // Hierarchy State (for different user roles)
  const [agents, setAgents] = useState<Agent[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);

  // Transaction & Messaging State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatUser, setChatUser] = useState<AllUserTypes | null>(null);
  const [unreadMessageCounts, setUnreadMessageCounts] = useState<{ [senderId: string]: number }>({});

  // Coin Requests
  const [pendingCoinRequests, setPendingCoinRequests] = useState<CoinRequest[]>([]);
  
  // UI State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // --- MOCK API & Data Fetching ---
  // In a real app, these would be calls to your backend or Supabase functions/tables

  const fetchInitialData = async (user: AllUserTypes) => {
    // This function would fetch all necessary data based on the user's role
    // For simplicity, we'll set up listeners instead
  };


  // --- AUTHENTICATION ---
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        setSession(session);
      }
    );
    // Initial session load
    supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const fetchUserProfile = async () => {
        if (session?.user) {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();

            if (error) {
                console.error('Error fetching user profile:', error);
                // Maybe log out here
                supabase.auth.signOut();
                setCurrentUser(null);
            } else if (data) {
                const userProfile = {
                    id: data.id,
                    name: data.name,
                    email: data.email,
                    role: data.role as UserRole,
                    coinBalance: data.coin_balance,
                    // Add role-specific properties
                    ...(data.role === UserRole.PLAYER && { agentId: data.agent_id }),
                    ...(data.role === UserRole.AGENT && { masterAgentId: data.master_agent_id }),
                    ...(data.role === UserRole.MASTER_AGENT && { commissionBalance: data.commission_balance }),
                } as AllUserTypes;
                setCurrentUser(userProfile);
            }
        } else {
            setCurrentUser(null);
        }
        setLoading(false);
    };

    fetchUserProfile();
  }, [session]);
  
  // --- REAL-TIME SUBSCRIPTIONS ---
  useEffect(() => {
    if (!currentUser) return;
    
    // Listen to changes in the current fight
    const fightChannel = supabase
        .channel('current-fight-details')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'fights', filter: `id=eq.${fightId}`}, 
            (payload) => {
                const updatedFight = payload.new as FightResult;
                if(updatedFight) {
                  setFightStatus(updatedFight.status as FightStatus);
                  if(updatedFight.status === FightStatus.SETTLED){
                    setLastWinner(updatedFight.winner);
                  }
                }
            }
        )
        .subscribe();
    
    // A generic channel for app-wide events, like new fights starting
    const appStateChannel = supabase
        .channel('app-state')
        .on('broadcast', { event: 'new_fight' }, (payload) => {
            setFightId(payload.payload.id);
            setFightStatus(FightStatus.BETTING_OPEN);
            setLastWinner(null);
            setPlayerBet(null); // Reset player's bet for the new fight
        })
        .on('broadcast', { event: 'timer_update' }, (payload) => {
            setTimer(payload.payload.time);
        })
        .subscribe();

    // ... other subscriptions for profiles, bets, messages, transactions etc.
    // This would get quite large in a real app. Breaking it into custom hooks is a good pattern.

    return () => {
        supabase.removeChannel(fightChannel);
        supabase.removeChannel(appStateChannel);
    };
  }, [currentUser, fightId]);

  // --- Handlers ---
  const handleLogin = async (email: string, password: string) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    return error ? error.message : null;
  };

  const handleLogout = () => {
    supabase.auth.signOut();
    setCurrentUser(null);
  };
  
  const handlePlaceBet = async (amount: number, choice: 'RED' | 'WHITE'): Promise<string | null> => {
    if(!currentUser || currentUser.role !== UserRole.PLAYER) return "Only players can bet.";
    if(currentUser.coinBalance < amount) return "Insufficient balance.";

    const { error } = await supabase.rpc('place_bet', {
        p_fight_id: fightId,
        p_choice: choice,
        p_amount: amount,
    });

    if(error){
        console.error("Betting error:", error);
        return error.message;
    }
    
    // Optimistic update
    setPlayerBet({ id: Math.random(), userId: currentUser.id, fightId, choice, amount });
    setCurrentUser(prev => prev ? {...prev, coinBalance: prev.coinBalance - amount} : null);
    
    return null;
  };
  
  // This is a stub for what the operator backend logic would do
  const handleDeclareWinner = async (winner: 'RED' | 'WHITE' | 'DRAW' | 'CANCELLED') => {
      // In a real app, this would be a call to a Supabase Edge Function
      console.log(`Operator declared ${winner} as the winner for fight ${fightId}`);
      // The function would handle settling bets, calculating commissions, updating balances, and setting the fight status to SETTLED.
      // Then it would broadcast these changes, and the client listeners would update the UI.
  };

  const renderView = () => {
    if (loading) {
      return <div className="min-h-screen bg-zinc-900 flex items-center justify-center text-white">Loading...</div>;
    }
    if (!currentUser) {
      return <AuthView onLogin={handleLogin} isSupabaseConfigured={isSupabaseConfigured}/>;
    }
    switch (currentUser.role) {
      case UserRole.PLAYER:
        const playerHistory: PlayerFightHistoryEntry[] = fightHistory.map(f => {
            // Find if player bet on this fight
            const bet = f.id === playerBet?.fightId ? playerBet : undefined; // Simplified, would check historical bets
            const outcome = bet ? (bet.choice === f.winner ? 'WIN' : 'LOSS') : 'NONE';
            return {...f, bet: bet ? { choice: bet.choice, amount: bet.amount } : undefined, outcome };
        });

        return <PlayerView 
                    currentUser={currentUser as Player}
                    fightStatus={fightStatus}
                    lastWinner={lastWinner}
                    fightId={fightId}
                    timer={timer}
                    pools={pools}
                    fightHistory={playerHistory}
                    onPlaceBet={handlePlaceBet}
                    currentBet={playerBet}
                    isDrawerOpen={isDrawerOpen}
                    onCloseDrawer={() => setIsDrawerOpen(false)}
                    upcomingFights={upcomingFights}
                    onCreateCoinRequest={async () => null} // Stub
                />;
      case UserRole.AGENT:
        return <AgentView
                    currentUser={currentUser as Agent}
                    players={players.filter(p => p.agentId === currentUser.id)}
                    transactions={transactions}
                    onOpenChat={setChatUser}
                    allUsers={allUsers}
                    unreadMessageCounts={unreadMessageCounts}
                    pendingCoinRequests={pendingCoinRequests}
                    onCreateCoinRequest={async () => null} // Stub
                    onRespondToCoinRequest={async () => null} // Stub
                />;
      case UserRole.MASTER_AGENT:
         return <MasterAgentView
                    currentUser={currentUser as MasterAgent}
                    agents={agents}
                    players={players}
                    transactions={transactions}
                    fightHistory={fightHistory}
                    onOpenChat={setChatUser}
                    allUsers={allUsers}
                    onCreateUser={async () => null} // Stub
                    fightStatus={fightStatus}
                    lastWinner={lastWinner}
                    fightId={fightId}
                    timer={timer}
                    upcomingFights={upcomingFights}
                    currentBets={currentBets}
                    unreadMessageCounts={unreadMessageCounts}
                    pendingCoinRequests={pendingCoinRequests}
                    onRespondToCoinRequest={async () => null} // Stub
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
                    onStartNextFight={() => console.log('start')} // Stub
                    onCloseBetting={() => console.log('close')} // Stub
                    onDeclareWinner={handleDeclareWinner}
                    onAddUpcomingFight={async () => null} // Stub
                />;
      default:
        return <div>Unknown user role.</div>;
    }
  };

  return (
    <div className="bg-zinc-900 text-white min-h-screen font-sans">
      {currentUser && (
        <Header 
          currentUser={currentUser} 
          onLogout={handleLogout}
          onToggleDrawer={currentUser.role === UserRole.PLAYER ? () => setIsDrawerOpen(!isDrawerOpen) : undefined}
          onOpenChatWithSuperior={() => {
              // Logic to find and open chat with superior
          }}
          unreadMessageCount={Object.values(unreadMessageCounts).reduce((a, b) => a + b, 0)}
        />
      )}
      <main className="p-4 sm:p-6">
          {renderView()}
      </main>
      {chatUser && currentUser && (
          <ChatModal
            currentUser={currentUser}
            otherUser={chatUser}
            messages={messages.filter(m => (m.senderId === currentUser.id && m.receiverId === chatUser.id) || (m.senderId === chatUser.id && m.receiverId === currentUser.id))}
            onClose={() => setChatUser(null)}
            onSendMessage={() => {}} // Stub
            onSendCoins={() => {}} // Stub
          />
      )}
    </div>
  );
};

export default App;
