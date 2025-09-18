
import React, { useState, useMemo } from 'react';
import { Agent, Player, AllUserTypes, UserRole, Transaction, CoinRequest, MasterAgent, AgentViewProps } from '../types.ts';
import Card from './common/Card.tsx';
import { UsersIcon, CoinTransferIcon, ChatBubbleLeftEllipsisIcon } from './common/Icons.tsx';
import TransactionHistory from './TransactionHistory.tsx';
import PendingCoinRequests from './PendingCoinRequests.tsx';
import RequestCoinsModal from './RequestCoinsModal.tsx';
// FIX: Import Trends component.
import Trends from './Trends.tsx';

const AgentView: React.FC<AgentViewProps> = ({
  currentUser,
  players, // Use the pre-filtered list
  transactions,
  coinRequests,
  allUsers,
  onTransferCoins,
  onRespondToRequest,
  onCreateCoinRequest,
  onMasquerade,
  onOpenChat
}) => {
  const [isTransferModalOpen, setTransferModalOpen] = useState(false);
  const [transferTarget, setTransferTarget] = useState<Player | null>(null);
  const [isRequestModalOpen, setRequestModalOpen] = useState(false);

  const myMasterAgent = useMemo(() => {
      return allUsers[currentUser.masterAgentId] as MasterAgent | undefined;
  }, [allUsers, currentUser.masterAgentId]);

  const handleOpenTransferModal = (player: Player) => {
    setTransferTarget(player);
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
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <div className="p-4">
                        <h3 className="text-lg font-semibold text-gray-200">My Info</h3>
                        <p className="text-sm text-gray-400">Bet Win Commission Rate: {currentUser.commissionRate * 100}%</p>
                        <p className="text-sm text-gray-400">Coin Transfer Fee: {currentUser.transferFee * 100}%</p>
                    </div>
                </Card>
                 <PendingCoinRequests 
                    title="Player Coin Requests"
                    requests={coinRequests}
                    onRespond={onRespondToRequest}
                    allUsers={allUsers}
                 />
           </div>
           
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                            <UsersIcon className="w-6 h-6 text-gray-400" />
                            <h3 className="text-lg font-semibold text-gray-200">My Players ({players.length})</h3>
                        </div>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                         {players.length === 0 ? (
                            <p className="text-center text-gray-500 p-4 text-sm">You have no players yet.</p>
                         ) : (
                            <ul className="divide-y divide-gray-800">
                                {players.map(player => (
                                    <li key={player.id} className="p-3 flex justify-between items-center">
                                        <div>
                                            <p className="font-semibold text-blue-400">{player.name}</p>
                                            <p className="text-sm text-yellow-400">{player.coinBalance.toLocaleString()} C</p>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <button onClick={() => handleOpenTransferModal(player)} className="p-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-full transition duration-300">
                                                <CoinTransferIcon className="w-5 h-5" />
                                            </button>
                                            <button onClick={() => onOpenChat(player)} className="p-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-full transition duration-300">
                                                <ChatBubbleLeftEllipsisIcon className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                         )}
                    </div>
                </Card>
              <TransactionHistory title="My Transactions" transactions={transactions} allUsers={allUsers} currentUserId={currentUser.id} />
           </div>
        </div>
        <div className="space-y-6">
           <Card>
                <div className="p-4">
                    <button 
                        onClick={() => setRequestModalOpen(true)}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition"
                      >
                        Request Coins
                      </button>
                </div>
                <div className="p-4 border-t border-gray-700">
                   <h3 className="text-lg font-semibold text-gray-200">My Master Agent</h3>
                    {myMasterAgent ? (
                        <div className="mt-2 text-sm">
                            <p className="font-semibold text-purple-400">{myMasterAgent.name}</p>
                            <p className="text-gray-400">{myMasterAgent.email}</p>
                        </div>
                    ) : (
                        <p className="text-gray-500 mt-2 text-sm">You are not assigned to a master agent.</p>
                    )}
                </div>
            </Card>
            <Trends fightHistory={[]} />
            {/* Live Bets for Current Fight can be added back if Agents need to see it */}
        </div>
      </div>
      
       {isRequestModalOpen && (
          <RequestCoinsModal 
            onClose={() => setRequestModalOpen(false)}
            onSubmit={onCreateCoinRequest}
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

export default AgentView;
