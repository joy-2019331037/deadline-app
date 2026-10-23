import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { PlayerProfile, RivalInterestDto } from '../../api/types.ts';
import { useSessionStore } from '../../stores/sessionStore.ts';
import { GAME_ID, gameState, negotiationView, TOKEN } from '../../test/fixtures.ts';
import { mockApi } from '../../test/mockApi.ts';
import { renderRoute } from '../../test/render.tsx';

const interest: RivalInterestDto[] = [
  { clubId: 'ash', clubName: 'Ashford City', label: 'UNKNOWN' },
  { clubId: 'mfc', clubName: 'Madrid FC', label: 'CONFIRMED' },
  { clubId: 'mua', clubName: 'Munich Athletic', label: 'RUMORED' },
];

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
    rivalInterest: interest,
    ...overrides,
  };
}

function setup(path: string, body: PlayerProfile) {
  useSessionStore.setState({ session: { gameId: GAME_ID, token: TOKEN } });
  mockApi({
    [`GET /games/${GAME_ID}`]: { body: { game: gameState() } },
    [`GET /games/${GAME_ID}/players/p1`]: { body },
    [`GET /games/${GAME_ID}/negotiations`]: { body: { negotiations: [], players: [], agents: [] } },
    [`GET /games/${GAME_ID}/negotiations/n1`]: { body: negotiationView() },
    [`GET /games/${GAME_ID}/journalists`]: { body: { journalists: [] } },
  });
  renderRoute(path);
}

describe('rival interest', () => {
  it('labels each rival as confirmed, rumored, or unknown on the profile', async () => {
    setup('/game/players/p1', profile());

    const panel = within(await screen.findByRole('region', { name: 'Rival interest' }));
    expect(panel.getByText('Madrid FC').nextSibling).toHaveTextContent('Confirmed interest');
    expect(panel.getByText('Munich Athletic').nextSibling).toHaveTextContent('Rumored interest');
    expect(panel.getByText('Ashford City').nextSibling).toHaveTextContent('Unknown');
    expect(panel.getByText(/only on what you have discovered/)).toBeInTheDocument();
  });

  it('shows rival interest alongside an open negotiation', async () => {
    setup('/game/negotiations/n1', profile());

    const panel = within(await screen.findByRole('region', { name: 'Rival interest' }));
    expect(panel.getByText('Madrid FC')).toBeInTheDocument();
  });

  it('is not shown for your own players', async () => {
    setup('/game/players/p1', profile({ isOwnPlayer: true, rivalInterest: [] }));

    await screen.findByRole('region', { name: 'Player Intelligence' });
    expect(screen.queryByRole('region', { name: 'Rival interest' })).not.toBeInTheDocument();
  });
});
