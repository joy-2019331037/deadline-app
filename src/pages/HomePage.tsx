import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useCreateGame } from '../api/games.ts';
import { useSessionStore } from '../stores/sessionStore.ts';
import styles from './HomePage.module.css';

const TITLE = [...'DEADLINE'];
const PILLARS = ['Scout', 'Negotiate', 'Bluff', 'Beat the clock'];

export function HomePage() {
  const navigate = useNavigate();
  const hasSave = useSessionStore((state) => state.session !== null);
  const sessionLost = useSessionStore((state) => state.sessionLost);
  const createGame = useCreateGame();
  const [confirmingReplace, setConfirmingReplace] = useState(false);

  const startNewGame = () => {
    createGame.mutate(undefined, { onSuccess: () => navigate('/game') });
  };

  return (
    <section className={styles.hero} aria-labelledby="home-title">
      <div className={styles.backdrop} aria-hidden="true">
        <span className={styles.bigClock}>23:59</span>
        <span className={styles.beam} />
      </div>
      <p className={styles.kicker} aria-hidden="true">
        <span className={styles.liveDot} />
        Transfer window · Live
      </p>
      <h1 id="home-title" className={styles.title}>
        {TITLE.map((letter, index) => (
          <span key={index} style={{ animationDelay: `${index * 60}ms` }}>
            {letter}
          </span>
        ))}
      </h1>
      <p className={styles.tagline}>In football, the truth is negotiable.</p>
      <ul className={styles.pillars} aria-label="What you do">
        {PILLARS.map((pillar) => (
          <li key={pillar}>{pillar}</li>
        ))}
      </ul>

      {sessionLost && (
        <p className={styles.notice} role="status">
          Your previous save could not be found. Start a new transfer window.
        </p>
      )}

      <div className={styles.actions}>
        {hasSave && (
          <Link to="/game" className={styles.primary}>
            Continue window
          </Link>
        )}

        {hasSave && confirmingReplace ? (
          <div className={styles.confirm} role="group" aria-label="Confirm new game">
            <p>Starting a new window abandons your current save.</p>
            <button
              type="button"
              className={styles.danger}
              onClick={startNewGame}
              disabled={createGame.isPending}
            >
              Abandon and start over
            </button>
            <button type="button" className={styles.secondary} onClick={() => setConfirmingReplace(false)}>
              Keep my save
            </button>
          </div>
        ) : (
          <button
            type="button"
            className={hasSave ? styles.secondary : styles.primary}
            onClick={hasSave ? () => setConfirmingReplace(true) : startNewGame}
            disabled={createGame.isPending}
          >
            {createGame.isPending ? 'Opening the window…' : 'New transfer window'}
          </button>
        )}
      </div>

      {createGame.isError && (
        <p className={styles.error} role="alert">
          Could not start a new game: {createGame.error.message}
        </p>
      )}
    </section>
  );
}
