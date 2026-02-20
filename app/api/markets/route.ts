import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Symbols to fetch: indices + commodities
const SYMBOLS = {
  indices: [
    { symbol: "^GSPC", label: "S&P 500", short: "SPX" },
    { symbol: "^DJI",  label: "Dow Jones", short: "DOW" },
    { symbol: "^IXIC", label: "NASDAQ",   short: "NDX" },
  ],
  commodities: [
    { symbol: "^VIX",  label: "VIX",      short: "VIX" },
    { symbol: "GC=F",  label: "Gold",     short: "XAU" },
    { symbol: "CL=F",  label: "Oil",      short: "WTI" },
    { symbol: "NG=F",  label: "NatGas",   short: "NG"  },
  ],
};

async function fetchQuote(symbol: string) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2d`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    next: { revalidate: 120 },
  });
  if (!res.ok) throw new Error(`Yahoo Finance error for ${symbol}: ${res.status}`);
  const data = await res.json();
  const meta = data?.chart?.result?.[0]?.meta;
  if (!meta) throw new Error(`No data for ${symbol}`);
  const price = meta.regularMarketPrice ?? meta.previousClose;
  const prev  = meta.previousClose ?? meta.chartPreviousClose;
  const change = prev ? ((price - prev) / prev) * 100 : 0;
  return { price, change, currency: meta.currency ?? "USD" };
}

const ETF_SYMBOLS = [
  { symbol: "XLK",  label: "Technology",     short: "Tech"    },
  { symbol: "XLF",  label: "Financials",      short: "Finance" },
  { symbol: "XLE",  label: "Energy",          short: "Energy"  },
  { symbol: "XLV",  label: "Healthcare",      short: "Health"  },
  { symbol: "XLY",  label: "Consumer Disc.",  short: "Cons.D"  },
  { symbol: "XLI",  label: "Industrials",     short: "Indust." },
  { symbol: "XLP",  label: "Consumer Staples",short: "Cons.S"  },
  { symbol: "XLU",  label: "Utilities",       short: "Util."   },
  { symbol: "XLB",  label: "Materials",       short: "Matl."   },
  { symbol: "XLRE", label: "Real Estate",     short: "R.Est."  },
  { symbol: "XLC",  label: "Comm. Services",  short: "Comms"   },
  { symbol: "SMH",  label: "Semiconductors",  short: "Semis"   },
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  // Sector heatmap ETFs
  if (type === "etfs") {
    const results = await Promise.allSettled(
      ETF_SYMBOLS.map(async (s) => {
        const q = await fetchQuote(s.symbol);
        return { ...s, ...q };
      })
    );
    const etfs = results.map((r, i) => {
      if (r.status === "fulfilled") return r.value;
      return { ...ETF_SYMBOLS[i]!, price: null, change: null, currency: "USD" };
    });
    return NextResponse.json({ etfs, updatedAt: new Date().toISOString() });
  }

  // Default: indices + commodities
  const allSymbols = [...SYMBOLS.indices, ...SYMBOLS.commodities];

  const results = await Promise.allSettled(
    allSymbols.map(async (s) => {
      const q = await fetchQuote(s.symbol);
      return { ...s, ...q };
    })
  );

  const data = results.map((r, i) => {
    if (r.status === "fulfilled") return r.value;
    return { ...allSymbols[i]!, price: null, change: null, currency: "USD" };
  });

  return NextResponse.json({
    indices: data.slice(0, SYMBOLS.indices.length),
    commodities: data.slice(SYMBOLS.indices.length),
    updatedAt: new Date().toISOString(),
  });
}
