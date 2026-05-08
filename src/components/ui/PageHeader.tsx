import Link from "next/link";
import styles from "./PageHeader.module.css";

interface PageHeaderProps {
  title: string;
  backHref?: string;
  right?: React.ReactNode;
}

export default function PageHeader({ 
  title, 
  backHref = "/", 
  right 
}: PageHeaderProps) {
  return (
    <div className={styles.header}>
      <Link href={backHref} className={styles.backLink}>
        <button className={styles.backButton}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
      </Link>

      <div className={styles.title}>{title}</div>

      {right && <div className={styles.right}>{right}</div>}
    </div>
  );
}