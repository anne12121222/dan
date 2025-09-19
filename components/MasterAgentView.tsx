import React, { useState } from 'react';
import { MasterAgent, Agent, AllUserTypes, Transaction, CoinRequest } from '../types.ts';
import Card from './common/Card.tsx';
import { UsersIcon, UserPlusIcon, ChatBubbleLeftEllipsisIcon } from './common/Icons.tsx';
import TransactionHistory from './TransactionHistory.tsx';
import PendingCoinRequests from './PendingCoinRequests.tsx';
import CreateAgentModal from './CreateAgentModal.tsx';
import CreateMasterAgentModal from './CreateMasterAgentModal.tsx';
import CreateOperatorModal from './CreateOperatorModal.tsx';


interface MasterAgentViewProps {
  currentUser: MasterAgent;
  myAgents: Agent[];
  allUsers: { [id: string]: AllUserTypes };
  transactions: Transaction[];
  coinRequests: CoinRequest[];
  onRespondToRequest: (requestId: string, response: 'APPROVED' | 'DECLINED') => Promise<string | null>;
  onCreateAgent: (name: string, email: string, password: string) => Promise<string | null>;
  onCreateMasterAgent: (name: string, email: string, password: string) => Promise<string | null>;
  onCreateOperator: (name: string, email: string, password: string) => Promise<string | null>;
  onStartChat: (user: AllUserTypes) => void;
}

const MasterAgentView: React.FC<MasterAgentViewProps> = ({
  currentUser,
  myAgents,
  allUsers,
  transactions,
  coinRequests,
  onRespondToRequest,
  onCreateAgent,
  onCreateMasterAgent,
  onCreateOperator,
  onStartChat,
}) => {
    const [isCreatingAgent, setIsCreatingAgent] = useState(false);
    const [isCreatingMasterAgent, setIsCreatingMasterAgent] = useState(false);
    const [isCreatingOperator, setIsCreatingOperator] = useState(false);


  return (
    <div className="min-h-screen bg-zinc-900 text-white p-4 lg:p-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
            <Card>
                <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                        <UsersIcon className="w-6 h-6 text-gray-400" />
                        <h3 className="text-lg font-semibold text-gray-200">My Agents ({myAgents.length})</h3>
                    </div>
                </div>
                <div className="max-h-96 overflow-y-auto">
                    {myAgents.length > 0 ? (
                        <ul className="divide-y divide-gray-800">
                            {myAgents.map(agent => (
                                <li key={agent.id} className="p-3 flex justify-between items-center">
                                    <div>
                                        <p className="font-semibold text-gray-300">{agent.name}</p>
                                        <p className="text-xs text-gray-500">{agent.email}</p>
                                    </div>
                                    <div className="flex items-center space-x-4">
                                        <p className="text-yellow-400 font-mono text-right">{agent.coinBalance.toLocaleString()} C</p>
                                         <button onClick={() => onStartChat(agent)} className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-zinc-700">
                                            <ChatBubbleLeftEllipsisIcon className="w-6 h-6" />
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-gray-500 text-center p-6">You have no agents yet.</p>
                    )}
                </div>
            </Card>
            <Card>
                 <div className="p-4 border-b border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-200">User Creation</h3>
                </div>
                <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button onClick={() => setIsCreatingAgent(true)} className="flex items-center justify-center space-x-2 p-3 bg-green-600 hover:bg-green-700 rounded-md font-semibold transition">
                        <UserPlusIcon className="w-5 h-5" />
                        <span>New Agent</span>
                    </button>
                    <button onClick={() => setIsCreatingMasterAgent(true)} className="flex items-center justify-center space-x-2 p-3 bg-blue-600 hover:bg-blue-700 rounded-md font-semibold transition">
                        <UserPlusIcon className="w-5 h-5" />
                        <span>New M. Agent</span>
                    </button>
                    <button onClick={() => setIsCreatingOperator(true)} className="flex items-center justify-center space-x-2 p-3 bg-purple-600 hover:bg-purple-700 rounded-md font-semibold transition">
                        <UserPlusIcon className="w-5 h-5" />
                        <span>New Operator</span>
                    </button>
                </div>
            </Card>
          <TransactionHistory title="My Transactions" transactions={transactions} allUsers={allUsers} currentUserId={currentUser.id} />
        </div>
        <div className="space-y-4">
            <Card>
                <div className="p-4">
                    <h3 className="text-lg font-semibold text-gray-200">My Wallet</h3>
                    <p className="text-3xl font-bold text-yellow-400 my-2">{currentUser.coinBalance.toLocaleString()}</p>
                    <h3 className="text-md font-semibold text-gray-300 mt-4">Commission Wallet</h3>
                    <p className="text-2xl font-bold text-green-400">{currentUser.commissionBalance.toLocaleString()}</p>
                </div>
            </Card>
            <PendingCoinRequests title="Agent Coin Requests" requests={coinRequests} onRespond={onRespondToRequest} allUsers={allUsers} />
        </div>
      </div>
      {isCreatingAgent && (
          <CreateAgentModal
            onClose={() => setIsCreatingAgent(false)}
            onSubmit={onCreateAgent}
          />
      )}
       {isCreatingMasterAgent && (
          <CreateMasterAgentModal
            onClose={() => setIsCreatingMasterAgent(false)}
            onSubmit={onCreateMasterAgent}
          />
      )}
      {isCreatingOperator && (
          <CreateOperatorModal
            onClose={() => setIsCreatingOperator(false)}
            onSubmit={onCreateOperator}
          />
      )}
    </div>
  );
};

export default MasterAgentView;