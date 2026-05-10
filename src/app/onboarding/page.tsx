"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "../../store/useUserStore";
import styles from "./OnboardingPage.module.css";

export default function OnboardingPage() {
  const router = useRouter();
  const signIn = useUserStore((s) => s.signIn);
  const user = useUserStore((s) => s.user);

  const [name, setName] = useState("");
  const [step, setStep] = useState<"name" | "welcome">("name");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Already signed in — go home
  useEffect(() => {
    if (user) router.replace("/");
  }, [user, router]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleContinue() {
    if (!name.trim()) {
      setError("What should we call you?");
      return;
    }
    if (name.trim().length > 40) {
      setError("Keep it under 40 characters");
      return;
    }

    signIn(name.trim());
    setStep("welcome");
    setTimeout(() => router.push("/"), 1800);
  }

  // Welcome Screen
  if (step === "welcome") {
    return (
      <div className={styles.welcomeScreen}>
        <div className={styles.welcomeEmoji}>🚀</div>
        <div className={styles.welcomeTitle}>Welcome, {name.trim()}!</div>
        <div className={styles.welcomeDesc}>
          You&apos;ve been given <strong>100 credits</strong> to start.
          Use them to commit to plans and earn more.
        </div>
        <div className={styles.creditsBadge}>
          ⬡ 100 credits ready
        </div>
      </div>
    );
  }

  // Onboarding Form
  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.logo}>Commitly</div>
      </div>

      <div className={styles.mainContent}>
        {/* Hero */}
        <div className={styles.hero}>
          <div className={styles.heroEmoji}>🎯</div>
          <div className={styles.heroTitle}>
            Plans that don&apos;t<br />
            <span>get cancelled.</span>
          </div>
          <div className={styles.heroSubtitle}>
            Commit credits to your goals. Show up. Earn them back — plus a bonus.
          </div>
        </div>

        {/* Features */}
        <div className={styles.features}>
          {[
            { icon: "⬡", label: "Start with 100 credits", color: "var(--brand)" },
            { icon: "✅", label: "Complete plans, earn more", color: "var(--green)" },
            { icon: "📊", label: "Build your reliability score", color: "var(--amber)" },
          ].map((f) => (
            <div key={f.label} className={styles.featureItem}>
              <span className={styles.featureIcon} style={{ color: f.color }}>
                {f.icon}
              </span>
              <span>{f.label}</span>
            </div>
          ))}
        </div>

        {/* Name Input Section */}
        <div className={styles.inputSection}>
          <div className={styles.label}>What should we call you?</div>

          <input
            ref={inputRef}
            type="text"
            placeholder="Your name"
            value={name}
            maxLength={40}
            onChange={(e) => { setName(e.target.value); setError(""); }}
            onKeyDown={(e) => { if (e.key === "Enter") handleContinue(); }}
            className={`${styles.input} ${error ? styles.error : name ? styles.active : ""}`}
          />

          {error && <p className={styles.errorText}>{error}</p>}

          <button
            onClick={handleContinue}
            className={`${styles.continueButton} ${name.trim() ? styles.buttonActive : ""}`}
          >
            Get Started →
          </button>

          <p className={styles.footerText}>
            No email. No password. No crypto wallet.<br />
            Just your name and your word.
          </p>
        </div>
      </div>
    </div>
  );
}