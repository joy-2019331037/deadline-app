import { useState } from 'react';
import { useMediaStatement } from '../../api/rumors.ts';
import type { MediaAction } from '../../api/types.ts';
import { formatHours } from '../../lib/format.ts';
import { INFORMATION_COSTS, MEDIA_ACTION_TEXT } from '../../lib/intelligence.ts';
import styles from './Media.module.css';

const ACTIONS = Object.keys(MEDIA_ACTION_TEXT) as MediaAction[];

export function MediaActions({
  playerId,
  playerName,
  disabled,
}: {
  playerId: string;
  playerName: string;
  disabled: boolean;
}) {
  const media = useMediaStatement();
  const [action, setAction] = useState<MediaAction>('LEAK_INTEREST');
  const [statement, setStatement] = useState<string | null>(null);
  const selectId = `media-${playerId}`;

  return (
    <div className={styles.media}>
      <label htmlFor={selectId} className={styles.label}>
        Media reaction about {playerName}
      </label>
      <select
        id={selectId}
        className={styles.select}
        value={action}
        onChange={(event) => setAction(event.target.value as MediaAction)}
      >
        {ACTIONS.map((option) => (
          <option key={option} value={option}>
            {MEDIA_ACTION_TEXT[option]}
          </option>
        ))}
      </select>
      <button
        type="button"
        className={styles.button}
        disabled={disabled || media.isPending}
        onClick={() =>
          media.mutate(
            { action, playerId },
            {
              onSuccess: ({ event }) => setStatement(String(event.payload['claim'] ?? 'Statement released.')),
            },
          )
        }
      >
        Go to the press · {formatHours(INFORMATION_COSTS.media)}
      </button>
      {statement && <p className={styles.result}>Statement released: “{statement}”</p>}
      {media.isError && (
        <p className={styles.error} role="alert">
          {media.error.message}
        </p>
      )}
    </div>
  );
}
