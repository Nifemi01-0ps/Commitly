"use client";

import { useState } from "react";
import { usePlansStore } from "../store/usePlansStore";
import { useUserStore } from "../store/useUserStore";
import { useActivityStore } from "../store/useActivityStore";
import { useRealMode } from "../hooks/useRealMode";
import { useToast } from "../components/ui/Toast";
import { Button } from "../components/ui";
import RealModeBadge from "../components/RealModeBadge";
import styles from "./JoinPoolButton.module.css";

interface JoinPoolButtonProps {
  planId: string;
  planTitle: string;
  stakeAmount: number;
  onSuccess?: () => void;
}

export default function JoinPoolButton({
  planId,
  planTitle,
  stakeAmount,
  onSuccess,
}: JoinPoolButtonProps) {
  const user = useUserStore((s) => s.user);
  const deductCredits = useUserStore((s) => s.deductCredits);
  const joinPlan = usePlansStore((s) => s.joinPlan);
  const pushActivity = useActivityStore((s) => s.push);
  const { isRealMode, lockCommit, creditsToSolDisplay } = useRealMode();
  const toast = useToast();

  const [state, setState] = useState<"idle" | "pending" | "done" | "failed">("idle");

  const userCredits = user?.credits ?? 0;
  const canAfford = userCredits >= stakeAmount;
  const solDisplay = creditsToSolDisplay(stakeAmount);

  async function handleJoin() {
    if (!user || state !== "idle" || !canAfford) return;
    setState("pending");

    const ok = deductCredits(stakeAmount);
    if (!ok) {
      setState("failed");
      toast.error(`You need ${stakeAmount} credits to join. You have ${userCredits}.`);
      setTimeout(() => setState("idle"), 3000);
      return;
    }

    if (isRealMode) {
      lockCommit(planId, stakeAmount).then((result) => {
        if (result.onChain) toast.info("⚡ Secured on-chain");
      });
    }

    await new Promise((r) => setTimeout(r, 500));
    joinPlan(planId, {
      id: user.id,
      initials: user.initials,
      color: user.color,
      stake: stakeAmount,
    });

    setState("done");
    toast.success(`Joined! ${stakeAmount} credits committed.${isRealMode ? " ⚡" : ""}`);

    pushActivity({
      type: "join",
      userId: "me",
      userInitials: user.initials,
      userColor: user.color,
      planTitle,
      planId,
      timestamp: new Date().toISOString(),
      meta: { participantCount: stakeAmount },
    });

    onSuccess?.();
  }

  // Already Joined State
  if (state === "done") {
    return (
      <div className={styles.successContainer}>
        <div className={styles.successMessage}>
          <span>✓</span> Joined · {stakeAmount} credits committed
        </div>
        <RealModeBadge />
      </div>
    );
  }

  // Insufficient Funds State
  if (!canAfford) {
    return (
      <div className={styles.insufficientContainer}>
        <Button variant="secondary" fullWidth disabled>
          Join · {stakeAmount} credits
        </Button>
        <div className={styles.creditInfo}>
          <span className={styles.needMore}>
            Need {stakeAmount - userCredits} more credits
          </span>
          <span className={styles.haveCredits}>
            You have {userCredits}
          </span>
        </div>
      </div>
    );
  }

  // Default / Join Button
  return (
    <div className={styles.container}>
      <Button
        variant="primary"
        fullWidth
        loading={state === "pending"}
        onClick={handleJoin}
        icon={state === "pending" ? undefined : <span>👋</span>}
      >
        {state === "pending"
          ? "Joining…"
          : isRealMode
            ? `Join ⚡ · ${stakeAmount} credits${solDisplay ? ` (${solDisplay})` : ""}`
            : `Join Plan · ${stakeAmount} credits`}
      </Button>

      <p className={styles.helperText}>
        Credits returned if you complete it
        {isRealMode && <span className={styles.onChain}> · secured on-chain</span>}
      </p>
    </div>
  );
}