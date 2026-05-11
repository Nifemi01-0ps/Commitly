"use client";

import { useState, Suspense, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { usePlansStore, PlanType, ProofType } from "../../store/usePlansStore";
import { useUserStore } from "../../store/useUserStore";
import { useActivityStore } from "../../store/useActivityStore";
import { useNotifStore } from "../../store/useNotifStore";
import { minDeadline } from "../../lib/utils";
import styles from "../../styles/CreatePage.module.css";

const CREDIT_PRESETS = [5, 10, 20, 50];

// ─── Smart deadline presets ───
function getDeadlinePresets() {
  const now = new Date();
  const eod = new Date(); eod.setHours(23, 59, 0, 0);
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); tomorrow.setHours(9, 0, 0, 0);
  const in1h = new Date(Date.now() + 120 * 60000);
  const in3h = new Date(Date.now() + 4 * 60 * 60000);

  return [
    { label: "1h", value: in1h },
    { label: "3h", value: in3h },
    { label: "EOD", value: eod },
    { label: "9am tomorrow", value: tomorrow },
  ];
}

function CreateForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const addPlan = usePlansStore((s) => s.addPlan);
  const user = useUserStore((s) => s.user);
  const deductCredits = useUserStore((s) => s.deductCredits);
  const pushActivity = useActivityStore((s) => s.push);
  const pushNotif = useNotifStore((s) => s.push);

  const defaultType = (searchParams.get("type") as PlanType) || "solo";
  const titleRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [deadline, setDeadline] = useState("");
  const [type, setType] = useState<PlanType>(defaultType);
  const [proofType, setProofType] = useState<ProofType>("self");
  const [stake, setStake] = useState(10);
  const [titleError, setTitleError] = useState("");
  const [deadError, setDeadError] = useState("");
  const [stakeError, setStakeError] = useState("");
  const [step, setStep] = useState<"form" | "success">("form");
  const [submitting, setSubmitting] = useState(false);

  const userCredits = user?.credits ?? 100;
  const bonus = Math.floor(stake * 0.2);
  const pct = Math.min(100, Math.round((stake / Math.max(userCredits, 1)) * 100));
  const charLeft = 80 - title.length;

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  function validateAll() {
    let ok = true;
    if (!title.trim()) { setTitleError("What's your plan?"); ok = false; }
    else if (title.length > 80) { setTitleError("Too long — keep it under 80 chars"); ok = false; }
    else setTitleError("");

    if (!deadline) { setDeadError("Pick a deadline"); ok = false; }
    else if (new Date(deadline) <= new Date()) { setDeadError("Must be in the future"); ok = false; }
    else setDeadError("");

    if (stake < 1) { setStakeError("Minimum 1 credit"); ok = false; }
    else if (stake > userCredits) { setStakeError(`You only have ${userCredits} credits`); ok = false; }
    else setStakeError("");

    return ok;
  }

  function applyPreset(d: Date) {
    setDeadline(d.toISOString().slice(0, 16));
    setDeadError("");
  }

  function handleSubmit() {
    if (!validateAll() || submitting) return;
    setSubmitting(true);

    const ok = deductCredits(stake);
    if (!ok) {
      setStakeError("Not enough credits");
      setSubmitting(false);
      return;
    }

    const plan = addPlan({
      title: title.trim(),
      deadline: new Date(deadline).toISOString(),
      type,
      proofType,
      stakeAmount: stake
    });

    if (user) {
      pushActivity({
        type: "create",
        userId: "me",
        userInitials: user.initials,
        userColor: user.color,
        planTitle: plan.title,
        planId: plan.id,
        timestamp: new Date().toISOString()
      });
      pushNotif({
        type: "plan_starting",
        message: `"${plan.title}" is set — don't miss it!`,
        planId: plan.id,
        timestamp: new Date().toISOString()
      });
    }

    setSubmitting(false);
    setStep("success");
    setTimeout(() => router.push("/"), 1800);
  }

  // Success Screen
  if (step === "success") {
    return (
      <div className={styles.successScreen}>
        <div className={styles.successEmoji}>🚀</div>
        <div className={styles.successTitle}>Plan created!</div>
        <div className={styles.successDesc}>
          <strong>{stake} credits</strong> committed. Complete it and earn{" "}
          <strong className={styles.bonus}>+{bonus}</strong> bonus.
        </div>
        <div className={styles.creditsRemaining}>
          ⬡ {userCredits - stake} credits remaining
        </div>
      </div>
    );
  }

  const presets = getDeadlinePresets();

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <Link href="/" className={styles.backButton}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className={styles.headerTitle}>New Plan</div>
        <div className={styles.spacer} />
      </div>

      <div className={styles.container}>
        {/* Title */}
        <div className={styles.section}>
          <label className={styles.label}>
            What&apos;s your plan? <span className={styles.required}>*</span>
          </label>
          <div className={styles.inputWrapper}>
            <input
              ref={titleRef}
              type="text"
              placeholder="e.g. Upload YouTube video by 5PM"
              value={title}
              maxLength={80}
              onChange={(e) => { setTitle(e.target.value); if (titleError) setTitleError(""); }}
              onBlur={() => { if (!title.trim()) setTitleError("What's your plan?"); }}
              className={`${styles.input} ${titleError ? styles.error : title ? styles.active : ""}`}
            />
            {title.length > 50 && (
              <span className={`${styles.charCount} ${charLeft < 10 ? styles.danger : ""}`}>
                {charLeft}
              </span>
            )}
          </div>
          {title.length > 0 && (
            <div className={styles.progressBar}>
              <div
                className={styles.progress}
                style={{
                  width: `${(title.length / 80) * 100}%`,
                  background: charLeft < 10 ? "var(--red)" : "var(--brand)"
                }}
              />
            </div>
          )}
          {titleError && <p className={styles.errorText}>{titleError}</p>}
        </div>

        {/* Deadline */}
        <div className={styles.section}>
          <label className={styles.label}>
            Deadline <span className={styles.required}>*</span>
          </label>
          <div className={styles.presetButtons}>
            {presets.map((p) => {
              const isActive = deadline === p.value.toISOString().slice(0, 16);
              return (
                <button
                  key={p.label}
                  onClick={() => applyPreset(p.value)}
                  className={`${styles.presetBtn} ${isActive ? styles.active : ""}`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
          <input
            type="datetime-local"
            min={minDeadline()}
            value={deadline}
            onChange={(e) => { setDeadline(e.target.value); setDeadError(""); }}
            className={`${styles.input} ${deadError ? styles.error : deadline ? styles.active : ""}`}
          />
          {deadError && <p className={styles.errorText}>{deadError}</p>}
        </div>

        {/* Plan Type */}
        <div className={styles.section}>
          <label className={styles.label}>Plan type</label>
          <div className={styles.typeGrid}>
            {[
              { value: "solo" as PlanType, icon: "🎯", label: "Solo Task", desc: "Just you" },
              { value: "group" as PlanType, icon: "👥", label: "Group Plan", desc: "With others" },
            ].map((opt) => {
              const sel = type === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setType(opt.value)}
                  className={`${styles.typeCard} ${sel ? styles.selected : ""}`}
                >
                  <div className={styles.typeIcon}>{opt.icon}</div>
                  <div className={styles.typeLabel}>{opt.label}</div>
                  <div className={styles.typeDesc}>{opt.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Credits */}
        <div className={styles.section}>
          <div className={styles.creditsHeader}>
            <div className={styles.label}>Commit credits</div>
            <div>Balance: <strong className={stake > userCredits ? styles.danger : ""}>{userCredits}</strong></div>
          </div>

          <div className={`${styles.creditInputCard} ${stakeError ? styles.error : ""}`}>
            <div className={styles.creditInputRow}>
              <span className={styles.creditIcon}>⬡</span>
              <input
                type="number"
                min={1}
                max={userCredits}
                value={stake}
                onChange={(e) => { setStake(Math.max(1, parseInt(e.target.value) || 1)); setStakeError(""); }}
                className={styles.creditNumberInput}
              />
              <span className={styles.creditsLabel}>credits</span>
            </div>

            <div className={styles.progressBar}>
              <div
                className={styles.progress}
                style={{
                  width: `${pct}%`,
                  background: pct > 80 ? "var(--red)" : pct > 50 ? "var(--amber)" : "var(--brand)"
                }}
              />
            </div>

            <div className={styles.creditFooter}>
              <span>{pct}% of balance</span>
              <span className={styles.bonus}>+{bonus} credits on success</span>
            </div>
          </div>

          <div className={styles.presetChips}>
            {CREDIT_PRESETS.map((p) => {
              const affordable = p <= userCredits;
              const sel = stake === p;
              return (
                <button
                  key={p}
                  disabled={!affordable}
                  onClick={() => { setStake(p); setStakeError(""); }}
                  className={`${styles.chip} ${sel ? styles.chipSelected : ""}`}
                >
                  {p}
                </button>
              );
            })}
          </div>

          {stakeError && <p className={styles.errorText}>{stakeError}</p>}

          <p className={styles.helperText}>
            Credits are returned if you follow through.{" "}
            <span className={styles.warning}>Lost if you miss the deadline.</span>
          </p>
        </div>

        {/* Proof Type */}
        <div className={styles.section}>
          <label className={styles.label}>How will you prove it?</label>
          <div className={styles.proofOptions}>
            {[
              { value: "self" as ProofType, icon: "✅", label: "Self-confirm", desc: "Mark done yourself" },
              { value: "link" as ProofType, icon: "🔗", label: "Share a link", desc: "Submit a URL" },
              { value: "image" as ProofType, icon: "📷", label: "Upload photo", desc: "Photo evidence" },
            ].map((opt) => {
              const sel = proofType === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setProofType(opt.value)}
                  className={`${styles.proofCard} ${sel ? styles.selected : ""}`}
                >
                  <div className={`${styles.proofIcon} ${sel ? styles.proofIconActive : ""}`}>
                    {opt.icon}
                  </div>
                  <div className={styles.proofContent}>
                    <div className={styles.proofLabel}>{opt.label}</div>
                    <div className={styles.proofDesc}>{opt.desc}</div>
                  </div>
                  <div className={`${styles.checkCircle} ${sel ? styles.checkActive : ""}`}>
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.5">
                      <polyline points="2 6 5 9 10 3" />
                    </svg>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Submit Button */}
        <div className={styles.submitSection}>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className={`${styles.submitButton} ${submitting ? styles.submitting : ""}`}
          >
            {submitting ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={styles.spinner}>
                  <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
                </svg>
                Creating…
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Create Plan · commit {stake} credits
              </>
            )}
          </button>
          <p className={styles.submitHelper}>Credits returned on success. Lost on failure.</p>
        </div>
      </div>
    </div>
  );
}

export default function CreatePage() {
  return (
    <Suspense fallback={<div className={styles.loading}>Loading…</div>}>
      <CreateForm />
    </Suspense>
  );
}