

import React from 'react';
// FIX: Widen type to handle all possible fight outcomes.
import { FightStatus, FightWinner } from '../types';
import FightInfoBar from './FightInfoBar';

interface LiveFeedProps {
  fightStatus: FightStatus;
  // FIX: Widen type to handle all possible fight outcomes.
  lastWinner: FightWinner | null;
  fightId: number;
  timer: number;
}

const LiveFeed: React.FC<LiveFeedProps> = ({ fightStatus, lastWinner, fightId, timer }) => {
  // --- STREAMING URL ---
  // To connect your own live stream:
  // 1. Set up a streaming service (like YouTube Live, Twitch, Cloudflare Stream, or your own media server).
  // 2. This service will provide you with an HLS (.m3u8) or DASH (.mpd) playback URL.
  // 3. Replace the placeholder URL below with your actual stream URL.
  const streamUrl = 'https://stream.mux.com/A3VXy02VoUinw02KLsoMy4dp29e02bXaley.m3u8'; // Placeholder HLS stream

  const showVideo = fightStatus === FightStatus.BETTING_OPEN || fightStatus === FightStatus.BETTING_CLOSED;

  return (
    <div className="bg-black rounded-lg overflow-hidden relative shadow-2xl border border-zinc-700">
      <FightInfoBar fightId={fightId} status={fightStatus} timer={timer} />
      <div className="aspect-video w-full bg-zinc-900">
        {/* The video player is now the base layer */}
        <video
          key={fightId} // Use fightId as a key to force re-render on new fight
          className={`w-full h-full object-cover ${showVideo ? 'block' : 'hidden'}`}
          src={streamUrl}
          autoPlay
          muted
          playsInline // Essential for autoplay on mobile devices
          controls={false} // Hide default controls for a cleaner look
        ></video>
        
        {/* Overlays will appear on top of the video */}
        {fightStatus === FightStatus.SETTLED && lastWinner && (
           <div className="absolute inset-0 flex items-center justify-center bg-black/70">
             <div className="text-center">
               {/* FIX: Update rendering to handle DRAW and CANCELLED fight outcomes. */}
               <h2 className={`text-6xl font-bold animate-pulse ${
                 lastWinner === 'RED'
                   ? 'text-red-500'
                   : lastWinner === 'WHITE'
                   ? 'text-gray-200'
                   : lastWinner === 'DRAW'
                   ? 'text-yellow-500'
                   : 'text-gray-400'
               }`}>
                 {lastWinner === 'RED' || lastWinner === 'WHITE'
                   ? `${lastWinner} WINS!`
                   : lastWinner === 'DRAW'
                   ? 'DRAW'
                   : 'FIGHT CANCELLED'}
               </h2>
               <p className="text-gray-400 mt-2">Waiting for operator to start the next fight...</p>
             </div>
           </div>
        )}
        
        {fightStatus === FightStatus.SETTLED && !lastWinner && (
             <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
               <div className="text-center">
                  <p className="text-gray-400 text-lg">Welcome, Operator!</p>
                  <p className="text-gray-500 text-sm">Click "Start Next Fight" to begin the event.</p>
              </div>
             </div>
        )}
      </div>
    </div>
  );
};

export default LiveFeed;
