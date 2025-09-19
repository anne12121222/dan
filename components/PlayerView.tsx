import React, { useState } from 'react';
import { Player, FightStatus, Bet, FightWinner, PlayerFightHistoryEntry, UpcomingFight, BetChoice, AllUserTypes, Agent } from '../types.ts';
import LiveFeed from './LiveFeed.tsx';
import BettingPools from './BettingPools.tsx';
import BettingControls from './BettingControls.tsx';
import Trends from './Trends.tsx';
import FightHistory from './FightHistory.tsx';
import RequestCoinsModal from './RequestCoinsModal.tsx';
import RequestCoinsToAgentModal from './RequestCoinsToAgentModal.tsx';
import UpcomingFightsDrawer from './UpcomingFightsDrawer.tsx';
import { ChatBubbleLeftEllipsisIcon } from './common/Icons.tsx';
import LiveBetsList from './LiveBetsList.tsx';

interface PlayerViewProps {
  currentUser: Player;
  fightStatus: FightStatus;
  lastWinner: FightWinner | null;
  fightId: number | null;
  timer: number;
  bettingPools: { meron: number; wala: number; };
  currentBet: Bet | null;
  onPlaceBet: (amount: number, choice: BetChoice) => Promise<string | null>;
  fightHistory: PlayerFightHistoryEntry[];
  upcomingFights: UpcomingFight[];
  onRequestCoins: (amount: number, targetUserId: string) => Promise<string | null>;
  agents: Agent[];
  isDrawerOpen: boolean;
  onToggleDrawer: () => void;
  allUsers: { [id: string]: AllUserTypes };
  onStartChat: (user: AllUserTypes) => void;
  liveBets: Bet[];
}

const PlayerView: React.FC<PlayerViewProps> = ({
  currentUser,
  fightStatus,
  lastWinner,
  fightId,
  timer,
  bettingPools,
  currentBet,
  onPlaceBet,
  fightHistory,
  upcomingFights,
  onRequestCoins,
  agents,
  isDrawerOpen,
  onToggleDrawer,
  allUsers,
  onStartChat,
  liveBets
}) => {
    const [isRequestingCoins, setIsRequestingCoins] = useState(false);
    
    const agent = currentUser.agentId ? allUsers[currentUser.agentId] : null;

    const handleRequestSubmit = async (amount: number) => {
        if (!agent) return "No agent assigned.";
        return await onRequestCoins(amount, agent.id);
    };
    
    const handleRequestToAnyAgentSubmit = async (amount: number, agentId: string) => {
        return await onRequestCoins(amount, agentId);
    };

  return (
    <div className="min-h-screen bg-zinc-900 text-white p-4 lg:p-8">
      <UpcomingFightsDrawer isOpen={isDrawerOpen} onClose={onToggleDrawer} fights={upcomingFights} />
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
          <Trends fightHistory={fightHistory} />
          <LiveBetsList bets={liveBets} allUsers={allUsers} fightId={fightId} />
        </div>

        {/* Sidebar: Right Column */}
        <div className="space-y-4">
            <div className="bg-zinc-800/50 p-4 rounded-md">
                <h2 className="text-lg font-semibold text-gray-300">Your Wallet</h2>
                <p className="text-3xl font-bold text-yellow-400 my-2">{currentUser.coinBalance.toLocaleString()}</p>
                 <div className="grid grid-cols-2 gap-2 mt-2">
                    <button
                        onClick={() => setIsRequestingCoins(true)}
                        className="w-full p-2 bg-yellow-600 hover:bg-yellow-700 text-white font-bold rounded-lg transition"
                    >
                        Request Coins
                    </button>
                    {agent ? (
                         <button
                            onClick={() => onStartChat(agent)}
                            className="w-full p-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg transition flex items-center justify-center space-x-2"
                        >
                            <ChatBubbleLeftEllipsisIcon className="w-5 h-5" />
                            <span>Chat Agent</span>
                        </button>
                    ) : (
                         <div className="w-full p-2 bg-gray-600 text-white font-bold rounded-lg flex items-center justify-center space-x-2 text-center text-xs">
                            <span>No Agent Assigned</span>
                        </div>
                    )}
                </div>
            </div>
          <BettingControls
            status={fightStatus}
            balance={currentUser.coinBalance}
            timer={timer}
            onPlaceBet={onPlaceBet}
            currentBet={currentBet}
          />
          <FightHistory fightHistory={fightHistory} />
        </div>
      </div>

      {isRequestingCoins && agent && (
          <RequestCoinsModal
            onClose={() => setIsRequestingCoins(false)}
            onSubmit={handleRequestSubmit}
          />
      )}

      {isRequestingCoins && !agent && (
          <RequestCoinsToAgentModal
              onClose={() => setIsRequestingCoins(false)}
              onSubmit={handleRequestToAnyAgentSubmit}
              agents={agents}
          />
      )}
    </div>
  );
};

export default PlayerView;