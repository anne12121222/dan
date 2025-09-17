

import React, { useState } from 'react';
import { MasterAgent, Agent, Transaction, AllUserTypes, UserRole, FightResult, UpcomingFight, Player, Bet, FightStatus, CoinRequest } from '../types';
import Card from './common/Card';
import { CoinIcon, UsersIcon, UserPlusIcon, VideoCameraIcon } from './common/Icons';
import TransactionHistory from './TransactionHistory';
import LiveFeed from './LiveFeed';
import CompletedFightsList from './CompletedFightsList';
import UpcomingFightsList from './UpcomingFightsList';
import LiveBetsList from './LiveBetsList';
import PendingCoinRequests from './PendingCoinRequests';

interface MasterAgentViewProps {
  currentUser: MasterAgent;
  agents: Agent[];
  players: Player[];
  transactions: Transaction[];
  fightHistory: FightResult[];
  onOpenChat: (user: AllUserTypes) => void;
  allUsers: { [id: string]: AllUserTypes };
  onCreateUser: (name: string, email: string, password: string, role: UserRole.AGENT | UserRole.OPERATOR) => Promise<string | null>;
  fightStatus: FightStatus;
  // FIX: Widen type to handle all possible fight outcomes.
  lastWinner: 'RED' | 'WHITE' | 'DRAW' | 'CANCELLED' | null;
  fightId: number;
  timer: number;
  upcomingFights: UpcomingFight[];
  currentBets: Bet[];
  unreadMessageCounts: { [senderId: string]: number };
  pendingCoinRequests: CoinRequest[];
  onRespondToCoinRequest: (requestId: string, response: 'APPROVED' | 'DECLINED') => Promise<string | null>;
}

const MasterAgentView: React.FC<MasterAgentViewProps> = ({
  currentUser,
  agents,
  players,
  transactions,
  fightHistory,
  onOpenChat,
  allUsers,
  onCreateUser,
  fightStatus,
  lastWinner,
  fightId,
  timer,
  upcomingFights,
  currentBets,
  unreadMessageCounts,
  pendingCoinRequests,
  onRespondToCoinRequest,
}) => {
  const [isLiveView, setIsLiveView] = useState(false);

  if (isLiveView) {
    return (
        <div>
            <button
                onClick={() => setIsLiveView(false)}
                className="mb-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition"
            >
                &larr; Back to Dashboard
            </button>
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <LiveFeed fightStatus={fightStatus} lastWinner={lastWinner} fightId={fightId} timer={timer} />
                    <LiveBetsList bets={currentBets} allUsers={allUsers} />
                </div>
                <div className="space-y-6">
                    <UpcomingFightsList fights={upcomingFights} />
                    <CompletedFightsList fights={fightHistory} currentUserRole={currentUser.role}/>
                </div>
            </div>
        </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="flex justify-between items-start">
            <h2 className="text-2xl font-bold text-gray-200">Master Agent Dashboard</h2>
             <button
                onClick={() => setIsLiveView(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white font-bold rounded-lg transition"
            >
                <VideoCameraIcon className="w-5 h-5"/>
                <span>View Live Fight</span>
            </button>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
             <Card>
                <div className="p-4">
                    <p className="text-gray-400">Your Coin Balance</p>
                    <p className="text-3xl font-bold text-yellow-400 flex items-center"><CoinIcon className="w-7 h-7 mr-2"/>{currentUser.coinBalance.toLocaleString()}</p>
                </div>
            </Card>
            <Card>
                <div className="p-4">
                    <p className="text-gray-400">Commission Earnings</p>
                    <p className="text-3xl font-bold text-green-400">{currentUser.commissionBalance.toLocaleString()}</p>
                </div>
            </Card>
        </div>

        <PendingCoinRequests
            requests={pendingCoinRequests}
            onRespond={onRespondToCoinRequest}
            allUsers={allUsers}
            title="Agent Coin Requests"
        />

        <CreateUserForm onCreateUser={onCreateUser} />

        <Card>
          <div className="p-4 border-b border-gray-700 flex items-center space-x-2">
            <UsersIcon className="w-6 h-6 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-200">Manage Agents ({agents.length})</h3>
          </div>
          <ul className="divide-y divide-gray-800 max-h-96 overflow-y-auto">
            {agents.map(agent => {
                const unreadCount = unreadMessageCounts[agent.id] || 0;
                return (
                  <li key={agent.id} className="p-4 flex justify-between items-center">
                    <div>
                      <span className="font-semibold text-gray-300">{agent.name}</span>
                      <p className="text-sm text-yellow-400">{agent.coinBalance.toLocaleString()} C</p>
                    </div>
                    <button
                        onClick={() => onOpenChat(agent)}
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
       <div className="lg:col-span-1 space-y-6">
         <Card>
            <div className="p-4 border-b border-gray-700">
                <h3 className="text-lg font-semibold text-gray-200">Platform Player Monitoring</h3>
            </div>
            <ul className="divide-y divide-gray-800 max-h-[400px] overflow-y-auto">
                {players.map(player => (
                    <li key={player.id} className="p-3">
                        <p className="font-semibold text-gray-300">{player.name}</p>
                        <div className="flex justify-between items-center text-sm">
                           <p className="text-gray-400">Agent: {allUsers[player.agentId]?.name || 'N/A'}</p>
                           <p className="text-yellow-400 font-mono">{player.coinBalance.toLocaleString()} C</p>
                        </div>
                    </li>
                ))}
            </ul>
         </Card>
        <TransactionHistory title="Global Transaction Log" transactions={transactions} allUsers={allUsers} currentUserId={currentUser.id}/>
      </div>
    </div>
  );
};

const CreateUserForm: React.FC<{onCreateUser: MasterAgentViewProps['onCreateUser']}> = ({ onCreateUser }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<UserRole.AGENT | UserRole.OPERATOR>(UserRole.AGENT);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        const result = await onCreateUser(name, email, password, role);
        if (result) {
            setError(result);
        } else {
            setSuccess(`Successfully created ${role.toLowerCase()}: ${name}`);
            setName('');
            setEmail('');
            setPassword('');
            setTimeout(() => setSuccess(null), 3000);
        }
    };

    return (
        <Card>
            <button onClick={() => setIsOpen(!isOpen)} className="w-full text-left p-4 border-b border-gray-700 flex items-center space-x-2">
                <UserPlusIcon className="w-6 h-6 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-200">Create New User</h3>
            </button>
            {isOpen && (
                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                    {success && <p className="text-green-500 text-sm text-center">{success}</p>}
                    
                    <select value={role} onChange={e => setRole(e.target.value as any)} className="w-full bg-zinc-700 text-white p-2 rounded">
                        <option value={UserRole.AGENT}>Agent</option>
                        <option value={UserRole.OPERATOR}>Operator</option>
                    </select>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Full Name" required className="w-full bg-zinc-700 text-white p-2 rounded"/>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email Address" required className="w-full bg-zinc-700 text-white p-2 rounded"/>
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required className="w-full bg-zinc-700 text-white p-2 rounded"/>
                    
                    <button type="submit" className="w-full p-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded">
                        Create User
                    </button>
                </form>
            )}
        </Card>
    )
}

export default MasterAgentView;
