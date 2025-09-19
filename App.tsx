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
    // Mock implementation
    console.log(`Betting ${amount} on ${choice}`);
    if (currentUser.coinBalance < amount) return "Insufficient balance";
    setCurrentUser(u => u ? { ...u, coinBalance: u.coinBalance - amount } : null);
    setCurrentBet({ id: 'temp-bet', userId: currentUser.id, fightId: fightState.fightId, amount, choice });
    setNotification({message: 'Bet placed successfully!', type: 'success'});
    return null;
  }

  const handleCreateAgent = async (name: string, email: string, password: string): Promise<string | null> => {
    if (!supabase) return "Supabase not configured";
    setLoading(true);
    // FIX: There appears to be a TypeScript inference issue with the supabase.rpc method's types,
    // causing it to expect 'never' for arguments. Casting `rpc` to `any` here is a pragmatic workaround
    // to bypass this tooling problem and allow the correctly-structured arguments to be passed.
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

    // The RPC returns a text message for success or failure.
    // The type of `data` is `any` due to the cast above. This runtime check ensures we are
    // handling a string as expected from the RPC's 'Returns' type.
    if (typeof data === 'string' && data.toLowerCase().startsWith('error:')) {
        return data;
    }

    setNotification({ message: 'Agent created successfully! You may need to refresh to see them in your list.', type: 'success' });
    // In a real app, we would refetch the list of agents here to update the UI automatically.
    return null;
  };
  
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
            onRequestCoins={async () => null}
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
            onDeclareWinner={(w) => console.log(`Winner is ${w}`)}
            onAddUpcomingFight={async () => null}
            onStartNextFight={() => console.log('start next fight')}
            onCloseBetting={() => console.log('close betting')}
        />;
      case UserRole.AGENT:
          return <AgentView currentUser={currentUser as Agent} myPlayers={[]} allUsers={{}} transactions={[]} coinRequests={[]} onRespondToRequest={async () => null} onRequestCoins={async () => null} />;
      case UserRole.MASTER_AGENT:
          return <MasterAgentView currentUser={currentUser as MasterAgent} myAgents={[]} allUsers={{}} transactions={[]} coinRequests={[]} onRespondToRequest={async () => null} onCreateAgent={handleCreateAgent} />;
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
