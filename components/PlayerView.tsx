import React, { useState } from 'react';
import { Player, FightStatus, PlayerFightHistoryEntry, UpcomingFight, Bet, FightWinner, AllUserTypes, Message } from '../types';
import LiveFeed from './LiveFeed';
import BettingControls from './BettingControls';
import BettingPools from './BettingPools';
import FightHistory from './FightHistory';
import Trends from './Trends';
import UpcomingFightsDrawer from './UpcomingFightsDrawer';
import RequestCoinsModal from './RequestCoinsModal';
import ChatModal from './ChatModal';

interface PlayerViewProps {
  currentUser: Player;
  fightStatus: FightStatus;
  lastWinner: FightWinner | null;
  fightId: number | null;
  timer: number;
  pools: { meron: number; wala: number };
  fightHistory: PlayerFightHistoryEntry[];
  onPlaceBet: (amount: number, choice: 'RED' | 'WHITE') => Promise<string | null>;
  currentBet: Bet | null;
  isDrawerOpen: boolean;
  onCloseDrawer: () => void;
  upcomingFights: UpcomingFight[];
  onCreateCoinRequest: (amount: number, targetUserId?: string) => Promise<string | null>;
  allUsers: { [id: string]: AllUserTypes };
  onOpenChat: (user: AllUserTypes) => void;
  chatTargetUser: AllUserTypes | null;
  onCloseChat: () => void;
  onSendMessage: (receiverId: string, text: string, amount: number) => Promise<void>;
  messages: { [userId: string]: Message[] };
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
  allUsers,
  onOpenChat,
  chatTargetUser,
  onCloseChat,
  onSendMessage,
  messages
}) => {
    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
    const agent = allUsers[currentUser.agentId];

    const handleSendMessage = async (text: string, amount: number) => {
        if (chatTargetUser) {
            await onSendMessage(chatTargetUser.id, text, amount);
        }
    };

  return (
    <>
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <LiveFeed fightStatus={fightStatus} lastWinner={lastWinner} fightId={fightId} timer={timer} />
          <BettingControls
            status={fightStatus}
            balance={currentUser.coinBalance}
            timer={timer}
            onPlaceBet={onPlaceBet}
            currentBet={currentBet}
          />
        </div>
        <div className="space-y-4">
          <BettingPools pools={pools} />
          <div className="grid grid-cols-2 gap-2">
            <button
                onClick={() => setIsRequestModalOpen(true)}
                className="w-full p-3 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-lg transition duration-300"
            >
                Request Coins
            </button>
            {agent && (
                <button
                    onClick={() => onOpenChat(agent)}
                    className="w-full p-3 bg-zinc-600 hover:bg-zinc-700 text-white font-bold text-sm rounded-lg transition duration-300"
                >
                    Chat with Agent
                </button>
            )}
           </div>
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
      {chatTargetUser && agent && chatTargetUser.id === agent.id && (
        <ChatModal
          currentUser={currentUser}
          chatTargetUser={agent}
          messages={messages[agent.id] || []}
          onClose={onCloseChat}
          onSendMessage={handleSendMessage}
        />
      )}
    </>
  );
};

export default PlayerView;