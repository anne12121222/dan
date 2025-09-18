
import React, { useState } from 'react';
import { MasterAgent, Agent, AllUserTypes, UserRole, MasterAgentViewProps, FightStatus } from '../types';
import TransactionHistory from './TransactionHistory';
import PendingCoinRequests from './PendingCoinRequests';
import ChatModal from './ChatModal';
import Card from './common/Card';
import CreateAgentModal from './CreateAgentModal';
import { UsersIcon, UserPlusIcon, ChatBubbleLeftEllipsisIcon } from './common/Icons';
import LiveBetCounts from './LiveBetCounts';

const MasterAgentView: React.FC<MasterAgentViewProps> = ({
  currentUser,
  agents,
  transactions,
  coinRequests,
  onRespondToRequest,
  onCreateAgent,
  onSendMessage,
  messages,
  allUsers,
  onOpenChat,
  chatTargetUser,
  onCloseChat,
  fightStatus,
  fightId,
  betCounts
}) => {
  const [isCreateAgentModalOpen, setCreateAgentModalOpen] = useState(false);

  const handleSendMessage = async (text: string, amount: number) => {
    if (chatTargetUser) {
      await onSendMessage(chatTargetUser.id, text, amount);
    }
  };

  const agentCoinRequests = coinRequests.filter(r => {
    const fromUser = allUsers[r.from_user_id];
    return r.status === 'PENDING' && 
           r.to_user_id === currentUser.id && 
           fromUser?.role === UserRole.AGENT;
  });

  return (
    <>
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-200">Master Agent Dashboard</h2>
            <button 
                onClick={() => setCreateAgentModalOpen(true)}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition flex items-center gap-2"
            >
                <UserPlusIcon className="w-5 h-5" />
                Create Agent
            </button>
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
                                    <p className="font-semibold text-green-400">{agent.name}</p>
                                    <p className="text-sm text-yellow-400">{agent.coinBalance.toLocaleString()} C</p>
                                </div>
                                <button
                                    onClick={() => onOpenChat(agent)}
                                    className="p-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-full transition duration-300"
                                >
                                    <ChatBubbleLeftEllipsisIcon className="w-5 h-5" />
                                </button>
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
        <div className="space-y-6">
            <Card>
                 <div className="p-4">
                    <h3 className="text-lg font-semibold text-gray-200">My Info</h3>
                     <div className="text-sm text-gray-400 mt-2 space-y-2">
                        <p>Commission on Agent Wins: <span className="font-semibold text-gray-300">{(currentUser.commissionRate * 100).toFixed(0)}%</span></p>
                        <p>Coin Transfer Fee: <span className="font-semibold text-gray-300">{(currentUser.transferFee * 100).toFixed(0)}%</span></p>
                        <p>Commission Earned: <span className="font-semibold text-yellow-400">{currentUser.commissionBalance.toLocaleString()} C</span></p>
                    </div>
                 </div>
            </Card>
          {fightId !== null && fightStatus !== FightStatus.SETTLED && <LiveBetCounts counts={betCounts} />}
          <PendingCoinRequests
            requests={agentCoinRequests}
            onRespond={onRespondToRequest}
            allUsers={allUsers}
            title="Agent Coin Requests"
          />
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
      {isCreateAgentModalOpen && (
        <CreateAgentModal
          onClose={() => setCreateAgentModalOpen(false)}
          onSubmit={onCreateAgent}
        />
      )}
    </>
  );
};

export default MasterAgentView;
