import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { useGame, usePlayerProfile } from '../../api/games.ts';
import { isActiveNegotiation, useNegotiation, useNegotiationCommand } from '../../api/negotiations.ts';
import type { ContractTerms, GameStateDto, NegotiationView } from '../../api/types.ts';
import { Conversation, MessageComposer } from '../../components/negotiation/Conversation.tsx';
import { OfferBuilder } from '../../components/negotiation/OfferBuilder.tsx';
import { RivalInterest } from '../../components/intelligence/RivalInterest.tsx';
import { CommitmentList, PromiseControls } from '../../components/negotiation/Promises.tsx';
import { ClaimResponses, TacticButtons } from '../../components/negotiation/Tactics.tsx';
import { Panel, QueryState } from '../../components/ui/Panel.tsx';
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
  const lastKind = command.variables?.kind;
  const errorFor = (kind: string) => (command.isError && lastKind === kind ? command.error.message : null);

  return (
    <>
      <header className={styles.header}>
        <div>
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
          {expiry && <p className={styles.muted}>{expiry}</p>}
        </div>
      </header>

      <div className={styles.grid}>
        <Panel title="Agent">
          <p className={styles.agentName}>{agent.name}</p>
          <p className={styles.muted}>{agent.agency}</p>
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
          {open && <p className={styles.muted}>{MOOD_TEXT[view.agentMood].description}</p>}
          {open && (
            <WalkAway
              pending={command.isPending}
              error={errorFor('walk-away')}
              onConfirm={() => command.mutate({ kind: 'walk-away' })}
            />
          )}
        </Panel>

        <Panel title="Conversation" className={styles.conversation}>
          <Conversation messages={view.messages} agentName={agent.name} />
          {open && (
            <MessageComposer
              agentName={agent.name}
              pending={command.isPending}
              error={errorFor('message')}
              onSend={(content) => command.mutateAsync({ kind: 'message', content })}
            />
          )}
        </Panel>

        {!open && <Outcome view={view} windowOpen={windowOpen} />}

        <Panel title="Promises">
          <CommitmentList promises={view.promises} />
          {open && (
            <PromiseControls
              playerName={player.name}
              promises={view.promises}
              pending={command.isPending}
              error={errorFor('promise')}
              onConfirm={(promiseType) => command.mutate({ kind: 'promise', promiseType })}
            />
          )}
        </Panel>

        {open && rivalInterest && <RivalInterest interest={rivalInterest} />}

        <Panel title="Agent claims">
          <ClaimResponses
            claims={view.claims}
            open={open}
            pending={command.isPending}
            error={errorFor('call-bluff') ?? errorFor('ask-details')}
            onCallBluff={() => command.mutate({ kind: 'call-bluff' })}
            onAskDetails={() => command.mutate({ kind: 'ask-details' })}
          />
        </Panel>

        {open && (
          <Panel title="Tactics" className={styles.wide}>
            <TacticButtons
              pending={command.isPending}
              error={errorFor('tactic')}
              onTactic={(tactic) => command.mutate({ kind: 'tactic', tactic })}
            />
          </Panel>
        )}

        {open && (
          <Panel title="Make an offer" className={styles.wide}>
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
              pending={command.isPending}
              serverErrors={
                lastKind === 'offer' && command.error instanceof ApiError
                  ? serverErrorsToFields(command.error.details)
                  : {}
              }
              serverMessage={errorFor('offer')}
              onSubmit={(terms) => command.mutate({ kind: 'offer', terms })}
            />
          </Panel>
        )}

        {negotiation.offers.length > 0 && (
          <Panel title="Offer history" className={styles.wide}>
            <ol className={styles.history}>
              {[...negotiation.offers].reverse().map((offer) => (
                <li key={offer.id}>
                  <span className={styles.historyTime}>{formatGameMoment(offer.submittedAtGameHour)}</span>
                  <span>{describeTerms(offer.terms).join(' · ')}</span>
                  <span className={styles.outcome} data-outcome={offer.outcome}>
                    {humanize(offer.outcome)}
                  </span>
                </li>
              ))}
            </ol>
          </Panel>
        )}
      </div>
    </>
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
      <Panel title="Deal complete" className={styles.wide}>
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
