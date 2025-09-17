import React from 'react';
import { Agent, Player, Transaction, AllUserTypes, CoinRequest } from '../types';
import Card from './common/Card';
import { UsersIcon, ChatBubbleLeftEllipsisIcon, CoinIcon } from './common/Icons';
import TransactionHistory from './TransactionHistory';
import PendingCoinRequests from './PendingCoinRequests';

interface AgentViewProps {
  currentUser: Agent;
  players: Player[];
  transactions: Transaction[];
  onOpenChat: (targetUser: AllUserTypes) => void;
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
  pendingCoinRequests,
  onCreateCoinRequest,
  onRespondToCoinRequest
}) => {
    const [requestAmount, setRequestAmount] = React.useState('');
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const handleRequestCoins = async (e: React.FormEvent) => {
        e.preventDefault();
        const amount = parseInt(requestAmount, 10);
        if (amount > 0) {
            setIsSubmitting(true);
            await onCreateCoinRequest(amount);
            setIsSubmitting(false);
            setRequestAmount('');
        }
    };
  
    return (
    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <h2 className="text-2xl font-bold text-gray-200">Agent Dashboard</h2>
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
                                <button onClick={() => onOpenChat(player)} className="p-2 hover:bg-zinc-700 rounded-full">
                                    <ChatBubbleLeftEllipsisIcon className="w-6 h-6 text-gray-400" />
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : <p className="text-gray-500 text-center p-6">No players assigned yet.</p>}
            </div>
        </Card>
        <PendingCoinRequests requests={pendingCoinRequests} onRespond={onRespondToCoinRequest} allUsers={allUsers} title="Player Coin Requests" />
      </div>
      <div className="space-y-6">
         <Card>
            <div className="p-4 border-b border-gray-700 flex items-center space-x-2">
                <CoinIcon className="w-6 h-6 text-yellow-400" />
                <h3 className="text-lg font-semibold text-gray-200">Request Coins</h3>
            </div>
            <form onSubmit={handleRequestCoins} className="p-4 space-y-2">
                 <input type="number" placeholder="Amount" value={requestAmount} onChange={e => setRequestAmount(e.target.value)} required min="1" className="w-full bg-zinc-700 text-white p-2 rounded border border-zinc-600 focus:ring-2 focus:ring-red-500 focus:outline-none transition" />
                 <button type="submit" disabled={isSubmitting} className="w-full p-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition disabled:bg-red-800/50">
                    {isSubmitting ? 'Requesting...' : 'Request from Master Agent'}
                 </button>
            </form>
         </Card>
        <TransactionHistory title="My Transactions" transactions={transactions} allUsers={allUsers} currentUserId={currentUser.id} />
      </div>
    </div>
  );
};

export default AgentView;
