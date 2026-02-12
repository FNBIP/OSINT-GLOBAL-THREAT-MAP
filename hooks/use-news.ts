"use client";

import { useCallback, useEffect, useRef } from "react";
import { useNewsStore } from "@/stores/news-store";

interface UseNewsOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useNews(options: UseNewsOptions = {}) {
  const { autoRefresh = true, refreshInterval = 300_000 } = options;
  const setItems = useNewsStore((s) => s.setItems);
  const setLoading = useNewsStore((s) => s.setLoading);
  const setError = useNewsStore((s) => s.setError);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fetchedRef = useRef(false);

  const fetchNews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/news");
      if (!response.ok) throw new Error("Failed to fetch news");
      const data = await response.json();
      setItems(data.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [setItems, setLoading, setError]);

  // Initial fetch (once)
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    fetchNews();
  }, [fetchNews]);

  // Auto-refresh
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchNews, refreshInterval);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh, refreshInterval, fetchNews]);

  return { refresh: fetchNews };
}
