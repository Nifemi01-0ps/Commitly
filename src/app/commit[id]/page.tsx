"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { usePlansStore } from "@/store/usePlansStore";
import { PageHeader, Button, StatusBadge, EmptyState, ProofBadge } from "@/components/ui";
import BottomNav from "@/components/BottomNav";
import JoinPoolButton from "@/components/JoinPoolButton";
import { formatDeadline, timeUntil, isPast } from "@/lib/utils";
import styles from "../../styles/CommitDetailPage.module.css";

type JoinState = "idle" | "joining" | "joined";

export default function CommitDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const plans = usePlansStore((s) => s.plans);
  const joinPlan = usePlansStore((s) => s.joinPlan);

  const [joinState, setJoinState] = useState<JoinState>("idle");
  const [copied, setCopied] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const plan = plans.find((p) => p.id === id);

  if (!plan) {
    return (
      <div className={styles.notFound}>
        <EmptyState
          icon="🔍"
          title="Plan not found"
          description="This plan may have been removed or the link is invalid."
          action={{ label: "Back to home", href: "/" }}
        />
      </div>
    );
  }

  const hasJoined = plan.participants.some((p) => p.id === "me");
  const isTerminal = plan.status === "completed" || plan.status === "failed";
  const isActive = !isTerminal;
  const deadlinePast = isPast(plan.deadline);

  const handleJoin = () => {
    if (!plan || hasJoined || plan.type === "solo") return;
    setJoinState("joining");
    joinPlan(plan.id, { id: "me", initials: "DA", color: "#4F46E5", stake: plan.stakeAmount });
    setTimeout(() => setJoinState("joined"), 600);
  };

  const handleCopy = () => {
    if (!plan) return;
    navigator.clipboard?.writeText(`commitly.app/commit/${plan.id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const PROOF_LABEL: Record<string, string> = {
    self: "Self-confirm",
    link: "Share a link",
    image: "Upload image",
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title={plan.title}
        backHref="/"
        right={<StatusBadge status={plan.status} size="md" />}
      />

      <div className={styles.container}>
        {/* Countdown Banner */}
        {isActive && !deadlinePast && (
          <CountdownBanner deadline={plan.deadline} status={plan.status} />
        )}

        {/* Missed Banner */}
        {plan.status === "failed" && (
          <div className={styles.missedBanner}>
            <span className={styles.missedEmoji}>😔</span>
            <div>
              <div className={styles.missedTitle}>This plan was missed</div>
              <div className={styles.missedDesc}>Your reliability score dropped by 2 points</div>
            </div>
          </div>
        )}

        {/* Info Card */}
        <div className={styles.card}>
          <div className={styles.metaGrid}>
            <MetaRow icon="📅" label="Deadline" value={formatDeadline(plan.deadline)} />
            <MetaRow
              icon="⏱️"
              label="Status"
              value={timeUntil(plan.deadline)}
              valueColor={deadlinePast ? "var(--red)" : plan.status === "live" ? "var(--amber)" : undefined}
            />
            <MetaRow
              icon={plan.type === "solo" ? "🎯" : "👥"}
              label="Type"
              value={`${plan.type.charAt(0).toUpperCase() + plan.type.slice(1)} plan`}
            />
            <MetaRow icon="📋" label="Proof type" value={PROOF_LABEL[plan.proofType]} />

            <div className={styles.creditSection}>
              <CreditPoolRow plan={plan} />
            </div>
          </div>
        </div>

        {/* Participants Card */}
        <div className={styles.card}>
          <div className={styles.participantsHeader}>
            <div className={styles.participantsTitle}>
              {plan.participants.length === 0
                ? "No one joined yet"
                : `${plan.participants.length} ${plan.participants.length === 1 ? "person" : "people"} joined`}
            </div>
            {plan.participants.length > 0 && (
              <span className={styles.othersCount}>
                {plan.participants.filter((p) => p.id !== "me").length > 0
                  ? `+${plan.participants.filter((p) => p.id !== "me").length} others`
                  : "Just you"}
              </span>
            )}
          </div>

          {plan.participants.length === 0 ? (
            <div className={styles.emptyParticipants}>
              <div className={styles.emptyEmoji}>👀</div>
              <div>Be the first to join this plan</div>
            </div>
          ) : (
            <div className={styles.participantsList}>
              {plan.participants.map((p) => {
                const entry = plan.proofs.find((pr) => pr.userId === p.id) ?? null;
                return (
                  <ParticipantRow
                    key={p.id}
                    participant={p}
                    isMe={p.id === "me"}
                    proofEntry={entry}
                  />
                );
              })}
            </div>
          )}

          {/* Invite Link */}
          <div className={styles.inviteSection}>
            <div className={styles.inviteLabel}>Invite link</div>
            <div className={styles.inviteRow}>
              <div className={styles.inviteLink}>
                commitly.app/commit/{plan.id}
              </div>
              <button onClick={handleCopy} className={styles.copyButton}>
                {copied ? "✓ Copied" : "Copy"}
              </button>
            </div>
          </div>
        </div>

        {/* Proof Submitted */}
        {plan.proof && (
          <div className={styles.proofSubmitted}>
            <div className={styles.proofTitle}>✓ Proof submitted</div>
            <div className={styles.proofText}>{plan.proof}</div>
          </div>
        )}

        {/* Action Zone */}
        <ActionZone
          plan={plan}
          hasJoined={hasJoined}
          joinState={joinState}
          isActive={isActive}
          onJoin={handleJoin}
        />
      </div>

      <BottomNav />
    </div>
  );
}