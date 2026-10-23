import { Link } from 'react-router';
import { useGame, useSquad } from '../../api/games.ts';
import type { Position, SquadPlayerDto, StrengthLabel } from '../../api/types.ts';
import { PageHeader } from '../../components/ui/PageHeader.tsx';
import { Panel, QueryState } from '../../components/ui/Panel.tsx';
import { Badge, StatBar, type Tone } from '../../components/ui/primitives.tsx';
import { positionTone, ratingTone } from '../../lib/positions.ts';
import { formatMoney, formatWage, humanize } from '../../lib/format.ts';
import { STRENGTH_TEXT, WEAKNESS_TEXT } from '../../lib/labels.ts';
import styles from './SquadPage.module.css';

const GROUPS: { label: string; positions: Position[] }[] = [
  { label: 'Goalkeepers', positions: ['GK'] },
  { label: 'Defenders', positions: ['LB', 'CB', 'RB'] },
  { label: 'Midfielders', positions: ['DM', 'CM', 'AM'] },
  { label: 'Attackers', positions: ['LW', 'RW', 'ST'] },
];

const AREAS = ['attack', 'midfield', 'defence', 'depth'] as const;

const STRENGTH_SCORE: Record<StrengthLabel, number> = {
  POOR: 1,
  WEAK: 2,
  AVERAGE: 3,
  STRONG: 4,
  EXCELLENT: 5,
};

const STRENGTH_TONE: Record<StrengthLabel, Tone> = {
  POOR: 'danger',
  WEAK: 'danger',
  AVERAGE: 'warning',
  STRONG: 'success',
  EXCELLENT: 'success',
};

export function SquadPage() {
  const { data: gameData } = useGame();
  const { data, isPending, error, refetch } = useSquad();

  return (
    <div className={styles.page}>
      <PageHeader
        kicker="Dressing room"
        title="Squad Analysis"
        meta={data && <span className={styles.count}>{data.players.length} senior players</span>}
      />
      <QueryState isPending={isPending} error={error} onRetry={() => void refetch()} label="your squad" />
      {data && gameData && (
        <>
          <div className={styles.summary}>
            <Panel title="Strengths">
              <dl className={styles.ratings}>
                {AREAS.map((area) => (
                  <div key={area} className={styles.strength}>
                    <dt>{humanize(area)}</dt>
                    <StatBar
                      value={STRENGTH_SCORE[data.analysis.ratings[area]]}
                      max={5}
                      tone={STRENGTH_TONE[data.analysis.ratings[area]]}
                    />
                    <dd data-strength={data.analysis.ratings[area]}>
                      {STRENGTH_TEXT[data.analysis.ratings[area]]}
                    </dd>
                  </div>
                ))}
                <div>
                  <dt>Age profile</dt>
                  <dd>
                    {humanize(data.analysis.ratings.ageProfile)} (XI avg {data.analysis.startingAverageAge})
                  </dd>
                </div>
              </dl>
            </Panel>

            <Panel title="Weaknesses">
              {data.analysis.weaknesses.length === 0 ? (
                <p className={styles.muted}>No major weaknesses identified.</p>
              ) : (
                <ul className={styles.weaknesses}>
                  {data.analysis.weaknesses.map((weakness) => (
                    <li key={weakness}>{WEAKNESS_TEXT[weakness]}</li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title="Wages and contracts">
              <dl className={styles.ratings}>
                <div>
                  <dt>Weekly wage bill</dt>
                  <dd>{formatWage(data.analysis.wages.totalWeekly)}</dd>
                </div>
                <div>
                  <dt>Highest earner</dt>
                  <dd>{formatWage(data.analysis.wages.highestWeekly)}</dd>
                </div>
                <div>
                  <dt>Wage budget for signings</dt>
                  <dd>{formatWage(gameData.game.budgets.wage)}</dd>
                </div>
                <div>
                  <dt>Contracts expiring within a year</dt>
                  <dd>{data.analysis.contracts.expiringPlayerIds.length}</dd>
                </div>
              </dl>
            </Panel>

            <Panel title="Board priorities">
              <ol className={styles.priorities}>
                {[...gameData.game.boardObjectives]
                  .sort((a, b) => b.priority - a.priority)
                  .map((objective) => (
                    <li key={objective.key}>{objective.description}</li>
                  ))}
              </ol>
            </Panel>
          </div>

          {GROUPS.map((group) => (
            <PositionGroup
              key={group.label}
              label={group.label}
              players={data.players.filter((player) => group.positions.includes(player.position))}
              starters={new Set(data.analysis.startingElevenIds)}
              expiring={new Set(data.analysis.contracts.expiringPlayerIds)}
            />
          ))}
        </>
      )}
    </div>
  );
}

interface PositionGroupProps {
  label: string;
  players: SquadPlayerDto[];
  starters: Set<string>;
  expiring: Set<string>;
}

function PositionGroup({ label, players, starters, expiring }: PositionGroupProps) {
  return (
    <Panel title={`${label} (${players.length})`}>
      {players.length === 0 ? (
        <p className={styles.muted}>No players in this group.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Player</th>
                <th scope="col">Pos</th>
                <th scope="col">Age</th>
                <th scope="col">Rating</th>
                <th scope="col">Wage</th>
                <th scope="col">Contract</th>
                <th scope="col">Value</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player) => (
                <tr key={player.id}>
                  <th scope="row">
                    <Link to={`/game/players/${player.id}`}>{player.name}</Link>
                    {starters.has(player.id) && <span className={styles.badge}>Starter</span>}
                  </th>
                  <td>
                    <Badge tone={positionTone(player.position)}>{player.position}</Badge>
                  </td>
                  <td className={styles.num}>{player.age}</td>
                  <td>
                    <span className={styles.rating}>
                      <span className={styles.num}>{player.rating}</span>
                      <StatBar value={player.rating - 50} max={45} tone={ratingTone(player.rating)} />
                    </span>
                  </td>
                  <td className={styles.num}>{formatWage(player.weeklyWage)}</td>
                  <td data-expiring={expiring.has(player.id) || undefined}>
                    {player.contractYearsRemaining} yr{player.contractYearsRemaining === 1 ? '' : 's'}
                  </td>
                  <td className={styles.num}>{formatMoney(player.marketValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
