import type {
  AgentMood,
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
