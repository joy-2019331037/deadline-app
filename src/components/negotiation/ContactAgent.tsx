import { Link, useNavigate } from 'react-router';
import { useGame } from '../../api/games.ts';
import { useActiveNegotiationFor, useContactAgent } from '../../api/negotiations.ts';
import { ACTION_COSTS } from '../../lib/negotiation.ts';
import styles from './Negotiation.module.css';

export function ContactAgent({ playerId }: { playerId: string }) {
  const navigate = useNavigate();
  const contact = useContactAgent();
  const active = useActiveNegotiationFor(playerId);
  const { data } = useGame();
  const windowOpen = data?.game.status === 'ACTIVE' && !data.game.clock.isWindowClosed;

  if (active) {
    return (
      <Link to={`/game/negotiations/${active.id}`} className={styles.primary}>
        Continue negotiation
      </Link>
    );
  }

  return (
    <>
      <button
        type="button"
        className={styles.primary}
        disabled={!windowOpen || contact.isPending}
        onClick={() =>
          contact.mutate(playerId, {
            onSuccess: (response) => void navigate(`/game/negotiations/${response.negotiation.id}`),
          })
        }
      >
        Contact agent · {ACTION_COSTS.contact} hours
      </button>
      {!windowOpen && <p className={styles.muted}>The transfer window has closed.</p>}
      {contact.isError && (
        <p className={styles.error} role="alert">
          {contact.error.message}
        </p>
      )}
    </>
  );
}
