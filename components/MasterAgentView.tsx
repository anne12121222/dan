import React, { useState } from 'react';
import { MasterAgent, Agent, Transaction, AllUserTypes, CoinRequest } from '../types';
import Card from './common/Card';
import { UsersIcon, UserPlusIcon, ChatBubbleLeftEllipsisIcon, XMarkIcon } from './common/Icons';
import TransactionHistory from './TransactionHistory';
import PendingCoinRequests from './PendingCoinRequests';

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

const CreateAgentModal: React.FC<{
    onClose: () => void;
    onCreateAgent: (name: string, email: string, password: string) => Promise<string | null>;
}> = ({ onClose, onCreateAgent }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        const result = await onCreateAgent(name, email, password);
        if (result) {
            setError(result);
            setLoading(false);
        } else {
            onClose();
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-800 rounded-lg shadow-2xl border border-zinc-700 w-full max-w-sm">
                <div className="p-4 border-b border-zinc-700 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-200">Create New Agent</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && <p className="text-red-400 text-sm bg-red-900/20 p-2 rounded">{error}</p>}
                    <div>
                        <label className="block text-sm font-medium text-gray-400">Full Name</label>
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 w-full bg-zinc-700 text-white p-2 rounded border border-zinc-600 focus:ring-2 focus:ring-red-500 focus:outline-none transition" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400">Email</label>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1 w-full bg-zinc-700 text-white p-2 rounded border border-zinc-600 focus:ring-2 focus:ring-red-500 focus:outline-none transition" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400">Password</label>
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="mt-1 w-full bg-zinc-700 text-white p-2 rounded border border-zinc-600 focus:ring-2 focus:ring-red-500 focus:outline-none transition" />
                    </div>
                    <button type="submit" disabled={loading} className="w-full p-3 font-bold rounded-lg transition bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed">
                        {loading ? 'Creating Agent...' : 'Create Agent'}
                    </button>
                </form>
            </div>
        </div>
    );
};


const MasterAgentView: React.FC<MasterAgentViewProps> = ({
  currentUser,
  agents,
  transactions,
  onOpenChat,
  allUsers,
  pendingCoinRequests,
  onCreateAgent,
  onRespondToCoinRequest,
}) => {
  const [isCreateAgentModalOpen, setCreateAgentModalOpen] = useState(false);

  return (
    <>
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-200">Master Agent Dashboard</h2>
            <button onClick={() => setCreateAgentModalOpen(true)} className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition">
              <UserPlusIcon className="w-5 h-5" />
              <span>Create Agent</span>
            </button>
          </div>
          
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
              ) : <p className="text-gray-500 text-center p-6">No agents created yet.</p>}
            </div>
          </Card>
          
          <PendingCoinRequests requests={pendingCoinRequests} onRespond={onRespondToCoinRequest} allUsers={allUsers} title="Agent Coin Requests" />
        </div>
        <div className="space-y-6">
          <Card>
             <div className="p-4 border-b border-gray-700">
                <h3 className="text-lg font-semibold text-gray-200">My Commission</h3>
                <p className="text-3xl font-bold text-green-400 mt-1">{(currentUser.commissionBalance || 0).toLocaleString()}</p>
             </div>
          </Card>
          <TransactionHistory title="My Transactions" transactions={transactions} allUsers={allUsers} currentUserId={currentUser.id} />
        </div>
      </div>
      {isCreateAgentModalOpen && <CreateAgentModal onClose={() => setCreateAgentModalOpen(false)} onCreateAgent={onCreateAgent} />}
    </>
  );
};

export default MasterAgentView;
