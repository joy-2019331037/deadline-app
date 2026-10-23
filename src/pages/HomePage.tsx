import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useCreateGame } from '../api/games.ts';
import { useSessionStore } from '../stores/sessionStore.ts';
import styles from './HomePage.module.css';

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
      <h1 id="home-title" className={styles.title}>
        DEADLINE
      </h1>
      <p className={styles.tagline}>In football, the truth is negotiable.</p>

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
