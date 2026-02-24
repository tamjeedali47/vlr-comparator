'use client';
import { useState } from 'react';
import PlayerSearch from './components/PlayerSearch';
import { ValorantPlayer } from './types/pandascore';

export default function ComparisonPage() {
  const [slotA, setSlotA] = useState<ValorantPlayer | null>(null);
  const [slotB, setSlotB] = useState<ValorantPlayer | null>(null);

  return (
    <main className="p-12 bg-slate-950 text-white min-h-screen">
      <div className="grid grid-cols-2 gap-8 max-w-6xl mx-auto">
        
        {/* Box 1 */}
        <div className="p-8 bg-slate-900 rounded-xl border-2 border-slate-800 flex flex-col items-center">
          {slotA ? (
            <div className="text-center">
              <img src={slotA.image_url || '/placeholder.png'} className="w-32 h-32 rounded-full mb-4" />
              <h2 className="text-2xl font-bold">{slotA.name}</h2>
              <button onClick={() => setSlotA(null)} className="mt-4 text-red-400 text-sm underline">Remove</button>
            </div>
          ) : (
            <PlayerSearch onSelect={setSlotA} placeholder="Find Player 1..." />
          )}
        </div>

        {/* Box 2 */}
        <div className="p-8 bg-slate-900 rounded-xl border-2 border-slate-800 flex flex-col items-center">
          {slotB ? (
            <div className="text-center">
              <img src={slotB.image_url || '/placeholder.png'} className="w-32 h-32 rounded-full mb-4" />
              <h2 className="text-2xl font-bold">{slotB.name}</h2>
              <button onClick={() => setSlotB(null)} className="mt-4 text-red-400 text-sm underline">Remove</button>
            </div>
          ) : (
            <PlayerSearch onSelect={setSlotB} placeholder="Find Player 2..." />
          )}
        </div>

      </div>
    </main>
  );
}