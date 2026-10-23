import type { ReactNode } from 'react';
import styles from './PageHeader.module.css';

interface PageHeaderProps {
  kicker?: string;
  title: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
}

/** Broadcast lower-third page title: a small kicker above an italic condensed headline. */
export function PageHeader({ kicker, title, meta, actions }: PageHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.text}>
        {kicker && (
          <p className={styles.kicker} aria-hidden="true">
            {kicker}
          </p>
        )}
        <h1 className={styles.title}>{title}</h1>
        {meta && <div className={styles.meta}>{meta}</div>}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </header>
  );
}
