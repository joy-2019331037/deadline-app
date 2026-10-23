import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { ContractTerms, NegotiationView } from '../../api/types.ts';
import { useSessionStore } from '../../stores/sessionStore.ts';
import { GAME_ID, gameState, negotiationView, TOKEN } from '../../test/fixtures.ts';
import { mockApi, type ApiRoutes } from '../../test/mockApi.ts';
import { renderRoute } from '../../test/render.tsx';

const counter: ContractTerms = {
  transferFee: 57_300_000,
  weeklyWage: 176_000,
  contractYears: 4,
  signingBonus: 920_000,
  goalBonus: 0,
  appearanceBonus: 0,
  loyaltyBonus: 0,
  releaseClause: null,
  squadRole: 'STARTER',
  captaincy: false,
};

function renderNegotiation(view: NegotiationView = negotiationView(), routes: ApiRoutes = {}) {
  useSessionStore.setState({ session: { gameId: GAME_ID, token: TOKEN } });
  const api = mockApi({
    [`GET /games/${GAME_ID}`]: {
      body: { game: gameState({ version: 1, clock: { ...gameState().clock, elapsedHours: 2, hour: 2 } }) },
    },
    [`GET /games/${GAME_ID}/negotiations/n1`]: { body: view },
    ...routes,
  });
  renderRoute('/game/negotiations/n1');
  return api;
}

const respond = (view: NegotiationView, version = 2) => ({
  body: { ...view, game: gameState({ version }), event: { id: 'e2' }, replayed: false },
});

const lastPost = (api: ReturnType<typeof mockApi>) => {
  const call = api.calls.filter((c) => c.method === 'POST').at(-1);
  return {
    path: call?.path,
    body: JSON.parse(String(call?.init.body)),
    headers: new Headers(call?.init.headers),
  };
};

describe('NegotiationPage', () => {
  it('shows the agent, relationship, mood, phase, and expiry', async () => {
    renderNegotiation();

    expect(await screen.findByRole('heading', { name: 'Alejandro Moreno', level: 1 })).toBeInTheDocument();
    expect(screen.getByText('First contact')).toBeInTheDocument();
    expect(screen.getByText('Talks lapse in 4 days without contact')).toBeInTheDocument();
    const agent = within(screen.getByRole('region', { name: 'Agent' }));
    expect(agent.getByText('Victor Kane')).toBeInTheDocument();
    expect(agent.getByText('Never leaves money on the table.')).toBeInTheDocument();
    expect(agent.getByText('Neutral')).toBeInTheDocument();
    expect(agent.getByText('Receptive')).toBeInTheDocument();
  });

  it('renders conversation history as plain text', async () => {
    const view = negotiationView({
      messages: [
        {
          id: 'm9',
          negotiationId: 'n1',
          speaker: 'USER',
          content: '<img src=x onerror="alert(1)"> what wages?',
          tone: null,
          intent: 'message',
          createdAtGameHour: 3,
        },
      ],
    });
    renderNegotiation(view);

    const conversation = within(await screen.findByRole('list', { name: 'Conversation' }));
    expect(conversation.getByText('<img src=x onerror="alert(1)"> what wages?')).toBeInTheDocument();
    expect(conversation.getByText('You')).toBeInTheDocument();
    expect(document.querySelector('img')).toBeNull();
  });

  it('shows the time cost of every action', async () => {
    renderNegotiation();

    expect(await screen.findByRole('button', { name: 'Send · 1 hour' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit offer · 4 hours' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Walk away · 1 hour' })).toBeInTheDocument();
  });

  it('validates the offer before sending it', async () => {
    const api = renderNegotiation();
    const user = userEvent.setup();
    await screen.findByRole('form', { name: 'Offer builder' });

    await user.click(screen.getByRole('button', { name: 'Submit offer · 4 hours' }));

    expect(screen.getByRole('spinbutton', { name: /Weekly wage/ })).toHaveAccessibleDescription(
      'Enter a weekly wage',
    );

    await user.type(screen.getByRole('spinbutton', { name: /Weekly wage/ }), '400');
    await user.clear(screen.getByRole('spinbutton', { name: /Release clause/ }));
    await user.type(screen.getByRole('spinbutton', { name: /Release clause/ }), '10');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Squad role' }), 'BACKUP');
    await user.click(screen.getByRole('checkbox', { name: 'Offer the captaincy' }));
    await user.click(screen.getByRole('button', { name: 'Submit offer · 4 hours' }));

    expect(screen.getByRole('spinbutton', { name: /Weekly wage/ })).toHaveAccessibleDescription(
      'The wage exceeds your remaining wage budget',
    );
    expect(screen.getByRole('spinbutton', { name: /Release clause/ })).toHaveAccessibleDescription(
      'A release clause cannot be lower than the fee',
    );
    expect(screen.getByRole('checkbox', { name: 'Offer the captaincy' })).toHaveAccessibleDescription(
      'Only a starter or key player can be captain',
    );
    expect(api.calls.filter((call) => call.method === 'POST')).toHaveLength(0);
  });

  it('submits a structured offer in whole pounds and shows the reply', async () => {
    const reply = negotiationView(
      {
        messages: [
          ...negotiationView().messages,
          {
            id: 'm2',
            negotiationId: 'n1',
            speaker: 'AGENT',
            content: 'Valdoria want £57.3M, and my client is looking for £176K/wk.',
            tone: 'guarded',
            intent: 'counteroffer',
            createdAtGameHour: 6,
          },
        ],
      },
      {
        status: 'NEGOTIATING',
        version: 1,
        proposedTerms: counter,
        counteroffers: [
          { id: 'c1', fromParty: 'SELLING_CLUB', terms: counter, createdAtGameHour: 6 },
          { id: 'c2', fromParty: 'AGENT', terms: counter, createdAtGameHour: 6 },
        ],
      },
    );
    const api = renderNegotiation(negotiationView(), {
      [`POST /games/${GAME_ID}/negotiations/n1/offers`]: respond(reply),
    });
    const user = userEvent.setup();

    await user.clear(await screen.findByRole('spinbutton', { name: /Transfer fee/ }));
    await user.type(screen.getByRole('spinbutton', { name: /Transfer fee/ }), '50.5');
    await user.type(screen.getByRole('spinbutton', { name: /Weekly wage/ }), '120');
    await user.click(screen.getByRole('button', { name: 'Submit offer · 4 hours' }));

    expect(
      await screen.findByText('Valdoria want £57.3M, and my client is looking for £176K/wk.'),
    ).toBeInTheDocument();
    const post = lastPost(api);
    expect(post.path).toBe(`/games/${GAME_ID}/negotiations/n1/offers`);
    expect(post.body).toEqual({
      expectedVersion: 1,
      terms: {
        transferFee: 50_500_000,
        weeklyWage: 120_000,
        contractYears: 4,
        signingBonus: 0,
        goalBonus: 0,
        appearanceBonus: 0,
        loyaltyBonus: 0,
        releaseClause: null,
        squadRole: 'STARTER',
        captaincy: false,
      },
    });
    expect(post.headers.get('Idempotency-Key')).toBeTruthy();
    expect(screen.getByText('Negotiating')).toBeInTheDocument();
    expect(screen.getByText('£57.3M fee')).toBeInTheDocument();
  });

  it('fills the form from the latest demands', async () => {
    renderNegotiation(negotiationView({}, { status: 'NEGOTIATING', proposedTerms: counter }));
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Fill in their latest demands' }));

    expect(screen.getByRole('spinbutton', { name: /Transfer fee/ })).toHaveValue(57.3);
    expect(screen.getByRole('spinbutton', { name: /Weekly wage/ })).toHaveValue(176);
    expect(screen.getByRole('spinbutton', { name: /Signing bonus/ })).toHaveValue(920);
  });

  it('shows server-side budget errors against the right field', async () => {
    renderNegotiation(negotiationView(), {
      [`POST /games/${GAME_ID}/negotiations/n1/offers`]: {
        status: 422,
        body: {
          error: {
            code: 'BUDGET_EXCEEDED',
            message: 'This offer is over budget',
            details: [
              { path: 'terms.transferFee', message: 'The fee and signing bonus exceed your transfer budget' },
            ],
          },
        },
      },
    });
    const user = userEvent.setup();

    await user.type(await screen.findByRole('spinbutton', { name: /Weekly wage/ }), '150');
    await user.click(screen.getByRole('button', { name: 'Submit offer · 4 hours' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('This offer is over budget');
    expect(screen.getByRole('spinbutton', { name: /Transfer fee/ })).toHaveAccessibleDescription(
      'The fee and signing bonus exceed your transfer budget',
    );
  });

  it('sends a message to the agent', async () => {
    const reply = negotiationView(
      {
        messages: [
          ...negotiationView().messages,
          {
            id: 'm3',
            negotiationId: 'n1',
            speaker: 'USER',
            content: 'What wages is he after?',
            tone: null,
            intent: 'message',
            createdAtGameHour: 3,
          },
          {
            id: 'm4',
            negotiationId: 'n1',
            speaker: 'AGENT',
            content: 'He expects a substantial pay rise to move.',
            tone: 'firm',
            intent: 'inform',
            createdAtGameHour: 3,
          },
        ],
      },
      { status: 'INFORMATION_GATHERING', version: 1 },
    );
    const api = renderNegotiation(negotiationView(), {
      [`POST /games/${GAME_ID}/negotiations/n1/messages`]: respond(reply),
    });
    const user = userEvent.setup();

    await user.type(
      await screen.findByRole('textbox', { name: 'Message to Victor Kane' }),
      'What wages is he after?',
    );
    await user.click(screen.getByRole('button', { name: 'Send · 1 hour' }));

    expect(await screen.findByText('He expects a substantial pay rise to move.')).toBeInTheDocument();
    expect(lastPost(api).body).toEqual({ content: 'What wages is he after?', expectedVersion: 1 });
    expect(screen.getByRole('textbox', { name: 'Message to Victor Kane' })).toHaveValue('');
    expect(screen.getByText('Gathering information')).toBeInTheDocument();
  });

  it('asks for confirmation before walking away', async () => {
    const closed = negotiationView(
      { outcomeNarrative: 'You walked away from the deal for Alejandro Moreno.' },
      { status: 'WALKED_AWAY', failureReason: 'WITHDRAWAL', version: 1 },
    );
    const api = renderNegotiation(negotiationView(), {
      [`POST /games/${GAME_ID}/negotiations/n1/actions`]: respond(closed),
    });
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Walk away · 1 hour' }));
    await user.click(screen.getByRole('button', { name: 'Keep talking' }));
    expect(api.calls.filter((call) => call.method === 'POST')).toHaveLength(0);

    await user.click(screen.getByRole('button', { name: 'Walk away · 1 hour' }));
    await user.click(screen.getByRole('button', { name: 'Yes, walk away' }));

    expect(await screen.findByRole('heading', { name: 'You walked away' })).toBeInTheDocument();
    expect(lastPost(api).body).toEqual({ action: { type: 'WALK_AWAY' }, expectedVersion: 1 });
  });

  it('explains why talks failed instead of showing a generic error', async () => {
    renderNegotiation(
      negotiationView(
        {
          outcomeNarrative: 'Victor Kane took your offers as a sign of disrespect and has broken off talks.',
        },
        { status: 'REJECTED', failureReason: 'RELATIONSHIP' },
      ),
    );

    expect(await screen.findByRole('heading', { name: 'Relationship breakdown' })).toBeInTheDocument();
    expect(screen.getByText(/took your offers as a sign of disrespect/)).toBeInTheDocument();
    expect(screen.queryByRole('form', { name: 'Offer builder' })).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByText(/transfer failed/i)).not.toBeInTheDocument();
  });

  it('celebrates a completed signing', async () => {
    renderNegotiation(
      negotiationView(
        {},
        { status: 'COMPLETED', agreedTerms: { ...counter, transferFee: 53_000_000, signingBonus: 0 } },
      ),
    );

    expect(await screen.findByRole('heading', { name: 'Deal complete' })).toBeInTheDocument();
    expect(screen.getByText(/£53M fee · £176K\/wk · 4 years · Starter/)).toBeInTheDocument();
  });

  it('handles a missing negotiation', async () => {
    renderNegotiation(negotiationView(), {
      [`GET /games/${GAME_ID}/negotiations/n1`]: {
        status: 404,
        body: { error: { code: 'NEGOTIATION_NOT_FOUND', message: 'Negotiation not found' } },
      },
    });

    expect(await screen.findByText('This negotiation could not be found.')).toBeInTheDocument();
  });
});
