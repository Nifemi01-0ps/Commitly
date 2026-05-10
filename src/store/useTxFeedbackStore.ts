"use client";

import { create } from "zustand";

export interface TxFeedback {
  message: string;
  type: "success" | "pending" | "error";
  timestamp: number;
}

interface TxFeedbackStore {
  latest: TxFeedback | null;
  push: (message: string, type: TxFeedback["type"]) => void;
  clear: () => void;
}

/**
 * Global store for Real Mode transaction feedback.
 * Used by TxFeedbackBar to show floating messages like:
 * "Commitment secured on-chain ⚡"
 */

export const useTxFeedbackStore = create<TxFeedbackStore>()((set) => ({
  latest: null,

  push: (message, type) =>
    set({
      latest: {
        message,
        type,
        timestamp: Date.now(),
      },
    }),

  clear: () => set({ latest: null }),
}));