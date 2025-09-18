import React, { useState } from 'react';
import { XMarkIcon } from './common/Icons.tsx';

interface ChangePasswordModalProps {
  onClose: () => void;
  onChangePassword: (oldPassword: string, newPassword: string) => Promise<string | null>;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ onClose, onChangePassword }) => {
  const [oldPassword, setOldPassword] = useState(''); // This is often not needed with Supabase's updateUser, but we'll include it for a more complete form example. The passed function might not use it.
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
        setError("Password should be at least 6 characters.");
        return;
    }

    setLoading(true);
    setError(null);
    // The handle in App.tsx only takes newPassword
    const result = await onChangePassword(oldPassword, newPassword);
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
          <h3 className="text-lg font-bold text-gray-200">Change Password</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
           {/*
            Supabase `updateUser` doesn't require the old password if the user is authenticated.
            We can simplify the form to only ask for the new password.
            If your RLS policies or app logic require it, you can re-add this field.
            <div>
                <label className="block text-sm font-medium text-gray-400">Old Password</label>
                <input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} required className="mt-1 w-full bg-zinc-700 text-white p-2 rounded border border-zinc-600 focus:ring-2 focus:ring-red-500 focus:outline-none transition" />
            </div>
           */}
          <div>
            <label className="block text-sm font-medium text-gray-400">New Password</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required className="mt-1 w-full bg-zinc-700 text-white p-2 rounded border border-zinc-600 focus:ring-2 focus:ring-red-500 focus:outline-none transition" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400">Confirm New Password</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="mt-1 w-full bg-zinc-700 text-white p-2 rounded border border-zinc-600 focus:ring-2 focus:ring-red-500 focus:outline-none transition" />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button type="submit" disabled={loading} className="w-full p-3 font-bold rounded-lg transition bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChangePasswordModal;