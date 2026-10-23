import { Link } from 'react-router';
import { useGame } from '../../api/games.ts';
import { useInvestigateRumor, useRumors } from '../../api/rumors.ts';
import type { RumorDto, RumorFeed, RumorInvestigationState } from '../../api/types.ts';
import { MediaActions } from '../../components/media/MediaActions.tsx';
import { PageHeader } from '../../components/ui/PageHeader.tsx';
import { QueryState } from '../../components/ui/Panel.tsx';
import { Monogram } from '../../components/ui/primitives.tsx';
import { formatGameMoment, formatHours } from '../../lib/format.ts';
import { INFORMATION_COSTS } from '../../lib/intelligence.ts';
import styles from './RumorsPage.module.css';

const STATUS_TEXT: Record<RumorInvestigationState, string> = {
  UNINVESTIGATED: 'Unverified',
  CONFIRMED: 'Confirmed',
  DEBUNKED: 'Debunked',
  INCONCLUSIVE: 'Inconclusive',
};

export function RumorsPage() {
  const { data, isPending, error, refetch } = useRumors();
  const { data: gameData } = useGame();
  const open = gameData?.game.status === 'ACTIVE' && !gameData.game.clock.isWindowClosed;

  return (
    <div className={styles.page}>
      <PageHeader
        kicker="Press room"
        title="Rumor Feed"
        meta={
          <p className={styles.muted}>
            The press reports what it hears. Check your sources before you act on a story.
          </p>
        }
      />
      <QueryState isPending={isPending} error={error} onRetry={() => void refetch()} label="the rumor feed" />
      {data && data.rumors.length === 0 && (
        <p className={styles.muted}>No rumors yet. Stories will break as the window goes on.</p>
      )}
      {data && data.rumors.length > 0 && (
        <ol className={styles.feed} aria-label="Rumors">
          {data.rumors.map((rumor, index) => (
            <RumorItem key={rumor.id} rumor={rumor} feed={data} open={open} index={index} />
          ))}
        </ol>
      )}
    </div>
  );
}

function RumorItem({
  rumor,
  feed,
  open,
  index,
}: {
  rumor: RumorDto;
  feed: RumorFeed;
  open: boolean;
  index: number;
}) {
  const investigate = useInvestigateRumor();
  const player = feed.players.find((candidate) => candidate.id === rumor.playerId);
  const ownStatement = rumor.storyType === 'USER_STATEMENT';
  const status = ownStatement ? 'Your statement' : STATUS_TEXT[rumor.investigationState];

  return (
    <li
      className={styles.rumor}
      data-state={ownStatement ? 'OWN' : rumor.investigationState}
      style={{ animationDelay: `${Math.min(index, 10) * 45}ms` }}
    >
      <div className={styles.meta}>
        <Monogram name={rumor.source?.name ?? 'Your club'} tone={rumor.source ? 'info' : 'accent'} />
        <span className={styles.byline}>
          <span className={styles.source}>
            {rumor.source ? `${rumor.source.name}, ${rumor.source.outlet}` : 'Official statement'}
          </span>
          {rumor.source && <span className={styles.reputation}>{rumor.source.reputation}</span>}
          <span className={styles.time}>{formatGameMoment(rumor.publishedAtGameHour)}</span>
        </span>
      </div>
      <span className={styles.status}>{status}</span>
      <p className={styles.claim}>{rumor.publicClaim}</p>
      <div className={styles.actions}>
        {player && <Link to={`/game/players/${player.id}`}>{player.name}</Link>}
        {!ownStatement && rumor.investigationState === 'UNINVESTIGATED' && (
          <button
            type="button"
            className={styles.button}
            disabled={!open || investigate.isPending}
            onClick={() => investigate.mutate(rumor.id)}
          >
            Investigate · {formatHours(INFORMATION_COSTS.investigateRumor)}
          </button>
        )}
      </div>
      {player && !ownStatement && (
        <MediaActions playerId={player.id} playerName={player.name} disabled={!open} />
      )}
      {investigate.isError && (
        <p className={styles.error} role="alert">
          {investigate.error.message}
        </p>
      )}
    </li>
  );
}
