import React from 'react';
import { FightStatus } from './types';

interface FightInfoBarProps {
  fightId: number;
  status: FightStatus;
  timer: number;
}

const FightInfoBar: React.FC<FightInfoBarProps> = ({ fightId, status, timer }) => {
  const getStatusText = () => {
    switch (status) {
      case FightStatus.BETTING_OPEN:
        return { text: 'BETTING OPEN', color: 'bg-green-500' };
      case FightStatus.BETTING_CLOSED:
        return { text: 'BETTING CLOSED', color: 'bg-red-500' };
      case FightStatus.SETTLED:
        return { text: 'WAITING', color: 'bg-gray-500' };
      default:
        return { text: 'IDLE', color: 'bg-gray-700' };
    }
  };

  const { text, color } = getStatusText();
  const showTimer = status === FightStatus.BETTING_OPEN;

  return (
    <div className="absolute top-0 left-0 right-0 bg-black/50 backdrop-blur-sm p-2 z-10 flex justify-between items-center text-white">
      <div className="flex items-center space-x-2">
        <span className={`px-3 py-1 text-xs font-bold rounded ${color}`}>{text}</span>
        <span className="font-semibold text-sm">FIGHT #{fightId}</span>
      </div>
      {showTimer && (
        <div className="flex items-center space-x-2 bg-zinc-800 px-3 py-1 rounded">
          <span className="text-sm font-mono">{timer}s</span>
        </div>
      )}
    </div>
  );
};

export default FightInfoBar;
