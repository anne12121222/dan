
import React, { useState, useMemo } from 'react';
import { Player, FightStatus, Bet, PlayerFightHistoryEntry, UpcomingFight, FightResult, AllUserTypes, UserRole, Agent, PlayerViewProps } from '../types';
import LiveFeed from './LiveFeed';
import BettingControls from './BettingControls';
import BettingPools from './BettingPools';
import FightHistory from './FightHistory';
import Trends from './Trends';
import Card from './common/Card';
import RequestCoinsToAgentModal from './RequestCoinsToAgentModal';
import LiveBetCounts from './LiveBetCounts';

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

  const availableAgents = useMemo(() => 
    Object.values(allUsers).filter(u => u.role === UserRole.AGENT) as Agent[],
    [allUsers]
  );
  
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
                      className="w-full mt-4 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition"
                    >
                      Request Coins
                    </button>
                </div>
            </Card>
          <Trends fightHistory={fightHistory} />
          <FightHistory fightHistory={playerFightHistory} />
        </div>
      </div>
       {isRequestModalOpen && (
          <RequestCoinsToAgentModal 
            onClose={() => setRequestModalOpen(false)}
            onSubmit={onCreateCoinRequest}
            agents={availableAgents}
          />
      )}
    </>
  );
};

export default PlayerView;
