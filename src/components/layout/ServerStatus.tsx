import { useHealth } from '../../api/health.ts';
import styles from './ServerStatus.module.css';

export function ServerStatus() {
  const { isPending, isError } = useHealth();

  const state = isPending ? 'checking' : isError ? 'offline' : 'online';
  const label = { checking: 'Connecting…', offline: 'Server offline', online: 'Server online' }[state];

  return (
    <p className={styles.status} data-state={state} role="status">
      <span className={styles.dot} aria-hidden="true" />
      {label}
    </p>
  );
}
