import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const API_KEY = process.env.PANDASCORE_API_KEY;

  if (!query) return NextResponse.json([]);
  if (!API_KEY) {
    return NextResponse.json({ error: 'Missing PANDASCORE_API_KEY' }, { status: 500 });
  }

  const res = await fetch(
    `https://api.pandascore.co/valorant/players?search[name]=${encodeURIComponent(query)}&per_page=5`,
    {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Accept': 'application/json',
      },
    }
  );

  if (!res.ok) {
    return NextResponse.json({ error: 'PandaScore search failed' }, { status: res.status });
  }

  const data = await res.json();
  return NextResponse.json(data);
}
