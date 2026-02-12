/**
 * RSS Feed Service — server-side fetch, parse, cache with circuit breaker
 *
 * Runs inside Next.js API routes (Node.js runtime).
 * Parses both RSS 2.0 (<item>) and Atom (<entry>) formats using regex.
 * No external XML parser dependency needed.
 */

import type {
  RSSFeedConfig,
  SourceTier,
  PropagandaRisk,
  NewsCategory,
} from "./rss-feeds";

// --- Types ---

export interface NewsItem {
  id: string;
  title: string;
  link: string;
  pubDate: string; // ISO 8601
  source: string;
  sourceId: string;
  sourceTier: SourceTier;
  propagandaRisk: PropagandaRisk;
  stateAffiliation?: string;
  category: NewsCategory;
  description?: string;
}

// --- Circuit Breaker ---

interface CircuitBreakerState {
  failures: number;
  cooldownUntil: number;
}

const circuitBreakers = new Map<string, CircuitBreakerState>();
const MAX_FAILURES = 3;
const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

function isFeedOnCooldown(feedId: string): boolean {
  const cb = circuitBreakers.get(feedId);
  if (!cb) return false;
  if (cb.failures >= MAX_FAILURES && Date.now() < cb.cooldownUntil) {
    return true;
  }
  // Cooldown expired — reset
  if (cb.cooldownUntil > 0 && Date.now() >= cb.cooldownUntil) {
    circuitBreakers.delete(feedId);
  }
  return false;
}

function recordFailure(feedId: string): void {
  const cb = circuitBreakers.get(feedId) || { failures: 0, cooldownUntil: 0 };
  cb.failures++;
  if (cb.failures >= MAX_FAILURES) {
    cb.cooldownUntil = Date.now() + COOLDOWN_MS;
    console.warn(
      `[RSS] Circuit breaker tripped for "${feedId}" — cooldown ${COOLDOWN_MS / 1000}s`
    );
  }
  circuitBreakers.set(feedId, cb);
}

// --- Cache ---

interface CacheEntry {
  items: NewsItem[];
  fetchedAt: number;
}

const feedCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_CACHE_ENTRIES = 100;

function getCached(feedId: string): NewsItem[] | null {
  const entry = feedCache.get(feedId);
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) {
    feedCache.delete(feedId);
    return null;
  }
  return entry.items;
}

function setCache(feedId: string, items: NewsItem[]): void {
  // Prevent unbounded growth
  if (feedCache.size >= MAX_CACHE_ENTRIES) {
    const oldest = feedCache.keys().next().value;
    if (oldest) feedCache.delete(oldest);
  }
  feedCache.set(feedId, { items, fetchedAt: Date.now() });
}

// --- XML Parsing ---

function extractTagContent(xml: string, tag: string): string {
  // Handle both <tag>content</tag> and <tag><![CDATA[content]]></tag>
  const regex = new RegExp(
    `<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${tag}>`,
    "i"
  );
  const match = xml.match(regex);
  if (!match) return "";
  return match[1].trim();
}

function extractLink(itemXml: string, isAtom: boolean): string {
  if (isAtom) {
    // Atom: <link href="..." /> or <link href="..." rel="alternate" />
    const hrefMatch = itemXml.match(
      /<link[^>]*href=["']([^"']+)["'][^>]*\/?>/i
    );
    return hrefMatch ? hrefMatch[1] : "";
  }
  // RSS: <link>url</link>
  return extractTagContent(itemXml, "link");
}

function extractDate(itemXml: string, isAtom: boolean): string {
  if (isAtom) {
    // Atom uses <published> or <updated>
    const pub = extractTagContent(itemXml, "published");
    if (pub) return pub;
    return extractTagContent(itemXml, "updated");
  }
  // RSS uses <pubDate>
  return extractTagContent(itemXml, "pubDate");
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function generateId(url: string): string {
  // Simple hash: use URL characters to create a short ID
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return `news_${Math.abs(hash).toString(36)}`;
}

function parseFeedXML(xml: string, config: RSSFeedConfig): NewsItem[] {
  const isAtom = xml.includes("<feed") && xml.includes("<entry");
  const tag = isAtom ? "entry" : "item";

  const items: NewsItem[] = [];
  const regex = new RegExp(`<${tag}[\\s>][\\s\\S]*?</${tag}>`, "gi");
  let match;

  while ((match = regex.exec(xml)) !== null && items.length < 15) {
    const itemXml = match[0];

    const title = stripHtml(extractTagContent(itemXml, "title"));
    const link = extractLink(itemXml, isAtom);
    const dateStr = extractDate(itemXml, isAtom);

    if (!title || !link) continue;

    // Parse and validate date
    let pubDate: string;
    try {
      const d = new Date(dateStr);
      pubDate = isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
    } catch {
      pubDate = new Date().toISOString();
    }

    // Extract description (first 300 chars)
    const rawDesc =
      extractTagContent(itemXml, "description") ||
      extractTagContent(itemXml, "summary") ||
      extractTagContent(itemXml, "content");
    const description = stripHtml(rawDesc).slice(0, 300) || undefined;

    items.push({
      id: generateId(link),
      title,
      link,
      pubDate,
      source: config.name,
      sourceId: config.id,
      sourceTier: config.tier,
      propagandaRisk: config.propagandaRisk,
      stateAffiliation: config.stateAffiliation,
      category: config.category,
      description,
    });
  }

  return items;
}

// --- Fetch ---

const FETCH_TIMEOUT_MS = 5_000; // 5s per feed — fail fast

async function fetchSingleFeed(config: RSSFeedConfig): Promise<NewsItem[]> {
  // Check circuit breaker
  if (isFeedOnCooldown(config.id)) {
    return getCached(config.id) || [];
  }

  // Check cache
  const cached = getCached(config.id);
  if (cached) return cached;

  try {
    const response = await fetch(config.url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; OSINT-Threat-Map/1.0; +https://github.com)",
        Accept: "application/rss+xml, application/xml, text/xml, */*",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const xml = await response.text();

    // Basic validation — must contain RSS or Atom markers
    if (
      !xml.includes("<rss") &&
      !xml.includes("<feed") &&
      !xml.includes("<item") &&
      !xml.includes("<entry")
    ) {
      throw new Error("Response is not valid RSS/Atom XML");
    }

    const items = parseFeedXML(xml, config);
    setCache(config.id, items);
    return items;
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.warn(`[RSS] Failed to fetch "${config.name}": ${errMsg}`);
    recordFailure(config.id);
    return getCached(config.id) || [];
  }
}

// --- Batch Fetch ---

const BATCH_SIZE = 20; // Larger batches = faster total time

export async function fetchAllFeeds(
  feeds: RSSFeedConfig[]
): Promise<NewsItem[]> {
  const allItems: NewsItem[] = [];

  // Fetch ALL feeds concurrently — each has its own 5s timeout
  // so the total time is roughly max(individual timeouts), not sum
  const results = await Promise.allSettled(
    feeds.map((feed) => fetchSingleFeed(feed))
  );

  for (const result of results) {
    if (result.status === "fulfilled") {
      allItems.push(...result.value);
    }
  }

  // Deduplicate by URL (normalized)
  const seen = new Set<string>();
  const deduplicated = allItems.filter((item) => {
    const normalized = item.link
      .toLowerCase()
      .replace(/\/$/, "")
      .replace(/^https?:\/\//, "");
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });

  // Sort by date (newest first)
  deduplicated.sort(
    (a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
  );

  // Cap at 200 items
  return deduplicated.slice(0, 200);
}
