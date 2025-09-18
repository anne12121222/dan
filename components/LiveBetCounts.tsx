
import React from 'react';
import Card from './common/Card';

interface LiveBetCountsProps {
  counts: {
    red: number;
    white: number;
  };
}

const LiveBetCounts: React.FC<LiveBetCountsProps> = ({ counts }) => {
  return (
    <Card className="bg-zinc-800/50">
        <div className="grid grid-cols-2 text-center">
            <div className="p-3">
                <h4 className="text-sm font-semibold text-red-400">RED Bets</h4>
                <p className="text-2xl font-bold text-gray-200">{counts.red}</p>
            </div>
            <div className="p-3 border-l border-zinc-700">
                <h4 className="text-sm font-semibold text-gray-400">WHITE Bets</h4>
                <p className="text-2xl font-bold text-gray-200">{counts.white}</p>
            </div>
        </div>
    </Card>
  );
};

export default LiveBetCounts;
