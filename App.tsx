import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import {
  AllUserTypes, UserRole, FightStatus, Bet, UpcomingFight,
  FightResult, Transaction, CoinRequest, Message, Notification, Player, Agent, MasterAgent, Operator
} from './types';
import AuthView from './components/AuthView';
import PlayerView from './components/PlayerView';
import AgentView from './components/AgentView';
import MasterAgentView from './components/MasterAgentView';
import OperatorView from './components/OperatorView';
import Header from './components/Header';
import NotificationComponent from './components/Notification';

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [currentUser, setCurrentUser] = useState<AllUserTypes | null>(null);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [allUsers, setAllUsers] = useState<{ [id: string]: AllUserTypes }>({});
  
  // App-specific state
  const [fightStatus, setFightStatus] = useState<FightStatus>(FightStatus.SETTLED);
  const [fightId, setFightId] = useState<number | null>(null);
  const [timer, setTimer] = useState(0);
  const [currentBets, setCurrentBets] = useState<Bet[]>([]);
  const [fightHistory, setFightHistory] = useState<FightResult[]>([]);

  const addNotification = useCallback((message: string, type: 'success' | 'error') => {
    setNotification({ id: Date.now(), message, type });
  }, []);

  const fetchData = useCallback(async (user: Session['user'], isInitialLoad: boolean = false) => {
    if (!supabase) return;
    if(isInitialLoad) setLoading(true);

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error("Could not fetch user profile:", profileError);
      // Don't sign out, just show error. The trigger should have worked.
      // This might be a network issue or RLS issue.
      addNotification("Login failed: Could not load your user data.", "error");
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
            acc[u.id] = { ...u, email: u.email || 'N/A' };
            return acc;
        }, {});
        setAllUsers(usersMap);
    } else if (viewError) {
        console.error(`Error fetching data from ${rpcToCall}:`, viewError);
    }
    
    if(isInitialLoad) setLoading(false);
  }, [addNotification]);
  
  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.user) {
        await fetchData(session.user, true);
      } else {
        setCurrentUser(null);
        setLoading(false);
      }
    });
    return () => subscription.unsubscribe();
  }, [fetchData]);

  const handleLogin = async (email: string, password: string) => {
    if (!supabase) return "Supabase not configured";
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? error.message : null;
  };

  const handleRegister = async (name: string, email: string, password: string) => {
    if (!supabase) return "Supabase not configured";
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } }, // The trigger will use this metadata
    });
    if (!error) addNotification("Registration successful! Please check your email to verify.", "success");
    return error ? error.message : null;
  };

  const handleLogout = async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error && error.message !== "Auth session missing!") {
      addNotification("Error logging out: " + error.message, "error");
    }
    setCurrentUser(null);
  };
  
  const handleCreateCoinRequest = async (amount: number, targetUserId?: string) => {
    // ... implementation
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
    return <AuthView onLogin={handleLogin} onRegister={handleRegister} isSupabaseConfigured={isSupabaseConfigured} />;
  }
  
  const renderUserView = () => {
    switch (currentUser.role) {
      case UserRole.PLAYER: return <PlayerView currentUser={currentUser as Player} allUsers={allUsers} onCreateCoinRequest={handleCreateCoinRequest} fightStatus={fightStatus} fightId={fightId} timer={timer} currentBet={null} bettingPools={{meron:0, wala:0}} playerFightHistory={[]} upcomingFights={[]} fightHistory={fightHistory} onPlaceBet={async () => null} betCounts={betCounts} />;
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
