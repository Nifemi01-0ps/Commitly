"use client";

import { useEffect, useRef, useState } from "react";
import { useTxFeedbackStore } from "@/store/useTxFeedbackStore";
import { useUserStore } from "@/store/useUserStore";
import styles from "./TxFeedbackBar.module.css";

export default function TxFeedbackBar() {
  const realMode = useUserStore((s) => s.user?.realMode ?? false);
  const latest = useTxFeedbackStore((s) => s.latest);
  const clear = useTxFeedbackStore((s) => s.clear);

  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const startX = useRef(0);
  const currentX = useRef(0);

  // Auto dismiss
  useEffect(() => {
    if (!latest) return;
    const t = setTimeout(clear, 4000);
    return () => clearTimeout(t);
  }, [latest, clear]);

  if (!realMode || !latest) return null;

  const isSuccess = latest.type === "success";

  // Swipe Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    currentX.current = startX.current;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    currentX.current = e.touches[0].clientX;
    const diff = currentX.current - startX.current;
    setTranslateX(Math.max(-200, Math.min(200, diff))); // limit swipe range
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    const diff = currentX.current - startX.current;

    if (Math.abs(diff) > 120) {
      // Swipe threshold
      clear();
      setTranslateX(0);
    } else {
      // Snap back
      setTranslateX(0);
    }
  };

  return (
    <div className={styles.container}>
      <div
        className={`${styles.bar} ${isSuccess ? styles.success : styles.pending}`}
        style={{
          transform: `translateX(${translateX}px)`,
          transition: isDragging ? "none" : "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <span className={styles.icon}>
          {isSuccess ? "⚡" : "⏳"}
        </span>

        <span className={styles.message}>
          {latest.message}
        </span>

        <button onClick={clear} className={styles.dismissButton}>
          ×
        </button>
      </div>
    </div>
  );
}