import React, { useState } from 'react';
import { Agent, UserRole } from '../types';

interface AuthViewProps {
  onLogin: (email: string, password: string) => Promise<string | null>;
  onRegister: (name: string, email: string, password: string, agentId: string | null) => Promise<string | null>;
  isSupabaseConfigured: boolean;
  agents: {id: string, name: string}[];
}

const AuthForm: React.FC<AuthViewProps> = ({ onLogin, onRegister, isSupabaseConfigured, agents }) => {
  const [isLoginView, setIsLoginView] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [agentId, setAgentId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    let result: string | null = null;
    if (isLoginView) {
      result = await onLogin(email, password);
    } else {
      if (!agentId && agents.length > 0) {
        setError("Please select your agent.");
        setLoading(false);
        return;
      }
      result = await onRegister(name, email, password, agentId);
    }
    if (result) {
      setError(result);
    }
    setLoading(false);
  };
  
  const canRegisterPlayer = agents.length > 0;

  const toggleView = () => {
    setError(null);
    setIsLoginView(!isLoginView);
  };

  if (!isSupabaseConfigured) {
    return (
      <div className="flex items-center justify-center h-screen bg-zinc-900 text-white">
        <div className="text-center p-8 bg-zinc-800 rounded-lg shadow-xl border border-zinc-700">
          <h1 className="text-2xl font-bold text-red-500 mb-4">Configuration Error</h1>
          <p className="text-gray-300">Supabase client is not configured.</p>
          <p className="text-gray-400 mt-2">Please check your <code className="bg-zinc-700 p-1 rounded text-sm">supabaseClient.ts</code> file.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-zinc-900">
      <div className="w-full max-w-md p-8 space-y-6 bg-zinc-800/50 rounded-lg shadow-2xl border border-zinc-700 backdrop-blur-sm">
        <div className="text-center">
            <h2 className="text-3xl font-bold text-white">
            Reality Boxing Federation
            </h2>
            <p className="mt-2 text-sm text-gray-400">
                Please {isLoginView ? 'sign in' : 'create an account'} to continue
            </p>
        </div>
        <form className="space-y-6" onSubmit={handleSubmit}>
          {error && <p className="text-red-400 bg-red-900/50 text-center p-3 rounded-md text-sm">{error}</p>}
          
          {!isLoginView && (
             <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-300">Full Name</label>
                <input id="name" name="name" type="text" required value={name} onChange={(e) => setName(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md shadow-sm placeholder-gray-400 text-white focus:outline-none focus:ring-red-500 focus:border-red-500"/>
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300">Email Address</label>
            <input id="email" name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md shadow-sm placeholder-gray-400 text-white focus:outline-none focus:ring-red-500 focus:border-red-500"/>
          </div>

          <div>
            <label htmlFor="password"className="block text-sm font-medium text-gray-300">Password</label>
            <input id="password" name="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md shadow-sm placeholder-gray-400 text-white focus:outline-none focus:ring-red-500 focus:border-red-500"/>
          </div>
          
          {!isLoginView && (
            canRegisterPlayer ? (
                 <div>
                    <label htmlFor="agent" className="block text-sm font-medium text-gray-300">Select Your Agent</label>
                    <select id="agent" name="agent" required value={agentId} onChange={(e) => setAgentId(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md shadow-sm text-white focus:outline-none focus:ring-red-500 focus:border-red-500">
                        <option value="" disabled>-- Select an Agent --</option>
                        {agents.map(agent => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
                    </select>
                </div>
            ) : (
                <div className="text-center text-yellow-400 bg-yellow-900/50 p-3 rounded-md text-sm">
                    Player registration is temporarily disabled. Please wait for an Agent to be created by the administrator.
                </div>
            )
          )}

          <div>
            <button type="submit" disabled={loading || (!isLoginView && !canRegisterPlayer)}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-800 focus:ring-red-500 disabled:bg-red-800/50 disabled:cursor-not-allowed transition">
              {loading ? (isLoginView ? 'Signing in...' : 'Creating Account...') : (isLoginView ? 'Sign In' : 'Create Account')}
            </button>
          </div>
        </form>
         <p className="text-center text-sm text-gray-400">
            {isLoginView ? "Don't have an account?" : "Already have an account?"}
            <button onClick={toggleView} className="font-medium text-red-500 hover:text-red-400 ml-1">
                {isLoginView ? 'Sign Up' : 'Sign In'}
            </button>
        </p>
      </div>
    </div>
  );
};

export default AuthForm;