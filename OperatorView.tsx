
// FIX: Replaced placeholder content with the full component code and adjusted import paths.
import React from 'react';
import { Operator, FightStatus, FightResult, UpcomingFight, Bet, AllUserTypes, FightWinner } from './types';
import LiveFeed from './components/LiveFeed';
import WinnerDeclaration from './components/WinnerDeclaration';
import CompletedFightsList from './components/CompletedFightsList';
import UpcomingFightsList from './components/UpcomingFightsList';
import LiveBetsList from './components/LiveBetsList';
import AddUpcomingFightForm from './components/AddUpcomingFightForm';

interface OperatorViewProps {
  currentUser: Operator;
  fightStatus: FightStatus;
  lastWinner: FightWinner | null;
  fightId: number;
  timer: number;
  fightHistory: FightResult[];
  upcomingFights: UpcomingFight[];
  currentBets: Bet[];
  allUsers: { [id: string]: AllUserTypes };
  onStartNextFight: () => void;
  onCloseBetting: () => void;
  onDeclareWinner: (winner: FightWinner) => void;
  onAddUpcomingFight: (red: string, white: string) => Promise<string | null>;
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
}) => {
  const isBettingClosed = fightStatus === FightStatus.BETTING_CLOSED;

  return (
    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <h2 className="text-2xl font-bold text-gray-200">Operator Dashboard</h2>
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

        {/* FIX: Pass the 'fightId' prop to LiveBetsList as it is required. */}
        <LiveBetsList bets={currentBets} allUsers={allUsers} fightId={fightId} />
      </div>
      <div className="space-y-6">
        <AddUpcomingFightForm onAddFight={onAddUpcomingFight} />
        <UpcomingFightsList fights={upcomingFights} />
        <CompletedFightsList fights={fightHistory} currentUserRole={currentUser.role} />
      </div>
    </div>
  );
};

export default OperatorView;
