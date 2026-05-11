import { NextResponse } from 'next/server';

type Timeframe = 'recent' | 'season' | 'career';
type StatsSource = 'pandascore' | 'modeled';

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

interface PandaMatch {
  id: number;
  name: string;
  status?: string;
  begin_at?: string | null;
  league?: {
    name?: string;
  } | null;
  serie?: {
    full_name?: string;
    name?: string;
  } | null;
  opponents?: {
    opponent?: {
      name?: string;
    } | null;
  }[];
}

const statRanges = {
  rating: 1.35,
  acs: 290,
  kd: 1.45,
  adr: 185,
  kast: 90,
  headshot: 42,
  clutch: 38,
};

function seededValue(seed: number, index: number) {
  const x = Math.sin(seed * 999 + index * 127.1) * 10000;
  return x - Math.floor(x);
}

function statFromSeed(seed: number, index: number, min: number, max: number, decimals = 0) {
  const value = min + seededValue(seed, index) * (max - min);
  return Number(value.toFixed(decimals));
}

function createModeledStats(playerId: number, timeframe: Timeframe): PlayerStats {
  const timeframeOffset = { recent: 11, season: 37, career: 73 }[timeframe];
  const seed = playerId + timeframeOffset;
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

function findNumber(value: unknown, names: string[]): number | null {
  if (!value || typeof value !== 'object') return null;

  for (const [key, entry] of Object.entries(value)) {
    const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (names.some((name) => normalized.includes(name)) && typeof entry === 'number') {
      return entry;
    }
  }

  for (const entry of Object.values(value)) {
    if (entry && typeof entry === 'object') {
      const nested = findNumber(entry, names);
      if (nested !== null) return nested;
    }
  }

  return null;
}

function normalizeStats(raw: unknown, fallback: PlayerStats): PlayerStats {
  const kills = findNumber(raw, ['kills']);
  const deaths = findNumber(raw, ['deaths']);
  const rounds = findNumber(raw, ['rounds']) ?? fallback.rounds;
  const maps = findNumber(raw, ['games', 'maps']) ?? fallback.maps;
  const acs = findNumber(raw, ['averagecombatscore', 'combatscore', 'score']);
  const adr = findNumber(raw, ['averagedamage', 'damageperround', 'adr']);
  const headshot = findNumber(raw, ['headshot']);
  const kast = findNumber(raw, ['kast']);

  return {
    ...fallback,
    acs: acs ? Number(Math.min(statRanges.acs, acs).toFixed(0)) : fallback.acs,
    adr: adr ? Number(Math.min(statRanges.adr, adr).toFixed(0)) : fallback.adr,
    kd: kills && deaths ? Number((kills / Math.max(1, deaths)).toFixed(2)) : fallback.kd,
    headshot: headshot ? Number(Math.min(statRanges.headshot, headshot).toFixed(1)) : fallback.headshot,
    kast: kast ? Number(Math.min(statRanges.kast, kast).toFixed(1)) : fallback.kast,
    maps: Number(maps),
    rounds: Number(rounds),
  };
}

function timeframeToStatsQuery(timeframe: Timeframe) {
  if (timeframe === 'recent') return 'games_count=10';
  if (timeframe === 'season') return 'from=2026-01-01';
  return 'games_count=50';
}

function statusLabel(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const playerId = Number(searchParams.get('playerId'));
  const requestedTimeframe = searchParams.get('timeframe');
  const timeframe: Timeframe =
    requestedTimeframe === 'season' || requestedTimeframe === 'career' ? requestedTimeframe : 'recent';
  const API_KEY = process.env.PANDASCORE_API_KEY;

  if (!playerId) {
    return NextResponse.json({ error: 'Missing playerId' }, { status: 400 });
  }

  if (!API_KEY) {
    return NextResponse.json({ error: 'Missing PANDASCORE_API_KEY' }, { status: 500 });
  }

  const headers = {
    Authorization: `Bearer ${API_KEY}`,
    Accept: 'application/json',
  };

  const fallback = createModeledStats(playerId, timeframe);
  let stats = fallback;
  let statsSource: StatsSource = 'modeled';
  let statsUnavailableReason = '';

  const statsResponse = await fetch(
    `https://api.pandascore.co/valorant/players/${playerId}/stats?${timeframeToStatsQuery(timeframe)}`,
    { headers, next: { revalidate: 300 } },
  );

  if (statsResponse.ok) {
    const rawStats = await statsResponse.json();
    stats = normalizeStats(rawStats, fallback);
    statsSource = 'pandascore';
  } else {
    statsUnavailableReason =
      statsResponse.status === 403
        ? 'PandaScore historical stats are not enabled for this API key.'
        : `PandaScore stats returned ${statsResponse.status}.`;
  }

  const matchesResponse = await fetch(
    `https://api.pandascore.co/players/${playerId}/matches?per_page=5&sort=-begin_at`,
    { headers, next: { revalidate: 300 } },
  );

  const matchesData: PandaMatch[] = matchesResponse.ok ? await matchesResponse.json() : [];
  const matches = matchesData
    .map((match) => ({
        id: match.id,
        name: match.name,
        status: statusLabel(match.status || 'unknown'),
        beginAt: match.begin_at,
        league: match.league?.name || 'Unknown league',
        serie: match.serie?.full_name || match.serie?.name || 'Unknown series',
        opponents: Array.isArray(match.opponents)
          ? match.opponents
              .map((opponent) => opponent.opponent?.name)
              .filter((name): name is string => Boolean(name))
          : [],
      }));

  return NextResponse.json({
    stats,
    statsSource,
    statsUnavailableReason,
    matches,
  });
}
