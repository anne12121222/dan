
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import {
  AllUserTypes, UserRole, FightStatus, Player, Agent, MasterAgent, Operator,
  Bet, BetChoice, FightWinner, UpcomingFight, FightResult, PlayerFightHistoryEntry,
  Transaction, Message, CoinRequest
} from './types';
import AuthView from './components/AuthView';
import PlayerView from './components/PlayerView';
import AgentView from './components/AgentView';
import MasterAgentView from './components/MasterAgentView';
import OperatorView from './components/OperatorView';
import Header from './components/Header';
import ChatModal from './components/ChatModal';
import ChangePasswordModal from './components/ChangePasswordModal';
import NotificationComponent from './components/Notification';
import { Session, RealtimeChannel } from '@supabase/supabase-js';

const FIGHT_TIMER_DURATION = 60; // 60 seconds for betting

const App: React.FC = () => {
  // Auth & User State
  const [session, setSession] = useState<Session | null>(null);
  const [currentUser, setCurrentUser] = useState<AllUserTypes | null>(null);
  const [allUsers, setAllUsers] = useState<{ [id: string]: AllUserTypes }>({});
  const [agents, setAgents] = useState<Agent[]>([]);
  const [masterAgents, setMasterAgents] = useState<MasterAgent[]>([]);

  // Fight State
  const [fightStatus, setFightStatus] = useState<FightStatus>(FightStatus.SETTLED);
  const [fightId, setFightId] = useState<number | null>(null);
  const [lastWinner, setLastWinner] = useState<FightWinner | null>(null);
  const [bettingPools, setBettingPools] = useState({ meron: 0, wala: 0 });
  const [liveBets, setLiveBets] = useState<Bet[]>([]);
  const [currentBet, setCurrentBet] = useState<Bet | null>(null);
  const [timer, setTimer] = useState(FIGHT_TIMER_DURATION);

  // Data State
  const [upcomingFights, setUpcomingFights] = useState<UpcomingFight[]>([]);
  const [fightHistory, setFightHistory] = useState<PlayerFightHistoryEntry[]>([]);
  const [completedFights, setCompletedFights] = useState<FightResult[]>([]);
  const [myPlayers, setMyPlayers] = useState<Player[]>([]);
  const [myAgents, setMyAgents] = useState<Agent[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [coinRequests, setCoinRequests] = useState<CoinRequest[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);

  // UI State
  const [isLoading, setIsLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [chatTargetUser, setChatTargetUser] = useState<AllUserTypes | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
  };

  const mapProfileToUser = (profile: any): AllUserTypes => {
      const baseUser = {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        role: profile.role,
        coinBalance: profile.coin_balance,
      };
      switch (profile.role) {
        case UserRole.PLAYER:
          return { ...baseUser, role: UserRole.PLAYER, agentId: profile.agent_id };
        case UserRole.AGENT:
          return { ...baseUser, role: UserRole.AGENT, masterAgentId: profile.master_agent_id, commissionBalance: profile.commission_balance, commissionRate: profile.commission_rate, transferFee: profile.transfer_fee };
        case UserRole.MASTER_AGENT:
          return { ...baseUser, role: UserRole.MASTER_AGENT, commissionBalance: profile.commission_balance, commissionRate: profile.commission_rate, transferFee: profile.transfer_fee };
        case UserRole.OPERATOR:
          return { ...baseUser, role: UserRole.OPERATOR };
        default:
          throw new Error("Unknown user role");
      }
  };

  const fetchAllUsers = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from('profiles').select('*');
    if (error) {
      console.error("Error fetching all users:", error);
    } else if (data) {
      const usersMap = data.reduce((acc, profile) => {
        acc[profile.id] = mapProfileToUser(profile);
        return acc;
      }, {} as { [id: string]: AllUserTypes });
      setAllUsers(usersMap);
      setAgents(data.filter(p => p.role === UserRole.AGENT).map(mapProfileToUser) as Agent[]);
      setMasterAgents(data.filter(p => p.role === UserRole.MASTER_AGENT).map(mapProfileToUser) as MasterAgent[]);
    }
  }, []);

  const fetchFightState = useCallback(async () => {
      if (!supabase) return;
      const { data, error } = await supabase.from('fights').select('*').order('id', { ascending: false }).limit(1);
      if (error) {
          console.error('Error fetching latest fight state:', error);
          return;
      }
      if (data && data.length > 0) {
          const latestFight = data[0];
          setFightId(latestFight.id);
          setFightStatus(latestFight.status as FightStatus);
          if (latestFight.status === FightStatus.SETTLED) {
            setLastWinner(latestFight.winner as FightWinner | null);
            setTimer(FIGHT_TIMER_DURATION);
            setLiveBets([]);
            setCurrentBet(null);
            setBettingPools({ meron: 0, wala: 0 });
          }
      } else {
        // No fights yet
        setFightStatus(FightStatus.SETTLED);
        setLastWinner(null);
        setFightId(null);
      }
  }, []);

  const fetchRoleSpecificData = useCallback(async (user: AllUserTypes) => {
    if (!supabase) return;
    switch (user.role) {
        case UserRole.PLAYER: {
            const { data, error } = await supabase.rpc('get_player_fight_history');
            if (error) console.error("Error fetching fight history:", error);
            else setFightHistory(data || []);
            break;
        }
        case UserRole.AGENT: {
            const players = Object.values(allUsers).filter(u => u.role === UserRole.PLAYER && u.agentId === user.id) as Player[];
            setMyPlayers(players);
            const { data: reqs, error: reqErr } = await supabase.rpc('get_my_coin_requests');
            if(reqErr) console.error("Error fetching coin requests", reqErr);
            else setCoinRequests(reqs || []);
            break;
        }
        case UserRole.MASTER_AGENT: {
            const agents = Object.values(allUsers).filter(u => u.role === UserRole.AGENT && u.masterAgentId === user.id) as Agent[];
            setMyAgents(agents);
            const { data: reqs, error: reqErr } = await supabase.rpc('get_my_coin_requests');
            if(reqErr) console.error("Error fetching coin requests", reqErr);
            else setCoinRequests(reqs || []);
            break;
        }
        case UserRole.OPERATOR: {
            const { data, error } = await supabase.from('fights').select('*').eq('status', 'SETTLED').order('id', { ascending: false });
            if (error) console.error("Error fetching completed fights:", error);
            else setCompletedFights(data || []);
            break;
        }
    }
    // Fetch transactions for all roles except Player (can be enabled if needed)
    if(user.role !== UserRole.PLAYER){
      const { data, error } = await supabase.rpc('get_my_transactions');
      if (error) console.error("Error fetching transactions:", error);
      else setTransactions(data || []);
    }

  }, [allUsers]);

  const fetchData = useCallback(async () => {
    if (!session || !supabase) {
        setCurrentUser(null);
        return;
    };
    
    // 1. Fetch current user profile
    const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
    if (error || !profile) {
        console.error("Error fetching profile, logging out.", error);
        await supabase.auth.signOut();
        return;
    }
    const user = mapProfileToUser(profile);
    setCurrentUser(user);
    
    // 2. Fetch global data
    await fetchAllUsers();
    await fetchFightState();
    
    const { data: upcoming, error: upcomingError } = await supabase.from('upcoming_fights').select('*').order('id', { ascending: true });
    if(upcomingError) console.error("Error fetching upcoming fights:", upcomingError);
    else setUpcomingFights(upcoming || []);

  }, [session, fetchAllUsers, fetchFightState]);

  useEffect(() => {
    if (session) {
      fetchData();
    }
  }, [session, fetchData]);

  useEffect(() => {
    if (currentUser && Object.keys(allUsers).length > 0) {
      fetchRoleSpecificData(currentUser);
    }
  }, [currentUser, allUsers, fetchRoleSpecificData]);
  
  // Session handling
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Realtime Subscriptions
  useEffect(() => {
    if (!supabase || !currentUser) return;

    const channels: RealtimeChannel[] = [];
    
    // Profile updates (for coin balances etc)
    const profileChannel = supabase.channel('public:profiles')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, payload => {
          const updatedProfile = payload.new;
          setAllUsers(prev => ({...prev, [updatedProfile.id]: mapProfileToUser(updatedProfile)}));
          if (updatedProfile.id === currentUser.id) {
              setCurrentUser(mapProfileToUser(updatedProfile));
          }
      }).subscribe();
    channels.push(profileChannel);

    // Fight updates
    const fightChannel = supabase.channel('public:fights')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fights' }, (payload) => {
        fetchFightState(); // Refetch state on any change for simplicity
        if(currentUser.role === UserRole.OPERATOR) fetchRoleSpecificData(currentUser);
      }).subscribe();
    channels.push(fightChannel);

    // Upcoming Fights updates
    const upcomingFightsChannel = supabase.channel('public:upcoming_fights')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'upcoming_fights' }, async () => {
        const { data } = await supabase.from('upcoming_fights').select('*').order('id', { ascending: true });
        setUpcomingFights(data || []);
      }).subscribe();
    channels.push(upcomingFightsChannel);

    // Coin Requests updates
     const coinRequestsChannel = supabase.channel(`coin_requests_for_${currentUser.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'coin_requests', filter: `to_user_id=eq.${currentUser.id}`}, async () => {
             const { data, error } = await supabase.rpc('get_my_coin_requests');
             if(error) console.error("Error refetching coin requests", error);
             else setCoinRequests(data || []);
        }).subscribe();
    channels.push(coinRequestsChannel);

    return () => {
        channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [currentUser, fetchFightState, fetchRoleSpecificData]);


  // Timer logic
  useEffect(() => {
    if (fightStatus === FightStatus.BETTING_OPEN && timer > 0) {
      timerRef.current = setTimeout(() => setTimer(t => t - 1), 1000);
    } else if (timer <= 0 && fightStatus === FightStatus.BETTING_OPEN) {
        if(currentUser?.role === UserRole.OPERATOR) {
            handleCloseBetting();
        }
    } else {
      if (timerRef.current) clearTimeout(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fightStatus, timer, currentUser]);


  // Handlers
  const handleLogin = async (email: string, password: string): Promise<string | null> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return error.message;
    return null;
  };

  const handleRegister = async (name: string, email: string, password: string, agentId: string): Promise<string | null> => {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            agent_id: agentId,
          },
        },
      });
      if (error) return error.message;
      showNotification('Registration successful! Please check your email to verify.', 'success');
      return null;
  };
  
  const handleLogout = async () => {
      await supabase.auth.signOut();
      setCurrentUser(null);
  };

  const handlePlaceBet = async (amount: number, choice: BetChoice): Promise<string | null> => {
      if (!fightId) return "No active fight.";
      const { data, error } = await supabase.rpc('place_bet', { p_fight_id: fightId, p_amount: amount, p_choice: choice });
      if (error) {
          showNotification(error.message, 'error');
          return error.message;
      }
      if (data) { // If RPC returns an error message as string
        showNotification(data, 'error');
        return data;
      }
      showNotification('Bet placed successfully!', 'success');
      // Optimistically set current bet
      setCurrentBet({ id: '', userId: currentUser!.id, fightId, amount, choice });
      return null;
  };
  
  const handleRequestCoins = async (amount: number, targetUserId: string): Promise<string | null> => {
      const { error } = await supabase.rpc('create_coin_request', { p_amount: amount, p_to_user_id: targetUserId });
      if (error) {
          showNotification(error.message, 'error');
          return error.message;
      }
      showNotification('Coin request sent successfully!', 'success');
      return null;
  };
  
  const handleRespondToRequest = async (requestId: string, response: 'APPROVED' | 'DECLINED'): Promise<string | null> => {
      const { data, error } = await supabase.rpc('respond_to_coin_request', { p_request_id: requestId, p_response: response });
      if(error) {
          showNotification(error.message, 'error');
          return error.message;
      }
      if (data) { // If RPC returns an error message as string
        showNotification(data, 'error');
        return data;
      }
      showNotification(`Request ${response.toLowerCase()}!`, 'success');
      // Re-fetch requests
      const { data: reqs, error: reqErr } = await supabase.rpc('get_my_coin_requests');
      if(reqErr) console.error("Error fetching coin requests", reqErr);
      else setCoinRequests(reqs || []);
      return null;
  };
  
  const handleStartChat = (user: AllUserTypes) => setChatTargetUser(user);

  const handleSendMessage = async (text: string, amount: number) => {
      if (!chatTargetUser) return;
      const { data, error } = await supabase.rpc('send_message_and_coins', { p_receiver_id: chatTargetUser.id, p_text: text, p_amount: amount });
      if (error) {
          showNotification(error.message, 'error');
      }
       if (data) { // If RPC returns an error message as string
        showNotification(data, 'error');
      }
      // Re-fetch messages after sending
      const { data: msgs } = await supabase.rpc('get_messages', { p_contact_id: chatTargetUser.id });
      setMessages(msgs || []);
  };
  
  // Operator Handlers
  const handleDeclareWinner = async (winner: FightWinner) => {
      if (!fightId) return;
      const { error } = await supabase.rpc('declare_winner', { p_fight_id: fightId, p_winner_text: winner });
      if (error) showNotification(error.message, 'error');
      else showNotification('Winner declared and bets settled!', 'success');
  };
  
  const handleAddUpcomingFight = async (red: string, white: string) => {
      const { error } = await supabase.rpc('add_upcoming_fight', { p_red_text: red, p_white_text: white });
      if (error) {
          showNotification(error.message, 'error');
          return error.message;
      }
      showNotification('Fight added to queue!', 'success');
      return null;
  };
  
  const onStartNextFight = async () => {
    const { error } = await supabase.rpc('start_next_fight');
    if (error) showNotification(error.message, 'error');
    else {
      showNotification('Next fight started!', 'success');
      setTimer(FIGHT_TIMER_DURATION);
    }
  };
  
  const handleCloseBetting = async () => {
    if(!fightId) return;
    const { error } = await supabase.rpc('close_betting', { p_fight_id: fightId });
    if(error) showNotification(error.message, 'error');
    else showNotification('Betting is now closed!', 'success');
  };
  
  // Master Agent Handlers
  const handleCreateUser = (rpcName: 'create_agent_user' | 'create_master_agent_user' | 'create_operator_user') => 
    async (name: string, email: string, password: string): Promise<string | null> => {
    const { data, error } = await supabase.rpc(rpcName, { p_name: name, p_email: email, p_password: password });
    if(error) {
        showNotification(error.message, 'error');
        return error.message;
    }
    if (data) {
        showNotification(data, 'error');
        return data;
    }
    showNotification('User created successfully!', 'success');
    fetchAllUsers(); // Refresh user list
    return null;
  };

  const handleChangePassword = async (_old: string, newPass: string) => {
      const { error } = await supabase.auth.updateUser({ password: newPass });
      if (error) {
          showNotification(error.message, 'error');
          return error.message;
      }
      showNotification('Password updated successfully!', 'success');
      return null;
  };


  useEffect(() => {
    if(chatTargetUser) {
        const fetchMessages = async () => {
            const { data, error } = await supabase.rpc('get_messages', {p_contact_id: chatTargetUser.id});
            if(error) console.error(error);
            else setMessages(data || []);
        }
        fetchMessages();

        const messageChannel = supabase.channel(`messages_with_${chatTargetUser.id}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `or(and(sender_id.eq.${currentUser!.id},receiver_id.eq.${chatTargetUser.id}),and(sender_id.eq.${chatTargetUser.id},receiver_id.eq.${currentUser!.id}))`}, 
            (payload) => {
                setMessages(prev => [...prev, payload.new as Message]);
            }).subscribe();
        
        return () => { supabase.removeChannel(messageChannel); }
    }
  }, [chatTargetUser, currentUser]);
  
  const renderUserView = () => {
    if (!currentUser) return null;
    switch (currentUser.role) {
      case UserRole.PLAYER:
        return <PlayerView 
                    currentUser={currentUser as Player} 
                    fightStatus={fightStatus}
                    lastWinner={lastWinner}
                    fightId={fightId}
                    timer={timer}
                    bettingPools={bettingPools}
                    currentBet={currentBet}
                    onPlaceBet={handlePlaceBet}
                    fightHistory={fightHistory}
                    upcomingFights={upcomingFights}
                    onRequestCoins={handleRequestCoins}
                    agents={agents}
                    isDrawerOpen={isDrawerOpen}
                    onToggleDrawer={() => setIsDrawerOpen(!isDrawerOpen)}
                    allUsers={allUsers}
                    onStartChat={handleStartChat}
                    liveBets={liveBets}
                />;
      case UserRole.AGENT:
          return <AgentView 
                    currentUser={currentUser as Agent}
                    myPlayers={myPlayers}
                    allUsers={allUsers}
                    transactions={transactions}
                    coinRequests={coinRequests}
                    masterAgents={masterAgents}
                    liveBets={liveBets}
                    fightId={fightId}
                    onRespondToRequest={handleRespondToRequest}
                    onRequestCoins={handleRequestCoins}
                    onStartChat={handleStartChat}
                  />;
      case UserRole.MASTER_AGENT:
          return <MasterAgentView 
                    currentUser={currentUser as MasterAgent}
                    myAgents={myAgents}
                    allUsers={allUsers}
                    transactions={transactions}
                    coinRequests={coinRequests}
                    liveBets={liveBets}
                    fightId={fightId}
                    onRespondToRequest={handleRespondToRequest}
                    onCreateAgent={handleCreateUser('create_agent_user')}
                    onCreateMasterAgent={handleCreateUser('create_master_agent_user')}
                    onCreateOperator={handleCreateUser('create_operator_user')}
                    onStartChat={handleStartChat}
                />;
      case UserRole.OPERATOR:
        return <OperatorView 
                    currentUser={currentUser as Operator}
                    fightStatus={fightStatus}
                    lastWinner={lastWinner}
                    fightId={fightId}
                    timer={timer}
                    bettingPools={bettingPools}
                    liveBets={liveBets}
                    upcomingFights={upcomingFights}
                    completedFights={completedFights}
                    allUsers={allUsers}
                    onDeclareWinner={handleDeclareWinner}
                    onAddUpcomingFight={handleAddUpcomingFight}
                    onStartNextFight={onStartNextFight}
                    onCloseBetting={handleCloseBetting}
                />;
      default:
        return <div>Unknown role</div>;
    }
  };

  if (isLoading) {
      return <div className="bg-zinc-900 h-screen flex items-center justify-center text-white">Loading...</div>;
  }
  
  return (
    <>
      {!session ? (
        <AuthView onLogin={handleLogin} onRegister={handleRegister} isSupabaseConfigured={isSupabaseConfigured} agents={agents} />
      ) : currentUser ? (
        <div className="flex flex-col h-screen">
          <Header currentUser={currentUser} onLogout={handleLogout} onSettings={() => setIsSettingsModalOpen(true)} onToggleDrawer={() => setIsDrawerOpen(!isDrawerOpen)} />
          <main className="flex-grow overflow-y-auto">
            {renderUserView()}
          </main>
        </div>
      ) : (
        <div className="bg-zinc-900 h-screen flex items-center justify-center text-white">Loading user profile...</div>
      )}

      {chatTargetUser && currentUser && (
          <ChatModal
            currentUser={currentUser}
            chatTargetUser={chatTargetUser}
            messages={messages}
            onClose={() => setChatTargetUser(null)}
            onSendMessage={handleSendMessage}
           />
      )}

      {isSettingsModalOpen && (
          <ChangePasswordModal 
            onClose={() => setIsSettingsModalOpen(false)}
            onChangePassword={handleChangePassword}
          />
      )}

      {notification && (
        <NotificationComponent
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
    </>
  );
}

export default App;
