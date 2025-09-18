import React, { useState, useEffect, useRef } from 'react';
// FIX: Add .ts extension to fix module resolution issue.
import { AllUserTypes } from '../types.ts';
import { CoinIcon, Bars3Icon } from './common/Icons.tsx';

interface HeaderProps {
  currentUser: AllUserTypes;
  onLogout: () => void;
  onSettings: () => void;
  onToggleDrawer: () => void;
}

const Header: React.FC<HeaderProps> = ({ currentUser, onLogout, onSettings, onToggleDrawer }) => {
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="bg-zinc-800/50 backdrop-blur-sm border-b border-zinc-700 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
             <button
              onClick={onToggleDrawer}
              className="mr-4 text-gray-400 hover:text-white lg:hidden"
             >
               <Bars3Icon className="h-6 w-6" />
             </button>
            <div className="flex-shrink-0 text-white font-bold text-lg">
              Reality Boxing
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-yellow-500/10 text-yellow-400 px-3 py-1 rounded-full">
              <CoinIcon className="w-5 h-5" />
              <span className="font-semibold text-sm">{currentUser.coinBalance.toLocaleString()}</span>
            </div>
            
            <div className="relative" ref={dropdownRef}>
              <button onClick={() => setDropdownOpen(!isDropdownOpen)} className="flex items-center space-x-2 p-2 rounded-md hover:bg-zinc-700/50">
                  <div className="text-sm text-right">
                      <span className="font-semibold text-white block">{currentUser.name}</span>
                      <span className="text-gray-400 text-xs block">({currentUser.role})</span>
                  </div>
                   <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </button>
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-zinc-800 border border-zinc-700 rounded-md shadow-lg z-50">
                  <div className="py-1">
                    <button onClick={() => { onSettings(); setDropdownOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-zinc-700">
                      Settings
                    </button>
                    <button onClick={onLogout} className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-zinc-700">
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;