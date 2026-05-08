"use client";

import styles from "./SelectRow.module.css";

interface SelectRowOption<T extends string> {
  value: T;
  icon: string;
  label: string;
  desc: string;
}

interface SelectRowProps<T extends string> {
  options: SelectRowOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

/** Vertical list of full-width option rows with icon, label, desc, and checkmark. */
export default function SelectRow<T extends string>({
  options,
  value,
  onChange,
}: SelectRowProps<T>) {
  return (
    <div className={styles.selectList}>
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`${styles.optionRow} ${selected ? styles.selected : ""}`}
          >
            <div className={styles.optionIconWrapper}>
              <div className={styles.optionIcon}>{opt.icon}</div>
            </div>

            <div className={styles.optionContent}>
              <div className={styles.optionLabel}>{opt.label}</div>
              <div className={styles.optionDesc}>{opt.desc}</div>
            </div>

            <div className={styles.checkCircle}>
              <svg
                width="11"
                height="11"
                viewBox="0 0 12 12"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
              >
                <polyline points="2 6 5 9 10 3" />
              </svg>
            </div>
          </button>
        );
      })}
    </div>
  );
}