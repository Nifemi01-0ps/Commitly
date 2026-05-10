/**
 * useUserStore.ts
 *
 * User session, credits, proof tracking, and Real Commitment Mode.
 *
 * The hidden wallet is generated once per user and stored in localStorage.
 * It is NEVER shown to the user. The UI sees only "credits" and a "realMode"
 * toggle — no keys, no addresses, no Solana terminology.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Keypair } from "@solana/web3.js";

// ─── Hidden wallet ─────────────────────────────────────────────────────────────

/**
 * Generate and persist a hidden Solana keypair for a userId.
 * Stored in localStorage under a hashed key — never surfaced to UI.
 * Returns the public key string for internal reference only.
 */
function generateHiddenWallet(userId: string): { publicKey: string; secretKey: number[] } {
  const storageKey = `cmt_wlt_${userId}`;

  // Check if already generated for this user
  try {
    const existing = localStorage.getItem(storageKey);
    if (existing) {
      const parsed = JSON.parse(existing);
      if (parsed.publicKey && parsed.secretKey) return parsed;
    }
  } catch { /* storage unavailable — generate fresh */ }

  // Generate new keypair
  const keypair = Keypair.generate();
  const wallet  = {
    publicKey: keypair.publicKey.toBase58(),
    secretKey: Array.from(keypair.secretKey),
  };

  try {
    localStorage.setItem(storageKey, JSON.stringify(wallet));
  } catch { /* storage full or unavailable */ }

  console.debug(`[Wallet] Generated hidden wallet for user ${userId}: ${wallet.publicKey.slice(0, 8)}...`);
  return wallet;
}

/** Retrieve the hidden keypair for a user (for internal use by escrowService). */
export function getHiddenWallet(userId: string): { publicKey: string; secretKey: number[] } | null {
  try {
    const stored = localStorage.getItem(`cmt_wlt_${userId}`);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    if (parsed.publicKey && Array.isArray(parsed.secretKey)) return parsed;
    return null;
  } catch {
    return null;
  }
}

/** Reconstruct the Keypair object from stored secret key bytes. */
export function getHiddenKeypair(userId: string): Keypair | null {
  const wallet = getHiddenWallet(userId);
  if (!wallet) return null;
  try {
    return Keypair.fromSecretKey(Uint8Array.from(wallet.secretKey));
  } catch {
    return null;
  }
}

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface CommitlyUser {
  id:               string;
  name:             string;
  initials:         string;
  color:            string;
  joinedAt:         string;
  credits:          number;
  // ── Real Commitment Mode ─────────────────────────────────────────────────
  realMode:         boolean;   // true = Solana-backed commitments
  walletPublicKey:  string;    // internal only — never displayed
  // ── Proof behaviour tracking ─────────────────────────────────────────────
  selfConfirmCount: number;
  totalProofs:      number;
}

interface UserStore {
  user:    CommitlyUser | null;
  isNew:   boolean;

  signIn:   (name: string) => CommitlyUser;
  signOut:  () => void;
  setName:  (name: string) => void;
  dismiss:  () => void;

  // ── Real Commitment Mode ──────────────────────────────────────────────────
  toggleRealMode: () => void;

  // ── Credits ───────────────────────────────────────────────────────────────
  deductCredits:      (amount: number) => boolean;
  addCredits:         (amount: number) => void;
  setCredits:         (amount: number) => void;

  // ── Proof tracking ────────────────────────────────────────────────────────
  recordProof:        (proofType: "self" | "image" | "link") => void;
  getSelfConfirmRatio: () => number;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const COLORS          = ["#4F46E5","#7C3AED","#DB2777","#16A34A","#D97706","#0891B2"];
const STARTING_CREDITS = 100;

function generateUserId(): string {
  return `u_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

function getInitials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "").join("");
}

function pickColor(userId: string): string {
  return COLORS[userId.charCodeAt(2) % COLORS.length];
}

// ─── Store ─────────────────────────────────────────────────────────────────────

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      user:  null,
      isNew: false,

      signIn: (name) => {
        const trimmed = name.trim() || "Anonymous";
        const id      = generateUserId();

        // Generate hidden Solana wallet immediately — user never sees this
        const wallet  = generateHiddenWallet(id);

        const user: CommitlyUser = {
          id,
          name:             trimmed,
          initials:         getInitials(trimmed),
          color:            pickColor(id),
          joinedAt:         new Date().toISOString(),
          credits:          STARTING_CREDITS,
          realMode:         false,
          walletPublicKey:  wallet.publicKey,
          selfConfirmCount: 0,
          totalProofs:      0,
        };
        set({ user, isNew: true });
        return user;
      },

      signOut: () => set({ user: null, isNew: false }),

      setName: (name) =>
        set((s) => s.user
          ? { user: { ...s.user, name, initials: getInitials(name) } }
          : s),

      dismiss: () => set({ isNew: false }),

      toggleRealMode: () => {
        const { user } = get();
        if (!user) return;
        // Ensure wallet exists before enabling — regenerate if missing
        const wallet = getHiddenWallet(user.id);
        if (!wallet) generateHiddenWallet(user.id);
        set({ user: { ...user, realMode: !user.realMode } });
      },

      deductCredits: (amount) => {
        const { user } = get();
        if (!user) return false;
        if (user.credits < amount) return false;
        set({ user: { ...user, credits: user.credits - amount } });
        return true;
      },

      addCredits: (amount) => {
        const { user } = get();
        if (!user) return;
        set({ user: { ...user, credits: Math.max(0, user.credits + amount) } });
      },

      setCredits: (amount) => {
        const { user } = get();
        if (!user) return;
        set({ user: { ...user, credits: Math.max(0, amount) } });
      },

      recordProof: (proofType) => {
        const { user } = get();
        if (!user) return;
        set({
          user: {
            ...user,
            totalProofs:      user.totalProofs + 1,
            selfConfirmCount: proofType === "self"
              ? user.selfConfirmCount + 1
              : user.selfConfirmCount,
          },
        });
      },

      getSelfConfirmRatio: () => {
        const { user } = get();
        if (!user || user.totalProofs === 0) return 0;
        return user.selfConfirmCount / user.totalProofs;
      },
    }),
    { name: "commitly-user" }
  )
);
