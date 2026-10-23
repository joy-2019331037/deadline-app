import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { RumorDto, RumorFeed } from '../../api/types.ts';
import { useSessionStore } from '../../stores/sessionStore.ts';
import { GAME_ID, gameState, TOKEN } from '../../test/fixtures.ts';
import { mockApi, type ApiRoutes } from '../../test/mockApi.ts';
import { renderRoute } from '../../test/render.tsx';

const dana = { id: 'j1', name: 'Dana Fold', outlet: 'The Transfer Wire', reputation: 'Usually accurate' };
const rex = { id: 'j3', name: 'Rex Riot', outlet: 'Transfer Tornado', reputation: 'Often speculative' };

const rumor = (overrides: Partial<RumorDto> = {}): RumorDto => ({
  id: 'r1',
  source: dana,
  subjectIds: ['p1', 'c1'],
  publicClaim: 'Madrid FC are preparing a bid for Alejandro Moreno.',
  storyType: 'RIVAL_BID',
  playerId: 'p1',
  clubId: 'c1',
  publishedAtGameHour: 48,
  investigationState: 'UNINVESTIGATED',
  ...overrides,
});

const feed = (rumors: RumorDto[]): RumorFeed => ({
  rumors,
  journalists: [dana, rex],
  players: [{ id: 'p1', name: 'Alejandro Moreno' }],
  clubs: [{ id: 'c1', name: 'Madrid FC' }],
});

function renderFeed(body: RumorFeed, routes: ApiRoutes = {}) {
  useSessionStore.setState({ session: { gameId: GAME_ID, token: TOKEN } });
  const api = mockApi({
    [`GET /games/${GAME_ID}`]: { body: { game: gameState() } },
    [`GET /games/${GAME_ID}/rumors`]: { body },
    ...routes,
  });
  renderRoute('/game/rumors');
  return api;
}

const command = (payload: Record<string, unknown> = {}) => ({
  body: {
    game: gameState({ version: 1 }),
    event: { id: 'e1', eventType: 'X', payload, createdAtGameHour: 24 },
    replayed: false,
  },
});

describe('RumorsPage', () => {
  it('shows each rumor with its source, reliability reputation, time, and status', async () => {
    renderFeed(
      feed([
        rumor(),
        rumor({
          id: 'r2',
          source: rex,
          publicClaim: 'Alejandro Moreno has reportedly demanded a pet llama in his next contract.',
          storyType: 'ABSURD',
          investigationState: 'DEBUNKED',
        }),
        rumor({
          id: 'r3',
          source: null,
          storyType: 'USER_STATEMENT',
          publicClaim: 'Northbridge United deny any interest in Alejandro Moreno.',
        }),
      ]),
    );

    const items = within(await screen.findByRole('list', { name: 'Rumors' })).getAllByRole('listitem');
    expect(items).toHaveLength(3);
    const first = within(items[0] as HTMLElement);
    expect(first.getByText('Dana Fold, The Transfer Wire')).toBeInTheDocument();
    expect(first.getByText('Usually accurate')).toBeInTheDocument();
    expect(first.getByText('Day 3, 00:00')).toBeInTheDocument();
    expect(first.getByText('Unverified')).toBeInTheDocument();
    expect(first.getByRole('link', { name: 'Alejandro Moreno' })).toHaveAttribute('href', '/game/players/p1');
    expect(within(items[1] as HTMLElement).getByText('Debunked')).toBeInTheDocument();
    expect(
      within(items[1] as HTMLElement).queryByRole('button', { name: /Investigate/ }),
    ).not.toBeInTheDocument();
    const own = within(items[2] as HTMLElement);
    expect(own.getByText('Official statement')).toBeInTheDocument();
    expect(own.getByText('Your statement')).toBeInTheDocument();
  });

  it('investigates an unverified rumor for a day', async () => {
    const api = renderFeed(feed([rumor()]), {
      [`POST /games/${GAME_ID}/rumors/r1/investigate`]: command({ verdict: 'CONFIRMED' }),
    });

    await userEvent.click(await screen.findByRole('button', { name: 'Investigate · 1 day' }));

    const post = api.calls.find((call) => call.method === 'POST');
    expect(post?.path).toBe(`/games/${GAME_ID}/rumors/r1/investigate`);
    expect(new Headers(post?.init.headers).get('Idempotency-Key')).toBeTruthy();
  });

  it('reacts to a story through the media', async () => {
    const api = renderFeed(feed([rumor()]), {
      [`POST /games/${GAME_ID}/media`]: command({
        claim: 'Northbridge United deny any interest in Alejandro Moreno.',
      }),
    });
    const user = userEvent.setup();

    await user.selectOptions(
      await screen.findByRole('combobox', { name: 'Media reaction about Alejandro Moreno' }),
      'DENY_NEGOTIATIONS',
    );
    await user.click(screen.getByRole('button', { name: 'Go to the press · 2 hours' }));

    expect(await screen.findByText(/Statement released/)).toHaveTextContent('deny any interest');
    const post = api.calls.find((call) => call.method === 'POST');
    expect(JSON.parse(String(post?.init.body))).toEqual({
      action: 'DENY_NEGOTIATIONS',
      playerId: 'p1',
      expectedVersion: 0,
    });
  });

  it('explains an empty feed', async () => {
    renderFeed(feed([]));

    expect(await screen.findByText(/No rumors yet/)).toBeInTheDocument();
  });
});
