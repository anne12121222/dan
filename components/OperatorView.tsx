import React from 'react';
import { Operator, FightStatus, FightWinner, Bet, UpcomingFight, FightResult, AllUserTypes } from '../types.ts';
import LiveFeed from './LiveFeed.tsx';
import BettingPools from './BettingPools.tsx';
import WinnerDeclaration from './WinnerDeclaration.tsx';
import LiveBetsList from './LiveBetsList.tsx';
import AddUpcomingFightForm from './AddUpcomingFightForm.tsx';
import UpcomingFightsList from './UpcomingFightsList.tsx';
import CompletedFightsList from './CompletedFightsList.tsx';
import LiveBetCounts from './LiveBetCounts.tsx';

interface OperatorViewProps {
  currentUser: Operator;
  fightStatus: FightStatus;
  lastWinner: FightWinner | null;
  fightId: number | null;
  timer: number;
  bettingPools: { meron: number; wala: number; };
  liveBets: Bet[];
  upcomingFights: UpcomingFight[];
  completedFights: FightResult[];
  allUsers: { [id: string]: AllUserTypes };
  onDeclareWinner: (winner: 'RED' | 'WHITE' | 'DRAW' | 'CANCELLED') => void;
  onAddUpcomingFight: (red: string, white: string) => Promise<string | null>;
  onStartNextFight: () => void;
  onCloseBetting: () => void;
}

const OperatorView: React.FC<OperatorViewProps> = ({
  fightStatus,
  lastWinner,
  fightId,
  timer,
  bettingPools,
  liveBets,
  upcomingFights,
  completedFights,
  allUsers,
  onDeclareWinner,
  onAddUpcomingFight,
  onStartNextFight,
  onCloseBetting
}) => {

  const canDeclareWinner = fightStatus === FightStatus.BETTING_CLOSED;
  const canStartFight = fightStatus === FightStatus.SETTLED && upcomingFights.length > 0;
  const canCloseBetting = fightStatus === FightStatus.BETTING_OPEN;

  const betCounts = liveBets.reduce((acc, bet) => {
      if (bet.choice === 'RED') acc.red++;
      if (bet.choice === 'WHITE') acc.white++;
      return acc;
  }, { red: 0, white: 0 });

    const getControlStateMessage = () => {
        if (fightStatus === FightStatus.SETTLED) {
            if (upcomingFights.length === 0) {
                return "Add a fight to the queue to begin.";
            }
            return "Ready to start the next fight.";
        }
        if (fightStatus === FightStatus.BETTING_OPEN) {
            return "Betting is currently open.";
        }
        if (fightStatus === FightStatus.BETTING_CLOSED) {
            return "Betting is closed. Declare a winner.";
        }
        return "System is idle.";
    };


  return (
    <div className="min-h-screen bg-zinc-900 text-white p-4 lg:p-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content: Left/Center Column */}
        <div className="lg:col-span-2 space-y-4">
          <LiveFeed
            fightStatus={fightStatus}
            lastWinner={lastWinner}
            fightId={fightId}
            timer={timer}
          />
          <BettingPools pools={bettingPools} />
          <LiveBetCounts counts={betCounts} />
          <LiveBetsList bets={liveBets} allUsers={allUsers} fightId={fightId} />
        </div>

        {/* Sidebar: Right Column */}
        <div className="space-y-4">
          <div className="bg-zinc-800/50 rounded-md p-4 space-y-4">
              <h3 className="text-lg font-semibold text-gray-200 border-b border-zinc-700 pb-2">Operator Controls</h3>
              {canStartFight && (
                <button
                  onClick={onStartNextFight}
                  className="w-full p-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition"
                >
                  Start Next Fight (#{upcomingFights[0].id})
                </button>
              )}
              {canCloseBetting && (
                 <button
                    onClick={onCloseBetting}
                    className="w-full p-3 bg-yellow-600 hover:bg-yellow-700 text-white font-bold rounded-lg transition"
                >
                    Close Betting
                </button>
              )}
              {!canStartFight && !canCloseBetting && (
                <p className="text-sm text-gray-400 text-center py-2">{getControlStateMessage()}</p>
              )}
          </div>
          <WinnerDeclaration
            onDeclareWinner={onDeclareWinner}
            disabled={!canDeclareWinner}
          />
          <AddUpcomingFightForm onAddFight={onAddUpcomingFight} />
          <UpcomingFightsList fights={upcomingFights} />
          <CompletedFightsList fights={completedFights} />
        </div>
      </div>
    </div>
  );
};

export default OperatorView;