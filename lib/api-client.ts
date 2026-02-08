"use client";

import { useCreditErrorStore, CREDIT_ERROR_MESSAGE, isCreditError } from "@/stores/credit-error-store";

interface FetchOptions extends RequestInit {
  skipCreditCheck?: boolean;
}

/**
 * Wrapper around fetch that detects credit errors (402) and triggers the credit error store.
 * Use this for all API calls to ensure credit errors are handled globally.
 */
export async function apiFetch(
  url: string,
  options?: FetchOptions
): Promise<Response> {
  const response = await fetch(url, options);

  // Check for credit errors
  if (!options?.skipCreditCheck) {
    if (response.status === 402) {
      useCreditErrorStore.getState().setCreditError(CREDIT_ERROR_MESSAGE);
    } else if (!response.ok) {
      // Try to parse the response to check for credit error messages
      try {
        const clonedResponse = response.clone();
        const data = await clonedResponse.json();
        const errorMessage = data.error || data.message || "";
        if (isCreditError(response.status, errorMessage)) {
          useCreditErrorStore.getState().setCreditError(CREDIT_ERROR_MESSAGE);
        }
      } catch {
        // Ignore JSON parse errors
      }
    }
  }

  return response;
}

/**
 * Helper to handle streaming responses with credit error detection.
 * For SSE endpoints, we need to check the stream for error events.
 */
export function handleStreamError(chunk: { type?: string; error?: string; requiresCredits?: boolean }) {
  if (chunk.type === "error" && chunk.requiresCredits) {
    useCreditErrorStore.getState().setCreditError(CREDIT_ERROR_MESSAGE);
    return true;
  }
  return false;
}
