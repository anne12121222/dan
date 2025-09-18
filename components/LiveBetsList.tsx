

import React, { useState, useEffect } from 'react';
import Card from './common/Card';
import { Bet, AllUserTypes, BetChoice } from '../types';
import { supabase } from '../supabaseClient';

// Type for the raw bet data from Supabase subscription, matching the DB schema
interface SupabaseBetPayload {
  id: string;
  user_id: string;
  fight_id: number;
  amount: number;
  choice: BetChoice;
  created_at: string;
}

interface LiveBetsListProps {
  bets: Bet[]; // This will serve as the initial list of bets for a fight
  allUsers: { [id: string]: AllUserTypes };
  fightId: number;
}

const LiveBetsList: React.FC<LiveBetsListProps> = ({ bets: initialBets, allUsers, fightId }) => {
  const [bets, setBets] = useState<Bet[]>(initialBets);

  // Effect to reset the list when a new fight starts (i.e., fightId changes)
  useEffect(() => {
    setBets(initialBets);
  }, [fightId, initialBets]);

  // Effect to subscribe to real-time bet updates
  useEffect(() => {
    // Ensure we have a valid client and fightId before subscribing
    if (!supabase || !fightId) return;

    const handleNewBet = (payload: { new: SupabaseBetPayload }) => {
      const newBetPayload = payload.new;
      
      // Map snake_case from the database to camelCase used in the application's Bet type
      const newBet: Bet = {
        id: newBetPayload.id,
        userId: newBetPayload.user_id,
        fightId: newBetPayload.fight_id,
        amount: newBetPayload.amount,
        choice: newBetPayload.choice,
      };

      // Use a functional update to add the new bet, preventing duplicates
      setBets((currentBets) => {
        if (currentBets.some(b => b.id === newBet.id)) {
          return currentBets; // If bet already exists, don't change the state
        }
        // Prepend the new bet to show it at the top of the list
        return [newBet, ...currentBets];
      });
    };

    const channel = supabase
      .channel(`live-bets-for-fight-${fightId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bets',
          filter: `fight_id=eq.${fightId}`,
        },
        handleNewBet
      )
      .subscribe();

    // Cleanup function to remove the subscription when the component unmounts or fightId changes
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fightId]); // Re-subscribe if the fightId changes

  return (
    <Card>
      <div className="p-4 border-b border-gray-700">
        <h3 className="text-lg font-semibold text-gray-200">Live Bets for Current Fight</h3>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {bets.length === 0 ? (
          <p className="text-gray-500 text-center p-6">No bets placed yet for this fight.</p>
        ) : (
          <ul className="divide-y divide-gray-800">
            {bets.map(bet => (
              <li key={bet.id} className="p-3 flex justify-between items-center">
                <span className="font-semibold text-gray-300">{allUsers[bet.userId]?.name || 'Unknown Player'}</span>
                <div className="text-right">
                  <p className={`font-bold text-lg ${bet.choice === 'RED' ? 'text-red-400' : 'text-gray-200'}`}>
                    {bet.choice}
                  </p>
                  <p className="text-sm text-yellow-400">{bet.amount.toLocaleString()}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
};

export default LiveBetsList;