import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { useSessionStore } from '../../stores/sessionStore.ts';
import { useSettingsStore } from '../../stores/settingsStore.ts';
import { GAME_ID, gameState, squadReport, TOKEN } from '../../test/fixtures.ts';
import { mockApi } from '../../test/mockApi.ts';
import { renderRoute } from '../../test/render.tsx';

const events = [
  {
    id: 'e3',
    eventType: 'RIVAL_SIGNING',
    payload: { clubName: 'Madrid FC', playerName: 'Alejandro Moreno', fromClub: 'Porto Azul' },
    createdAtGameHour: 120,
  },
  { id: 'e2', eventType: 'ACTION_WAIT', payload: { hours: 24 }, createdAtGameHour: 96 },
  {
    id: 'e1',
    eventType: 'RUMOR_PUBLISHED',
    payload: { sourceName: 'Lucia Ferraro', claim: 'Varga is unsettled.' },
    createdAtGameHour: 72,
  },
];

function setup(remainingHours = 600) {
  useSessionStore.setState({ session: { gameId: GAME_ID, token: TOKEN } });
  const base = gameState();
  mockApi({
    [`GET /games/${GAME_ID}`]: {
      body: { game: { ...base, clock: { ...base.clock, remainingHours } } },
    },
    [`GET /games/${GAME_ID}/squad`]: { body: squadReport() },
    [`GET /games/${GAME_ID}/events`]: { body: { events } },
  });
  renderRoute('/game');
}

describe('broadcast shell', () => {
  it('scrolls public headlines in the news ticker but leaves out your own actions', async () => {
    useSettingsStore.setState({ ticker: true });
    setup();

    const ticker = within(await screen.findByRole('list', { name: 'Headlines' }));
    expect(ticker.getByText('Madrid FC signed Alejandro Moreno from Porto Azul.')).toBeInTheDocument();
    expect(ticker.getByText('Breaking')).toBeInTheDocument();
    expect(ticker.getByText('Lucia Ferraro: Varga is unsettled.')).toBeInTheDocument();
    expect(ticker.queryByText('You waited 1 day.')).not.toBeInTheDocument();
  });

  it('lets the player switch the ticker and reply timing off', async () => {
    useSettingsStore.setState({ ticker: true, realisticReplies: true });
    setup();
    await screen.findByRole('list', { name: 'Headlines' });

    await userEvent.click(screen.getByRole('button', { name: 'Settings' }));
    const settings = within(screen.getByRole('group', { name: 'Settings' }));
    await userEvent.click(settings.getByRole('switch', { name: /News ticker/ }));
    await userEvent.click(settings.getByRole('switch', { name: /Realistic reply timing/ }));

    expect(screen.queryByRole('complementary', { name: 'News ticker' })).not.toBeInTheDocument();
    expect(useSettingsStore.getState()).toMatchObject({ ticker: false, realisticReplies: false });
  });

  it('flags the final day in the countdown', async () => {
    setup(20);

    const countdown = await screen.findByRole('region', { name: /^DAY/ });
    expect(countdown).toHaveAttribute('data-urgency', 'critical');
  });
});
