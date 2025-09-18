
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import {
  AllUserTypes, UserRole, FightStatus, Bet, UpcomingFight,
  FightResult, Transaction, CoinRequest, Message, Notification, Player, Agent, MasterAgent, Operator, BetChoice, FightWinner
} from './types';
import AuthView from './components/AuthView';
import PlayerView from './components/PlayerView';
import AgentView from './components/AgentView';
import MasterAgentView from './components/MasterAgentView';
import OperatorView from './components/OperatorView';
import Header from './components/Header';
import NotificationComponent from './components/Notification';
import UpcomingFightsDrawer from './components/UpcomingFightsDrawer';
import ChangePasswordModal from './components/ChangePasswordModal';
import ChatModal from './components/ChatModal';

const App: React.FC = () => {
  // Auth State
  const [session, setSession] = useState<Session | null>(null);
  const [currentUser, setCurrentUser] = useState<AllUserTypes | null>(null);

  // App State
  const [loading, setLoading] = useState(true);
  const [fightStatus, setFightStatus] = useState<FightStatus>(FightStatus.SETTLED);
  const [fightId, setFightId] = useState<number | null>(null);
  const [timer, setTimer] = useState(0);
  const [upcomingFights, setUpcomingFights] = useState<UpcomingFight[]>([]);
  const [fightHistory, setFightHistory] = useState<FightResult[]>([]);
  const [currentBets, setCurrentBets] = useState<Bet[]>([]);
  const [bettingPools, setBettingPools] = useState({ meron: 0, wala: 0 });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [coinRequests, setCoinRequests] = useState<CoinRequest[]>([]);
  const [messages, setMessages] = useState<{ [userId: string]: Message[] }>({});
  const [allUsers, setAllUsers] = useState<{ [id: string]: AllUserTypes }>({});
  
  // UI State
  const [notification, setNotification] = useState<Notification | null>(null);
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [chatTargetUser, setChatTargetUser] = useState<AllUserTypes | null>(null);
  const [isSettingsModalOpen, setSettingsModalOpen] = useState(false);

  const addNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ id: Date.now(), message, type });
  };
  
  const fetchData = useCallback(async (user: Session['user']) => {
    if (!supabase) return;
    setLoading(true);

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (profileError || !profileData) {
        console.error("Could not fetch user profile:", profileError);
        addNotification("Login failed: Your user profile could not be loaded.", "error");
        handleLogout(); // Log out if profile is missing
        setLoading(false);
        return;
    }
    
    const typedProfile = profileData as any;
    const userProfile: AllUserTypes = {
        id: typedProfile.id, name: typedProfile.name, email: user.email!, role: typedProfile.role,
        coinBalance: typedProfile.coin_balance,
        ...(typedProfile.role === UserRole.PLAYER && { agentId: typedProfile.agent_id }),
        ...(typedProfile.role === UserRole.AGENT && { masterAgentId: typedProfile.master_agent_id, commissionBalance: typedProfile.commission_balance, commissionRate: typedProfile.commission_rate, transferFee: typedProfile.transfer_fee }),
        ...(typedProfile.role === UserRole.MASTER_AGENT && { commissionBalance: typedProfile.commission_balance, commissionRate: typedProfile.commission_rate, transferFee: typedProfile.transfer_fee }),
    };
    setCurrentUser(userProfile);
    
    const rpcToCall = userProfile.role === UserRole.OPERATOR ? 'get_all_users_for_operator' : 'get_user_view_data';
    const { data: viewData, error: viewError } = await supabase.rpc(rpcToCall);
    
    if (viewData) {
        const usersMap = (viewData as any[]).reduce((acc: any, u: any) => {
            acc[u.id] = { ...u, email: u.email || 'N/A' }; // Ensure email is present
            return acc;
        }, {});
        setAllUsers(usersMap);
    } else if (viewError) {
        console.error(`Error fetching data from ${rpcToCall}:`, viewError);
    }
    
    setLoading(false);
  }, []);

  // Auth effect
  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    };
    
    supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        if (session?.user) {
            fetchData(session.user);
        } else {
            setLoading(false);
        }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        fetchData(session.user);
      } else {
        setCurrentUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchData]);

  // Auth Handlers
  const handleLogin = async (email: string, password: string) => {
    if(!supabase) return "Supabase not configured";
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? error.message : null;
  };

  const handleRegister = async (name: string, email: string, password: string) => {
    if(!supabase) return "Supabase not configured";
    // This is now a simple, single-step process. The DB trigger handles profile creation.
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } }, // Pass name as metadata for the trigger
    });
    if(!error) addNotification("Registration successful! Please check your email to verify.", "success");
    return error ? error.message : null;
  };

  const handleLogout = async () => {
    if(!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error && error.message !== "Auth session missing!") {
        addNotification("Error logging out: " + error.message, "error");
    }
    setCurrentUser(null);
  };
  
  // Other handlers remain the same...
  const handleCreateCoinRequest = async (amount: number, targetUserId?: string) => {
    if (!supabase || !targetUserId) return "Action not available.";
    const { data, error } = await supabase.rpc('create_coin_request', { p_amount: amount, p_target_user_id: targetUserId });
    if (error) { addNotification(error.message, 'error'); return error.message; }
    if (typeof data === 'string') addNotification(data, 'success');
    if (session?.user) fetchData(session.user);
    return null;
  }
  
  const betCounts = useMemo(() => {
    return currentBets.reduce((acc, bet) => {
        if (bet.choice === 'RED') acc.red++;
        if (bet.choice === 'WHITE') acc.white++;
        return acc;
    }, { red: 0, white: 0 });
  }, [currentBets]);

  if (loading) {
    return <div className="bg-zinc-900 h-screen flex items-center justify-center text-white">Loading...</div>;
  }

  if (!session || !currentUser) {
    return <AuthView onLogin={handleLogin} onRegister={handleRegister} isSupabaseConfigured={isSupabaseConfigured}/>;
  }
  
  const renderUserView = () => {
    switch (currentUser.role) {
      case UserRole.PLAYER: return <PlayerView currentUser={currentUser as Player} allUsers={allUsers} onCreateCoinRequest={handleCreateCoinRequest} fightStatus={fightStatus} fightId={fightId} timer={timer} currentBet={null} bettingPools={bettingPools} playerFightHistory={[]} upcomingFights={[]} fightHistory={[]} onPlaceBet={async () => null} betCounts={betCounts} />;
      case UserRole.AGENT: return <AgentView currentUser={currentUser as Agent} players={[]} transactions={[]} coinRequests={[]} onRespondToRequest={async () => null} onCreateCoinRequest={handleCreateCoinRequest} onSendMessage={async () => {}} messages={{}} allUsers={allUsers} onOpenChat={() => {}} chatTargetUser={null} onCloseChat={() => {}} fightId={fightId} currentBets={[]} fightHistory={[]} />;
      case UserRole.MASTER_AGENT: return <MasterAgentView currentUser={currentUser as MasterAgent} agents={[]} players={[]} transactions={[]} coinRequests={[]} onRespondToRequest={async () => null} onCreateAgent={async () => null} onSendMessage={async () => {}} messages={{}} allUsers={allUsers} onOpenChat={() => {}} chatTargetUser={null} onCloseChat={() => {}} fightStatus={fightStatus} fightId={fightId} betCounts={betCounts} />;
      case UserRole.OPERATOR: return <OperatorView currentUser={currentUser as Operator} fightStatus={fightStatus} lastWinner={null} fightId={fightId} timer={timer} fightHistory={[]} upcomingFights={[]} currentBets={[]} allUsers={allUsers} onStartNextFight={() => {}} onCloseBetting={() => {}} onDeclareWinner={() => {}} onAddUpcomingFight={async () => null} onOpenChat={() => {}} chatTargetUser={null} onCloseChat={() => {}} onSendMessage={async () => {}} messages={{}} />;
      default: return <div className="text-white">Loading user data...</div>;
    }
  };

  return (
    <div className="bg-zinc-900 min-h-screen text-gray-300">
      <Header currentUser={currentUser} onLogout={handleLogout} onSettings={() => {}} onToggleDrawer={() => {}} />
      <main className="p-4 sm:p-6 lg:p-8">{renderUserView()}</main>
      {notification && <NotificationComponent message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
    </div>
  );
};

export default App;
