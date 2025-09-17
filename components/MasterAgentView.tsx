import React from 'react';
import { MasterAgent, Agent, Transaction, AllUserTypes, CoinRequest, UserRole } from '../types';
import Card from './common/Card';
import { UsersIcon, ChatBubbleLeftEllipsisIcon } from './common/Icons';
import TransactionHistory from './TransactionHistory';
import PendingCoinRequests from './PendingCoinRequests';

interface CreateAgentFormProps {
    onCreateAgent: (name: string, email: string, password: string) => Promise<string | null>;
}

const CreateAgentFormInternal: React.FC<CreateAgentFormProps> = ({ onCreateAgent }) => {
    const [name, setName] = React.useState('');
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [error, setError] = React.useState<string | null>(null);
    const [loading, setLoading] = React.useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        const result = await onCreateAgent(name, email, password);
        if (result) {
            setError(result);
        } else {
            setName('');
            setEmail('');
            setPassword('');
        }
        setLoading(false);
    };

    return (
        <Card>
            <div className="p-4 border-b border-gray-700">
                <h3 className="text-lg font-semibold text-gray-200">Create New Agent</h3>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
                {error && <p className="text-red-400 bg-red-900/50 p-2 rounded text-sm">{error}</p>}
                <input type="text" placeholder="Name" value={name} onChange={e => setName(e.target.value)} required className="w-full bg-zinc-700 text-white p-2 rounded border border-zinc-600 focus:ring-2 focus:ring-red-500 focus:outline-none transition" />
                <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full bg-zinc-700 text-white p-2 rounded border border-zinc-600 focus:ring-2 focus:ring-red-500 focus:outline-none transition" />
                <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full bg-zinc-700 text-white p-2 rounded border border-zinc-600 focus:ring-2 focus:ring-red-500 focus:outline-none transition" />
                <button type="submit" disabled={loading} className="w-full p-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition disabled:bg-red-800/50">
                    {loading ? 'Creating...' : 'Create Agent'}
                </button>
            </form>
        </Card>
    );
};


interface MasterAgentViewProps {
  currentUser: MasterAgent;
  agents: Agent[];
  transactions: Transaction[];
  onOpenChat: (targetUser: AllUserTypes) => void;
  allUsers: { [id: string]: AllUserTypes };
  unreadMessageCounts: { [senderId: string]: number };
  pendingCoinRequests: CoinRequest[];
  onCreateAgent: (name: string, email: string, password: string) => Promise<string | null>;
  onRespondToCoinRequest: (requestId: string, response: 'APPROVED' | 'DECLINED') => Promise<string | null>;
}

const MasterAgentView: React.FC<MasterAgentViewProps> = ({
  currentUser,
  agents,
  transactions,
  onOpenChat,
  allUsers,
  pendingCoinRequests,
  onCreateAgent,
  onRespondToCoinRequest
}) => {
  return (
    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <h2 className="text-2xl font-bold text-gray-200">Master Agent Dashboard</h2>
        <Card>
            <div className="p-4 border-b border-gray-700 flex items-center space-x-2">
                <UsersIcon className="w-6 h-6 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-200">My Agents ({agents.length})</h3>
            </div>
            <div className="max-h-96 overflow-y-auto">
                {agents.length > 0 ? (
                    <ul className="divide-y divide-gray-800">
                        {agents.map(agent => (
                            <li key={agent.id} className="p-3 flex justify-between items-center">
                                <div>
                                    <p className="font-semibold text-gray-300">{agent.name}</p>
                                    <p className="text-sm text-yellow-400">{agent.coinBalance.toLocaleString()} C</p>
                                </div>
                                <button onClick={() => onOpenChat(agent)} className="p-2 hover:bg-zinc-700 rounded-full">
                                    <ChatBubbleLeftEllipsisIcon className="w-6 h-6 text-gray-400" />
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : <p className="text-gray-500 text-center p-6">No agents assigned yet.</p>}
            </div>
        </Card>
        <PendingCoinRequests requests={pendingCoinRequests} onRespond={onRespondToCoinRequest} allUsers={allUsers} title="Agent Coin Requests"/>
      </div>
      <div className="space-y-6">
        <CreateAgentFormInternal onCreateAgent={(name, email, password) => onCreateAgent(name, email, password)} />
        <TransactionHistory title="My Transactions" transactions={transactions} allUsers={allUsers} currentUserId={currentUser.id} />
      </div>
    </div>
  );
};

export default MasterAgentView;
