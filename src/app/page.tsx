"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePlansStore } from "../store/usePlansStore";
import { useReliabilityStore } from "../store/useReliabilityStore";
import { useUserStore } from "../store/useUserStore";
import PlanCard from "../components/PlanCard";
import BottomNav from "../components/BottomNav";
import NotificationBell from "../components/NotificationBell";
import RealModeBadge from "../components/RealModeBadge";
import { CreditBalance } from "../components/ui";
import styles from "../styles/Homepage.module.css";

const TICKER_ITEMS = [
  "12 plans completed today",
  "Ada just checked in to Morning Run",
  "3 plans going live in the next hour",
  "Tunde hit a 7-day streak 🔥",
  "Gym Squad hit 100% attendance",
  "Sarah earned +20 credits",
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function HomePage() {
  const plans = usePlansStore((s) => s.plans);
  const { score, completed } = useReliabilityStore();
  const user = useUserStore((s) => s.user);
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (mounted && !user) router.replace("/onboarding");
  }, [mounted, user, router]);

  if (!user) return null;

  const livePlans = plans.filter((p) => p.status === "live");
  const upcomingPlans = plans.filter((p) => p.status === "upcoming");
  const feedPlans = [...livePlans, ...upcomingPlans, ...plans.filter((p) => p.status === "completed")];
  const completedToday = plans.filter((p) => p.status === "completed").length;
  const reliabilityPct = Math.min(99, score * 8 + 10);
  const firstName = user?.name?.split(" ")[0] ?? "there";

  return (
    <div className={styles.page}>
      {/* Navigation */}
      <nav className={styles.nav}>
        <div className={styles.logo}>Commitly</div>
        <div className={styles.navActions}>
          <RealModeBadge variant="compact" />
          <CreditBalance variant="badge" />
          <NotificationBell />
          <Link href="/profile" className={styles.avatarLink}>
            <div 
              className={styles.avatar}
              style={{ background: user?.color ?? "linear-gradient(135deg,#818CF8,#4F46E5)" }}
            >
              {user?.initials ?? "DA"}
            </div>
          </Link>
        </div>
      </nav>

      <div className={styles.container}>
        {/* Hero */}
        <div className={`${styles.hero} ${mounted ? styles.mounted : ""}`}>
          <div className={styles.greeting}>
            {getGreeting()}, {firstName} 👋
          </div>
          <div className={styles.headline}>
            Plans that don&apos;t<br />
            <span>get cancelled.</span>
          </div>
        </div>

        {/* Stats */}
        <div className={`${styles.statsGrid} ${mounted ? styles.mounted : ""}`}>
          {[
            { value: livePlans.length + upcomingPlans.length, label: "Plans today", color: "var(--brand)" },
            { value: `${reliabilityPct}%`, label: "Reliability", color: "var(--green)" },
            { value: completed, label: "Completed", color: "var(--amber)" },
          ].map((s) => (
            <div key={s.label} className={styles.statCard}>
              <div className={styles.statValue} style={{ color: s.color }}>
                {s.value}
              </div>
              <div className={styles.statLabel}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className={`${styles.ctaRow} ${mounted ? styles.mounted : ""}`}>
          <Link href="/create" className={styles.createButtonLink}>
            <button className={styles.createButton}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Create Plan
            </button>
          </Link>
          <Link href="/plans" className={styles.myPlansLink}>
            My Plans
          </Link>
        </div>
      </div>

      {/* Ticker */}
      <div className={styles.ticker}>
        <div className={styles.tickerContent}>
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <span key={i} className={styles.tickerItem}>
              <span className={styles.tickerDot} />
              {item}
            </span>
          ))}
        </div>
      </div>

      <div className={styles.container}>
        {/* Quick Start */}
        <div className={styles.quickStart}>
          <div className={styles.sectionTitle}>Quick start</div>
          <div className={styles.quickGrid}>
            {[
              { icon: "🥇", label: "Solo Task", desc: "Your goal, your deadline", type: "solo" },
              { icon: "👥", label: "Group Plan", desc: "Show up together", type: "group" },
            ].map((item) => (
              <Link key={item.type} href={`/create?type=${item.type}`} className={styles.quickCard}>
                <div className={styles.quickIcon}>{item.icon}</div>
                <div className={styles.quickLabel}>{item.label}</div>
                <div className={styles.quickDesc}>{item.desc}</div>
              </Link>
            ))}
          </div>
        </div>

        {/* Live Banner */}
        {livePlans.length > 0 && (
          <div className={styles.liveBanner}>
            <div className={styles.liveDot} />
            <span>Happening now</span>
            <div className={styles.liveRight}>
              <span className={styles.liveCount}>{livePlans.length} active</span>
              <Link href="/activity" className={styles.viewLink}>View →</Link>
            </div>
          </div>
        )}

        {/* Plan Feed */}
        <div className={styles.feedSection}>
          <div className={styles.feedHeader}>
            <div className={styles.sectionTitle}>Plan feed</div>
            <Link href="/plans" className={styles.seeAll}>See all</Link>
          </div>

          {feedPlans.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>📋</div>
              <div className={styles.emptyTitle}>No plans yet</div>
              <div className={styles.emptyDesc}>Create your first plan to get started</div>
              <Link href="/create" className={styles.emptyCta}>+ Create Plan</Link>
            </div>
          ) : (
            <div className={styles.planList}>
              {feedPlans.slice(0, 5).map((plan, i) => (
                <PlanCard key={plan.id} plan={plan} index={i} />
              ))}
            </div>
          )}
        </div>

        {/* Social Proof */}
        {completedToday > 0 && (
          <div className={styles.socialProof}>
            <span className={styles.trophy}>🏆</span>
            <span>
              <strong>{completedToday} plans</strong> completed today across all users
            </span>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}