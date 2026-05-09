/**
 * escrowService.ts
 *
 * Handles Real Commitment Mode — locking, releasing, and forfeiting SOL.
 * Called by creditService when realMode is active.
 */

import { Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { getKeypair, getPublicKeyString } from "./identityService";
import { transferLamports, getSolanaMode, type TransactionResult } from "./solanaService";

// ─── Constants ───

export const CREDIT_TO_SOL = 0.0001;
export const CREDIT_TO_LAMPORTS = Math.round(CREDIT_TO_SOL * LAMPORTS_PER_SOL);

// ─── Types ───

export interface LockResult {
  success: boolean;
  solLocked: number;
  message: string;
  txRef?: string;
  escrowKey?: string;
}

export interface SettleResult {
  success: boolean;
  solPayout: number;
  message: string;
  txRef?: string;
}

// ─── In-Memory Escrow Ledger (MVP) ────

const escrowLedger = new Map<string, Map<string, number>>(); // planId → (userId → lamports)

let _escrowKeypair: Keypair | null = null;

function getEscrowKeypair(): Keypair {
  if (!_escrowKeypair) _escrowKeypair = Keypair.generate();
  return _escrowKeypair;
}

function getEscrowPublicKey(): string {
  return getEscrowKeypair().publicKey.toBase58();
}

// ─── Public API ────

export async function lockCommitment(
  userId: string,
  planId: string,
  credits: number
): Promise<LockResult> {
  if (credits <= 0) {
    return { success: false, solLocked: 0, message: "Invalid amount" };
  }

  const lamports = credits * CREDIT_TO_LAMPORTS;
  const sol = credits * CREDIT_TO_SOL;

  // Record in ledger
  if (!escrowLedger.has(planId)) escrowLedger.set(planId, new Map());
  escrowLedger.get(planId)!.set(userId, lamports);

  if (getSolanaMode() === "mock") {
    await mockDelay(300, 700);
    return {
      success: true,
      solLocked: sol,
      message: "Commitment secured",
      txRef: mockRef(),
      escrowKey: getEscrowPublicKey(),
    };
  }

  // Real blockchain transfer
  try {
    const userKeypair = getKeypair(userId);
    const escrowKey = getEscrowPublicKey();

    const result = await transferLamports(userKeypair, escrowKey, lamports);

    if (!result.success) {
      escrowLedger.get(planId)?.delete(userId);
      return {
        success: false,
        solLocked: 0,
        message: "Failed to lock on-chain. Credits used instead.",
        txRef: result.signature ?? undefined,
      };
    }

    return {
      success: true,
      solLocked: sol,
      message: "Commitment secured on-chain ⚡",
      txRef: result.signature ?? undefined,
      escrowKey,
    };
  } catch (err) {
    escrowLedger.get(planId)?.delete(userId);
    console.error("lockCommitment error:", err);
    return { success: false, solLocked: 0, message: "Lock failed — credits used instead" };
  }
}

export async function releaseToWinner(
  userId: string,
  planId: string,
  bonusPct = 0.2
): Promise<SettleResult> {
  const planLedger = escrowLedger.get(planId);
  const lockedLamports = planLedger?.get(userId) ?? 0;

  if (lockedLamports === 0) {
    return { success: false, solPayout: 0, message: "No locked commitment found" };
  }

  const bonusLamports = Math.floor(lockedLamports * bonusPct);
  const totalLamports = lockedLamports + bonusLamports;
  const totalSol = totalLamports / LAMPORTS_PER_SOL;

  if (getSolanaMode() === "mock") {
    await mockDelay(300, 600);
    planLedger?.delete(userId);
    return {
      success: true,
      solPayout: totalSol,
      message: "Commitment returned + bonus",
      txRef: mockRef(),
    };
  }

  try {
    const escrowKeypair = getEscrowKeypair();
    const userPubKey = getPublicKeyString(userId);

    const result = await transferLamports(escrowKeypair, userPubKey, totalLamports);

    planLedger?.delete(userId);

    return {
      success: result.success,
      solPayout: result.success ? totalSol : 0,
      message: result.success ? "Commitment returned + bonus ⚡" : "Settlement failed",
      txRef: result.signature ?? undefined,
    };
  } catch (err) {
    console.error("releaseToWinner error:", err);
    return { success: false, solPayout: 0, message: "Settlement failed" };
  }
}

export async function forfeitCommitment(
  userId: string,
  planId: string
): Promise<SettleResult> {
  const planLedger = escrowLedger.get(planId);
  planLedger?.delete(userId);

  return {
    success: true,
    solPayout: 0,
    message: "Commitment forfeited",
    txRef: mockRef(),
  };
}

// ─── Utils ────

export function creditsToSol(credits: number): number {
  return credits * CREDIT_TO_SOL;
}

export function solToCredits(sol: number): number {
  return Math.round(sol / CREDIT_TO_SOL);
}

export function getEscrowBalance(planId: string) {
  const ledger = escrowLedger.get(planId);
  if (!ledger) return { lamports: 0, sol: 0, credits: 0 };

  let total = 0;
  ledger.forEach((lam) => (total += lam));

  return {
    lamports: total,
    sol: total / LAMPORTS_PER_SOL,
    credits: Math.round(total / CREDIT_TO_LAMPORTS),
  };
}

// ─── Helpers ─

function mockDelay(min: number, max: number): Promise<void> {
  return new Promise((r) => setTimeout(r, min + Math.random() * (max - min)));
}

function mockRef(): string {
  return `esc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}