
import React, { useState } from 'react';
import { Agent, Player, Transaction, AllUserTypes, CoinRequest } from '../types';
import Card from './common/Card';
import { CoinIcon, UsersIcon, PlusCircleIcon } from './common/Icons';
import TransactionHistory from './TransactionHistory';
import PendingCoinRequests from './PendingCoinRequests';
import RequestCoinsModal from './RequestCoinsModal';

interface AgentViewProps {
  currentUser: Agent;
  players: Player[];
  transactions: Transaction[];
  onOpenChat: (user: AllUserTypes) => void;
  allUsers: { [id: string]: AllUserTypes };
  unreadMessageCounts: { [senderId: string]: number };
  pendingCoinRequests: CoinRequest[];
  onCreateCoinRequest: (amount: number) => Promise<string | null>;
  onRespondToCoinRequest: (requestId: string, response: 'APPROVED' | 'DECLINED') => Promise<string | null>;
}

const AgentView: React.FC<AgentViewProps> = ({
  currentUser,
  players,
  transactions,
  onOpenChat,
  allUsers,
  unreadMessageCounts,
  pendingCoinRequests,
  onCreateCoinRequest,
  onRespondToCoinRequest
}) => {
    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <div className="p-4 border-b border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-200">Agent Dashboard</h2>
            </div>
            <div className="p-4 space-y-4">
                 <div className="flex justify-between items-center">
                    <span className="text-gray-400">Your Coin Balance</span>
                    <div className="flex items-center space-x-2 bg-yellow-500/10 text-yellow-400 px-3 py-1 rounded-full text-lg font-semibold">
                    <CoinIcon className="w-6 h-6" />
                    <span>{currentUser.coinBalance.toLocaleString()}</span>
                    </div>
                 </div>
                 <button
                    onClick={() => setIsRequestModalOpen(true)}
                    className="w-full p-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-base rounded-lg transition duration-300 flex items-center justify-center space-x-2"
                >
                    <PlusCircleIcon className="w-5 h-5"/>
                    <span>Request Coins from Master Agent</span>
                </button>
            </div>
          </Card>

          <PendingCoinRequests
            requests={pendingCoinRequests}
            onRespond={onRespondToCoinRequest}
            allUsers={allUsers}
            title="Player Coin Requests"
          />

          <Card>
            <div className="p-4 border-b border-gray-700 flex items-center space-x-2">
              <UsersIcon className="w-6 h-6 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-200">Manage Players</h3>
            </div>
            <ul className="divide-y divide-gray-800">
              {players.map(player => {
                const unreadCount = unreadMessageCounts[player.id] || 0;
                return (
                  <li key={player.id} className="p-4 flex justify-between items-center">
                    <div>
                      <span className="font-semibold text-gray-300">{player.name}</span>
                      <p className="text-sm text-yellow-400">{player.coinBalance.toLocaleString()} C</p>
                    </div>
                    <button
                        onClick={() => onOpenChat(player)}
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
          <TransactionHistory title="Agent Transaction Log" transactions={transactions} allUsers={allUsers} currentUserId={currentUser.id}/>
        </div>
      </div>
      {isRequestModalOpen && (
        <RequestCoinsModal
            onClose={() => setIsRequestModalOpen(false)}
            onSubmit={onCreateCoinRequest}
        />
      )}
    </>
  );
};

export default AgentView;