import { NextResponse } from 'next/server';
import { searchVlrPlayers } from '@/app/lib/vlr';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) return NextResponse.json([]);

  try {
    const players = await searchVlrPlayers(query);

    return NextResponse.json(
      players.map((player) => ({
        id: player.id,
        name: player.name,
        first_name: null,
        last_name: null,
        image_url: player.imageUrl,
        role: null,
        nationality: null,
        current_team: null,
      })),
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'VLR player search failed' }, { status: 502 });
  }
}
