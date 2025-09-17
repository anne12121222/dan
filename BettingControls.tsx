
// FIX: Replaced placeholder content with the full component code and adjusted import paths.
import React, { useState } from 'react';
import { BetChoice, FightStatus, Bet } from './types';
import BettingModal from './components/BettingModal';

interface BettingControlsProps {
  status: FightStatus;
  balance: number;
  onPlaceBet: (amount: number, choice: BetChoice) => Promise<string | null>;
  currentBet: Bet | null;
}

const BettingControls: React.FC<BettingControlsProps> = ({ status, balance, onPlaceBet, currentBet }) => {
  const [modalChoice, setModalChoice] = useState<BetChoice | null>(null);

  const isBettingOpen = status === FightStatus.BETTING_OPEN;
  const hasPlacedBet = !!currentBet;

  const handleOpenModal = (choice: BetChoice) => {
    if (isBettingOpen && !hasPlacedBet) {
      setModalChoice(choice);
    }
  };

  const handleCloseModal = () => {
    setModalChoice(null);
  };

  if (hasPlacedBet) {
    return (
      <div className="bg-zinc-800/50 p-4 rounded-md text-center">
          <p className="text-gray-400">You have placed a bet of</p>
          <p className="text-2xl font-bold text-yellow-400 my-1">{currentBet.amount.toLocaleString()}</p>
          <p className="text-gray-400">on <span className={`font-bold ${currentBet.choice === 'RED' ? 'text-red-400' : 'text-gray-200'}`}>{currentBet.choice}</span></p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => handleOpenModal('RED')}
          disabled={!isBettingOpen}
          className="p-6 bg-red-600 hover:bg-red-700 text-white font-extrabold text-2xl rounded-lg transition-all duration-300 disabled:bg-red-800/50 disabled:cursor-not-allowed transform hover:scale-105"
        >
          BET RED
        </button>
        <button
          onClick={() => handleOpenModal('WHITE')}
          disabled={!isBettingOpen}
          className="p-6 bg-gray-200 hover:bg-gray-300 text-zinc-900 font-extrabold text-2xl rounded-lg transition-all duration-300 disabled:bg-gray-500/50 disabled:cursor-not-allowed transform hover:scale-105"
        >
          BET WHITE
        </button>
      </div>
      {modalChoice && (
        <BettingModal
          choice={modalChoice}
          balance={balance}
          onClose={handleCloseModal}
          onPlaceBet={onPlaceBet}
        />
      )}
    </>
  );
};

export default BettingControls;
