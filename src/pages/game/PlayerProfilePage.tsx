import { Link, useParams } from 'react-router';
import { useGame, usePlayerProfile } from '../../api/games.ts';
import type { PlayerProfile } from '../../api/types.ts';
import { ShortlistControls } from '../../components/game/ShortlistControls.tsx';
import { GatherIntelligence } from '../../components/intelligence/GatherIntelligence.tsx';
import { IntelligencePanel } from '../../components/intelligence/IntelligencePanel.tsx';
import { RivalInterest } from '../../components/intelligence/RivalInterest.tsx';
import { MediaActions } from '../../components/media/MediaActions.tsx';
import { ContactAgent } from '../../components/negotiation/ContactAgent.tsx';
import { Panel, QueryState } from '../../components/ui/Panel.tsx';
import { Badge } from '../../components/ui/primitives.tsx';
import { AVAILABILITY_TONES, positionTone, ratingTone } from '../../lib/positions.ts';
import { formatMoney, formatWage, humanize } from '../../lib/format.ts';
import { RELATIONSHIP_TEXT } from '../../lib/intelligence.ts';
import styles from './PlayerProfilePage.module.css';

export function PlayerProfilePage() {
  const { playerId = '' } = useParams();
  const { data, isPending, error, refetch } = usePlayerProfile(playerId);

  return (
    <div className={styles.page}>
      <Link to="/game/market" className={styles.back}>
        ← Back to the market
      </Link>
      {error && 'code' in error && error.code === 'PLAYER_NOT_FOUND' ? (
        <p role="alert">This player could not be found.</p>
      ) : (
        <QueryState isPending={isPending} error={error} onRetry={() => void refetch()} label="the player" />
      )}
      {data && <Profile profile={data} />}
    </div>
  );
}

function Profile({ profile }: { profile: PlayerProfile }) {
  const { player, club, agent, intelligence } = profile;
  const game = useGame().data?.game;
  const elapsedHours = game?.clock.elapsedHours ?? 0;
  const windowOpen = game?.status === 'ACTIVE' && !game.clock.isWindowClosed;

  return (
    <>
      <header className={styles.hero} data-tone={ratingTone(player.rating)}>
        <div className={styles.card} aria-hidden="true">
          <span className={styles.cardRating}>{player.rating}</span>
          <span className={styles.cardPosition}>{player.position}</span>
          <span className={styles.cardInitials}>
            {player.name
              .split(' ')
              .map((part) => part[0])
              .join('')}
          </span>
        </div>
        <div className={styles.heroText}>
          <p className={styles.kicker} aria-hidden="true">
            {profile.isOwnPlayer ? 'Your squad' : 'Transfer target'}
          </p>
          <h1 className={styles.name}>{player.name}</h1>
          <p className={styles.meta}>
            {player.position} · {player.age} · {player.nationality} · {club?.name ?? 'Unknown club'}
          </p>
          <div className={styles.heroBadges}>
            <Badge tone={positionTone(player.position)}>{player.position}</Badge>
            <Badge tone={AVAILABILITY_TONES[player.availabilityState]}>
              {humanize(player.availabilityState)}
            </Badge>
            <span className={styles.heroValue} aria-hidden="true">
              {formatMoney(player.marketValue)}
            </span>
          </div>
        </div>
        <p className={styles.rating} aria-label={`Rating ${player.rating}`}>
          {player.rating}
          <span className={styles.ratingLabel} aria-hidden="true">
            OVR
          </span>
        </p>
      </header>
      <div className={styles.grid}>
        <Panel title="Profile">
          <dl className={styles.facts}>
            <div>
              <dt>Playing style</dt>
              <dd>{player.playingStyle}</dd>
            </div>
            <div>
              <dt>Contract remaining</dt>
              <dd>
                {player.contractYearsRemaining} year{player.contractYearsRemaining === 1 ? '' : 's'}
              </dd>
            </div>
            <div>
              <dt>Estimated value</dt>
              <dd>{formatMoney(player.marketValue)}</dd>
            </div>
            {'weeklyWage' in player && (
              <div>
                <dt>Current wage</dt>
                <dd>{formatWage(player.weeklyWage)}</dd>
              </div>
            )}
            <div>
              <dt>Status</dt>
              <dd>{humanize(player.availabilityState)}</dd>
            </div>
          </dl>
        </Panel>

        <Panel title="Key statistics">
          <dl className={styles.stats}>
            <div>
              <dt>Appearances</dt>
              <dd>{player.stats.appearances}</dd>
            </div>
            <div>
              <dt>Goals</dt>
              <dd>{player.stats.goals}</dd>
            </div>
            <div>
              <dt>Assists</dt>
              <dd>{player.stats.assists}</dd>
            </div>
            <div>
              <dt>Clean sheets</dt>
              <dd>{player.stats.cleanSheets}</dd>
            </div>
          </dl>
        </Panel>

        <Panel title="Agent">
          {agent ? (
            <>
              <p className={styles.agentName}>{agent.name}</p>
              <p className={styles.muted}>{agent.agency}</p>
              <p>{agent.publicReputation}</p>
              <p>
                Relationship:{' '}
                <span className={styles.relationship} data-status={agent.relationshipStatus}>
                  {RELATIONSHIP_TEXT[agent.relationshipStatus]}
                </span>
              </p>
              {!profile.isOwnPlayer && (
                <div className={styles.contact}>
                  <ContactAgent playerId={player.id} />
                </div>
              )}
            </>
          ) : (
            <p className={styles.muted}>Agent unknown.</p>
          )}
        </Panel>

        {!profile.isOwnPlayer && (
          <Panel title="Shortlist">
            <ShortlistControls
              playerId={player.id}
              playerName={player.name}
              priority={profile.shortlistPriority}
            />
          </Panel>
        )}

        {!profile.isOwnPlayer && (
          <GatherIntelligence
            playerId={player.id}
            playerName={player.name}
            clubId={club && !club.isUserClub ? club.id : null}
            clubName={club?.name ?? null}
          />
        )}

        {!profile.isOwnPlayer && <RivalInterest interest={profile.rivalInterest} />}

        {!profile.isOwnPlayer && (
          <Panel title="Media">
            <MediaActions playerId={player.id} playerName={player.name} disabled={!windowOpen} />
          </Panel>
        )}

        <IntelligencePanel
          facts={intelligence}
          clubFacts={profile.clubIntelligence}
          clubName={club?.name ?? null}
          elapsedHours={elapsedHours}
          className={styles.wide}
        />
      </div>
    </>
  );
}
