import { create } from "zustand";

interface CreditErrorState {
  hasCreditError: boolean;
  errorMessage: string | null;
  setCreditError: (message: string) => void;
  clearCreditError: () => void;
}

export const useCreditErrorStore = create<CreditErrorState>()((set) => ({
  hasCreditError: false,
  errorMessage: null,

  setCreditError: (message: string) => {
    set({
      hasCreditError: true,
      errorMessage: message,
    });
  },

  clearCreditError: () => {
    set({
      hasCreditError: false,
      errorMessage: null,
    });
  },
}));

// Helper to check if an error response is a credit error
export function isCreditError(status: number, message?: string): boolean {
  if (status === 402) return true;
  if (message) {
    const lowerMessage = message.toLowerCase();
    return (
      lowerMessage.includes("insufficient credits") ||
      lowerMessage.includes("credit limit exceeded") ||
      lowerMessage.includes("no credits available")
    );
  }
  return false;
}

export const CREDIT_ERROR_MESSAGE = "Please top up credits at https://platform.valyu.ai/user/account/billing";
