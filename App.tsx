
import React, { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from './supabaseClient.ts';
import { Session } from '@supabase/supabase-js';

// Import types
import {
  UserRole,
  AllUserTypes,
  FightStatus,
  FightWinner,
  Bet,
  PlayerFightHistoryEntry,
  UpcomingFight,
  Transaction,
  CoinRequest,
  Message,
  BetChoice,
  Agent,
  MasterAgent,
  FightResult,
  Player,
  Operator,
} from './types.ts';

// Import views and components
import AuthView from './components/AuthView.tsx';
import Header from './components/Header.tsx';
import PlayerView from './components/PlayerView.tsx';
import AgentView from './components/AgentView.tsx';
import MasterAgentView from './components/MasterAgentView.tsx';
import OperatorView from './components/OperatorView.tsx';
import ChatModal from './components/ChatModal.tsx';
import NotificationComponent from './components/Notification.tsx';
import ChangePasswordModal from './components/ChangePasswordModal.tsx';

// Main App Component
const App: React.FC = () => {
  // Loading and session state
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [currentUser, setCurrentUser] = useState<AllUserTypes | null>(null);

  // Global app state
  const [allUsers, setAllUsers] = useState<{ [id: string]: AllUserTypes }>({});
  const [agents, setAgents] = useState<Agent[]>([]);
  const [masterAgents, setMasterAgents] = useState<MasterAgent[]>([]);

  // Fight state
  const [fightId, setFightId] = useState<number | null>(null);
  const [fightStatus, setFightStatus] = useState<FightStatus>(FightStatus.SETTLED);
  const [lastWinner, setLastWinner] = useState<FightWinner | null>(null);
  const [timer, setTimer] = useState(0);
  const [bettingPools, setBettingPools] = useState({ meron: 0, wala: 0 });
  const [liveBets, setLiveBets] = useState<Bet[]>([]);
  const [currentBet, setCurrentBet] = useState<Bet | null>(null);

  // History and lists
  const [fightHistory, setFightHistory] = useState<PlayerFightHistoryEntry[]>([]);
  const [upcomingFights, setUpcomingFights] = useState<UpcomingFight[]>([]);
  const [completedFights, setCompletedFights] = useState<FightResult[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [coinRequests, setCoinRequests] = useState<CoinRequest[]>([]);
  const [myPlayersOrAgents, setMyPlayersOrAgents] = useState<(Player[] | Agent[])>([]);

  // UI state
  const [chatState, setChatState] = useState<{ isOpen: boolean; targetUser: AllUserTypes | null; messages: Message[] }>({
    isOpen: false,
    targetUser: null,
    messages: [],
  });
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // --- Utility Functions ---
  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
  };

  // --- Data Fetching ---
  const fetchAllUsers = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from('profiles').select('*');
    if (error) {
      console.error('Error fetching users:', error);
      return;
    }
    // FIX: Map all user profiles from snake_case (DB) to camelCase (app types) at once to prevent type errors.
    const mappedUsers = data.map((user: any) => {
        const baseUser = {
            id: user.id, name: user.name, email: user.email, role: user.role as UserRole, coinBalance: user.coin_balance
        };
        switch (user.role) {
            case UserRole.PLAYER:
                return { ...baseUser, role: UserRole.PLAYER, agentId: user.agent_id };
            case UserRole.AGENT:
                return { ...baseUser, role: UserRole.AGENT, masterAgentId: user.master_agent_id, commissionBalance: user.commission_balance, commissionRate: user.commission_rate, transferFee: user.transfer_fee };
            case UserRole.MASTER_AGENT:
                return { ...baseUser, role: UserRole.MASTER_AGENT, commissionBalance: user.commission_balance, commissionRate: user.commission_rate, transferFee: user.transfer_fee };
            case UserRole.OPERATOR:
                return { ...baseUser, role: UserRole.OPERATOR };
            default:
                return null;
        }
    }).filter((u): u is AllUserTypes => u !== null);

    const usersMap = mappedUsers.reduce((acc, user) => {
      acc[user.id] = user;
      return acc;
    }, {} as { [id: string]: AllUserTypes });
    
    setAllUsers(usersMap);
    setAgents(mappedUsers.filter((u): u is Agent => u.role === UserRole.AGENT));
    setMasterAgents(mappedUsers.filter((u): u is MasterAgent => u.role === UserRole.MASTER_AGENT));
  }, []);

  const fetchFightState = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from('fights').select('*').order('id', { ascending: false }).limit(1);
    if (error || !data || data.length === 0) {
      console.error('Error fetching fight state:', error);
      setFightStatus(FightStatus.SETTLED);
      return;
    }
    const currentFight = data[0];
    setFightId(currentFight.id);
    setFightStatus(currentFight.status as FightStatus);
    setLastWinner(currentFight.winner as FightWinner | null);
    if (currentFight.status === 'BETTING_OPEN' && currentFight.betting_ends_at) {
        const endTime = new Date(currentFight.betting_ends_at).getTime();
        const now = new Date().getTime();
        setTimer(Math.max(0, Math.floor((endTime - now) / 1000)));
    } else {
        setTimer(0);
    }
  }, []);
  
  const fetchInitialData = useCallback(async (user: AllUserTypes) => {
    if (!supabase) return;
    await fetchAllUsers();
    await fetchFightState();

    // Fetch lists relevant to the user
    const { data: upcoming } = await supabase.from('upcoming_fights').select('*').order('id', { ascending: true });
    setUpcomingFights(upcoming?.map(f => ({id: f.id, participants: { red: f.red_participant, white: f.white_participant }})) || []);

    const { data: completed } = await supabase.from('fights').select('*').neq('status', 'BETTING_OPEN').order('id', { ascending: false }).limit(50);
    setCompletedFights(completed as FightResult[] || []);
    
    if (user.role === UserRole.PLAYER) {
        const { data: history } = await supabase.rpc('get_player_fight_history', { p_user_id: user.id });
        // FIX: Map the RPC response to the PlayerFightHistoryEntry type. The `bet` property
        // is a JSON object with snake_case keys that needs to be mapped to the `Bet` type.
        setFightHistory(history?.map(h => {
            const betData = h.bet as any;
            return {
                ...h,
                bet: betData ? {
                    id: betData.id,
                    userId: betData.user_id,
                    fightId: betData.fight_id,
                    amount: betData.amount,
                    choice: betData.choice,
                } : null,
                outcome: h.outcome as 'WIN' | 'LOSS' | 'REFUND' | null
            };
        }) || []);
    }

    if (user.role === UserRole.AGENT) {
        const { data: players } = await supabase.from('profiles').select('*').eq('agent_id', user.id);
        // FIX: Map snake_case properties to camelCase to match the Player type.
        setMyPlayersOrAgents(players?.map(p => ({
            id: p.id, name: p.name, email: p.email, role: p.role, coinBalance: p.coin_balance, agentId: p.agent_id
        })) as Player[] || []);
        const { data: requests } = await supabase.from('coin_requests').select('*').eq('to_user_id', user.id).eq('status', 'PENDING');
        // FIX: Map snake_case properties to camelCase for the CoinRequest type.
        setCoinRequests(requests?.map(r => ({
            id: r.id, fromUserId: r.from_user_id, toUserId: r.to_user_id, amount: r.amount, status: r.status, createdAt: r.created_at
        })) || []);
    }
    if (user.role === UserRole.MASTER_AGENT) {
        const { data: agentsData } = await supabase.from('profiles').select('*').eq('master_agent_id', user.id);
        // FIX: Map snake_case properties to camelCase to match the Agent type.
        setMyPlayersOrAgents(agentsData?.map(a => ({
            id: a.id, name: a.name, email: a.email, role: a.role, coinBalance: a.coin_balance, masterAgentId: a.master_agent_id,
            commissionBalance: a.commission_balance, commissionRate: a.commission_rate, transferFee: a.transfer_fee
        })) as Agent[] || []);
        const { data: requests } = await supabase.rpc('get_agent_requests_for_master', { p_master_agent_id: user.id });
        // FIX: Map snake_case properties to camelCase for the CoinRequest type.
        setCoinRequests(requests?.map(r => ({
            id: r.id, fromUserId: r.from_user_id, toUserId: r.to_user_id, amount: r.amount, status: r.status, createdAt: r.created_at
        })) || []);
    }
    
    const { data: txs } = await supabase.rpc('get_user_transactions', { p_user_id: user.id });
    // FIX: Map all snake_case properties to camelCase for the Transaction type.
    setTransactions(txs?.map(t => ({
        id: t.id, type: t.type, fromUserId: t.from_user_id, toUserId: t.to_user_id, amount: t.amount, transactionTimestamp: t.transaction_timestamp
    })) || []);

  }, [fetchAllUsers, fetchFightState]);

  // --- Effects ---
  // Handle Auth
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);
  
  // Fetch user profile when session changes
  useEffect(() => {
    if (session && isSupabaseConfigured) {
      supabase.from('profiles').select('*').eq('id', session.user.id).single().then(({ data, error }) => {
        if (error) {
          console.error('Error fetching profile:', error);
          setCurrentUser(null);
        } else if (data) {
          // FIX: Explicitly map properties from snake_case to camelCase to create a valid AllUserTypes object.
          const mapDataToUser = (profileData: any): AllUserTypes => {
            const baseUser = {
                id: profileData.id, name: profileData.name, email: profileData.email, role: profileData.role, coinBalance: profileData.coin_balance
            };
            switch (profileData.role) {
                case UserRole.PLAYER: return { ...baseUser, role: UserRole.PLAYER, agentId: profileData.agent_id };
                case UserRole.AGENT: return { ...baseUser, role: UserRole.AGENT, masterAgentId: profileData.master_agent_id, commissionBalance: profileData.commission_balance, commissionRate: profileData.commission_rate, transferFee: profileData.transfer_fee };
                case UserRole.MASTER_AGENT: return { ...baseUser, role: UserRole.MASTER_AGENT, commissionBalance: profileData.commission_balance, commissionRate: profileData.commission_rate, transferFee: profileData.transfer_fee };
                case UserRole.OPERATOR: return { ...baseUser, role: UserRole.OPERATOR };
                default: throw new Error("Invalid user role");
            }
          };
          const userProfile = mapDataToUser(data);
          setCurrentUser(userProfile);
          fetchInitialData(userProfile).finally(() => setLoading(false));
        }
      });
    } else {
      setLoading(false);
      setCurrentUser(null);
    }
  }, [session, fetchInitialData]);

  // Timer Countdown
  useEffect(() => {
    if (fightStatus === FightStatus.BETTING_OPEN && timer > 0) {
      const interval = setInterval(() => {
        setTimer(prev => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [fightStatus, timer]);

  // Supabase Realtime Subscriptions
  useEffect(() => {
    if (!supabase || !currentUser) return;

    // Listen to fight state changes
    const fightChannel = supabase.channel('current-fight-state')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'fights', filter: `id=eq.${fightId}`}, (payload) => {
            const updatedFight = payload.new as any;
            setFightStatus(updatedFight.status as FightStatus);
            setLastWinner(updatedFight.winner as FightWinner | null);
            if (updatedFight.status === 'BETTING_OPEN' && updatedFight.betting_ends_at) {
                const endTime = new Date(updatedFight.betting_ends_at).getTime();
                const now = new Date().getTime();
                setTimer(Math.max(0, Math.floor((endTime - now) / 1000)));
            }
             if (updatedFight.status === 'SETTLED' && fightStatus !== 'SETTLED') {
                 showNotification(`${updatedFight.winner} WINS!`, 'success');
                 fetchInitialData(currentUser); // Refresh data post-fight
            }
        }).subscribe();
    
    // Listen to profile changes for coin balances etc.
    const profileChannel = supabase.channel('all-profiles')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, payload => {
        const updatedProfile = payload.new as any;
        setAllUsers(prev => ({...prev, [updatedProfile.id]: {...prev[updatedProfile.id], ...updatedProfile, coinBalance: updatedProfile.coin_balance}}));
        if(updatedProfile.id === currentUser.id) {
            setCurrentUser(prev => prev ? ({...prev, coinBalance: updatedProfile.coin_balance, commissionBalance: updatedProfile.commission_balance}) : null);
        }
      }).subscribe();
      
    // Listen to upcoming fights
    const upcomingFightsChannel = supabase.channel('upcoming-fights')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'upcoming_fights' }, async () => {
            const { data } = await supabase.from('upcoming_fights').select('*').order('id', { ascending: true });
            setUpcomingFights(data?.map(f => ({id: f.id, participants: { red: f.red_participant, white: f.white_participant }})) || []);
        }).subscribe();

    // Listen to coin requests
    const requestsChannel = supabase.channel('coin-requests')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'coin_requests' }, async () => {
             if (currentUser.role === UserRole.AGENT) {
                const { data: requests } = await supabase.from('coin_requests').select('*').eq('to_user_id', currentUser.id).eq('status', 'PENDING');
                // FIX: Map snake_case properties to camelCase for the CoinRequest type.
                setCoinRequests(requests?.map(r => ({ id: r.id, fromUserId: r.from_user_id, toUserId: r.to_user_id, amount: r.amount, status: r.status, createdAt: r.created_at })) || []);
             } else if (currentUser.role === UserRole.MASTER_AGENT) {
                const { data: requests } = await supabase.rpc('get_agent_requests_for_master', { p_master_agent_id: currentUser.id });
                // FIX: Map snake_case properties to camelCase for the CoinRequest type.
                setCoinRequests(requests?.map(r => ({ id: r.id, fromUserId: r.from_user_id, toUserId: r.to_user_id, amount: r.amount, status: r.status, createdAt: r.created_at })) || []);
             }
        }).subscribe();
    
    return () => {
        supabase.removeChannel(fightChannel);
        supabase.removeChannel(profileChannel);
        supabase.removeChannel(upcomingFightsChannel);
        supabase.removeChannel(requestsChannel);
    };
  }, [currentUser, fightId, fightStatus, fetchInitialData]);

  // Bet/Pools update logic (could be real-time or periodic)
  useEffect(() => {
    if (!supabase || fightId === null) {
        setBettingPools({meron: 0, wala: 0});
        setLiveBets([]);
        setCurrentBet(null);
        return;
    };
    const fetchBetsForFight = async () => {
        const { data, error } = await supabase.from('bets').select('*').eq('fight_id', fightId);
        if (error) { console.error(error); return; }
        
        // FIX: Map snake_case properties to camelCase for Bet type before processing.
        const mappedBets: Bet[] = data.map(bet => ({
            id: bet.id,
            userId: bet.user_id,
            fightId: bet.fight_id,
            amount: bet.amount,
            choice: bet.choice
        }));
        
        let meron = 0, wala = 0;
        mappedBets.forEach(bet => {
            if (bet.choice === 'RED') meron += bet.amount;
            if (bet.choice === 'WHITE') wala += bet.amount;
        });

        setBettingPools({ meron, wala });
        setLiveBets(mappedBets);
        const userBet = mappedBets.find(b => b.userId === currentUser?.id);
        setCurrentBet(userBet ? userBet : null);
    };
    fetchBetsForFight();
  }, [fightId, currentUser?.id]);


  // --- Event Handlers ---
  const handleLogin = async (email: string, password: string) => {
    if (!supabase) return 'Supabase client not available.';
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? error.message : null;
  };

  const handleRegister = async (name: string, email: string, password: string, agentId: string) => {
    if (!supabase) return 'Supabase client not available.';
    const { error } = await supabase.rpc('handle_new_player', { name, email, password, agent_id: agentId });
    if(error) return error.message;
    showNotification('Registration successful! Please sign in.', 'success');
    return null;
  };
  
  const handleLogout = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setCurrentUser(null);
    setSession(null);
  };

  const handlePlaceBet = async (amount: number, choice: BetChoice) => {
    if (!supabase || !currentUser || fightId === null) return "Cannot place bet now.";
    const { error } = await supabase.from('bets').insert({
        user_id: currentUser.id,
        fight_id: fightId,
        amount,
        choice
    });
    if (error) {
        showNotification(error.message, 'error');
        return error.message;
    }
    showNotification('Bet placed successfully!', 'success');
    // Optimistic update
    setCurrentBet({ id: '', userId: currentUser.id, fightId, amount, choice });
    setBettingPools(prev => ({...prev, [choice === 'RED' ? 'meron' : 'wala']: prev[choice === 'RED' ? 'meron' : 'wala'] + amount}));
    return null;
  };
  
  const handleDeclareWinner = async (winner: FightWinner) => {
    if (!supabase || fightId === null) return;
    const { error } = await supabase.rpc('declare_winner', { p_fight_id: fightId, p_winner: winner });
    if (error) {
      showNotification(`Error: ${error.message}`, 'error');
    } else {
      showNotification('Winner declared and bets are being settled.', 'success');
    }
  };

  const handleAddUpcomingFight = async (red: string, white: string) => {
    if (!supabase) return "Supabase client not available.";
    const { error } = await supabase.from('upcoming_fights').insert({ red_participant: red, white_participant: white });
    if (error) {
        showNotification(error.message, 'error');
        return error.message;
    }
    showNotification('Fight added to the queue.', 'success');
    return null;
  }
  
  const handleStartNextFight = async () => {
      if (!supabase) return;
      const { error } = await supabase.rpc('start_next_fight');
      if (error) {
          showNotification(error.message, 'error');
      } else {
          showNotification('Next fight started!', 'success');
          // State will be updated by realtime subscription
      }
  };
  
  const handleCloseBetting = async () => {
      if (!supabase || !fightId) return;
      const { error } = await supabase.rpc('close_betting', { p_fight_id: fightId });
      if (error) {
          showNotification(error.message, 'error');
      } else {
          showNotification('Betting is now closed.', 'success');
      }
  };
  
  const handleRequestCoins = async (amount: number, targetUserId: string) => {
      if(!supabase || !currentUser) return "Not logged in.";
      const { error } = await supabase.from('coin_requests').insert({
          from_user_id: currentUser.id,
          to_user_id: targetUserId,
          amount,
          status: 'PENDING'
      });
      if(error) {
          showNotification(error.message, 'error');
          return error.message;
      }
      showNotification('Coin request sent.', 'success');
      return null;
  }
  
  const handleRespondToRequest = async (requestId: string, response: 'APPROVED' | 'DECLINED') => {
      if (!supabase) return "Supabase client not available.";
      const { error } = await supabase.rpc('respond_to_coin_request', { p_request_id: requestId, p_response: response });
      if(error) {
          showNotification(error.message, 'error');
          return error.message;
      }
      showNotification(`Request ${response.toLowerCase()}.`, 'success');
      return null;
  }

  const handleCreateUser = (role: UserRole.AGENT | UserRole.MASTER_AGENT | UserRole.OPERATOR) => async (name: string, email: string, password: string) => {
      if (!supabase || !currentUser || currentUser.role !== UserRole.MASTER_AGENT) return "Permission denied.";
      const { error } = await supabase.rpc('create_user_by_master_agent', {
          name, email, password, role, master_agent_id: currentUser.id
      });
       if(error) {
          showNotification(error.message, 'error');
          return error.message;
      }
      showNotification(`${role} created successfully.`, 'success');
      fetchAllUsers();
      return null;
  }

  const handleChangePassword = async (_old: string, newPass: string) => {
      if (!supabase) return "Not available.";
      const { error } = await supabase.auth.updateUser({ password: newPass });
      if(error) {
          showNotification(error.message, 'error');
          return error.message;
      }
      showNotification('Password updated successfully.', 'success');
      return null;
  };

  const handleStartChat = async (user: AllUserTypes) => {
     if(!supabase || !currentUser) return;
     setChatState({ isOpen: true, targetUser: user, messages: [] });
     const { data, error } = await supabase.rpc('get_messages', { user1_id: currentUser.id, user2_id: user.id });
     if (error) console.error("Error fetching messages", error);
     // FIX: Map snake_case properties to camelCase for the Message type.
     else setChatState(prev => ({...prev, messages: data?.map(m => ({
         id: m.id,
         senderId: m.sender_id,
         receiverId: m.receiver_id,
         text: m.text,
         createdAt: m.created_at,
     })) as Message[] || []}));
  };
  
  const handleSendMessage = async (text: string, amount: number) => {
      if (!supabase || !currentUser || !chatState.targetUser) return;
      const { error } = await supabase.rpc('send_message', {
          p_receiver_id: chatState.targetUser.id,
          p_text: text,
          p_coin_amount: amount
      });
      if(error) {
          showNotification(error.message, 'error');
      } else {
          // Optimistic update
          const newMessage: Message = {
              id: '', senderId: currentUser.id, receiverId: chatState.targetUser.id,
              text: `${text}${amount > 0 ? ` (Sent ${amount.toLocaleString()} coins)` : ''}`,
              createdAt: new Date().toISOString()
          };
          setChatState(prev => ({...prev, messages: [...prev.messages, newMessage]}));
      }
  };

  // --- Render Logic ---
  const renderUserView = () => {
    if (!currentUser) return <div className="text-center text-white">Loading user profile...</div>;

    switch (currentUser.role) {
      case UserRole.PLAYER:
        return <PlayerView
          currentUser={currentUser}
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
          onToggleDrawer={() => setDrawerOpen(!isDrawerOpen)}
          allUsers={allUsers}
          onStartChat={handleStartChat}
          liveBets={liveBets}
          />;
      case UserRole.AGENT:
          return <AgentView
              currentUser={currentUser}
              myPlayers={myPlayersOrAgents as Player[]}
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
              currentUser={currentUser}
              myAgents={myPlayersOrAgents as Agent[]}
              allUsers={allUsers}
              transactions={transactions}
              coinRequests={coinRequests}
              liveBets={liveBets}
              fightId={fightId}
              onRespondToRequest={handleRespondToRequest}
              onCreateAgent={handleCreateUser(UserRole.AGENT)}
              onCreateMasterAgent={handleCreateUser(UserRole.MASTER_AGENT)}
              onCreateOperator={handleCreateUser(UserRole.OPERATOR)}
              onStartChat={handleStartChat}
          />;
      case UserRole.OPERATOR:
        return <OperatorView
          currentUser={currentUser}
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
          onStartNextFight={handleStartNextFight}
          onCloseBetting={handleCloseBetting}
          />;
      default:
        return <div className="text-center text-white">Unknown user role.</div>;
    }
  };

  if (loading) {
    return <div className="h-screen bg-zinc-900 flex items-center justify-center text-white">Loading...</div>;
  }

  return (
    <>
      {!currentUser ? (
        <AuthView
          onLogin={handleLogin}
          onRegister={handleRegister}
          isSupabaseConfigured={isSupabaseConfigured}
          agents={agents}
        />
      ) : (
        <div className="flex flex-col h-screen">
          <Header
            currentUser={currentUser}
            onLogout={handleLogout}
            onSettings={() => setSettingsOpen(true)}
            onToggleDrawer={() => setDrawerOpen(!isDrawerOpen)}
          />
          <main className="flex-grow overflow-y-auto bg-zinc-900">
            {renderUserView()}
          </main>
        </div>
      )}
      {chatState.isOpen && chatState.targetUser && currentUser && (
          <ChatModal
            currentUser={currentUser}
            chatTargetUser={chatState.targetUser}
            messages={chatState.messages}
            onClose={() => setChatState({ isOpen: false, targetUser: null, messages: [] })}
            onSendMessage={handleSendMessage}
          />
      )}
      {notification && (
        <NotificationComponent
            message={notification.message}
            type={notification.type}
            onClose={() => setNotification(null)}
        />
      )}
       {isSettingsOpen && (
        <ChangePasswordModal
            onClose={() => setSettingsOpen(false)}
            onChangePassword={handleChangePassword}
        />
      )}
    </>
  );
};

export default App;
