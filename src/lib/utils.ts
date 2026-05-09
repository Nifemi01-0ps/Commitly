// ─── Date & Time Utilities ──

export function formatDeadline(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function timeUntil(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff < 0) return "Deadline passed";

  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);

  if (days > 0) return `${days}d ${hours}h remaining`;
  if (hours > 0) return `${hours}h ${minutes}m remaining`;
  return `${minutes}m remaining`;
}

export function isPast(iso: string): boolean {
  return new Date(iso).getTime() < Date.now();
}

export function minDeadline(offsetMinutes = 5): string {
  const date = new Date(Date.now() + offsetMinutes * 60 * 1000);
  return date.toISOString().slice(0, 16); // Returns YYYY-MM-DDTHH:mm
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

// ─── Status Helpers ───

export const STATUS_BADGE = {
  live:      { label: "🔥 Live",    bg: "#FEF3C7", color: "#B45309" },
  upcoming:  { label: "Upcoming",   bg: "#DBEAFE", color: "#1D4ED8" },
  completed: { label: "✓ Done",     bg: "#DCFCE7", color: "#15803D" },
  failed:    { label: "Missed",     bg: "#FEE2E2", color: "#B91C1C" },
} as const;

// ─── ID Generation ───

export function genId(prefix = "id"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Plan Status Derivation ────

import type { Plan, PlanStatus } from "@/store/usePlansStore";

export function deriveStatus(plan: Plan): PlanStatus {
  // Terminal states should never be overridden
  if (plan.status === "completed" || plan.status === "failed") {
    return plan.status;
  }

  const now = Date.now();
  const deadline = new Date(plan.deadline).getTime();

  if (deadline < now) {
    const userIsParticipant = plan.participants.some((p) => p.id === "me");
    return userIsParticipant ? "failed" : "completed";
  }

  // Live if within 30 minutes of deadline
  if (deadline - now < 30 * 60 * 1000) {
    return "live";
  }

  return "upcoming";
}

/**
 * Returns a new array with up-to-date statuses derived from current time.
 * Call this whenever you read plans from the store for display.
 */
export function withDerivedStatuses(plans: Plan[]): Plan[] {
  return plans.map((plan) => {
    const derivedStatus = deriveStatus(plan);
    return derivedStatus === plan.status 
      ? plan 
      : { ...plan, status: derivedStatus };
  });
}