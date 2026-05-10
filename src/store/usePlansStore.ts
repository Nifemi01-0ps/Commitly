/**
 * usePlansStore.ts
 *
 * Central store for all Plans / Commitments in the app.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { deriveStatus, withDerivedStatuses } from "../lib/utils";
import { calcSoloOutcome, calcGroupOutcomes } from "../services/outcomeService";

export type PlanType = "solo" | "group";
export type ProofType = "link" | "image" | "self";
export type PlanStatus = "upcoming" | "live" | "completed" | "failed";

export interface Participant {
  id: string;
  initials: string;
  color: string;
  stake: number;
}

export interface ProofEntry {
  userId: string;
  content: string;
  proofType: ProofType;
  timestamp: string;
}

export interface Plan {
  id: string;
  title: string;
  type: PlanType;
  deadline: string;
  proofType: ProofType;
  participants: Participant[];
  status: PlanStatus;
  createdAt: string;

  stakeAmount: number;
  creditPool: number;
  rewardsSettled: boolean;

  proofs: ProofEntry[];
  completedUsers: string[];
  failedUsers: string[];
}

export interface SettlementResult {
  planId: string;
  planTitle: string;
  winnerIds: string[];
  loserIds: string[];
  winnerPayout: number;
  summary: string;
}

interface PlansStore {
  plans: Plan[];
  addPlan: (data: Omit<Plan, "id" | "createdAt" | "status" | "participants" | "creditPool" | "rewardsSettled" | "proofs" | "completedUsers" | "failedUsers">) => Plan;
  joinPlan: (id: string, participant: Participant) => void;
  submitProof: (id: string, userId: string, content: string, proofType: ProofType) => void;
  markUserFailed: (id: string, userId: string) => void;
  settleRewards: (id: string) => SettlementResult | null;
  syncStatuses: () => void;
}

// Seed data
const SEED_PLANS: Plan[] = [ /* ... your seed data ... */ ];

export const usePlansStore = create<PlansStore>()(
  persist(
    (set, get) => ({
      plans: SEED_PLANS,

      syncStatuses: () => {
        set((state) => ({
          plans: withDerivedStatuses(state.plans),
        }));
      },

      addPlan: (data) => {
        const newPlan: Plan = {
          ...data,
          id: `plan-${Date.now()}`,
          createdAt: new Date().toISOString(),
          status: "upcoming",
          participants: [{
            id: "me",
            initials: "DA",
            color: "#4F46E5",
            stake: data.stakeAmount
          }],
          creditPool: data.stakeAmount,
          rewardsSettled: false,
          proofs: [],
          completedUsers: [],
          failedUsers: [],
        };

        set((state) => ({ plans: [newPlan, ...state.plans] }));
        return newPlan;
      },

      joinPlan: (id, participant) =>
        set((state) => ({
          plans: state.plans.map((p) =>
            p.id === id && !p.participants.some((x) => x.id === participant.id)
              ? {
                  ...p,
                  participants: [...p.participants, participant],
                  creditPool: p.creditPool + participant.stake,
                }
              : p
          ),
        })),

      submitProof: (id, userId, content, proofType) =>
        set((state) => ({
          plans: state.plans.map((p) => {
            if (p.id !== id || p.completedUsers.includes(userId)) return p;

            const newProof: ProofEntry = {
              userId,
              content,
              proofType,
              timestamp: new Date().toISOString(),
            };

            const completedUsers = [...p.completedUsers, userId];
            const isAllDone = p.participants.every((par) => completedUsers.includes(par.id));

            return {
              ...p,
              proofs: [...p.proofs, newProof],
              completedUsers,
              status: isAllDone ? "completed" : p.status,
            };
          }),
        })),

      markUserFailed: (id, userId) =>
        set((state) => ({
          plans: state.plans.map((p) =>
            p.id === id
              ? {
                  ...p,
                  failedUsers: p.failedUsers.includes(userId)
                    ? p.failedUsers
                    : [...p.failedUsers, userId],
                }
              : p
          ),
        })),

      settleRewards: (id) => {
        const plan = get().plans.find((p) => p.id === id);
        if (!plan || plan.rewardsSettled) return null;

        const outcome = plan.type === "solo"
          ? calcSoloOutcome(plan.stakeAmount, plan.completedUsers.includes("me"))
          : calcGroupOutcomes(
              plan.participants.map((p) => ({
                userId: p.id,
                stake: p.stake,
                completed: plan.completedUsers.includes(p.id),
              }))
            );

        // In real implementation, you would apply credit changes here via useCreditsStore

        set((state) => ({
          plans: state.plans.map((p) =>
            p.id === id ? { ...p, rewardsSettled: true } : p
          ),
        }));

        return {
          planId: plan.id,
          planTitle: plan.title,
          winnerIds: plan.type === "solo" ? ["me"] : [],
          loserIds: [],
          winnerPayout: 0, // populated by StatusSyncer
          summary: "Settlement completed",
        };
      },
    }),
    {
      name: "commitly-plans",
      onRehydrateStorage: () => (state) => {
        state?.syncStatuses();
      },
    }
  )
);