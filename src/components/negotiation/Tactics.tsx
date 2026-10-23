import type { ClaimDto, Tactic } from '../../api/types.ts';
import { formatGameMoment, formatHours } from '../../lib/format.ts';
import { CLAIM_STATUS_TEXT, TACTIC_INFO } from '../../lib/negotiation.ts';
import styles from './Negotiation.module.css';

const TACTICS = Object.keys(TACTIC_INFO) as Tactic[];

interface TacticButtonsProps {
  pending: boolean;
  error: string | null;
  onTactic: (tactic: Tactic) => void;
}

export function TacticButtons({ pending, error, onTactic }: TacticButtonsProps) {
  return (
    <div>
      <ul className={styles.tactics}>
        {TACTICS.map((tactic) => (
          <li key={tactic} className={styles.tactic}>
            <button
              type="button"
              className={styles.secondary}
              disabled={pending}
              onClick={() => onTactic(tactic)}
            >
              {TACTIC_INFO[tactic].label} · {formatHours(TACTIC_INFO[tactic].hours)}
            </button>
            <span className={styles.muted}>{TACTIC_INFO[tactic].risk}</span>
          </li>
        ))}
      </ul>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

interface ClaimResponsesProps {
  claims: ClaimDto[];
  open: boolean;
  pending: boolean;
  error: string | null;
  onCallBluff: () => void;
  onAskDetails: () => void;
}

export function ClaimResponses({
  claims,
  open,
  pending,
  error,
  onCallBluff,
  onAskDetails,
}: ClaimResponsesProps) {
  if (claims.length === 0)
    return <p className={styles.muted}>The agent has not made any claims about other clubs.</p>;
  return (
    <ul className={styles.commitments} aria-label="Agent claims">
      {claims.map((claim) => {
        const challengeable = open && (claim.status === 'OPEN' || claim.status === 'DETAILS_GIVEN');
        return (
          <li key={claim.id} className={styles.commitment} data-status={claim.status}>
            <span>“{claim.publicClaim}”</span>
            <span className={styles.commitmentStatus}>
              {CLAIM_STATUS_TEXT[claim.status]} · {formatGameMoment(claim.createdAtGameHour)}
            </span>
            {challengeable && (
              <div className={styles.composerFooter}>
                <button type="button" className={styles.secondary} disabled={pending} onClick={onCallBluff}>
                  Call the bluff · {formatHours(2)}
                </button>
                {claim.status === 'OPEN' && (
                  <button
                    type="button"
                    className={styles.secondary}
                    disabled={pending}
                    onClick={onAskDetails}
                  >
                    Ask for details · {formatHours(1)}
                  </button>
                )}
              </div>
            )}
          </li>
        );
      })}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </ul>
  );
}
