
import React, { useState } from 'react';
import { CoinIcon, XMarkIcon } from './common/Icons';

interface RequestCoinsModalProps {
  onClose: () => void;
  onSubmit: (amount: number) => Promise<string | null>;
}

const RequestCoinsModal: React.FC<RequestCoinsModalProps> = ({ onClose, onSubmit }) => {
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmitRequest = async () => {
    setError(null);
    setSuccess(null);
    const requestAmount = parseInt(amount, 10);
    if (isNaN(requestAmount) || requestAmount <= 0) {
      setError('Please enter a valid amount.');
      return;
    }
    const result = await onSubmit(requestAmount);
    if (result) {
        setError(result);
    } else {
        setSuccess(`Your request for ${requestAmount.toLocaleString()} coins has been sent.`);
        setAmount('');
        setTimeout(() => {
            onClose();
        }, 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-800 rounded-lg shadow-2xl border border-zinc-700 w-full max-w-sm">
        <header className="p-4 border-b border-zinc-700 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-200">
            Request Coins
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white" disabled={!!success}>
            <XMarkIcon className="w-6 h-6" />
          </button>
        </header>

        <main className="p-6 space-y-4">
            <div>
                 <label htmlFor="requestAmount" className="block text-sm font-medium text-gray-400 mb-1">
                    Enter Amount
                </label>
                <div className="flex items-center bg-zinc-900 border border-zinc-700 rounded-lg focus-within:ring-2 focus-within:ring-yellow-500 transition-shadow">
                    <span className="pl-3 pr-2 text-yellow-400">
                        <CoinIcon className="w-5 h-5"/>
                    </span>
                    <input
                        id="requestAmount"
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0"
                        className="w-full bg-transparent p-2 text-white text-lg font-semibold placeholder-gray-500 focus:outline-none"
                        min="1"
                        disabled={!!success}
                    />
                </div>
            </div>
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            {success && <p className="text-green-500 text-sm text-center">{success}</p>}
        </main>

        <footer className="p-4 border-t border-zinc-700 bg-zinc-900/50 rounded-b-lg">
          <button
            onClick={handleSubmitRequest}
            disabled={!amount || parseInt(amount, 10) <= 0 || !!success}
            className="w-full p-3 font-bold text-lg rounded-lg transition duration-300 bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            {success ? 'Request Sent!' : 'Submit Request'}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default RequestCoinsModal;