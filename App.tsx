
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import {
  AllUserTypes, UserRole, FightStatus, Bet, PlayerFightHistoryEntry, UpcomingFight,
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

  // Notifications
  const addNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ id: Date.now(), message, type });
  };
  
  // Fetch initial data
  const fetchData = useCallback(async (user_id?: string) => {
    if (!supabase || !user_id) return;
    if (loading === false) setLoading(true);

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user_id)
      .single();

    if (profileError || !profileData) {
        console.error("Could not fetch user profile:", profileError);
        handleLogout();
        setLoading(false);
        return;
    }

    const typedProfile = profileData as any;
    const userProfile: AllUserTypes = {
        id: typedProfile.id,
        name: typedProfile.name,
        email: typedProfile.email,
        role: typedProfile.role,
        coinBalance: typedProfile.coin_balance,
        ...(typedProfile.role === UserRole.PLAYER && { agentId: typedProfile.agent_id }),
        ...(typedProfile.role === UserRole.AGENT && { masterAgentId: typedProfile.master_agent_id, commissionBalance: typedProfile.commission_balance, commissionRate: typedProfile.commission_rate, transferFee: typedProfile.transfer_fee }),
        ...(typedProfile.role === UserRole.MASTER_AGENT && { commissionBalance: typedProfile.commission_balance, commissionRate: typedProfile.commission_rate, transferFee: typedProfile.transfer_fee }),
    };
    setCurrentUser(userProfile);
    
    // Call the appropriate RPC function based on the user's role
    const rpcToCall = userProfile.role === UserRole.OPERATOR ? 'get_all_users_for_operator' : 'get_user_view_data';
    const { data: viewData, error: viewError } = await supabase.rpc(rpcToCall);
    
    if (viewData) {
        const usersMap = (viewData as any[]).reduce((acc: any, user: any) => {
            acc[user.id] = {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                coinBalance: user.coin_balance,
                agentId: user.agent_id,
                masterAgentId: user.master_agent_id,
                commissionBalance: user.commission_balance,
                commissionRate: user.commission_rate,
                transferFee: user.transfer_fee
            };
            return acc;
        }, {});
        setAllUsers(usersMap);
    } else if (viewError) {
        console.error(`Error fetching data from ${rpcToCall}:`, viewError);
    }
    
    setLoading(false);
  }, [loading]);

  // Auth effect
  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    };
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if(session?.user) {
          fetchData(session.user.id);
      } else {
          setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        fetchData(session.user.id);
      } else {
        setCurrentUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Handlers (Auth)
  const handleLogin = async (email: string, password: string) => {
    if(!supabase) return "Supabase not configured";
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? error.message : null;
  };

  const handleRegister = async (name: string, email: string, password: string) => {
    if(!supabase) return "Supabase not configured";
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if(!error) addNotification("Registration successful! Please check your email to verify.", "success");
    return error ? error.message : null;
  };

  const handleLogout = async () => {
    if(!supabase) return;
    await supabase.auth.signOut();
    setCurrentUser(null);
  };

  const handleChangePassword = async (_old: string, newPass: string) => {
     if(!supabase) return "Supabase not configured";
     const { error } = await supabase.auth.updateUser({ password: newPass });
     if (!error) addNotification("Password updated successfully!", "success");
     return error ? error.message : null;
  }

  // Handlers (Actions) - These would call Supabase RPC functions
  const handlePlaceBet = async (amount: number, choice: BetChoice) => {
     if (!supabase || !fightId) return "Betting is not available.";
     const { data, error } = await supabase.rpc('place_bet', { p_fight_id: fightId, p_amount: amount, p_choice: choice });
     if (error) { addNotification(error.message, 'error'); return error.message; }
     if (typeof data === 'string') addNotification(data, 'success');
     fetchData(session?.user.id); // re-sync state
     return null;
  };

  const handleCreateCoinRequest = async (amount: number, targetUserId?: string) => {
    if (!supabase) return "Action not available.";
    const { data, error } = await supabase.rpc('create_coin_request', { p_amount: amount, p_target_user_id: targetUserId });
    if (error) { addNotification(error.message, 'error'); return error.message; }
    if (typeof data === 'string') addNotification(data, 'success');
    fetchData(session?.user.id);
    return null;
  }
  
  const handleSendMessage = async (receiverId: string, text: string, amount: number) => {
    if(!supabase) return;
    const { error } = await supabase.rpc('send_message_and_coins', { p_receiver_id: receiverId, p_text: text, p_amount: amount });
     if (error) { addNotification(error.message, 'error'); }
     else { fetchData(session?.user.id); }
  }
  
  // Memoized values for child components
  const playerFightHistory = useMemo((): PlayerFightHistoryEntry[] => {
    // This is a placeholder. Real logic would map user's bets to fight results.
    return fightHistory.map(fh => ({ ...fh, bet: null, outcome: null }));
  }, [fightHistory]);
  
  const userSubordinates = useMemo(() => {
      if (!currentUser) return { agents: [], players: [] };
      if (currentUser.role === UserRole.MASTER_AGENT) {
          const agents = Object.values(allUsers).filter(u => u.role === UserRole.AGENT && 'masterAgentId' in u && u.masterAgentId === currentUser.id) as Agent[];
          return { agents, players: [] };
      }
      if (currentUser.role === UserRole.AGENT) {
          const players = Object.values(allUsers).filter(u => u.role === UserRole.PLAYER && 'agentId' in u && u.agentId === currentUser.id) as Player[];
          return { agents: [], players };
      }
      return { agents: [], players: [] };
  }, [currentUser, allUsers]);

  const betCounts = useMemo(() => {
    return currentBets.reduce(
        (acc, bet) => {
            if (bet.choice === 'RED') {
                acc.red += 1;
            } else if (bet.choice === 'WHITE') {
                acc.white += 1;
            }
            return acc;
        },
        { red: 0, white: 0 }
    );
  }, [currentBets]);

  // Render Logic
  if (loading) {
    return <div className="bg-zinc-900 h-screen flex items-center justify-center text-white">Loading...</div>;
  }

  if (!session) {
    return <AuthView onLogin={handleLogin} onRegister={handleRegister} isSupabaseConfigured={isSupabaseConfigured}/>;
  }
  
  if (!currentUser) {
     return <div className="bg-zinc-900 h-screen flex items-center justify-center text-white">Loading user data...</div>;
  }
  
  const renderUserView = () => {
    switch (currentUser.role) {
      case UserRole.PLAYER:
        return <PlayerView 
            currentUser={currentUser as Player} 
            fightStatus={fightStatus}
            fightId={fightId}
            timer={timer}
            currentBet={currentBets.find(b => b.userId === currentUser.id) || null}
            bettingPools={bettingPools}
            playerFightHistory={playerFightHistory}
            upcomingFights={upcomingFights}
            fightHistory={fightHistory}
            allUsers={allUsers}
            onPlaceBet={handlePlaceBet}
            onCreateCoinRequest={handleCreateCoinRequest}
            betCounts={betCounts}
        />;
      case UserRole.AGENT:
        return <AgentView
            currentUser={currentUser as Agent}
            players={userSubordinates.players}
            transactions={transactions}
            coinRequests={coinRequests}
            onRespondToRequest={async () => null} // placeholder
            onCreateCoinRequest={handleCreateCoinRequest}
            onSendMessage={handleSendMessage}
            messages={messages}
            allUsers={allUsers}
            onOpenChat={setChatTargetUser}
            chatTargetUser={chatTargetUser}
            onCloseChat={() => setChatTargetUser(null)}
            fightId={fightId}
            currentBets={currentBets}
            fightHistory={fightHistory}
        />;
      case UserRole.MASTER_AGENT:
        return <MasterAgentView
            currentUser={currentUser as MasterAgent}
            agents={userSubordinates.agents}
            players={[]} // Master Agents view agents, not players directly
            transactions={transactions}
            coinRequests={coinRequests}
            onRespondToRequest={async () => null} // placeholder
            onCreateAgent={async () => null} // placeholder
            onSendMessage={handleSendMessage}
            messages={messages}
            allUsers={allUsers}
            onOpenChat={setChatTargetUser}
            chatTargetUser={chatTargetUser}
            onCloseChat={() => setChatTargetUser(null)}
            fightStatus={fightStatus}
            fightId={fightId}
            betCounts={betCounts}
        />;
      case UserRole.OPERATOR:
        return <OperatorView
            currentUser={currentUser as Operator}
            fightStatus={fightStatus}
            lastWinner={fightHistory[0]?.winner || null}
            fightId={fightId}
            timer={timer}
            fightHistory={fightHistory}
            upcomingFights={upcomingFights}
            currentBets={currentBets}
            allUsers={allUsers}
            onStartNextFight={() => {}} // placeholder
            onCloseBetting={() => {}} // placeholder
            onDeclareWinner={(winner: FightWinner) => {console.log(winner)}} // placeholder
            onAddUpcomingFight={async () => null} // placeholder
            onOpenChat={setChatTargetUser}
            chatTargetUser={chatTargetUser}
            onCloseChat={() => setChatTargetUser(null)}
            onSendMessage={handleSendMessage}
            messages={messages}
        />;
      default:
        return <div className="text-white">Unknown user role. Please contact support.</div>;
    }
  };

  return (
    <div className="bg-zinc-900 min-h-screen text-gray-300">
      <Header 
        currentUser={currentUser} 
        onLogout={handleLogout} 
        onSettings={() => setSettingsModalOpen(true)}
        onToggleDrawer={() => setDrawerOpen(!isDrawerOpen)}
      />
      <main className="p-4 sm:p-6 lg:p-8">
        {renderUserView()}
      </main>
      <UpcomingFightsDrawer isOpen={isDrawerOpen} onClose={() => setDrawerOpen(false)} fights={upcomingFights} />
      {isSettingsModalOpen && (
          <ChangePasswordModal 
            onClose={() => setSettingsModalOpen(false)}
            onChangePassword={handleChangePassword}
          />
      )}
      {chatTargetUser && (
        <ChatModal
          currentUser={currentUser}
          chatTargetUser={chatTargetUser}
          messages={messages[chatTargetUser.id] || []}
          onClose={() => setChatTargetUser(null)}
          onSendMessage={(text, amount) => handleSendMessage(chatTargetUser.id, text, amount)}
        />
      )}
      {notification && (
        <NotificationComponent
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
    </div>
  );
};

export default App;
