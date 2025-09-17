import React, { useState, useRef, useEffect } from 'react';
import { AllUserTypes, Message, UserRole } from '../types';
import { XMarkIcon, PaperAirplaneIcon, CoinIcon } from './common/Icons';

interface ChatModalProps {
  currentUser: AllUserTypes;
  otherUser: AllUserTypes;
  messages: Message[];
  onClose: () => void;
  onSendMessage: (text: string) => void;
  onSendCoins: (amount: number) => void;
}

const ChatModal: React.FC<ChatModalProps> = ({
  currentUser,
  otherUser,
  messages,
  onClose,
  onSendMessage,
  onSendCoins
}) => {
  const [inputText, setInputText] = useState('');
  const [sendCoinAmount, setSendCoinAmount] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const canSendCoins = currentUser.role === UserRole.MASTER_AGENT || currentUser.role === UserRole.AGENT;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (inputText.trim()) {
      onSendMessage(inputText);
      setInputText('');
    }
  };
  
  const handleSendCoins = () => {
    const amount = parseInt(sendCoinAmount, 10);
    if (!isNaN(amount) && amount > 0) {
      onSendCoins(amount);
      setSendCoinAmount('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end justify-center z-50 sm:items-center">
      <div className="bg-zinc-800 rounded-t-lg shadow-2xl border-t border-zinc-700 w-full max-w-lg h-[80vh] flex flex-col sm:rounded-lg sm:border sm:h-[70vh]">
        <header className="p-4 border-b border-zinc-700 flex justify-between items-center flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-200">Chat with {otherUser.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </header>

        <main className="flex-grow p-4 overflow-y-auto">
          <div className="space-y-4">
            {messages.map(msg => (
              <div key={msg.id} className={`flex items-end gap-2 ${msg.senderId === currentUser.id ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs md:max-w-md p-3 rounded-lg ${msg.senderId === currentUser.id ? 'bg-blue-600 rounded-br-none' : 'bg-zinc-700 rounded-bl-none'}`}>
                  <p className="text-sm text-white">{msg.text}</p>
                </div>
              </div>
            ))}
             <div ref={messagesEndRef} />
          </div>
        </main>
        
        {canSendCoins && (
          <div className="p-3 border-t border-zinc-700 bg-zinc-900/50 flex-shrink-0">
            <div className="flex gap-2">
                 <div className="flex items-center bg-zinc-800 border border-zinc-700 rounded-lg focus-within:ring-2 focus-within:ring-yellow-500 transition-shadow flex-grow">
                    <span className="pl-3 pr-2 text-yellow-400">
                        <CoinIcon className="w-5 h-5"/>
                    </span>
                    <input
                        type="number"
                        value={sendCoinAmount}
                        onChange={(e) => setSendCoinAmount(e.target.value)}
                        placeholder={`Send coins to ${otherUser.name}`}
                        className="w-full bg-transparent p-2 text-white placeholder-gray-500 focus:outline-none"
                        min="1"
                    />
                </div>
                <button
                onClick={handleSendCoins}
                disabled={!sendCoinAmount || parseInt(sendCoinAmount, 10) <= 0}
                className="p-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition duration-300 disabled:bg-green-800/50 disabled:cursor-not-allowed"
                >
                    Send
                </button>
            </div>
          </div>
        )}

        <footer className="p-3 border-t border-zinc-700 bg-zinc-900/50 flex-shrink-0 sm:rounded-b-lg">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type your message..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button onClick={handleSend} className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
              <PaperAirplaneIcon className="w-6 h-6" />
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default ChatModal;