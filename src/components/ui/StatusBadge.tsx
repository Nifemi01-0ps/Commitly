import { STATUS_BADGE } from "../../lib/utils";
import type { Plan } from "../../store/usePlansStore";
import styles from "./StatusBadge.module.css";

interface StatusBadgeProps {
  status: Plan["status"];
  size?: "sm" | "md";
}

export default function StatusBadge({ status, size = "sm" }: StatusBadgeProps) {
  const badge = STATUS_BADGE[status];

  return (
    <span
      className={`${styles.badge} ${size === "sm" ? styles.sm : styles.md}`}
      style={{
        backgroundColor: badge.bg,
        color: badge.color,
      }}
    >
      {badge.label}
    </span>
  );
}