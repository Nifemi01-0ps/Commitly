"use client";

import { useCredits } from "@/hooks/useCredits";
import styles from "./CreditBalance.module.css";

interface CreditBalanceProps {
  /** compact: show just the number. full: show label too. */
  variant?: "compact" | "full" | "badge";
}

export default function CreditBalance({ variant = "compact" }: CreditBalanceProps) {
  const { balance, isLoading, loadError } = useCredits();

  if (loadError) {
    return <span className={styles.error}>—</span>;
  }

  if (isLoading || balance === null) {
    return <SkeletonBalance variant={variant} />;
  }

  if (variant === "badge") {
    return (
      <div className={styles.badge}>
        <span className={styles.badgeIcon}>⬡</span>
        <span className={styles.badgeAmount}>
          {balance.toLocaleString()}
        </span>
        <span className={styles.badgeLabel}>credits</span>
      </div>
    );
  }

  if (variant === "full") {
    return (
      <div className={styles.full}>
        <div className={styles.fullAmount}>
          {balance.toLocaleString()}
        </div>
        <div className={styles.fullLabel}>credits</div>
      </div>
    );
  }

  // Compact (default)
  return (
    <span className={styles.compact}>
      ⬡ {balance.toLocaleString()}
    </span>
  );
}

function SkeletonBalance({ variant }: { variant: string }) {
  return (
    <div
      className={`${styles.skeleton} ${
        variant === "full" ? styles.skeletonFull : styles.skeletonCompact
      }`}
    />
  );
}