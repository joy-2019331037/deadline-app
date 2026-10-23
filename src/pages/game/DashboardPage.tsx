import { Fragment } from 'react';
import { Link } from 'react-router';
import { useGame, useGameAction, useGameEvents, useSquad } from '../../api/games.ts';
import type { GameStateDto } from '../../api/types.ts';
import { Panel, QueryState } from '../../components/ui/Panel.tsx';
import { AnimatedNumber, Button } from '../../components/ui/primitives.tsx';
import { urgencyOf } from '../../lib/urgency.ts';
import {
  formatClockTime,
  formatGameMoment,
  formatHours,
  formatMoney,
  formatRemaining,
  formatWage,
  humanize,
} from '../../lib/format.ts';
import {
  describeEvent,
  EVENT_KIND_LABEL,
  eventKind,
  STRENGTH_TEXT,
  WEAKNESS_TEXT,
} from '../../lib/labels.ts';
import { PROMISE_INFO, PROMISE_STATUS_TEXT, STATUS_TEXT } from '../../lib/negotiation.ts';
import { isActiveNegotiation, useNegotiations, usePromises } from '../../api/negotiations.ts';
import styles from './DashboardPage.module.css';

const WAIT_OPTIONS = [6, 24];

export function DashboardPage() {
  const { data } = useGame();
  if (!data) return null;
  const { game } = data;

  return (
    <div className={styles.page}>
      <h1 className={styles.visuallyHidden}>Dashboard</h1>
      <Countdown game={game} />
      <div className={styles.grid}>
        <BudgetsPanel game={game} />
        <ClubPanel game={game} />
        <SquadPanel />
        <NegotiationsPanel game={game} />
        <CommitmentsPanel />
        <EventsPanel />
      </div>
    </div>
  );
}

function Countdown({ game }: { game: GameStateDto }) {
  const action = useGameAction();
  const { clock } = game;
  const closed = clock.isWindowClosed || game.status === 'COMPLETED';

  const remaining = closed ? 0 : clock.remainingHours;
  const totalHours = clock.windowLengthDays * 24;
  const elapsedPercent = Math.min(100, (clock.elapsedHours / totalHours) * 100);
  const segments = [
    { value: Math.floor(remaining / 24), unit: 'Days' },
    { value: remaining % 24, unit: 'Hrs' },
  ];

  return (
    <section
      className={styles.countdown}
      data-deadline={clock.isDeadlineDay || undefined}
      data-urgency={closed ? 'closed' : urgencyOf(clock.remainingHours)}
      aria-labelledby="countdown-title"
    >
      <div className={styles.countdownMain}>
        <p className={styles.kicker} aria-hidden="true">
          <span className={styles.liveDot} />
          {closed ? 'Full time' : clock.isDeadlineDay ? 'Deadline day' : 'Transfer window live'}
        </p>
        <h2 id="countdown-title" className={styles.day}>
          DAY {clock.day} OF {clock.windowLengthDays}
        </h2>
        <p className={styles.remaining}>{closed ? 'WINDOW CLOSED' : formatRemaining(clock.remainingHours)}</p>
        <p className={styles.time}>Current time {formatClockTime(clock.hour)}</p>
      </div>
      <div className={styles.segments} aria-hidden="true">
        {segments.map((segment, index) => (
          <Fragment key={segment.unit}>
            {index > 0 && <span className={styles.colon}>:</span>}
            <span className={styles.segment}>
              <span className={styles.digits}>{String(segment.value).padStart(2, '0')}</span>
              <span className={styles.unit}>{segment.unit}</span>
            </span>
          </Fragment>
        ))}
      </div>
      {!closed && (
        <div className={styles.wait} role="group" aria-label="Advance time">
          {WAIT_OPTIONS.map((hours) => (
            <Button
              key={hours}
              variant={hours === WAIT_OPTIONS[0] ? 'secondary' : 'primary'}
              disabled={action.isPending}
              onClick={() => action.mutate({ type: 'WAIT', hours })}
            >
              Wait {formatHours(hours)}
            </Button>
          ))}
        </div>
      )}
      <div className={styles.progress} aria-hidden="true">
        <span style={{ width: `${elapsedPercent}%` }} />
      </div>
      {action.isError && (
        <p className={styles.actionError} role="alert">
          {action.error.message}
        </p>
      )}
    </section>
  );
}

function BudgetsPanel({ game }: { game: GameStateDto }) {
  const { budgets } = game;
  return (
    <Panel title="Budgets">
      <dl className={styles.figures}>
        <div className={styles.figure}>
          <dt>Transfer budget</dt>
          <dd>
            <AnimatedNumber value={budgets.transfer} format={formatMoney} />
          </dd>
        </div>
        <div className={styles.figure}>
          <dt>Wage budget</dt>
          <dd>
            <AnimatedNumber value={budgets.wage} format={formatWage} />
          </dd>
        </div>
      </dl>
    </Panel>
  );
}

function ClubPanel({ game }: { game: GameStateDto }) {
  const objectives = [...game.boardObjectives].sort((a, b) => b.priority - a.priority);
  return (
    <Panel title="Board objectives">
      {game.club && (
        <p className={styles.muted}>
          {game.club.name} · {game.club.league}
        </p>
      )}
      <ul className={styles.list}>
        {objectives.map((objective) => (
          <li key={objective.key} className={styles.objective}>
            <span>{objective.description}</span>
            <span className={styles.tag} data-status={objective.status}>
              {humanize(objective.status)}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function SquadPanel() {
  const { data, isPending, error, refetch } = useSquad();
  return (
    <Panel title="Squad">
      <QueryState isPending={isPending} error={error} onRetry={() => void refetch()} label="squad analysis" />
      {data && (
        <>
          <dl className={styles.ratings}>
            {(['attack', 'midfield', 'defence', 'depth'] as const).map((area) => (
              <div key={area}>
                <dt>{humanize(area)}</dt>
                <dd data-strength={data.analysis.ratings[area]}>
                  {STRENGTH_TEXT[data.analysis.ratings[area]]}
                </dd>
              </div>
            ))}
            <div>
              <dt>Age profile</dt>
              <dd>{humanize(data.analysis.ratings.ageProfile)}</dd>
            </div>
          </dl>
          {data.analysis.weaknesses.length > 0 && (
            <ul className={styles.weaknesses} aria-label="Squad weaknesses">
              {data.analysis.weaknesses.map((weakness) => (
                <li key={weakness}>{WEAKNESS_TEXT[weakness]}</li>
              ))}
            </ul>
          )}
          <Link to="/game/squad">Full squad analysis</Link>
        </>
      )}
    </Panel>
  );
}

function NegotiationsPanel({ game }: { game: GameStateDto }) {
  const { data } = useNegotiations();
  const active = data?.negotiations.filter((negotiation) => isActiveNegotiation(negotiation.status)) ?? [];

  return (
    <Panel title="Active negotiations" tone={game.activeNegotiationIds.length > 0 ? 'live' : 'default'}>
      {game.activeNegotiationIds.length === 0 ? (
        <p className={styles.muted}>
          No active negotiations. {game.shortlist.length > 0 ? 'Your shortlist is waiting. ' : ''}
          <Link to="/game/market">Find a target</Link>
        </p>
      ) : (
        <ul className={styles.list}>
          {active.map((negotiation) => (
            <li key={negotiation.id} className={styles.talk}>
              <span className={styles.talkPulse} aria-hidden="true" />
              <Link to={`/game/negotiations/${negotiation.id}`}>
                {data?.players.find((player) => player.id === negotiation.playerId)?.name ?? 'Negotiation'}
              </Link>
              <span className={styles.tag} data-status="LIVE">
                {STATUS_TEXT[negotiation.status]}
              </span>
            </li>
          ))}
        </ul>
      )}
      {game.shortlist.length > 0 && (
        <p className={styles.muted}>{game.shortlist.length} players on your shortlist.</p>
      )}
    </Panel>
  );
}

function CommitmentsPanel() {
  const { data } = usePromises();
  const promises = data?.promises.filter((promise) => promise.status !== 'VOID') ?? [];
  return (
    <Panel title="Commitments">
      {promises.length === 0 ? (
        <p className={styles.muted}>No promises made yet.</p>
      ) : (
        <ul className={styles.list}>
          {promises.map((promise) => (
            <li key={promise.id} className={styles.objective}>
              <span>
                {data?.players.find((player) => player.id === promise.playerId)?.name}:{' '}
                {PROMISE_INFO[promise.promiseType].label}
              </span>
              <span
                className={styles.tag}
                data-status={
                  promise.status === 'FULFILLED' ? 'MET' : promise.status === 'BROKEN' ? 'FAILED' : undefined
                }
              >
                {PROMISE_STATUS_TEXT[promise.status]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function EventsPanel() {
  const { data, isPending, error, refetch } = useGameEvents();
  return (
    <Panel title="Recent events" className={styles.wide}>
      <QueryState isPending={isPending} error={error} onRetry={() => void refetch()} label="events" />
      {data && data.events.length === 0 && <p className={styles.muted}>Nothing has happened yet.</p>}
      {data && data.events.length > 0 && (
        <ol className={styles.events}>
          {data.events.map((event) => (
            <li key={event.id} className={styles.event} data-kind={eventKind(event.eventType)}>
              <span className={styles.eventKind} aria-hidden="true">
                {EVENT_KIND_LABEL[eventKind(event.eventType)]}
              </span>
              <span className={styles.eventTime}>{formatGameMoment(event.createdAtGameHour)}</span>
              <span className={styles.eventText}>{describeEvent(event)}</span>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}
