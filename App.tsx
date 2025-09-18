
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './supabaseClient.ts';
// Import types
// FIX: Add Player to the import list to resolve type error.
import { 
    AllUserTypes, UserRole, FightStatus, Bet, UpcomingFight, 
    FightResult, PlayerFightHistoryEntry, Transaction, CoinRequest, Message, BetChoice, FightWinner, Agent, Player
} from './types.ts';
// Import views
import AuthView from './components/AuthView.tsx';
import PlayerView from './components/PlayerView.tsx';
import AgentView from './components/AgentView.tsx';
import MasterAgentView from './components/MasterAgentView.tsx';
import OperatorView from './components/OperatorView.tsx';
// Import common components
import Header from './components/Header.tsx';
import UpcomingFightsDrawer from './components/UpcomingFightsDrawer.tsx';
import NotificationComponent from './components/Notification.tsx';
import ChatModal from './components/ChatModal.tsx';

// A simple loading screen
const LoadingScreen = () => (
  <div className="h-screen w-screen flex items-center justify-center bg-zinc-900 text-white">
    <div className="text-center">
        <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-red-500 mx-auto"></div>
        <p className="mt-4">Loading Application...</p>
    </div>
  </div>
);


const App: React.FC = () => {
  // Auth state
  const [session, setSession] = useState<Session | null>(null);
  const [currentUser, setCurrentUser] = useState<AllUserTypes | null>(null);
  const [masqueradeUser, setMasqueradeUser] = useState<AllUserTypes | null>(null);
  const [allUsers, setAllUsers] = useState<{ [id: string]: AllUserTypes }>({});
  const [loading, setLoading] = useState(true);
  const [agentsForRegistration, setAgentsForRegistration] = useState<Agent[]>([]);

  // App state
  const [fightStatus, setFightStatus] = useState<FightStatus>(FightStatus.SETTLED);
  const [fightId, setFightId] = useState<number | null>(null);
  const [timer, setTimer] = useState(0);
  const [currentBet, setCurrentBet] = useState<Bet | null>(null);
  const [bettingPools, setBettingPools] = useState({ meron: 0, wala: 0 });
  const [upcomingFights, setUpcomingFights] = useState<UpcomingFight[]>([]);
  const [fightHistory, setFightHistory] = useState<FightResult[]>([]);
  const [playerFightHistory, setPlayerFightHistory] = useState<PlayerFightHistoryEntry[]>([]);
  const [currentBets, setCurrentBets] = useState<Bet[]>([]);
  const [betCounts, setBetCounts] = useState({ red: 0, white: 0 });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [coinRequests, setCoinRequests] = useState<CoinRequest[]>([]);
  
  // UI State
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [chatTargetUser, setChatTargetUser] = useState<AllUserTypes | null>(null);
  const [messages, setMessages] = useState<{ [userId: string]: Message[] }>({});


  const displayUser = masqueradeUser || currentUser;

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
  };
  
  const fetchInitialData = useCallback(async (user: AllUserTypes) => {
    if (!supabase) return;

    // Fetch all users
    const { data: profiles } = await supabase.from('profiles').select('*');
    if (profiles) {
      const usersMap = profiles.reduce((acc, p) => {
        acc[p.id] = {
          id: p.id,
          name: p.name,
          email: p.email,
          role: p.role,
          coinBalance: p.coin_balance,
          agentId: p.agent_id,
          masterAgentId: p.master_agent_id,
          commissionBalance: p.commission_balance,
          commissionRate: p.commission_rate,
          transferFee: p.transfer_fee
        } as AllUserTypes;
        return acc;
      }, {} as { [id: string]: AllUserTypes });
      setAllUsers(usersMap);
    }
    
    // Fetch fight data
    const { data: fights } = await supabase.from('fights').select('*').order('id', { ascending: false });
    if (fights) {
        const upcoming = fights.filter(f => f.status === 'UPCOMING').map(f => ({
            id: f.id,
            participants: (f.participants as any),
            status: 'UPCOMING'
        })) as UpcomingFight[];
        setUpcomingFights(upcoming.reverse());

        const history = fights.filter(f => f.status === 'SETTLED').map(f => ({
            id: f.id,
            winner: f.winner as FightWinner,
            commission: 0
        }));
        setFightHistory(history);
    }

    const { data: currentFight } = await supabase.from('fights').select('*').or('status.eq.BETTING_OPEN,status.eq.BETTING_CLOSED').single();
    if(currentFight) {
        setFightId(currentFight.id);
        setFightStatus(currentFight.status as FightStatus);
    }

    // Fetch user-specific data
    if (user.role === UserRole.PLAYER && fightId) {
        const { data: bet } = await supabase.from('bets').select('*').eq('user_id', user.id).eq('fight_id', fightId).single();
        setCurrentBet(bet ? { id: bet.id, userId: bet.user_id, fightId: bet.fight_id, amount: bet.amount, choice: bet.choice } : null);
    }

    const { data: txs } = await supabase.from('transactions').select('*').or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`);
    if(txs) setTransactions(txs as Transaction[]);

    const {data: reqs} = await supabase.from('coin_requests').select('*').eq('to_user_id', user.id).eq('status', 'PENDING');
    if(reqs) setCoinRequests(reqs as CoinRequest[]);

  }, [fightId]);

  useEffect(() => {
    const fetchAgentsForRegistration = async () => {
      if (!supabase) return;
      const { data, error } = await supabase.rpc('get_registerable_agents');
      if (error) {
        console.error("Could not fetch agents for registration:", error);
      } else if (data) {
        setAgentsForRegistration(data as Agent[]);
      }
    };
    if (!session) {
        fetchAgentsForRegistration();
    }
  }, [session]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
        setLoading(false);
        return;
    }
    
    supabase!.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if(!session) setLoading(false);
    });

    const { data: { subscription } } = supabase!.auth.onAuthStateChange(
      async (_event: AuthChangeEvent, session: Session | null) => {
        setSession(session);
        if (!session) {
          setCurrentUser(null);
          setMasqueradeUser(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (session && !currentUser) {
        const { data } = await supabase!.from('profiles').select('*').eq('id', session.user.id).single();
        if (data) {
          const userProfile = {
            id: data.id, name: data.name, email: data.email, role: data.role as UserRole,
            coinBalance: data.coin_balance, agentId: data.agent_id, masterAgentId: data.master_agent_id,
            commissionBalance: data.commission_balance, commissionRate: data.commission_rate, transferFee: data.transfer_fee,
          } as AllUserTypes;
          setCurrentUser(userProfile);
          await fetchInitialData(userProfile);
        }
        setLoading(false);
      }
    };
    fetchUserProfile();
  }, [session, currentUser, fetchInitialData]);

  const myAgents = useMemo(() => {
      if (!currentUser || currentUser.role !== UserRole.MASTER_AGENT) return [];
      return Object.values(allUsers).filter(u => u.role === UserRole.AGENT && u.masterAgentId === currentUser.id) as Agent[];
  }, [allUsers, currentUser]);

  const myPlayers = useMemo(() => {
      if (!currentUser || currentUser.role !== UserRole.AGENT) return [];
      return Object.values(allUsers).filter(u => u.role === UserRole.PLAYER && u.agentId === currentUser.id) as Player[];
  }, [allUsers, currentUser]);

  // Handlers
  const handleLogin = async (email: string, password: string) => {
    const { error } = await supabase!.auth.signInWithPassword({ email, password });
    return error ? error.message : null;
  };
  const handleRegister = async (name: string, email: string, password: string, agentId: string) => {
    const { error } = await supabase!.auth.signUp({ 
        email, 
        password,
        options: {
            data: { name, agent_id: agentId }
        }
    });
    return error ? error.message : null;
  };
  const handleCreateAgent = async (name: string, email: string, password: string) => {
      if (!supabase) return "Supabase not configured";
      const { data, error } = await supabase.rpc('create_agent_user', {
          p_name: name,
          p_email: email,
          p_password: password
      });
      if (error) return error.message;
      showNotification(data || 'Agent created successfully!', 'success');
      // Refresh data
      if(currentUser) await fetchInitialData(currentUser);
      return null;
  };

  const handleLogout = () => supabase!.auth.signOut();
  const handlePlaceBet = async (amount: number, choice: BetChoice) => {
      showNotification(`Bet ${amount} on ${choice}`, 'success');
      return null;
  };
  const handleDeclareWinner = (winner: FightWinner) => {
      showNotification(`${winner} declared as winner`, 'success');
  }

  // Render logic
  if (loading) return <LoadingScreen />;

  if (!session || !displayUser) {
    return <AuthView 
            onLogin={handleLogin} 
            onRegister={handleRegister} 
            isSupabaseConfigured={isSupabaseConfigured}
            agents={agentsForRegistration}
            />;
  }
  
  const renderView = () => {
    switch (displayUser.role) {
      case UserRole.PLAYER:
        return <PlayerView 
                    currentUser={displayUser} 
                    fightStatus={fightStatus} 
                    fightId={fightId}
                    timer={timer}
                    currentBet={currentBet}
                    bettingPools={bettingPools}
                    playerFightHistory={playerFightHistory}
                    fightHistory={fightHistory}
                    allUsers={allUsers}
                    onPlaceBet={handlePlaceBet}
                    onCreateCoinRequest={async () => null}
                    betCounts={betCounts}
                />;
      case UserRole.AGENT:
          return <AgentView 
                    currentUser={displayUser}
                    players={myPlayers}
                    transactions={transactions}
                    coinRequests={coinRequests}
                    allUsers={allUsers}
                    onTransferCoins={async () => null}
                    onRespondToRequest={async () => null}
                    onCreateCoinRequest={async () => null}
                    onMasquerade={(id) => {}}
                    onOpenChat={(user) => setChatTargetUser(user)}
                />;
      case UserRole.MASTER_AGENT:
          return <MasterAgentView
                    currentUser={displayUser}
                    agents={myAgents}
                    transactions={transactions}
                    coinRequests={coinRequests}
                    allUsers={allUsers}
                    onTransferCoins={async () => null}
                    onCreateAgent={handleCreateAgent}
                    onRespondToRequest={async () => null}
                    onMasquerade={(id) => {}}
                    onOpenChat={(user) => setChatTargetUser(user)}
                 />;
      case UserRole.OPERATOR:
        return <OperatorView 
                    currentUser={displayUser}
                    fightStatus={fightStatus}
                    lastWinner={fightHistory[0]?.winner || null}
                    fightId={fightId}
                    timer={timer}
                    fightHistory={fightHistory}
                    upcomingFights={upcomingFights}
                    currentBets={currentBets}
                    allUsers={allUsers}
                    onStartNextFight={() => {}}
                    onCloseBetting={() => {}}
                    onDeclareWinner={handleDeclareWinner}
                    onAddUpcomingFight={async () => null}
                    onOpenChat={(user) => setChatTargetUser(user)}
                    chatTargetUser={chatTargetUser}
                    onCloseChat={() => setChatTargetUser(null)}
                    onSendMessage={async () => {}}
                    messages={messages}
                />;
      default:
        return <div className="text-white">Invalid user role.</div>;
    }
  };

  return (
    <div className="bg-zinc-900 min-h-screen text-gray-300">
      <Header 
        currentUser={displayUser}
        onLogout={handleLogout}
        onSettings={() => {}}
        onToggleDrawer={() => setDrawerOpen(!isDrawerOpen)}
      />
      <main className="p-4 sm:p-6 lg:p-8">
        {renderView()}
      </main>
      <UpcomingFightsDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setDrawerOpen(false)} 
        fights={upcomingFights} 
      />
      {notification && (
        <NotificationComponent
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
      {chatTargetUser && (
        <ChatModal 
          currentUser={displayUser}
          chatTargetUser={chatTargetUser}
          messages={messages[chatTargetUser.id] || []}
          onClose={() => setChatTargetUser(null)}
          onSendMessage={async () => {}}
        />
      )}
    </div>
  );
};

export default App;
