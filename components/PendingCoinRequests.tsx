import React from 'react';
import { CoinRequest, AllUserTypes } from '../types';
import Card from './common/Card';
import { CheckCircleIcon, XCircleIcon, CoinIcon } from './common/Icons';

interface PendingCoinRequestsProps {
  requests: CoinRequest[];
  onRespond: (requestId: string, response: 'APPROVED' | 'DECLINED') => Promise<string | null>;
  allUsers: { [id: string]: AllUserTypes };
  title: string;
}

const PendingCoinRequests: React.FC<PendingCoinRequestsProps> = ({ requests, onRespond, allUsers, title }) => {
  const pending = requests.filter(r => r.status === 'PENDING');

  const handleRespond = (requestId: string, response: 'APPROVED' | 'DECLINED') => {
      onRespond(requestId, response);
  };

  return (
    <Card>
      <div className="p-4 border-b border-gray-700 flex items-center space-x-2">
        <CoinIcon className="w-6 h-6 text-yellow-400" />
        <h3 className="text-lg font-semibold text-gray-200">{title}</h3>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {pending.length === 0 ? (
          <p className="text-gray-500 text-center p-6">No pending requests.</p>
        ) : (
          <ul className="divide-y divide-gray-800">
            {pending.map(req => {
              const fromUser = allUsers[req.fromUserId];
              return (
                <li key={req.id} className="p-3 flex justify-between items-center">
                    <div>
                        <p className="font-semibold text-gray-300">{fromUser?.name || 'Unknown User'}</p>
                        <p className="text-sm text-yellow-400">{req.amount.toLocaleString()} C</p>
                        <p className="text-xs text-gray-500">{new Date(req.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="flex space-x-2">
                        <button
                            onClick={() => handleRespond(req.id, 'APPROVED')}
                            className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-full transition duration-300"
                            aria-label="Approve"
                        >
                           <CheckCircleIcon className="w-6 h-6" />
                        </button>
                        <button
                            onClick={() => handleRespond(req.id, 'DECLINED')}
                            className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-full transition duration-300"
                            aria-label="Decline"
                        >
                            <XCircleIcon className="w-6 h-6" />
                        </button>
                    </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Card>
  );
};

export default PendingCoinRequests;
