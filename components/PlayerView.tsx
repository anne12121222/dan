
import React, { useState } from 'react';
import {
  Player, FightStatus, FightWinner, Bet, PlayerFightHistoryEntry,
  BetChoice, UpcomingFight, AllUserTypes, Message, Agent
} from '../types';
import LiveFeed from './LiveFeed';
import BettingPools from './BettingPools';
import BettingControls from './BettingControls';
import FightHistory from './FightHistory';
import Trends from './Trends';
import Card from './common/Card';
import UpcomingFightsDrawer from './UpcomingFightsDrawer';
import RequestCoinsModal from './RequestCoinsModal';
import RequestCoinsToAgentModal from './RequestCoinsToAgentModal';
import ChatModal from './ChatModal';

interface PlayerViewProps {
  currentUser: Player;
  fightStatus: FightStatus;
  lastWinner: FightWinner | null;
  fightId: number | null;
  timer: number;
  pools: { meron: number; wala: number };
  fightHistory: PlayerFightHistoryEntry[];
  onPlaceBet: (amount: number, choice: BetChoice) => Promise<string | null>;
  currentBet: Bet | null;
  isDrawerOpen: boolean;
  onCloseDrawer: () => void;
  upcomingFights: UpcomingFight[];
  onCreateCoinRequest: (amount: number, targetUserId?: string) => Promise<string | null>;
  allUsers: { [id: string]: AllUserTypes };
  agents: Agent[];
  onOpenChat: (user: AllUserTypes) => void;
  chatTargetUser: AllUserTypes | null;
  onCloseChat: () => void;
  onSendMessage: (receiverId: string, text: string, amount: number) => Promise<void>;
  messages: { [userId: string]: Message[] };
}

const PlayerView: React.FC<PlayerViewProps> = (props) => {
  const {
    currentUser, fightStatus, lastWinner, fightId, timer, pools,
    fightHistory, onPlaceBet, currentBet, isDrawerOpen, onCloseDrawer,
    upcomingFights, onCreateCoinRequest, allUsers, agents, onOpenChat,
    chatTargetUser, onCloseChat, onSendMessage, messages
  } = props;
  
  const [isRequestModalOpen, setRequestModalOpen] = useState(false);
  const [isRequestToAgentModalOpen, setRequestToAgentModalOpen] = useState(false);
  
  const hasAgent = !!currentUser.agentId;
  const agent = hasAgent ? allUsers[currentUser.agentId] : null;

  const handleSendMessage = async (text: string, amount: number) => {
    if (chatTargetUser) {
        await onSendMessage(chatTargetUser.id, text, amount);
    }
  };
  
  const renderActionPanel = () => {
    if (hasAgent && agent) {
      return (
        <Card>
          <div className="p-4 space-y-2">
            <button
              onClick={() => setRequestModalOpen(true)}
              className="w-full p-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition"
            >
              Request Coins from Agent
            </button>
            <button
              onClick={() => onOpenChat(agent)}
              className="w-full p-2 bg-zinc-600 hover:bg-zinc-700 text-white font-bold rounded-lg transition"
            >
              Chat with {agent.name}
            </button>
          </div>
        </Card>
      );
    }
    
    return (
      <Card>
        <div className="p-4 text-center">
            <h3 className="text-lg font-semibold text-gray-200">Get Started</h3>
            <p className="text-sm text-gray-400 my-2">You need an agent to get coins. Send a request to any agent to begin.</p>
            <button
                onClick={() => setRequestToAgentModalOpen(true)}
                className="w-full p-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition"
            >
                Request Coins
            </button>
        </div>
      </Card>
    );
  };

  return (
    <>
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <LiveFeed
            fightStatus={fightStatus}
            lastWinner={lastWinner}
            fightId={fightId}
            timer={timer}
          />
          <BettingPools pools={pools} />
        </div>

        <div className="space-y-6">
          <Card>
            <div className="p-4">
              <h3 className="text-lg font-semibold text-gray-200">Betting</h3>
              <p className="text-sm text-gray-400 mb-4">
                Place your bet on RED or WHITE. Betting closes when the timer ends.
              </p>
              <BettingControls
                status={fightStatus}
                balance={currentUser.coinBalance}
                timer={timer}
                onPlaceBet={onPlaceBet}
                currentBet={currentBet}
              />
            </div>
          </Card>

          {renderActionPanel()}
          
          <Trends fightHistory={fightHistory} />
          
          <FightHistory fightHistory={fightHistory} />
        </div>
      </div>
      
      <UpcomingFightsDrawer
        isOpen={isDrawerOpen}
        onClose={onCloseDrawer}
        fights={upcomingFights}
      />
      
      {isRequestModalOpen && hasAgent && (
        <RequestCoinsModal
            onClose={() => setRequestModalOpen(false)}
            onSubmit={(amount) => onCreateCoinRequest(amount)}
        />
      )}
      
      {isRequestToAgentModalOpen && !hasAgent && (
        <RequestCoinsToAgentModal
          onClose={() => setRequestToAgentModalOpen(false)}
          onSubmit={onCreateCoinRequest}
          agents={agents}
        />
      )}

      {chatTargetUser && (
        <ChatModal
          currentUser={currentUser}
          chatTargetUser={chatTargetUser}
          messages={messages[chatTargetUser.id] || []}
          onClose={onCloseChat}
          onSendMessage={handleSendMessage}
        />
      )}
    </>
  );
};

export default PlayerView;
