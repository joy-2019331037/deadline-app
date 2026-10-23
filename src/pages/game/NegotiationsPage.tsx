import { Link } from 'react-router';
import { useGame } from '../../api/games.ts';
import { isActiveNegotiation, useNegotiations } from '../../api/negotiations.ts';
import type { NegotiationDto, NegotiationList } from '../../api/types.ts';
import { PageHeader } from '../../components/ui/PageHeader.tsx';
import { Panel, QueryState } from '../../components/ui/Panel.tsx';
import { Monogram } from '../../components/ui/primitives.tsx';
import { describeExpiry, FAILURE_TITLES, STATUS_TEXT } from '../../lib/negotiation.ts';
import styles from './NegotiationsPage.module.css';

export function NegotiationsPage() {
  const { data, isPending, error, refetch } = useNegotiations();
  const active = data?.negotiations.filter((n) => isActiveNegotiation(n.status)) ?? [];
  const closed = data?.negotiations.filter((n) => !isActiveNegotiation(n.status)) ?? [];

  return (
    <div className={styles.page}>
      <PageHeader
        kicker="Phone lines"
        title="Negotiations"
        meta={
          data && (
            <span className={styles.count}>
              {active.length} live · {closed.length} finished
            </span>
          )
        }
      />
      <QueryState isPending={isPending} error={error} onRetry={() => void refetch()} label="negotiations" />
      {data && (
        <>
          <Panel title="In progress" tone={active.length > 0 ? 'live' : 'default'}>
            {active.length === 0 ? (
              <p className={styles.muted}>
                No talks in progress. <Link to="/game/market">Find a target</Link> and contact their agent.
              </p>
            ) : (
              <NegotiationRows negotiations={active} list={data} />
            )}
          </Panel>
          {closed.length > 0 && (
            <Panel title="Finished">
              <NegotiationRows negotiations={closed} list={data} />
            </Panel>
          )}
        </>
      )}
    </div>
  );
}

function NegotiationRows({ negotiations, list }: { negotiations: NegotiationDto[]; list: NegotiationList }) {
  const { data: gameData } = useGame();
  const elapsed = gameData?.game.clock.elapsedHours ?? 0;

  return (
    <ul className={styles.rows}>
      {negotiations.map((negotiation) => {
        const player = list.players.find((p) => p.id === negotiation.playerId);
        const agent = list.agents.find((a) => a.id === negotiation.agentId);
        const detail = isActiveNegotiation(negotiation.status)
          ? describeExpiry(negotiation.expiresAtGameHour, elapsed)
          : negotiation.failureReason
            ? FAILURE_TITLES[negotiation.failureReason]
            : null;
        return (
          <li key={negotiation.id} className={styles.row} data-status={negotiation.status}>
            <Monogram name={player?.name ?? '?'} tone="info" />
            <span className={styles.who}>
              <Link to={`/game/negotiations/${negotiation.id}`} className={styles.player}>
                {player?.name ?? 'Unknown player'}
              </Link>
              <span className={styles.muted}>{agent?.name}</span>
            </span>
            <span className={styles.status} data-status={negotiation.status}>
              {STATUS_TEXT[negotiation.status]}
            </span>
            {detail && <span className={styles.muted}>{detail}</span>}
          </li>
        );
      })}
    </ul>
  );
}
