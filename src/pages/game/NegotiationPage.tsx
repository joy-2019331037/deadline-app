import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { useGame, usePlayerProfile } from '../../api/games.ts';
import { isActiveNegotiation, useNegotiation, useNegotiationCommand } from '../../api/negotiations.ts';
import type { AgentMood, ContractTerms, GameStateDto, NegotiationView } from '../../api/types.ts';
import { Conversation, MessageComposer } from '../../components/negotiation/Conversation.tsx';
import { OfferBuilder } from '../../components/negotiation/OfferBuilder.tsx';
import { RivalInterest } from '../../components/intelligence/RivalInterest.tsx';
import { CommitmentList, PromiseControls } from '../../components/negotiation/Promises.tsx';
import { ClaimResponses, TacticButtons } from '../../components/negotiation/Tactics.tsx';
import { Panel, QueryState } from '../../components/ui/Panel.tsx';
import { Monogram } from '../../components/ui/primitives.tsx';
import { usePacedMessages } from '../../components/negotiation/usePacedMessages.ts';
import { ApiError } from '../../lib/api/client.ts';
import { formatGameMoment, humanize } from '../../lib/format.ts';
import { RELATIONSHIP_TEXT } from '../../lib/intelligence.ts';
import {
  ACTION_COSTS,
  describeExpiry,
  describeTerms,
  FAILURE_TITLES,
  MOOD_TEXT,
  STATUS_TEXT,
} from '../../lib/negotiation.ts';
import { serverErrorsToFields } from '../../lib/offerForm.ts';
import { useSettingsStore } from '../../stores/settingsStore.ts';
import styles from './NegotiationPage.module.css';

export function NegotiationPage() {
  const { negotiationId = '' } = useParams();
  const { data, isPending, error, refetch } = useNegotiation(negotiationId);
  const { data: gameData } = useGame();
  const notFound = error instanceof ApiError && error.code === 'NEGOTIATION_NOT_FOUND';

  return (
    <div className={styles.page}>
      <Link to="/game/negotiations" className={styles.back}>
        ← All negotiations
      </Link>
      {notFound ? (
        <p role="alert">This negotiation could not be found.</p>
      ) : (
        <QueryState
          isPending={isPending}
          error={error}
          onRetry={() => void refetch()}
          label="the negotiation"
        />
      )}
      {data && gameData && <Negotiation view={data} game={gameData.game} />}
    </div>
  );
}

function Negotiation({ view, game }: { view: NegotiationView; game: GameStateDto }) {
  const { negotiation, player, agent, club } = view;
  const command = useNegotiationCommand(negotiation.id);
  const rivalInterest = usePlayerProfile(player.id).data?.rivalInterest;
  const windowOpen = game.status === 'ACTIVE' && !game.clock.isWindowClosed;
  const open = windowOpen && isActiveNegotiation(negotiation.status);
  const expiry = open ? describeExpiry(negotiation.expiresAtGameHour, game.clock.elapsedHours) : null;
  const realisticReplies = useSettingsStore((state) => state.realisticReplies);
  const paced = usePacedMessages(view.messages, {
    enabled: realisticReplies,
    pending: command.isPending,
    mood: view.agentMood,
  });
  const outgoing =
    command.isPending && command.variables?.kind === 'message' ? command.variables.content : null;
  // Hold the rest of the table still while the agent is still "typing" a reply.
  const busy = command.isPending || paced.revealing;
  const lastKind = command.variables?.kind;
  const errorFor = (kind: string) => (command.isError && lastKind === kind ? command.error.message : null);

  return (
    <>
      <header className={styles.header} data-status={negotiation.status}>
        <div className={styles.headerMain}>
          <p className={styles.kicker} aria-hidden="true">
            <span className={styles.liveDot} />
            {open ? 'Live negotiation' : 'Negotiation closed'}
          </p>
          <h1 className={styles.title}>{player.name}</h1>
          <p className={styles.meta}>
            {player.position} · {player.age} · {club?.name ?? 'Unknown club'} ·{' '}
            <Link to={`/game/players/${player.id}`}>Profile</Link>
          </p>
        </div>
        <div className={styles.phase}>
          <p className={styles.status} data-status={negotiation.status}>
            {STATUS_TEXT[negotiation.status]}
          </p>
          {expiry && <p className={styles.expiry}>{expiry}</p>}
        </div>
      </header>

      <div className={styles.warRoom}>
        <div className={styles.dossier}>
          <Panel title="Agent">
            <div className={styles.agentHead}>
              <Monogram name={agent.name} tone="info" />
              <div>
                <p className={styles.agentName}>{agent.name}</p>
                <p className={styles.muted}>{agent.agency}</p>
              </div>
            </div>
            <p className={styles.reputation}>{agent.publicReputation}</p>
            <dl className={styles.facts}>
              <div>
                <dt>Relationship</dt>
                <dd data-status={agent.relationshipStatus}>{RELATIONSHIP_TEXT[agent.relationshipStatus]}</dd>
              </div>
              {open && (
                <div>
                  <dt>Mood</dt>
                  <dd data-mood={view.agentMood}>{MOOD_TEXT[view.agentMood].label}</dd>
                </div>
              )}
            </dl>
            {open && <MoodGauge mood={view.agentMood} />}
            {open && <p className={styles.muted}>{MOOD_TEXT[view.agentMood].description}</p>}
            {open && (
              <WalkAway
                pending={busy}
                error={errorFor('walk-away')}
                onConfirm={() => command.mutate({ kind: 'walk-away' })}
              />
            )}
          </Panel>

          {open && rivalInterest && <RivalInterest interest={rivalInterest} />}

          <Panel title="Agent claims">
            <ClaimResponses
              claims={view.claims}
              open={open}
              pending={busy}
              error={errorFor('call-bluff') ?? errorFor('ask-details')}
              onCallBluff={() => command.mutate({ kind: 'call-bluff' })}
              onAskDetails={() => command.mutate({ kind: 'ask-details' })}
            />
          </Panel>

          <Panel title="Promises">
            <CommitmentList promises={view.promises} />
            {open && (
              <PromiseControls
                playerName={player.name}
                promises={view.promises}
                pending={busy}
                error={errorFor('promise')}
                onConfirm={(promiseType) => command.mutate({ kind: 'promise', promiseType })}
              />
            )}
          </Panel>
        </div>

        <div className={styles.stage}>
          {!open && !paced.revealing && <Outcome view={view} windowOpen={windowOpen} />}

          <Panel title="Conversation" className={styles.conversation} tone={open ? 'live' : 'default'}>
            <Conversation
              messages={paced.visible}
              agentName={agent.name}
              typing={paced.typing}
              outgoing={outgoing}
            />
            {open && (
              <MessageComposer
                agentName={agent.name}
                pending={busy}
                error={errorFor('message')}
                onSend={(content) => command.mutateAsync({ kind: 'message', content })}
              />
            )}
          </Panel>
        </div>

        {open && (
          <div className={styles.desk}>
            <Panel title="Make an offer">
              <LatestCounters view={view} />
              <OfferBuilder
                key={negotiation.version}
                initialTerms={
                  negotiation.proposedTerms ?? negotiation.offers.at(-1)?.terms ?? defaultTerms(view)
                }
                proposedTerms={negotiation.proposedTerms}
                context={{
                  playerAge: player.age,
                  transferBudget: game.budgets.transfer,
                  wageBudget: game.budgets.wage,
                }}
                pending={busy}
                serverErrors={
                  lastKind === 'offer' && command.error instanceof ApiError
                    ? serverErrorsToFields(command.error.details)
                    : {}
                }
                serverMessage={errorFor('offer')}
                onSubmit={(terms) => command.mutate({ kind: 'offer', terms })}
              />
            </Panel>

            <Panel title="Tactics">
              <TacticButtons
                pending={busy}
                error={errorFor('tactic')}
                onTactic={(tactic) => command.mutate({ kind: 'tactic', tactic })}
              />
            </Panel>
          </div>
        )}
      </div>

      {negotiation.offers.length > 0 && (
        <Panel title="Offer history">
          <ol className={styles.history}>
            {[...negotiation.offers].reverse().map((offer) => (
              <li key={offer.id}>
                <span className={styles.historyTime}>{formatGameMoment(offer.submittedAtGameHour)}</span>
                <span className={styles.historyTerms}>{describeTerms(offer.terms).join(' · ')}</span>
                <span className={styles.outcome} data-outcome={offer.outcome}>
                  {humanize(offer.outcome)}
                </span>
              </li>
            ))}
          </ol>
        </Panel>
      )}
    </>
  );
}

const CONFETTI = Array.from({ length: 28 }, (_, index) => index);

const MOOD_LEVEL: Record<AgentMood, number> = { RECEPTIVE: 3, IMPATIENT: 2, EXASPERATED: 1 };

function MoodGauge({ mood }: { mood: AgentMood }) {
  return (
    <div className={styles.gauge} data-mood={mood} aria-hidden="true">
      {[1, 2, 3].map((level) => (
        <span key={level} data-on={level <= MOOD_LEVEL[mood] || undefined} />
      ))}
    </div>
  );
}
function defaultTerms(view: NegotiationView): ContractTerms {
  return {
    transferFee: view.player.marketValue,
    weeklyWage: 0,
    contractYears: 4,
    signingBonus: 0,
    goalBonus: 0,
    appearanceBonus: 0,
    loyaltyBonus: 0,
    releaseClause: null,
    squadRole: 'STARTER',
    captaincy: false,
  };
}

function LatestCounters({ view }: { view: NegotiationView }) {
  const club = view.negotiation.counteroffers.findLast((counter) => counter.fromParty === 'SELLING_CLUB');
  const agent = view.negotiation.counteroffers.findLast((counter) => counter.fromParty === 'AGENT');
  if (!club && !agent) {
    return <p className={styles.muted}>No counteroffers yet. Your first offer sets the tone.</p>;
  }
  return (
    <dl className={styles.counters}>
      {club && (
        <div>
          <dt>{view.club?.name ?? 'Selling club'} want</dt>
          <dd>{describeTerms(club.terms)[0]}</dd>
        </div>
      )}
      {agent && (
        <div>
          <dt>{view.agent.name} wants</dt>
          <dd>{describeTerms(agent.terms).slice(1).join(' · ')}</dd>
        </div>
      )}
    </dl>
  );
}

function Outcome({ view, windowOpen }: { view: NegotiationView; windowOpen: boolean }) {
  const { negotiation } = view;
  if (negotiation.status === 'COMPLETED' && negotiation.agreedTerms) {
    return (
      <Panel title="Deal complete" className={styles.celebration} tone="success">
        <span className={styles.confetti} aria-hidden="true">
          {CONFETTI.map((piece) => (
            <span
              key={piece}
              style={{
                left: `${(piece * 37) % 100}%`,
                animationDelay: `${(piece % 7) * 90}ms`,
                animationDuration: `${1400 + (piece % 5) * 220}ms`,
              }}
            />
          ))}
        </span>
        <span className={styles.stamp} aria-hidden="true">
          Here we go!
        </span>
        <p className={styles.success}>{view.player.name} has signed for your club.</p>
        <p>{describeTerms(negotiation.agreedTerms).join(' · ')}</p>
        <Link to="/game/squad">View your squad</Link>
      </Panel>
    );
  }
  const title = negotiation.failureReason ? FAILURE_TITLES[negotiation.failureReason] : 'Talks closed';
  const narrative =
    view.outcomeNarrative ?? (windowOpen ? 'These talks are over.' : 'The transfer window has closed.');
  return (
    <Panel title={title} className={styles.wide}>
      <p className={styles.narrative}>{narrative}</p>
      <Link to="/game/market">Back to the market</Link>
    </Panel>
  );
}

function WalkAway({
  pending,
  error,
  onConfirm,
}: {
  pending: boolean;
  error: string | null;
  onConfirm: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button type="button" className={styles.danger} onClick={() => setConfirming(true)}>
        Walk away · {ACTION_COSTS.walkAway} hour
      </button>
    );
  }
  return (
    <div className={styles.confirm} role="group" aria-label="Confirm walking away">
      <p>Walking away ends these talks for good.</p>
      <div className={styles.confirmActions}>
        <button type="button" className={styles.danger} disabled={pending} onClick={onConfirm}>
          Yes, walk away
        </button>
        <button type="button" className={styles.secondary} onClick={() => setConfirming(false)}>
          Keep talking
        </button>
      </div>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
