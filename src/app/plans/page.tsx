"use client";

import { useState } from "react";
import { usePlansStore } from "../../store/usePlansStore";
import { PageHeader, EmptyState } from "../../components/ui";
import PlanCard from "../../components/PlanCard";
import BottomNav from "../../components/BottomNav";
import styles from "../../styles/PlansPage.module.css";

type Filter = "all" | "active" | "completed" | "failed";

const FILTERS: { label: string; value: Filter }[] = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Completed", value: "completed" },
  { label: "Missed", value: "failed" },
];

export default function PlansPage() {
  const plans = usePlansStore((s) => s.plans);
  const [filter, setFilter] = useState<Filter>("all");

  const myPlans = plans.filter((p) => p.participants.some((x) => x.id === "me"));

  const filtered = myPlans.filter((p) => {
    if (filter === "all") return true;
    if (filter === "active") return p.status === "upcoming" || p.status === "live";
    return p.status === filter;
  });

  return (
    <div className={styles.container}>
      <PageHeader title="My Plans" backHref="/" />

      {/* Filter tabs */}
      <div className={styles.filters}>
        {FILTERS.map((f) => {
          const count = myPlans.filter((p) => {
            if (f.value === "all") return true;
            if (f.value === "active")
              return p.status === "upcoming" || p.status === "live";
            return p.status === f.value;
          }).length;

          const selected = filter === f.value;

          return (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`${styles.filterButton} ${selected ? styles.active : ""}`}
            >
              {f.label}
              <span className={styles.badge}>{count}</span>
            </button>
          );
        })}
      </div>

      <div className={styles.content}>
        {filtered.length === 0 ? (
          <div className={styles.emptyWrapper}>
            <EmptyState
              icon={filter === "completed" ? "🏆" : filter === "failed" ? "😔" : "📋"}
              title={filter === "all" ? "No plans yet" : `No ${filter} plans`}
              description={filter === "all" ? "Create your first plan to get started." : undefined}
              action={filter === "all" ? { label: "+ Create plan", href: "/create" } : undefined}
            />
          </div>
        ) : (
          <div className={styles.planList}>
            {filtered.map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}