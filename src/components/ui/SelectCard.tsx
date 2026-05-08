"use client";

import styles from "./SelectCard.module.css";

interface SelectCardOption<T extends string> {
  value: T;
  icon: string;
  label: string;
  desc: string;
}

interface SelectCardProps<T extends string> {
  options: SelectCardOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

/** Two-column card grid for selecting between a small set of options. */
export default function SelectCard<T extends string>({
  options,
  value,
  onChange,
}: SelectCardProps<T>) {
  return (
    <div className={styles.selectGrid}>
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`${styles.optionCard} ${selected ? styles.selected : ""}`}
          >
            <div className={styles.optionIcon}>{opt.icon}</div>
            <div className={styles.optionLabel}>{opt.label}</div>
            <div className={styles.optionDesc}>{opt.desc}</div>
          </button>
        );
      })}
    </div>
  );
}