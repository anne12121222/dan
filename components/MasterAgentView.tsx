import React, { useState } from 'react';
import { MasterAgent, Agent, Transaction, AllUserTypes, CoinRequest } from '../types';
import Card from './common/Card';
import { CoinIcon, UsersIcon, UserPlusIcon, XMarkIcon } from './common/Icons';
import TransactionHistory from './TransactionHistory';
import PendingCoinRequests from './PendingCoinRequests';

interface CreateAgentModalProps {
    onClose: () => void;
    onSubmit: (name: string, email: string, password: string) => Promise<string | null>;
}

const CreateAgentModal: React.FC<CreateAgentModalProps> = ({ onClose, onSubmit }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        const result = await onSubmit(name, email, password);
        if (result) {
            setError(result);
            setLoading(false);
        } else {
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-zinc-800 rounded-lg shadow-2xl border border-zinc-700 w-full max-w-md">
                <form onSubmit={handleSubmit}>
                    <div className="p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-200">Create New Agent</h3>
                            <button type="button" onClick={onClose} className="text-gray-400 hover:text-white">
                                <XMarkIcon className="w-6 h-6"/>
                            </button>
                        </div>
                        {error && <p className="text-red-400 text-center text-sm p-2 mb-2 bg-red-900/50 rounded-md">{error}</p>}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Agent Name</label>
                                <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full bg-zinc-700 text-white p-2 rounded border border-zinc-600 focus:ring-2 focus:ring-blue-500 focus:outline-none transition" disabled={loading} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Agent Email</label>
                                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full bg-zinc-700 text-white p-2 rounded border border-zinc-600 focus:ring-2 focus:ring-blue-500 focus:outline-none transition" disabled={loading} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Password</label>
                                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full bg-zinc-700 text-white p-2 rounded border border-zinc-600 focus:ring-2 focus:ring-blue-500 focus:outline-none transition" disabled={loading} />
                            </div>
                        </div>
                    </div>
                    <div className="p-4 bg-zinc-900/50 rounded-b-lg">
                        <button type="submit" className="w-full p-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition disabled:bg-blue-800/50 disabled:cursor-not-allowed" disabled={loading}>
                            {loading ? 'Creating...' : 'Create Agent'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};


interface MasterAgentViewProps {
  currentUser: MasterAgent;
  agents: Agent[];
  transactions: Transaction[];
  onOpenChat: (user: AllUserTypes) => void;
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
  unreadMessageCounts,
  pendingCoinRequests,
  onCreateAgent,
  onRespondToCoinRequest
}) => {
  const [isCreateAgentModalOpen, setCreateAgentModalOpen] = useState(false);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <div className="p-4 border-b border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-200">Master Agent Dashboard</h2>
            </div>
            <div className="p-4 space-y-4">
                 <div className="flex justify-between items-center">
                    <span className="text-gray-400">Your Coin Balance</span>
                    <div className="flex items-center space-x-2 bg-yellow-500/10 text-yellow-400 px-3 py-1 rounded-full text-lg font-semibold">
                      <CoinIcon className="w-6 h-6" />
                      <span>{currentUser.coinBalance.toLocaleString()}</span>
                    </div>
                 </div>
                 <div className="flex justify-between items-center">
                    <span className="text-gray-400">Total Commission Earned</span>
                    <div className="flex items-center space-x-2 bg-green-500/10 text-green-400 px-3 py-1 rounded-full text-lg font-semibold">
                      <CoinIcon className="w-6 h-6" />
                      <span>{currentUser.commissionBalance.toLocaleString()}</span>
                    </div>
                 </div>
            </div>
          </Card>

          <PendingCoinRequests
            requests={pendingCoinRequests}
            onRespond={onRespondToCoinRequest}
            allUsers={allUsers}
            title="Agent Coin Requests"
          />

          <Card>
            <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                <div className="flex items-center space-x-2">
                    <UsersIcon className="w-6 h-6 text-gray-400" />
                    <h3 className="text-lg font-semibold text-gray-200">Manage Agents</h3>
                </div>
                 <button 
                    onClick={() => setCreateAgentModalOpen(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition duration-300 text-sm"
                 >
                    <UserPlusIcon className="w-5 h-5"/>
                    <span>Create Agent</span>
                </button>
            </div>
            <ul className="divide-y divide-gray-800">
              {agents.map(agent => {
                const unreadCount = unreadMessageCounts[agent.id] || 0;
                return (
                  <li key={agent.id} className="p-4 flex justify-between items-center">
                    <div>
                      <span className="font-semibold text-gray-300">{agent.name}</span>
                      <p className="text-sm text-yellow-400">{agent.coinBalance.toLocaleString()} C</p>
                    </div>
                    <button
                        onClick={() => onOpenChat(agent)}
                        className="relative px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition duration-300 text-sm"
                      >
                        Chat
                        {unreadCount > 0 && (
                          <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                            {unreadCount}
                          </span>
                        )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>
        <div className="lg:col-span-1">
          <TransactionHistory title="Master Agent Transaction Log" transactions={transactions} allUsers={allUsers} currentUserId={currentUser.id}/>
        </div>
      </div>
       {isCreateAgentModalOpen && (
        <CreateAgentModal
            onClose={() => setCreateAgentModalOpen(false)}
            onSubmit={onCreateAgent}
        />
      )}
    </>
  );
};

export default MasterAgentView;
