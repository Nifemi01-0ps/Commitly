"use client";

import { useMemo } from "react";
import styles from "../../styles/ActivityPage.module.css";

import {
  useActivityStore,
  ActivityEvent,
  ActivityType,
} from "@/store/useActivityStore";

import { PageHeader, EmptyState } from "@/components/ui";
import BottomNav from "@/components/BottomNav";

// ─── Time formatting ─────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);

  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;

  return `${d}d ago`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === now.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";

  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

// ─── Event renderers ────

const EVENT_CONFIG: Record<
  ActivityType,
  {
    icon: string;
    color: string;
    bg: string;
    text: (e: ActivityEvent) => string;
  }
> = {
  complete: {
    icon: "✓",
    color: "var(--green)",
    bg: "var(--green-soft)",
    text: (e) => `completed ${e.planTitle}`,
  },

  fail: {
    icon: "✗",
    color: "var(--red)",
    bg: "var(--red-soft)",
    text: (e) => `missed ${e.planTitle}`,
  },

  join: {
    icon: "👋",
    color: "var(--brand)",
    bg: "var(--brand-soft)",
    text: (e) =>
      e.meta?.participantCount
        ? `joined ${e.planTitle} · ${e.meta.participantCount} people in`
        : `joined ${e.planTitle}`,
  },

  create: {
    icon: "+",
    color: "#0891B2",
    bg: "#DBEAFE",
    text: (e) => `created ${e.planTitle}`,
  },

  award: {
    icon: "⬡",
    color: "#D97706",
    bg: "#FEF3C7",
    text: (e) =>
      e.meta?.creditDelta
        ? `earned +${e.meta.creditDelta} credits`
        : `earned credits`,
  },

  streak: {
    icon: "🔥",
    color: "#D97706",
    bg: "#FEF3C7",
    text: (e) => `hit a ${e.meta?.streakCount ?? ""}-day streak`,
  },
};

function EventItem({
  event,
  isNew,
}: {
  event: ActivityEvent;
  isNew?: boolean;
}) {
  const cfg = EVENT_CONFIG[event.type];

  const isMe = event.userId === "me";
  const name = isMe ? "You" : event.userInitials;

  return (
    <div
      className={`${styles.eventItem} ${isNew ? styles.newItem : ""}`}
    >
      {/* User avatar */}
      <div
        className={styles.avatar}
        style={{ background: event.userColor }}
      >
        {event.userInitials}

        {/* Event badge */}
        <div
          className={styles.eventBadge}
          style={{
            background: cfg.bg,
            color: cfg.color,
          }}
        >
          {cfg.icon}
        </div>
      </div>

      {/* Content */}
      <div className={styles.content}>
        <div className={styles.text}>
          <strong className={styles.name}>{name}</strong>{" "}
          <span className={styles.message}>{cfg.text(event)}</span>
        </div>

        {/* Credit pill */}
        {event.meta?.creditDelta !== undefined && (
          <div className={styles.creditWrapper}>
            <span
              className={styles.creditPill}
              style={{
                background:
                  event.meta.creditDelta > 0
                    ? "var(--green-soft)"
                    : "var(--red-soft)",

                color:
                  event.meta.creditDelta > 0
                    ? "var(--green)"
                    : "var(--red)",
              }}
            >
              {event.meta.creditDelta > 0 ? "+" : ""}
              {event.meta.creditDelta} credits
            </span>
          </div>
        )}
      </div>

      {/* Time */}
      <div className={styles.time}>
        {timeAgo(event.timestamp)}
      </div>
    </div>
  );
}

// ─── Group events by day ────

function groupByDay(
  events: ActivityEvent[]
): Array<{ label: string; events: ActivityEvent[] }> {
  const groups = new Map<string, ActivityEvent[]>();

  events.forEach((e) => {
    const label = formatDate(e.timestamp);

    if (!groups.has(label)) groups.set(label, []);

    groups.get(label)!.push(e);
  });

  return Array.from(groups.entries()).map(([label, events]) => ({
    label,
    events,
  }));
}

// ─── Page ────

export default function ActivityPage() {
  const events = useActivityStore((s) => s.events);

  const groups = useMemo(() => groupByDay(events), [events]);

  return (
    <div className={styles.page}>
      <PageHeader title="Activity" backHref="/" />

      {events.length === 0 ? (
        <div className={styles.emptyWrapper}>
          <EmptyState
            icon="⚡"
            title="No activity yet"
            description="Complete plans and join groups to see your activity here."
            action={{
              label: "Create a plan",
              href: "/create",
            }}
          />
        </div>
      ) : (
        <div className={styles.listWrapper}>
          {groups.map((group) => (
            <div key={group.label}>
              {/* Day separator */}
              <div className={styles.dayHeader}>
                <span className={styles.dayLabel}>
                  {group.label}
                </span>

                <div className={styles.dayLine} />
              </div>

              {group.events.map((event, i) => (
                <EventItem
                  key={event.id}
                  event={event}
                  isNew={i === 0 && group.label === "Today"}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      <BottomNav />
    </div>
  );
}