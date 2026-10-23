import type {
  AgentMood,
  ClaimStatus,
  PromiseDto,
  PromiseStatus,
  PromiseType,
  Tactic,
  ContractTerms,
  NegotiationFailureReason,
  NegotiationStatus,
  SquadRole,
} from '../api/types.ts';
import { formatHours, formatMoney, formatWage } from './format.ts';

export const ACTION_COSTS = { contact: 2, message: 1, offer: 4, walkAway: 1 } as const;

export const STATUS_TEXT: Record<NegotiationStatus, string> = {
  NOT_CONTACTED: 'Not contacted',
  CONTACTED: 'First contact',
  INFORMATION_GATHERING: 'Gathering information',
  NEGOTIATING: 'Negotiating',
  TERMS_AGREED: 'Terms agreed',
  MEDICAL_PENDING: 'Medical',
  COMPLETED: 'Signed',
  REJECTED: 'Talks collapsed',
  WALKED_AWAY: 'Walked away',
  EXPIRED: 'Expired',
  HIJACKED: 'Hijacked',
};

export const FAILURE_TITLES: Record<NegotiationFailureReason, string> = {
  FINANCIAL: 'Financial breakdown',
  RELATIONSHIP: 'Relationship breakdown',
  COMPETITION: 'Lost to a rival',
  TIME: 'Time ran out',
  PROMISE_CONFLICT: 'Promise conflict',
  WITHDRAWAL: 'You walked away',
};

export const MOOD_TEXT: Record<AgentMood, { label: string; description: string }> = {
  RECEPTIVE: { label: 'Receptive', description: 'Willing to keep talking.' },
  IMPATIENT: { label: 'Impatient', description: 'Running out of patience. Make your next move count.' },
  EXASPERATED: { label: 'Exasperated', description: 'One more misstep could end these talks.' },
};

export const ROLE_TEXT: Record<SquadRole, string> = {
  KEY_PLAYER: 'Key player',
  STARTER: 'Starter',
  ROTATION: 'Rotation',
  BACKUP: 'Backup',
  PROSPECT: 'Prospect',
};

export function describeTerms(terms: ContractTerms): string[] {
  const parts = [
    `${formatMoney(terms.transferFee)} fee`,
    formatWage(terms.weeklyWage),
    `${terms.contractYears} year${terms.contractYears === 1 ? '' : 's'}`,
    ROLE_TEXT[terms.squadRole],
  ];
  if (terms.signingBonus) parts.push(`${formatMoney(terms.signingBonus)} signing bonus`);
  if (terms.goalBonus) parts.push(`${formatMoney(terms.goalBonus)} per goal`);
  if (terms.appearanceBonus) parts.push(`${formatMoney(terms.appearanceBonus)} per appearance`);
  if (terms.loyaltyBonus) parts.push(`${formatMoney(terms.loyaltyBonus)} loyalty bonus`);
  if (terms.releaseClause !== null) parts.push(`${formatMoney(terms.releaseClause)} release clause`);
  if (terms.captaincy) parts.push('Captaincy');
  return parts;
}

export function describeExpiry(expiresAtGameHour: number | null, elapsedHours: number): string | null {
  if (expiresAtGameHour === null) return null;
  const remaining = expiresAtGameHour - elapsedHours;
  if (remaining <= 0) return 'Talks have lapsed';
  return `Talks lapse in ${formatHours(remaining)} without contact`;
}

export const PROMISE_INFO: Record<PromiseType, { label: string; terms: (player: string) => string }> = {
  GUARANTEED_STARTER: {
    label: 'Guaranteed starter',
    terms: (player) => `${player} will be a guaranteed starter in his position.`,
  },
  IMPORTANT_PLAYER: {
    label: 'Important player',
    terms: (player) => `${player} will be treated as an important member of the squad.`,
  },
  CAPTAINCY: { label: 'Captaincy', terms: (player) => `${player} will be named club captain.` },
  BUILD_AROUND: {
    label: 'Build the team around him',
    terms: (player) => `The team will be built around ${player}.`,
  },
  EUROPEAN_FOOTBALL: {
    label: 'European football',
    terms: () => 'The club will qualify for European football.',
  },
  CONTRACT_REVIEW: {
    label: 'Contract review',
    terms: (player) => `${player}'s contract will be reviewed after one season.`,
  },
};

export const PROMISE_DUE_TEXT: Record<PromiseDto['dueCondition']['kind'], string> = {
  ON_SIGNING: 'when he signs',
  BY_WINDOW_END: 'by the end of the window',
  BY_GAME_HOUR: 'by the agreed deadline',
  NEXT_SEASON: 'over the coming season',
};

export const PROMISE_DUE_BY_TYPE: Record<PromiseType, PromiseDto['dueCondition']['kind']> = {
  GUARANTEED_STARTER: 'BY_WINDOW_END',
  IMPORTANT_PLAYER: 'NEXT_SEASON',
  CAPTAINCY: 'BY_WINDOW_END',
  BUILD_AROUND: 'NEXT_SEASON',
  EUROPEAN_FOOTBALL: 'NEXT_SEASON',
  CONTRACT_REVIEW: 'NEXT_SEASON',
};

export const PROMISE_STATUS_TEXT: Record<PromiseStatus, string> = {
  ACTIVE: 'Active',
  FULFILLED: 'Kept',
  BROKEN: 'Broken',
  AT_RISK: 'At risk',
  VOID: 'Void',
};

export const MAX_PROMISES = 3;

export const TACTIC_INFO: Record<Tactic, { label: string; hours: number; risk: string }> = {
  PRETEND_WALK_AWAY: {
    label: 'Pretend to walk away',
    hours: 1,
    risk: 'May soften demands. Try it twice and he may let you go.',
  },
  DELAY_RESPONSE: {
    label: 'Delay your response',
    hours: 24,
    risk: 'Desperate clubs may soften; impatient agents will not enjoy waiting.',
  },
  CREATE_URGENCY: {
    label: 'Demand a quick answer',
    hours: 1,
    risk: 'Works when the deadline or your alternatives are real.',
  },
  LEAK_COMPETING_INTEREST: {
    label: 'Mention other targets',
    hours: 1,
    risk: 'Strong leverage if true. Manipulative agents spot a lie.',
  },
  PUBLIC_DENIAL: {
    label: 'Publicly deny interest',
    hours: 2,
    risk: 'Cools the market, but the player and agent may take offence.',
  },
};

export const CLAIM_STATUS_TEXT: Record<ClaimStatus, string> = {
  OPEN: 'Unverified claim',
  DETAILS_GIVEN: 'Details given',
  CALLED_TRUE: 'Confirmed: the interest is real',
  CALLED_FALSE: 'Exposed as a bluff',
};
