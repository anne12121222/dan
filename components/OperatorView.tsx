import React from 'react';
// FIX: Add .ts extension to fix module resolution.
import { Operator, FightStatus, FightResult, UpcomingFight, Bet, AllUserTypes, FightWinner, UserRole, MasterAgent, Agent, Message } from '../types.ts';
import LiveFeed from './LiveFeed.tsx';
import WinnerDeclaration from './WinnerDeclaration.tsx';
import CompletedFightsList from './CompletedFightsList.tsx';
import UpcomingFightsList from './UpcomingFightsList.tsx';
import LiveBetsList from './LiveBetsList.tsx';
import AddUpcomingFightForm from './AddUpcomingFightForm.tsx';
import Card from './common/Card.tsx';
import { UsersIcon, ChatBubbleLeftEllipsisIcon } from './common/Icons.tsx';
import Trends from './Trends.tsx';

interface OperatorViewProps {
  currentUser: Operator;
  fightStatus: FightStatus;
  lastWinner: FightWinner | null;
  fightId: number | null;
  timer: number;
  fightHistory: FightResult[];
  upcomingFights: UpcomingFight[];
  currentBets: Bet[];
  allUsers: { [id: string]: AllUserTypes };
  onStartNextFight: () => void;
  onCloseBetting: () => void;
  onDeclareWinner: (winner: FightWinner) => void;
  onAddUpcomingFight: (red: string, white: string) => Promise<string | null>;
  onExitMasquerade?: () => void;
  onOpenChat: (user: AllUserTypes) => void;
  chatTargetUser: AllUserTypes | null;
  onCloseChat: () => void;
  onSendMessage: (receiverId: string, text: string, amount: number) => Promise<void>;
  messages: { [userId: string]: Message[] };
}

const OperatorView: React.FC<OperatorViewProps> = ({
  currentUser,
  fightStatus,
  lastWinner,
  fightId,
  timer,
  fightHistory,
  upcomingFights,
  currentBets,
  allUsers,
  onStartNextFight,
  onCloseBetting,
  onDeclareWinner,
  onAddUpcomingFight,
  onExitMasquerade,
  onOpenChat,
}) => {
  const isBettingClosed = fightStatus === FightStatus.BETTING_CLOSED;

  const masterAgents = Object.values(allUsers).filter(u => u.role === UserRole.MASTER_AGENT) as MasterAgent[];
  const agents = Object.values(allUsers).filter(u => u.role === UserRole.AGENT) as Agent[];

  return (
    <>
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <h2 className="text-2xl font-bold text-gray-200">Operator Dashboard</h2>
            <div className="flex items-center gap-2 flex-wrap">
                {onExitMasquerade && (
                    <button onClick={onExitMasquerade} className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded-lg transition">
                        Return to My Dashboard
                    </button>
                )}
            </div>
          </div>
          <LiveFeed fightStatus={fightStatus} lastWinner={lastWinner} fightId={fightId} timer={timer} />

          {fightStatus === FightStatus.SETTLED && (
            <button
              onClick={onStartNextFight}
              disabled={upcomingFights.length === 0}
              className="w-full p-4 bg-green-600 hover:bg-green-700 text-white font-bold text-lg rounded-lg transition duration-300 disabled:bg-green-800/50 disabled:cursor-not-allowed"
            >
              {upcomingFights.length > 0 ? 'Start Next Fight' : 'Add an upcoming fight to begin'}
            </button>
          )}

          {fightStatus === FightStatus.BETTING_OPEN && (
            <button
              onClick={onCloseBetting}
              className="w-full p-4 bg-yellow-600 hover:bg-yellow-700 text-white font-bold text-lg rounded-lg transition duration-300"
            >
              Close Betting
            </button>
          )}
          
          {isBettingClosed && (
              <WinnerDeclaration onDeclareWinner={onDeclareWinner} disabled={!isBettingClosed}/>
          )}

          <LiveBetsList bets={currentBets} allUsers={allUsers} fightId={fightId} />
        </div>
        <div className="space-y-6">
          <AddUpcomingFightForm onAddFight={onAddUpcomingFight} />
           <Card>
                <div className="p-4 border-b border-gray-700 flex items-center space-x-2">
                    <UsersIcon className="w-6 h-6 text-gray-400" />
                    <h3 className="text-lg font-semibold text-gray-200">User Management</h3>
                </div>
                <div className="max-h-96 overflow-y-auto">
                    <ul className="divide-y divide-gray-800">
                        {masterAgents.map(ma => (
                            <li key={ma.id} className="p-3 flex justify-between items-center">
                                <div>
                                    <p className="font-semibold text-purple-400">{ma.name} <span className="text-xs text-gray-500">(Master Agent)</span></p>
                                    <p className="text-sm text-yellow-400">{ma.coinBalance.toLocaleString()} C</p>
                                </div>
                                <button onClick={() => onOpenChat(ma)} className="p-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-full transition duration-300">
                                    <ChatBubbleLeftEllipsisIcon className="w-5 h-5" />
                                </button>
                            </li>
                        ))}
                         {agents.map(a => (
                            <li key={a.id} className="p-3 flex justify-between items-center">
                                <div>
                                    <p className="font-semibold text-green-400">{a.name} <span className="text-xs text-gray-500">(Agent)</span></p>
                                    <p className="text-sm text-yellow-400">{a.coinBalance.toLocaleString()} C</p>
                                </div>
                                <button onClick={() => onOpenChat(a)} className="p-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-full transition duration-300">
                                    <ChatBubbleLeftEllipsisIcon className="w-5 h-5" />
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            </Card>
          <Trends fightHistory={fightHistory} />
          <UpcomingFightsList fights={upcomingFights} />
          <CompletedFightsList fights={fightHistory} currentUserRole={currentUser.role} />
        </div>
      </div>
    </>
  );
};

export default OperatorView;