import React, { useState } from 'react';
import Card from './common/Card';
import { Agent } from '../types';

interface AuthViewProps {
  onLogin: (email: string, password: string) => Promise<string | null>;
  onRegister: (name: string, email: string, password: string, agentId: string | null) => Promise<string | null>;
  isSupabaseConfigured: boolean;
  agents: Agent[];
}

const AuthView: React.FC<AuthViewProps> = ({ onLogin, onRegister, isSupabaseConfigured, agents }) => {
  const [isLoginView, setIsLoginView] = useState(true);

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-900 p-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-center text-white mb-2">International Gamefowl Boxing</h1>
        <p className="text-center text-gray-400 mb-6">Please sign in or create an account to continue</p>
        <Card>
          {isLoginView ? 
            <LoginForm onLogin={onLogin} isSupabaseConfigured={isSupabaseConfigured} /> : 
            <RegisterForm onRegister={onRegister} agents={agents} />
          }
        </Card>
        <p className="text-center text-sm text-gray-400 mt-4">
          {isLoginView ? "Don't have an account? " : "Already have an account? "}
          <button onClick={() => setIsLoginView(!isLoginView)} className="font-semibold text-blue-500 hover:text-blue-400">
            {isLoginView ? "Sign Up" : "Sign In"}
          </button>
        </p>
      </div>
    </div>
  );
};

const LoginForm: React.FC<Pick<AuthViewProps, 'onLogin' | 'isSupabaseConfigured'>> = ({ onLogin, isSupabaseConfigured }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        const result = await onLogin(email, password);
        if (result) setError(result);
        setLoading(false);
    };

    return (
        <form onSubmit={handleLogin}>
            <div className="p-6 space-y-4">
              <h2 className="text-xl font-semibold text-center text-gray-200">Login to your Account</h2>
              {!isSupabaseConfigured && (
                 <div className="bg-red-900/50 border border-red-700 text-red-300 text-sm p-3 rounded-md text-center">
                    <p className="font-bold">Supabase Not Configured</p>
                    <p className="text-xs mt-1">Please update `supabaseClient.ts` to enable login.</p>
                </div>
              )}
              {error && <p className="text-red-400 text-center text-sm p-2 bg-red-900/50 rounded-md">{error}</p>}
              <div>
                <label htmlFor="email-login" className="block text-sm font-medium text-gray-400 mb-1">Email Address</label>
                <input id="email-login" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full bg-zinc-700 text-white p-2 rounded border border-zinc-600 focus:ring-2 focus:ring-blue-500 focus:outline-none transition" disabled={!isSupabaseConfigured || loading} />
              </div>
              <div>
                <label htmlFor="password-login" className="block text-sm font-medium text-gray-400 mb-1">Password</label>
                <input id="password-login" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full bg-zinc-700 text-white p-2 rounded border border-zinc-600 focus:ring-2 focus:ring-blue-500 focus:outline-none transition" disabled={!isSupabaseConfigured || loading} />
              </div>
            </div>
            <div className="p-4 bg-zinc-900/50 rounded-b-lg">
              <button type="submit" className="w-full p-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition duration-300 disabled:bg-blue-800/50 disabled:cursor-not-allowed" disabled={loading || !isSupabaseConfigured}>
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </div>
        </form>
    );
};

const RegisterForm: React.FC<Pick<AuthViewProps, 'onRegister' | 'agents'>> = ({ onRegister, agents }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [agentId, setAgentId] = useState<string | null>(agents.length > 0 ? agents[0].id : null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        const result = await onRegister(name, email, password, agentId);
        if (result) setError(result);
        setLoading(false);
    };

    return (
        <form onSubmit={handleRegister}>
            <div className="p-6 space-y-4">
              <h2 className="text-xl font-semibold text-center text-gray-200">Create a New Account</h2>
              {error && <p className="text-red-400 text-center text-sm p-2 bg-red-900/50 rounded-md">{error}</p>}
              <div>
                <label htmlFor="name-register" className="block text-sm font-medium text-gray-400 mb-1">Full Name</label>
                <input id="name-register" type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full bg-zinc-700 text-white p-2 rounded border border-zinc-600 focus:ring-2 focus:ring-blue-500 focus:outline-none transition" disabled={loading} />
              </div>
              <div>
                <label htmlFor="email-register" className="block text-sm font-medium text-gray-400 mb-1">Email Address</label>
                <input id="email-register" type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full bg-zinc-700 text-white p-2 rounded border border-zinc-600 focus:ring-2 focus:ring-blue-500 focus:outline-none transition" disabled={loading} />
              </div>
              <div>
                <label htmlFor="password-register" className="block text-sm font-medium text-gray-400 mb-1">Password</label>
                <input id="password-register" type="password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full bg-zinc-700 text-white p-2 rounded border border-zinc-600 focus:ring-2 focus:ring-blue-500 focus:outline-none transition" disabled={loading} />
              </div>
              {agents.length > 0 && (
                <div>
                  <label htmlFor="agent-select" className="block text-sm font-medium text-gray-400 mb-1">Select Your Agent</label>
                  <select id="agent-select" value={agentId || ''} onChange={e => setAgentId(e.target.value)} className="w-full bg-zinc-700 text-white p-2 rounded border border-zinc-600 focus:ring-2 focus:ring-blue-500 focus:outline-none transition" disabled={loading}>
                    {agents.map(agent => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div className="p-4 bg-zinc-900/50 rounded-b-lg">
              <button type="submit" className="w-full p-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition duration-300 disabled:bg-green-800/50 disabled:cursor-not-allowed" disabled={loading}>
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>
            </div>
        </form>
    );
};

export default AuthView;
