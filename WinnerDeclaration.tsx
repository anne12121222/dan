import React from 'react';
import Card from './common/Card.tsx';

interface WinnerDeclarationProps {
  onDeclareWinner: (winner: 'RED' | 'WHITE' | 'DRAW' | 'CANCELLED') => void;
  disabled: boolean;
}

const WinnerDeclaration: React.FC<WinnerDeclarationProps> = ({ onDeclareWinner, disabled }) => {
  return (
    <Card>
      <div className="p-4 border-b border-gray-700">
        <h3 className="text-lg font-semibold text-gray-200">Declare Winner</h3>
        <p className="text-sm text-gray-400">Select the winner to settle bets and end the fight.</p>
      </div>
      <div className="p-4 grid grid-cols-2 gap-4">
        <button
          onClick={() => onDeclareWinner('RED')}
          disabled={disabled}
          className="p-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition duration-300 disabled:bg-red-800/50 disabled:cursor-not-allowed"
        >
          RED WINS
        </button>
        <button
          onClick={() => onDeclareWinner('WHITE')}
          disabled={disabled}
          className="p-4 bg-gray-200 hover:bg-gray-300 text-zinc-900 font-bold rounded-lg transition duration-300 disabled:bg-gray-500/50 disabled:cursor-not-allowed"
        >
          WHITE WINS
        </button>
         <button
          onClick={() => onDeclareWinner('DRAW')}
          disabled={disabled}
          className="col-span-2 p-3 bg-yellow-600 hover:bg-yellow-700 text-white font-bold rounded-lg transition duration-300 disabled:bg-yellow-800/50 disabled:cursor-not-allowed"
        >
          DRAW (Refunds Bets)
        </button>
        <button
          onClick={() => onDeclareWinner('CANCELLED')}
          disabled={disabled}
          className="col-span-2 p-3 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-lg transition duration-300 disabled:bg-gray-800/50 disabled:cursor-not-allowed"
        >
          CANCEL FIGHT (Refunds Bets)
        </button>
      </div>
    </Card>
  );
};

export default WinnerDeclaration;