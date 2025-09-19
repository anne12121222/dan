import React, { useState, useEffect, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './supabaseClient.ts';
import {
  UserRole,
  AllUserTypes,
  FightStatus,
  FightWinner,
  Bet,
  BetChoice,
  PlayerFightHistoryEntry,
  UpcomingFight,
  Transaction,
  Message,
  CoinRequest,
  Agent,
  Player,
  MasterAgent,
  FightResult,
  Operator
} from './types.ts';

// Component Imports
import AuthView from './components/AuthView.tsx';
import Header from './components/Header.tsx';
import PlayerView from './components/PlayerView.tsx';
import AgentView from './components/AgentView.tsx';
import MasterAgentView from './components/MasterAgentView.tsx';
import OperatorView from './components/OperatorView.tsx';
import ChatModal from './components/ChatModal.tsx';
import ChangePasswordModal from './components/ChangePasswordModal.tsx';
import NotificationComponent from './components/Notification.tsx';

type Notification = {
  id: number;
  message: string;
  type: 'success' | 'error';
};

const App: React.FC = () => {
  // Auth & User State
  const [session, setSession] = useState<Session | null>(null);
  const [currentUser, setCurrentUser] = useState<AllUserTypes | null>(null);
  const [loading, setLoading] = useState(true);

  // Global App State
  const [allUsers, setAllUsers] = useState<{ [id: string]: AllUserTypes }>({});
  const [agents, setAgents] = useState<Agent[]>([]);
  const [masterAgents, setMasterAgents] = useState<MasterAgent[]>([]);
  
  // Fight State
  const [fightId, setFightId] = useState<number | null>(null);
  const [fightStatus, setFightStatus] = useState<FightStatus>(FightStatus.SETTLED);
  const [bettingEndsAt, setBettingEndsAt] = useState<string | null>(null);
  const [timer, setTimer] = useState(0);
  const [lastWinner, setLastWinner] = useState<FightWinner | null>(null);
  const [bettingPools, setBettingPools] = useState({ meron: 0, wala: 0 });
  const [liveBets, setLiveBets] = useState<Bet[]>([]);
  const [currentBet, setCurrentBet] = useState<Bet | null>(null);

  // Data lists
  const [fightHistory, setFightHistory] = useState<PlayerFightHistoryEntry[]>([]);
  const [completedFights, setCompletedFights] = useState<FightResult[]>([]);
  const [upcomingFights, setUpcomingFights] = useState<UpcomingFight[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [coinRequests, setCoinRequests] = useState<CoinRequest[]>([]);
  
  // UI State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [chatTargetUser, setChatTargetUser] = useState<AllUserTypes | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [notification, setNotification] = useState<Notification | null>(null);

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ id: Date.now(), message, type });
  };
  
  const resetState = () => {
    setCurrentUser(null);
    setAllUsers({});
    setAgents([]);
    setMasterAgents([]);
    setFightId(null);
    setFightStatus(FightStatus.SETTLED);
    setBettingEndsAt(null);
    setTimer(0);
    setLastWinner(null);
    setBettingPools({ meron: 0, wala: 0 });
    setLiveBets([]);
    setCurrentBet(null);
    setFightHistory([]);
    setCompletedFights([]);
    setUpcomingFights([]);
    setTransactions([]);
    setCoinRequests([]);
    setIsDrawerOpen(false);
    setIsChangingPassword(false);
    setChatTargetUser(null);
    setMessages([]);
  };

  const fetchUserProfile = useCallback(async (user: User) => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (error) {
      console.error('Error fetching profile:', error);
      showNotification('Failed to fetch user profile.', 'error');
      setCurrentUser(null);
    } else if (data) {
      const userProfile = {
          id: data.id,
          name: data.name,
          email: data.email,
          role: data.role,
          coinBalance: data.coin_balance,
          agentId: data.agent_id,
          masterAgentId: data.master_agent_id,
          commissionBalance: data.commission_balance,
          commissionRate: data.commission_rate,
          transferFee: data.transfer_fee,
      };
      setCurrentUser(userProfile as AllUserTypes);
    }
    setLoading(false);
  }, []);

  const fetchUsers = useCallback(async () => {
    const { data, error } = await supabase.from('profiles').select('*');
    if (error) {
        console.error('Error fetching users:', error);
        return;
    }
    const usersMap: { [id: string]: AllUserTypes } = {};
    const agentsList: Agent[] = [];
    const masterAgentsList: MasterAgent[] = [];

    data.forEach((d: any) => {
        const user: AllUserTypes = {
            id: d.id,
            name: d.name,
            email: d.email,
            role: d.role,
            coinBalance: d.coin_balance,
            agentId: d.agent_id,
            masterAgentId: d.master_agent_id,
            commissionBalance: d.commission_balance,
            commissionRate: d.commission_rate,
            transferFee: d.transfer_fee,
        } as AllUserTypes;
        usersMap[d.id] = user;
        if (user.role === UserRole.AGENT) agentsList.push(user as Agent);
        if (user.role === UserRole.MASTER_AGENT) masterAgentsList.push(user as MasterAgent);
    });
    setAllUsers(usersMap);
    setAgents(agentsList);
    setMasterAgents(masterAgentsList);
  }, []);

  const fetchCurrentFightState = useCallback(async () => {
    const { data, error } = await supabase.from('fights').select('*').order('id', { ascending: false }).limit(1).single();
    if (error) {
        console.error('Could not fetch fight state', error);
        return;
    }
    if (data) {
      setFightId(data.id);
      setFightStatus(data.status as FightStatus);
      setBettingEndsAt(data.betting_ends_at);
      if(data.status === FightStatus.SETTLED) {
        setLastWinner(data.winner as FightWinner);
      } else {
        setLastWinner(null);
      }
    }
  }, []);

  const fetchBettingPools = useCallback(async (currentFightId: number) => {
    if (currentFightId === null) {
      setBettingPools({ meron: 0, wala: 0 });
      return;
    }
    const { data, error } = await supabase.rpc('get_betting_pools', { p_fight_id: currentFightId }).single();
    if (error) {
      console.error('Error fetching betting pools:', error);
    } else if (data) {
      setBettingPools({ meron: data.total_meron_bets, wala: data.total_wala_bets });
    }
  }, []);
  
  const fetchLiveBets = useCallback(async (currentFightId: number) => {
    if (currentFightId === null) {
        setLiveBets([]);
        return;
    }
    const { data, error } = await supabase.from('bets').select('*').eq('fight_id', currentFightId).order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching live bets:', error);
    } else {
      const formattedBets: Bet[] = data.map((bet: any) => ({
        id: bet.id,
        userId: bet.user_id,
        fightId: bet.fight_id,
        amount: bet.amount,
        choice: bet.choice,
      }));
      setLiveBets(formattedBets);
    }
  }, []);

  const fetchUpcomingFights = useCallback(async () => {
    const { data, error } = await supabase.from('upcoming_fights').select('*').order('id', { ascending: true });
    if (error) {
        console.error('Error fetching upcoming fights:', error);
    } else {
        setUpcomingFights(data.map(f => ({ id: f.id, participants: { red: f.red_participant, white: f.white_participant } })));
    }
  }, []);

  const fetchFightHistory = useCallback(async () => {
    if (!currentUser) return;
    if (currentUser.role === UserRole.PLAYER) {
        const { data, error } = await supabase.rpc('get_player_fight_history', { p_user_id: currentUser.id });
        if (error) console.error('Error fetching player fight history:', error);
        else setFightHistory(data as PlayerFightHistoryEntry[]);
    } else {
        const { data, error } = await supabase.from('fights').select('*').eq('status', FightStatus.SETTLED).order('id', { ascending: false }).limit(50);
        if (error) console.error('Error fetching completed fights:', error);
        else setCompletedFights(data.map(f => ({ id: f.id, winner: f.winner as FightWinner, commission: f.commission ?? 0 })));
    }
  }, [currentUser]);

  const fetchRoleSpecificData = useCallback(async () => {
    if (!currentUser) return;
    // Fetch transactions
    const { data: txData, error: txError } = await supabase.rpc('get_user_transactions', { p_user_id: currentUser.id });
    if (txError) console.error('Error fetching transactions:', txError);
    else setTransactions(txData.map((tx: any) => ({ ...tx, transactionTimestamp: tx.transaction_timestamp })) as Transaction[]);

    // Fetch coin requests
    let coinReqPromise;
    if (currentUser.role === UserRole.AGENT) {
        coinReqPromise = supabase.from('coin_requests').select('*').eq('to_user_id', currentUser.id);
    } else if (currentUser.role === UserRole.MASTER_AGENT) {
        coinReqPromise = supabase.rpc('get_agent_requests_for_master', { p_master_agent_id: currentUser.id });
    }
    if (coinReqPromise) {
        const { data, error } = await coinReqPromise;
        if (error) console.error('Error fetching coin requests:', error);
        else setCoinRequests(data.map((req: any) => ({ ...req, fromUserId: req.from_user_id, toUserId: req.to_user_id, createdAt: req.created_at })) as CoinRequest[]);
    }
  }, [currentUser]);

  const fetchInitialData = useCallback(async () => {
    await fetchUsers();
    await fetchCurrentFightState();
    await fetchUpcomingFights();
    await fetchFightHistory();
    await fetchRoleSpecificData();
  }, [fetchUsers, fetchCurrentFightState, fetchUpcomingFights, fetchFightHistory, fetchRoleSpecificData]);
  
  useEffect(() => {
    if (fightId !== null) {
      fetchBettingPools(fightId);
      fetchLiveBets(fightId);
      if (currentUser?.role === UserRole.PLAYER) {
          supabase.from('bets').select('*').eq('user_id', currentUser.id).eq('fight_id', fightId).single().then(({data}) => {
             setCurrentBet(data ? {
                id: data.id,
                userId: data.user_id,
                fightId: data.fight_id,
                amount: data.amount,
                choice: data.choice,
             } : null);
          });
      }
    } else {
        setBettingPools({ meron: 0, wala: 0 });
        setLiveBets([]);
        setCurrentBet(null);
    }
  }, [fightId, currentUser, fetchBettingPools, fetchLiveBets]);


  // Auth Management
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchUserProfile(session.user);
      } else {
        setLoading(false);
        fetchUsers(); // Fetch agents for registration page
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        if (!currentUser) fetchUserProfile(session.user);
      } else {
        resetState();
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchUserProfile, currentUser, fetchUsers]);


  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (bettingEndsAt && fightStatus === FightStatus.BETTING_OPEN) {
      interval = setInterval(() => {
        const ends = new Date(bettingEndsAt).getTime();
        const now = new Date().getTime();
        const diff = Math.round((ends - now) / 1000);
        setTimer(diff > 0 ? diff : 0);
        if (diff <= 0) {
          setFightStatus(FightStatus.BETTING_CLOSED);
        }
      }, 1000);
    } else {
      setTimer(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [bettingEndsAt, fightStatus]);


  // Supabase Subscriptions
  useEffect(() => {
    if (!currentUser) return;

    fetchInitialData();

    const handleFightUpdate = (payload: any) => {
      const fightData = payload.new;
      setFightId(fightData.id);
      setFightStatus(fightData.status);
      setBettingEndsAt(fightData.betting_ends_at);
      if (fightData.status === FightStatus.SETTLED) {
        setLastWinner(fightData.winner);
        // On settle, refresh user-specific data that might have changed
        fetchFightHistory();
        fetchRoleSpecificData();
      } else {
        setLastWinner(null);
      }
    };
    
    const handleProfileUpdate = (payload: any) => {
        const { id, coin_balance, commission_balance } = payload.new;
        if(currentUser.id === id) {
            setCurrentUser(prev => prev ? {...prev, coinBalance: coin_balance, commissionBalance: commission_balance} : null);
        }
        setAllUsers(prev => ({...prev, [id]: {...prev[id], coinBalance: coin_balance, commissionBalance: commission_balance}}));
    };

    const fightsChannel = supabase.channel('fights-channel').on('postgres_changes', { event: '*', schema: 'public', table: 'fights' }, handleFightUpdate).subscribe();
    const upcomingFightsChannel = supabase.channel('upcoming-fights-channel').on('postgres_changes', { event: '*', schema: 'public', table: 'upcoming_fights' }, fetchUpcomingFights).subscribe();
    const profilesChannel = supabase.channel('profiles-channel').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, handleProfileUpdate).subscribe();
    const coinRequestsChannel = supabase.channel('coin-requests-channel').on('postgres_changes', { event: '*', schema: 'public', table: 'coin_requests' }, fetchRoleSpecificData).subscribe();

    return () => {
      supabase.removeChannel(fightsChannel);
      supabase.removeChannel(upcomingFightsChannel);
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(coinRequestsChannel);
    };
  }, [currentUser, fetchInitialData, fetchUpcomingFights, fetchFightHistory, fetchRoleSpecificData]);


    // Handlers
  const handleLogin = async (email: string, password: string): Promise<string | null> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return error.message;
    return null;
  };
  
  const handleRegister = async (name: string, email: string, password: string, agentId: string): Promise<string | null> => {
     const { data, error } = await supabase.rpc('handle_new_player', {
        name, email, password, agent_id: agentId
     });
     if (error) return error.message;
     if (data) {
        showNotification("Registration successful! Please sign in.", "success");
        return null;
     }
     return "An unknown error occurred during registration.";
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) showNotification(error.message, 'error');
  };

  const handleChangePassword = async (_old: string, newPass: string): Promise<string | null> => {
    const { error } = await supabase.auth.updateUser({ password: newPass });
    if (error) {
        showNotification(error.message, 'error');
        return error.message;
    }
    showNotification("Password updated successfully!", "success");
    return null;
  };
  
  const handlePlaceBet = async (amount: number, choice: BetChoice): Promise<string | null> => {
    if (!fightId || !currentUser) return "Cannot place bet now.";
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
    showNotification("Bet placed successfully!", "success");
    return null;
  };

    const handleRequestCoins = async (amount: number, targetUserId: string): Promise<string | null> => {
        if (!currentUser) return "User not found.";
        const { error } = await supabase.from('coin_requests').insert({
            from_user_id: currentUser.id,
            to_user_id: targetUserId,
            amount,
        });
        if (error) {
            showNotification(error.message, 'error');
            return error.message;
        }
        showNotification("Coin request sent!", "success");
        return null;
    };
    
    const handleRespondToRequest = async (requestId: string, response: 'APPROVED' | 'DECLINED'): Promise<string | null> => {
        const { error } = await supabase.rpc('respond_to_coin_request', {
            p_request_id: requestId,
            p_response: response
        });
        if (error) {
            showNotification(error.message, 'error');
            return error.message;
        }
        showNotification(`Request has been ${response.toLowerCase()}.`, "success");
        return null;
    };
    
    const handleStartChat = async (user: AllUserTypes) => {
        if(!currentUser) return;
        setChatTargetUser(user);
        const { data, error } = await supabase.rpc('get_messages', {
            user1_id: currentUser.id,
            user2_id: user.id
        });
        if (error) {
            showNotification("Failed to load messages", 'error');
        } else {
            setMessages(data.map((m:any) => ({...m, senderId: m.sender_id, receiverId: m.receiver_id, createdAt: m.created_at })));
        }
    };

    const handleSendMessage = async (text: string, amount: number) => {
        if (!chatTargetUser || !currentUser) return;
        const { error } = await supabase.rpc('send_message', {
            p_receiver_id: chatTargetUser.id,
            p_text: text,
            p_coin_amount: amount,
        });
        if (error) showNotification(error.message, 'error');
    };

    const handleDeclareWinner = async (winner: 'RED' | 'WHITE' | 'DRAW' | 'CANCELLED') => {
        if (fightId === null) return;
        const { error } = await supabase.rpc('declare_winner', { p_fight_id: fightId, p_winner: winner });
        if (error) showNotification(error.message, 'error');
        else showNotification("Winner declared, settling bets...", 'success');
    };

    const handleAddUpcomingFight = async (red: string, white: string): Promise<string|null> => {
        const { error } = await supabase.from('upcoming_fights').insert({ red_participant: red, white_participant: white });
        if (error) {
            showNotification(error.message, 'error');
            return error.message;
        }
        showNotification("Fight added to queue!", 'success');
        return null;
    };

    const handleStartNextFight = async () => {
        const { error } = await supabase.rpc('start_next_fight');
        if (error) showNotification(error.message, 'error');
        else showNotification("Starting next fight!", 'success');
    };

    const handleCloseBetting = async () => {
        if (fightId === null) return;
        const { error } = await supabase.rpc('close_betting', { p_fight_id: fightId });
        if (error) showNotification(error.message, 'error');
        else showNotification("Betting is now closed.", 'success');
    };
    
    const createUserByMasterAgent = (role: UserRole) => async (name: string, email: string, password: string): Promise<string|null> => {
        if (!currentUser || currentUser.role !== UserRole.MASTER_AGENT) return "Permission denied";
        const { error } = await supabase.rpc('create_user_by_master_agent', {
            name, email, password, role, master_agent_id: currentUser.id
        });
        if (error) {
            showNotification(error.message, 'error');
            return error.message;
        }
        showNotification(`${role} created successfully!`, 'success');
        fetchUsers(); // Refresh user list
        return null;
    };

    // Render logic
  const renderView = () => {
    if (!isSupabaseConfigured) {
        return <AuthView onLogin={handleLogin} onRegister={handleRegister} isSupabaseConfigured={isSupabaseConfigured} agents={agents} />;
    }
    if (loading) {
      return <div className="flex items-center justify-center h-screen bg-zinc-900 text-white">Loading session...</div>;
    }
    if (!currentUser) {
      return <AuthView onLogin={handleLogin} onRegister={handleRegister} isSupabaseConfigured={isSupabaseConfigured} agents={agents} />;
    }

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
                    myPlayers={Object.values(allUsers).filter(u => u.role === UserRole.PLAYER && u.agentId === currentUser.id) as Player[]}
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
                    myAgents={Object.values(allUsers).filter(u => u.role === UserRole.AGENT && u.masterAgentId === currentUser.id) as Agent[]}
                    allUsers={allUsers}
                    transactions={transactions}
                    coinRequests={coinRequests}
                    liveBets={liveBets}
                    fightId={fightId}
                    onRespondToRequest={handleRespondToRequest}
                    onCreateAgent={createUserByMasterAgent(UserRole.AGENT)}
                    onCreateMasterAgent={createUserByMasterAgent(UserRole.MASTER_AGENT)}
                    onCreateOperator={createUserByMasterAgent(UserRole.OPERATOR)}
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
                    onStartNextFight={handleStartNextFight}
                    onCloseBetting={handleCloseBetting}
                />;
      default:
        return <div className="flex items-center justify-center h-screen bg-zinc-900 text-white">Invalid user role.</div>;
    }
  };

  return (
    <>
      {currentUser && <Header currentUser={currentUser} onLogout={handleLogout} onSettings={() => setIsChangingPassword(true)} onToggleDrawer={() => setIsDrawerOpen(!isDrawerOpen)} />}
      <main>
        {renderView()}
      </main>
      {notification && <NotificationComponent message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
      {isChangingPassword && <ChangePasswordModal onClose={() => setIsChangingPassword(false)} onChangePassword={handleChangePassword} />}
      {chatTargetUser && currentUser && <ChatModal 
          currentUser={currentUser}
          chatTargetUser={chatTargetUser}
          messages={messages}
          onClose={() => setChatTargetUser(null)}
          onSendMessage={handleSendMessage}
      />}
    </>
  );
};

export default App;
