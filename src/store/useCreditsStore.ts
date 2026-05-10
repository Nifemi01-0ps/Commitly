/**
 * useCreditsStore.ts
 *
 * Global store for user credits. 
 * UI components should preferably use the `useCredits()` hook instead of this store directly.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  getCreditBalance,
  spendCredits,
  awardCredits,
  getCreditCost,
  canAfford,
  type CreditBalance,
  type CreditActionResult,
  type CreditAction,
} from "../services/creditService";

type FetchState = "idle" | "loading" | "error";
type TxState = "idle" | "pending" | "success" | "error";

interface CreditsStore {
  // Balance
  balance: CreditBalance | null;
  fetchState: FetchState;
  fetchError: string | null;

  // Transaction
  txState: TxState;
  txMessage: string | null;

  // Actions
  fetchBalance: (userId: string) => Promise<void>;
  spend: (userId: string, action: CreditAction) => Promise<CreditActionResult>;
  award: (userId: string, amount: number, reason: string) => Promise<CreditActionResult>;

  canAffordAction: (action: CreditAction) => boolean;
  costOf: (action: CreditAction) => number;
  clearTxState: () => void;
}

export const useCreditsStore = create<CreditsStore>()(
  persist(
    (set, get) => ({
      balance: null,
      fetchState: "idle",
      fetchError: null,
      txState: "idle",
      txMessage: null,

      fetchBalance: async (userId: string) => {
        set({ fetchState: "loading", fetchError: null });

        try {
          const balance = await getCreditBalance(userId);
          set({ balance, fetchState: "idle" });
        } catch (err) {
          set({
            fetchState: "error",
            fetchError: "Failed to load balance. Please try again.",
          });
        }
      },

      spend: async (userId: string, action: CreditAction) => {
        set({ txState: "pending", txMessage: null });

        try {
          const result = await spendCredits(userId, action);

          set({
            txState: result.success ? "success" : "error",
            txMessage: result.message,
            balance: result.newBalance ?? get().balance, // Update if returned
          });

          return result;
        } catch (err) {
          const errorResult: CreditActionResult = {
            success: false,
            message: "Something went wrong. Please try again.",
          };
          set({ txState: "error", txMessage: errorResult.message });
          return errorResult;
        }
      },

      award: async (userId: string, amount: number, reason: string) => {
        set({ txState: "pending", txMessage: null });

        try {
          const result = await awardCredits(userId, amount, reason);

          set({
            txState: result.success ? "success" : "error",
            txMessage: result.message,
            balance: result.newBalance ?? get().balance,
          });

          return result;
        } catch (err) {
          const errorResult: CreditActionResult = {
            success: false,
            message: "Failed to award credits.",
          };
          set({ txState: "error", txMessage: errorResult.message });
          return errorResult;
        }
      },

      canAffordAction: (action: CreditAction) => {
        const { balance } = get();
        return balance ? canAfford(balance, action) : false;
      },

      costOf: (action: CreditAction) => getCreditCost(action),

      clearTxState: () => set({ txState: "idle", txMessage: null }),
    }),

    {
      name: "commitly-credits",
      partialize: (state) => ({ balance: state.balance }), // Only persist balance
    }
  )
);