import React, { useState } from 'react';
import Card from './common/Card.tsx';
import { PlusCircleIcon } from './common/Icons.tsx';

interface AddUpcomingFightFormProps {
  onAddFight: (red: string, white: string) => Promise<string | null>;
}

const AddUpcomingFightForm: React.FC<AddUpcomingFightFormProps> = ({ onAddFight }) => {
  const [red, setRed] = useState('');
  const [white, setWhite] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await onAddFight(red, white);
    if (result) {
      setError(result);
    } else {
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
      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        {error && <p className="text-red-400 bg-red-900/50 p-2 rounded text-sm">{error}</p>}
        <div>
          <label htmlFor="red" className="block text-sm font-medium text-red-400">RED Participant</label>
          <input id="red" type="text" value={red} onChange={(e) => setRed(e.target.value)} required className="mt-1 w-full bg-zinc-700 text-white p-2 rounded border border-zinc-600 focus:ring-2 focus:ring-red-500 focus:outline-none transition" />
        </div>
        <div>
          <label htmlFor="white" className="block text-sm font-medium text-gray-300">WHITE Participant</label>
          <input id="white" type="text" value={white} onChange={(e) => setWhite(e.target.value)} required className="mt-1 w-full bg-zinc-700 text-white p-2 rounded border border-zinc-600 focus:ring-2 focus:ring-red-500 focus:outline-none transition" />
        </div>
        <button type="submit" disabled={loading} className="w-full p-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition disabled:bg-red-800/50">
          {loading ? 'Adding...' : 'Add to Queue'}
        </button>
      </form>
    </Card>
  );
};

export default AddUpcomingFightForm;