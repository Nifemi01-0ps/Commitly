"use client";

import { useState } from "react";
import styles from "./FormField.module.css";

interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: (props: { hasError: boolean }) => React.ReactNode;
}

export function FormField({ 
  label, 
  required, 
  error, 
  hint, 
  children 
}: FormFieldProps) {
  return (
    <div className={styles.formField}>
      <label className={styles.label}>
        {label}
        {required && <span className={styles.required}>*</span>}
      </label>

      {children({ hasError: !!error })}

      {(error || hint) && (
        <div className={`${styles.message} ${error ? styles.error : styles.hint}`}>
          {error && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          )}
          {error || hint}
        </div>
      )}
    </div>
  );
}

// ─── TextInput Component ─────

interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
  suffix?: React.ReactNode;
}

export function TextInput({ 
  hasError, 
  suffix, 
  className = "", 
  onFocus, 
  onBlur, 
  ...props 
}: TextInputProps) {
  
  const [focused, setFocused] = useState(false);

  return (
    <div className={styles.inputWrapper}>
      <input
        {...props}
        onFocus={(e) => { 
          setFocused(true); 
          onFocus?.(e); 
        }}
        onBlur={(e) => { 
          setFocused(false); 
          onBlur?.(e); 
        }}
        className={`
          ${styles.input} 
          ${hasError ? styles.error : ""} 
          ${focused ? styles.focused : ""} 
          ${className}
        `.trim()}
      />
      
      {suffix && <div className={styles.suffix}>{suffix}</div>}
    </div>
  );
}