import { useId, type ReactNode } from 'react';
import styles from './Panel.module.css';

export type PanelTone = 'default' | 'live' | 'alert' | 'success';

interface PanelProps {
  title: string;
  children: ReactNode;
  className?: string | undefined;
  tone?: PanelTone | undefined;
  actions?: ReactNode;
}

export function Panel({ title, children, className, tone = 'default', actions }: PanelProps) {
  const headingId = useId();
  return (
    <section
      className={className ? `${styles.panel} ${className}` : styles.panel}
      aria-labelledby={headingId}
      data-tone={tone}
    >
      <header className={styles.header}>
        <h2 id={headingId} className={styles.title}>
          {title}
        </h2>
        {tone === 'live' && (
          <span className={styles.live} aria-hidden="true">
            Live
          </span>
        )}
        {actions && <div className={styles.actions}>{actions}</div>}
      </header>
      {children}
    </section>
  );
}

export function QueryState({ isPending, error, onRetry, label }: QueryStateProps) {
  if (isPending) {
    return (
      <div className={styles.loading}>
        <p className="visually-hidden" role="status">
          Loading {label}…
        </p>
        <div className={styles.skeleton} aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>
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
