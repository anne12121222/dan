import React, { useState, useEffect } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './supabaseClient.ts';
import { AllUserTypes, UserRole, FightStatus, FightWinner, Bet, PlayerFightHistoryEntry, UpcomingFight, Agent, FightResult, MasterAgent, Operator, Player, Transaction, CoinRequest, Message } from './types.ts';
import { Database } from './database.types.ts';
import { v4 as uuidv4 } from 'uuid';

import AuthView from './components/AuthView.tsx';
import PlayerView from './components/PlayerView.tsx';
import OperatorView from './components/OperatorView.tsx';
import AgentView from './components/AgentView.tsx';
import MasterAgentView from './components/MasterAgentView.tsx';
import Header from './components/Header.tsx';
import NotificationComponent from './components/Notification.tsx';
import ChangePasswordModal from './components/ChangePasswordModal.tsx';
import ChatModal from './components/ChatModal.tsx';

// FIX: Add type aliases for Supabase table rows to fix type inference issues.
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type TransactionRow = Database["public"]["Tables"]["transactions"]["Row"];
type CoinRequestRow = Database["public"]["Tables"]["coin_requests"]["Row"];
type UpcomingFightRow = Database["public"]["Tables"]["upcoming_fights"]["Row"];
type FightRow = Database["public"]["Tables"]["fights"]["Row"];
type BetRow = Database["public"]["Tables"]["bets"]["Row"];
type MessageRow = Database["public"]["Tables"]["messages"]["Row"];


// Helper function to map Supabase profile to frontend user type
const mapProfileToUser = (profile: Database['public']['Tables']['profiles']['Row']): AllUserTypes | null => {
    const {
        id, name, email, role, coin_balance, commission_balance,
        commission_rate, transfer_fee, agent_id, master_agent_id
    } = profile;

    const baseUser = { id, name, email, coinBalance: coin_balance };

    switch (role) {
        case UserRole.PLAYER:
            return { ...baseUser, role: UserRole.PLAYER, agentId: agent_id };
        case UserRole.AGENT:
            return {
                ...baseUser, role: UserRole.AGENT, masterAgentId: master_agent_id,
                commissionBalance: commission_balance, commissionRate: commission_rate,
                transferFee: transfer_fee,
            };
        case UserRole.MASTER_AGENT:
            return {
                ...baseUser, role: UserRole.MASTER_AGENT, commissionBalance: commission_balance,
                commissionRate: commission_rate, transferFee: transfer_fee,
            };
        case UserRole.OPERATOR:
            return { ...baseUser, role: UserRole.OPERATOR };
        default:
            return null;
    }
};


const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [currentUser, setCurrentUser] = useState<AllUserTypes | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  // --- LIVE DATA STATES (replaces mocks) ---
  const [agents, setAgents] = useState<Agent[]>([]); // For registration form & player coin requests
  const [masterAgents, setMasterAgents] = useState<MasterAgent[]>([]); // For agent coin requests
  const [myAgents, setMyAgents] = useState<Agent[]>([]);
  const [myPlayers, setMyPlayers] = useState<Player[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [coinRequests, setCoinRequests] = useState<CoinRequest[]>([]);
  const [allUsers, setAllUsers] = useState<{ [id: string]: AllUserTypes }>({});
  
  // Fight states
  const [activeFight, setActiveFight] = useState<Database['public']['Tables']['fights']['Row'] | null>(null);
  const [lastWinner, setLastWinner] = useState<FightWinner | null>(null);
  const [timer, setTimer] = useState(0);
  const [bettingPools, setBettingPools] = useState({ meron: 0, wala: 0 });
  const [currentBet, setCurrentBet] = useState<Bet | null>(null);
  const [liveBets, setLiveBets] = useState<Bet[]>([]);
  const [upcomingFights, setUpcomingFights] = useState<UpcomingFight[]>([]);
  const [completedFights, setCompletedFights] = useState<FightResult[]>([]);
  const [fightHistory, setFightHistory] = useState<PlayerFightHistoryEntry[]>([]);
  
  // Chat states
  const [chatTargetUser, setChatTargetUser] = useState<AllUserTypes | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  // Effect for Auth
  useEffect(() => {
    const fetchPublicRoles = async () => {
        if (!supabase) return;
        // Fetch agents for registration form & for unassigned players
        const agentPromise = supabase.from('profiles').select('*').eq('role', UserRole.AGENT);
        // Fetch master agents for unassigned agents
        const masterAgentPromise = supabase.from('profiles').select('*').eq('role', UserRole.MASTER_AGENT);

        const [agentRes, masterAgentRes] = await Promise.all([agentPromise, masterAgentPromise]);

        if (agentRes.data) setAgents(agentRes.data.map(p => mapProfileToUser(p as ProfileRow)).filter(p => p) as Agent[]);
        if (masterAgentRes.data) setMasterAgents(masterAgentRes.data.map(p => mapProfileToUser(p as ProfileRow)).filter(p => p) as MasterAgent[]);
    };
    fetchPublicRoles();

    supabase?.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: authListener } = supabase?.auth.onAuthStateChange((_event, session) => setSession(session)) ?? { data: { subscription: null } };
    return () => authListener?.subscription?.unsubscribe();
  }, []);

  // Effect to fetch user profile when session changes
   useEffect(() => {
    const fetchUserProfile = async (user: User) => {
      if (!supabase) return;
      const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      
      if (error) {
        console.error("Error fetching profile:", error);
        handleLogout();
      } else if (profile) {
        // CRITICAL FIX: Map snake_case from DB to camelCase for frontend.
        const userProfile = mapProfileToUser(profile);
        setCurrentUser(userProfile);
      }
      setLoading(false);
    };

    if (session?.user) {
      setLoading(true);
      fetchUserProfile(session.user);
    } else {
      setCurrentUser(null);
      setLoading(false);
    }
  }, [session]);

    // Main data fetching function, wrapped in a useCallback to be stable
    const fetchAllData = React.useCallback(async () => {
        if (!supabase || !currentUser) return;

        const userIdsToFetch = new Set<string>([currentUser.id]);
        
        // Fetch common data: transactions and coin requests
        const txPromise = supabase.from('transactions').select('*').or(`from_user_id.eq.${currentUser.id},to_user_id.eq.${currentUser.id}`).order('transaction_timestamp', { ascending: false });
        const crPromise = supabase.from('coin_requests').select('*').or(`to_user_id.eq.${currentUser.id},from_user_id.eq.${currentUser.id}`).order('created_at', { ascending: false });
        
        const [txRes, crRes] = await Promise.all([txPromise, crPromise]);

        if (txRes.data) {
            // FIX: Cast Supabase response data to the correct type.
            const transactions = txRes.data as TransactionRow[];
            transactions.forEach(tx => {
                if (tx.from_user_id) userIdsToFetch.add(tx.from_user_id);
                if (tx.to_user_id) userIdsToFetch.add(tx.to_user_id);
            });
            setTransactions(transactions.map(tx => ({ id: tx.id, type: tx.type, fromUserId: tx.from_user_id, toUserId: tx.to_user_id, amount: tx.amount, transactionTimestamp: tx.transaction_timestamp })));
        }
        if (crRes.data) {
            // FIX: Cast Supabase response data to the correct type.
            const coinRequestsData = crRes.data as CoinRequestRow[];
            coinRequestsData.forEach(req => { userIdsToFetch.add(req.from_user_id); userIdsToFetch.add(req.to_user_id); });
            setCoinRequests(coinRequestsData.map(req => ({ id: req.id, fromUserId: req.from_user_id, toUserId: req.to_user_id, amount: req.amount, status: req.status, createdAt: req.created_at })));
        }

        // Role-specific data
        if (currentUser.role === UserRole.OPERATOR || currentUser.role === UserRole.MASTER_AGENT) {
            // Operators & Master Agents need all users for live bet list names.
            const { data } = await supabase.from('profiles').select('id'); // Just get IDs to be efficient
            if (data) {
                (data as { id: string }[]).forEach(p => userIdsToFetch.add(p.id));
            }
        }

        if (currentUser.role === UserRole.MASTER_AGENT) {
            const { data } = await supabase.from('profiles').select('*').eq('master_agent_id', currentUser.id);
            if (data) {
                // FIX: Cast Supabase response data to the correct type.
                const agentProfiles = data as ProfileRow[];
                agentProfiles.forEach(p => userIdsToFetch.add(p.id));
                setMyAgents(agentProfiles.map(p => mapProfileToUser(p)) as Agent[]);
            }
        }
        if (currentUser.role === UserRole.AGENT) {
            const { data } = await supabase.from('profiles').select('*').eq('agent_id', currentUser.id);
            if (data) {
                // FIX: Cast Supabase response data to the correct type.
                 const playerProfiles = data as ProfileRow[];
                 playerProfiles.forEach(p => userIdsToFetch.add(p.id));
                 setMyPlayers(playerProfiles.map(p => mapProfileToUser(p)) as Player[]);
            }
            if (currentUser.masterAgentId) userIdsToFetch.add(currentUser.masterAgentId);
        }
        
        // Fetch all unique user profiles needed for display
        const { data: profilesData } = await supabase.from('profiles').select('*').in('id', Array.from(userIdsToFetch));
        if (profilesData) {
            // FIX: Cast Supabase response data to the correct type.
            const profiles = profilesData as ProfileRow[];
            const userMap: { [id: string]: AllUserTypes } = {};
            profiles.forEach(p => {
                const user = mapProfileToUser(p);
                if (user) userMap[p.id] = user;
            });
            setAllUsers(userMap);
        }
    }, [currentUser, supabase]);


    // Main data fetching function for fight data
    const fetchActiveFight = React.useCallback(async () => {
        if (!supabase) return;
        
        // Fetch upcoming fights
        const { data: upcomingData } = await supabase.from('upcoming_fights').select('*').order('id', { ascending: true });
        if (upcomingData) {
            const upcoming = upcomingData as UpcomingFightRow[];
            setUpcomingFights(upcoming.map(f => ({ id: f.id, participants: f.participants as any })));
        }

        // Fetch completed fights for trends/history
        const { data: completedData } = await supabase.from('fights').select('id, winner, commission').eq('status', 'SETTLED').order('settled_at', { ascending: false }).limit(20);
        const completed = completedData as Pick<FightRow, "id" | "winner" | "commission">[] | null;
        if (completed) setCompletedFights(completed as FightResult[]);
        
        if (currentUser?.role === UserRole.PLAYER) {
            const { data: historyBetsData } = await supabase.from('bets').select('*').eq('user_id', currentUser.id).in('fight_id', completed?.map(f => f.id) || []);
            const historyBets = historyBetsData as BetRow[] | null;
            const historyMap = new Map(historyBets?.map(b => [b.fight_id, b]));
            setFightHistory(completed?.map(f => {
                const bet = historyMap.get(f.id);
                let outcome: 'WIN'|'LOSS'|'REFUND'|null = null;
                if (bet) {
                    if (f.winner === 'DRAW' || f.winner === 'CANCELLED') outcome = 'REFUND';
                    else if (f.winner === bet.choice) outcome = 'WIN';
                    else outcome = 'LOSS';
                }
                return { ...f, bet: bet ? { id: bet.id, userId: bet.user_id, fightId: bet.fight_id, amount: bet.amount, choice: bet.choice } : null, outcome };
            }) || []);
        }


        // Fetch the currently active fight
        const { data: fightData } = await supabase.from('fights').select('*').in('status', ['BETTING_OPEN', 'BETTING_CLOSED']).order('id', { ascending: false }).limit(1).single();
        const fight = fightData as FightRow | null;
        setActiveFight(fight);
        setCurrentBet(null); // Reset bet on new fight

        if (fight) {
            const { data: betsData } = await supabase.from('bets').select('*').eq('fight_id', fight.id);
            if (betsData) {
                const bets = betsData as BetRow[];
                const pools = bets.reduce((acc, b) => {
                    if (b.choice === 'RED') acc.meron += b.amount;
                    if (b.choice === 'WHITE') acc.wala += b.amount;
                    return acc;
                }, { meron: 0, wala: 0});
                setBettingPools(pools);
                setLiveBets(bets.map(b => ({ id: b.id, userId: b.user_id, fightId: b.fight_id, amount: b.amount, choice: b.choice })));
                if (currentUser) {
                    const userBet = bets.find(b => b.user_id === currentUser.id);
                    if (userBet) setCurrentBet({ id: userBet.id, userId: userBet.user_id, fightId: userBet.fight_id, amount: userBet.amount, choice: userBet.choice });
                }
            }
        } else {
             // If no active fight, get the winner of the very last one for the banner
            const { data: lastFightData } = await supabase.from('fights').select('winner').eq('status', 'SETTLED').order('settled_at', { ascending: false }).limit(1).single();
            const lastFight = lastFightData as Pick<FightRow, "winner"> | null;
            if (lastFight) setLastWinner(lastFight.winner as FightWinner);
            else setLastWinner(null);
        }
    }, [currentUser, supabase]);


  // DEFINITIVE REAL-TIME FIX: Consolidate all subscriptions into a single, robust useEffect hook.
  // This prevents race conditions and ensures all real-time updates are handled reliably.
  useEffect(() => {
    if (!supabase || !currentUser) return;

    // Initial data fetch on login
    fetchAllData();
    fetchActiveFight();

    // A single channel for all real-time subscriptions
    const mainChannel = supabase.channel(`app-channel-${currentUser.id}`)
      // User-specific listeners for coin requests, transactions, and profile updates
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'coin_requests', filter: `to_user_id=eq.${currentUser.id}` }, payload => {
        fetchAllData(); // Refetch all data to get the new request and sender info
        setNotification({ message: 'You have a new coin request!', type: 'success' });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'coin_requests' }, fetchAllData) // For updates (approve/decline)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions' }, fetchAllData) // To update balances
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${currentUser.id}` }, payload => {
         const updatedUser = mapProfileToUser(payload.new as ProfileRow);
         if (updatedUser) setCurrentUser(updatedUser);
      })
      // Public listeners for fights, bets, and the upcoming queue
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fights' }, fetchActiveFight)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bets' }, fetchActiveFight)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'upcoming_fights' }, fetchActiveFight)
      .subscribe();

    return () => {
        supabase.removeChannel(mainChannel);
    };
  }, [currentUser, supabase, fetchAllData, fetchActiveFight]);

  // Effect for client-side timer
  useEffect(() => {
    if (activeFight?.status === FightStatus.BETTING_OPEN) {
        // This is a rough client-side timer. A real app should sync with server time.
        const start = new Date(activeFight.created_at).getTime();
        const duration = 15 * 1000; // 15 seconds as requested
        
        let interval: any;
        
        const updateTimer = () => {
            const elapsed = Date.now() - start;
            const remaining = Math.max(0, Math.ceil((duration - elapsed) / 1000));
            setTimer(remaining);
            
            // Auto-close betting for operator when timer hits 0
            if (remaining === 0 && currentUser?.role === UserRole.OPERATOR) {
                // The check `activeFight.status` is based on the closure, which is fine.
                // The RPC is idempotent, so it's safe if multiple clients call it.
                if (activeFight.status === FightStatus.BETTING_OPEN) {
                    handleCloseBetting();
                }
                clearInterval(interval); // Stop this timer loop
            }
        }
        updateTimer();
        interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    } else {
        setTimer(0);
    }
  }, [activeFight, currentUser]); // Added currentUser to dependencies
  
  // Effect for fetching messages and subscribing to chat channel
  useEffect(() => {
    if (!supabase || !currentUser || !chatTargetUser) {
        // Do not clear messages when modal is closed, so history is preserved.
        return;
    };
    
    const fetchMessages = async () => {
        const { data } = await supabase.from('messages')
            .select('*')
            .or(`(sender_id.eq.${currentUser.id},receiver_id.eq.${chatTargetUser.id}),(sender_id.eq.${chatTargetUser.id},receiver_id.eq.${currentUser.id})`)
            .order('created_at', { ascending: true });
            
        if (data) {
            const mappedMessages = (data as MessageRow[]).map(m => ({ id: m.id, senderId: m.sender_id, receiverId: m.receiver_id, text: m.text, createdAt: m.created_at }));
            setMessages(mappedMessages);
        }
    }
    fetchMessages();

    // Unique channel for this conversation
    const channelId = [currentUser.id, chatTargetUser.id].sort().join('-');
    const messageChannel = supabase.channel(`messages-${channelId}`)
        .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'messages',
            // Filter to only get messages relevant to this chat
            filter: `receiver_id=eq.${currentUser.id}`
        }, (payload) => {
            const newMessageRow = payload.new as MessageRow;
            const newMessage: Message = { id: newMessageRow.id, senderId: newMessageRow.sender_id, receiverId: newMessageRow.receiver_id, text: newMessageRow.text, createdAt: newMessageRow.created_at };
            setMessages(currentMessages => [...currentMessages, newMessage]);
        })
        .subscribe();

    return () => {
        supabase.removeChannel(messageChannel);
    };
  }, [currentUser, chatTargetUser]);


  const handleLogin = async (email: string, password: string): Promise<string | null> => {
    if (!supabase) return "Supabase not configured";
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? error.message : null;
  };

  const handleRegister = async (name: string, email: string, password: string, agentId: string): Promise<string | null> => {
    if (!supabase) return "Supabase not configured";
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name, role: UserRole.PLAYER, agent_id: agentId } } });
    if (error) return error.message;
    setNotification({ message: 'Registration successful! Please check your email to verify.', type: 'success'});
    return null;
  };

  const handleLogout = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setCurrentUser(null);
  };

    const handleChangePassword = async (_oldPassword: string, newPassword: string): Promise<string | null> => {
        if (!supabase) return "Supabase not configured";
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) { return error.message; }
        setNotification({ message: "Password updated successfully!", type: "success" });
        return null;
    };

  const handlePlaceBet = async (amount: number, choice: 'RED' | 'WHITE'): Promise<string | null> => {
    if (!currentUser || !supabase || !activeFight) return "An error occurred.";
    if (currentUser.coinBalance < amount) return "Insufficient balance";

    setLoading(true);
    const { data, error } = await (supabase.rpc as any)('place_bet', { p_fight_id: activeFight.id, p_amount: amount, p_choice: choice });
    setLoading(false);

    if (error) { return error.message; }
    if (data && typeof data === 'string' && data.toLowerCase().startsWith('error:')) { return data; }

    setCurrentUser(u => u ? { ...u, coinBalance: u.coinBalance - amount } : null);
    setNotification({message: 'Bet placed successfully!', type: 'success'});
    return null;
  }

  const handleCreateAgent = async (name: string, email: string, password: string): Promise<string | null> => {
    if (!supabase) return "Supabase not configured";
    setLoading(true);
    const { data, error } = await (supabase.rpc as any)('create_agent_user', { p_name: name, p_email: email, p_password: password });
    setLoading(false);
    if (error) { return error.message; }
    if (typeof data === 'string' && data.toLowerCase().startsWith('error:')) { return data; }
    setNotification({ message: 'Agent created successfully!', type: 'success' });
    return null;
  };

    const handleCreateMasterAgent = async (name: string, email: string, password: string): Promise<string | null> => {
        if (!supabase) return "Supabase not configured";
        setLoading(true);
        const { data, error } = await (supabase.rpc as any)('create_master_agent_user', { p_name: name, p_email: email, p_password: password });
        setLoading(false);
        if (error) { return error.message; }
        if (typeof data === 'string' && data.toLowerCase().startsWith('error:')) { return data; }
        setNotification({ message: 'Master Agent created successfully!', type: 'success' });
        return null;
    };
    
    const handleCreateOperator = async (name: string, email: string, password: string): Promise<string | null> => {
        if (!supabase) return "Supabase not configured";
        setLoading(true);
        const { data, error } = await (supabase.rpc as any)('create_operator_user', { p_name: name, p_email: email, p_password: password });
        setLoading(false);
        if (error) { return error.message; }
        if (typeof data === 'string' && data.toLowerCase().startsWith('error:')) { return data; }
        setNotification({ message: 'Operator created successfully!', type: 'success' });
        return null;
    };
  
  const handleAddUpcomingFight = async (red: string, white: string): Promise<string | null> => {
    if (!supabase) return "Supabase not configured";
    setLoading(true);
    const { error } = await (supabase.rpc as any)('add_upcoming_fight', { p_red_text: red, p_white_text: white });
    setLoading(false);
    if (error) { return error.message; }
    
    // ROBUSTNESS FIX: Manually refetch fight data immediately after adding a fight.
    // This ensures the operator sees the "Start Next Fight" button instantly.
    await fetchActiveFight();

    setNotification({ message: 'Fight added to queue!', type: 'success' });
    return null;
  };

  const handleStartNextFight = async (): Promise<string | null> => {
    if (!supabase) return "Supabase not configured";
    setLoading(true);
    const { error } = await supabase.rpc('start_next_fight');
    setLoading(false);
    if (error) { setNotification({ message: error.message, type: 'error' }); return error.message; }
    setNotification({ message: 'Next fight started!', type: 'success' });
    return null;
  };

  const handleCloseBetting = async (): Promise<string | null> => {
    if (!supabase || !activeFight) return "No active fight.";
    setLoading(true);
    const { error } = await (supabase.rpc as any)('close_betting', { p_fight_id: activeFight.id });
    setLoading(false);
    if (error) { setNotification({ message: error.message, type: 'error' }); return error.message; }
    setNotification({ message: 'Betting is now closed!', type: 'success' });
    return null;
  };

    const handleDeclareWinner = async (winner: FightWinner): Promise<string | null> => {
        if (!supabase || !activeFight) return "No active fight to declare winner for.";
        setLoading(true);
        const { error } = await (supabase.rpc as any)('declare_winner', { p_fight_id: activeFight.id, p_winner_text: winner });
        setLoading(false);
        if (error) { setNotification({ message: error.message, type: 'error' }); return error.message; }
        setNotification({ message: `Winner declared: ${winner}! Bets are being settled.`, type: 'success' });
        return null;
    };

    const handleCreateCoinRequest = async (amount: number, targetUserId: string): Promise<string | null> => {
        if (!currentUser || !supabase) return "Invalid request";
        setLoading(true);
        const { error, data } = await (supabase.rpc as any)('create_coin_request', { p_to_user_id: targetUserId, p_amount: amount });
        setLoading(false);
        if (error) { return error.message; }
        
        // Custom check for unassigned players/agents for better UX
        const user = currentUser as Player | Agent;
        if ((user.role === UserRole.PLAYER && !user.agentId) || (user.role === UserRole.AGENT && !user.masterAgentId)) {
             setNotification({ message: 'Coin request sent! If approved, this user will become your assigned superior.', type: 'success' });
        } else {
             setNotification({ message: 'Coin request sent!', type: 'success' });
        }
        return null;
    };

    const handleRespondToCoinRequest = async (requestId: string, response: 'APPROVED' | 'DECLINED'): Promise<string | null> => {
        if (!supabase) return "Supabase not configured";
        setLoading(true);
        const { data, error } = await (supabase.rpc as any)('respond_to_coin_request', { p_request_id: requestId, p_response: response });
        setLoading(false);
        if (error) { return error.message; }
        if (data && typeof data === 'string' && data.toLowerCase().startsWith('error:')) { return data; }
        
        // Optimistic UI update for instant feedback
        setCoinRequests(currentRequests => currentRequests.filter(req => req.id !== requestId));
        
        setNotification({ message: `Request has been ${response.toLowerCase()}.`, type: 'success' });
        return null;
    }

    const handleSendMessage = async (text: string, amount: number): Promise<void> => {
        if (!supabase || !chatTargetUser || !currentUser) return;
        
        // Optimistic UI update for sender
        if (text.trim()) {
            const optimisticMessage: Message = {
                id: uuidv4(), // temporary client-side ID
                senderId: currentUser.id,
                receiverId: chatTargetUser.id,
                text: text.trim(),
                createdAt: new Date().toISOString()
            };
            setMessages(current => [...current, optimisticMessage]);
        }
        
        const { error, data } = await (supabase.rpc as any)('send_message_and_coins', {
            p_receiver_id: chatTargetUser.id,
            p_text: text,
            p_amount: amount
        });
        
        if (error) {
            setNotification({ message: error.message, type: 'error' });
            // TODO: Optionally remove the optimistic message on error
        } else if (data && typeof data === 'string' && data.toLowerCase().startsWith('error:')) {
            setNotification({ message: data, type: 'error' });
            // TODO: Optionally remove the optimistic message on error
        }
        // The real-time subscription will update for the receiver.
        // Balances will be updated via the 'profiles' table subscription.
    };

  const renderUserView = () => {
    if (!currentUser) return null;
    
    const fightStatus = activeFight?.status as FightStatus || FightStatus.SETTLED;
    const fightId = activeFight?.id || null;

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
            onRequestCoins={handleCreateCoinRequest}
            agents={agents}
            isDrawerOpen={isDrawerOpen}
            onToggleDrawer={() => setDrawerOpen(!isDrawerOpen)}
            allUsers={allUsers}
            onStartChat={setChatTargetUser}
            liveBets={liveBets}
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
      case UserRole.AGENT:
          return <AgentView
              currentUser={currentUser as Agent}
              myPlayers={myPlayers}
              allUsers={allUsers}
              transactions={transactions}
              coinRequests={coinRequests}
              onRespondToRequest={handleRespondToCoinRequest}
              onRequestCoins={handleCreateCoinRequest}
              onStartChat={setChatTargetUser}
              masterAgents={masterAgents}
              liveBets={liveBets}
              fightId={fightId}
          />;
      case UserRole.MASTER_AGENT:
          return <MasterAgentView
              currentUser={currentUser as MasterAgent}
              myAgents={myAgents}
              allUsers={allUsers}
              transactions={transactions}
              coinRequests={coinRequests}
              onRespondToRequest={handleRespondToCoinRequest}
              onCreateAgent={handleCreateAgent}
              onCreateMasterAgent={handleCreateMasterAgent}
              onCreateOperator={handleCreateOperator}
              onStartChat={setChatTargetUser}
              liveBets={liveBets}
              fightId={fightId}
          />;
      default:
        return <div className="p-8 text-center text-red-500">Error: Unknown user role.</div>;
    }
  };

  if (loading) {
    return <div className="bg-zinc-900 h-screen flex items-center justify-center text-white">Loading...</div>;
  }
  
  return (
    <div className="bg-zinc-900">
      {!session || !currentUser ? (
        <AuthView onLogin={handleLogin} onRegister={handleRegister} isSupabaseConfigured={isSupabaseConfigured} agents={agents} />
      ) : (
        <>
            <Header currentUser={currentUser} onLogout={handleLogout} onSettings={() => setShowSettings(true)} onToggleDrawer={() => setDrawerOpen(!isDrawerOpen)} />
            <main>
                {renderUserView()}
            </main>
        </>
      )}
      {showSettings && (
          <ChangePasswordModal
            onClose={() => setShowSettings(false)}
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
      {currentUser && chatTargetUser && (
        <ChatModal
            currentUser={currentUser}
            chatTargetUser={chatTargetUser}
            messages={messages}
            onClose={() => setChatTargetUser(null)}
            onSendMessage={handleSendMessage}
        />
      )}
    </div>
  );
};

export default App;