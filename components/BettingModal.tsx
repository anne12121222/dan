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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const betAmount = parseInt(amount, 10);
    if (isNaN(betAmount) || betAmount <= 0) {
      setError('Please enter a valid amount.');
      return;
    }
    if (betAmount > balance) {
      setError('Insufficient balance.');
      return;
    }
    setLoading(true);
    setError(null);
    const result = await onPlaceBet(betAmount, choice);
    if (result) {
      setError(result);
      setLoading(false);
    } else {
      onClose();
    }
  };

  const choiceColor = choice === 'RED' ? 'text-red-500' : 'text-gray-200';
  const buttonColor = choice === 'RED' ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-200 hover:bg-gray-300 text-zinc-900';

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-800 rounded-lg shadow-2xl border border-zinc-700 w-full max-w-sm">
        <div className="p-4 border-b border-zinc-700 flex justify-between items-center">
          <h3 className={`text-lg font-bold ${choiceColor}`}>Place Bet on {choice}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-400">
              Bet Amount (Your Balance: {balance.toLocaleString()})
            </label>
            <input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 w-full bg-zinc-700 text-white p-3 rounded border border-zinc-600 focus:ring-2 focus:ring-red-500 focus:outline-none transition text-xl"
              autoFocus
              min="1"
              max={balance}
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className={`w-full p-3 font-bold rounded-lg transition ${buttonColor} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {loading ? 'Placing Bet...' : `Confirm Bet on ${choice}`}
          </button>
        </form>
      </div>
    </div>
  );
};

export default BettingModal;
