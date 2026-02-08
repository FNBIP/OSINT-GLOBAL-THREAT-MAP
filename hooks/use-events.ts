"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEventsStore } from "@/stores/events-store";
import { useAuthStore } from "@/stores/auth-store";
import { useCreditErrorStore, CREDIT_ERROR_MESSAGE, isCreditError } from "@/stores/credit-error-store";
import type { ThreatEvent } from "@/types";

const APP_MODE = process.env.NEXT_PUBLIC_APP_MODE || "self-hosted";

interface UseEventsOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  queries?: string[];
}

export function useEvents(options: UseEventsOptions = {}) {
  const {
    autoRefresh = true,
    refreshInterval = 30000,
    queries,
  } = options;

  const {
    events,
    filteredEvents,
    isLoading,
    error,
    setEvents,
    setLoading,
    setError,
  } = useEventsStore();

  const { getAccessToken, isAuthenticated } = useAuthStore();
  const [requiresSignIn, setRequiresSignIn] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const requiresAuth = APP_MODE === "valyu";

  // Fetch events from API
  const fetchEvents = useCallback(async () => {
    // In valyu mode, require sign-in for all event fetches
    if (requiresAuth && !isAuthenticated) {
      setRequiresSignIn(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const accessToken = getAccessToken();

      const response = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queries: queries || [], accessToken }),
      });

      const data = await response.json();

      // Handle credit errors
      if (response.status === 402 || isCreditError(response.status, data.error || data.message)) {
        useCreditErrorStore.getState().setCreditError(CREDIT_ERROR_MESSAGE);
        setError("Insufficient credits");
        return;
      }

      // Handle auth errors - don't immediately sign out, just prompt re-auth
      if (response.status === 401 || data.requiresReauth) {
        setRequiresSignIn(true);
        setError("Please wait 30 seconds and refresh.");
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch events");
      }

      const newEvents: ThreatEvent[] = data.events || [];
      setEvents(newEvents);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  }, [queries, setEvents, setLoading, setError, getAccessToken, requiresAuth, isAuthenticated]);

  // Manual refresh
  const refresh = useCallback(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Initial fetch on mount (or when auth changes)
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Auto-refresh - only if authenticated
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (autoRefresh && isAuthenticated) {
      intervalRef.current = setInterval(fetchEvents, refreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh, refreshInterval, isAuthenticated, fetchEvents]);

  useEffect(() => {
    if (isAuthenticated) {
      setRequiresSignIn(false);
    }
  }, [isAuthenticated]);

  return {
    events,
    filteredEvents,
    isLoading,
    error,
    refresh,
    requiresSignIn,
  };
}
