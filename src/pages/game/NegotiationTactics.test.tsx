import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { ClaimDto, NegotiationView, PromiseDto } from '../../api/types.ts';
import { useSessionStore } from '../../stores/sessionStore.ts';
import { GAME_ID, gameState, negotiationView, TOKEN } from '../../test/fixtures.ts';
import { mockApi, type ApiRoutes } from '../../test/mockApi.ts';
import { renderRoute } from '../../test/render.tsx';

const promise = (overrides: Partial<PromiseDto> = {}): PromiseDto => ({
  id: 'pr1',
  playerId: 'p1',
  negotiationId: 'n1',
  promiseType: 'CAPTAINCY',
  terms: 'Alejandro Moreno will be named club captain.',
  status: 'ACTIVE',
  createdAtGameHour: 3,
  dueCondition: { kind: 'BY_WINDOW_END', dueAtGameHour: null },
  resolvedAtGameHour: null,
  ...overrides,
});

const claim = (overrides: Partial<ClaimDto> = {}): ClaimDto => ({
  id: 'cl1',
  claimType: 'RIVAL_OFFER',
  clubId: 'mfc',
  clubName: 'Madrid FC',
  publicClaim: 'Madrid FC have made an approach.',
  status: 'OPEN',
  createdAtGameHour: 6,
  ...overrides,
});

function render(view: NegotiationView, routes: ApiRoutes = {}) {
  useSessionStore.setState({ session: { gameId: GAME_ID, token: TOKEN } });
  const api = mockApi({
    [`GET /games/${GAME_ID}`]: { body: { game: gameState({ version: 1 }) } },
    [`GET /games/${GAME_ID}/negotiations/n1`]: { body: view },
    ...routes,
  });
  renderRoute('/game/negotiations/n1');
  return api;
}

const respond = (view: NegotiationView) => ({
  body: { ...view, game: gameState({ version: 2 }), event: { id: 'e1' }, replayed: false },
});

const lastPost = (api: ReturnType<typeof mockApi>) => {
  const call = api.calls.filter((c) => c.method === 'POST').at(-1);
  return call ? { path: call.path, body: JSON.parse(String(call.init.body)) } : null;
};

describe('formal promises', () => {
  it('asks for confirmation and shows the commitment before sending it', async () => {
    const api = render(negotiationView(), {
      [`POST /games/${GAME_ID}/negotiations/n1/promises`]: respond(
        negotiationView({ promises: [promise()] }),
      ),
    });
    const user = userEvent.setup();

    await user.selectOptions(await screen.findByRole('combobox', { name: 'Formal promise' }), 'CAPTAINCY');
    await user.click(screen.getByRole('button', { name: 'Make promise · 1 hour' }));
    const dialog = within(screen.getByRole('dialog', { name: 'Confirm this commitment' }));
    expect(dialog.getByText('Alejandro Moreno will be named club captain.')).toBeInTheDocument();
    expect(dialog.getByText(/Due by the end of the window/)).toBeInTheDocument();

    await user.click(dialog.getByRole('button', { name: 'Cancel' }));
    expect(lastPost(api)).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Make promise · 1 hour' }));
    await user.click(screen.getByRole('button', { name: 'I promise' }));

    const commitments = within(await screen.findByRole('list', { name: 'Commitments' }));
    expect(commitments.getByText('Alejandro Moreno will be named club captain.')).toBeInTheDocument();
    expect(commitments.getByText(/Active · due by the end of the window/)).toBeInTheDocument();
    expect(lastPost(api)).toEqual({
      path: `/games/${GAME_ID}/negotiations/n1/promises`,
      body: { promiseType: 'CAPTAINCY', expectedVersion: 1 },
    });
  });

  it('only offers promises that have not been made, up to three', async () => {
    render(
      negotiationView({ promises: [promise(), promise({ id: 'pr2', promiseType: 'EUROPEAN_FOOTBALL' })] }),
    );

    const select = await screen.findByRole('combobox', { name: 'Formal promise' });
    const options = within(select)
      .getAllByRole('option')
      .map((option) => option.textContent);
    expect(options).not.toContain('Captaincy');
    expect(options).not.toContain('European football');
  });

  it('stops offering promises once three are made', async () => {
    render(
      negotiationView({
        promises: [
          promise(),
          promise({ id: 'pr2', promiseType: 'EUROPEAN_FOOTBALL' }),
          promise({ id: 'pr3', promiseType: 'CONTRACT_REVIEW' }),
        ],
      }),
    );

    expect(await screen.findByText(/as many promises as this deal can carry/)).toBeInTheDocument();
  });
});

describe('tactics and bluffs', () => {
  it('shows each tactic with its time cost and risk', async () => {
    const api = render(negotiationView(), {
      [`POST /games/${GAME_ID}/negotiations/n1/actions`]: respond(negotiationView()),
    });

    const tactics = within(await screen.findByRole('region', { name: 'Tactics' }));
    expect(tactics.getByRole('button', { name: 'Delay your response · 1 day' })).toBeInTheDocument();
    expect(tactics.getByText(/Try it twice and he may let you go/)).toBeInTheDocument();

    await userEvent.click(tactics.getByRole('button', { name: 'Pretend to walk away · 1 hour' }));

    expect(lastPost(api)?.body).toEqual({
      action: { type: 'TACTIC', tactic: 'PRETEND_WALK_AWAY' },
      expectedVersion: 1,
    });
  });

  it('lets you challenge an open claim', async () => {
    const api = render(negotiationView({ claims: [claim()] }), {
      [`POST /games/${GAME_ID}/negotiations/n1/actions`]: respond(
        negotiationView({ claims: [claim({ status: 'CALLED_FALSE' })] }),
      ),
    });

    const claims = within(await screen.findByRole('list', { name: 'Agent claims' }));
    expect(claims.getByText('“Madrid FC have made an approach.”')).toBeInTheDocument();
    expect(claims.getByRole('button', { name: 'Ask for details · 1 hour' })).toBeInTheDocument();
    await userEvent.click(claims.getByRole('button', { name: 'Call the bluff · 2 hours' }));

    expect(await screen.findByText(/Exposed as a bluff/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Call the bluff/ })).not.toBeInTheDocument();
    expect(lastPost(api)?.body).toEqual({ action: { type: 'CALL_BLUFF' }, expectedVersion: 1 });
  });

  it('explains when the agent has made no claims', async () => {
    render(negotiationView());

    expect(await screen.findByText(/has not made any claims/)).toBeInTheDocument();
  });
});

describe('dashboard commitments', () => {
  it('lists promises across negotiations with their status', async () => {
    useSessionStore.setState({ session: { gameId: GAME_ID, token: TOKEN } });
    mockApi({
      [`GET /games/${GAME_ID}`]: { body: { game: gameState() } },
      [`GET /games/${GAME_ID}/promises`]: {
        body: {
          promises: [promise({ status: 'AT_RISK' }), promise({ id: 'pr9', status: 'VOID' })],
          players: [{ id: 'p1', name: 'Alejandro Moreno' }],
        },
      },
    });

    renderRoute('/game');

    const panel = within(await screen.findByRole('region', { name: 'Commitments' }));
    expect(await panel.findByText('Alejandro Moreno: Captaincy')).toBeInTheDocument();
    expect(panel.getByText('At risk')).toBeInTheDocument();
    expect(panel.getAllByRole('listitem')).toHaveLength(1);
  });
});
