
import React, { useState } from 'react';
import { BetChoice } from '../types';
import { CoinIcon, XMarkIcon } from './common/Icons';

interface BettingModalProps {
  choice: BetChoice | null;
  balance: number;
  onClose: () => void;
  onPlaceBet: (amount: number, choice: BetChoice) => Promise<string | null>;
}

const BettingModal: React.FC<BettingModalProps> = ({ choice, balance, onClose, onPlaceBet }) => {
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!choice) return null;

  const handlePlaceBet = async () => {
    const betAmount = parseInt(amount, 10);
    if (isNaN(betAmount) || betAmount <= 0) {
      setError('Please enter a valid amount.');
      return;
    }
    const result = await onPlaceBet(betAmount, choice);
    if (result) {
        setError(result);
    } else {
        onClose();
    }
  };
  
  const handleAmountButtonClick = (value: number | 'max') => {
    if (value === 'max') {
        setAmount(balance.toString());
    } else {
        setAmount(prev => (parseInt(prev || '0', 10) + value).toString());
    }
  }

  const quickBetAmounts = [100, 500, 1000, 5000];

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-800 rounded-lg shadow-2xl border border-zinc-700 w-full max-w-sm">
        <header className="p-4 border-b border-zinc-700 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-200">
            Place Bet on <span className={`font-extrabold ${choice === 'RED' ? 'text-red-400' : 'text-gray-200'}`}>{choice}</span>
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </header>

        <main className="p-6 space-y-4">
            <div>
                 <label htmlFor="betAmount" className="block text-sm font-medium text-gray-400 mb-1">
                    Enter Bet Amount
                </label>
                <div className="flex items-center bg-zinc-900 border border-zinc-700 rounded-lg focus-within:ring-2 focus-within:ring-yellow-500 transition-shadow">
                    <span className="pl-3 pr-2 text-yellow-400">
                        <CoinIcon className="w-5 h-5"/>
                    </span>
                    <input
                        id="betAmount"
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0"
                        className="w-full bg-transparent p-2 text-white text-lg font-semibold placeholder-gray-500 focus:outline-none"
                        min="1"
                        max={balance}
                    />
                </div>
                <p className="text-xs text-gray-500 mt-1 text-right">Your balance: {balance.toLocaleString()}</p>
            </div>
            <div className="grid grid-cols-5 gap-2 text-sm">
                {quickBetAmounts.map(val => (
                     <button key={val} onClick={() => handleAmountButtonClick(val)} className="bg-zinc-700 hover:bg-zinc-600 rounded p-2 text-gray-300 transition-colors">+{val}</button>
                ))}
                 <button onClick={() => handleAmountButtonClick('max')} className="bg-yellow-600/50 hover:bg-yellow-600/70 rounded p-2 text-yellow-300 transition-colors font-bold">MAX</button>
            </div>
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        </main>

        <footer className="p-4 border-t border-zinc-700 bg-zinc-900/50 rounded-b-lg">
          <button
            onClick={handlePlaceBet}
            disabled={!amount || parseInt(amount, 10) <= 0}
            className={`w-full p-3 font-bold text-lg rounded-lg transition duration-300 disabled:bg-gray-600 disabled:cursor-not-allowed ${
                choice === 'RED' 
                ? 'bg-red-600 hover:bg-red-700 text-white' 
                : 'bg-gray-200 hover:bg-gray-300 text-zinc-900'
            }`}
          >
            Confirm Bet
          </button>
        </footer>
      </div>
    </div>
  );
};

export default BettingModal;