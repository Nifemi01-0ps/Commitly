"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useNotifStore, Notification, NotifType } from "../store/useNotifStore";
import styles from "./NotificationBell.module.css";

// Config for notification types
const NOTIF_CONFIG: Record<NotifType, { icon: string; color: string; bg: string }> = {
  plan_starting:  { icon: "⏰", color: "var(--brand)", bg: "var(--brand-soft)" },
  proof_due:      { icon: "📋", color: "var(--amber)", bg: "var(--amber-soft)" },
  missed:         { icon: "✗",  color: "var(--red)",   bg: "var(--red-soft)" },
  credits_earned: { icon: "⬡",  color: "var(--green)", bg: "var(--green-soft)" },
  credits_lost:   { icon: "⬡",  color: "var(--red)",   bg: "var(--red-soft)" },
  joined:         { icon: "👋", color: "var(--brand)", bg: "var(--brand-soft)" },
  completed:      { icon: "✓",  color: "var(--green)", bg: "var(--green-soft)" },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);

  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const { notifications, unreadCount, markAllRead, dismiss } = useNotifStore();

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function handleOpen() {
    const next = !open;
    setOpen(next);
    if (next) markAllRead();
  }

  return (
    <div ref={panelRef} className={styles.container}>
      {/* Bell Button */}
      <button onClick={handleOpen} className={styles.bellButton}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {unreadCount > 0 && (
          <div className={styles.badge}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </div>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div className={styles.dropdown}>
          {/* Header */}
          <div className={styles.header}>
            <span className={styles.title}>Notifications</span>
            {notifications.length > 0 && (
              <button
                onClick={() => useNotifStore.getState().clearAll()}
                className={styles.clearButton}
              >
                Clear all
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className={styles.list}>
            {notifications.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>🔔</div>
                You&apos;re all caught up
              </div>
            ) : (
              notifications.map((notif) => (
                <NotifItem
                  key={notif.id}
                  notif={notif}
                  onDismiss={dismiss}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function NotifItem({ notif, onDismiss }: { notif: Notification; onDismiss: (id: string) => void }) {
  const cfg = NOTIF_CONFIG[notif.type];

  return (
    <div className={`${styles.notifItem} ${!notif.read ? styles.unread : ""}`}>
      {!notif.read && <div className={styles.unreadDot} />}

      <div className={styles.iconContainer} style={{ background: cfg.bg, color: cfg.color }}>
        {cfg.icon}
      </div>

      <div className={styles.content}>
        <div className={styles.message}>
          {notif.planId ? (
            <Link href={`/commit/${notif.planId}`} className={styles.link}>
              {notif.message}
            </Link>
          ) : (
            notif.message
          )}
        </div>
        <div className={styles.time}>{timeAgo(notif.timestamp)}</div>
      </div>

      <button onClick={() => onDismiss(notif.id)} className={styles.dismissButton}>
        ×
      </button>
    </div>
  );
}