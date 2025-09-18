import React from 'react';

interface BettingPoolsProps {
  pools: {
    meron: number;
    wala: number;
  };
}

const BettingPools: React.FC<BettingPoolsProps> = ({ pools }) => {
  const totalPool = pools.meron + pools.wala;
  const meronPercent = totalPool > 0 ? (pools.meron / totalPool) * 100 : 0;
  const walaPercent = totalPool > 0 ? (pools.wala / totalPool) * 100 : 0;
  
  const meronPayout = totalPool > 0 && pools.meron > 0 ? (totalPool / pools.meron) * 100 - 100: 0;
  const walaPayout = totalPool > 0 && pools.wala > 0 ? (totalPool / pools.wala) * 100 - 100 : 0;


  return (
    <div className="bg-zinc-900 grid grid-cols-2 gap-px text-center">
      <div className="bg-zinc-800/50 p-4">
        <h3 className="text-red-500 font-bold text-lg">RED</h3>
        <p className="text-yellow-400 font-bold text-2xl mt-1">{pools.meron.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        <p className="text-gray-300 text-lg mt-1">{meronPayout.toFixed(2)}%</p>
      </div>
      <div className="bg-zinc-800/50 p-4">
        <h3 className="text-gray-200 font-bold text-lg">WHITE</h3>
        <p className="text-yellow-400 font-bold text-2xl mt-1">{pools.wala.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        <p className="text-gray-300 text-lg mt-1">{walaPayout.toFixed(2)}%</p>
      </div>
    </div>
  );
};

export default BettingPools;