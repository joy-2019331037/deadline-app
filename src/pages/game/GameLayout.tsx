import { useEffect } from 'react';
import { Navigate, NavLink, Outlet } from 'react-router';
import { isLostSessionError, useGame } from '../../api/games.ts';
import { useSessionStore } from '../../stores/sessionStore.ts';
import styles from './GameLayout.module.css';

const NAV_ITEMS = [
  { to: '/game', label: 'Dashboard', end: true },
  { to: '/game/squad', label: 'Squad', end: false },
  { to: '/game/market', label: 'Transfer Market', end: false },
  { to: '/game/negotiations', label: 'Negotiations', end: false },
  { to: '/game/rumors', label: 'Rumor Feed', end: false },
];

export function GameLayout() {
  const hasSession = useSessionStore((state) => state.session !== null);
  if (!hasSession) {
    return <Navigate to="/" replace />;
  }
  return <GameSession />;
}

function GameSession() {
  const { data, isPending, isError, error, refetch } = useGame();
  const clearSession = useSessionStore((state) => state.clearSession);
  const lostSession = isError && isLostSessionError(error);

  useEffect(() => {
    if (lostSession) clearSession({ lost: true });
  }, [lostSession, clearSession]);

  if (isPending || lostSession) {
    return (
      <p className={styles.state} role="status">
        Restoring your transfer window…
      </p>
    );
  }

  if (isError) {
    return (
      <div className={styles.state} role="alert">
        <p>Could not load your game: {error.message}</p>
        <button type="button" className={styles.retry} onClick={() => void refetch()}>
          Try again
        </button>
      </div>
    );
  }

  const { game } = data;

  return (
    <div className={styles.layout}>
      <div className={styles.bar}>
        <div>
          <p className={styles.club}>{game.club?.name ?? 'Your club'}</p>
          <p className={styles.clock}>
            DAY {game.clock.day} OF {game.clock.windowLengthDays}
          </p>
        </div>
        <nav aria-label="Game">
          <ul className={styles.nav}>
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => (isActive ? `${styles.link} ${styles.active}` : styles.link)}
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <Outlet />
    </div>
  );
}
