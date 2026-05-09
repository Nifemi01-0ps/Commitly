"use client";

import Link from "next/link";
import { Plan } from "@/store/usePlansStore";
import { formatDeadline, timeUntil } from "@/lib/utils";
import { StatusBadge, AvatarStack } from "../components/ui";
import styles from "./PlanCard.module.css";

interface PlanCardProps {
  plan: Plan;
  animate?: boolean;
  index?: number; // for staggered entrance
}

export default function PlanCard({ plan, animate = true, index = 0 }: PlanCardProps) {
  const isDone = plan.status === "completed" || plan.status === "failed";
  const isLive = plan.status === "live";

  const ctaLabel =
    plan.status === "live"
      ? "Check In"
      : plan.status === "upcoming" && plan.type === "group"
        ? "Join"
        : "View";

  return (
    <div
      className={`${styles.card} ${isLive ? styles.live : ""} ${isDone ? styles.done : ""}`}
      style={{
        animationDelay: animate ? `${index * 0.06}s` : undefined,
      }}
    >
      {/* Live accent strip */}
      {isLive && <div className={styles.liveAccent} />}

      {/* Top Row */}
      <div className={styles.topRow}>
        <div className={styles.titleSection}>
          <div className={styles.title}>{plan.title}</div>
          <div className={styles.meta}>
            <span className={styles.deadline}>
              <ClockIcon />
              {isDone ? formatDeadline(plan.deadline) : timeUntil(plan.deadline)}
            </span>
            <span className={styles.typeBadge}>{plan.type}</span>
          </div>
        </div>
        <StatusBadge status={plan.status} />
      </div>

      {/* Credit Line */}
      <div className={styles.creditBox}>
        <span className={styles.creditIcon}>⬡</span>
        <span className={styles.stakeAmount}>
          {plan.stakeAmount} committed
        </span>

        {plan.type === "group" && plan.creditPool > plan.stakeAmount && (
          <>
            <span className={styles.dot}>·</span>
            <span className={styles.totalPool}>
              {plan.creditPool} total pool
            </span>
          </>
        )}

        {plan.type === "solo" && (
          <>
            <span className={styles.dot}>·</span>
            <span className={styles.bonus}>
              +{Math.floor(plan.stakeAmount * 0.2)} bonus on success
            </span>
          </>
        )}

        {plan.completedUsers?.length > 0 && (
          <span className={styles.completionTally}>
            ✓ {plan.completedUsers.length}
            {plan.failedUsers?.length > 0 && (
              <span className={styles.failedCount}>
                {" "}· ✗ {plan.failedUsers.length}
              </span>
            )}
          </span>
        )}
      </div>

      {/* Bottom Row */}
      <div className={styles.bottomRow}>
        <AvatarStack participants={plan.participants} />
        
        <Link href={`/commit/${plan.id}`} style={{ textDecoration: "none" }}>
          <button className={`${styles.ctaButton} ${isDone ? styles.ctaDone : ""}`}>
            {isDone ? "View" : ctaLabel}
          </button>
        </Link>
      </div>
    </div>
  );
}

function ClockIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}