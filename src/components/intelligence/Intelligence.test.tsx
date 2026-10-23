import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { DiscoveredFactDto, PlayerProfile } from '../../api/types.ts';
import { useSessionStore } from '../../stores/sessionStore.ts';
import { GAME_ID, gameState, negotiationView, TOKEN } from '../../test/fixtures.ts';
import { mockApi, type ApiRoutes } from '../../test/mockApi.ts';
import { renderRoute } from '../../test/render.tsx';

const fact = (overrides: Partial<DiscoveredFactDto> = {}): DiscoveredFactDto => ({
  id: 'f1',
  subjectId: 'p1',
  subjectType: 'PLAYER',
  factType: 'PLAYING_TIME',
  relatedClubId: null,
  interpretation: 'He wants a real chance to compete for a starting place.',
  confidence: 'STRONG',
  sourceType: 'SCOUT',
  discoveredAtGameHour: 48,
  expiresAtGameHour: null,
  ...overrides,
});

function profile(overrides: Partial<PlayerProfile> = {}): PlayerProfile {
  const view = negotiationView();
  return {
    player: view.player,
    isOwnPlayer: false,
    club: view.club,
    agent: view.agent,
    shortlistPriority: null,
    intelligence: [],
    clubIntelligence: [],
    rivalInterest: [],
    ...overrides,
  };
}

function renderProfile(body: PlayerProfile, routes: ApiRoutes = {}, elapsedHours = 0) {
  useSessionStore.setState({ session: { gameId: GAME_ID, token: TOKEN } });
  const api = mockApi({
    [`GET /games/${GAME_ID}`]: {
      body: { game: gameState({ clock: { ...gameState().clock, elapsedHours } }) },
    },
    [`GET /games/${GAME_ID}/players/p1`]: { body },
    [`GET /games/${GAME_ID}/negotiations`]: { body: { negotiations: [], players: [], agents: [] } },
    [`GET /games/${GAME_ID}/journalists`]: {
      body: {
        journalists: [
          { id: 'j1', name: 'Dana Fold', outlet: 'The Transfer Wire', reputation: 'Usually accurate' },
          { id: 'j2', name: 'Rex Riot', outlet: 'Transfer Tornado', reputation: 'Often speculative' },
        ],
      },
    },
    ...routes,
  });
  renderRoute('/game/players/p1');
  return api;
}

const commandResponse = (revealed: string[]) => ({
  body: {
    game: gameState({ version: 1 }),
    event: { id: 'e1', eventType: 'ACTION', payload: { revealed }, createdAtGameHour: 48 },
    replayed: false,
    profile: profile(),
    facts: [],
  },
});

describe('player intelligence', () => {
  it('lists information actions with their time costs', async () => {
    renderProfile(profile());

    const panel = within(await screen.findByRole('region', { name: 'Gather intelligence' }));
    expect(panel.getByRole('button', { name: 'Scout Alejandro Moreno · 2 days' })).toBeInTheDocument();
    expect(panel.getByRole('button', { name: 'Contact an insider · 12 hours' })).toBeInTheDocument();
    expect(panel.getByRole('button', { name: 'Monitor social media · 6 hours' })).toBeInTheDocument();
    expect(panel.getByRole('button', { name: 'Study Valdoria CF · 1 day' })).toBeInTheDocument();
    expect(panel.getByRole('button', { name: 'Ask the journalist · 6 hours' })).toBeInTheDocument();
  });

  it('scouts the player and reports what was found', async () => {
    const api = renderProfile(profile(), {
      [`POST /games/${GAME_ID}/players/p1/scout`]: commandResponse(['PLAYING_TIME', 'MOTIVATION']),
    });

    await userEvent.click(await screen.findByRole('button', { name: /Scout Alejandro Moreno/ }));

    expect(
      await screen.findByText('New information: Playing time expectations, What motivates him.'),
    ).toBeInTheDocument();
    const post = api.calls.find((call) => call.method === 'POST');
    expect(JSON.parse(String(post?.init.body))).toEqual({ expectedVersion: 0 });
  });

  it('asks the chosen journalist', async () => {
    const api = renderProfile(profile(), {
      [`POST /games/${GAME_ID}/investigations`]: commandResponse([]),
    });
    const user = userEvent.setup();

    await screen.findByRole('option', { name: /Rex Riot/ });
    await user.selectOptions(screen.getByRole('combobox', { name: 'Journalist' }), 'j2');
    await user.click(screen.getByRole('button', { name: /Ask the journalist/ }));

    expect(await screen.findByText('Nothing new came of it.')).toBeInTheDocument();
    const post = api.calls.find((call) => call.method === 'POST');
    expect(JSON.parse(String(post?.init.body))).toEqual({
      investigation: { kind: 'ASK_JOURNALIST', playerId: 'p1', journalistId: 'j2' },
      expectedVersion: 0,
    });
  });

  it('studies the selling club', async () => {
    const api = renderProfile(profile(), {
      [`POST /games/${GAME_ID}/investigations`]: commandResponse(['SELLING_STANCE']),
    });

    await userEvent.click(await screen.findByRole('button', { name: /Study Valdoria CF/ }));

    expect(await screen.findByText('New information: Willingness to sell.')).toBeInTheDocument();
    const post = api.calls.find((call) => call.method === 'POST');
    expect(JSON.parse(String(post?.init.body)).investigation).toEqual({ kind: 'STUDY_CLUB', clubId: 'c1' });
  });

  it('shows confidence, source, and outdated facts, plus what is known about the club', async () => {
    renderProfile(
      profile({
        intelligence: [
          fact(),
          fact({
            id: 'f2',
            factType: 'CURRENT_CLUB_MOOD',
            interpretation: 'He is clearly unhappy where he is.',
            sourceType: 'SOCIAL_MEDIA',
            confidence: 'UNCERTAIN',
            expiresAtGameHour: 100,
          }),
        ],
        clubIntelligence: [
          fact({
            id: 'f3',
            subjectType: 'CLUB',
            factType: 'SELLING_STANCE',
            interpretation: 'They are under financial pressure and willing to sell below the asking price.',
            sourceType: 'CLUB_STUDY',
          }),
        ],
      }),
      {},
      120,
    );

    const intel = within(await screen.findByRole('region', { name: 'Player Intelligence' }));
    const known = within(intel.getByRole('region', { name: 'Known' }));
    expect(known.getByText('Playing time expectations')).toBeInTheDocument();
    expect(known.getByText('Strong evidence')).toBeInTheDocument();
    expect(known.getByText(/Social media/)).toHaveTextContent('Outdated');
    const unknown = within(intel.getByRole('region', { name: 'Unknown' }));
    expect(unknown.getByText('Mood at his club')).toBeInTheDocument();
    expect(unknown.queryByText('Playing time expectations')).not.toBeInTheDocument();
    const clubSection = within(intel.getByRole('region', { name: 'About Valdoria CF' }));
    expect(clubSection.getByText(/willing to sell below the asking price/)).toBeInTheDocument();
  });

  it('hides information actions for own players', async () => {
    renderProfile(profile({ isOwnPlayer: true }));

    await screen.findByRole('region', { name: 'Player Intelligence' });
    expect(screen.queryByRole('region', { name: 'Gather intelligence' })).not.toBeInTheDocument();
  });
});
