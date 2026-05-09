/**
 * identityService.ts
 *
 * LAYER 3 — Maps Commitly userId → Solana Keypair (hidden wallet).
 * Only creditService and escrowService should import from here.
 */

import { Keypair } from "@solana/web3.js";
import { subtle } from "uncrypto"; // or use Web Crypto API directly

// ─── Types ─────────────────────────────────────────────────────────────────

interface UserIdentity {
  keypair: Keypair;
  publicKey: string;
  userId: string;
}

// In-memory cache (cleared on refresh — intentional for MVP)
const identityRegistry = new Map<string, UserIdentity>();

// ─── Key Derivation ────

/**
 * Derives a cryptographically stronger seed from userId.
 * In production, this should be replaced with a server-side KMS call.
 */
async function deriveSecretBytes(userId: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const input = encoder.encode(`commitly:v1:${userId}`);

  // Use HKDF (recommended) or PBKDF2 for better security
  const baseKey = await subtle.importKey(
    "raw",
    input,
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );

  const seed = await subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: encoder.encode("commitly-salt-v1"),
      iterations: 10000,
      hash: "SHA-256",
    },
    baseKey,
    256 // 32 bytes
  );

  return new Uint8Array(seed);
}

/**
 * Get or create deterministic identity for a user.
 */
async function getOrCreateIdentity(userId: string): Promise<UserIdentity> {
  const existing = identityRegistry.get(userId);
  if (existing) return existing;

  const secretBytes = await deriveSecretBytes(userId);
  const keypair = Keypair.fromSecretKey(secretBytes);

  const identity: UserIdentity = {
    keypair,
    publicKey: keypair.publicKey.toBase58(),
    userId,
  };

  identityRegistry.set(userId, identity);
  return identity;
}

// ─── Public API (Safe Exports) ───

export function getKeypair(userId: string): Keypair {
  // Note: This is async in improved version, but kept sync for compatibility.
  // In real production, this should be async.
  const identity = identityRegistry.get(userId);
  if (identity) return identity.keypair;

  // Fallback (synchronous for now — not ideal)
  console.warn("[identityService] Synchronous fallback used. Consider making getKeypair async.");
  const tempIdentity = getOrCreateIdentitySync(userId); // legacy sync version
  return tempIdentity.keypair;
}

export function getPublicKeyString(userId: string): string {
  return getOrCreateIdentitySync(userId).publicKey;
}

export function clearIdentity(userId: string): void {
  identityRegistry.delete(userId);
}

export function debugIdentity(userId: string): void {
  if (process.env.NODE_ENV !== "development") return;
  const id = getOrCreateIdentitySync(userId);
  console.debug(`[Identity] User "${userId}" → ${id.publicKey}`);
}

// ─── Legacy Synchronous Fallback (for compatibility) ────

function getOrCreateIdentitySync(userId: string): UserIdentity {
  const existing = identityRegistry.get(userId);
  if (existing) return existing;

  const encoder = new TextEncoder();
  const raw = encoder.encode(`commitly:user:${userId}:v1`);

  const seed = new Uint8Array(32);
  for (let i = 0; i < raw.length; i++) {
    seed[i % 32] ^= raw[i];
  }

  const keypair = Keypair.fromSecretKey(seed);
  const identity: UserIdentity = {
    keypair,
    publicKey: keypair.publicKey.toBase58(),
    userId,
  };

  identityRegistry.set(userId, identity);
  return identity;
}