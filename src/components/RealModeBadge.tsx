"use client";

import { useUserStore } from "../store/useUserStore";
import styles from "./RealModeBadge.module.css";

interface RealModeBadgeProps {
  /* compact: just the ⚡ icon. full: icon + text */
  variant?: "compact" | "full";
  style?: React.CSSProperties;
}

export default function RealModeBadge({ variant = "full", style }: RealModeBadgeProps) {
  const realMode = useUserStore((s) => s.user?.realMode ?? false);

  if (!realMode) return null;

  if (variant === "compact") {
    return (
      <span
        title="Real commitment active"
        className={styles.compact}
        style={style}
      >
        ⚡
      </span>
    );
  }

  return (
    <div className={styles.full} style={style}>
      <span>⚡</span>
      Real commitment active
    </div>
  );
}