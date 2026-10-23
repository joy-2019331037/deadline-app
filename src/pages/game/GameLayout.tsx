import { motion } from 'motion/react';
import { useEffect } from 'react';
import { Navigate, NavLink, Outlet, useLocation } from 'react-router';
import { isLostSessionError, useGame } from '../../api/games.ts';
import type { GameStateDto } from '../../api/types.ts';
import { LiveMoments } from '../../components/layout/LiveMoments.tsx';
import { NewsTicker } from '../../components/layout/NewsTicker.tsx';
import { SettingsMenu } from '../../components/layout/SettingsMenu.tsx';
import { Monogram } from '../../components/ui/primitives.tsx';
import { formatClockTime } from '../../lib/format.ts';
import { urgencyOf } from '../../lib/urgency.ts';
import { useSessionStore } from '../../stores/sessionStore.ts';
import { useSettingsStore } from '../../stores/settingsStore.ts';
import styles from './GameLayout.module.css';

const NAV_ITEMS = [
  {
    to: '/game',
    label: 'Dashboard',
    short: 'Home',
    icon: 'M4 13h7V4H4zm9 7h7v-9h-7zM4 20h7v-5H4zm9-16v5h7V4z',
    end: true,
  },
  {
    to: '/game/squad',
    label: 'Squad',
    short: 'Squad',
    icon: 'M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z',
    end: false,
  },
  {
    to: '/game/market',
    label: 'Transfer Market',
    short: 'Market',
    icon: 'M10.5 4a6.5 6.5 0 1 0 4 11.6l4.4 4.4 1.4-1.4-4.4-4.4A6.5 6.5 0 0 0 10.5 4zm0 2a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9z',
    end: false,
  },
  {
    to: '/game/negotiations',
    label: 'Negotiations',
    short: 'Talks',
    icon: 'M4 4h16v11H8l-4 4zm4 4v2h8V8zm0 3v2h5v-2z',
    end: false,
  },
  {
    to: '/game/rumors',
    label: 'Rumor Feed',
    short: 'Rumors',
    icon: 'M3 10v4h3l5 4V6L6 10zm13.5 2A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z',
    end: false,
  },
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
  const showTicker = useSettingsStore((state) => state.ticker);
  const { pathname } = useLocation();
  const lostSession = isError && isLostSessionError(error);

  useEffect(() => {
    if (lostSession) clearSession({ lost: true });
  }, [lostSession, clearSession]);

  if (isPending || lostSession) {
    return (
      <div className={styles.state}>
        <span className={styles.spinner} aria-hidden="true" />
        <p role="status">Restoring your transfer window…</p>
      </div>
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
        <div className={styles.identity}>
          <Monogram name={game.club?.name ?? 'Your club'} tone="accent" />
          <div>
            <p className={styles.club}>{game.club?.name ?? 'Your club'}</p>
            {game.club && <p className={styles.league}>{game.club.league}</p>}
          </div>
        </div>
        <nav aria-label="Game" className={styles.navWrap}>
          <ul className={styles.nav}>
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => (isActive ? `${styles.link} ${styles.active}` : styles.link)}
                >
                  {({ isActive }) => (
                    <>
                      <svg
                        viewBox="0 0 24 24"
                        width="18"
                        height="18"
                        aria-hidden="true"
                        className={styles.icon}
                      >
                        <path fill="currentColor" d={item.icon} />
                      </svg>
                      <span className={styles.full}>{item.label}</span>
                      <span className={styles.short} data-label={item.short} aria-hidden="true" />
                      {isActive && (
                        <motion.span
                          layoutId="nav-indicator"
                          className={styles.indicator}
                          transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                        />
                      )}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className={styles.tools}>
          <GameClock game={game} />
          <SettingsMenu />
        </div>
      </div>
      <div key={pathname} className={styles.page}>
        <Outlet />
      </div>
      {showTicker && <NewsTicker />}
      <LiveMoments />
    </div>
  );
}

function GameClock({ game }: { game: GameStateDto }) {
  const { clock } = game;
  const closed = clock.isWindowClosed || game.status === 'COMPLETED';
  return (
    <div className={styles.clockBox} data-urgency={closed ? 'closed' : urgencyOf(clock.remainingHours)}>
      <p className={styles.clock}>
        DAY {clock.day} OF {clock.windowLengthDays}
      </p>
      <p className={styles.time} aria-hidden="true">
        {closed ? 'CLOSED' : formatClockTime(clock.hour)}
      </p>
    </div>
  );
}
