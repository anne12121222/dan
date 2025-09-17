// FIX: Implement the MasterAgentView component to resolve module errors.
// This file was previously a placeholder, causing compilation failures.
import React, { useState } from 'react';
import { MasterAgent, Agent, Transaction, AllUserTypes, CoinRequest } from '../types';
import Card from './common/Card';
import { UsersIcon, UserPlusIcon, ChatBubbleLeftEllipsisIcon } from './common/Icons';
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
    const [agentName, setAgentName] = useState('');
    const [agentEmail, setAgentEmail] = useState('');
    const [agentPassword, setAgentPassword] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);

    const handleCreateAgent = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsCreating(true);
        setCreateError(null);
        const result = await onCreateAgent(agentName, agentEmail, agentPassword);
        if (result) {
            setCreateError(result);
        } else {
            setAgentName('');
            setAgentEmail('');
            setAgentPassword('');
        }
        setIsCreating(false);
    };


  return (
    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <h2 className="text-2xl font-bold text-gray-200">Master Agent Dashboard</h2>
        <Card>
            <div className="p-4 border-b border-gray-700 flex items-center space-x-2">
                <UsersIcon className="w-6 h-6 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-200">My Agents ({agents.length})</h3>
            </div>
             <div className="p-2 bg-zinc-900/50 text-center text-sm">
                Commission Balance: <span className="font-bold text-green-400">{currentUser.commissionBalance.toLocaleString()} C</span>
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
                ) : <p className="text-gray-500 text-center p-6">No agents assigned yet. Use the form to create one.</p>}
            </div>
        </Card>
        <PendingCoinRequests requests={pendingCoinRequests} onRespond={onRespondToCoinRequest} allUsers={allUsers} title="Agent Coin Requests" />
      </div>
      <div className="space-y-6">
        <Card>
            <div className="p-4 border-b border-gray-700 flex items-center space-x-2">
                <UserPlusIcon className="w-6 h-6 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-200">Create New Agent</h3>
            </div>
            <form onSubmit={handleCreateAgent} className="p-4 space-y-4">
                {createError && <p className="text-red-400 bg-red-900/50 p-2 rounded text-sm">{createError}</p>}
                <div>
                    <label htmlFor="agent-name" className="block text-sm font-medium text-gray-300">Agent Name</label>
                    <input id="agent-name" type="text" value={agentName} onChange={(e) => setAgentName(e.target.value)} required className="mt-1 w-full bg-zinc-700 text-white p-2 rounded border border-zinc-600 focus:ring-2 focus:ring-red-500 focus:outline-none transition" />
                </div>
                <div>
                    <label htmlFor="agent-email" className="block text-sm font-medium text-gray-300">Email</label>
                    <input id="agent-email" type="email" value={agentEmail} onChange={(e) => setAgentEmail(e.target.value)} required className="mt-1 w-full bg-zinc-700 text-white p-2 rounded border border-zinc-600 focus:ring-2 focus:ring-red-500 focus:outline-none transition" />
                </div>
                <div>
                    <label htmlFor="agent-password" className="block text-sm font-medium text-gray-300">Password</label>
                    <input id="agent-password" type="password" value={agentPassword} onChange={(e) => setAgentPassword(e.target.value)} required minLength={6} className="mt-1 w-full bg-zinc-700 text-white p-2 rounded border border-zinc-600 focus:ring-2 focus:ring-red-500 focus:outline-none transition" />
                </div>
                <button type="submit" disabled={isCreating} className="w-full p-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition disabled:bg-red-800/50">
                    {isCreating ? 'Creating...' : 'Create Agent'}
                </button>
            </form>
        </Card>
        <TransactionHistory title="My Transactions" transactions={transactions} allUsers={allUsers} currentUserId={currentUser.id} />
      </div>
    </div>
  );
};

export default MasterAgentView;
