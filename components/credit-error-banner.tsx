"use client";

import { useCreditErrorStore, CREDIT_ERROR_MESSAGE } from "@/stores/credit-error-store";
import { X, AlertTriangle } from "lucide-react";

export function CreditErrorBanner() {
  const { hasCreditError, clearCreditError } = useCreditErrorStore();

  if (!hasCreditError) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-amber-600 text-white px-4 py-3 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm font-medium">
            {CREDIT_ERROR_MESSAGE.split("https://")[0]}
            <a
              href="https://platform.valyu.ai/user/account/billing"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:no-underline font-semibold"
            >
              https://platform.valyu.ai/user/account/billing
            </a>
          </p>
        </div>
        <button
          onClick={clearCreditError}
          className="p-1 hover:bg-amber-700 rounded-md transition-colors flex-shrink-0"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
