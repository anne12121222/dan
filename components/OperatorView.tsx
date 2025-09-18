import React, { useState } from 'react';
// FIX: Widen type to handle all possible fight outcomes.
import { Operator, FightStatus, FightResult, UpcomingFight, Bet, AllUserTypes, FightWinner } from '../types';
import LiveFeed from './LiveFeed';
import WinnerDeclaration from './WinnerDeclaration';
import CompletedFightsList from './CompletedFightsList';
import UpcomingFightsList from './UpcomingFightsList';
import LiveBetsList from './LiveBetsList';
import AddUpcomingFightForm from './AddUpcomingFightForm';
import CreateMasterAgentModal from './CreateMasterAgentModal';
import { UserPlusIcon } from './common/Icons';

interface OperatorViewProps {
  currentUser: Operator;
  fightStatus: FightStatus;
  // FIX: Widen type to handle all possible fight outcomes.
  lastWinner: FightWinner | null;
  // FIX: Allow fightId to be null for the initial state where no fight exists.
  fightId: number | null;
  timer: number;
  fightHistory: FightResult[];
  upcomingFights: UpcomingFight[];
  currentBets: Bet[];
  allUsers: { [id: string]: AllUserTypes };
  onStartNextFight: () => void;
  onCloseBetting: () => void;
  // FIX: Widen type to handle all possible fight outcomes.
  onDeclareWinner: (winner: FightWinner) => void;
  onAddUpcomingFight: (red: string, white: string) => Promise<string | null>;
  onCreateMasterAgent: (name: string, email: string, password: string) => Promise<string | null>;
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
  onCreateMasterAgent
}) => {
  const isBettingClosed = fightStatus === FightStatus.BETTING_CLOSED;
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);

  return (
    <>
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-200">Operator Dashboard</h2>
             <button
                onClick={() => setCreateModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition flex items-center gap-2"
              >
                <UserPlusIcon className="w-5 h-5" />
                Create Master Agent
            </button>
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
          <UpcomingFightsList fights={upcomingFights} />
          <CompletedFightsList fights={fightHistory} currentUserRole={currentUser.role} />
        </div>
      </div>
      {isCreateModalOpen && (
        <CreateMasterAgentModal 
          onClose={() => setCreateModalOpen(false)}
          onSubmit={onCreateMasterAgent}
        />
      )}
    </>
  );
};

export default OperatorView;