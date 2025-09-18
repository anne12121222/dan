
// Grand Overhaul: This component is now fully functional and displays commission info.
import React, { useState } from 'react';
import { Agent, Player, Transaction, CoinRequest, AllUserTypes, Message, Bet, FightResult, MasterAgent, UserRole } from '../types';
import TransactionHistory from './TransactionHistory';
import PendingCoinRequests from './PendingCoinRequests';
import ChatModal from './ChatModal';
import Card from './common/Card';
import RequestCoinsToMasterAgentModal from './RequestCoinsToMasterAgentModal';
import { UsersIcon, CoinTransferIcon } from './common/Icons';
import LiveBetsList from './LiveBetsList';
import Trends from './Trends';

interface AgentViewProps {
  currentUser: Agent;
  players: Player[];
  transactions: Transaction[];
  coinRequests: CoinRequest[];
  onRespondToRequest: (requestId: string, response: 'APPROVED' | 'DECLINED') => Promise<string | null>;
  onCreateCoinRequest: (amount: number, targetUserId?: string) => Promise<string | null>;
  onSendMessage: (receiverId: string, text: string, amount: number) => Promise<void>;
  messages: { [userId: string]: Message[] };
  allUsers: { [id: string]: AllUserTypes };
  onOpenChat: (user: AllUserTypes) => void;
  chatTargetUser: AllUserTypes | null;
  onCloseChat: () => void;
  fightId: number | null;
  currentBets: Bet[];
  fightHistory: FightResult[];
}

const AgentView: React.FC<AgentViewProps> = ({
  currentUser,
  players,
  transactions,
  coinRequests,
  onRespondToRequest,
  onCreateCoinRequest,
  onSendMessage,
  messages,
  allUsers,
  onOpenChat,
  chatTargetUser,
  onCloseChat,
  fightId,
  currentBets,
  fightHistory
}) => {
  const [isRequestModalOpen, setRequestModalOpen] = useState(false);

  const handleSendMessage = async (text: string, amount: number) => {
    if (chatTargetUser) {
        await onSendMessage(chatTargetUser.id, text, amount);
    }
  };

  const masterAgent = allUsers[currentUser.masterAgentId];
  const masterAgents = Object.values(allUsers).filter(u => u.role === UserRole.MASTER_AGENT) as MasterAgent[];

  return (
    <>
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-2">
                 <h2 className="text-2xl font-bold text-gray-200">Agent Dashboard</h2>
                 <div className="flex items-center gap-2">
                    {masterAgent && (
                         <button 
                            onClick={() => onOpenChat(masterAgent)}
                            className="bg-zinc-600 hover:bg-zinc-700 text-white font-bold py-2 px-4 rounded-lg transition"
                         >
                             Chat with Master Agent
                         </button>
                    )}
                     <button 
                        onClick={() => setRequestModalOpen(true)}
                        className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition"
                     >
                         Request Coins
                     </button>
                 </div>
            </div>
          <Card>
            <div className="p-4 border-b border-gray-700 flex items-center space-x-2">
                <UsersIcon className="w-6 h-6 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-200">My Players ({players.length})</h3>
            </div>
             <div className="max-h-96 overflow-y-auto">
                {players.length > 0 ? (
                    <ul className="divide-y divide-gray-800">
                        {players.map(player => (
                            <li key={player.id} className="p-3 flex justify-between items-center">
                                <div>
                                    <p className="font-semibold text-gray-300">{player.name}</p>
                                    <p className="text-sm text-yellow-400">{player.coinBalance.toLocaleString()} C</p>
                                </div>
                                <button
                                    onClick={() => onOpenChat(player)}
                                    className="p-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-full transition duration-300"
                                    aria-label={`Send coins to ${player.name}`}
                                >
                                    <CoinTransferIcon className="w-5 h-5" />
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-gray-500 text-center p-6">You have no players yet.</p>
                )}
             </div>
          </Card>
           <LiveBetsList bets={currentBets} allUsers={allUsers} fightId={fightId} />
          <TransactionHistory title="My Transactions" transactions={transactions} allUsers={allUsers} currentUserId={currentUser.id} />
        </div>
        <div className="space-y-6">
            <Card>
                 <div className="p-4">
                    <h3 className="text-lg font-semibold text-gray-200">My Info</h3>
                     <div className="text-sm text-gray-400 mt-2 space-y-2">
                        <p>Bet Win Commission Rate: <span className="font-semibold text-gray-300">{(currentUser.commissionRate * 100).toFixed(0)}%</span></p>
                        <p>Coin Transfer Fee: <span className="font-semibold text-gray-300">{(currentUser.transferFee * 100).toFixed(0)}%</span></p>
                    </div>
                 </div>
            </Card>
          <PendingCoinRequests
            requests={coinRequests.filter(r => r.status === 'PENDING')}
            onRespond={onRespondToRequest}
            allUsers={allUsers}
            title="Player Coin Requests"
          />
          <Trends fightHistory={fightHistory} />
        </div>
      </div>
      {chatTargetUser && (
        <ChatModal
          currentUser={currentUser}
          chatTargetUser={chatTargetUser}
          messages={messages[chatTargetUser.id] || []}
          onClose={onCloseChat}
          onSendMessage={handleSendMessage}
        />
      )}
      {isRequestModalOpen && (
          <RequestCoinsToMasterAgentModal 
            onClose={() => setRequestModalOpen(false)}
            onSubmit={onCreateCoinRequest}
            masterAgents={masterAgents}
          />
      )}
    </>
  );
};

export default AgentView;
