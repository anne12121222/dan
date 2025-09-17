// Grand Overhaul: This component is now fully functional and displays commission info.
import React, { useState } from 'react';
import { MasterAgent, Agent, Transaction, AllUserTypes, Message, FightResult, UserRole } from '../types';
import TransactionHistory from './TransactionHistory';
import ChatModal from './ChatModal';
import Card from './common/Card';
import { UsersIcon, ChatBubbleLeftEllipsisIcon, UserPlusIcon } from './common/Icons';
import CompletedFightsList from './CompletedFightsList';

interface CreateUserFormProps {
  onClose: () => void;
  onCreate: (name: string, email: string, password: string) => Promise<string | null>;
  roleToCreate: 'Agent' | 'Operator';
}

const CreateUserForm: React.FC<CreateUserFormProps> = ({ onClose, onCreate, roleToCreate }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        const result = await onCreate(name, email, password);
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
                <h3 className="text-lg font-bold text-gray-200">Create New {roleToCreate}</h3>
                <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && <p className="text-red-400 text-sm bg-red-900/50 p-2 rounded">{error}</p>}
                    <div>
                        <label className="block text-sm font-medium text-gray-400">{roleToCreate} Name</label>
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 w-full bg-zinc-700 p-2 rounded border border-zinc-600 focus:ring-red-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400">{roleToCreate} Email</label>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1 w-full bg-zinc-700 p-2 rounded border border-zinc-600 focus:ring-red-500" />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-400">Password</label>
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="mt-1 w-full bg-zinc-700 p-2 rounded border border-zinc-600 focus:ring-red-500" />
                    </div>
                    <button type="submit" disabled={loading} className="w-full p-3 font-bold rounded-lg transition bg-red-600 hover:bg-red-700 text-white disabled:opacity-50">
                        {loading ? 'Creating...' : `Create ${roleToCreate}`}
                    </button>
                </form>
            </div>
        </div>
    );
};


interface MasterAgentViewProps {
  currentUser: MasterAgent;
  agents: Agent[];
  transactions: Transaction[];
  fightHistory: FightResult[];
  onCreateAgent: (name: string, email: string, password: string) => Promise<string | null>;
  onCreateOperator: (name: string, email: string, password: string) => Promise<string | null>;
  onSendMessage: (receiverId: string, text: string, amount: number) => Promise<void>;
  messages: { [userId: string]: Message[] };
  allUsers: { [id: string]: AllUserTypes };
}

const MasterAgentView: React.FC<MasterAgentViewProps> = ({
  currentUser,
  agents,
  transactions,
  fightHistory,
  onCreateAgent,
  onCreateOperator,
  onSendMessage,
  messages,
  allUsers,
}) => {
  const [chatTargetUser, setChatTargetUser] = useState<AllUserTypes | null>(null);
  const [isCreateAgentModalOpen, setCreateAgentModalOpen] = useState(false);
  const [isCreateOperatorModalOpen, setCreateOperatorModalOpen] = useState(false);

  const handleSendMessage = async (text: string, amount: number) => {
    if (chatTargetUser) {
        await onSendMessage(chatTargetUser.id, text, amount);
    }
  };

  return (
    <>
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center">
             <h2 className="text-2xl font-bold text-gray-200">Master Agent Dashboard</h2>
             <div className="flex space-x-2">
                 <button onClick={() => setCreateAgentModalOpen(true)} className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition">
                    <UserPlusIcon className="w-5 h-5" />
                    <span>Create Agent</span>
                 </button>
                 <button onClick={() => setCreateOperatorModalOpen(true)} className="flex items-center space-x-2 bg-zinc-700 hover:bg-zinc-600 text-white font-bold py-2 px-4 rounded-lg transition">
                    <UserPlusIcon className="w-5 h-5" />
                    <span>Create Operator</span>
                 </button>
             </div>
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
                                <button
                                    onClick={() => setChatTargetUser(agent)}
                                    className="p-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-full transition duration-300"
                                >
                                    <ChatBubbleLeftEllipsisIcon className="w-5 h-5" />
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-gray-500 text-center p-6">You have no agents yet. Click "Create Agent" to start.</p>
                )}
             </div>
          </Card>
          <TransactionHistory title="My Transactions" transactions={transactions} allUsers={allUsers} currentUserId={currentUser.id} />
        </div>
        <div className="space-y-6">
            <Card>
                 <div className="p-4">
                    <h3 className="text-lg font-semibold text-gray-200">My Commission</h3>
                    <p className="text-3xl font-bold text-green-400 mt-1">{currentUser.commissionBalance.toLocaleString()} C</p>
                    <div className="text-xs text-gray-400 mt-2 space-y-1">
                        <p>Bet Win Commission: <span className="font-semibold text-gray-300">{(currentUser.commissionRate * 100).toFixed(0)}%</span></p>
                        <p>Coin Transfer Fee: <span className="font-semibold text-gray-300">{(currentUser.transferFee * 100).toFixed(0)}%</span></p>
                    </div>
                 </div>
            </Card>
            <CompletedFightsList fights={fightHistory} currentUserRole={currentUser.role} />
        </div>
      </div>
       {chatTargetUser && (
        <ChatModal
          currentUser={currentUser}
          chatTargetUser={chatTargetUser}
          messages={messages[chatTargetUser.id] || []}
          onClose={() => setChatTargetUser(null)}
          onSendMessage={handleSendMessage}
        />
      )}
      {isCreateAgentModalOpen && <CreateUserForm onClose={() => setCreateAgentModalOpen(false)} onCreate={onCreateAgent} roleToCreate="Agent" />}
      {isCreateOperatorModalOpen && <CreateUserForm onClose={() => setCreateOperatorModalOpen(false)} onCreate={onCreateOperator} roleToCreate="Operator" />}
    </>
  );
};

export default MasterAgentView;