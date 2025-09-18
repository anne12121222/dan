import React from 'react';
import { MasterAgent, Agent, Transaction, CoinRequest, AllUserTypes, Message, UserRole, FightStatus, FightWinner, FightResult, UpcomingFight, Bet } from '../types';
import TransactionHistory from './TransactionHistory';
import PendingCoinRequests from './PendingCoinRequests';
import ChatModal from './ChatModal';
import Card from './common/Card';
import { UsersIcon, CoinTransferIcon } from './common/Icons';
import LiveFeed from './LiveFeed';
import UpcomingFightsList from './UpcomingFightsList';
import CompletedFightsList from './CompletedFightsList';
import Trends from './Trends';
import LiveBetsList from './LiveBetsList';

interface MasterAgentViewProps {
  currentUser: MasterAgent;
  agents: Agent[];
  transactions: Transaction[];
  coinRequests: CoinRequest[];
  onRespondToRequest: (requestId: string, response: 'APPROVED' | 'DECLINED') => Promise<string | null>;
  onSendMessage: (receiverId: string, text: string, amount: number) => Promise<void>;
  messages: { [userId: string]: Message[] };
  allUsers: { [id:string]: AllUserTypes };
  onOpenChat: (user: AllUserTypes) => void;
  chatTargetUser: AllUserTypes | null;
  onCloseChat: () => void;
  fightStatus: FightStatus;
  lastWinner: FightWinner | null;
  fightId: number | null;
  timer: number;
  fightHistory: FightResult[];
  upcomingFights: UpcomingFight[];
  onMasquerade: () => void; 
  currentBets: Bet[];
}

const MasterAgentView: React.FC<MasterAgentViewProps> = ({
  currentUser,
  agents,
  transactions,
  coinRequests,
  onRespondToRequest,
  onSendMessage,
  messages,
  allUsers,
  onOpenChat,
  chatTargetUser,
  onCloseChat,
  fightStatus,
  lastWinner,
  fightId,
  timer,
  fightHistory,
  upcomingFights,
  onMasquerade,
  currentBets,
}) => {

  const handleSendMessage = async (text: string, amount: number) => {
    if (chatTargetUser) {
        await onSendMessage(chatTargetUser.id, text, amount);
    }
  };

  return (
    <>
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-2">
                 <h2 className="text-2xl font-bold text-gray-200">Master Agent Dashboard</h2>
                 <div className="flex items-center gap-2 flex-wrap">
                     <button 
                        onClick={onMasquerade}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition"
                     >
                         View as Operator
                     </button>
                 </div>
            </div>
            <LiveFeed fightStatus={fightStatus} lastWinner={lastWinner} fightId={fightId} timer={timer} />
            <LiveBetsList bets={currentBets} allUsers={allUsers} fightId={fightId} />
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
                                    <div className="flex-grow">
                                        <p className="font-semibold text-gray-300">{agent.name}</p>
                                        <div className="text-sm flex gap-4">
                                            <p className="text-yellow-400">Coins: {agent.coinBalance.toLocaleString()}</p>
                                            <p className="text-green-400">Commission: {agent.commissionBalance.toLocaleString()}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => onOpenChat(agent)}
                                        className="p-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition duration-300 flex items-center gap-2 text-sm"
                                    >
                                        <CoinTransferIcon className="w-5 h-5" />
                                        Send Coins / Message
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-gray-500 text-center p-6">You have no agents yet.</p>
                    )}
                </div>
            </Card>
        </div>
        <div className="space-y-6">
            <Card>
                 <div className="p-4 grid grid-cols-2 gap-4">
                    <div>
                        <h4 className="text-sm text-gray-400">My Commission</h4>
                        <p className="text-2xl font-bold text-green-400">{currentUser.commissionBalance.toLocaleString()}</p>
                    </div>
                     <div>
                        <h4 className="text-sm text-gray-400">Comm. Rate</h4>
                        <p className="text-2xl font-bold text-gray-300">{(currentUser.commissionRate * 100).toFixed(0)}%</p>
                    </div>
                 </div>
            </Card>
            <PendingCoinRequests
                requests={coinRequests.filter(r => r.status === 'PENDING')}
                onRespond={onRespondToRequest}
                allUsers={allUsers}
                title="Agent Coin Requests"
            />
            <Trends fightHistory={fightHistory} />
            <UpcomingFightsList fights={upcomingFights} />
            <CompletedFightsList fights={fightHistory} currentUserRole={currentUser.role} />
            <TransactionHistory title="My Transactions" transactions={transactions} allUsers={allUsers} currentUserId={currentUser.id} />
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
    </>
  );
};

export default MasterAgentView;