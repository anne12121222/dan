

import React, { useState } from 'react';
import { Player, FightStatus, PlayerFightHistoryEntry, UpcomingFight, Bet } from '../types';
import LiveFeed from './LiveFeed';
import BettingControls from './BettingControls';
import BettingPools from './BettingPools';
import FightHistory from './FightHistory';
import Trends from './Trends';
import UpcomingFightsDrawer from './UpcomingFightsDrawer';
import RequestCoinsModal from './RequestCoinsModal';

interface PlayerViewProps {
  currentUser: Player;
  fightStatus: FightStatus;
  // FIX: Widen type to handle all possible fight outcomes.
  lastWinner: 'RED' | 'WHITE' | 'DRAW' | 'CANCELLED' | null;
  fightId: number;
  timer: number;
  pools: { meron: number; wala: number };
  fightHistory: PlayerFightHistoryEntry[];
  onPlaceBet: (amount: number, choice: 'RED' | 'WHITE') => Promise<string | null>;
  currentBet: Bet | null;
  isDrawerOpen: boolean;
  onCloseDrawer: () => void;
  upcomingFights: UpcomingFight[];
  onCreateCoinRequest: (amount: number) => Promise<string | null>;
}

const PlayerView: React.FC<PlayerViewProps> = ({
  currentUser,
  fightStatus,
  lastWinner,
  fightId,
  timer,
  pools,
  fightHistory,
  onPlaceBet,
  currentBet,
  isDrawerOpen,
  onCloseDrawer,
  upcomingFights,
  onCreateCoinRequest,
}) => {
    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  return (
    <>
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <LiveFeed fightStatus={fightStatus} lastWinner={lastWinner} fightId={fightId} timer={timer} />
          <BettingControls
            status={fightStatus}
            balance={currentUser.coinBalance}
            onPlaceBet={onPlaceBet}
            currentBet={currentBet}
          />
        </div>
        <div className="space-y-4">
          <BettingPools pools={pools} />
          <button
            onClick={() => setIsRequestModalOpen(true)}
            className="w-full p-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-lg transition duration-300"
           >
                Request Coins from Agent
           </button>
          <Trends fightHistory={fightHistory} />
          <FightHistory fightHistory={fightHistory} />
        </div>
      </div>
      <UpcomingFightsDrawer
        isOpen={isDrawerOpen}
        onClose={onCloseDrawer}
        fights={upcomingFights}
      />
       {isRequestModalOpen && (
        <RequestCoinsModal
            onClose={() => setIsRequestModalOpen(false)}
            onSubmit={onCreateCoinRequest}
        />
      )}
    </>
  );
};

export default PlayerView;
