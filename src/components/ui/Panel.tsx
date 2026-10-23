import { useId, type ReactNode } from 'react';
import styles from './Panel.module.css';

interface PanelProps {
  title: string;
  children: ReactNode;
  className?: string | undefined;
}

export function Panel({ title, children, className }: PanelProps) {
  const headingId = useId();
  return (
    <section
      className={className ? `${styles.panel} ${className}` : styles.panel}
      aria-labelledby={headingId}
    >
      <h2 id={headingId} className={styles.title}>
        {title}
      </h2>
      {children}
    </section>
  );
}

export function QueryState({ isPending, error, onRetry, label }: QueryStateProps) {
  if (isPending) {
    return (
      <p className={styles.muted} role="status">
        Loading {label}…
      </p>
    );
  }
  if (error) {
    return (
      <div className={styles.error} role="alert">
        <p>Could not load {label}.</p>
        <button type="button" className={styles.retry} onClick={onRetry}>
          Retry
        </button>
      </div>
    );
  }
  return null;
}

interface QueryStateProps {
  isPending: boolean;
  error: Error | null;
  onRetry: () => void;
  label: string;
}
