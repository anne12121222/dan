import React, { useState } from 'react';
import { XMarkIcon, CoinIcon } from './common/Icons';

interface RequestCoinsModalProps {
  onClose: () => void;
  onSubmit: (amount: number) => Promise<string | null>;
}

const RequestCoinsModal: React.FC<RequestCoinsModalProps> = ({ onClose, onSubmit }) => {
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const numericAmount = parseInt(amount, 10);

  const handleSubmit = async () => {
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError("Please enter a valid amount.");
      return;
    }
    
    setError(null);
    setLoading(true);
    const result = await onSubmit(numericAmount);
    setLoading(false);

    if (result) {
      setError(result);
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-800 rounded-lg shadow-2xl border border-zinc-700 w-full max-w-sm">
        <div className="p-4 border-b border-zinc-700 flex justify-between items-center">
          <h3 className="text-lg font-bold">Request Coins</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {error && <p className="text-red-400 text-center text-sm p-2 bg-red-900/50 rounded-md">{error}</p>}
          <div>
            <label htmlFor="request-amount" className="block text-sm font-medium text-gray-400 mb-1">Amount to Request</label>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <CoinIcon className="h-5 w-5 text-yellow-400" />
                </div>
                <input
                id="request-amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="w-full bg-zinc-700 text-white p-3 pl-10 rounded border border-zinc-600 focus:ring-2 focus:ring-blue-500 focus:outline-none transition text-2xl font-bold"
                autoFocus
                min="1"
                />
            </div>
          </div>
          <p className="text-sm text-gray-500 text-center">Your request will be sent for approval.</p>
        </div>
        <div className="p-4 bg-zinc-900/50 rounded-b-lg">
          <button
            onClick={handleSubmit}
            disabled={loading || !amount || numericAmount <= 0}
            className="w-full p-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition duration-300 disabled:bg-blue-800/50 disabled:cursor-not-allowed"
          >
            {loading ? 'Submitting Request...' : 'Submit Request'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RequestCoinsModal;
