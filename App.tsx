
import React, { useState, useEffect } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './supabaseClient.ts';
import { AllUserTypes, UserRole, FightStatus, FightWinner, Bet, PlayerFightHistoryEntry, UpcomingFight, Agent, FightResult, MasterAgent, Operator, Player } from './types.ts';

import AuthView from './components/AuthView.tsx';
import PlayerView from './components/PlayerView.tsx';
import OperatorView from './components/OperatorView.tsx';
import AgentView from './components/AgentView.tsx';
import MasterAgentView from './components/MasterAgentView.tsx';
import Header from './components/Header.tsx';
import NotificationComponent from './components/Notification.tsx';
import ChangePasswordModal from './components/ChangePasswordModal.tsx';

// A mock API for fight state, in a real app this would come from Supabase
const useMockFightState = () => {
    const [fightState, setFightState] = useState({
        fightId: 1,
        status: FightStatus.BETTING_OPEN,
        timer: 30,
        lastWinner: null as FightWinner | null,
        pools: { meron: 15000, wala: 12000 }
    });

    useEffect(() => {
        const interval = setInterval(() => {
            setFightState(s => {
                if (s.status === FightStatus.BETTING_OPEN) {
                    if (s.timer > 0) {
                        return { ...s, timer: s.timer - 1 };
                    } else {
                        return { ...s, status: FightStatus.BETTING_CLOSED, timer: 0 };
                    }
                }
                return s;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    return fightState;
};


const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [currentUser, setCurrentUser] = useState<AllUserTypes | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  // --- MOCK DATA ---
  const fightState = useMockFightState(); // using mock hook
  const [currentBet, setCurrentBet] = useState<Bet | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const MOCK_HISTORY: PlayerFightHistoryEntry[] = [
      { id: 0, winner: 'RED', commission: 0, bet: { id: 'b1', userId: '101', fightId: 0, amount: 100, choice: 'RED' }, outcome: 'WIN' }
  ];
  const MOCK_UPCOMING: UpcomingFight[] = [
      { id: 2, participants: { red: 'Fighter A', white: 'Fighter B' } }
  ];
  const MOCK_COMPLETED: FightResult[] = [
    { id: 0, winner: 'RED', commission: 1350 }
  ];
  // --- END MOCK DATA ---

  useEffect(() => {
    // Fetch agents for registration form
    const fetchAgents = async () => {
        if (!supabase) return;
        const { data, error } = await supabase.from('profiles').select('*').eq('role', UserRole.AGENT);
        if (data) setAgents(data as unknown as Agent[]);
    };
    fetchAgents();

    // Handle auth state
    supabase?.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: authListener } = supabase?.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    }) ?? { data: { subscription: null } };

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

   useEffect(() => {
    const fetchUserProfile = async (user: User) => {
      if (!supabase) return;
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error) {
        console.error("Error fetching profile:", error);
        handleLogout();
      } else if (profile) {
        setCurrentUser(profile as AllUserTypes);
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


  const handleLogin = async (email: string, password: string): Promise<string | null> => {
    if (!supabase) return "Supabase not configured";
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? error.message : null;
  };

  const handleRegister = async (name: string, email: string, password: string, agentId: string): Promise<string | null> => {
    if (!supabase) return "Supabase not configured";
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name, role: UserRole.PLAYER, agent_id: agentId } } });
    if (error) return error.message;
    // The user needs to be created in the profiles table, often done with a trigger/function in Supabase
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
        if (error) {
            return error.message;
        }
        setNotification({ message: "Password updated successfully!", type: "success" });
        return null;
    };

  const handlePlaceBet = async (amount: number, choice: 'RED' | 'WHITE'): Promise<string | null> => {
    if (!currentUser) return "Not logged in";
    if (!supabase) return "Supabase not configured";
    if (fightState.fightId === null) return "No active fight to bet on.";
    if (currentUser.coinBalance < amount) return "Insufficient balance";

    setLoading(true);
    // FIX: Cast supabase.rpc to any to resolve TypeScript error with RPC function arguments.
    const { data, error } = await (supabase.rpc as any)('place_bet', {
      p_fight_id: fightState.fightId,
      p_amount: amount,
      p_choice: choice
    });
    setLoading(false);

    if (error) {
      console.error("Error placing bet:", error);
      return error.message;
    }

    // FIX: This check is now valid as casting supabase.rpc to 'any' makes `data` of type `any`.
    if (data && typeof data === 'string' && data.toLowerCase().startsWith('error:')) {
      return data;
    }

    // Optimistic update of balance.
    setCurrentUser(u => u ? { ...u, coinBalance: u.coinBalance - amount } : null);
    setCurrentBet({ id: 'temp-bet-' + Math.random(), userId: currentUser.id, fightId: fightState.fightId, amount, choice });
    setNotification({message: 'Bet placed successfully!', type: 'success'});
    return null;
  }

  const handleCreateAgent = async (name: string, email: string, password: string): Promise<string | null> => {
    if (!supabase) return "Supabase not configured";
    setLoading(true);
    const { data, error } = await (supabase.rpc as any)('create_agent_user', {
        p_name: name,
        p_email: email,
        p_password: password
    });
    setLoading(false);

    if (error) {
        console.error("Error creating agent:", error);
        return error.message;
    }
    
    if (typeof data === 'string' && data.toLowerCase().startsWith('error:')) {
        return data;
    }

    setNotification({ message: 'Agent created successfully! You may need to refresh to see them in your list.', type: 'success' });
    return null;
  };
  
  const handleAddUpcomingFight = async (red: string, white: string): Promise<string | null> => {
    if (!supabase) return "Supabase not configured";
    setLoading(true);
    // FIX: Cast supabase.rpc to any to resolve TypeScript error with RPC function arguments.
    const { error } = await (supabase.rpc as any)('add_upcoming_fight', {
        p_red_text: red,
        p_white_text: white
    });
    setLoading(false);

    if (error) {
        console.error("Error adding upcoming fight:", error);
        return error.message;
    }
    
    setNotification({ message: 'Fight added to queue!', type: 'success' });
    // In a real app, we would refetch upcoming fights here.
    return null;
  };

  const handleStartNextFight = async (): Promise<string | null> => {
    if (!supabase) return "Supabase not configured";
    setLoading(true);
    const { error } = await supabase.rpc('start_next_fight');
    setLoading(false);

    if (error) {
        console.error("Error starting next fight:", error);
        setNotification({ message: error.message, type: 'error' });
        return error.message;
    }
    
    setNotification({ message: 'Next fight started!', type: 'success' });
    // This should trigger a state refresh for the fight state.
    return null;
  };

  const handleCloseBetting = async (): Promise<string | null> => {
    if (!supabase) return "Supabase not configured";
    if (fightState.fightId === null) return "No active fight.";
    
    setLoading(true);
    // FIX: Cast supabase.rpc to any to resolve TypeScript error with RPC function arguments.
    const { error } = await (supabase.rpc as any)('close_betting', {
        p_fight_id: fightState.fightId
    });
    setLoading(false);

    if (error) {
        console.error("Error closing betting:", error);
        setNotification({ message: error.message, type: 'error' });
        return error.message;
    }
    
    setNotification({ message: 'Betting is now closed!', type: 'success' });
    return null;
  };

    const handleDeclareWinner = async (winner: FightWinner): Promise<string | null> => {
        if (!supabase) return "Supabase not configured";
        if (fightState.fightId === null) return "No active fight to declare winner for.";
        
        setLoading(true);
        // FIX: Cast supabase.rpc to any to resolve TypeScript error with RPC function arguments.
        const { error } = await (supabase.rpc as any)('declare_winner', {
            p_fight_id: fightState.fightId,
            p_winner_text: winner
        });
        setLoading(false);

        if (error) {
            console.error("Error declaring winner:", error);
            setNotification({ message: error.message, type: 'error' });
            return error.message;
        }

        setNotification({ message: `Winner declared: ${winner}! Bets are being settled.`, type: 'success' });
        return null;
    };

    const handlePlayerRequestCoins = async (amount: number): Promise<string | null> => {
        if (!currentUser || currentUser.role !== UserRole.PLAYER) return "Invalid user role";
        const player = currentUser as Player;
        if (!player.agentId) return "You have no agent to request coins from.";
        if (!supabase) return "Supabase not configured";

        setLoading(true);
        // FIX: Cast supabase.rpc to any to resolve TypeScript error with RPC function arguments.
        const { error } = await (supabase.rpc as any)('create_coin_request', {
            p_to_user_id: player.agentId,
            p_amount: amount
        });
        setLoading(false);

        if (error) {
            console.error("Error requesting coins:", error);
            return error.message;
        }
        
        return null; // The modal handles success notification
    };

    const handleAgentRequestCoins = async (amount: number, targetUserId: string): Promise<string | null> => {
        if (!currentUser || currentUser.role !== UserRole.AGENT) return "Invalid user role";
        if (!supabase) return "Supabase not configured";

        setLoading(true);
        // FIX: Cast supabase.rpc to any to resolve TypeScript error with RPC function arguments.
        const { error } = await (supabase.rpc as any)('create_coin_request', {
            p_to_user_id: targetUserId,
            p_amount: amount
        });
        setLoading(false);

        if (error) {
            console.error("Error requesting coins:", error);
            return error.message;
        }
        
        setNotification({ message: 'Coin request sent!', type: 'success' });
        return null;
    };

    const handleRespondToCoinRequest = async (requestId: string, response: 'APPROVED' | 'DECLINED'): Promise<string | null> => {
        if (!supabase) return "Supabase not configured";
        setLoading(true);
        // FIX: Cast supabase.rpc to any to resolve TypeScript error with RPC function arguments.
        const { data, error } = await (supabase.rpc as any)('respond_to_coin_request', {
            p_request_id: requestId,
            p_response: response
        });
        setLoading(false);

        if (error) {
            console.error("Error responding to coin request:", error);
            return error.message;
        }

        // FIX: This check is now valid as casting supabase.rpc to 'any' makes `data` of type `any`.
        if (data && typeof data === 'string' && data.toLowerCase().startsWith('error:')) {
          return data;
        }

        setNotification({ message: `Request has been ${response.toLowerCase()}.`, type: 'success' });
        // This should trigger refetching of coin requests and user balances.
        return null;
    }

  const renderUserView = () => {
    if (!currentUser) return null;

    switch (currentUser.role) {
      case UserRole.PLAYER:
        return <PlayerView
            currentUser={currentUser as Player}
            fightStatus={fightState.status}
            lastWinner={fightState.lastWinner}
            fightId={fightState.fightId}
            timer={fightState.timer}
            bettingPools={fightState.pools}
            currentBet={currentBet}
            onPlaceBet={handlePlaceBet}
            fightHistory={MOCK_HISTORY}
            upcomingFights={MOCK_UPCOMING}
            onRequestCoins={handlePlayerRequestCoins}
            isDrawerOpen={isDrawerOpen}
            onToggleDrawer={() => setDrawerOpen(!isDrawerOpen)}
        />;
      case UserRole.OPERATOR:
        return <OperatorView
            currentUser={currentUser as Operator}
            fightStatus={fightState.status}
            lastWinner={fightState.lastWinner}
            fightId={fightState.fightId}
            timer={fightState.timer}
            bettingPools={fightState.pools}
            liveBets={[]}
            upcomingFights={MOCK_UPCOMING}
            completedFights={MOCK_COMPLETED}
            allUsers={{}}
            onDeclareWinner={handleDeclareWinner}
            onAddUpcomingFight={handleAddUpcomingFight}
            onStartNextFight={handleStartNextFight}
            onCloseBetting={handleCloseBetting}
        />;
      case UserRole.AGENT:
          return <AgentView currentUser={currentUser as Agent} myPlayers={[]} allUsers={{}} transactions={[]} coinRequests={[]} onRespondToRequest={handleRespondToCoinRequest} onRequestCoins={handleAgentRequestCoins} />;
      case UserRole.MASTER_AGENT:
          return <MasterAgentView currentUser={currentUser as MasterAgent} myAgents={[]} allUsers={{}} transactions={[]} coinRequests={[]} onRespondToRequest={handleRespondToCoinRequest} onCreateAgent={handleCreateAgent} />;
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
    </div>
  );
};

export default App;
