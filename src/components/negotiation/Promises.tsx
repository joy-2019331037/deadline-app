import { useState } from 'react';
import { PROMISE_TYPES, type PromiseDto, type PromiseType } from '../../api/types.ts';
import { formatHours } from '../../lib/format.ts';
import {
  MAX_PROMISES,
  PROMISE_DUE_BY_TYPE,
  PROMISE_DUE_TEXT,
  PROMISE_INFO,
  PROMISE_STATUS_TEXT,
} from '../../lib/negotiation.ts';
import styles from './Negotiation.module.css';

const PROMISE_HOURS = 1;

export function CommitmentList({ promises }: { promises: PromiseDto[] }) {
  if (promises.length === 0) return <p className={styles.muted}>No formal promises made.</p>;
  return (
    <ul className={styles.commitments} aria-label="Commitments">
      {promises.map((promise) => (
        <li key={promise.id} className={styles.commitment} data-status={promise.status}>
          <span>{promise.terms}</span>
          <span className={styles.commitmentStatus}>
            {PROMISE_STATUS_TEXT[promise.status]} · due {PROMISE_DUE_TEXT[promise.dueCondition.kind]}
          </span>
        </li>
      ))}
    </ul>
  );
}

interface PromiseControlsProps {
  playerName: string;
  promises: PromiseDto[];
  pending: boolean;
  error: string | null;
  onConfirm: (promiseType: PromiseType) => void;
}

export function PromiseControls({ playerName, promises, pending, error, onConfirm }: PromiseControlsProps) {
  const available = PROMISE_TYPES.filter((type) => !promises.some((promise) => promise.promiseType === type));
  const [selected, setSelected] = useState<PromiseType | ''>('');
  const [confirming, setConfirming] = useState(false);
  const choice = selected || available[0];

  if (promises.length >= MAX_PROMISES || !choice) {
    return <p className={styles.muted}>You have made as many promises as this deal can carry.</p>;
  }

  return (
    <div className={styles.promiseControls}>
      <label htmlFor="promise-type" className={styles.label}>
        Formal promise
      </label>
      <div className={styles.composerFooter}>
        <select
          id="promise-type"
          className={styles.input}
          value={choice}
          onChange={(event) => {
            setSelected(event.target.value as PromiseType);
            setConfirming(false);
          }}
        >
          {available.map((type) => (
            <option key={type} value={type}>
              {PROMISE_INFO[type].label}
            </option>
          ))}
        </select>
        <button
          type="button"
          className={styles.secondary}
          disabled={pending}
          onClick={() => setConfirming(true)}
        >
          Make promise · {formatHours(PROMISE_HOURS)}
        </button>
      </div>
      {confirming && (
        <div
          className={styles.dialog}
          role="dialog"
          aria-modal="false"
          aria-labelledby="promise-confirm-title"
        >
          <h3 id="promise-confirm-title" className={styles.dialogTitle}>
            Confirm this commitment
          </h3>
          <p>{PROMISE_INFO[choice].terms(playerName)}</p>
          <p className={styles.muted}>
            Due {PROMISE_DUE_TEXT[PROMISE_DUE_BY_TYPE[choice]]}. Breaking it will cost you his agent&apos;s
            trust and damage your reputation.
          </p>
          <div className={styles.composerFooter}>
            <button
              type="button"
              className={styles.primary}
              disabled={pending}
              onClick={() => {
                onConfirm(choice);
                setConfirming(false);
              }}
            >
              I promise
            </button>
            <button type="button" className={styles.secondary} onClick={() => setConfirming(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
