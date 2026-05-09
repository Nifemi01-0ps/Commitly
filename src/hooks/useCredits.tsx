"use client";

import { useEffect, useCallback, useMemo } from "react";
import { useUserStore } from "@/store/useUserStore";
import { useCreditsStore } from "@/store/useCreditsStore";
import type { CreditAction, CreditActionResult } from "@/services/creditService";

export interface UseCreditsReturn {
  balance: number | null;
  display: string | null;
  isLoading: boolean;
  loadError: string | null;

  txState: "idle" | "pending" | "success" | "error";
  txMessage: string | null;

  spend: (action: CreditAction) => Promise<CreditActionResult>;
  award: (amount: number, reason: string) => Promise<CreditActionResult>;
  canAfford: (action: CreditAction) => boolean;
  costOf: (action: CreditAction) => number;

  refresh: () => Promise<void>;
  clearTx: () => void;
}

export function useCredits(): UseCreditsReturn {
  const user = useUserStore((s) => s.user);

  const {
    balance,
    display,
    fetchState,
    fetchError,
    txState,
    txMessage,
    fetchBalance,
    spend: storeSpend,
    award: storeAward,
    canAffordAction,
    costOf,
    clearTxState,
  } = useCreditsStore();

  // Auto-fetch balance when user logs in
  useEffect(() => {
    if (user?.id && fetchState === "idle") {
      fetchBalance(user.id);
    }
  }, [user?.id, fetchState, fetchBalance]);

  const spend = useCallback(
    async (action: CreditAction): Promise<CreditActionResult> => {
      if (!user?.id) {
        return { success: false, message: "You need to be signed in." };
      }
      return storeSpend(user.id, action);
    },
    [user?.id, storeSpend]
  );

  const award = useCallback(
    async (amount: number, reason: string): Promise<CreditActionResult> => {
      if (!user?.id) {
        return { success: false, message: "Not signed in." };
      }
      return storeAward(user.id, amount, reason);
    },
    [user?.id, storeAward]
  );

  const refresh = useCallback(async () => {
    if (user?.id) {
      try {
        await fetchBalance(user.id);
      } catch (err) {
        console.error("Failed to refresh credits:", err);
      }
    }
  }, [user?.id, fetchBalance]);

  const canAfford = useCallback(
    (action: CreditAction) => canAffordAction(action),
    [canAffordAction]
  );

  return {
    balance: balance ?? null,
    display: display ?? null,
    isLoading: fetchState === "loading",
    loadError: fetchError,
    txState,
    txMessage,
    spend,
    award,
    canAfford,
    costOf,
    refresh,
    clearTx: clearTxState,
  };
}