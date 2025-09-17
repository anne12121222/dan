import React from 'react';
import { AllUserTypes, UserRole } from '../types';
import { CoinIcon, Bars3Icon, ChatBubbleLeftEllipsisIcon } from './common/Icons';

interface HeaderProps {
  currentUser: AllUserTypes;
  onLogout: () => void;
  onToggleDrawer?: () => void;
  onOpenChatWithSuperior?: () => void;
  unreadMessageCount?: number;
}

const Header: React.FC<HeaderProps> = ({ currentUser, onLogout, onToggleDrawer, onOpenChatWithSuperior, unreadMessageCount }) => {
  const isPlayer = currentUser.role === UserRole.PLAYER;

  return (
    <header className="bg-zinc-900/80 backdrop-blur-sm border-b border-zinc-800 p-4 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-4">
          {isPlayer && onToggleDrawer && (
            <button onClick={onToggleDrawer} className="text-gray-300 hover:text-white">
              <Bars3Icon className="w-6 h-6" />
            </button>
          )}
          <h1 className="text-lg md:text-xl font-bold text-white">International Gamefowl Boxing</h1>
        </div>
        <div className="flex items-center space-x-6">
          <div className="flex flex-col items-end">
             <span className="text-sm text-gray-300">{currentUser.name}</span>
             <div className="flex items-center space-x-1 text-yellow-400">
                <CoinIcon className="w-4 h-4" />
                <span className="text-xs font-semibold">{currentUser.coinBalance.toLocaleString()}</span>
             </div>
          </div>
          {onOpenChatWithSuperior && (
            <button
              onClick={onOpenChatWithSuperior}
              className="relative text-gray-300 hover:text-white p-1"
              aria-label="Open Chat"
            >
              <ChatBubbleLeftEllipsisIcon className="w-7 h-7" />
              {(unreadMessageCount ?? 0) > 0 && (
                <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                  {unreadMessageCount}
                </span>
              )}
            </button>
          )}
          <button
            onClick={onLogout}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition duration-300 text-sm"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;