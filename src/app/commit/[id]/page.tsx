"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { usePlansStore } from "../../../store/usePlansStore";
import { PageHeader, Button, StatusBadge, EmptyState, ProofBadge } from "../../../components/ui";
import BottomNav from "../../../components/BottomNav";
import JoinPoolButton from "../../../components/JoinPoolButton";
import { formatDeadline, timeUntil, isPast } from "../../../lib/utils";

// ─── Types ───

type JoinState = "idle" | "joining" | "joined";

// ─── Page ──────

export default function CommitDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id }     = use(params);
  const plans      = usePlansStore((s) => s.plans);
  const joinPlan   = usePlansStore((s) => s.joinPlan);

  const [joinState, setJoinState] = useState<JoinState>("idle");
  const [copied,    setCopied]    = useState(false);
  const [, setTick] = useState(0); // forces re-render every second for countdown

  // Live countdown tick
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const plan = plans.find((p) => p.id === id);

  // ── Not found ─────
  if (!plan) {
    return (
      <div style={{ padding: "60px 20px" }}>
        <EmptyState
          icon="🔍"
          title="Plan not found"
          description="This plan may have been removed or the link is invalid."
          action={{ label: "Back to home", href: "/" }}
        />
      </div>
    );
  }

  // ── Derived state ────
  const hasJoined   = plan.participants.some((p) => p.id === "me");
  const isTerminal  = plan.status === "completed" || plan.status === "failed";
  const isActive    = !isTerminal;
  const deadlinePast = isPast(plan.deadline);

  // Sync join state with store (e.g. after rehydration)
  // If they're already a participant but joinState is idle, that's fine — button will show "Joined ✓"

  // ── Handlers ────
  function handleJoin() {
    if (!plan || hasJoined || plan.type === "solo") return;
    setJoinState("joining");
    joinPlan(plan.id, { id: "me", initials: "DA", color: "#4F46E5", stake: plan.stakeAmount });
    setTimeout(() => setJoinState("joined"), 600);
  }

  function handleCopy() {
    if (!plan) return;
    navigator.clipboard?.writeText(`commitly.app/commit/${plan.id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const PROOF_LABEL: Record<string, string> = {
    self:  "Self-confirm",
    link:  "Share a link",
    image: "Upload image",
  };

  return (
    <div style={{ paddingBottom: 100 }}>
      <PageHeader
        title={plan.title}
        backHref="/"
        right={<StatusBadge status={plan.status} size="md" />}
      />

      <div style={{ padding: "20px 20px", display: "flex", flexDirection: "column", gap: 14 }}>

        {/* ── Countdown banner (only for active, non-past plans) ─────────── */}
        {isActive && !deadlinePast && (
          <CountdownBanner deadline={plan.deadline} status={plan.status} />
        )}

        {/* ── Missed banner ─────────────────────────────────────────────── */}
        {plan.status === "failed" && (
          <div style={{ background: "var(--red-soft)", border: "1px solid rgba(220,38,38,0.2)", borderRadius: "var(--radius)", padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 22 }}>😔</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--red)", marginBottom: 2 }}>This plan was missed</div>
              <div style={{ fontSize: 13, color: "#991B1B" }}>Your reliability score dropped by 2 points</div>
            </div>
          </div>
        )}

        {/* ── Info card ─────────────────────────────────────────────────── */}
        <div style={card}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <MetaRow icon="📅" label="Deadline"   value={formatDeadline(plan.deadline)} />
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
            {/* Credit commitment info */}
            <div style={{ paddingTop: 4, borderTop: "1px solid var(--border)" }}>
              <CreditPoolRow plan={plan} />
            </div>
          </div>
        </div>

        {/* ── Participants ────*/}
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 15, fontWeight: 600 }}>
              {plan.participants.length === 0
                ? "No one joined yet"
                : `${plan.participants.length} ${plan.participants.length === 1 ? "person" : "people"} joined`}
            </div>
            {plan.participants.length > 0 && (
              <span style={{ fontSize: 12, color: "var(--muted)" }}>
                {plan.participants.filter((p) => p.id !== "me").length > 0
                  ? `+${plan.participants.filter((p) => p.id !== "me").length} others`
                  : "Just you"}
              </span>
            )}
          </div>

          {plan.participants.length === 0 ? (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>👀</div>
              <div style={{ fontSize: 14, color: "var(--muted)" }}>
                Be the first to join this plan
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
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

          {/* Share row */}
          <div style={{ paddingTop: 14, borderTop: "1px solid var(--border)" }}>
            <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Invite link
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ flex: 1, padding: "10px 12px", background: "#F8F9FB", borderRadius: 10, border: "1px solid var(--border)", fontSize: 13, color: "var(--muted)", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                commitly.app/commit/{plan.id}
              </div>
              <button
                onClick={handleCopy}
                style={{ padding: "10px 16px", borderRadius: 10, background: copied ? "var(--green)" : "var(--brand)", color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", flexShrink: 0, transition: "background 0.25s", fontFamily: "'DM Sans',sans-serif", minWidth: 72 }}
              >
                {copied ? "✓ Copied" : "Copy"}
              </button>
            </div>
          </div>
        </div>

        {/* ── Proof card (if submitted) ──────────────────────────────────── */}
        {plan.proof && (
          <div style={{ background: "var(--green-soft)", border: "1px solid rgba(22,163,74,0.2)", borderRadius: "var(--radius)", padding: 18 }}>
            <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 14, fontWeight: 600, color: "var(--green)", marginBottom: 6 }}>
              ✓ Proof submitted
            </div>
            <div style={{ fontSize: 14, color: "#166534" }}>{plan.proof}</div>
          </div>
        )}

        {/* ── Action zone ─── */}
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

// ─── Sub-components ────────────────────────────────────────────────────────────

function CountdownBanner({ deadline, status }: { deadline: string; status: string }) {
  const diff = new Date(deadline).getTime() - Date.now();
  const isLive = status === "live";

  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);

  const display = h > 0
    ? `${h}h ${m}m remaining`
    : m > 0
    ? `${m}m ${s}s remaining`
    : `${s}s remaining`;

  return (
    <div
      style={{
        background: isLive
          ? "linear-gradient(135deg,#4F46E5 0%,#7C3AED 100%)"
          : "var(--card)",
        border: isLive ? "none" : "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "16px 20px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        boxShadow: isLive ? "0 4px 20px rgba(79,70,229,0.25)" : "var(--shadow)",
      }}
    >
      <div
        style={{
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: isLive ? "#FCD34D" : "var(--brand)",
          flexShrink: 0,
          animation: isLive ? "livePulse 1.4s ease-in-out infinite" : undefined,
        }}
      />
      <div>
        <div style={{ fontSize: 12, color: isLive ? "rgba(255,255,255,0.7)" : "var(--muted)", fontWeight: 500, marginBottom: 2 }}>
          {isLive ? "Happening now" : "Coming up"}
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: isLive ? "#fff" : "var(--text)", fontFamily: "'Bricolage Grotesque',sans-serif" }}>
          {display}
        </div>
      </div>
      <style>{`@keyframes livePulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.55;transform:scale(1.35)}}`}</style>
    </div>
  );
}

function ParticipantRow({
  participant,
  isMe,
  proofEntry,
}: {
  participant: { id: string; initials: string; color: string };
  isMe: boolean;
  proofEntry?: { proofType: "self" | "image" | "link" } | null;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 12px",
        borderRadius: 12,
        background: isMe ? "var(--brand-soft)" : "#F8F9FB",
        border: `1px solid ${isMe ? "rgba(79,70,229,0.15)" : "transparent"}`,
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: participant.color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          fontWeight: 700,
          color: "#fff",
          flexShrink: 0,
        }}
      >
        {participant.initials}
      </div>

      {/* Name + proof type */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: proofEntry ? 3 : 0 }}>
          {isMe ? "You" : participant.initials}
        </div>
        {proofEntry && (
          <ProofBadge proofType={proofEntry.proofType} variant="compact" />
        )}
        {!proofEntry && (
          <span style={{ fontSize: 11, color: "var(--muted)" }}>No proof yet</span>
        )}
      </div>

      {/* You badge or completion status */}
      {isMe && (
        <span style={{ fontSize: 11, background: "var(--brand)", color: "#fff", padding: "2px 10px", borderRadius: 20, fontWeight: 600, flexShrink: 0 }}>
          You
        </span>
      )}
    </div>
  );
}


import type { Plan } from "../../../store/usePlansStore";

function ActionZone({
  plan,
  hasJoined,
  joinState,
  isActive,
  onJoin,
}: {
  plan: Plan;
  hasJoined: boolean;
  joinState: JoinState;
  isActive: boolean;
  onJoin: () => void;
}) {
  // Terminal — no actions
  if (!isActive) {
    if (plan.status === "completed") {
      return (
        <div style={{ textAlign: "center", padding: "8px 0" }}>
          <span style={{ fontSize: 13, color: "var(--muted)" }}>This plan has ended.</span>
          {" "}
          <Link href="/" style={{ fontSize: 13, color: "var(--brand)", fontWeight: 600, textDecoration: "none" }}>
            Create a new one →
          </Link>
        </div>
      );
    }
    return null;
  }

  // Already submitted proof
  if (plan.proof) {
    return (
      <div style={{ textAlign: "center", padding: "8px 0", fontSize: 14, color: "var(--muted)" }}>
        Proof submitted. Nothing more to do here! 🎉
      </div>
    );
  }

  // ── GROUP plan ─────────────────────────────────────────────────────────────
  if (plan.type === "group") {
    if (!hasJoined) {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <JoinPoolButton
            planId={plan.id}
            planTitle={plan.title}
            stakeAmount={plan.stakeAmount}
            onSuccess={onJoin}
          />
          <p style={{ textAlign: "center", fontSize: 12, color: "var(--muted)", margin: 0 }}>
            You can submit proof once you&apos;ve joined
          </p>
        </div>
      );
    }

    // Just joined — show confirmation before proof CTA
    if (joinState === "joined") {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div
            style={{
              background: "var(--green-soft)",
              border: "1px solid rgba(22,163,74,0.25)",
              borderRadius: "var(--radius)",
              padding: "14px 18px",
              display: "flex",
              alignItems: "center",
              gap: 10,
              animation: "fadeSlideIn 0.3s both",
            }}
          >
            <span style={{ fontSize: 22 }}>🎉</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--green)" }}>You&apos;re in!</div>
              <div style={{ fontSize: 13, color: "#166534" }}>Submit proof when you&apos;re done</div>
            </div>
          </div>
          <Link href={`/proof/${plan.id}`} style={{ textDecoration: "none" }}>
            <Button fullWidth variant="success" icon={<span>✅</span>}>
              Submit Proof
            </Button>
          </Link>
          <style>{`@keyframes fadeSlideIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
        </div>
      );
    }

    // Was already joined before this session
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 16px",
            background: "var(--brand-soft)",
            border: "1px solid rgba(79,70,229,0.2)",
            borderRadius: "var(--radius-sm)",
          }}
        >
          <span style={{ fontSize: 18 }}>✓</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--brand)" }}>
            Joined ✓
          </span>
        </div>
        <Link href={`/proof/${plan.id}`} style={{ textDecoration: "none" }}>
          <Button fullWidth variant="success" icon={<span>✅</span>}>
            Submit Proof
          </Button>
        </Link>
      </div>
    );
  }

  // ── SOLO plan ──────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <Link href={`/proof/${plan.id}`} style={{ textDecoration: "none" }}>
        <Button fullWidth variant="primary" icon={<span style={{ fontSize: 17 }}>✅</span>}>
          Mark as Complete
        </Button>
      </Link>
      <p style={{ textAlign: "center", fontSize: 12, color: "var(--muted)", margin: 0 }}>
        Submit your proof before the deadline to keep your reliability score
      </p>
    </div>
  );
}

// ─── Shared card style ─────────────────────────────────────────────────────────
const card: React.CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius)",
  padding: 20,
  boxShadow: "var(--shadow)",
};

function MetaRow({
  icon, label, value, valueColor,
}: {
  icon: string; label: string; value: string; valueColor?: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: "#F4F4F5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 1 }}>
          {label}
        </div>
        <div style={{ fontSize: 14, fontWeight: 500, color: valueColor || "var(--text)" }}>
          {value}
        </div>
      </div>
    </div>
  );
}

// ─── Credit pool display ───────────────────────────────────────────────────────

function CreditPoolRow({ plan }: { plan: Plan }) {
  const bonus = Math.floor(plan.stakeAmount * 0.2);

  if (plan.type === "solo") {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 15 }}>⬡</span>
          <div>
            <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em" }}>
              Credits committed
            </div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>
              {plan.stakeAmount} credits
            </div>
          </div>
        </div>
        <div style={{ textAlign: "right" as const }}>
          <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em" }}>
            Reward on success
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--green)" }}>
            +{plan.stakeAmount + bonus} back
          </div>
        </div>
      </div>
    );
  }

  // Group plan — show pool
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 15 }}>⬡</span>
          <div>
            <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em" }}>
              Per person
            </div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>
              {plan.stakeAmount} credits
            </div>
          </div>
        </div>
        <div style={{ textAlign: "right" as const }}>
          <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em" }}>
            Total pool
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--brand)" }}>
            {plan.creditPool} credits
          </div>
        </div>
      </div>
      {/* Pool bar */}
      <div style={{ height: 4, borderRadius: 4, background: "var(--border)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: "100%", background: "linear-gradient(90deg, var(--brand), #7C3AED)", borderRadius: 4 }} />
      </div>
      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 5 }}>
        Winners split the pool equally · {plan.participants.length > 0
          ? `${Math.floor(plan.creditPool / Math.max(plan.participants.length, 1))} credits each if all complete`
          : "join to see your share"}
      </div>
    </div>
  );
}
