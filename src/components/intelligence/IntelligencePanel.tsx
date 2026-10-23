import type { DiscoveredFactDto } from '../../api/types.ts';
import { formatGameMoment, humanize } from '../../lib/format.ts';
import {
  CONFIDENCE_TEXT,
  factLabel,
  isOutdated,
  SOURCE_TEXT,
  unknownTopics,
} from '../../lib/intelligence.ts';
import { Panel } from '../ui/Panel.tsx';
import styles from './Intelligence.module.css';

interface IntelligencePanelProps {
  facts: DiscoveredFactDto[];
  clubFacts: DiscoveredFactDto[];
  clubName: string | null;
  elapsedHours: number;
  className?: string | undefined;
}

function FactList({ facts, elapsedHours }: { facts: DiscoveredFactDto[]; elapsedHours: number }) {
  return (
    <ul className={styles.list}>
      {facts.map((fact) => {
        const outdated = isOutdated(fact, elapsedHours);
        return (
          <li key={fact.id} className={styles.fact} data-outdated={outdated || undefined}>
            <p className={styles.topic}>{factLabel(fact.factType)}</p>
            <p className={styles.interpretation}>{fact.interpretation}</p>
            <p className={styles.muted}>
              <span className={styles.confidence} data-confidence={fact.confidence}>
                {CONFIDENCE_TEXT[fact.confidence]}
              </span>{' '}
              · {SOURCE_TEXT[fact.sourceType] ?? humanize(fact.sourceType)} ·{' '}
              {formatGameMoment(fact.discoveredAtGameHour)}
              {outdated && <span className={styles.outdated}> · Outdated</span>}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

export function IntelligencePanel({
  facts,
  clubFacts,
  clubName,
  elapsedHours,
  className,
}: IntelligencePanelProps) {
  const unknown = unknownTopics(facts, elapsedHours);

  return (
    <Panel title="Player Intelligence" className={className}>
      <div className={styles.columns}>
        <section aria-labelledby="known-title">
          <h3 id="known-title" className={styles.subhead}>
            Known
          </h3>
          {facts.length === 0 ? (
            <p className={styles.muted}>Nothing discovered yet. Scouting and conversations reveal clues.</p>
          ) : (
            <FactList facts={facts} elapsedHours={elapsedHours} />
          )}
        </section>
        <section aria-labelledby="unknown-title">
          <h3 id="unknown-title" className={styles.subhead}>
            Unknown
          </h3>
          <ul className={styles.list}>
            {unknown.map((topic) => (
              <li key={topic} className={styles.muted}>
                {topic}
              </li>
            ))}
          </ul>
        </section>
        {clubFacts.length > 0 && (
          <section aria-labelledby="club-intel-title">
            <h3 id="club-intel-title" className={styles.subhead}>
              About {clubName ?? 'his club'}
            </h3>
            <FactList facts={clubFacts} elapsedHours={elapsedHours} />
          </section>
        )}
      </div>
    </Panel>
  );
}
