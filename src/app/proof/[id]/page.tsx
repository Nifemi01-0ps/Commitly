"use client";

import { use, useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePlansStore } from "../../../store/usePlansStore";
import { useReliabilityStore } from "../../../store/useReliabilityStore";
import { useUserStore } from "../../../store/useUserStore";
import { useActivityStore } from "../../../store/useActivityStore";
import { useRealMode } from "../../../hooks/useRealMode";
import { EmptyState } from "../../../components/ui";
import RealModeBadge from "../../../components/RealModeBadge";
import { isPast } from "../../../lib/utils";
import styles from "../../styles/ProofPage.module.css";

type SubmitState = "idle" | "submitting" | "success" | "missed";

// ─── Confetti ─────
function Confetti() {
  const pieces = Array.from({ length: 24 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    color: ["#4F46E5","#16A34A","#F59E0B","#EC4899","#06B6D4","#8B5CF6"][i % 6],
    delay: Math.random() * 0.6,
    size: 6 + Math.random() * 6,
  }));

  return (
    <div className={styles.confettiContainer}>
      {pieces.map((p) => (
        <div
          key={p.id}
          className={styles.confettiPiece}
          style={{
            left: `${p.x}%`,
            width: p.size,
            height: p.size,
            background: p.color,
            borderRadius: Math.random() > 0.5 ? "50%" : "2px",
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

export default function ProofPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const plans = usePlansStore((s) => s.plans);
  const submitProof = usePlansStore((s) => s.submitProof);
  const markFailed = usePlansStore((s) => s.markUserFailed);

  const recordSuccess = useReliabilityStore((s) => s.recordSuccess);
  const recordFailure = useReliabilityStore((s) => s.recordFailure);

  const addCredits = useUserStore((s) => s.addCredits);
  const recordProof = useUserStore((s) => s.recordProof);
  const getSelfRatio = useUserStore((s) => s.getSelfConfirmRatio);
  const user = useUserStore((s) => s.user);

  const pushActivity = useActivityStore((s) => s.push);
  const { isRealMode, releaseCommit, forfeitCommit, creditsToSolDisplay } = useRealMode();

  const [link, setLink] = useState("");
  const [linkError, setLinkError] = useState("");
  const [linkTouched, setLinkTouched] = useState(false);
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [creditDelta, setCreditDelta] = useState(0);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePrev, setImagePrev] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  const plan = plans.find((p) => p.id === id);

  if (!plan) {
    return (
      <div className={styles.notFound}>
        <EmptyState icon="🔍" title="Plan not found" action={{ label: "Go home", href: "/" }} />
      </div>
    );
  }

  const alreadySubmitted = plan.completedUsers.includes("me") || !!plan.proof;
  const deadlinePast = isPast(plan.deadline);

  if (alreadySubmitted && submitState === "idle") return <AlreadyDone planId={plan.id} />;
  if (deadlinePast && submitState === "idle") return <LatePage plan={plan} onAcknowledge={() => {
    markFailed(plan.id, "me");
    recordFailure(plan.title);
    setSubmitState("missed");
  }} />;

  if (submitState === "success") return <SuccessScreen creditDelta={creditDelta} planTitle={plan.title} onDone={() => router.push("/")} />;
  if (submitState === "missed") return <MissedScreen creditsLost={plan.stakeAmount} onDone={() => router.push("/")} />;

  // ── Submit Logic ───
  function doSubmit(content: string) {
    if (isPast(plan!.deadline)) {
      markFailed(plan!.id, "me");
      recordFailure(plan!.title);
      if (isRealMode) forfeitCommit(plan!.id);
      setSubmitState("missed");
      return;
    }

    setSubmitState("submitting");

    const pt = plan!.proofType;
    const ratio = getSelfRatio();

    submitProof(plan!.id, "me", content, pt);
    recordProof(pt);
    const gain = recordSuccess(plan!.title, pt, ratio);

    const stake = plan!.stakeAmount;
    const bonus = plan!.type === "solo" ? Math.floor(stake * 0.2) : 0;
    const payout = stake + bonus;

    addCredits(payout);
    setCreditDelta(payout);

    if (isRealMode) releaseCommit(plan!.id);

    if (user) {
      pushActivity({
        type: "complete",
        userId: "me",
        userInitials: user.initials,
        userColor: user.color,
        planTitle: plan!.title,
        planId: plan!.id,
        timestamp: new Date().toISOString(),
        meta: { creditDelta: payout },
      });
    }

    setTimeout(() => setSubmitState("success"), 500);
  }

  function validateLink(v: string) {
    if (!v.trim()) return "Paste your proof link here";
    if (!v.startsWith("http")) return "Start with https://";
    try { new URL(v); return ""; } catch { return "Doesn't look like a valid URL"; }
  }

  function handleLinkSubmit() {
    setLinkTouched(true);
    const err = validateLink(link);
    setLinkError(err);
    if (!err) doSubmit(link.trim());
  }

  function handleImageFile(file: File) {
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePrev(reader.result as string);
    reader.readAsDataURL(file);
  }

  const isSubmitting = submitState === "submitting";

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <Link href={`/commit/${plan.id}`} className={styles.backButton}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className={styles.headerTitle}>Submit Proof</div>
      </div>

      <div className={styles.container}>
        {/* Plan Context */}
        <div className={styles.planContext}>
          <div className={styles.contextLabel}>Completing</div>
          <div className={styles.planTitle}>{plan.title}</div>
          <div className={styles.stakeInfo}>
            ⬡ {plan.stakeAmount} credits at stake
            {plan.type === "solo" && <span> · +{Math.floor(plan.stakeAmount * 0.2)} bonus</span>}
            {isRealMode && creditsToSolDisplay(plan.stakeAmount) && (
              <span> · {creditsToSolDisplay(plan.stakeAmount)}</span>
            )}
          </div>
          <RealModeBadge />
        </div>

        {/* Self Confirm */}
        {plan.proofType === "self" && (
          <div className={styles.selfSection}>
            <h1 className={styles.sectionTitle}>Did you actually do it?</h1>
            <p className={styles.sectionDesc}>
              Be honest. Your reliability score is built on your word.
            </p>

            <div className={styles.buttonGroup}>
              <button
                onClick={() => doSubmit("Self-confirmed ✓")}
                disabled={isSubmitting}
                className={styles.primaryButton}
              >
                {isSubmitting ? (
                  <>Saving…</>
                ) : (
                  <>✅ Yes, I completed this</>
                )}
              </button>

              <Link href={`/commit/${plan.id}`} className={styles.secondaryLink}>
                Not yet — go back
              </Link>
            </div>
          </div>
        )}

        {/* Link Proof */}
        {plan.proofType === "link" && (
          <div className={styles.linkSection}>
            <h1 className={styles.sectionTitle}>Drop a link as proof</h1>
            <p className={styles.sectionDesc}>
              A live URL, video, or doc — something real.
            </p>

            <input
              type="url"
              placeholder="https://"
              value={link}
              autoFocus
              onChange={(e) => {
                setLink(e.target.value);
                if (linkTouched) setLinkError(validateLink(e.target.value));
              }}
              onBlur={() => { setLinkTouched(true); setLinkError(validateLink(link)); }}
              className={`${styles.input} ${linkError && linkTouched ? styles.error : link && !linkError ? styles.success : ""}`}
            />

            {linkError && linkTouched && <p className={styles.errorText}>{linkError}</p>}

            {link && !linkError && (
              <div className={styles.linkPreview}>
                🔗 {link}
              </div>
            )}

            <button
              onClick={handleLinkSubmit}
              disabled={isSubmitting || !link.trim()}
              className={styles.primaryButton}
            >
              {isSubmitting ? "Submitting…" : "🔗 Submit Link"}
            </button>
          </div>
        )}

        {/* Image Proof */}
        {plan.proofType === "image" && (
          <div className={styles.imageSection}>
            <h1 className={styles.sectionTitle}>Show us the proof</h1>
            <p className={styles.sectionDesc}>
              Upload a photo of your completed work.
            </p>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImageFile(f);
              }}
            />

            {!imagePrev ? (
              <div
                className={`${styles.uploadArea} ${dragOver ? styles.dragOver : ""}`}
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const f = e.dataTransfer.files[0];
                  if (f?.type.startsWith("image/")) handleImageFile(f);
                }}
              >
                <div className={styles.uploadIcon}>📷</div>
                <div>Tap to upload or drag a photo</div>
                <div className={styles.uploadHint}>PNG, JPG, WEBP — up to 10MB</div>
              </div>
            ) : (
              <div className={styles.imagePreviewContainer}>
                <div className={styles.imagePreview}>
                  <img src={imagePrev} alt="Proof preview" />
                  <button
                    onClick={() => { setImageFile(null); setImagePrev(null); }}
                    className={styles.removeImageBtn}
                  >
                    Remove
                  </button>
                </div>
                <div className={styles.imageName}>✓ {imageFile?.name}</div>
              </div>
            )}

            <button
              onClick={() => doSubmit(`Photo: ${imageFile?.name ?? "uploaded"}`)}
              disabled={!imagePrev || isSubmitting}
              className={styles.primaryButton}
            >
              {isSubmitting ? "Submitting…" : "📷 Submit Photo"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Result Screens
function SuccessScreen({ creditDelta, planTitle, onDone }: { creditDelta: number; planTitle: string; onDone: () => void }) {
  const score = useReliabilityStore.getState().score;
  const [show, setShow] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 50);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className={styles.successScreen}>
      <Confetti />
      <div className={`${styles.successContent} ${show ? styles.show : ""}`}>
        <div className={styles.successEmoji}>🙌</div>
        <h1 className={styles.successTitle}>Nice. You showed up.</h1>
        <p className={styles.successDesc}>
          <em>“{planTitle}”</em> is done.
        </p>

        <div className={styles.rewardPills}>
          <div className={styles.creditPill}>
            ⬡ +{creditDelta} credits earned
          </div>
          <div className={styles.scorePill}>
            📊 Reliability score: {score}
          </div>
        </div>

        <div className={styles.successActions}>
          <button onClick={onDone} className={styles.primaryButton}>
            Back to home
          </button>
          <Link href="/create" className={styles.secondaryLink}>
            + Create another plan
          </Link>
        </div>
      </div>
    </div>
  );
}

function MissedScreen({ creditsLost, onDone }: { creditsLost: number; onDone: () => void }) {
  return (
    <div className={styles.missedScreen}>
      <div className={styles.missedEmoji}>😔</div>
      <h1 className={styles.missedTitle}>You missed this one.</h1>
      <p className={styles.missedDesc}>
        The deadline passed before you submitted.
      </p>

      <div className={styles.missedStats}>
        {creditsLost > 0 && <div className={styles.lostCredits}>⬡ −{creditsLost} credits</div>}
        <div className={styles.reliabilityLoss}>⬇ −2 Reliability</div>
      </div>

      <div className={styles.missedActions}>
        <Link href="/create" className={styles.primaryButton}>+ Start a new plan</Link>
        <button onClick={onDone} className={styles.secondaryButton}>Back to home</button>
      </div>
    </div>
  );
}

function AlreadyDone({ planId }: { planId: string }) {
  return (
    <div className={styles.alreadyDone}>
      <div className={styles.alreadyEmoji}>✅</div>
      <h1>Already submitted</h1>
      <p>You&apos;ve already submitted proof for this plan.</p>
      <div className={styles.alreadyActions}>
        <Link href={`/commit/${planId}`}>View plan</Link>
        <Link href="/">Home</Link>
      </div>
    </div>
  );
}

function LatePage({ plan, onAcknowledge }: { plan: { title: string; stakeAmount: number }; onAcknowledge: () => void }) {
  return (
    <div className={styles.latePage}>
      <div className={styles.lateEmoji}>⏰</div>
      <h1>Deadline passed</h1>
      <p>The window for <strong>“{plan.title}”</strong> has closed.</p>
      
      {plan.stakeAmount > 0 && (
        <div className={styles.forfeited}>⬡ {plan.stakeAmount} credits forfeited</div>
      )}

      <button onClick={onAcknowledge} className={styles.secondaryButton}>Got it</button>
    </div>
  );
}