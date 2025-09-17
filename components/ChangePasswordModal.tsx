import React, { useState } from 'react';
import { XMarkIcon } from './common/Icons';

interface ChangePasswordModalProps {
  onClose: () => void;
  onChangePassword: (oldPassword: string, newPassword: string) => Promise<string | null>;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ onClose, onChangePassword }) => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
        setError("New password must be at least 6 characters long.");
        return;
    }

    setError(null);
    setLoading(true);
    const result = await onChangePassword(oldPassword, newPassword);
    setLoading(false);

    if (result) {
      setError(result);
    } else {
      setSuccess(true);
      setTimeout(() => onClose(), 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-800 rounded-lg shadow-2xl border border-zinc-700 w-full max-w-md">
        <form onSubmit={handleSubmit}>
          <div className="p-6 border-b border-zinc-700 flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-200">Change Password</h3>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-white">
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
          <div className="p-6">
            {success ? (
                 <p className="text-green-400 text-center p-2 bg-green-900/50 rounded-md">Password updated successfully!</p>
            ) : (
                <div className="space-y-4">
                    {error && <p className="text-red-400 text-center text-sm p-2 bg-red-900/50 rounded-md">{error}</p>}
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Current Password</label>
                        <input type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} required className="w-full bg-zinc-700 text-white p-2 rounded border border-zinc-600 focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">New Password</label>
                        <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required className="w-full bg-zinc-700 text-white p-2 rounded border border-zinc-600 focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Confirm New Password</label>
                        <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className="w-full bg-zinc-700 text-white p-2 rounded border border-zinc-600 focus:ring-2 focus:ring-blue-500" />
                    </div>
                </div>
            )}
          </div>
          {!success && (
            <div className="p-4 bg-zinc-900/50 rounded-b-lg">
                <button type="submit" className="w-full p-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg" disabled={loading}>
                {loading ? 'Updating...' : 'Update Password'}
                </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default ChangePasswordModal;
