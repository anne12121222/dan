import React, { useState } from 'react';
import { BetChoice } from '../types';
import { XMarkIcon } from './common/Icons';

interface BettingModalProps {
  choice: BetChoice;
  balance: number;
  onClose: () => void;
  onPlaceBet: (amount: number, choice: BetChoice) => Promise<string | null>;
}

const BettingModal: React.FC<BettingModalProps> = ({ choice, balance, onClose, onPlaceBet }) => {
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const numericAmount = parseInt(amount, 10);

  const handlePlaceBet = async () => {
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError("Please enter a valid amount.");
      return;
    }
    if (numericAmount > balance) {
      setError("You do not have enough balance for this bet.");
      return;
    }
    
    setError(null);
    setLoading(true);
    const result = await onPlaceBet(numericAmount, choice);
    setLoading(false);

    if (result) {
      setError(result);
    } else {
      onClose();
    }
  };

  const choiceColor = choice === 'RED' ? 'text-red-400' : 'text-gray-200';
  const choiceBorderColor = choice === 'RED' ? 'border-red-500' : 'border-gray-400';
  const choiceRingColor = choice === 'RED' ? 'focus:ring-red-500' : 'focus:ring-gray-300';

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`bg-zinc-800 rounded-lg shadow-2xl border ${choiceBorderColor} w-full max-w-sm`}>
        <div className="p-4 border-b border-zinc-700 flex justify-between items-center">
          <h3 className="text-lg font-bold">Place Bet on <span className={choiceColor}>{choice}</span></h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {error && <p className="text-red-400 text-center text-sm p-2 bg-red-900/50 rounded-md">{error}</p>}
          <div>
            <label htmlFor="bet-amount" className="block text-sm font-medium text-gray-400 mb-1">Bet Amount</label>
            <input
              id="bet-amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className={`w-full bg-zinc-700 text-white p-3 rounded border border-zinc-600 focus:ring-2 ${choiceRingColor} focus:outline-none transition text-2xl font-bold text-center`}
              autoFocus
              min="1"
            />
          </div>
          <p className="text-sm text-gray-400 text-center">Your balance: {balance.toLocaleString()}</p>
        </div>
        <div className="p-4 bg-zinc-900/50 rounded-b-lg">
          <button
            onClick={handlePlaceBet}
            disabled={loading || !amount || numericAmount <= 0}
            className="w-full p-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition duration-300 disabled:bg-blue-800/50 disabled:cursor-not-allowed"
          >
            {loading ? 'Placing Bet...' : 'Confirm Bet'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BettingModal;
