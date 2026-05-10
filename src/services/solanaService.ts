/**
 * solanaService.ts
 *
 * THE ONLY FILE THAT IMPORTS @solana/web3.js
 * Bottom layer of the abstraction stack.
 */

import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
  clusterApiUrl,
} from "@solana/web3.js";

export type SolanaMode = "mock" | "devnet" | "mainnet-beta";

// ─── Mode ────

export function getSolanaMode(): SolanaMode {
  const mode = process.env.NEXT_PUBLIC_SOLANA_MODE ?? "mock";
  return mode as SolanaMode;
}

function isMockMode(): boolean {
  return getSolanaMode() === "mock";
}

// ─── Connection ───────

function getConnection(): Connection {
  const mode = getSolanaMode();
  const endpoint = mode === "mainnet-beta" 
    ? clusterApiUrl("mainnet-beta") 
    : clusterApiUrl("devnet");

  return new Connection(endpoint, {
    commitment: "confirmed",
    confirmTransactionInitialTimeout: 30_000,
  });
}

// ─── Mock Helpers ────

function mockDelay(min = 400, max = 900): Promise<void> {
  return new Promise((r) => setTimeout(r, min + Math.random() * (max - min)));
}

function mockSignature(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz123456789";
  return Array.from({ length: 88 }, () => 
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

// ─── Types ─────

export interface TransactionResult {
  success: boolean;
  signature: string | null;
  error: string | null;
}

export interface BalanceResult {
  lamports: number;
  sol: number;
}

// ─── Public API ────

export async function getAccountBalance(publicKeyStr: string): Promise<BalanceResult> {
  let pubkey: PublicKey;
  try {
    pubkey = new PublicKey(publicKeyStr);
  } catch {
    throw new Error(`Invalid public key: ${publicKeyStr.slice(0, 8)}...`);
  }

  if (isMockMode()) {
    await mockDelay(120, 350);
    const seed = pubkey.toBytes()[0] || 42;
    const lamports = 50_000_000 + seed * 1_000_000;
    return { lamports, sol: lamports / LAMPORTS_PER_SOL };
  }

  const connection = getConnection();
  try {
    const lamports = await connection.getBalance(pubkey);
    return { lamports, sol: lamports / LAMPORTS_PER_SOL };
  } catch (err: unknown) {
    throw new Error(translateError(err));
  }
}

export async function transferLamports(
  fromKeypair: Keypair,
  toPublicKeyStr: string,
  lamports: number
): Promise<TransactionResult> {
  if (lamports <= 0) {
    return { success: false, signature: null, error: "Amount must be greater than zero" };
  }

  if (isMockMode()) {
    await mockDelay(600, 1400);
    if (Math.random() < 0.05) {
      return { success: false, signature: null, error: "Simulated network timeout" };
    }
    return { success: true, signature: mockSignature(), error: null };
  }

  try {
    const connection = getConnection();
    const toPubkey = new PublicKey(toPublicKeyStr);

    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: fromKeypair.publicKey,
        toPubkey: toPubkey,
        lamports,
      })
    );

    const signature = await sendAndConfirmTransaction(connection, tx, [fromKeypair]);

    return { success: true, signature, error: null };
  } catch (err: unknown) {
    return { success: false, signature: null, error: translateError(err) };
  }
}

export async function airdropSol(publicKeyStr: string, solAmount = 1): Promise<void> {
  if (isMockMode()) return;
  if (getSolanaMode() === "mainnet-beta") {
    throw new Error("Airdrop is not available on mainnet");
  }

  const connection = getConnection();
  const pubkey = new PublicKey(publicKeyStr);
  const signature = await connection.requestAirdrop(pubkey, solAmount * LAMPORTS_PER_SOL);
  await connection.confirmTransaction(signature);
}

// ─── Error Translation ─────

function translateError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);

  if (message.includes("insufficient funds") || message.includes("0x1")) {
    return "Not enough SOL to complete this transaction";
  }
  if (message.includes("blockhash not found") || message.includes("timeout")) {
    return "Transaction timed out. Please try again.";
  }
  if (message.includes("User rejected")) {
    return "Transaction was cancelled";
  }
  if (message.includes("Network") || message.includes("fetch")) {
    return "Connection error — check your internet";
  }

  console.error("[solanaService] Unhandled error:", message);
  return "Transaction failed. Please try again.";
}