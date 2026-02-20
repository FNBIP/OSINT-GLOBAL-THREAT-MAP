import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const COINS = [
  { id: "bitcoin",  symbol: "BTC", name: "Bitcoin"  },
  { id: "ethereum", symbol: "ETH", name: "Ethereum" },
  { id: "solana",   symbol: "SOL", name: "Solana"   },
];

export async function GET() {
  try {
    const ids = COINS.map((c) => c.id).join(",");
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 120 },
    });

    if (!res.ok) throw new Error(`CoinGecko error: ${res.status}`);
    const raw = await res.json();

    const coins = COINS.map((c) => ({
      ...c,
      price:  raw[c.id]?.usd ?? null,
      change: raw[c.id]?.usd_24h_change ?? null,
    }));

    return NextResponse.json({ coins, updatedAt: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json(
      { coins: COINS.map((c) => ({ ...c, price: null, change: null })), error: String(err) },
      { status: 500 }
    );
  }
}
