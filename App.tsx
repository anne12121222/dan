
import React, { useState, useEffect, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import {
  AllUserTypes, UserRole, FightStatus, Bet, FightWinner, PlayerFightHistoryEntry, UpcomingFight, BetChoice,
  Transaction, Message, CoinRequest, Agent, MasterAgent, Player, FightResult, Operator
} from './types';
import { Database } from './database.types';

// Component Imports
import AuthView from './components/AuthView';
import PlayerView from './components/PlayerView';
import AgentView from './components/AgentView';
import MasterAgentView from './components/MasterAgentView';
import OperatorView from './components/OperatorView';
import Header from './components/Header';
import ChatModal from './components/ChatModal';
import NotificationComponent from './components/Notification';
import ChangePasswordModal from './components/ChangePasswordModal';


// Type aliases for Supabase row types
type Profile = Database['public']['Tables']['profiles']['Row'];
type Fight = Database['public']['Tables']['fights']['Row'];
type DbUpcomingFight = Database['public']['Tables']['upcoming_fights']['Row'];
type DbBet = Database['public']['Tables']['bets']['Row'];

// Helper function to map Supabase profile rows to application user types
const mapProfileToUser = (p: Profile): AllUserTypes => {
  const baseUser = {
    id: p.id,
    name: p.name,
    email: p.email,
    role: p.role as UserRole,
    coinBalance: p.coin_balance,
  };
  switch (p.role) {
    case 'PLAYER':
      return { ...baseUser, role: UserRole.PLAYER, agentId: p.agent_id } as Player;
    case 'AGENT':
      return { ...baseUser, role: UserRole.AGENT, masterAgentId: p.master_agent_id, commissionBalance: p.commission_balance, commissionRate: p.commission_rate, transferFee: p.transfer_fee } as Agent;
    case 'MASTER_AGENT':
      return { ...baseUser, role: UserRole.MASTER_AGENT, commissionBalance: p.commission_balance, commissionRate: p.commission_rate, transferFee: p.transfer_fee } as MasterAgent;
    case 'OPERATOR':
      return { ...baseUser, role: UserRole.OPERATOR } as Operator;
    default:
      // This case should ideally not be reached with valid data
      throw new Error(`Unknown user role encountered: ${p.role}`);
  }
};

// Helper function to map Supabase fight rows to the FightResult type
const mapFightRowToResult = (f: Fight): FightResult => ({
  id: f.id,
  winner: f.winner as FightWinner,
  commission: f.commission,
});

const App: React.FC = () => {
  // State declarations
  const [currentUser, setCurrentUser] = useState<AllUserTypes | null>(null);
  const [loading, setLoading] = useState(true);
  const [allUsers, setAllUsers] = useState<{ [id: string]: AllUserTypes }>({});
  const [fightStatus, setFightStatus] = useState<FightStatus>(FightStatus.SETTLED);
  const [lastWinner, setLastWinner] = useState<FightWinner | null>(null);
  const [fightId, setFightId] = useState<number | null>(null);
  const [timer, setTimer] = useState(0);
  const [bettingPools, setBettingPools] = useState({ meron: 0, wala: 0 });
  const [upcomingFights, setUpcomingFights] = useState<UpcomingFight[]>([]);
  const [completedFights, setCompletedFights] = useState<FightResult[]>([]);
  const [liveBets, setLiveBets] = useState<Bet[]>([]);
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [currentBet, setCurrentBet] = useState<Bet | null>(null);
  const [fightHistory, setFightHistory] = useState<PlayerFightHistoryEntry[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [coinRequests, setCoinRequests] = useState<CoinRequest[]>([]);
  const [myPlayers, setMyPlayers] = useState<Player[]>([]);
  const [myAgents, setMyAgents] = useState<Agent[]>([]);
  const [agentsForRegistration, setAgentsForRegistration] = useState<Agent[]>([]);
  const [masterAgents, setMasterAgents] = useState<MasterAgent[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [chatTargetUser, setChatTargetUser] = useState<AllUserTypes | null>(null);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Utility to show notifications
  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
  };

  // Main data fetching function
  const fetchFullGameState = useCallback(async (user: AllUserTypes | null) => {
    if (!supabase) return;

    // Fetch all users for lookups and registration lists
    const { data: profiles } = await supabase.from('profiles').select('*');
    if (profiles) {
      const usersMap: { [id: string]: AllUserTypes } = {};
      profiles.forEach(p => { usersMap[p.id] = mapProfileToUser(p) });
      setAllUsers(usersMap);
      setAgentsForRegistration(profiles.filter(p => p.role === 'AGENT').map(p => mapProfileToUser(p) as Agent));
      setMasterAgents(profiles.filter(p => p.role === 'MASTER_AGENT').map(p => mapProfileToUser(p) as MasterAgent));
    }
    
    // Fetch current fight state and bets
    const { data: currentFight } = await supabase.from('fights').select('*, bets(*)').in('status', ['BETTING_OPEN', 'BETTING_CLOSED']).limit(1).single();
    if (currentFight) {
        setFightId(currentFight.id);
        setFightStatus(currentFight.status as FightStatus);
        const bets: DbBet[] = (currentFight.bets as any) || [];
        setLiveBets(bets.map(b => ({id: b.id, userId: b.user_id, fightId: b.fight_id, amount: b.amount, choice: b.choice})));
        const pools = bets.reduce((acc, bet) => {
            if (bet.choice === 'RED') acc.meron += bet.amount;
            if (bet.choice === 'WHITE') acc.wala += bet.amount;
            return acc;
        }, { meron: 0, wala: 0 });
        setBettingPools(pools);
        if(user) {
            const userBet = bets.find(b => b.user_id === user.id);
            setCurrentBet(userBet ? {id: userBet.id, userId: userBet.user_id, fightId: userBet.fight_id, amount: userBet.amount, choice: userBet.choice} : null);
        }
    } else {
        setFightStatus(FightStatus.SETTLED);
        setLiveBets([]);
        setBettingPools({ meron: 0, wala: 0 });
        setCurrentBet(null);
        const { data: lastFight } = await supabase.from('fights').select('*').order('id', { ascending: false }).limit(1).single();
        if(lastFight) {
            setFightId(lastFight.id);
            setLastWinner(lastFight.winner as FightWinner);
        }
    }

    // Fetch upcoming and completed fights
    const { data: upcoming } = await supabase.from('upcoming_fights').select('*').order('id', { ascending: true });
    if (upcoming) setUpcomingFights(upcoming.map((f: DbUpcomingFight) => ({ id: f.id, participants: f.participants as any })));

    const { data: completed } = await supabase.from('fights').select('*').eq('status', 'SETTLED').order('id', { ascending: false }).limit(50);
    if (completed) setCompletedFights(completed.map(mapFightRowToResult));
    
    // Fetch user-specific data
    if (user) {
        switch (user.role) {
            case UserRole.PLAYER:
                const { data: playerHistory } = await supabase.rpc('get_player_fight_history');
                if (playerHistory) setFightHistory(playerHistory as any);
                break;
            case UserRole.AGENT:
                const {data: players} = await supabase.from('profiles').select('*').eq('agent_id', user.id);
                if(players) setMyPlayers(players.map(p => mapProfileToUser(p) as Player));
                break;
            case UserRole.MASTER_AGENT:
                const {data: agents} = await supabase.from('profiles').select('*').eq('master_agent_id', user.id);
                if(agents) setMyAgents(agents.map(p => mapProfileToUser(p) as Agent));
                break;
        }

        const { data: txns } = await supabase.rpc('get_my_transactions');
        if (txns) setTransactions(txns as any);

        const { data: requests } = await supabase.rpc('get_my_coin_requests');
        if (requests) setCoinRequests(requests as any);
    }
  }, []);

  // Handlers for RPC calls
  const handleLogin = async (email: string, password: string) => { if(!supabase) return "Client not configured."; const { error } = await supabase.auth.signInWithPassword({ email, password }); return error ? error.message : null; };
  const handleRegister = async (name: string, email: string, password: string, agentId: string) => { if(!supabase) return "Client not configured."; const { error } = await supabase.auth.signUp({ email, password, options: { data: { name, agent_id: agentId } } }); return error ? error.message : null; };
  const handleLogout = async () => { if(!supabase) return; setCurrentUser(null); await supabase.auth.signOut(); };
  const handleChangePassword = async (_old: string, newPass: string) => { if (!supabase) return "Client not configured."; const { error } = await supabase.auth.updateUser({ password: newPass }); if(error) { showNotification(error.message, 'error'); return error.message; } showNotification("Password updated successfully!", 'success'); return null; };
  const handlePlaceBet = async (amount: number, choice: BetChoice) => { if (!supabase || !fightId) return "Game is not active."; const { data, error } = await supabase.rpc('place_bet', { p_fight_id: fightId, p_amount: amount, p_choice: choice }); if (error) { showNotification(error.message, 'error'); return error.message; } if (data) showNotification(data, 'success'); return null; };
  const onDeclareWinner = async (winner: FightWinner) => { if (!supabase || !fightId) return; const { error } = await supabase.rpc('declare_winner', { p_fight_id: fightId, p_winner_text: winner }); if (error) showNotification(error.message, 'error'); else showNotification("Winner declared!", 'success'); };
  const onAddUpcomingFight = async (red: string, white: string) => { if (!supabase) return "Client not configured."; const { data, error } = await supabase.rpc('add_upcoming_fight', { p_red_text: red, p_white_text: white }); if (error) { showNotification(error.message, 'error'); return error.message; } showNotification("Fight added to queue!", 'success'); return null; };
  const onStartNextFight = async () => { if (!supabase) return; const { error } = await supabase.rpc('start_next_fight'); if (error) showNotification(error.message, 'error'); };
  const onCloseBetting = async () => { if (!supabase || !fightId) return; const { error } = await supabase.rpc('close_betting', { p_fight_id: fightId }); if (error) showNotification(error.message, 'error'); };
  const onRequestCoins = async (amount: number, targetUserId: string) => { if (!supabase) return "Client not configured."; const { error } = await supabase.rpc('create_coin_request', { p_amount: amount, p_to_user_id: targetUserId }); if (error) { showNotification(error.message, 'error'); return error.message; } showNotification("Coin request sent!", 'success'); return null; };
  const onRespondToRequest = async (requestId: string, response: 'APPROVED' | 'DECLINED') => { if (!supabase) return "Client not configured."; const { data, error } = await supabase.rpc('respond_to_coin_request', { p_request_id: requestId, p_response: response }); if (error) { showNotification(error.message, 'error'); return error.message; } showNotification(data, 'success'); return null; };
  const onCreateAgent = async (name: string, email: string, password: string) => { if (!supabase) return "Client not configured."; const { data, error } = await supabase.rpc('create_agent_user', { p_name: name, p_email: email, p_password: password }); if (error) { showNotification(error.message, 'error'); return error.message; } showNotification(data, 'success'); return null; };
  const onCreateMasterAgent = async (name: string, email: string, password: string) => { if (!supabase) return "Client not configured."; const { data, error } = await supabase.rpc('create_master_agent_user', { p_name: name, p_email: email, p_password: password }); if (error) { showNotification(error.message, 'error'); return error.message; } showNotification(data, 'success'); return null; };
  const onCreateOperator = async (name: string, email: string, password: string) => { if (!supabase) return "Client not configured."; const { data, error } = await supabase.rpc('create_operator_user', { p_name: name, p_email: email, p_password: password }); if (error) { showNotification(error.message, 'error'); return error.message; } showNotification(data, 'success'); return null; };
  const onStartChat = async (targetUser: AllUserTypes) => { setChatTargetUser(targetUser); if (!supabase) return; const { data } = await supabase.rpc('get_messages', { p_contact_id: targetUser.id }); if (data) setChatMessages(data as any); };
  const onSendMessage = async (text: string, amount: number) => { if(!supabase || !chatTargetUser) return; await supabase.rpc('send_message_and_coins', { p_receiver_id: chatTargetUser.id, p_text: text, p_amount: amount}); };

  // Auth effect to check session on load and listen for changes
  useEffect(() => {
    const handleAuthChange = async (session: Session | null) => {
        setLoading(true);
        if (session?.user) {
            const { data: profile } = await supabase!.from('profiles').select('*').eq('id', session.user.id).single();
            const user = profile ? mapProfileToUser(profile) : null;
            setCurrentUser(user);
            await fetchFullGameState(user);
        } else {
            setCurrentUser(null);
            await fetchFullGameState(null);
        }
        setLoading(false);
    };

    if (isSupabaseConfigured && supabase) {
        supabase.auth.getSession().then(({ data: { session } }) => handleAuthChange(session));
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => handleAuthChange(session));
        return () => subscription.unsubscribe();
    } else {
        setLoading(false);
    }
  }, [fetchFullGameState]);

  // Real-time subscriptions effect
  useEffect(() => {
    if (!supabase) return;
    const channels = [
        supabase.channel('public:fights').on('postgres_changes', { event: '*', schema: 'public', table: 'fights' }, () => fetchFullGameState(currentUser)).subscribe(),
        supabase.channel('public:profiles').on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchFullGameState(currentUser)).subscribe(),
        supabase.channel('public:upcoming_fights').on('postgres_changes', { event: '*', schema: 'public', table: 'upcoming_fights' }, () => fetchFullGameState(currentUser)).subscribe(),
        supabase.channel('public:transactions').on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => fetchFullGameState(currentUser)).subscribe(),
        supabase.channel('public:coin_requests').on('postgres_changes', { event: '*', schema: 'public', table: 'coin_requests' }, () => fetchFullGameState(currentUser)).subscribe(),
        supabase.channel('public:messages').on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload) => { if (chatTargetUser) onStartChat(chatTargetUser); }).subscribe()
    ];
    return () => { channels.forEach(c => supabase.removeChannel(c)) };
  }, [currentUser, fetchFullGameState, chatTargetUser]);

  // Main render logic
  const renderView = () => {
    if (!currentUser) return <div className="text-white">Error: User not found.</div>;
    const commonProps = { allUsers, onStartChat, isDrawerOpen, onToggleDrawer: () => setIsDrawerOpen(!isDrawerOpen) };
    switch (currentUser.role) {
      case UserRole.PLAYER: return <PlayerView currentUser={currentUser} fightStatus={fightStatus} lastWinner={lastWinner} fightId={fightId} timer={timer} bettingPools={bettingPools} currentBet={currentBet} onPlaceBet={handlePlaceBet} fightHistory={fightHistory} upcomingFights={upcomingFights} onRequestCoins={onRequestCoins} agents={agentsForRegistration} liveBets={liveBets} {...commonProps} />;
      case UserRole.AGENT: return <AgentView currentUser={currentUser} myPlayers={myPlayers} transactions={transactions} coinRequests={coinRequests} masterAgents={masterAgents} liveBets={liveBets} fightId={fightId} onRespondToRequest={onRespondToRequest} onRequestCoins={onRequestCoins} {...commonProps} />;
      case UserRole.MASTER_AGENT: return <MasterAgentView currentUser={currentUser} myAgents={myAgents} transactions={transactions} coinRequests={coinRequests} liveBets={liveBets} fightId={fightId} onRespondToRequest={onRespondToRequest} onCreateAgent={onCreateAgent} onCreateMasterAgent={onCreateMasterAgent} onCreateOperator={onCreateOperator} {...commonProps} />;
      case UserRole.OPERATOR: return <OperatorView currentUser={currentUser} fightStatus={fightStatus} lastWinner={lastWinner} fightId={fightId} timer={timer} bettingPools={bettingPools} liveBets={liveBets} upcomingFights={upcomingFights} completedFights={completedFights} onDeclareWinner={onDeclareWinner} onAddUpcomingFight={onAddUpcomingFight} onStartNextFight={onStartNextFight} onCloseBetting={onCloseBetting} {...commonProps} />;
      default: return <div>Unknown user role</div>;
    }
  };

  if (loading) return <div className="flex items-center justify-center h-screen bg-zinc-900 text-white font-bold text-xl">LOADING REALITY...</div>;

  return (
    <>
      {currentUser ? (
        <div className="flex flex-col h-screen">
          <Header currentUser={currentUser} onLogout={handleLogout} onSettings={() => setIsSettingsOpen(true)} onToggleDrawer={() => setIsDrawerOpen(!isDrawerOpen)} />
          <main className="flex-grow overflow-y-auto">{renderView()}</main>
        </div>
      ) : (
        <AuthView onLogin={handleLogin} onRegister={handleRegister} isSupabaseConfigured={isSupabaseConfigured} agents={agentsForRegistration} />
      )}
      {notification && <NotificationComponent message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
      {isSettingsOpen && currentUser && <ChangePasswordModal onClose={() => setIsSettingsOpen(false)} onChangePassword={handleChangePassword} />}
      {chatTargetUser && currentUser && <ChatModal currentUser={currentUser} chatTargetUser={chatTargetUser} messages={chatMessages} onClose={() => setChatTargetUser(null)} onSendMessage={onSendMessage} />}
    </>
  );
};

export default App;
