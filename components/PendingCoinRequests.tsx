
import React, { useState } from 'react';
import { CoinRequest, AllUserTypes } from '../types';
import Card from './common/Card';
import { UsersIcon, CheckCircleIcon, XCircleIcon } from './common/Icons';

interface PendingCoinRequestsProps {
  requests: CoinRequest[];
  onRespond: (requestId: string, response: 'APPROVED' | 'DECLINED') => Promise<string | null>;
  allUsers: { [id: string]: AllUserTypes };
  title: string;
}

const PendingCoinRequests: React.FC<PendingCoinRequestsProps> = ({ requests, onRespond, allUsers, title }) => {
    const [error, setError] = useState<{[key: string]: string | null}>({});

    const handleRespond = async (requestId: string, response: 'APPROVED' | 'DECLINED') => {
        const result = await onRespond(requestId, response);
        if (result) {
            setError(prev => ({ ...prev, [requestId]: result }));
            setTimeout(() => setError(prev => ({...prev, [requestId]: null})), 3000);
        }
    };

  return (
    <Card>
      <div className="p-4 border-b border-gray-700 flex items-center space-x-2">
        <UsersIcon className="w-6 h-6 text-gray-400" />
        <h3 className="text-lg font-semibold text-gray-200">{title} ({requests.length})</h3>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {requests.length === 0 ? (
          <p className="text-gray-500 text-center p-6">No pending requests.</p>
        ) : (
          <ul className="divide-y divide-gray-800">
            {requests.map(req => (
              <li key={req.id} className="p-3 space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-gray-300">{allUsers[req.fromUserId]?.name || 'Unknown'}</p>
                    <p className="text-sm text-yellow-400 font-mono">{req.amount.toLocaleString()} C</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button 
                        onClick={() => handleRespond(req.id, 'APPROVED')}
                        className="p-2 bg-green-600 hover:bg-green-700 rounded-full text-white transition"
                        title="Approve"
                    >
                        <CheckCircleIcon className="w-5 h-5" />
                    </button>
                     <button
                        onClick={() => handleRespond(req.id, 'DECLINED')} 
                        className="p-2 bg-red-600 hover:bg-red-700 rounded-full text-white transition"
                        title="Decline"
                    >
                        <XCircleIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                {error[req.id] && <p className="text-red-500 text-xs text-center bg-red-900/50 p-1 rounded">{error[req.id]}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
};

export default PendingCoinRequests;