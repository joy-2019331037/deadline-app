import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useSessionStore } from '../../stores/sessionStore.ts';
import { GAME_ID, gameState, negotiationView, TOKEN } from '../../test/fixtures.ts';
import { mockApi } from '../../test/mockApi.ts';
import { renderRoute } from '../../test/render.tsx';

describe('NegotiationsPage', () => {
  it('separates talks in progress from finished ones', async () => {
    const open = negotiationView().negotiation;
    const failed = negotiationView(
      {},
      { id: 'n2', playerId: 'p2', status: 'REJECTED', failureReason: 'FINANCIAL' },
    ).negotiation;
    const { player, agent } = negotiationView();
    useSessionStore.setState({ session: { gameId: GAME_ID, token: TOKEN } });
    mockApi({
      [`GET /games/${GAME_ID}`]: { body: { game: gameState({ activeNegotiationIds: ['n1'] }) } },
      [`GET /games/${GAME_ID}/negotiations`]: {
        body: {
          negotiations: [open, failed],
          players: [player, { ...player, id: 'p2', name: 'Nikola Varga' }],
          agents: [agent],
        },
      },
    });

    renderRoute('/game/negotiations');

    const active = within(await screen.findByRole('region', { name: 'In progress' }));
    expect(active.getByRole('link', { name: 'Alejandro Moreno' })).toHaveAttribute(
      'href',
      '/game/negotiations/n1',
    );
    expect(active.getByText('First contact')).toBeInTheDocument();
    const finished = within(screen.getByRole('region', { name: 'Finished' }));
    expect(finished.getByRole('link', { name: 'Nikola Varga' })).toBeInTheDocument();
    expect(finished.getByText('Financial breakdown')).toBeInTheDocument();
  });

  it('points to the market when nothing is in progress', async () => {
    useSessionStore.setState({ session: { gameId: GAME_ID, token: TOKEN } });
    mockApi({
      [`GET /games/${GAME_ID}`]: { body: { game: gameState() } },
      [`GET /games/${GAME_ID}/negotiations`]: { body: { negotiations: [], players: [], agents: [] } },
    });

    renderRoute('/game/negotiations');

    expect(await screen.findByRole('link', { name: 'Find a target' })).toHaveAttribute(
      'href',
      '/game/market',
    );
  });
});
