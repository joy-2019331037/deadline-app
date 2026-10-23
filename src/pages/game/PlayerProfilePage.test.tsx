import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { PlayerProfile } from '../../api/types.ts';
import { useSessionStore } from '../../stores/sessionStore.ts';
import { GAME_ID, gameState, negotiationView, TOKEN } from '../../test/fixtures.ts';
import { mockApi, type ApiRoutes } from '../../test/mockApi.ts';
import { renderRoute } from '../../test/render.tsx';

function profile(overrides: Partial<PlayerProfile> = {}): PlayerProfile {
  return {
    player: {
      id: 'p1',
      name: 'Alejandro Moreno',
      nationality: 'Spain',
      age: 26,
      position: 'ST',
      rating: 86,
      stats: { appearances: 31, goals: 22, assists: 4, cleanSheets: 0 },
      currentClubId: 'c1',
      contractYearsRemaining: 2,
      marketValue: 58_000_000,
      playingStyle: 'Clinical poacher',
      agentId: 'a1',
      availabilityState: 'AVAILABLE',
    },
    isOwnPlayer: false,
    club: {
      id: 'c1',
      name: 'Valdoria CF',
      shortName: 'VAL',
      country: 'Spain',
      league: 'Liga Primera',
      prestige: 2,
      isUserClub: false,
    },
    agent: {
      id: 'a1',
      name: 'Victor Kane',
      agency: 'Kane Sports Management',
      publicReputation: 'Never leaves money on the table.',
      relationshipStatus: 'FRUSTRATED',
    },
    shortlistPriority: null,
    intelligence: [],
    clubIntelligence: [],
    rivalInterest: [],
    ...overrides,
  };
}

function renderProfile(body: unknown, status = 200, routes: ApiRoutes = {}) {
  useSessionStore.setState({ session: { gameId: GAME_ID, token: TOKEN } });
  const api = mockApi({
    [`GET /games/${GAME_ID}`]: { body: { game: gameState() } },
    [`GET /games/${GAME_ID}/players/p1`]: { status, body },
    [`GET /games/${GAME_ID}/negotiations`]: { body: { negotiations: [], players: [], agents: [] } },
    ...routes,
  });
  renderRoute('/game/players/p1');
  return api;
}

describe('PlayerProfilePage', () => {
  it('shows public attributes, statistics, and club', async () => {
    renderProfile(profile());

    expect(await screen.findByRole('heading', { name: 'Alejandro Moreno' })).toBeInTheDocument();
    expect(screen.getByText('ST · 26 · Spain · Valdoria CF')).toBeInTheDocument();
    expect(screen.getByLabelText('Rating 86')).toBeInTheDocument();
    const details = within(screen.getByRole('region', { name: 'Profile' }));
    expect(details.getByText('Clinical poacher')).toBeInTheDocument();
    expect(details.getByText('2 years')).toBeInTheDocument();
    expect(details.getByText('£58M')).toBeInTheDocument();
    expect(details.queryByText('Current wage')).not.toBeInTheDocument();
    expect(
      within(screen.getByRole('region', { name: 'Key statistics' })).getByText('22'),
    ).toBeInTheDocument();
  });

  it('shows the agent identity with a qualitative relationship and a contact entry point', async () => {
    renderProfile(profile());

    const agent = within(await screen.findByRole('region', { name: 'Agent' }));
    expect(agent.getByText('Victor Kane')).toBeInTheDocument();
    expect(agent.getByText('Frustrated')).toBeInTheDocument();
    expect(agent.getByRole('button', { name: 'Contact agent · 2 hours' })).toBeEnabled();
  });

  it('contacts the agent and opens the negotiation', async () => {
    const view = negotiationView();
    const api = renderProfile(profile(), 200, {
      [`POST /games/${GAME_ID}/negotiations`]: {
        status: 201,
        body: { ...view, game: gameState({ version: 1 }), event: { id: 'e1' }, replayed: false },
      },
      [`GET /games/${GAME_ID}/negotiations/${view.negotiation.id}`]: { body: view },
    });

    await userEvent.click(await screen.findByRole('button', { name: 'Contact agent · 2 hours' }));

    expect(await screen.findByRole('region', { name: 'Conversation' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Alejandro Moreno', level: 1 })).toBeInTheDocument();
    const post = api.calls.find((call) => call.method === 'POST');
    expect(JSON.parse(String(post?.init.body))).toEqual({ playerId: 'p1', expectedVersion: 0 });
    expect(new Headers(post?.init.headers).get('Idempotency-Key')).toBeTruthy();
  });

  it('links to an ongoing negotiation instead of opening another', async () => {
    const view = negotiationView();
    renderProfile(profile(), 200, {
      [`GET /games/${GAME_ID}/negotiations`]: {
        body: { negotiations: [view.negotiation], players: [view.player], agents: [view.agent] },
      },
    });

    expect(await screen.findByRole('link', { name: 'Continue negotiation' })).toHaveAttribute(
      'href',
      `/game/negotiations/${view.negotiation.id}`,
    );
  });

  it('separates known and unknown intelligence with confidence and source', async () => {
    renderProfile(
      profile({
        intelligence: [
          {
            id: 'f1',
            subjectId: 'p1',
            subjectType: 'PLAYER',
            factType: 'MOTIVATION',
            relatedClubId: null,
            interpretation: 'Money will not be the deciding factor.',
            confidence: 'LIKELY',
            sourceType: 'SCOUT',
            discoveredAtGameHour: 50,
            expiresAtGameHour: null,
          },
        ],
      }),
    );

    const intel = within(await screen.findByRole('region', { name: 'Player Intelligence' }));
    const known = within(intel.getByRole('region', { name: 'Known' }));
    expect(known.getByText('Money will not be the deciding factor.')).toBeInTheDocument();
    expect(known.getByText('Likely')).toBeInTheDocument();
    expect(known.getByText(/Scout report · Day 3, 02:00/)).toBeInTheDocument();
    const unknown = within(intel.getByRole('region', { name: 'Unknown' }));
    expect(unknown.getByText('Wage expectations')).toBeInTheDocument();
    expect(unknown.queryByText('What motivates him')).not.toBeInTheDocument();
  });

  it('shows an empty intelligence state and shortlist controls', async () => {
    renderProfile(profile({ shortlistPriority: 'BACKUP' }));

    expect(await screen.findByText(/Nothing discovered yet/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mark Alejandro Moreno as a backup' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('shows wages for own players without contact or shortlist actions', async () => {
    renderProfile(profile({ isOwnPlayer: true, player: { ...profile().player, weeklyWage: 150_000 } }));

    expect(await screen.findByText('£150K/wk')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Contact agent/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Shortlist' })).not.toBeInTheDocument();
  });

  it('handles a missing player', async () => {
    renderProfile({ error: { code: 'PLAYER_NOT_FOUND', message: 'Player not found' } }, 404);

    expect(await screen.findByText('This player could not be found.')).toBeInTheDocument();
  });
});
