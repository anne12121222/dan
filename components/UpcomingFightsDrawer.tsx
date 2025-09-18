import React from 'react';
// FIX: Add .ts extension to fix module resolution.
import { UpcomingFight } from '../types.ts';
import { XMarkIcon } from './common/Icons.tsx';

interface UpcomingFightsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  fights: UpcomingFight[];
}

const UpcomingFightsDrawer: React.FC<UpcomingFightsDrawerProps> = ({ isOpen, onClose, fights }) => {
  return (
    <>
      <div 
        className={`fixed inset-0 bg-black/60 z-40 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      <div
        className={`fixed top-0 left-0 h-full w-72 bg-zinc-900 border-r border-zinc-800 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex justify-between items-center p-4 border-b border-zinc-800">
          <h3 className="text-lg font-semibold text-white">Upcoming Fights</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        <div className="p-4 space-y-3 overflow-y-auto h-[calc(100vh-65px)]">
          {fights.length > 0 ? (
            fights.map((fight, index) => (
              <div key={fight.id} className={`p-3 rounded-lg ${index === 0 ? 'bg-yellow-500/10 border border-yellow-500/50' : 'bg-zinc-800/50'}`}>
                <p className="text-xs text-gray-400 font-mono mb-1">FIGHT #{fight.id}</p>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-red-400 font-semibold">{fight.participants.red}</span>
                  <span className="text-gray-500 mx-2">vs</span>
                  <span className="text-gray-200 font-semibold">{fight.participants.white}</span>
                </div>
                {index === 0 && <p className="text-yellow-400 text-xs font-bold mt-2 text-center">UP NEXT</p>}
              </div>
            ))
          ) : (
            <div className="text-center text-gray-500 py-4">
              <p>No upcoming fights scheduled.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default UpcomingFightsDrawer;