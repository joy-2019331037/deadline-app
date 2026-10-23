import { useState } from 'react';
import { useGame } from '../../api/games.ts';
import { useInvestigate, useJournalists, useScoutPlayer } from '../../api/intelligence.ts';
import type { GameEventDto, Investigation } from '../../api/types.ts';
import { formatHours } from '../../lib/format.ts';
import { factLabel, INFORMATION_COSTS } from '../../lib/intelligence.ts';
import { Panel } from '../ui/Panel.tsx';
import styles from './Intelligence.module.css';

interface GatherIntelligenceProps {
  playerId: string;
  playerName: string;
  clubId: string | null;
  clubName: string | null;
}

function describeResult(event: GameEventDto): string {
  const revealed = Array.isArray(event.payload['revealed']) ? (event.payload['revealed'] as string[]) : [];
  if (revealed.length === 0) return 'Nothing new came of it.';
  return `New information: ${revealed.map(factLabel).join(', ')}.`;
}

export function GatherIntelligence({ playerId, playerName, clubId, clubName }: GatherIntelligenceProps) {
  const { data } = useGame();
  const scout = useScoutPlayer();
  const investigate = useInvestigate();
  const journalists = useJournalists();
  const [journalistId, setJournalistId] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const open = data?.game.status === 'ACTIVE' && !data.game.clock.isWindowClosed;
  const pending = scout.isPending || investigate.isPending;
  const error = scout.error ?? investigate.error;
  const chosenJournalist = journalistId || journalists.data?.journalists[0]?.id || '';

  const run = (investigation: Investigation) => {
    setResult(null);
    investigate.mutate(investigation, { onSuccess: ({ event }) => setResult(describeResult(event)) });
  };

  const actions: { label: string; hours: number; onClick: () => void; disabled?: boolean }[] = [
    {
      label: `Scout ${playerName}`,
      hours: INFORMATION_COSTS.scout,
      onClick: () => {
        setResult(null);
        scout.mutate(playerId, { onSuccess: ({ event }) => setResult(describeResult(event)) });
      },
    },
    {
      label: 'Contact an insider',
      hours: INFORMATION_COSTS.insider,
      onClick: () => run({ kind: 'CONTACT_INSIDER', playerId }),
    },
    {
      label: 'Monitor social media',
      hours: INFORMATION_COSTS.socialMedia,
      onClick: () => run({ kind: 'MONITOR_SOCIAL_MEDIA', playerId }),
    },
    ...(clubId
      ? [
          {
            label: `Study ${clubName ?? 'his club'}`,
            hours: INFORMATION_COSTS.studyClub,
            onClick: () => run({ kind: 'STUDY_CLUB', clubId }),
          },
        ]
      : []),
  ];

  return (
    <Panel title="Gather intelligence">
      <p className={styles.muted}>Information costs time, and not every source can be trusted.</p>
      <div className={styles.actions}>
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            className={styles.action}
            disabled={!open || pending}
            onClick={action.onClick}
          >
            {action.label} · {formatHours(action.hours)}
          </button>
        ))}
      </div>
      <div className={styles.journalist}>
        <label htmlFor="journalist" className={styles.label}>
          Journalist
        </label>
        <select
          id="journalist"
          className={styles.select}
          value={chosenJournalist}
          onChange={(event) => setJournalistId(event.target.value)}
        >
          {journalists.data?.journalists.map((journalist) => (
            <option key={journalist.id} value={journalist.id}>
              {journalist.name} ({journalist.outlet}) · {journalist.reputation}
            </option>
          ))}
        </select>
        <button
          type="button"
          className={styles.action}
          disabled={!open || pending || !chosenJournalist}
          onClick={() => run({ kind: 'ASK_JOURNALIST', playerId, journalistId: chosenJournalist })}
        >
          Ask the journalist · {formatHours(INFORMATION_COSTS.journalist)}
        </button>
      </div>
      {!open && <p className={styles.muted}>The transfer window has closed.</p>}
      {result && (
        <p className={styles.result} role="status">
          {result}
        </p>
      )}
      {error && (
        <p className={styles.error} role="alert">
          {error.message}
        </p>
      )}
    </Panel>
  );
}
