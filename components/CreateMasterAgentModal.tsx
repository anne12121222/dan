import React, { useState } from 'react';
import { XMarkIcon } from './common/Icons.tsx';

interface CreateMasterAgentModalProps {
  onClose: () => void;
  onSubmit: (name: string, email: string, password: string) => Promise<string | null>;
}

const CreateMasterAgentModal: React.FC<CreateMasterAgentModalProps> = ({ onClose, onSubmit }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
        setError("Password should be at least 6 characters.");
        return;
    }
    setLoading(true);
    setError(null);
    const result = await onSubmit(name, email, password);
    if (result) {
      if (result.toLowerCase().includes('error:')) {
        setError(result);
      } else {
        onClose();
      }
      setLoading(false);
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-800 rounded-lg shadow-2xl border border-zinc-700 w-full max-w-sm">
        <div className="p-4 border-b border-zinc-700 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-200">Create New Master Agent</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400">Master Agent Full Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 w-full bg-zinc-700 text-white p-2 rounded border border-zinc-600 focus:ring-2 focus:ring-blue-500 focus:outline-none transition" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400">Master Agent Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1 w-full bg-zinc-700 text-white p-2 rounded border border-zinc-600 focus:ring-2 focus:ring-blue-500 focus:outline-none transition" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400">Temporary Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="mt-1 w-full bg-zinc-700 text-white p-2 rounded border border-zinc-600 focus:ring-2 focus:ring-blue-500 focus:outline-none transition" />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button type="submit" disabled={loading} className="w-full p-3 font-bold rounded-lg transition bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? 'Creating Master Agent...' : 'Create Master Agent'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateMasterAgentModal;