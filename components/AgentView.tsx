import React, { useState } from 'react';
import { Agent, Player, AllUserTypes, Transaction, CoinRequest, MasterAgent } from '../types.ts';
import Card from './common/Card.tsx';
import { UsersIcon, ChatBubbleLeftEllipsisIcon } from './common/Icons.tsx';
import TransactionHistory from './TransactionHistory.tsx';
import PendingCoinRequests from './PendingCoinRequests.tsx';
import RequestCoinsToMasterAgentModal from './RequestCoinsToMasterAgentModal.tsx';

interface AgentViewProps {
  currentUser: Agent;
  myPlayers: Player[];
  allUsers: { [id: string]: AllUserTypes };
  transactions: Transaction[];
  coinRequests: CoinRequest[];
  masterAgents: MasterAgent[]; // Now receives the full list
  onRespondToRequest: (requestId: string, response: 'APPROVED' | 'DECLINED') => Promise<string | null>;
  onRequestCoins: (amount: number, targetUserId: string) => Promise<string | null>;
  onStartChat: (user: AllUserTypes) => void;
}

const AgentView: React.FC<AgentViewProps> = ({
  currentUser,
  myPlayers,
  allUsers,
  transactions,
  coinRequests,
  masterAgents,
  onRespondToRequest,
  onRequestCoins,
  onStartChat
}) => {
    const [isRequestingCoins, setIsRequestingCoins] = useState(false);

    const assignedMasterAgent = currentUser.masterAgentId ? allUsers[currentUser.masterAgentId] as MasterAgent | undefined : undefined;
    
    const handleRequestSubmit = async (amount: number, targetUserId: string) => {
        return await onRequestCoins(amount, targetUserId);
    };

  return (
    <div className="min-h-screen bg-zinc-900 text-white p-4 lg:p-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
            <Card>
                <div className="p-4 border-b border-gray-700 flex items-center space-x-2">
                    <UsersIcon className="w-6 h-6 text-gray-400" />
                    <h3 className="text-lg font-semibold text-gray-200">My Players ({myPlayers.length})</h3>
                </div>
                <div className="max-h-96 overflow-y-auto">
                    {myPlayers.length > 0 ? (
                        <ul className="divide-y divide-gray-800">
                            {myPlayers.map(player => (
                                <li key={player.id} className="p-3 flex justify-between items-center">
                                    <div>
                                        <p className="font-semibold text-gray-300">{player.name}</p>
                                        <p className="text-xs text-gray-500">{player.email}</p>
                                    </div>
                                    <div className="flex items-center space-x-4">
                                        <p className="text-yellow-400 font-mono text-right">{player.coinBalance.toLocaleString()} C</p>
                                        <button onClick={() => onStartChat(player)} className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-zinc-700">
                                            <ChatBubbleLeftEllipsisIcon className="w-6 h-6" />
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-gray-500 text-center p-6">You have no players yet.</p>
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
                    <div className="grid grid-cols-2 gap-2 mt-2">
                         <button
                            onClick={() => setIsRequestingCoins(true)}
                            className="w-full p-2 bg-yellow-600 hover:bg-yellow-700 text-white font-bold rounded-lg transition"
                        >
                            Request Coins
                        </button>
                        {assignedMasterAgent ? (
                            <button
                                onClick={() => onStartChat(assignedMasterAgent)}
                                className="w-full p-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg transition flex items-center justify-center space-x-2"
                            >
                                <ChatBubbleLeftEllipsisIcon className="w-5 h-5" />
                                <span>Chat M.A.</span>
                            </button>
                        ) : (
                            <div className="w-full p-2 bg-gray-600 text-white font-bold rounded-lg flex items-center justify-center space-x-2 text-center text-xs">
                                <span>No M. Agent Assigned</span>
                            </div>
                        )}
                    </div>
                </div>
            </Card>
            <PendingCoinRequests title="Player Coin Requests" requests={coinRequests} onRespond={onRespondToRequest} allUsers={allUsers} />
        </div>
      </div>
      {isRequestingCoins && (
          <RequestCoinsToMasterAgentModal
            onClose={() => setIsRequestingCoins(false)}
            onSubmit={handleRequestSubmit}
            masterAgents={assignedMasterAgent ? [assignedMasterAgent] : masterAgents}
          />
      )}
    </div>
  );
};

export default AgentView;