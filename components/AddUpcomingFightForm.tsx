import React, { useState } from 'react';
import Card from './common/Card';
import { PlusCircleIcon } from './common/Icons';

interface AddUpcomingFightFormProps {
  onAddFight: (red: string, white: string) => Promise<string | null>;
}

const AddUpcomingFightForm: React.FC<AddUpcomingFightFormProps> = ({ onAddFight }) => {
  const [red, setRed] = useState('');
  const [white, setWhite] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAddFight = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!red.trim() || !white.trim()) {
        setError("Both participant names are required.");
        return;
    }
    setError(null);
    setLoading(true);

    const result = await onAddFight(red, white);
    if (result) {
        setError(result);
    } else {
        // Clear form on success
        setRed('');
        setWhite('');
    }
    setLoading(false);
  };

  return (
    <Card>
      <div className="p-4 border-b border-gray-700 flex items-center space-x-2">
        <PlusCircleIcon className="w-6 h-6 text-gray-400" />
        <h3 className="text-lg font-semibold text-gray-200">Add Upcoming Fight</h3>
      </div>
      <form onSubmit={handleAddFight}>
        <div className="p-4 space-y-4">
          {error && <p className="text-red-400 text-center text-sm">{error}</p>}
          <div>
            <label htmlFor="red-participant" className="block text-sm font-medium text-red-400 mb-1">RED Participant</label>
            <input
              id="red-participant"
              type="text"
              value={red}
              onChange={(e) => setRed(e.target.value)}
              placeholder="e.g., 'Thunder'"
              required
              className="w-full bg-zinc-700 text-white p-2 rounded border border-zinc-600 focus:ring-2 focus:ring-red-500 focus:outline-none transition"
              disabled={loading}
            />
          </div>
          <div>
            <label htmlFor="white-participant" className="block text-sm font-medium text-gray-300 mb-1">WHITE Participant</label>
            <input
              id="white-participant"
              type="text"
              value={white}
              onChange={(e) => setWhite(e.target.value)}
              placeholder="e.g., 'Lightning'"
              required
              className="w-full bg-zinc-700 text-white p-2 rounded border border-zinc-600 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
              disabled={loading}
            />
          </div>
        </div>
        <div className="p-4 bg-zinc-900/50 rounded-b-lg">
          <button
            type="submit"
            disabled={loading}
            className="w-full p-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition duration-300 disabled:bg-blue-800/50 disabled:cursor-not-allowed"
          >
            {loading ? 'Adding...' : 'Add Fight to Queue'}
          </button>
        </div>
      </form>
    </Card>
  );
};

export default AddUpcomingFightForm;
