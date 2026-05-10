"use client";

import { useEffect, useRef } from "react";
import { usePlansStore } from "../store/usePlansStore";
import { useReliabilityStore } from "../store/useReliabilityStore";
import { useUserStore } from "../store/useUserStore";
import { useActivityStore } from "../store/useActivityStore";
import { useNotifStore } from "../store/useNotifStore";

const LOG_PREFIX = "[StatusSyncer]";

export default function StatusSyncer() {
  const plans = usePlansStore((s) => s.plans);
  const syncStatuses = usePlansStore((s) => s.syncStatuses);
  const markUserFailed = usePlansStore((s) => s.markUserFailed);
  const settleRewards = usePlansStore((s) => s.settleRewards);

  const recordFailure = useReliabilityStore((s) => s.recordFailure);
  const recordSuccess = useReliabilityStore((s) => s.recordSuccess);

  const addCredits = useUserStore((s) => s.addCredits);
  const user = useUserStore((s) => s.user);

  const pushActivity = useActivityStore((s) => s.push);
  const pushNotif = useNotifStore((s) => s.push);

  const settledRef = useRef<Set<string>>(new Set());
  const penalisedRef = useRef<Set<string>>(new Set());

  // Log helper
  const log = (message: string, level: "info" | "warn" | "error" = "info") => {
    const style = level === "error" ? "color: red" : level === "warn" ? "color: orange" : "color: #666";
    console[level === "error" ? "error" : level === "warn" ? "warn" : "log"](`%c${LOG_PREFIX}`, style, message);
  };

  // Periodic Status Sync
  useEffect(() => {
    const performSync = async () => {
      try {
        log("Syncing plan statuses...");
        await syncStatuses();
        log("Status sync completed");
      } catch (err) {
        log("Failed to sync statuses", "error");
        console.error(err);
      }
    };

    performSync();
    const interval = setInterval(performSync, 60_000); // every 60 seconds

    return () => clearInterval(interval);
  }, [syncStatuses]);

  // Handle Failures and Settlements
  useEffect(() => {
    if (!user) return;

    plans.forEach((plan) => {
      const userIsParticipant = plan.participants.some((p) => p.id === "me");
      if (!userIsParticipant) return;

      // ── Failure Handling ─────────────────────────────────────────────
      if (plan.status === "failed" && !penalisedRef.current.has(plan.id)) {
        try {
          const alreadyFailed = plan.failedUsers.includes("me");
          const alreadyComplete = plan.completedUsers.includes("me");

          if (!alreadyFailed && !alreadyComplete) {
            penalisedRef.current.add(plan.id);

            markUserFailed(plan.id, "me");
            recordFailure(plan.title);

            pushActivity({
              type: "fail",
              userId: "me",
              userInitials: user.initials,
              userColor: user.color,
              planTitle: plan.title,
              planId: plan.id,
              timestamp: new Date().toISOString(),
              meta: { creditDelta: -plan.stakeAmount },
            });

            pushNotif({
              type: "missed",
              message: `You missed "${plan.title}" — ${plan.stakeAmount} credits forfeited`,
              planId: plan.id,
              timestamp: new Date().toISOString(),
            });

            log(`User marked as failed for plan: ${plan.title}`);
          }
        } catch (err) {
          log(`Error handling failure for plan ${plan.id}`, "error");
          console.error(err);
        }
      }

      // ── Reward Settlement ──
      if (
        (plan.status === "completed" || plan.status === "failed") &&
        !plan.rewardsSettled &&
        !settledRef.current.has(plan.id)
      ) {
        try {
          settledRef.current.add(plan.id);
          const result = settleRewards(plan.id);

          if (!result) {
            log(`No settlement result for plan ${plan.id}`, "warn");
            return;
          }

          const userWon = result.winnerIds.includes("me");
          const userLost = result.loserIds.includes("me");

          if (userWon) {
            addCredits(result.winnerPayout);
            recordSuccess(plan.title, "self", 0);

            pushActivity({
              type: "complete",
              userId: "me",
              userInitials: user.initials,
              userColor: user.color,
              planTitle: plan.title,
              planId: plan.id,
              timestamp: new Date().toISOString(),
              meta: { creditDelta: result.winnerPayout },
            });

            pushNotif({
              type: "credits_earned",
              message: `You earned +${result.winnerPayout} credits for completing "${plan.title}"`,
              planId: plan.id,
              timestamp: new Date().toISOString(),
            });

            log(`Rewards settled (win) for plan: ${plan.title}`);
          } else if (userLost) {
            recordFailure(plan.title);
            pushNotif({
              type: "credits_lost",
              message: `You lost ${plan.stakeAmount} credits — missed "${plan.title}"`,
              planId: plan.id,
              timestamp: new Date().toISOString(),
            });

            log(`Rewards settled (loss) for plan: ${plan.title}`);
          }
        } catch (err) {
          log(`Error settling rewards for plan ${plan.id}`, "error");
          console.error(err);
        }
      }
    });
  }, [
    plans,
    user,
    markUserFailed,
    settleRewards,
    recordFailure,
    recordSuccess,
    addCredits,
    pushActivity,
    pushNotif,
  ]);

  return null;
}