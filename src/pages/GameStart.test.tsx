import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { SESSION_STORAGE_KEY, useSessionStore } from '../stores/sessionStore.ts';
import { GAME_ID, gameState, TOKEN } from '../test/fixtures.ts';
import { mockApi } from '../test/mockApi.ts';
import { renderRoute } from '../test/render.tsx';

describe('game start and persistence', () => {
  it('starts a new game, stores the credential, and opens the game', async () => {
    const { calls } = mockApi({
      'POST /games': { status: 201, body: { game: gameState(), sessionToken: TOKEN } },
      [`GET /games/${GAME_ID}`]: { body: { game: gameState() } },
    });

    renderRoute('/');
    await userEvent.click(screen.getByRole('button', { name: 'New transfer window' }));

    expect(await screen.findByRole('heading', { name: 'DAY 1 OF 30' })).toBeInTheDocument();
    expect(useSessionStore.getState().session).toEqual({ gameId: GAME_ID, token: TOKEN });
    expect(JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) ?? '{}').state.session.token).toBe(TOKEN);
    expect(calls.some((call) => call.method === 'POST' && call.path === '/games')).toBe(true);
  });

  it('restores a saved game on refresh using the stored credential', async () => {
    useSessionStore.setState({ session: { gameId: GAME_ID, token: TOKEN } });
    const { calls } = mockApi({
      [`GET /games/${GAME_ID}`]: { body: { game: gameState({ clock: { ...gameState().clock, day: 12 } }) } },
    });

    renderRoute('/game');

    expect(await screen.findByRole('heading', { name: 'DAY 12 OF 30' })).toBeInTheDocument();
    const gameCall = calls.find((call) => call.path === `/games/${GAME_ID}`);
    expect(new Headers(gameCall?.init.headers).get('Authorization')).toBe(`Bearer ${TOKEN}`);
  });

  it('offers to continue an existing save and confirms before replacing it', async () => {
    useSessionStore.setState({ session: { gameId: GAME_ID, token: TOKEN } });
    mockApi();

    renderRoute('/');

    expect(screen.getByRole('link', { name: 'Continue window' })).toHaveAttribute('href', '/game');
    await userEvent.click(screen.getByRole('button', { name: 'New transfer window' }));
    expect(screen.getByText('Starting a new window abandons your current save.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Keep my save' }));
    expect(useSessionStore.getState().session?.gameId).toBe(GAME_ID);
  });

  it('clears a save the server no longer recognises', async () => {
    useSessionStore.setState({ session: { gameId: GAME_ID, token: TOKEN } });
    mockApi({
      [`GET /games/${GAME_ID}`]: {
        status: 404,
        body: { error: { code: 'GAME_NOT_FOUND', message: 'Game not found' } },
      },
    });

    renderRoute('/game');

    expect(await screen.findByText(/previous save could not be found/)).toBeInTheDocument();
    expect(useSessionStore.getState().session).toBeNull();
  });

  it('redirects to the start when there is no save', () => {
    mockApi();

    renderRoute('/game');

    expect(screen.getByRole('button', { name: 'New transfer window' })).toBeInTheDocument();
  });

  it('shows an error when the game cannot be created', async () => {
    mockApi({
      'POST /games': { status: 429, body: { error: { code: 'RATE_LIMITED', message: 'Too many requests' } } },
    });

    renderRoute('/');
    await userEvent.click(screen.getByRole('button', { name: 'New transfer window' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Too many requests');
    expect(useSessionStore.getState().session).toBeNull();
  });

  it('keeps the save on a server error and offers a retry', async () => {
    useSessionStore.setState({ session: { gameId: GAME_ID, token: TOKEN } });
    mockApi({
      [`GET /games/${GAME_ID}`]: {
        status: 500,
        body: { error: { code: 'INTERNAL_ERROR', message: 'Boom' } },
      },
    });

    renderRoute('/game');

    expect(await screen.findByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect(useSessionStore.getState().session).not.toBeNull();
  });
});
