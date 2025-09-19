import React, { useState } from 'react';
import { MasterAgent, Agent, AllUserTypes, Transaction, CoinRequest } from '../types.ts';
import Card from './common/Card.tsx';
import { UsersIcon, UserPlusIcon } from './common/Icons.tsx';
import TransactionHistory from './TransactionHistory.tsx';
import PendingCoinRequests from './PendingCoinRequests.tsx';
import CreateAgentModal from './CreateAgentModal.tsx';

interface MasterAgentViewProps {
  currentUser: MasterAgent;
  myAgents: Agent[];
  allUsers: { [id: string]: AllUserTypes };
  transactions: Transaction[];
  coinRequests: CoinRequest[];
  onRespondToRequest: (requestId: string, response: 'APPROVED' | 'DECLINED') => Promise<string | null>;
  onCreateAgent: (name: string, email: string, password: string) => Promise<string | null>;
}

const MasterAgentView: React.FC<MasterAgentViewProps> = ({
  currentUser,
  myAgents,
  allUsers,
  transactions,
  coinRequests,
  onRespondToRequest,
  onCreateAgent,
}) => {
    const [isCreatingAgent, setIsCreatingAgent] = useState(false);

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
                    <button onClick={() => setIsCreatingAgent(true)} className="flex items-center space-x-2 px-3 py-1 bg-green-600 hover:bg-green-700 rounded-md text-sm font-semibold">
                        <UserPlusIcon className="w-5 h-5" />
                        <span>New Agent</span>
                    </button>
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
                                    <div className="text-right">
                                        <p className="text-yellow-400 font-mono">{agent.coinBalance.toLocaleString()} C</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-gray-500 text-center p-6">You have no agents yet.</p>
                    )}
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
    </div>
  );
};

export default MasterAgentView;
