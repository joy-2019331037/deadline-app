import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { MarketResponse, PlayerDto } from '../../api/types.ts';
import { useSessionStore } from '../../stores/sessionStore.ts';
import { GAME_ID, gameState, TOKEN } from '../../test/fixtures.ts';
import { mockApi, type ApiRoutes } from '../../test/mockApi.ts';
import { renderRoute } from '../../test/render.tsx';
import { readFilters } from './marketFilters.ts';

function target(overrides: Partial<PlayerDto>): PlayerDto {
  return {
    id: 'p1',
    name: 'Alejandro Moreno',
    nationality: 'Spain',
    age: 26,
    position: 'ST',
    rating: 86,
    stats: { appearances: 30, goals: 22, assists: 4, cleanSheets: 0 },
    currentClubId: 'c-valdoria',
    contractYearsRemaining: 2,
    marketValue: 58_000_000,
    playingStyle: 'Clinical poacher',
    agentId: 'a1',
    availabilityState: 'AVAILABLE',
    ...overrides,
  };
}

const market: MarketResponse = {
  players: [
    target({}),
    target({ id: 'p2', name: 'Mateo Ruiz', position: 'CB', age: 24, rating: 83, marketValue: 35_000_000 }),
  ],
  clubs: [
    {
      id: 'c-valdoria',
      name: 'Valdoria CF',
      shortName: 'VAL',
      country: 'Spain',
      league: 'Liga Primera',
      prestige: 2,
      isUserClub: false,
    },
  ],
};

function renderMarket(path = '/game/market', routes: ApiRoutes = {}) {
  useSessionStore.setState({ session: { gameId: GAME_ID, token: TOKEN } });
  const api = mockApi({
    [`GET /games/${GAME_ID}`]: { body: { game: gameState() } },
    [`GET /games/${GAME_ID}/market`]: ({ url }) =>
      url.searchParams.get('position') === 'CB'
        ? { body: { ...market, players: market.players.slice(1) } }
        : url.searchParams.get('search') === 'nobody'
          ? { body: { players: [], clubs: [] } }
          : { body: market },
    ...routes,
  });
  renderRoute(path);
  return api;
}

const resultsTable = async () => within(await screen.findByRole('region', { name: 'Results' }));

describe('MarketPage', () => {
  it('lists targets with public attributes and club names', async () => {
    renderMarket();

    const results = await resultsTable();
    const row = (await results.findByRole('link', { name: 'Alejandro Moreno' })).closest('tr');
    expect(row).toHaveTextContent('ST');
    expect(row).toHaveTextContent('Valdoria CF');
    expect(row).toHaveTextContent('£58M');
    expect(row).toHaveTextContent('Available');
  });

  it('applies filters through the URL and the API', async () => {
    const { calls } = renderMarket();

    await userEvent.selectOptions(await screen.findByLabelText('Position'), 'CB');
    await userEvent.type(screen.getByLabelText('Max age'), '25');
    await userEvent.click(screen.getByRole('button', { name: 'Apply filters' }));

    const results = await resultsTable();
    expect(await results.findByRole('link', { name: 'Mateo Ruiz' })).toBeInTheDocument();
    expect(results.queryByRole('link', { name: 'Alejandro Moreno' })).not.toBeInTheDocument();
    const lastMarketCall = calls.filter((call) => call.path.startsWith('/games/')).at(-1);
    expect(lastMarketCall?.path).toContain('position=CB');
    expect(lastMarketCall?.path).toContain('maxAge=25');
  });

  it('restores filters from the URL', async () => {
    renderMarket('/game/market?position=CB');

    expect(await screen.findByLabelText('Position')).toHaveValue('CB');
    expect(await (await resultsTable()).findByRole('link', { name: 'Mateo Ruiz' })).toBeInTheDocument();
  });

  it('shows an empty state', async () => {
    renderMarket('/game/market?search=nobody');

    expect(await screen.findByText('No players match these filters.')).toBeInTheDocument();
  });

  it('adds a target and a backup to the shortlist', async () => {
    const { calls } = renderMarket('/game/market', {
      [`POST /games/${GAME_ID}/actions`]: {
        body: {
          game: gameState({
            version: 1,
            shortlist: [{ playerId: 'p1', priority: 'PRIMARY', addedAtGameHour: 0 }],
          }),
          event: { id: 'e', eventType: 'ACTION_SHORTLIST_PLAYER', payload: {}, createdAtGameHour: 0 },
          replayed: false,
        },
      },
    });

    await userEvent.click(await screen.findByRole('button', { name: 'Mark Alejandro Moreno as a target' }));

    const targets = within(await screen.findByRole('region', { name: 'Targets' }));
    expect(await targets.findByRole('link', { name: 'Alejandro Moreno' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mark Alejandro Moreno as a target' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(
      within(screen.getByRole('region', { name: 'Backup targets' })).getByText('None yet.'),
    ).toBeVisible();
    const post = calls.find((call) => call.method === 'POST');
    expect(JSON.parse(String(post?.init.body)).action).toEqual({
      type: 'SHORTLIST_PLAYER',
      playerId: 'p1',
      priority: 'PRIMARY',
    });
  });

  it('removes a shortlisted player when its chip is pressed again', async () => {
    const { calls } = renderMarket('/game/market', {
      [`GET /games/${GAME_ID}`]: {
        body: {
          game: gameState({ shortlist: [{ playerId: 'p2', priority: 'BACKUP', addedAtGameHour: 0 }] }),
        },
      },
      [`POST /games/${GAME_ID}/actions`]: {
        body: {
          game: gameState({ version: 1 }),
          event: { id: 'e', eventType: 'ACTION_REMOVE_FROM_SHORTLIST', payload: {}, createdAtGameHour: 0 },
          replayed: false,
        },
      },
    });

    await userEvent.click(await screen.findByRole('button', { name: 'Mark Mateo Ruiz as a backup' }));

    const post = calls.find((call) => call.method === 'POST');
    expect(JSON.parse(String(post?.init.body)).action).toEqual({
      type: 'REMOVE_FROM_SHORTLIST',
      playerId: 'p2',
    });
  });
});

describe('readFilters', () => {
  it('ignores invalid values', () => {
    expect(readFilters(new URLSearchParams('position=XX&maxAge=abc&sort=askingPrice&order=up'))).toEqual({});
    expect(readFilters(new URLSearchParams('position=ST&minAge=20&sort=age&order=asc'))).toEqual({
      position: 'ST',
      minAge: 20,
      sort: 'age',
      order: 'asc',
    });
  });
});
