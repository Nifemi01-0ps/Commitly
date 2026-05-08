import Link from "next/link";
import styles from "./EmptyState.module.css";

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: { label: string; href: string };
}

export default function EmptyState({ 
  icon = "📋", 
  title, 
  description, 
  action 
}: EmptyStateProps) {
  return (
    <div className={styles.emptyState}>
      <div className={styles.icon}>{icon}</div>
      
      <div className={styles.title}>{title}</div>
      
      {description && (
        <div className={styles.description}>{description}</div>
      )}

      {action && (
        <Link href={action.href} className={styles.actionLink}>
          <span className={styles.actionButton}>
            {action.label}
          </span>
        </Link>
      )}
    </div>
  );
}