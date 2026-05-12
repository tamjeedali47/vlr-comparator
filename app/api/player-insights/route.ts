import { NextResponse } from 'next/server';
import { getVlrPlayerMatches, getVlrStats, Timeframe } from '@/app/lib/vlr';

function createEmptyStats(playerId: number) {
  const rating = Number((0.9 + (playerId % 25) / 100).toFixed(2));

  return {
    rating,
    acs: 190 + (playerId % 55),
    kd: Number((0.9 + (playerId % 30) / 100).toFixed(2)),
    adr: 125 + (playerId % 35),
    kast: 68 + (playerId % 12),
    headshot: 22 + (playerId % 11),
    clutch: 10 + (playerId % 12),
    maps: 0,
    rounds: 0,
    form: Array.from({ length: 10 }, (_, index) => Number((rating + Math.sin(playerId + index) * 0.08).toFixed(2))),
    agents: [],
  };
}

function normalizeTimeframe(value: string | null): Timeframe {
  if (value === 'season' || value === 'career') return value;
  return 'recent';
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const playerId = Number(searchParams.get('playerId'));
  const timeframe = normalizeTimeframe(searchParams.get('timeframe'));

  if (!playerId) {
    return NextResponse.json({ error: 'Missing playerId' }, { status: 400 });
  }

  try {
    const [vlrStats, matches] = await Promise.all([
      getVlrStats(playerId, timeframe),
      getVlrPlayerMatches(playerId),
    ]);

    return NextResponse.json({
      stats: vlrStats || createEmptyStats(playerId),
      statsSource: vlrStats ? 'vlr' : 'modeled',
      statsUnavailableReason: vlrStats ? '' : 'No VLR aggregate row found for this player and timeframe.',
      matches,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'VLR insights failed' }, { status: 502 });
  }
}
