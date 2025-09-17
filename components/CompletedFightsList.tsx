import React from 'react';
import Card from './common/Card';
import { HistoryIcon } from './common/Icons';
import { FightResult, UserRole } from '../types';

interface CompletedFightsListProps {
  fights: FightResult[];
  currentUserRole?: UserRole;
}

const CompletedFightsList: React.FC<CompletedFightsListProps> = ({ fights, currentUserRole }) => {
  const canViewCommission = currentUserRole === UserRole.MASTER_AGENT || currentUserRole === UserRole.OPERATOR;

  const getWinnerClass = (winner: FightResult['winner']) => {
    switch(winner) {
        case 'RED': return 'bg-red-500/20 text-red-400';
        case 'WHITE': return 'bg-gray-200/20 text-gray-200';
        case 'DRAW': return 'bg-yellow-500/20 text-yellow-400';
        case 'CANCELLED': return 'bg-gray-500/20 text-gray-400';
        default: return '';
    }
  }
  const getWinnerText = (winner: FightResult['winner']) => {
      if (winner === 'DRAW' || winner === 'CANCELLED') return winner;
      if (winner) return `${winner} WINS`;
      return 'N/A';
  }
  
  return (
    <Card>
      <div className="p-4 border-b border-gray-700 flex items-center space-x-2">
        <HistoryIcon className="w-6 h-6 text-gray-400" />
        <h3 className="text-lg font-semibold text-gray-200">Completed Fights</h3>
      </div>
      <div className="max-h-60 overflow-y-auto">
        {fights.length > 0 ? (
          <ul className="divide-y divide-gray-800">
            {fights.map((fight) => (
              <li key={fight.id} className="p-3">
                <div className="flex justify-between items-center">
                    <div>
                        <span className="font-semibold text-gray-400 text-sm">Fight #{fight.id}</span>
                        {canViewCommission && fight.commission > 0 && (
                             <p className="text-xs text-green-400 font-mono">Comm: +{fight.commission.toLocaleString()} C</p>
                        )}
                    </div>
                    <span
                    className={`px-2 py-0.5 text-xs font-bold rounded ${getWinnerClass(fight.winner)}`}
                    >
                    {getWinnerText(fight.winner)}
                    </span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center text-gray-500 p-6">
              <p>No fights have been completed yet.</p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default CompletedFightsList;
