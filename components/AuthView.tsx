
import React, { useState } from 'react';

interface AuthViewProps {
  onLogin: (email: string, password: string) => Promise<string | null>;
  isSupabaseConfigured: boolean;
}

const AuthView: React.FC<AuthViewProps> = ({ onLogin, isSupabaseConfigured }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        const result = await onLogin(email, password);
        if (result) {
            setError(result);
        }
        setLoading(false);
    };

    if (!isSupabaseConfigured) {
        return (
            <div className="min-h-screen bg-zinc-900 text-white flex items-center justify-center">
                <div className="max-w-md w-full bg-zinc-800 p-8 rounded-lg shadow-xl text-center">
                    <h1 className="text-2xl font-bold text-red-500 mb-4">Configuration Error</h1>
                    <p className="text-gray-300">
                        Supabase has not been configured correctly. Please check the console and update your 
                        <code className="bg-zinc-700 p-1 rounded text-sm mx-1">supabaseClient.ts</code> file.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-900 text-white flex flex-col justify-center items-center p-4">
            <div className="max-w-sm w-full">
                <h1 className="text-3xl font-bold text-center mb-2">International Gamefowl Boxing</h1>
                <p className="text-center text-gray-400 mb-8">Please sign in to continue</p>
                <div className="bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl p-8">
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                                Email Address
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="mt-1 block w-full bg-zinc-700 border border-zinc-600 rounded-md py-2 px-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                placeholder="you@example.com"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                                Password
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="mt-1 block w-full bg-zinc-700 border border-zinc-600 rounded-md py-2 px-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                placeholder="••••••••"
                            />
                        </div>

                        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

                        <div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-800 focus:ring-red-500 disabled:bg-red-800 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Signing in...' : 'Sign In'}
                            </button>
                        </div>
                    </form>
                </div>
                 <div className="text-center mt-4 text-xs text-gray-500">
                    <p>Demo accounts:</p>
                    <p>operator@test.com / joms@gmail.com / agent1@test.com / player1@test.com</p>
                    <p>Password: 'password' (joms@gmail.com is 'x1qfoega')</p>
                </div>
            </div>
        </div>
    );
};

export default AuthView;
