"use client";

import { PROOF_LABELS, CONFIDENCE_LEVELS } from "../../store/useReliabilityStore";
import type { ProofType } from "../../store/useReliabilityStore";
import styles from "./ProofBadge.module.css";

interface ProofBadgeProps {
  proofType: ProofType;
  /** compact: just the badge. full: label + confidence pill */
  variant?: "compact" | "full";
}

export default function ProofBadge({ proofType, variant = "compact" }: ProofBadgeProps) {
  const conf = CONFIDENCE_LEVELS[proofType];
  const label = PROOF_LABELS[proofType];

  // Fallback in case of invalid proofType
  if (!conf || !label) {
    return <div className={styles.fallback}>Unknown Proof</div>;
  }

  if (variant === "full") {
    return (
      <div className={styles.fullContainer}>
        <span className={styles.label}>{label}</span>
        <span
          className={styles.confidencePill}
          style={{ backgroundColor: conf.bg, color: conf.color }}
        >
          {conf.icon} {conf.label}
        </span>
      </div>
    );
  }

  // Default compact variant
  return (
    <span
      className={styles.compactBadge}
      style={{ backgroundColor: conf.bg, color: conf.color }}
    >
      {conf.icon} {label}
    </span>
  );
}