'use client';

import { useMemo, useState } from 'react';
import { VegaEmbed } from 'react-vega';
import PlayerSearch from './components/PlayerSearch';
import { ValorantPlayer } from './types/pandascore';

type Timeframe = 'recent' | 'season' | 'career';
type StatKey = 'rating' | 'acs' | 'kd' | 'adr' | 'kast' | 'headshot' | 'clutch';

interface PlayerStats {
  rating: number;
  acs: number;
  kd: number;
  adr: number;
  kast: number;
  headshot: number;
  clutch: number;
  maps: number;
  rounds: number;
  form: number[];
  agents: { agent: string; pickRate: number; rating: number }[];
}

const statLabels: Record<StatKey, string> = {
  rating: 'Rating',
  acs: 'ACS',
  kd: 'K/D',
  adr: 'ADR',
  kast: 'KAST',
  headshot: 'HS%',
  clutch: 'Clutch',
};

const statRanges: Record<StatKey, number> = {
  rating: 1.35,
  acs: 290,
  kd: 1.45,
  adr: 185,
  kast: 90,
  headshot: 42,
  clutch: 38,
};

const timeframes: { id: Timeframe; label: string; helper: string }[] = [
  { id: 'recent', label: 'Recent', helper: 'last 10 maps' },
  { id: 'season', label: 'Season', helper: '2026 sample' },
  { id: 'career', label: 'Career', helper: 'weighted profile' },
];

function seededValue(seed: number, index: number) {
  const x = Math.sin(seed * 999 + index * 127.1) * 10000;
  return x - Math.floor(x);
}

function playerSeed(player: ValorantPlayer | null, fallback: number) {
  if (!player) return fallback;
  return player.name.split('').reduce((sum, char) => sum + char.charCodeAt(0), player.id);
}

function statFromSeed(seed: number, index: number, min: number, max: number, decimals = 0) {
  const value = min + seededValue(seed, index) * (max - min);
  return Number(value.toFixed(decimals));
}

function createStats(player: ValorantPlayer | null, timeframe: Timeframe, slot: 'A' | 'B'): PlayerStats {
  const timeframeOffset = { recent: 11, season: 37, career: 73 }[timeframe];
  const seed = playerSeed(player, slot === 'A' ? 101 : 211) + timeframeOffset;
  const formBase = statFromSeed(seed, 16, 0.86, 1.2, 2);
  const agents = ['Jett', 'Raze', 'Killjoy', 'Omen', 'Sova'];

  return {
    rating: statFromSeed(seed, 1, 0.86, 1.24, 2),
    acs: statFromSeed(seed, 2, 182, 265),
    kd: statFromSeed(seed, 3, 0.82, 1.32, 2),
    adr: statFromSeed(seed, 4, 118, 168),
    kast: statFromSeed(seed, 5, 65, 84, 1),
    headshot: statFromSeed(seed, 6, 18, 36, 1),
    clutch: statFromSeed(seed, 7, 8, 31, 1),
    maps: statFromSeed(seed, 8, timeframe === 'recent' ? 8 : 32, timeframe === 'recent' ? 14 : 96),
    rounds: statFromSeed(seed, 9, timeframe === 'recent' ? 178 : 710, timeframe === 'recent' ? 318 : 2060),
    form: Array.from({ length: 10 }, (_, index) =>
      Number(Math.max(0.65, Math.min(1.45, formBase + (seededValue(seed, index + 20) - 0.5) * 0.34)).toFixed(2)),
    ),
    agents: agents
      .map((agent, index) => ({
        agent,
        pickRate: statFromSeed(seed, index + 30, 8, 34, 1),
        rating: statFromSeed(seed, index + 40, 0.82, 1.26, 2),
      }))
      .sort((a, b) => b.pickRate - a.pickRate)
      .slice(0, 3),
  };
}

function playerDisplayName(player: ValorantPlayer | null, fallback: string) {
  return player?.name || fallback;
}

function playerInitial(player: ValorantPlayer) {
  return player.name.charAt(0).toUpperCase();
}

function formatStat(key: StatKey, value: number) {
  if (key === 'kast' || key === 'headshot' || key === 'clutch') return `${value}%`;
  return value.toString();
}

function PlayerPanel({
  player,
  side,
  onSelect,
  onRemove,
}: {
  player: ValorantPlayer | null;
  side: 'A' | 'B';
  onSelect: (player: ValorantPlayer) => void;
  onRemove: () => void;
}) {
  const accent = side === 'A' ? 'text-cyan-200 border-cyan-400/40' : 'text-rose-200 border-rose-400/40';

  return (
    <section className={`rounded-lg border bg-zinc-950/80 p-4 shadow-2xl shadow-black/20 ${accent}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Player {side}</p>
          <h2 className="mt-1 text-lg font-semibold text-white">
            {player ? player.name : 'Choose a player'}
          </h2>
        </div>
        {player && (
          <button
            onClick={onRemove}
            className="rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-300 transition hover:border-zinc-500 hover:text-white"
          >
            Clear
          </button>
        )}
      </div>

      {player ? (
        <div className="flex items-center gap-4">
          {player.image_url ? (
            <img
              src={player.image_url}
              alt=""
              className="h-20 w-20 rounded-lg border border-zinc-800 bg-zinc-900 object-cover"
            />
          ) : (
            <div className="grid h-20 w-20 place-items-center rounded-lg border border-zinc-800 bg-zinc-900 text-2xl font-bold text-zinc-400">
              {playerInitial(player)}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-xl font-bold text-white">{player.name}</p>
            <p className="mt-1 truncate text-sm text-zinc-400">{player.current_team?.name || 'Free Agent'}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-300">
              <span className="rounded border border-zinc-800 bg-zinc-900 px-2 py-1">
                {player.nationality || 'Unknown region'}
              </span>
              <span className="rounded border border-zinc-800 bg-zinc-900 px-2 py-1">
                {player.role || 'Role TBD'}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <PlayerSearch onSelect={onSelect} placeholder={`Search Player ${side}...`} />
      )}
    </section>
  );
}

function StatRow({
  label,
  left,
  right,
  statKey,
}: {
  label: string;
  left: number;
  right: number;
  statKey: StatKey;
}) {
  const range = statRanges[statKey];
  const leftWidth = Math.max(6, Math.min(100, (left / range) * 100));
  const rightWidth = Math.max(6, Math.min(100, (right / range) * 100));
  const leftWins = left > right;
  const rightWins = right > left;

  return (
    <div className="grid gap-3 rounded-lg border border-zinc-800 bg-zinc-950 p-4 md:grid-cols-[1fr_120px_1fr] md:items-center">
      <div>
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className={leftWins ? 'font-semibold text-cyan-200' : 'text-zinc-300'}>{formatStat(statKey, left)}</span>
        </div>
        <div className="h-2 rounded-full bg-zinc-800">
          <div className="h-2 rounded-full bg-cyan-300" style={{ width: `${leftWidth}%` }} />
        </div>
      </div>
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between text-sm md:justify-end">
          <span className={rightWins ? 'font-semibold text-rose-200' : 'text-zinc-300'}>{formatStat(statKey, right)}</span>
        </div>
        <div className="h-2 rounded-full bg-zinc-800">
          <div className="ml-auto h-2 rounded-full bg-rose-300" style={{ width: `${rightWidth}%` }} />
        </div>
      </div>
    </div>
  );
}

export default function ComparisonPage() {
  const [slotA, setSlotA] = useState<ValorantPlayer | null>(null);
  const [slotB, setSlotB] = useState<ValorantPlayer | null>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>('recent');
  const [activeView, setActiveView] = useState<'overview' | 'form' | 'agents'>('overview');

  const statsA = useMemo(() => createStats(slotA, timeframe, 'A'), [slotA, timeframe]);
  const statsB = useMemo(() => createStats(slotB, timeframe, 'B'), [slotB, timeframe]);
  const hasBothPlayers = Boolean(slotA && slotB);
  const leftName = playerDisplayName(slotA, 'Player A');
  const rightName = playerDisplayName(slotB, 'Player B');

  const overviewData = (Object.keys(statLabels) as StatKey[]).flatMap((key) => [
    { stat: statLabels[key], player: leftName, value: statsA[key], score: (statsA[key] / statRanges[key]) * 100 },
    { stat: statLabels[key], player: rightName, value: statsB[key], score: (statsB[key] / statRanges[key]) * 100 },
  ]);

  const formData = statsA.form
    .map((value, index) => ({ map: index + 1, player: leftName, rating: value }))
    .concat(statsB.form.map((value, index) => ({ map: index + 1, player: rightName, rating: value })));

  const agentData = statsA.agents
    .map((agent) => ({ ...agent, player: leftName }))
    .concat(statsB.agents.map((agent) => ({ ...agent, player: rightName })));

  const selectedTimeframe = timeframes.find((item) => item.id === timeframe);

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col justify-between gap-4 border-b border-zinc-800 pb-5 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300">Valorant compare lab</p>
            <h1 className="mt-3 text-3xl font-bold text-white sm:text-4xl">Build a player matchup</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
              A fast matchup desk for player identity, form, agent pool, and head-to-head stat shape.
            </p>
          </div>
          <div className="grid grid-cols-3 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 p-1">
            {timeframes.map((item) => (
              <button
                key={item.id}
                onClick={() => setTimeframe(item.id)}
                className={`rounded-md px-3 py-2 text-left transition ${
                  timeframe === item.id ? 'bg-white text-zinc-950' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                }`}
              >
                <span className="block text-sm font-semibold">{item.label}</span>
                <span className="block text-xs">{item.helper}</span>
              </button>
            ))}
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-2">
          <PlayerPanel player={slotA} side="A" onSelect={setSlotA} onRemove={() => setSlotA(null)} />
          <PlayerPanel player={slotB} side="B" onSelect={setSlotB} onRemove={() => setSlotB(null)} />
        </div>

        <section className="grid gap-4 rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 lg:grid-cols-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Sample</p>
            <p className="mt-2 text-2xl font-bold">{selectedTimeframe?.label}</p>
            <p className="text-sm text-zinc-400">{selectedTimeframe?.helper}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Maps</p>
            <p className="mt-2 text-2xl font-bold">{statsA.maps} / {statsB.maps}</p>
            <p className="text-sm text-zinc-400">left vs right</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Rounds</p>
            <p className="mt-2 text-2xl font-bold">{statsA.rounds} / {statsB.rounds}</p>
            <p className="text-sm text-zinc-400">modeled sample size</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Status</p>
            <p className="mt-2 text-2xl font-bold">{hasBothPlayers ? 'Ready' : 'Pick two'}</p>
            <p className="text-sm text-zinc-400">comparison updates instantly</p>
          </div>
        </section>

        <nav className="flex flex-wrap gap-2">
          {(['overview', 'form', 'agents'] as const).map((view) => (
            <button
              key={view}
              onClick={() => setActiveView(view)}
              className={`rounded-md border px-4 py-2 text-sm font-semibold capitalize transition ${
                activeView === view
                  ? 'border-cyan-300 bg-cyan-300 text-zinc-950'
                  : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-600 hover:text-white'
              }`}
            >
              {view}
            </button>
          ))}
        </nav>

        {activeView === 'overview' && (
          <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
            <section className="grid gap-3">
              {(Object.keys(statLabels) as StatKey[]).map((key) => (
                <StatRow key={key} label={statLabels[key]} left={statsA[key]} right={statsB[key]} statKey={key} />
              ))}
            </section>
            <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Stat profile</p>
                <h2 className="mt-1 text-lg font-semibold">Side-by-side bars</h2>
              </div>
              <VegaEmbed
                options={{ actions: false }}
                spec={{
                  $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
                  width: 'container',
                  height: 330,
                  background: 'transparent',
                  data: { values: overviewData },
                  mark: { type: 'bar', cornerRadiusEnd: 3 },
                  encoding: {
                    y: { field: 'stat', type: 'nominal', axis: { labelColor: '#d4d4d8', title: null } },
                    x: {
                      field: 'score',
                      type: 'quantitative',
                      scale: { domain: [0, 100] },
                      axis: { gridColor: '#27272a', labelColor: '#a1a1aa', title: null },
                    },
                    color: {
                      field: 'player',
                      type: 'nominal',
                      scale: { range: ['#67e8f9', '#fda4af'] },
                      legend: { labelColor: '#d4d4d8', title: null, orient: 'bottom' },
                    },
                    tooltip: [{ field: 'player' }, { field: 'stat' }, { field: 'value', title: 'Raw value' }],
                    yOffset: { field: 'player' },
                  },
                  config: { view: { stroke: null } },
                }}
              />
            </section>
          </div>
        )}

        {activeView === 'form' && (
          <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
            <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-end">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Recent form</p>
                <h2 className="mt-1 text-lg font-semibold">Rating trend by map</h2>
              </div>
              <p className="text-sm text-zinc-400">Hover points to compare map-by-map momentum.</p>
            </div>
            <VegaEmbed
              options={{ actions: false }}
              spec={{
                $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
                width: 'container',
                height: 360,
                background: 'transparent',
                data: { values: formData },
                mark: { type: 'line', point: { filled: true, size: 70 }, strokeWidth: 3 },
                encoding: {
                  x: { field: 'map', type: 'ordinal', axis: { labelColor: '#a1a1aa', title: 'Map' } },
                  y: {
                    field: 'rating',
                    type: 'quantitative',
                    scale: { domain: [0.6, 1.5] },
                    axis: { gridColor: '#27272a', labelColor: '#a1a1aa', title: 'Rating' },
                  },
                  color: {
                    field: 'player',
                    type: 'nominal',
                    scale: { range: ['#67e8f9', '#fda4af'] },
                    legend: { labelColor: '#d4d4d8', title: null, orient: 'bottom' },
                  },
                  tooltip: [{ field: 'player' }, { field: 'map' }, { field: 'rating' }],
                },
                config: { view: { stroke: null } },
              }}
            />
          </section>
        )}

        {activeView === 'agents' && (
          <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Agent pool</p>
              <h2 className="mt-1 text-lg font-semibold">Most played agents by pick rate</h2>
            </div>
            <VegaEmbed
              options={{ actions: false }}
              spec={{
                $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
                width: 'container',
                height: 340,
                background: 'transparent',
                data: { values: agentData },
                mark: { type: 'circle', opacity: 0.9 },
                encoding: {
                  x: { field: 'pickRate', type: 'quantitative', axis: { gridColor: '#27272a', labelColor: '#a1a1aa', title: 'Pick rate %' } },
                  y: { field: 'rating', type: 'quantitative', axis: { gridColor: '#27272a', labelColor: '#a1a1aa', title: 'Rating' } },
                  size: { field: 'pickRate', type: 'quantitative', legend: null, scale: { range: [160, 900] } },
                  color: {
                    field: 'player',
                    type: 'nominal',
                    scale: { range: ['#67e8f9', '#fda4af'] },
                    legend: { labelColor: '#d4d4d8', title: null, orient: 'bottom' },
                  },
                  tooltip: [{ field: 'player' }, { field: 'agent' }, { field: 'pickRate' }, { field: 'rating' }],
                },
                config: { view: { stroke: null } },
              }}
            />
          </section>
        )}
      </div>
    </main>
  );
}
