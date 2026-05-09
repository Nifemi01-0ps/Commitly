"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./BottomNav.module.css";

const NAV_ITEMS = [
  { href: "/", icon: "🏠", label: "Home" },
  { href: "/plans", icon: "📋", label: "My Plans" },
  { href: "/create", icon: "+", label: "", isCreate: true },
  { href: "/activity", icon: "⚡", label: "Activity" },
  { href: "/profile", icon: "👤", label: "Profile" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className={styles.nav}>
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href;

        if (item.isCreate) {
          return (
            <Link
              key={item.href}
              href={item.href}
              className={styles.createLink}
            >
              <div className={styles.createButton}>+</div>
            </Link>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            className={styles.navLink}
          >
            <span className={styles.icon}>{item.icon}</span>
            <span className={`${styles.label} ${isActive ? styles.active : ""}`}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}