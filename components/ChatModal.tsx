
import React, { useState, useEffect, useRef } from 'react';
import { AllUserTypes, Message, UserRole } from '../types';
import { XMarkIcon, PaperAirplaneIcon, CoinIcon } from './common/Icons';

interface ChatModalProps {
  currentUser: AllUserTypes;
  chatTargetUser: AllUserTypes;
  messages: Message[];
  onClose: () => void;
  onSendMessage: (text: string, amount: number) => Promise<void>;
}

const ChatModal: React.FC<ChatModalProps> = ({
  currentUser,
  chatTargetUser,
  messages,
  onClose,
  onSendMessage,
}) => {
  const [newMessage, setNewMessage] = useState('');
  const [coinAmount, setCoinAmount] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const canSendCoins = currentUser.role === UserRole.AGENT || currentUser.role === UserRole.MASTER_AGENT;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseInt(coinAmount, 10) || 0;
    if (newMessage.trim() || (canSendCoins && amount > 0)) {
      await onSendMessage(newMessage.trim(), amount);
      setNewMessage('');
      setCoinAmount('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-800 rounded-lg shadow-2xl border border-zinc-700 w-full max-w-lg h-[80vh] flex flex-col">
        <div className="p-4 border-b border-zinc-700 flex justify-between items-center flex-shrink-0">
          <h3 className="text-lg font-bold text-gray-200">Chat with {chatTargetUser.name}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        <div className="flex-grow p-4 overflow-y-auto space-y-4">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${msg.senderId === currentUser.id ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  msg.senderId === currentUser.id
                    ? 'bg-red-600 text-white'
                    : 'bg-zinc-700 text-gray-200'
                }`}
              >
                <p>{msg.text}</p>
                 <p className="text-xs opacity-60 mt-1 text-right">{new Date(msg.createdAt).toLocaleTimeString()}</p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <div className="p-4 border-t border-zinc-700 flex-shrink-0">
          <form onSubmit={handleSendMessage} className="space-y-2">
            {canSendCoins && (
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <CoinIcon className="h-5 w-5 text-yellow-400" />
                    </div>
                     <input
                        type="number"
                        value={coinAmount}
                        onChange={(e) => setCoinAmount(e.target.value)}
                        placeholder={`Send coins to ${chatTargetUser.name}...`}
                        className="w-full bg-zinc-700 text-white p-2 pl-10 rounded border border-zinc-600 focus:ring-2 focus:ring-red-500 focus:outline-none transition"
                        min="0"
                    />
                </div>
            )}
            <div className="flex space-x-2">
                <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="w-full bg-zinc-700 text-white p-2 rounded border border-zinc-600 focus:ring-2 focus:ring-red-500 focus:outline-none transition"
                autoFocus
                />
                <button
                type="submit"
                className="p-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition disabled:bg-red-800/50"
                disabled={!newMessage.trim() && !coinAmount}
                >
                <PaperAirplaneIcon className="w-6 h-6" />
                </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatModal;