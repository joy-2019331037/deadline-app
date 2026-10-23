import type { RivalInterestDto } from '../../api/types.ts';
import { INTEREST_TEXT } from '../../lib/intelligence.ts';
import { Panel } from '../ui/Panel.tsx';
import styles from './Intelligence.module.css';

export function RivalInterest({ interest }: { interest: RivalInterestDto[] }) {
  return (
    <Panel title="Rival interest">
      {interest.length === 0 ? (
        <p className={styles.muted}>No rival clubs are in the picture.</p>
      ) : (
        <dl className={styles.interest}>
          {interest.map((entry) => (
            <div key={entry.clubId}>
              <dt>{entry.clubName}</dt>
              <dd data-label={entry.label}>{INTEREST_TEXT[entry.label]}</dd>
            </div>
          ))}
        </dl>
      )}
      <p className={styles.muted}>
        Based only on what you have discovered. Investigate rumors and claims to firm these up.
      </p>
    </Panel>
  );
}
