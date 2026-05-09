/**
 * creditService.ts
 *
 * PUBLIC API LAYER — The only file UI/hooks/stores should import for credit operations.
 * All blockchain complexity is hidden here.
 */

import { getPublicKeyString, getKeypair, debugIdentity } from "./identityService";
import {
  getAccountBalance,
  transferLamports,
  getSolanaMode,
  type TransactionResult,
} from "./solanaService";

// ─── Constants ─────────────────────────────────────────────────────────────

const LAMPORTS_PER_CREDIT = 1_000; // ← Change conversion rate here only

const TREASURY_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_TREASURY_PUBKEY ?? 
  "11111111111111111111111111111111";

// ─── Types ───

export interface CreditBalance {
  credits: number;
  display: string;
}

export interface CreditActionResult {
  success: boolean;
  message: string;
  newBalance?: CreditBalance;
  txRef?: string;
}

export type CreditAction =
  | "join_plan"
  | "create_plan"
  | "submit_proof"
  | "award_completion"
  | "stake_reliability";

// ─── Credit Costs ───

const CREDIT_COSTS: Record<CreditAction, number> = {
  join_plan:         10,
  create_plan:       5,
  submit_proof:      0,
  award_completion:  -20,   // negative = award
  stake_reliability: 50,
};

// ─── Public API ─────

export async function getCreditBalance(userId: string): Promise<CreditBalance> {
  if (process.env.NODE_ENV === "development") debugIdentity(userId);

  const pubKey = getPublicKeyString(userId);
  const balance = await getAccountBalance(pubKey);
  
  const credits = Math.floor(balance.lamports / LAMPORTS_PER_CREDIT);
  return buildBalance(credits);
}

export async function spendCredits(
  userId: string,
  action: CreditAction
): Promise<CreditActionResult> {
  const cost = CREDIT_COSTS[action];

  if (cost === 0) {
    return { success: true, message: "Action completed" };
  }

  if (cost < 0) {
    return awardCredits(userId, Math.abs(cost), humanizeAction(action));
  }

  // Pre-check balance
  const current = await getCreditBalance(userId);
  if (current.credits < cost) {
    return {
      success: false,
      message: `Insufficient credits. You need ${cost} but have ${current.credits}.`,
    };
  }

  const keypair = getKeypair(userId);
  const lamports = cost * LAMPORTS_PER_CREDIT;

  const txResult = await transferLamports(keypair, TREASURY_PUBLIC_KEY, lamports);

  if (!txResult.success) {
    return {
      success: false,
      message: txResult.error ?? "Transaction failed",
      txRef: txResult.signature ?? undefined,
    };
  }

  const newBalance = await getCreditBalance(userId);

  return {
    success: true,
    message: `${humanizeAction(action)} successful`,
    newBalance,
    txRef: txResult.signature ?? undefined,
  };
}

export async function awardCredits(
  userId: string,
  amount: number,
  reason: string
): Promise<CreditActionResult> {
  if (amount <= 0) {
    return { success: false, message: "Invalid award amount" };
  }

  if (getSolanaMode() === "mock") {
    await delay(400, 800);
    const current = await getCreditBalance(userId);
    const newBalance = buildBalance(current.credits + amount);

    return {
      success: true,
      message: `+${amount} credits — ${reason}`,
      newBalance,
      txRef: mockRef(),
    };
  }

  // Real mode award (requires treasury control on backend)
  console.warn("[creditService] Real awards require server-side treasury signing");
  return {
    success: false,
    message: "Credit awards are not yet available on mainnet",
  };
}

export function getCreditCost(action: CreditAction): number {
  return Math.max(0, CREDIT_COSTS[action]);
}

export function formatCredits(credits: number): string {
  return credits === 1 ? "1 credit" : `${credits.toLocaleString()} credits`;
}

export function canAfford(balance: CreditBalance, action: CreditAction): boolean {
  return balance.credits >= getCreditCost(action);
}

// ─── Internal Helpers ────

function buildBalance(credits: number): CreditBalance {
  return { credits, display: formatCredits(credits) };
}

function humanizeAction(action: CreditAction): string {
  const map: Record<CreditAction, string> = {
    join_plan: "Plan joined",
    create_plan: "Plan created",
    submit_proof: "Proof submitted",
    award_completion: "Plan completed",
    stake_reliability: "Reliability staked",
  };
  return map[action];
}

function delay(min: number, max: number): Promise<void> {
  return new Promise(r => setTimeout(r, min + Math.random() * (max - min)));
}

function mockRef(): string {
  return `mock_${Date.now().toString(36)}`;
}