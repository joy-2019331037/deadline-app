import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { GameEventDto } from '../../api/types.ts';
import { useSessionStore } from '../../stores/sessionStore.ts';
import { GAME_ID, gameState, negotiationView, squadReport, TOKEN } from '../../test/fixtures.ts';
import { mockApi } from '../../test/mockApi.ts';
import { renderRoute } from '../../test/render.tsx';

const opened: GameEventDto = {
  id: 'e1',
  eventType: 'WINDOW_OPENED',
  payload: { transferBudget: 85_000_000 },
  createdAtGameHour: 0,
};
const waited: GameEventDto = {
  id: 'e2',
  eventType: 'ACTION_WAIT',
  payload: { hours: 24 },
  createdAtGameHour: 24,
};
const signing: GameEventDto = {
  id: 'e3',
  eventType: 'RIVAL_SIGNING',
  payload: { clubName: 'Madrid FC', playerName: 'Alejandro Moreno', fromClub: 'Valdoria CF' },
  createdAtGameHour: 20,
};
const rumor: GameEventDto = {
  id: 'e4',
  eventType: 'RUMOR_PUBLISHED',
  payload: { sourceName: 'Dana Fold', claim: 'Varga is unsettled.' },
  createdAtGameHour: 18,
};

function setup() {
  useSessionStore.setState({ session: { gameId: GAME_ID, token: TOKEN } });
  let afterWait = false;
  mockApi({
    [`GET /games/${GAME_ID}`]: { body: { game: gameState() } },
    [`GET /games/${GAME_ID}/squad`]: { body: squadReport() },
    [`GET /games/${GAME_ID}/events`]: () => ({
      body: { events: afterWait ? [waited, signing, rumor, opened] : [opened] },
    }),
    [`POST /games/${GAME_ID}/actions`]: () => {
      afterWait = true;
      return { body: { game: gameState({ version: 1 }), event: waited, replayed: false } };
    },
  });
  renderRoute('/game');
}

describe('live moments', () => {
  it('stays quiet about events that were already in the log', async () => {
    setup();

    expect(await screen.findByText('The transfer window opened with £85M to spend.')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Latest news' })).not.toBeInTheDocument();
  });

  it('breaks rival signings as a banner and other news as a toast', async () => {
    setup();
    await userEvent.click(await screen.findByRole('button', { name: 'Wait 1 day' }));

    const banner = await screen.findByRole('alert');
    expect(banner).toHaveTextContent('Breaking');
    expect(banner).toHaveTextContent('Madrid FC signed Alejandro Moreno from Valdoria CF.');
    const toasts = within(screen.getByRole('list', { name: 'Latest news' }));
    expect(toasts.getByText('Dana Fold: Varga is unsettled.')).toBeInTheDocument();
    expect(toasts.queryByText('You waited 1 day.')).not.toBeInTheDocument();

    await userEvent.click(within(banner).getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('offer shortcut', () => {
  it('submits the offer with Ctrl+Enter', async () => {
    useSessionStore.setState({ session: { gameId: GAME_ID, token: TOKEN } });
    const { calls } = mockApi({
      [`GET /games/${GAME_ID}`]: { body: { game: gameState({ version: 1 }) } },
      [`GET /games/${GAME_ID}/negotiations/n1`]: { body: negotiationView() },
      [`POST /games/${GAME_ID}/negotiations/n1/offers`]: {
        body: { ...negotiationView(), game: gameState({ version: 2 }), event: { id: 'e9' }, replayed: false },
      },
    });
    renderRoute('/game/negotiations/n1');
    const user = userEvent.setup();

    const wage = within(await screen.findByRole('form', { name: 'Offer builder' })).getByLabelText(
      /Weekly wage/,
    );
    await user.clear(wage);
    await user.type(wage, '150');
    await user.keyboard('{Control>}{Enter}{/Control}');

    await screen.findByRole('form', { name: 'Offer builder' });
    expect(calls.some((call) => call.method === 'POST' && call.path.endsWith('/offers'))).toBe(true);
  });
});
