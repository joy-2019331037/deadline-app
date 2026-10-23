import { useGameAction } from '../../api/games.ts';
import type { ShortlistPriority } from '../../api/types.ts';
import styles from './ShortlistControls.module.css';

interface ShortlistControlsProps {
  playerId: string;
  playerName: string;
  priority: ShortlistPriority | null;
}

export function ShortlistControls({ playerId, playerName, priority }: ShortlistControlsProps) {
  const action = useGameAction();

  const toggle = (option: ShortlistPriority) =>
    action.mutate(
      priority === option
        ? { type: 'REMOVE_FROM_SHORTLIST', playerId }
        : { type: 'SHORTLIST_PLAYER', playerId, priority: option },
    );

  return (
    <div className={styles.controls}>
      {(['PRIMARY', 'BACKUP'] as const).map((option) => (
        <button
          key={option}
          type="button"
          className={styles.chip}
          aria-pressed={priority === option}
          aria-label={`Mark ${playerName} as ${option === 'PRIMARY' ? 'a target' : 'a backup'}`}
          disabled={action.isPending}
          onClick={() => toggle(option)}
        >
          {option === 'PRIMARY' ? 'Target' : 'Backup'}
        </button>
      ))}
      {action.isError && (
        <span className={styles.error} role="alert">
          {action.error.message}
        </span>
      )}
    </div>
  );
}
