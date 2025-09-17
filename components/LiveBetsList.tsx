

import React from 'react';
import Card from './common/Card';
import { Bet, AllUserTypes } from '../types';

interface LiveBetsListProps {
  bets: Bet[];
  allUsers: { [id: string]: AllUserTypes };
}

const LiveBetsList: React.FC<LiveBetsListProps> = ({ bets, allUsers }) => {
  return (
    <Card>
      <div className="p-4 border-b border-gray-700">
        <h3 className="text-lg font-semibold text-gray-200">Live Bets for Current Fight</h3>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {bets.length === 0 ? (
          <p className="text-gray-500 text-center p-6">No bets placed yet for this fight.</p>
        ) : (
          <ul className="divide-y divide-gray-800">
            {[...bets].reverse().map(bet => (
              <li key={bet.id} className="p-3 flex justify-between items-center">
                <span className="font-semibold text-gray-300">{allUsers[bet.userId]?.name || 'Unknown Player'}</span>
                <div className="text-right">
                  <p className={`font-bold text-lg ${bet.choice === 'RED' ? 'text-red-400' : 'text-gray-200'}`}>
                    {bet.choice}
                  </p>
                  <p className="text-sm text-yellow-400">{bet.amount.toLocaleString()}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
};

export default LiveBetsList;