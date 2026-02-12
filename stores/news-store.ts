import { create } from "zustand";
import type { NewsItem } from "@/lib/rss";
import type { NewsCategory } from "@/lib/rss-feeds";
import type { NewsCluster } from "@/lib/news-clustering";
import { clusterNewsItems } from "@/lib/news-clustering";

interface NewsState {
  items: NewsItem[];
  filteredItems: NewsItem[];
  clusters: NewsCluster[];
  filteredClusters: NewsCluster[];
  isLoading: boolean;
  error: string | null;
  categoryFilter: NewsCategory | null;
  searchQuery: string;
  unreadCount: number;
  lastReadTimestamp: number | null;
  enableClustering: boolean;

  setItems: (items: NewsItem[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setCategoryFilter: (category: NewsCategory | null) => void;
  setSearchQuery: (query: string) => void;
  markAsRead: () => void;
  applyFilters: () => void;
  setEnableClustering: (enable: boolean) => void;
}

export const useNewsStore = create<NewsState>((set, get) => ({
  items: [],
  filteredItems: [],
  clusters: [],
  filteredClusters: [],
  isLoading: false,
  error: null,
  categoryFilter: null,
  searchQuery: "",
  unreadCount: 0,
  lastReadTimestamp: null,
  enableClustering: true, // Enable clustering by default

  setItems: (items) => {
    const { lastReadTimestamp } = get();
    const unreadCount = lastReadTimestamp
      ? items.filter(
          (i) => new Date(i.pubDate).getTime() > lastReadTimestamp
        ).length
      : 0; // Don't show unread on first load

    // Generate clusters
    const clusters = clusterNewsItems(items);

    set({ items, unreadCount, clusters });
    get().applyFilters();
  },

  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  setCategoryFilter: (categoryFilter) => {
    set({ categoryFilter });
    get().applyFilters();
  },

  setSearchQuery: (searchQuery) => {
    set({ searchQuery });
    get().applyFilters();
  },

  markAsRead: () => {
    set({ unreadCount: 0, lastReadTimestamp: Date.now() });
  },

  setEnableClustering: (enableClustering) => {
    set({ enableClustering });
    get().applyFilters();
  },

  applyFilters: () => {
    const { items, clusters, categoryFilter, searchQuery } = get();
    let filtered = [...items];

    if (categoryFilter) {
      filtered = filtered.filter((item) => item.category === categoryFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.source.toLowerCase().includes(q) ||
          (item.description?.toLowerCase().includes(q) ?? false)
      );
    }

    // Also filter clusters
    let filteredClusters = clusters;
    if (categoryFilter || searchQuery.trim()) {
      filteredClusters = clusters.filter((cluster) =>
        cluster.items.some((item) => filtered.includes(item))
      );
    }

    set({ filteredItems: filtered, filteredClusters });
  },
}));
