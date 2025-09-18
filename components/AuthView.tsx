
import React, { useState } from 'react';

interface AuthViewProps {
  onLogin: (email: string, password: string) => Promise<string | null>;
  onRegister: (name: string, email: string, password: string) => Promise<string | null>;
  isSupabaseConfigured: boolean;
}

const AuthView: React.FC<AuthViewProps> = ({ onLogin, onRegister, isSupabaseConfigured }) => {
  const [isLoginView, setIsLoginView] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    let result: string | null = null;
    if (isLoginView) {
      result = await onLogin(email, password);
    } else {
      // Player registers without an agent initially.
      result = await onRegister(name, email, password);
    }
    if (result) {
      setError(result);
    }
    setLoading(false);
  };

  if (!isSupabaseConfigured) {
    return (
      <div className="flex items-center justify-center h-screen bg-zinc-900 text-white">
        <div className="text-center p-8 bg-zinc-800 rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold text-red-500 mb-4">Configuration Error</h1>
          <p className="text-gray-300">Supabase has not been configured.</p>
          <p className="text-gray-400 mt-2 text-sm">Please check your configuration.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-900 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-center text-white mb-4">Reality Boxing Federation</h1>
        <p className="text-center text-gray-400 mb-6">Please create an account to continue</p>
        <div className="bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl p-8">
          <div className="flex border-b border-zinc-700 mb-6">
            <button
              onClick={() => { setIsLoginView(true); setError(null); }}
              className={`flex-1 py-2 text-sm font-semibold transition-colors ${isLoginView ? 'text-red-400 border-b-2 border-red-400' : 'text-gray-400 hover:text-white'}`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setIsLoginView(false); setError(null); }}
              className={`flex-1 py-2 text-sm font-semibold transition-colors ${!isLoginView ? 'text-red-400 border-b-2 border-red-400' : 'text-gray-400 hover:text-white'}`}
            >
              Create Account
            </button>
          </div>
          <form onSubmit={handleAuthAction} className="space-y-4">
            {error && <p className="bg-red-500/10 text-red-400 text-sm p-3 rounded-md">{error}</p>}
            
            {!isLoginView && (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full bg-zinc-700 text-white p-2 rounded border border-zinc-600 focus:ring-2 focus:ring-red-500 focus:outline-none transition"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-zinc-700 text-white p-2 rounded border border-zinc-600 focus:ring-2 focus:ring-red-500 focus:outline-none transition"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-zinc-700 text-white p-2 rounded border border-zinc-600 focus:ring-2 focus:ring-red-500 focus:outline-none transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full p-3 font-bold rounded-lg transition bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : (isLoginView ? 'Sign In' : 'Create Account')}
            </button>
             <p className="text-center text-sm text-gray-400 pt-4">
                {isLoginView ? "Don't have an account?" : "Already have an account?"}
                <button
                  type="button"
                  onClick={() => setIsLoginView(!isLoginView)}
                  className="font-semibold text-red-400 hover:text-red-500 ml-1"
                >
                  {isLoginView ? 'Sign Up' : 'Sign In'}
                </button>
              </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AuthView;