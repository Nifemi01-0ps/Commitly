/**
 * useReliabilityStore.ts
 *
 * Manages the user's Reliability Score — a measure of how consistently they complete commitments.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ReliabilityLevel = "High" | "Medium" | "Low";
export type ProofType = "self" | "image" | "link";

export const PROOF_WEIGHTS: Record<ProofType, number> = {
  self: 1,
  image: 2,
  link: 3,
};

export const PROOF_LABELS: Record<ProofType, string> = {
  self:  "Quick confirm",
  image: "Photo proof",
  link:  "Link proof",
};

export const CONFIDENCE_LEVELS: Record<ProofType, { label: string; icon: string; color: string; bg: string }> = {
  self:  { label: "Low confidence",    icon: "⚠️", color: "#D97706", bg: "#FEF3C7" },
  image: { label: "Medium confidence", icon: "📸", color: "#0891B2", bg: "#DBEAFE" },
  link:  { label: "High confidence",   icon: "🔗", color: "#16A34A", bg: "#DCFCE7" },
};

export interface ReliabilityEvent {
  id: string;
  type: "success" | "failure";
  planTitle: string;
  proofType: ProofType | null;
  delta: number;
  scoreAfter: number;
  timestamp: string;
  confidenceLabel?: string;
}

interface ReliabilityStore {
  score: number;
  completed: number;
  failed: number;
  history: ReliabilityEvent[];

  recordSuccess: (planTitle: string, proofType: ProofType, selfConfirmRatio: number) => number;
  recordFailure: (planTitle: string) => void;

  getLevel: () => ReliabilityLevel;
  getPercentage: () => number;
  reset: () => void;
}

// Constants
const MAX_SCORE = 50;
const FAILURE_PENALTY = -2;

export const useReliabilityStore = create<ReliabilityStore>()(
  persist(
    (set, get) => ({
      score: 12,
      completed: 12,
      failed: 1,
      history: [],

      recordSuccess: (planTitle, proofType, selfConfirmRatio) => {
        let weight = PROOF_WEIGHTS[proofType];

        // Diminishing returns on self-proofs
        if (proofType === "self") {
          if (selfConfirmRatio > 0.9) weight *= 0.2;
          else if (selfConfirmRatio > 0.7) weight *= 0.5;
        }

        const gain = Math.max(1, Math.round(weight));
        const current = get().score;
        const next = Math.min(MAX_SCORE, current + gain);

        const event: ReliabilityEvent = {
          id: `rel-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          type: "success",
          planTitle,
          proofType,
          delta: gain,
          scoreAfter: next,
          timestamp: new Date().toISOString(),
          confidenceLabel: CONFIDENCE_LEVELS[proofType].label,
        };

        set((s) => ({
          score: next,
          completed: s.completed + 1,
          history: [event, ...s.history].slice(0, 50),
        }));

        return gain;
      },

      recordFailure: (planTitle) => {
        const current = get().score;
        const next = Math.max(0, current + FAILURE_PENALTY);

        const event: ReliabilityEvent = {
          id: `rel-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          type: "failure",
          planTitle,
          proofType: null,
          delta: FAILURE_PENALTY,
          scoreAfter: next,
          timestamp: new Date().toISOString(),
        };

        set((s) => ({
          score: next,
          failed: s.failed + 1,
          history: [event, ...s.history].slice(0, 50),
        }));
      },

      getLevel: () => {
        const { score } = get();
        if (score >= 40) return "High";
        if (score >= 20) return "Medium";
        return "Low";
      },

      getPercentage: () => Math.min(100, Math.round((get().score / MAX_SCORE) * 100)),

      reset: () => set({ score: 0, completed: 0, failed: 0, history: [] }),
    }),

    {
      name: "commitly-reliability",
    }
  )
);