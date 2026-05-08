"use client";

import Link from "next/link";
import { useUserStore } from "@/store/useUserStore";
import { useReliabilityStore } from "@/store/useReliabilityStore";
import { usePlansStore } from "@/store/usePlansStore";
import { Button, EmptyState } from "@/components/ui";
import BottomNav from "@/components/BottomNav";
import RealModeToggle from "@/components/RealModeToggle";
import BlockchainSettings from "@/components/BlockchainSettings";
import styles from "../stylesProfilePage.module.css";

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

const LEVEL_CONFIG = {
  High:   { color: "var(--green)",  bg: "var(--green-soft)",  label: "High",   icon: "🏆" },
  Medium: { color: "var(--amber)",  bg: "var(--amber-soft)",  label: "Medium", icon: "⚡" },
  Low:    { color: "var(--red)",    bg: "var(--red-soft)",    label: "Low",    icon: "⚠️" },
};

export default function ProfilePage() {
  const user = useUserStore((s) => s.user);
  const signOut = useUserStore((s) => s.signOut);
  const { score, completed, failed, history, getLevel, getPercentage } = useReliabilityStore();
  const plans = usePlansStore((s) => s.plans);

  const level = getLevel();
  const pct = getPercentage();
  const lvlConfig = LEVEL_CONFIG[level];
  const total = completed + failed;
  const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

  const myPlans = plans.filter((p) => p.participants.some((x) => x.id === "me"));
  const activePlans = myPlans.filter((p) => p.status === "upcoming" || p.status === "live");
  const completedPlans = myPlans.filter((p) => p.status === "completed");

  if (!user) {
    return (
      <div className={styles.notFound}>
        <EmptyState
          icon="👤"
          title="Not signed in"
          description="Create an account to track your reliability and credits."
          action={{ label: "Get started", href: "/" }}
        />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Hero Header */}
      <div className={styles.hero}>
        <div className={styles.decorCircle1} />
        <div className={styles.decorCircle2} />

        <div className={styles.userInfo}>
          <div className={styles.avatar} style={{ background: user.color }}>
            {user.initials}
          </div>
          <div>
            <div className={styles.userName}>{user.name}</div>
            <div className={styles.reliabilityBadge} style={{ background: lvlConfig.bg, color: lvlConfig.color }}>
              {lvlConfig.icon} {lvlConfig.label} Reliability
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className={styles.statsRow}>
          <StatPill label="Credits" value={user.credits.toLocaleString()} icon="⬡" light />
          <StatPill label="Reliability" value={`${score} pts`} icon="📊" light />
          <StatPill label="Streak" value={`${Math.min(completed, 7)}d`} icon="🔥" light />
        </div>
      </div>

      <div className={styles.container}>
        {/* Reliability Meter */}
        <div className={styles.card}>
          <div className={styles.meterHeader}>
            <div>Reliability score</div>
            <span className={styles.scoreValue} style={{ color: lvlConfig.color }}>
              {score}
            </span>
          </div>

          <div className={styles.progressBarContainer}>
            <div
              className={styles.progressBar}
              style={{
                width: `${pct}%`,
                background:
                  level === "High"
                    ? "linear-gradient(90deg, #16A34A, #4ADE80)"
                    : level === "Medium"
                    ? "linear-gradient(90deg, #D97706, #FBBF24)"
                    : "linear-gradient(90deg, #DC2626, #F87171)",
              }}
            />
          </div>

          <div className={styles.progressLabels}>
            <span>Low</span>
            <span style={{ color: lvlConfig.color, fontWeight: 600 }}>{level}</span>
            <span>High</span>
          </div>

          <div className={styles.statsGrid}>
            <StatBox label="Completed" value={completed} color="var(--green)" />
            <StatBox label="Missed" value={failed} color="var(--red)" />
            <StatBox label="Rate" value={`${rate}%`} color="var(--brand)" />
          </div>
        </div>

        {/* Active Plans */}
        {activePlans.length > 0 && (
          <div className={styles.card}>
            <div className={styles.sectionTitle}>
              Active plans ({activePlans.length})
            </div>
            <div className={styles.activePlansList}>
              {activePlans.slice(0, 3).map((plan) => (
                <Link key={plan.id} href={`/commit/${plan.id}`} className={styles.planLink}>
                  <div className={styles.planCard}>
                    <span className={styles.planIcon}>
                      {plan.type === "solo" ? "🎯" : "👥"}
                    </span>
                    <div className={styles.planTitle}>{plan.title}</div>
                    <span
                      className={`${styles.statusBadge} ${
                        plan.status === "live" ? styles.live : styles.upcoming
                      }`}
                    >
                      {plan.status === "live" ? "🔥 Live" : "Upcoming"}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Recent History */}
        <div className={styles.card}>
          <div className={styles.sectionTitle}>Recent history</div>

          {history.length === 0 ? (
            <div className={styles.emptyHistory}>
              Complete your first plan to see history here
            </div>
          ) : (
            <div className={styles.historyList}>
              {Array.from(new Map(history.map((e) => [e.id, e])).values())
                .slice(0, 8)
                .map((evt, i) => (
                  <div key={evt.id} className={styles.historyItem}>
                    <div
                      className={styles.historyIcon}
                      style={{
                        background: evt.type === "success" ? "var(--green-soft)" : "var(--red-soft)",
                      }}
                    >
                      {evt.type === "success" ? "✓" : "✗"}
                    </div>

                    <div className={styles.historyContent}>
                      <div className={styles.historyTitle}>{evt.planTitle}</div>
                      <div className={styles.historyMeta}>
                        Score after: {evt.scoreAfter} · {timeAgo(evt.timestamp)}
                      </div>
                    </div>

                    <span
                      className={styles.delta}
                      style={{ color: evt.delta > 0 ? "var(--green)" : "var(--red)" }}
                    >
                      {evt.delta > 0 ? "+" : ""}{evt.delta}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>

        <RealModeToggle />
        <BlockchainSettings />

        {/* Account Settings */}
        <div className={styles.card}>
          <div className={styles.sectionTitle}>Account</div>
          <div className={styles.settingsList}>
            <SettingsRow icon="📅" label="Member since" value={new Date(user.joinedAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })} />
            <SettingsRow icon="📋" label="Plans created" value={`${myPlans.length}`} />
            <SettingsRow icon="✓" label="Completed" value={`${completedPlans.length}`} />
          </div>

          <div className={styles.signOutSection}>
            <Button variant="secondary" fullWidth onClick={signOut}>
              Sign out
            </Button>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

// ─── Sub Components ─────

function StatPill({ label, value, icon, light }: { label: string; value: string; icon: string; light?: boolean }) {
  return (
    <div className={`${styles.statPill} ${light ? styles.statPillLight : ""}`}>
      <div className={styles.statIcon}>{icon}</div>
      <div className={styles.statValue}>{value}</div>
      <div className={styles.statLabel}>{label}</div>
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className={styles.statBox}>
      <div className={styles.statBoxValue} style={{ color }}>
        {value}
      </div>
      <div className={styles.statBoxLabel}>{label}</div>
    </div>
  );
}

function SettingsRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className={styles.settingsRow}>
      <span className={styles.settingsIcon}>{icon}</span>
      <span className={styles.settingsLabel}>{label}</span>
      <span className={styles.settingsValue}>{value}</span>
    </div>
  );
}