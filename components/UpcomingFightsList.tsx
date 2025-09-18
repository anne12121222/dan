import React from 'react';
import Card from './common/Card.tsx';
import { VideoCameraIcon } from './common/Icons.tsx';
// FIX: Add .ts extension to fix module resolution.
import { UpcomingFight } from '../types.ts';

interface UpcomingFightsListProps {
  fights: UpcomingFight[];
}

const UpcomingFightsList: React.FC<UpcomingFightsListProps> = ({ fights }) => {
  return (
    <Card>
      <div className="p-4 border-b border-gray-700 flex items-center space-x-2">
        <VideoCameraIcon className="w-6 h-6 text-gray-400" />
        <h3 className="text-lg font-semibold text-gray-200">Upcoming Fights</h3>
      </div>
      <div className="max-h-60 overflow-y-auto">
        {fights.length > 0 ? (
          <ul className="divide-y divide-gray-800">
            {fights.map((fight, index) => (
              <li key={fight.id} className={`p-3 ${index === 0 ? 'bg-yellow-900/30' : ''}`}>
                <p className="text-xs text-gray-400 font-mono">FIGHT #{fight.id}</p>
                <div className="text-sm flex justify-between">
                    <span className="text-red-400">{fight.participants.red}</span>
                    <span className="text-gray-200">{fight.participants.white}</span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center text-gray-500 p-6">
              <p>No upcoming fights scheduled at the moment.</p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default UpcomingFightsList;