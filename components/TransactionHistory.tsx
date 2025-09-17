
import React from 'react';
import { Transaction, AllUserTypes } from '../types';
import Card from './common/Card';
import { HistoryIcon } from './common/Icons';

interface TransactionHistoryProps {
    title: string;
    transactions: Transaction[];
    allUsers: { [id: string]: AllUserTypes };
    currentUserId: string;
}

const TransactionHistory: React.FC<TransactionHistoryProps> = ({ title, transactions, allUsers, currentUserId }) => {
  return (
    <Card>
      <div className="p-4 border-b border-gray-700 flex items-center space-x-2">
        <HistoryIcon className="w-6 h-6 text-gray-400" />
        <h3 className="text-lg font-semibold text-gray-200">{title}</h3>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {transactions.length === 0 ? (
          <p className="text-gray-500 text-center p-6">No transactions yet.</p>
        ) : (
          <ul className="divide-y divide-gray-800">
            {[...transactions].reverse().map(tx => {
              const fromName = tx.from === 'MINT' ? 'SYSTEM' : allUsers[tx.from]?.name || 'Unknown';
              const toName = allUsers[tx.to]?.name || 'Unknown';
              const isCredit = tx.to === currentUserId;

              const getDescription = () => {
                if (tx.type === 'COMMISSION') {
                  return isCredit ? `Commission from ${fromName}` : `Paid commission to ${toName}`;
                }
                if (tx.from === 'MINT') return `Minted to ${toName}`;
                if (tx.from === currentUserId) return `Sent to ${toName}`;
                return `Received from ${fromName}`;
              };

              return (
                <li key={tx.id} className="p-3">
                  <div className="flex justify-between items-center text-sm">
                    <div>
                        <p className="font-semibold text-gray-300">
                            {getDescription()}
                        </p>
                        <p className="text-xs text-gray-500">{new Date(tx.timestamp).toLocaleString()}</p>
                    </div>
                    <span className={`font-bold ${isCredit ? 'text-green-400' : 'text-red-400'}`}>
                      {isCredit ? '+' : '-'}{tx.amount.toLocaleString()}
                    </span>
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

export default TransactionHistory;