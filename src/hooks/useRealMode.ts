"use client";

import { useCallback } from "react";
import { useUserStore } from "@/store/useUserStore";
import { useTxFeedbackStore } from "@/store/useTxFeedbackStore";
import { lockCommitment, releaseToWinner, forfeitCommitment, CREDIT_TO_SOL } from "@/services/escrowService";
import { useWalletBalance } from "@/hooks/useWalletBalance";

export interface CommitResult {
  success: boolean;
  message: string;
  onChain: boolean;
  txRef?: string;
}

export function useRealMode() {
  const user = useUserStore((s) => s.user);
  const pushFeedback = useTxFeedbackStore((s) => s.push);
  const { refreshAfterTx } = useWalletBalance();

  const isRealMode = user?.realMode ?? false;

  // ── Lock Commitment (when joining or creating a plan) ─────────────────────
  const lockCommit = useCallback(async (
    planId: string,
    credits: number,
  ): Promise<CommitResult> => {
    if (!user) {
      return { success: false, message: "Not signed in", onChain: false };
    }
    if (!isRealMode) {
      return { success: true, message: "Credits committed", onChain: false };
    }

    try {
      const result = await lockCommitment(user.id, planId, credits);

      if (result.success) {
        pushFeedback("Commitment secured on-chain ⚡", "success");
        refreshAfterTx();
      } else {
        pushFeedback(result.message || "Failed to secure on-chain", "error");
      }

      return {
        success: result.success,
        message: result.success 
          ? "Commitment secured on-chain ⚡" 
          : (result.message || "Blockchain unavailable"),
        onChain: result.success,
        txRef: result.txRef,
      };
    } catch (err) {
      console.error("lockCommit failed:", err);
      pushFeedback("Failed to lock commitment on-chain", "error");
      return { success: false, message: "Blockchain error", onChain: false };
    }
  }, [user, isRealMode, pushFeedback, refreshAfterTx]);

  // ── Release Commitment (successful completion) ─────
  const releaseCommit = useCallback(async (
    planId: string,
  ): Promise<CommitResult> => {
    if (!user) return { success: false, message: "Not signed in", onChain: false };
    if (!isRealMode) return { success: true, message: "Credits returned", onChain: false };

    try {
      const result = await releaseToWinner(user.id, planId, 0.2);

      if (result.success) {
        pushFeedback("Reward settled on-chain ⚡", "success");
        refreshAfterTx();
      } else {
        pushFeedback("Credits returned (blockchain pending)", "error");
      }

      return {
        success: result.success,
        message: result.success ? "Commitment returned + bonus ⚡" : "Credits returned",
        onChain: result.success,
        txRef: result.txRef,
      };
    } catch (err) {
      console.error("releaseCommit failed:", err);
      return { success: false, message: "Failed to release commitment", onChain: false };
    }
  }, [user, isRealMode, pushFeedback, refreshAfterTx]);

  // ── Forfeit Commitment (missed deadline) ───
  const forfeitCommit = useCallback(async (
    planId: string,
  ): Promise<CommitResult> => {
    if (!user) return { success: false, message: "Not signed in", onChain: false };
    if (!isRealMode) return { success: true, message: "Credits forfeited", onChain: false };

    try {
      const result = await forfeitCommitment(user.id, planId);

      if (result.success) {
        refreshAfterTx();
      }

      return {
        success: result.success,
        message: result.success ? "Commitment forfeited on-chain" : "Credits forfeited",
        onChain: result.success,
        txRef: result.txRef,
      };
    } catch (err) {
      console.error("forfeitCommit failed:", err);
      return { success: false, message: "Failed to forfeit commitment", onChain: false };
    }
  }, [user, isRealMode, refreshAfterTx]);

  const creditsToSolDisplay = useCallback((credits: number): string => {
    if (!isRealMode || credits <= 0) return "";
    
    const sol = credits * CREDIT_TO_SOL;
    return sol < 0.001 
      ? `${(sol * 1000).toFixed(2)} mSOL`
      : `${sol.toFixed(4)} SOL`;
  }, [isRealMode]);

  return {
    isRealMode,
    lockCommit,
    releaseCommit,
    forfeitCommit,
    creditsToSolDisplay,
  };
}