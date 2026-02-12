/**
 * News Clustering Engine
 *
 * Groups similar news stories using n-gram similarity (Jaccard index)
 * Inspired by worldmonitor's clustering approach
 */

import type { NewsItem } from "./rss";

export interface NewsCluster {
  id: string;
  items: NewsItem[];
  representativeItem: NewsItem; // The item shown as the cluster head
  sourcesCount: number;
  tier1Sources: number; // Count of tier 1 sources in cluster
  tier2Sources: number; // Count of tier 2 sources in cluster
  firstSeen: Date;
  lastSeen: Date;
  sourcesPerHour: number; // Velocity indicator for breaking news
  isBreaking: boolean; // True if multiple high-tier sources in short time
}

/**
 * Generate n-grams from a string
 */
function generateNGrams(text: string, n: number = 3): Set<string> {
  const normalized = text.toLowerCase().replace(/[^\w\s]/g, " ").trim();
  const words = normalized.split(/\s+/);
  const ngrams = new Set<string>();

  // Word-level n-grams
  for (let i = 0; i <= words.length - n; i++) {
    ngrams.add(words.slice(i, i + n).join(" "));
  }

  return ngrams;
}

/**
 * Calculate Jaccard similarity between two sets
 */
function jaccardSimilarity(set1: Set<string>, set2: Set<string>): number {
  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return union.size === 0 ? 0 : intersection.size / union.size;
}

/**
 * Check if two news items are about the same story
 */
function areSimilar(item1: NewsItem, item2: NewsItem, threshold: number = 0.4): boolean {
  // Generate n-grams from titles
  const ngrams1 = generateNGrams(item1.title, 3);
  const ngrams2 = generateNGrams(item2.title, 3);

  const similarity = jaccardSimilarity(ngrams1, ngrams2);

  return similarity >= threshold;
}

/**
 * Cluster news items by similarity
 */
export function clusterNewsItems(items: NewsItem[], similarityThreshold: number = 0.4): NewsCluster[] {
  const clusters: NewsCluster[] = [];
  const processed = new Set<string>();

  // Sort by date (newest first) to prioritize recent stories
  const sortedItems = [...items].sort(
    (a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
  );

  for (const item of sortedItems) {
    if (processed.has(item.id)) continue;

    // Create new cluster with this item as the seed
    const clusterItems: NewsItem[] = [item];
    processed.add(item.id);

    // Find similar items
    for (const candidate of sortedItems) {
      if (processed.has(candidate.id)) continue;

      if (areSimilar(item, candidate, similarityThreshold)) {
        clusterItems.push(candidate);
        processed.add(candidate.id);
      }
    }

    // Calculate cluster metadata
    const tier1Count = clusterItems.filter((i) => i.sourceTier === 1).length;
    const tier2Count = clusterItems.filter((i) => i.sourceTier === 2).length;

    const dates = clusterItems.map((i) => new Date(i.pubDate).getTime());
    const firstSeen = new Date(Math.min(...dates));
    const lastSeen = new Date(Math.max(...dates));

    // Calculate velocity (sources per hour)
    const timeSpanHours = (lastSeen.getTime() - firstSeen.getTime()) / (1000 * 60 * 60);
    const sourcesPerHour = timeSpanHours > 0 ? clusterItems.length / timeSpanHours : clusterItems.length;

    // Breaking news: 3+ sources including 2+ high-tier sources within 6 hours
    const isBreaking =
      clusterItems.length >= 3 &&
      (tier1Count + tier2Count) >= 2 &&
      timeSpanHours <= 6;

    // Representative item: prioritize tier 1 > tier 2 > most recent
    const representativeItem =
      clusterItems.find((i) => i.sourceTier === 1) ||
      clusterItems.find((i) => i.sourceTier === 2) ||
      clusterItems[0];

    clusters.push({
      id: `cluster-${representativeItem.id}`,
      items: clusterItems,
      representativeItem,
      sourcesCount: clusterItems.length,
      tier1Sources: tier1Count,
      tier2Sources: tier2Count,
      firstSeen,
      lastSeen,
      sourcesPerHour: Math.round(sourcesPerHour * 10) / 10,
      isBreaking,
    });
  }

  // Sort clusters: breaking first, then by source count, then by date
  return clusters.sort((a, b) => {
    if (a.isBreaking !== b.isBreaking) return a.isBreaking ? -1 : 1;
    if (a.sourcesCount !== b.sourcesCount) return b.sourcesCount - a.sourcesCount;
    return b.lastSeen.getTime() - a.lastSeen.getTime();
  });
}

/**
 * Get a summary of sources in a cluster
 */
export function getClusterSourcesSummary(cluster: NewsCluster): string {
  const sources = cluster.items.map((i) => i.source);
  const uniqueSources = [...new Set(sources)];

  if (uniqueSources.length <= 3) {
    return uniqueSources.join(", ");
  }

  return `${uniqueSources.slice(0, 3).join(", ")} +${uniqueSources.length - 3} more`;
}
