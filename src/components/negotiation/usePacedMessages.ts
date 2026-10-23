import { useEffect, useRef, useState } from 'react';
import type { AgentMood, MessageDto } from '../../api/types.ts';
import { followUpDelay, MIN_REVEAL_MS, replyDelay } from '../../lib/pacing.ts';

interface Tracked {
  messages: MessageDto[];
  seen: ReadonlySet<string>;
  /** Agent lines that have arrived from the server but are still being "typed". */
  held: readonly string[];
}

interface PacingOptions {
  enabled: boolean;
  /** True while a negotiation command is in flight. */
  pending: boolean;
  mood: AgentMood;
}

/**
 * Holds back newly arrived agent lines and reveals them one at a time, as if the agent were reading and
 * typing. Lines already present on first render are shown at once, and the conversation never reorders.
 */
export function usePacedMessages(messages: MessageDto[], { enabled, pending, mood }: PacingOptions) {
  const [tracked, setTracked] = useState<Tracked>(() => ({
    messages,
    seen: new Set(messages.map((message) => message.id)),
    held: [],
  }));
  const sentAt = useRef<number | null>(null);

  if (tracked.messages !== messages) {
    const fresh = messages.filter((message) => !tracked.seen.has(message.id));
    const seen = new Set(tracked.seen);
    for (const message of fresh) seen.add(message.id);
    const arriving = enabled
      ? fresh.filter((message) => message.speaker === 'AGENT').map((message) => message.id)
      : [];
    setTracked({ messages, seen, held: [...tracked.held, ...arriving] });
  } else if (!enabled && tracked.held.length > 0) {
    setTracked({ ...tracked, held: [] });
  }

  useEffect(() => {
    if (pending) sentAt.current = Date.now();
  }, [pending]);

  const next = tracked.held[0];
  const nextContent = messages.find((message) => message.id === next)?.content ?? '';

  useEffect(() => {
    if (!next) return;
    const startedAt = sentAt.current;
    sentAt.current = null;
    // The first line of a reply counts the time already spent waiting on the server.
    const wait =
      startedAt === null
        ? followUpDelay(nextContent)
        : replyDelay(nextContent, mood) - (Date.now() - startedAt);
    const timer = setTimeout(
      () => setTracked((current) => ({ ...current, held: current.held.slice(1) })),
      Math.max(MIN_REVEAL_MS, wait),
    );
    return () => clearTimeout(timer);
  }, [next, nextContent, mood]);

  const firstHeld = next ? messages.findIndex((message) => message.id === next) : -1;
  const visible = firstHeld === -1 ? messages : messages.slice(0, firstHeld);

  return {
    visible,
    /** The agent is "typing": a command is in flight or lines are still being revealed. */
    typing: pending || tracked.held.length > 0,
    revealing: tracked.held.length > 0,
  };
}
