import type { FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useGame, useMarket } from '../../api/games.ts';
import { POSITIONS, type ClubDto, type PlayerDto, type ShortlistEntryDto } from '../../api/types.ts';
import { ShortlistControls } from '../../components/game/ShortlistControls.tsx';
import { PageHeader } from '../../components/ui/PageHeader.tsx';
import { Panel, QueryState } from '../../components/ui/Panel.tsx';
import { Badge, StatBar } from '../../components/ui/primitives.tsx';
import { AVAILABILITY_TONES, positionTone, ratingTone } from '../../lib/positions.ts';
import { formatMoney, humanize } from '../../lib/format.ts';
import { MARKET_SORTS, readFilters } from './marketFilters.ts';
import styles from './MarketPage.module.css';

export function MarketPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = readFilters(searchParams);
  const market = useMarket(filters);
  const allTargets = useMarket({});
  const { data: gameData } = useGame();
  const shortlist = gameData?.game.shortlist ?? [];

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = new URLSearchParams();
    for (const [key, value] of new FormData(event.currentTarget)) {
      if (typeof value === 'string' && value.trim() !== '') next.set(key, value.trim());
    }
    setSearchParams(next);
  };

  const clubsById = new Map<string, ClubDto>(
    [...(allTargets.data?.clubs ?? []), ...(market.data?.clubs ?? [])].map((club) => [club.id, club]),
  );

  return (
    <div className={styles.page}>
      <PageHeader
        kicker="Scouting network"
        title="Transfer Market"
        meta={
          market.data && (
            <span className={styles.count}>
              {market.data.players.length} players match · {shortlist.length} shortlisted
            </span>
          )
        }
      />

      <div className={styles.layout}>
        <div className={styles.main}>
          <form
            key={searchParams.toString()}
            className={styles.filters}
            onSubmit={onSubmit}
            aria-label="Market filters"
          >
            <label>
              Name
              <input name="search" type="search" maxLength={50} defaultValue={filters.search ?? ''} />
            </label>
            <label>
              Position
              <select name="position" defaultValue={filters.position ?? ''}>
                <option value="">Any</option>
                {POSITIONS.map((position) => (
                  <option key={position} value={position}>
                    {position}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Min age
              <input name="minAge" type="number" min={15} max={45} defaultValue={filters.minAge ?? ''} />
            </label>
            <label>
              Max age
              <input name="maxAge" type="number" min={15} max={45} defaultValue={filters.maxAge ?? ''} />
            </label>
            <label>
              Max value (£)
              <input
                name="maxValue"
                type="number"
                min={0}
                step={1_000_000}
                defaultValue={filters.maxValue ?? ''}
              />
            </label>
            <label>
              Club
              <select name="clubId" defaultValue={filters.clubId ?? ''}>
                <option value="">Any</option>
                {(allTargets.data?.clubs ?? []).map((club) => (
                  <option key={club.id} value={club.id}>
                    {club.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Sort by
              <select name="sort" defaultValue={filters.sort ?? 'rating'}>
                {MARKET_SORTS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Order
              <select name="order" defaultValue={filters.order ?? 'desc'}>
                <option value="desc">High to low</option>
                <option value="asc">Low to high</option>
              </select>
            </label>
            <div className={styles.filterActions}>
              <button type="submit" className={styles.primary}>
                Apply filters
              </button>
              <button type="button" className={styles.secondary} onClick={() => setSearchParams({})}>
                Reset
              </button>
            </div>
          </form>

          <Panel title="Results" tone="live">
            <QueryState
              isPending={market.isPending}
              error={market.error}
              onRetry={() => void market.refetch()}
              label="the market"
            />
            {market.data && market.data.players.length === 0 && (
              <p className={styles.muted}>No players match these filters.</p>
            )}
            {market.data && market.data.players.length > 0 && (
              <MarketTable players={market.data.players} clubsById={clubsById} shortlist={shortlist} />
            )}
          </Panel>
        </div>

        <Shortlist entries={shortlist} players={allTargets.data?.players ?? []} />
      </div>
    </div>
  );
}

interface MarketTableProps {
  players: PlayerDto[];
  clubsById: Map<string, ClubDto>;
  shortlist: ShortlistEntryDto[];
}

function MarketTable({ players, clubsById, shortlist }: MarketTableProps) {
  const priorities = new Map(shortlist.map((entry) => [entry.playerId, entry.priority]));
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">Player</th>
            <th scope="col">Pos</th>
            <th scope="col">Age</th>
            <th scope="col">Rating</th>
            <th scope="col">Club</th>
            <th scope="col">Value</th>
            <th scope="col">Status</th>
            <th scope="col">Shortlist</th>
          </tr>
        </thead>
        <tbody>
          {players.map((player) => (
            <tr key={player.id}>
              <th scope="row">
                <Link to={`/game/players/${player.id}`}>{player.name}</Link>
              </th>
              <td>
                <Badge tone={positionTone(player.position)}>{player.position}</Badge>
              </td>
              <td className={styles.num}>{player.age}</td>
              <td>
                <span className={styles.rating}>
                  <span className={styles.ratingValue} data-tone={ratingTone(player.rating)}>
                    {player.rating}
                  </span>
                  <StatBar value={player.rating - 50} max={45} tone={ratingTone(player.rating)} />
                </span>
              </td>
              <td className={styles.club}>{clubsById.get(player.currentClubId)?.name ?? 'Unknown'}</td>
              <td className={styles.value}>{formatMoney(player.marketValue)}</td>
              <td>
                <Badge tone={AVAILABILITY_TONES[player.availabilityState]}>
                  {humanize(player.availabilityState)}
                </Badge>
              </td>
              <td>
                <ShortlistControls
                  playerId={player.id}
                  playerName={player.name}
                  priority={priorities.get(player.id) ?? null}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Shortlist({ entries, players }: { entries: ShortlistEntryDto[]; players: PlayerDto[] }) {
  const byId = new Map(players.map((player) => [player.id, player]));
  const groups = [
    { priority: 'PRIMARY' as const, title: 'Targets' },
    { priority: 'BACKUP' as const, title: 'Backup targets' },
  ];

  return (
    <aside className={styles.side} aria-label="Shortlist">
      {groups.map((group) => {
        const list = entries.filter((entry) => entry.priority === group.priority);
        return (
          <Panel key={group.priority} title={group.title}>
            {list.length === 0 ? (
              <p className={styles.muted}>None yet.</p>
            ) : (
              <ul className={styles.shortlist}>
                {list.map((entry) => {
                  const player = byId.get(entry.playerId);
                  return (
                    <li key={entry.playerId} className={styles.target}>
                      {player && <Badge tone={positionTone(player.position)}>{player.position}</Badge>}
                      <span className={styles.targetText}>
                        <Link to={`/game/players/${entry.playerId}`}>{player?.name ?? 'Unknown player'}</Link>
                        {player && (
                          <span className={styles.muted}>
                            {player.rating} rated · {formatMoney(player.marketValue)}
                          </span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        );
      })}
    </aside>
  );
}
