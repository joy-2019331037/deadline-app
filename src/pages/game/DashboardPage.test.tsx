import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { useSessionStore } from '../../stores/sessionStore.ts';
import { GAME_ID, gameState, squadReport, TOKEN } from '../../test/fixtures.ts';
import { mockApi, type ApiRoutes } from '../../test/mockApi.ts';
import { renderRoute } from '../../test/render.tsx';

const clockAt = (elapsedHours: number) => ({
  day: Math.floor(elapsedHours / 24) + 1,
  hour: elapsedHours % 24,
  windowLengthDays: 30,
  elapsedHours,
  remainingHours: 720 - elapsedHours,
  isDeadlineDay: elapsedHours >= 696,
  isWindowClosed: false,
});

function renderDashboard(routes: ApiRoutes = {}) {
  useSessionStore.setState({ session: { gameId: GAME_ID, token: TOKEN } });
  const api = mockApi({
    [`GET /games/${GAME_ID}`]: { body: { game: gameState() } },
    [`GET /games/${GAME_ID}/squad`]: { body: squadReport() },
    [`GET /games/${GAME_ID}/events`]: {
      body: {
        events: [
          {
            id: 'e1',
            eventType: 'WINDOW_OPENED',
            payload: { transferBudget: 85_000_000 },
            createdAtGameHour: 0,
          },
        ],
      },
    },
    ...routes,
  });
  renderRoute('/game');
  return api;
}

describe('DashboardPage', () => {
  it('shows the countdown, budgets, and board objectives', async () => {
    renderDashboard({
      [`GET /games/${GAME_ID}`]: { body: { game: gameState({ clock: clockAt(23 * 24 + 12) }) } },
    });

    expect(await screen.findByRole('heading', { name: 'DAY 24 OF 30' })).toBeInTheDocument();
    expect(screen.getByText('6 DAYS 12 HOURS REMAINING')).toBeInTheDocument();
    expect(screen.getByText('Current time 12:00')).toBeInTheDocument();
    expect(screen.getByText('£85M')).toBeInTheDocument();
    expect(screen.getByText('£320K/wk')).toBeInTheDocument();
    expect(screen.getByText('Strengthen the attack with a reliable striker.')).toBeInTheDocument();
  });

  it('shows squad strengths, weaknesses, negotiations, and recent events', async () => {
    renderDashboard();

    const weaknesses = await screen.findByRole('list', { name: 'Squad weaknesses' });
    expect(
      within(weaknesses)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual([
      'No reliable striker',
      'Aging central defenders',
      'Weak squad depth',
      'High wage expenditure',
    ]);
    expect(screen.getByText('Poor')).toBeInTheDocument();
    expect(screen.getByText(/No active negotiations/)).toBeInTheDocument();
    expect(await screen.findByText('The transfer window opened with £85M to spend.')).toBeInTheDocument();
    expect(screen.getByText('Day 1, 00:00')).toBeInTheDocument();
  });

  it('waits through the action pipeline and shows the new server time', async () => {
    const { calls } = renderDashboard({
      [`POST /games/${GAME_ID}/actions`]: {
        body: {
          game: gameState({ clock: clockAt(24), version: 1 }),
          event: { id: 'e2', eventType: 'ACTION_WAIT', payload: { hours: 24 }, createdAtGameHour: 24 },
          replayed: false,
        },
      },
    });

    await userEvent.click(await screen.findByRole('button', { name: 'Wait 1 day' }));

    expect(await screen.findByRole('heading', { name: 'DAY 2 OF 30' })).toBeInTheDocument();
    const post = calls.find((call) => call.method === 'POST');
    expect(JSON.parse(String(post?.init.body))).toEqual({
      expectedVersion: 0,
      action: { type: 'WAIT', hours: 24 },
    });
    expect(new Headers(post?.init.headers).get('Idempotency-Key')).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('marks deadline day and hides waiting once the window closes', async () => {
    renderDashboard({
      [`GET /games/${GAME_ID}`]: {
        body: {
          game: gameState({
            status: 'COMPLETED',
            clock: { ...clockAt(720), day: 30, hour: 24, isWindowClosed: true },
          }),
        },
      },
    });

    expect(await screen.findByText('WINDOW CLOSED')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Wait/ })).not.toBeInTheDocument();
  });

  it('shows a retry when squad analysis fails', async () => {
    renderDashboard({
      [`GET /games/${GAME_ID}/squad`]: {
        status: 500,
        body: { error: { code: 'INTERNAL_ERROR', message: 'x' } },
      },
    });

    expect(await screen.findByText('Could not load squad analysis.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});
