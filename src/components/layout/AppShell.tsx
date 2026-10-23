import { Link, Outlet } from 'react-router';
import { ServerStatus } from './ServerStatus.tsx';
import styles from './AppShell.module.css';

export function AppShell() {
  return (
    <div className={styles.shell}>
      <a className={styles.skipLink} href="#main">
        Skip to content
      </a>
      <header className={styles.header}>
        <Link to="/" className={styles.brand} aria-label="DEADLINE home">
          <span className={styles.mark} aria-hidden="true" />
          <span className={styles.word}>DEADLINE</span>
        </Link>
        <ServerStatus />
      </header>
      <main id="main" className={styles.main} tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  );
}
