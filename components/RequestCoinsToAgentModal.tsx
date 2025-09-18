import React, { useState } from 'react';
import { XMarkIcon } from './common/Icons';
import { Agent } from '../types';

interface RequestCoinsToAgentModalProps {
  onClose: () => void;
  onSubmit: (amount: number, targetUserId: string) => Promise<string | null>;
  agents: Agent[];
}

const RequestCoinsToAgentModal: React.FC<RequestCoinsToAgentModalProps> = ({ onClose, onSubmit, agents }) => {
  const [amount, setAmount] = useState('');
  const [targetId, setTargetId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetId) {
      setError('Please select an Agent.');
      return;
    }
    const requestAmount = parseInt(amount, 10);
    if (isNaN(requestAmount) || requestAmount <= 0) {
      setError('Please enter a valid amount.');
      return;
    }
    setLoading(true);
    setError(null);
    const result = await onSubmit(requestAmount, targetId);
    if (result) {
      setError(result);
      setLoading(false);
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-800 rounded-lg shadow-2xl border border-zinc-700 w-full max-w-sm">
        <div className="p-4 border-b border-zinc-700 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-200">Request Coins</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="agent" className="block text-sm font-medium text-gray-400">
              Request from Agent
            </label>
            <select
              id="agent"
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="mt-1 w-full bg-zinc-700 text-white p-3 rounded border border-zinc-600 focus:ring-2 focus:ring-red-500 focus:outline-none transition text-base"
              required
            >
              <option value="" disabled>-- Select an Agent --</option>
              {agents.map(agent => (
                <option key={agent.id} value={agent.id}>{agent.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-400">
              Amount
            </label>
            <input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 w-full bg-zinc-700 text-white p-3 rounded border border-zinc-600 focus:ring-2 focus:ring-red-500 focus:outline-none transition text-xl"
              autoFocus
              min="1"
              placeholder="e.g., 1000"
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading || agents.length === 0}
            className="w-full p-3 font-bold rounded-lg transition bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Sending Request...' : 'Send Request'}
          </button>
          {agents.length === 0 && <p className="text-yellow-400 text-center text-sm mt-2">No Agents are available to request from.</p>}
        </form>
      </div>
    </div>
  );
};

export default RequestCoinsToAgentModal;
