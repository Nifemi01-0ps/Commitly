"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useUserStore, getHiddenWallet } from "../store/useUserStore";
import { getAccountBalance } from "../services/solanaService";
import { CREDIT_TO_SOL, solToCredits } from "../services/escrowService";

export type RefreshReason = "manual" | "auto" | "post-tx" | "poll";

export interface WalletInfo {
  displayAddress: string;
  fullAddress: string;
  solBalance: number | null;
  creditEquivalent: number;
  initialLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  lastUpdated: string | null;
}

export function useWalletBalance() {
  const user = useUserStore((s) => s.user);
  const addCredits = useUserStore((s) => s.addCredits);

  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [refreshMsg, setRefreshMsg] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);
  const [convertMsg, setConvertMsg] = useState<string | null>(null);

  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const prevBalRef = useRef<number | null>(null);

  // Wallet derivation
  const wallet = user ? getHiddenWallet(user.id) : null;
  const publicKey = wallet?.publicKey ?? user?.walletPublicKey ?? null;

  const displayAddress = publicKey
    ? `${publicKey.slice(0, 4)}…${publicKey.slice(-4)}`
    : "—";

  const creditEquivalent = solBalance !== null ? solToCredits(solBalance) : 0;

  // ── Core Balance Fetch ──
  const fetchBalance = useCallback(async (reason: RefreshReason = "manual"): Promise<number | null> => {
    if (!publicKey) return null;

    const isManual = reason === "manual" || reason === "post-tx";
    if (isManual) setIsRefreshing(true);
    setError(null);

    try {
      const result = await getAccountBalance(publicKey);
      const newBal = result.sol;

      setSolBalance(newBal);
      setLastUpdated(new Date().toISOString());

      if (reason === "manual") {
        setRefreshMsg("Balance updated");
        setTimeout(() => setRefreshMsg(null), 2500);
      }

      return newBal;
    } catch (err: unknown) {
      const message = err instanceof Error && err.message.includes("timeout")
        ? "Devnet timed out. Please try again."
        : "Failed to fetch balance. Check your connection.";
      setError(message);
      return null;
    } finally {
      setIsRefreshing(false);
    }
  }, [publicKey]);

  // Initial load
  useEffect(() => {
    if (publicKey) {
      fetchBalance("auto");
    }
  }, [publicKey, fetchBalance]);

  // Refresh after blockchain transaction
  const refreshAfterTx = useCallback(async () => {
    await new Promise((r) => setTimeout(r, 1500)); // Allow devnet propagation
    return fetchBalance("post-tx");
  }, [fetchBalance]);

  // ── Faucet Polling ───
  const startFaucetPolling = useCallback(() => {
    if (pollRef.current) return;
    prevBalRef.current = solBalance;

    let attempts = 0;
    const MAX_ATTEMPTS = 22; // ~3 minutes

    pollRef.current = setInterval(async () => {
      attempts++;
      const newBal = await fetchBalance("poll");

      if (newBal !== null && prevBalRef.current !== null && newBal > prevBalRef.current) {
        stopFaucetPolling();
        const received = (newBal - prevBalRef.current).toFixed(4);
        setRefreshMsg(`🎉 +${received} SOL received!`);
        setTimeout(() => setRefreshMsg(null), 5000);
      }

      if (attempts >= MAX_ATTEMPTS) stopFaucetPolling();
    }, 8000);
  }, [solBalance, fetchBalance]);

  const stopFaucetPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  // Cleanup
  useEffect(() => {
    return () => stopFaucetPolling();
  }, [stopFaucetPolling]);

  // ── SOL to Credits Conversion ──
  const convertSolToCredits = async (solAmount: number): Promise<void> => {
    if (!user || solAmount <= 0) return;

    setConverting(true);
    setConvertMsg(null);

    try {
      await new Promise((r) => setTimeout(r, 600));

      const credits = solToCredits(solAmount);
      if (credits <= 0) {
        setConvertMsg("Minimum amount is 0.0001 SOL (1 credit)");
        return;
      }

      addCredits(credits);
      setSolBalance((prev) => Math.max(0, (prev ?? 0) - solAmount));
      setConvertMsg(`+${credits} credits added successfully`);
    } catch (err) {
      setConvertMsg("Conversion failed");
    } finally {
      setConverting(false);
      setTimeout(() => setConvertMsg(null), 4000);
    }
  };

  const walletInfo: WalletInfo = {
    displayAddress,
    fullAddress: publicKey ?? "",
    solBalance,
    creditEquivalent,
    initialLoading: !lastUpdated && !solBalance && !error,
    isRefreshing,
    error,
    lastUpdated,
  };

  return {
    walletInfo,
    publicKey,
    fetchBalance,
    refreshAfterTx,
    refreshMsg,
    startFaucetPolling,
    stopFaucetPolling,
    converting,
    convertMsg,
    convertSolToCredits,
    CREDIT_TO_SOL,
  };
}