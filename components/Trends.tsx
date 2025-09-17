import React from 'react';
import { FightResult } from '../types';

interface TrendsProps {
  fightHistory: FightResult[];
}

const ResultDot: React.FC<{ result: FightResult['winner'] }> = ({ result }) => {
    const baseClass = "w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-black";
    switch (result) {
        case 'RED':
            return <div className={`${baseClass} bg-red-500`}></div>;
        case 'WHITE':
            return <div className={`${baseClass} bg-gray-200`}></div>;
        case 'DRAW':
            return <div className={`${baseClass} bg-yellow-500`}></div>;
        case 'CANCELLED':
            return <div className={`${baseClass} bg-gray-500`}></div>;
        default:
            return <div className="w-5 h-5 rounded-full bg-zinc-700"></div>;
    }
};

const Trends: React.FC<TrendsProps> = ({ fightHistory }) => {
    // Show last 50 fights for trends
    const trendData = fightHistory.slice(0, 50);

    return (
        <div className="bg-zinc-800/50 p-3 rounded-md">
            <h3 className="text-sm font-bold text-gray-300 mb-3">TRENDS ↦</h3>
            <div className="grid grid-cols-10 gap-2">
                {Array.from({ length: 50 }).map((_, index) => {
                    const result = trendData[index];
                    return result ? <ResultDot key={result.id} result={result.winner} /> : <div key={index} className="w-5 h-5 rounded-full bg-zinc-700"></div>;
                })}
            </div>
        </div>
    );
};

export default Trends;
