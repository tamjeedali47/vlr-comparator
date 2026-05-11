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
  const [error, setError] = useState('');

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.length < 2) {
        setResults([]);
        setError('');
        return;
      }
      
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/search-players?q=${encodeURIComponent(query)}`);
        if (!res.ok) {
          throw new Error('Search request failed');
        }
        const data = await res.json();
        setResults(data);
      } catch (err) {
        console.error('Search failed', err);
        setResults([]);
        setError('Player search is unavailable');
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="relative w-full">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-white outline-none transition-colors placeholder:text-zinc-500 focus:border-cyan-300"
      />
      
      {loading && <div className="absolute right-3 top-3 text-sm text-zinc-400">Loading...</div>}

      {results.length > 0 && (
        <ul className="absolute z-10 mt-2 max-h-80 w-full overflow-auto rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl">
          {results.map((player) => (
            <li 
              key={player.id}
              onClick={() => {
                onSelect(player);
                setQuery('');
                setResults([]);
                setError('');
              }}
              className="flex cursor-pointer items-center gap-3 p-3 transition hover:bg-zinc-800"
            >
              {player.image_url ? (
                <img src={player.image_url} alt="" className="h-9 w-9 rounded-md bg-zinc-950 object-cover" />
              ) : (
                <div className="grid h-9 w-9 place-items-center rounded-md bg-zinc-950 text-sm font-bold text-zinc-500">
                  {player.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <div className="font-bold">{player.name}</div>
                <div className="truncate text-xs text-zinc-400">{player.current_team?.name || 'Free Agent'}</div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="mt-2 text-sm text-rose-300">{error}</p>}
    </div>
  );
}
