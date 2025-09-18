import React, { useState, useMemo } from 'react';
import { MasterAgent, Agent, Player, AllUserTypes, UserRole, Transaction, CoinRequest, MasterAgentViewProps } from '../types.ts';
import Card from './common/Card.tsx';
import { UsersIcon, CoinTransferIcon, UserPlusIcon, ChatBubbleLeftEllipsisIcon } from './common/Icons.tsx';
import TransactionHistory from './TransactionHistory.tsx';
import CreateAgentModal from './CreateAgentModal.tsx';
import PendingCoinRequests from './PendingCoinRequests.tsx';
import RequestCoinsModal from './RequestCoinsModal.tsx';

const MasterAgentView: React.FC<MasterAgentViewProps> = ({
  currentUser,
  agents, // Use the pre-filtered list
  allUsers,
  transactions,
  coinRequests,
  onTransferCoins,
  onCreateAgent,
  onRespondToRequest,
  onMasquerade,
  onOpenChat,
}) => {
  const [isCreateAgentModalOpen, setCreateAgentModalOpen] = useState(false);
  const [isTransferModalOpen, setTransferModalOpen] = useState(false);
  const [transferTarget, setTransferTarget] = useState<Agent | null>(null);

  const myPlayers = useMemo(() => {
    const agentIds = agents.map(a => a.id);
    return Object.values(allUsers).filter(u => u.role === UserRole.PLAYER && u.agentId && agentIds.includes(u.agentId)) as Player[];
  }, [allUsers, agents]);

  const handleOpenTransferModal = (agent: Agent) => {
    setTransferTarget(agent);
    setTransferModalOpen(true);
  };
  
  const handleTransferSubmit = async (amount: number) => {
    if (!transferTarget) return "No target selected";
    const result = await onTransferCoins(transferTarget.id, amount);
    if (!result) {
      setTransferModalOpen(false);
      return null;
    }
    return result;
  };
  
  return (
    <>
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
           <Card>
                <div className="p-4 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-200">Master Agent Dashboard</h2>
                        <p className="text-gray-400">Welcome, {currentUser.name}</p>
                    </div>
                    <button onClick={() => setCreateAgentModalOpen(true)} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition flex items-center space-x-2">
                        <UserPlusIcon className="w-5 h-5" />
                        <span>Create Agent</span>
                    </button>
                </div>
            </Card>
           <PendingCoinRequests 
            title="Agent Coin Requests"
            requests={coinRequests}
            onRespond={onRespondToRequest}
            allUsers={allUsers}
           />
          <TransactionHistory title="My Transactions" transactions={transactions} allUsers={allUsers} currentUserId={currentUser.id} />
        </div>
        <div className="space-y-6">
           <Card>
                <div className="p-4 flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-200">My Info</h3>
                        <p className="text-sm text-gray-400">Commission on Agent Wins: {currentUser.commissionRate * 100}%</p>
                        <p className="text-sm text-gray-400">Coin Transfer Fee: {currentUser.transferFee * 100}%</p>
                        <p className="text-sm text-green-400 mt-1">Commission Earned: {currentUser.commissionBalance.toLocaleString()} C</p>
                    </div>
                </div>
            </Card>
           <Card>
                <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                        <UsersIcon className="w-6 h-6 text-gray-400" />
                        <h3 className="text-lg font-semibold text-gray-200">My Agents ({agents.length})</h3>
                    </div>
                </div>
                <div className="max-h-96 overflow-y-auto">
                    {agents.length === 0 ? (
                        <p className="text-center text-gray-500 p-4 text-sm">You have no agents yet.</p>
                    ) : (
                        <ul className="divide-y divide-gray-800">
                            {agents.map(agent => (
                                <li key={agent.id} className="p-3">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="font-semibold text-green-400">{agent.name}</p>
                                            <p className="text-sm text-yellow-400">{agent.coinBalance.toLocaleString()} C</p>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <button onClick={() => handleOpenTransferModal(agent)} className="p-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-full transition duration-300">
                                                <CoinTransferIcon className="w-5 h-5" />
                                            </button>
                                            <button onClick={() => onOpenChat(agent)} className="p-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-full transition duration-300">
                                                <ChatBubbleLeftEllipsisIcon className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="mt-2 text-xs text-gray-400">
                                        Players under agent: {myPlayers.filter(p => p.agentId === agent.id).length}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </Card>
        </div>
      </div>
      {isCreateAgentModalOpen && (
        <CreateAgentModal 
          onClose={() => setCreateAgentModalOpen(false)}
          onSubmit={onCreateAgent}
        />
      )}
       {isTransferModalOpen && transferTarget && (
        <RequestCoinsModal
            onClose={() => setTransferModalOpen(false)}
            onSubmit={handleTransferSubmit}
        />
      )}
    </>
  );
};

export default MasterAgentView;
