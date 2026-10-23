import { Link, useParams } from 'react-router';
import { usePlayerProfile } from '../../api/games.ts';
import type { PlayerProfile } from '../../api/types.ts';
import { ShortlistControls } from '../../components/game/ShortlistControls.tsx';
import { Panel, QueryState } from '../../components/ui/Panel.tsx';
import { formatGameMoment, formatMoney, formatWage, humanize } from '../../lib/format.ts';
import { CONFIDENCE_TEXT, RELATIONSHIP_TEXT, SOURCE_TEXT, unknownTopics } from '../../lib/intelligence.ts';
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
  const unknown = unknownTopics(intelligence);

  return (
    <>
      <header className={styles.header}>
        <div>
          <h1 className={styles.name}>{player.name}</h1>
          <p className={styles.meta}>
            {player.position} · {player.age} · {player.nationality} · {club?.name ?? 'Unknown club'}
          </p>
        </div>
        <p className={styles.rating} aria-label={`Rating ${player.rating}`}>
          {player.rating}
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
                  <button type="button" className={styles.primary} disabled aria-describedby="contact-note">
                    Contact agent · 2 hours
                  </button>
                  <p id="contact-note" className={styles.muted}>
                    Agent negotiations open in the next update.
                  </p>
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

        <Panel title="Player Intelligence" className={styles.wide}>
          <div className={styles.intel}>
            <section aria-labelledby="known-title">
              <h3 id="known-title" className={styles.subhead}>
                Known
              </h3>
              {intelligence.length === 0 ? (
                <p className={styles.muted}>
                  Nothing discovered yet. Scouting and conversations reveal clues.
                </p>
              ) : (
                <ul className={styles.list}>
                  {intelligence.map((fact) => (
                    <li key={fact.id}>
                      <p className={styles.interpretation}>{fact.interpretation}</p>
                      <p className={styles.muted}>
                        <span className={styles.confidence} data-confidence={fact.confidence}>
                          {CONFIDENCE_TEXT[fact.confidence]}
                        </span>{' '}
                        · {SOURCE_TEXT[fact.sourceType] ?? humanize(fact.sourceType)} ·{' '}
                        {formatGameMoment(fact.discoveredAtGameHour)}
                      </p>
                    </li>
                  ))}
                </ul>
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
          </div>
        </Panel>
      </div>
    </>
  );
}
