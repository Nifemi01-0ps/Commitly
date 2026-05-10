/**
 * useUserStore.ts
 *
 * Central user session store. Manages profile, credits, Real Mode, and hidden wallet.
 * Only store that should hold raw user identity.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getHiddenWallet, generateHiddenWallet } from "../services/identityService";

export interface CommitlyUser {
  id: string;
  name: string;
  initials: string;
  color: string;
  joinedAt: string;
  credits: number;
  realMode: boolean;
  walletPublicKey: string;        // Internal only — never shown to user
  selfConfirmCount: number;
  totalProofs: number;
}

interface UserStore {
  user: CommitlyUser | null;
  isNew: boolean;

  signIn: (name: string) => CommitlyUser;
  signOut: () => void;
  setName: (name: string) => void;
  dismissNewUser: () => void;

  toggleRealMode: () => void;

  // Credits
  deductCredits: (amount: number) => boolean;
  addCredits: (amount: number) => void;
  setCredits: (amount: number) => void;

  // Proof tracking
  recordProof: (proofType: "self" | "image" | "link") => void;
  getSelfConfirmRatio: () => number;
}

// ─── Store ─────

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      user: null,
      isNew: false,

      signIn: (name) => {
        const trimmed = name.trim() || "Anonymous";
        const id = `u_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;

        // Generate hidden wallet
        const wallet = generateHiddenWallet(id);

        const user: CommitlyUser = {
          id,
          name: trimmed,
          initials: getInitials(trimmed),
          color: pickRandomColor(id),
          joinedAt: new Date().toISOString(),
          credits: 100,
          realMode: false,
          walletPublicKey: wallet.publicKey,
          selfConfirmCount: 0,
          totalProofs: 0,
        };

        set({ user, isNew: true });
        return user;
      },

      signOut: () => set({ user: null, isNew: false }),

      setName: (name) =>
        set((s) => {
          if (!s.user) return s;
          return {
            user: {
              ...s.user,
              name: name.trim(),
              initials: getInitials(name),
            },
          };
        }),

      dismissNewUser: () => set({ isNew: false }),

      toggleRealMode: () =>
        set((s) => {
          if (!s.user) return s;
          // Ensure wallet exists before enabling Real Mode
          if (!s.user.walletPublicKey) {
            const wallet = generateHiddenWallet(s.user.id);
            return {
              user: { ...s.user, realMode: !s.user.realMode, walletPublicKey: wallet.publicKey },
            };
          }
          return { user: { ...s.user, realMode: !s.user.realMode } };
        }),

      deductCredits: (amount) => {
        const { user } = get();
        if (!user || user.credits < amount) return false;

        set({ user: { ...user, credits: user.credits - amount } });
        return true;
      },

      addCredits: (amount) =>
        set((s) => {
          if (!s.user) return s;
          return { user: { ...s.user, credits: Math.max(0, s.user.credits + amount) } };
        }),

      setCredits: (amount) =>
        set((s) => {
          if (!s.user) return s;
          return { user: { ...s.user, credits: Math.max(0, amount) } };
        }),

      recordProof: (proofType) =>
        set((s) => {
          if (!s.user) return s;
          return {
            user: {
              ...s.user,
              totalProofs: s.user.totalProofs + 1,
              selfConfirmCount: proofType === "self"
                ? s.user.selfConfirmCount + 1
                : s.user.selfConfirmCount,
            },
          };
        }),

      getSelfConfirmRatio: () => {
        const { user } = get();
        if (!user || user.totalProofs === 0) return 0;
        return user.selfConfirmCount / user.totalProofs;
      },
    }),

    {
      name: "commitly-user",
      partialize: (state) => ({ user: state.user, isNew: state.isNew }),
    }
  )
);

// ─── Helpers ──

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

function pickRandomColor(userId: string): string {
  const colors = ["#4F46E5", "#7C3AED", "#DB2777", "#16A34A", "#D97706", "#0891B2", "#9333EA"];
  return colors[userId.charCodeAt(2) % colors.length];
}