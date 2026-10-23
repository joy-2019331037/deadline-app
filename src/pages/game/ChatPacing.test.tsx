import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MessageDto, NegotiationView } from '../../api/types.ts';
import { replyDelay } from '../../lib/pacing.ts';
import { useSessionStore } from '../../stores/sessionStore.ts';
import { useSettingsStore } from '../../stores/settingsStore.ts';
import { GAME_ID, gameState, negotiationView, TOKEN } from '../../test/fixtures.ts';
import { mockApi, type ApiRoutes } from '../../test/mockApi.ts';
import { renderRoute } from '../../test/render.tsx';

const QUESTION = 'What wages is he after?';
const ANSWER = 'He expects a substantial pay rise to move.';

const line = (id: string, speaker: MessageDto['speaker'], content: string): MessageDto => ({
  id,
  negotiationId: 'n1',
  speaker,
  content,
  tone: null,
  intent: null,
  createdAtGameHour: 3,
});

function replied(): NegotiationView {
  return negotiationView(
    { messages: [...negotiationView().messages, line('m3', 'USER', QUESTION), line('m4', 'AGENT', ANSWER)] },
    { status: 'INFORMATION_GATHERING', version: 1 },
  );
}

function renderChat(routes: ApiRoutes) {
  useSessionStore.setState({ session: { gameId: GAME_ID, token: TOKEN } });
  mockApi({
    [`GET /games/${GAME_ID}`]: { body: { game: gameState({ version: 1 }) } },
    [`GET /games/${GAME_ID}/negotiations/n1`]: { body: negotiationView() },
    ...routes,
  });
  renderRoute('/game/negotiations/n1');
}

const respond = (view: NegotiationView) => ({
  body: { ...view, game: gameState({ version: 2 }), event: { id: 'e2' }, replayed: false },
});

async function send(user: ReturnType<typeof userEvent.setup>) {
  const box = await screen.findByRole('textbox', { name: 'Message to Victor Kane' });
  await user.type(box, QUESTION);
  await user.keyboard('{Enter}');
}

describe('realistic reply timing', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows your message at once, then the agent typing, then the reply after a pause', async () => {
    useSettingsStore.setState({ realisticReplies: true });
    renderChat({ [`POST /games/${GAME_ID}/negotiations/n1/messages`]: respond(replied()) });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    await send(user);

    const conversation = within(screen.getByRole('list', { name: 'Conversation' }));
    expect(await conversation.findByText(QUESTION)).toBeInTheDocument();
    expect(await conversation.findByRole('status', { name: 'Victor Kane is typing' })).toBeInTheDocument();
    expect(conversation.queryByText(ANSWER)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send · 1 hour' })).toBeDisabled();

    await act(() => vi.advanceTimersByTimeAsync(replyDelay(ANSWER, 'RECEPTIVE')));

    expect(conversation.getByText(ANSWER)).toBeInTheDocument();
    expect(conversation.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows the reply as soon as it arrives when realistic timing is off', async () => {
    renderChat({ [`POST /games/${GAME_ID}/negotiations/n1/messages`]: respond(replied()) });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    await send(user);

    expect(await screen.findByText(ANSWER)).toBeInTheDocument();
    expect(screen.queryByRole('status', { name: 'Victor Kane is typing' })).not.toBeInTheDocument();
  });

  it('puts your message back in the box when sending fails', async () => {
    useSettingsStore.setState({ realisticReplies: true });
    renderChat({
      [`POST /games/${GAME_ID}/negotiations/n1/messages`]: {
        status: 429,
        body: { error: { code: 'RATE_LIMITED', message: 'Too many requests' } },
      },
    });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    await send(user);

    expect(await screen.findByRole('alert')).toHaveTextContent('Too many requests');
    expect(screen.getByRole('textbox', { name: 'Message to Victor Kane' })).toHaveValue(QUESTION);
    expect(screen.queryByRole('status', { name: 'Victor Kane is typing' })).not.toBeInTheDocument();
  });
});
