"use client";

import { useState } from "react";
import { useUserStore } from "../store/useUserStore";
import { CREDIT_TO_SOL } from "../services/escrowService";
import styles from "./RealModeToggle.module.css";

export default function RealModeToggle() {
  const user = useUserStore((s) => s.user);
  const toggleRealMode = useUserStore((s) => s.toggleRealMode);
  const [showInfo, setShowInfo] = useState(false);

  if (!user) return null;

  const isOn = user.realMode;

  function handleToggle() {
    toggleRealMode();
  }

  return (
    <div className={`${styles.card} ${isOn ? styles.active : ""}`}>
      {/* Header row */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.icon}>
            {isOn ? "⚡" : "🔒"}
          </div>
          <div>
            <div className={styles.title}>
              Real Commitment{" "}
              <span className={styles.betaBadge}>BETA</span>
            </div>
            <div className={styles.subtitle}>
              {isOn ? "Secured by blockchain ⚡" : "Credits only (recommended)"}
            </div>
          </div>
        </div>

        {/* Toggle Switch */}
        <button
          onClick={handleToggle}
          className={`${styles.toggle} ${isOn ? styles.toggleOn : ""}`}
        >
          <div className={styles.toggleKnob} />
        </button>
      </div>

      {/* Expanded Info when ON */}
      {isOn && (
        <div className={styles.infoSection}>
          <div className={styles.infoRows}>
            <InfoRow
              icon="🔐"
              label="Your commitments are backed by value"
              sub="Secured automatically — no action needed"
            />
            <InfoRow
              icon="⚡"
              label={`10 credits = ${(10 * CREDIT_TO_SOL).toFixed(4)} SOL`}
              sub="Automatic conversion behind the scenes"
            />
            <InfoRow
              icon="✓"
              label="Complete plans to get credits back"
              sub="Stake returned + bonus on success"
            />
          </div>

          <button
            onClick={() => setShowInfo(!showInfo)}
            className={styles.detailsButton}
          >
            {showInfo ? "Hide details" : "How does this work?"}
          </button>

          {showInfo && (
            <div className={styles.expandedInfo}>
              When Real Commitment is on, your credits are also locked as value when you join or create a plan. If you follow through, everything comes back — plus a bonus. If you miss the deadline, it&apos;s gone. This makes your commitment more meaningful, without any extra steps on your end.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InfoRow({ icon, label, sub }: { icon: string; label: string; sub: string }) {
  return (
    <div className={styles.infoRow}>
      <span className={styles.infoIcon}>{icon}</span>
      <div>
        <div className={styles.infoLabel}>{label}</div>
        <div className={styles.infoSub}>{sub}</div>
      </div>
    </div>
  );
}