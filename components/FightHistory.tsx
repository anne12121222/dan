import React, { useState } from 'react';
import { PlayerFightHistoryEntry } from '../types';
import { ChevronDownIcon } from './common/Icons';

interface FightHistoryProps {
  fightHistory: PlayerFightHistoryEntry[];
}

const FightHistory: React.FC<FightHistoryProps> = ({ fightHistory }) => {
    const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-zinc-800/50 rounded-md mt-4">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center p-2 bg-red-800/80 rounded-t-md hover:bg-red-800"
      >
        <h3 className="text-sm font-bold text-gray-200">BET HISTORY</h3>
        <ChevronDownIcon className={`w-5 h-5 text-gray-300 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
          <div className="p-2">
            {fightHistory.length === 0 ? (
              <p className="text-gray-500 text-center p-4 text-sm">No fights have been completed yet.</p>
            ) : (
              <ul className="divide-y divide-zinc-700/50 text-xs max-h-60 overflow-y-auto">
                {fightHistory.map((result) => (
                  <li key={result.id} className="p-2">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-400">Fight #{result.id}</span>
                      <span
                        className={`px-2 py-0.5 font-bold rounded ${
                          result.winner === 'RED'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-gray-200/20 text-gray-200'
                        }`}
                      >
                        {result.winner} Wins
                      </span>
                    </div>
                    {result.bet && (
                        <div className="text-sm mt-1 p-1.5 bg-zinc-900/50 rounded-md">
                            {result.outcome === 'WIN' ? (
                                <p className="text-green-400">
                                    <span className="font-bold">WIN</span> (Bet: {result.bet.amount.toLocaleString()} on {result.bet.choice})
                                </p>
                            ) : result.outcome === 'LOSS' ? (
                                 <p className="text-red-400">
                                    <span className="font-bold">LOSS</span> (Bet: {result.bet.amount.toLocaleString()} on {result.bet.choice})
                                </p>
                            ) : null}
                        </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
      )}
    </div>
  );
};

export default FightHistory;
