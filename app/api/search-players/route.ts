import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const API_KEY = process.env.PANDASCORE_API_KEY;

  if (!query) return NextResponse.json([]);

  // PandaScore "search" filter lets us find players by name
  const res = await fetch(
    `https://api.pandascore.co/valorant/players?search[name]=${query}&per_page=5`,
    {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Accept': 'application/json',
      },
    }
  );

  const data = await res.json();
  return NextResponse.json(data);
}