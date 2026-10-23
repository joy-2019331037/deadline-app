import type { AgentMood } from '../api/types.ts';

const MOOD_HESITATION: Record<AgentMood, number> = {
  RECEPTIVE: 0,
  IMPATIENT: 400,
  EXASPERATED: 900,
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** How long an agent takes to read your message and type a reply of this length. */
export function replyDelay(content: string, mood: AgentMood): number {
  return clamp(900 + content.length * 22, 1400, 4200) + MOOD_HESITATION[mood];
}

/** Pause before a second line from the same agent arrives. */
export function followUpDelay(content: string): number {
  return clamp(700 + content.length * 12, 900, 2500);
}

/** Never reveal faster than this, so the typing indicator is always seen. */
export const MIN_REVEAL_MS = 350;
