import React, { useState, useMemo } from 'react';
import { Player, FightStatus, PlayerViewProps, UserRole } from '../types.ts';
import LiveFeed from './LiveFeed.tsx';
import BettingControls from './BettingControls.tsx';
import BettingPools from './BettingPools.tsx';
import FightHistory from './FightHistory.tsx';
import Trends from './Trends.tsx';
import Card from './common/Card.tsx';
import RequestCoinsModal from './RequestCoinsModal.tsx'; // Use the simple modal
import LiveBetCounts from './LiveBetCounts.tsx';

const PlayerView: React.FC<PlayerViewProps> = ({
  currentUser,
  fightStatus,
  fightId,
  timer,
  currentBet,
  bettingPools,
  playerFightHistory,
  fightHistory,
  allUsers,
  onPlaceBet,
  onCreateCoinRequest,
  betCounts
}) => {
  const [isRequestModalOpen, setRequestModalOpen] = useState(false);

  const agent = useMemo(() => {
    if (currentUser.agentId && allUsers[currentUser.agentId]) {
      return allUsers[currentUser.agentId];
    }
    return null;
  }, [currentUser.agentId, allUsers]);
  
  return (
    <>
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <LiveFeed fightStatus={fightStatus} lastWinner={fightHistory[0]?.winner || null} fightId={fightId} timer={timer} />
          {fightId !== null && fightStatus !== FightStatus.SETTLED && <LiveBetCounts counts={betCounts} />}
          <BettingPools pools={bettingPools} />
          <BettingControls
            status={fightStatus}
            balance={currentUser.coinBalance}
            timer={timer}
            onPlaceBet={onPlaceBet}
            currentBet={currentBet}
          />
        </div>
        {/* Sidebar */}
        <div className="space-y-6">
            <Card>
                <div className="p-4">
                    <h3 className="text-lg font-semibold text-gray-200">My Agent</h3>
                    {agent ? (
                        <div className="mt-2 text-sm">
                            <p className="font-semibold text-green-400">{agent.name}</p>
                            <p className="text-gray-400">{agent.email}</p>
                        </div>
                    ) : (
                        <p className="text-gray-500 mt-2 text-sm">You are not assigned to an agent.</p>
                    )}
                    <button 
                      onClick={() => setRequestModalOpen(true)}
                      disabled={!agent}
                      className="w-full mt-4 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition disabled:bg-red-800/50 disabled:cursor-not-allowed"
                    >
                      {agent ? 'Request Coins' : 'Assign an Agent to Request Coins'}
                    </button>
                </div>
            </Card>
          <Trends fightHistory={fightHistory} />
          <FightHistory fightHistory={playerFightHistory} />
        </div>
      </div>
       {isRequestModalOpen && (
          <RequestCoinsModal 
            onClose={() => setRequestModalOpen(false)}
            onSubmit={onCreateCoinRequest}
          />
      )}
    </>
  );
};

export default PlayerView;
