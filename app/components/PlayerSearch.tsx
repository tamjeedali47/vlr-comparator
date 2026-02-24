'use client';

import { useState, useEffect } from 'react';
import { ValorantPlayer } from '../types/pandascore';

interface Props {
  onSelect: (player: ValorantPlayer) => void;
  placeholder: string;
}

export default function PlayerSearch({ onSelect, placeholder }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ValorantPlayer[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.length < 2) {
        setResults([]);
        return;
      }
      
      setLoading(true);
      try {
        // We'll create this API route next
        const res = await fetch(`/api/search-players?q=${query}`);
        const data = await res.json();
        setResults(data);
      } catch (err) {
        console.error("Search failed", err);
      } finally {
        setLoading(false);
      }
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="relative w-full">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="w-full p-3 bg-slate-800 rounded-lg border border-slate-700 focus:border-red-500 outline-none transition-colors"
      />
      
      {loading && <div className="absolute right-3 top-3 text-sm text-slate-400">Loading...</div>}

      {results.length > 0 && (
        <ul className="absolute z-10 w-full mt-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden">
          {results.map((player) => (
            <li 
              key={player.id}
              onClick={() => {
                onSelect(player);
                setQuery('');
                setResults([]);
              }}
              className="p-3 hover:bg-slate-700 cursor-pointer flex items-center gap-3"
            >
              {player.image_url && <img src={player.image_url} alt="" className="w-8 h-8 rounded-full bg-slate-900" />}
              <div>
                <div className="font-bold">{player.name}</div>
                <div className="text-xs text-slate-400">{player.current_team?.name || 'Free Agent'}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}