

import React, { useState, useEffect, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './supabaseClient.ts';
import { AllUserTypes, UserRole, FightStatus, FightWinner, Bet, PlayerFightHistoryEntry, UpcomingFight, Agent, FightResult, MasterAgent, Operator, Player, Transaction, CoinRequest, Message, BetChoice } from './types.ts';
import { Database } from './database.types.ts';

import AuthView from './components/AuthView.tsx';
import PlayerView from './components/PlayerView.tsx';
import OperatorView from './components/OperatorView.tsx';
import AgentView from './components/AgentView.tsx';
import MasterAgentView from './components/MasterAgentView.tsx';
import Header from './components/Header.tsx';
import NotificationComponent from './components/Notification.tsx';
import ChangePasswordModal from './components/ChangePasswordModal.tsx';
import ChatModal from './components/ChatModal.tsx';

// Type Aliases for Supabase table rows
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type TransactionRow = Database["public"]["Tables"]["transactions"]["Row"];
type CoinRequestRow = Database["public"]["Tables"]["coin_requests"]["Row"];
type UpcomingFightRow = Database["public"]["Tables"]["upcoming_fights"]["Row"];
type FightRow = Database["public"]["Tables"]["fights"]["Row"];
type BetRow = Database["public"]["Tables"]["bets"]["Row"];
type MessageRow = Database["public"]["Tables"]["messages"]["Row"];

// Helper function to map Supabase profile to frontend user type
const mapProfileToUser = (profile: ProfileRow): AllUserTypes | null => {
    const { id, name, email, role, coin_balance, commission_balance, commission_rate, transfer_fee, agent_id, master_agent_id } = profile;
    const baseUser = { id, name, email, coinBalance: coin_balance };
    switch (role) {
        case UserRole.PLAYER: return { ...baseUser, role: UserRole.PLAYER, agentId: agent_id };
        case UserRole.AGENT: return { ...baseUser, role: UserRole.AGENT, masterAgentId: master_agent_id, commissionBalance: commission_balance, commissionRate: commission_rate, transferFee: transfer_fee };
        case UserRole.MASTER_AGENT: return { ...baseUser, role: UserRole.MASTER_AGENT, commissionBalance: commission_balance, commissionRate: commission_rate, transferFee: transfer_fee };
        case UserRole.OPERATOR: return { ...baseUser, role: UserRole.OPERATOR };
        default: return null;
    }
};

// Helper to map DB row to frontend type
const mapUpcomingFight = (row: UpcomingFightRow): UpcomingFight => ({
    id: row.id,
    participants: row.participants as { red: string; white: string; }
});

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [currentUser, setCurrentUser] = useState<AllUserTypes | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  
  const [agents, setAgents] = useState<Agent[]>([]);
  const [masterAgents, setMasterAgents] = useState<MasterAgent[]>([]);
  const [myAgents, setMyAgents] = useState<Agent[]>([]);
  const [myPlayers, setMyPlayers] = useState<Player[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [coinRequests, setCoinRequests] = useState<CoinRequest[]>([]);
  const [allUsers, setAllUsers] = useState<{ [id: string]: AllUserTypes }>({});
  
  const [activeFight, setActiveFight] = useState<FightRow | null>(null);
  const [lastWinner, setLastWinner] = useState<FightWinner | null>(null);
  const [timer, setTimer] = useState(0);
  const [bettingPools, setBettingPools] = useState({ meron: 0, wala: 0 });
  const [currentBet, setCurrentBet] = useState<Bet | null>(null);
  const [liveBets, setLiveBets] = useState<Bet[]>([]);
  const [upcomingFights, setUpcomingFights] = useState<UpcomingFight[]>([]);
  const [completedFights, setCompletedFights] = useState<FightResult[]>([]);
  const [fightHistory, setFightHistory] = useState<PlayerFightHistoryEntry[]>([]);
  
  const [chatTargetUser, setChatTargetUser] = useState<AllUserTypes | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
  };

  const fetchAllData = useCallback(async (user: AllUserTypes) => {
    if (!supabase) return;
    setLoading(true);
    
    // Universal data
    const { data: profilesData } = await supabase.from('profiles').select('*');
    if (profilesData) {
        const userMap: { [id: string]: AllUserTypes } = {};
        // FIX: Add explicit type cast to resolve 'never' type inference issue.
        (profilesData as ProfileRow[]).forEach(p => {
            const mappedUser = mapProfileToUser(p);
            if (mappedUser) userMap[p.id] = mappedUser;
        });
        setAllUsers(userMap);
        // FIX: Add explicit type cast to resolve 'never' type inference issue.
        setAgents((profilesData as ProfileRow[]).filter(p => p.role === 'AGENT').map(p => mapProfileToUser(p) as Agent));
        setMasterAgents((profilesData as ProfileRow[]).filter(p => p.role === 'MASTER_AGENT').map(p => mapProfileToUser(p) as MasterAgent));
    }

    const { data: transactionData } = await supabase.from('transactions').select('*').order('transaction_timestamp', { ascending: false });
    // FIX: Add explicit type cast to resolve 'never' type inference issue.
    if (transactionData) setTransactions((transactionData as TransactionRow[]).map(t => ({...t, transactionTimestamp: t.transaction_timestamp, fromUserId: t.from_user_id, toUserId: t.to_user_id})));
    
    const { data: coinRequestData } = await supabase.from('coin_requests').select('*').order('created_at', { ascending: false });
    // FIX: Add explicit type cast to resolve 'never' type inference issue.
    if (coinRequestData) setCoinRequests((coinRequestData as CoinRequestRow[]).map(cr => ({...cr, fromUserId: cr.from_user_id, toUserId: cr.to_user_id, createdAt: cr.created_at })));

    if (user.role === UserRole.AGENT) {
        const { data: players } = await supabase.from('profiles').select('*').eq('agent_id', user.id);
        if (players) setMyPlayers((players as ProfileRow[]).map(p => mapProfileToUser(p) as Player));
    }
    if (user.role === UserRole.MASTER_AGENT) {
        const { data: agents } = await supabase.from('profiles').select('*').eq('master_agent_id', user.id);
        if (agents) setMyAgents((agents as ProfileRow[]).map(p => mapProfileToUser(p) as Agent));
    }
    
    setLoading(false);
  }, []);

  const fetchFightData = useCallback(async (user: AllUserTypes | null) => {
    if (!supabase) return;

    // Fetch active fight and related data
    const { data: fightData } = await supabase.from('fights').select('*').in('status', ['BETTING_OPEN', 'BETTING_CLOSED']).maybeSingle();
    setActiveFight(fightData as FightRow | null);

    if (fightData) {
        const { data: betsData } = await supabase.from('bets').select('*').eq('fight_id', fightData.id);
        if (betsData) {
            // FIX: Add explicit type cast to resolve 'never' type inference issue.
            const typedBetsData = betsData as BetRow[];
            const meron = typedBetsData.filter(b => b.choice === 'RED').reduce((sum, b) => sum + b.amount, 0);
            const wala = typedBetsData.filter(b => b.choice === 'WHITE').reduce((sum, b) => sum + b.amount, 0);
            setBettingPools({ meron, wala });
            setLiveBets(typedBetsData.map(b => ({...b, userId: b.user_id, fightId: b.fight_id})));
            if (user) {
                const myBet = typedBetsData.find(b => b.user_id === user.id);
                if (myBet) setCurrentBet({...myBet, userId: myBet.user_id, fightId: myBet.fight_id});
                else setCurrentBet(null);
            }
        }
    } else {
        setBettingPools({ meron: 0, wala: 0 });
        setLiveBets([]);
        setCurrentBet(null);
    }

    // Fetch static/historical data
    const { data: upcomingData } = await supabase.from('upcoming_fights').select('*').order('id', { ascending: true });
    // FIX: Add explicit type cast to resolve 'never' type inference issue.
    if (upcomingData) setUpcomingFights((upcomingData as UpcomingFightRow[]).map(mapUpcomingFight));

    const { data: completedData } = await supabase.from('fights').select('*').eq('status', 'SETTLED').order('id', { ascending: false }).limit(50);
    if (completedData) {
        // FIX: Add explicit type cast to resolve 'never' type inference issue.
        const typedCompletedData = completedData as FightRow[];
        setCompletedFights(typedCompletedData);
        setLastWinner(typedCompletedData[0]?.winner || null);
        if (user) {
            const { data: myBetsHistoryData } = await supabase.from('bets').select('*').in('fight_id', typedCompletedData.map(f => f.id));
            if (myBetsHistoryData) {
                // FIX: Add explicit type cast to resolve 'never' type inference issue.
                const myBetsHistory = myBetsHistoryData as BetRow[];
                const history: PlayerFightHistoryEntry[] = typedCompletedData.map(fight => {
                    const bet = myBetsHistory.find(b => b.fight_id === fight.id && b.user_id === user.id);
                    let outcome: PlayerFightHistoryEntry['outcome'] = null;
                    if (bet) {
                        if (fight.winner === 'DRAW' || fight.winner === 'CANCELLED') outcome = 'REFUND';
                        else if (bet.choice === fight.winner) outcome = 'WIN';
                        else outcome = 'LOSS';
                    }
                    return { id: fight.id, winner: fight.winner!, commission: fight.commission, bet: bet ? {...bet, userId: bet.user_id, fightId: bet.fight_id} : null, outcome };
                });
                setFightHistory(history);
            }
        }
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      const fetchUserAndData = async () => {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        if (profile) {
          const user = mapProfileToUser(profile as ProfileRow);
          setCurrentUser(user);
          if (user) {
            await fetchAllData(user);
            await fetchFightData(user);
          }
        } else {
          setCurrentUser(null);
          setLoading(false);
        }
      };
      fetchUserAndData();
    } else {
      setCurrentUser(null);
    }
  }, [session, fetchAllData, fetchFightData]);

  useEffect(() => {
    if (!currentUser || !supabase) return;

    const channel = supabase.channel(`public-data-channel`);

    const fightSubscription = { event: '*', schema: 'public', table: 'fights' } as const;
    const coinRequestSubscription = { event: 'INSERT', schema: 'public', table: 'coin_requests' } as const;
    const transactionSubscription = { event: 'INSERT', schema: 'public', table: 'transactions' } as const;
    const upcomingFightsSubscription = { event: '*', schema: 'public', table: 'upcoming_fights' } as const;
    const messagesSubscription = { event: 'INSERT', schema: 'public', table: 'messages' } as const;

    channel
      .on('postgres_changes', fightSubscription, () => fetchFightData(currentUser))
      .on('postgres_changes', coinRequestSubscription, () => fetchAllData(currentUser))
      .on('postgres_changes', transactionSubscription, () => fetchAllData(currentUser))
      .on('postgres_changes', upcomingFightsSubscription, () => fetchFightData(currentUser))
      .on('postgres_changes', messagesSubscription, (payload) => {
          const newMessage = payload.new as MessageRow;
          if (chatTargetUser && (newMessage.sender_id === chatTargetUser.id || newMessage.receiver_id === chatTargetUser.id)) {
               setMessages(prev => [...prev, { id: newMessage.id, senderId: newMessage.sender_id, receiverId: newMessage.receiver_id, text: newMessage.text, createdAt: newMessage.created_at }]);
          }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser, fetchAllData, fetchFightData, chatTargetUser]);
  
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (activeFight && activeFight.status === 'BETTING_OPEN') {
        const createdAt = new Date(activeFight.created_at).getTime();
        const now = new Date().getTime();
        const elapsed = Math.floor((now - createdAt) / 1000);
        const initialTimer = 15 - elapsed;
        setTimer(initialTimer > 0 ? initialTimer : 0);

        interval = setInterval(() => {
            setTimer(prev => (prev > 0 ? prev - 1 : 0));
        }, 1000);
    } else {
        setTimer(0);
    }
    return () => {
        if (interval) clearInterval(interval);
    };
  }, [activeFight]);

  const handleLogin = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? error.message : null;
  };
  const handleRegister = async (name: string, email: string, password: string, agentId: string) => {
    const { error } = await supabase.auth.signUp({ email, password, options: { data: { name, agent_id: agentId } } });
    return error ? error.message : null;
  };
  const handleLogout = () => supabase.auth.signOut();
  const handleChangePassword = async (_: string, newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (!error) showNotification('Password updated successfully!', 'success');
    return error ? error.message : null;
  };
  
  // FIX: Refactor handlers to use async/await and add guards for supabase client to fix type inference issues.
  const handleCreateAgent = async (name: string, email: string, password: string): Promise<string | null> => {
    if (!supabase || !currentUser) return "Client not ready";
    const { data, error } = await supabase.rpc('create_agent_user', { p_name: name, p_email: email, p_password: password });
    if (data?.includes('Success')) {
      showNotification('Agent created!', 'success');
      fetchAllData(currentUser);
    }
    return error ? error.message : (data || null);
  };
  const handleCreateMasterAgent = async (name: string, email: string, password: string): Promise<string | null> => {
    if (!supabase) return "Client not ready";
    const { data, error } = await supabase.rpc('create_master_agent_user', { p_name: name, p_email: email, p_password: password });
    if (data?.includes('Success')) showNotification('Master Agent created!', 'success');
    return error ? error.message : (data || null);
  };
  const handleCreateOperator = async (name: string, email: string, password: string): Promise<string | null> => {
    if (!supabase) return "Client not ready";
    const { data, error } = await supabase.rpc('create_operator_user', { p_name: name, p_email: email, p_password: password });
    if (data?.includes('Success')) showNotification('Operator created!', 'success');
    return error ? error.message : (data || null);
  };
  
  const handlePlaceBet = async (amount: number, choice: BetChoice): Promise<string | null> => {
    if (!supabase || !activeFight) return "Client not ready or no active fight";
    const { data, error } = await supabase.rpc('place_bet', { p_fight_id: activeFight.id, p_amount: amount, p_choice: choice });
    if (data?.includes('Success')) showNotification('Bet placed!', 'success');
    return error ? error.message : (data || null);
  };
  const handleCreateCoinRequest = async (amount: number, targetUserId: string): Promise<string | null> => {
    if (!supabase) return "Client not ready";
    const { error } = await supabase.rpc('create_coin_request', { p_to_user_id: targetUserId, p_amount: amount });
    if (!error) showNotification('Request sent!', 'success');
    return error ? error.message : null;
  };
  const handleRespondToRequest = async (requestId: string, response: 'APPROVED' | 'DECLINED'): Promise<string | null> => {
    if (!supabase) return "Client not ready";
    const { data, error } = await supabase.rpc('respond_to_coin_request', { p_request_id: requestId, p_response: response });
    if (data?.includes('Success')) showNotification(`Request ${response.toLowerCase()}!`, 'success');
    return error ? error.message : (data || null);
  };
  
  const handleSendMessage = async (text: string, amount: number) => {
      if (!chatTargetUser || !supabase || !currentUser) return;
      await supabase.rpc('send_message_and_coins', { p_receiver_id: chatTargetUser.id, p_text: text, p_amount: amount });
      if (text) { // Optimistic update for sender
           setMessages(prev => [...prev, { id: 'temp-'+Date.now(), senderId: currentUser.id, receiverId: chatTargetUser.id, text, createdAt: new Date().toISOString() }]);
      }
      if (amount > 0) await fetchAllData(currentUser);
  };
  
  const handleAddUpcomingFight = async (red: string, white: string) => {
    if (!supabase) return "Supabase client not available";
    const { data, error } = await supabase.rpc('add_upcoming_fight', {
        p_red_text: red,
        p_white_text: white
    });
    if (error) {
        console.error("Error adding upcoming fight:", error);
        return `Error: ${error.message}`;
    }
    // FIX: Add explicit type cast to resolve 'never' type inference issue.
    const newFights = data as UpcomingFightRow[] | null;
    if (newFights && newFights.length > 0) {
        setUpcomingFights(prev => [...prev, mapUpcomingFight(newFights[0])]);
        showNotification("Fight added to queue!", "success");
    }
    return null;
  };
  
  const handleStartNextFight = () => {
    if (!supabase) return;
    supabase.rpc('start_next_fight');
  };
  const handleCloseBetting = () => {
    if (!supabase || !activeFight) return;
    supabase.rpc('close_betting', { p_fight_id: activeFight.id });
  };
  const handleDeclareWinner = (winner: FightWinner) => {
    if (!supabase || !activeFight) return;
    supabase.rpc('declare_winner', { p_fight_id: activeFight.id, p_winner_text: winner });
  };

  const handleStartChat = async (user: AllUserTypes) => {
      if (!supabase) return;
      setMessages([]); // Clear previous messages
      setChatTargetUser(user);
      const { data } = await supabase.rpc('get_messages', { p_contact_id: user.id });
      if (data) setMessages(data as Message[]);
  };

  const renderContent = () => {
    if (loading || !currentUser) return <div className="flex items-center justify-center h-screen bg-zinc-900 text-white">Loading...</div>;

    switch (currentUser.role) {
      case UserRole.PLAYER:
        return <PlayerView currentUser={currentUser} agents={agents} fightStatus={activeFight?.status as FightStatus || FightStatus.SETTLED} lastWinner={lastWinner} fightId={activeFight?.id || null} timer={timer} bettingPools={bettingPools} currentBet={currentBet} onPlaceBet={handlePlaceBet} fightHistory={fightHistory} upcomingFights={upcomingFights} onRequestCoins={handleCreateCoinRequest} isDrawerOpen={isDrawerOpen} onToggleDrawer={() => setDrawerOpen(!isDrawerOpen)} allUsers={allUsers} onStartChat={handleStartChat} liveBets={liveBets} />;
      case UserRole.OPERATOR:
        return <OperatorView currentUser={currentUser} fightStatus={activeFight?.status as FightStatus || FightStatus.SETTLED} lastWinner={lastWinner} fightId={activeFight?.id || null} timer={timer} bettingPools={bettingPools} liveBets={liveBets} upcomingFights={upcomingFights} completedFights={completedFights} allUsers={allUsers} onDeclareWinner={handleDeclareWinner} onAddUpcomingFight={handleAddUpcomingFight} onStartNextFight={handleStartNextFight} onCloseBetting={handleCloseBetting} />;
      case UserRole.AGENT:
        return <AgentView currentUser={currentUser} myPlayers={myPlayers} allUsers={allUsers} transactions={transactions} coinRequests={coinRequests} masterAgents={masterAgents} onRespondToRequest={handleRespondToRequest} onRequestCoins={handleCreateCoinRequest} onStartChat={handleStartChat} liveBets={liveBets} fightId={activeFight?.id || null} />;
      case UserRole.MASTER_AGENT:
          return <MasterAgentView currentUser={currentUser} myAgents={myAgents} allUsers={allUsers} transactions={transactions} coinRequests={coinRequests} onRespondToRequest={handleRespondToRequest} onCreateAgent={handleCreateAgent} onCreateMasterAgent={handleCreateMasterAgent} onCreateOperator={handleCreateOperator} onStartChat={handleStartChat} liveBets={liveBets} fightId={activeFight?.id || null} />;
      default:
        return <div>Invalid user role.</div>;
    }
  };

  if (!session) {
    return <AuthView onLogin={handleLogin} onRegister={handleRegister} isSupabaseConfigured={isSupabaseConfigured} agents={agents} />;
  }

  return (
    <div className="bg-zinc-900">
      {currentUser && <Header currentUser={currentUser} onLogout={handleLogout} onSettings={() => setShowSettings(true)} onToggleDrawer={() => setDrawerOpen(!isDrawerOpen)} />}
      <main>
        {renderContent()}
      </main>
      {notification && <NotificationComponent message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
      {showSettings && <ChangePasswordModal onClose={() => setShowSettings(false)} onChangePassword={handleChangePassword} />}
      {chatTargetUser && <ChatModal currentUser={currentUser!} chatTargetUser={chatTargetUser} messages={messages} onClose={() => setChatTargetUser(null)} onSendMessage={handleSendMessage} />}
    </div>
  );
};

export default App;