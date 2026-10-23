import type {
  DiscoveredFactDto,
  FactConfidence,
  InterestLabel,
  MediaAction,
  RelationshipStatus,
} from '../api/types.ts';

export const INTELLIGENCE_TOPICS = [
  { factType: 'WAGE_EXPECTATIONS', label: 'Wage expectations' },
  { factType: 'MOTIVATION', label: 'What motivates him' },
  { factType: 'PLAYING_TIME', label: 'Playing time expectations' },
  { factType: 'CLUB_INTEREST', label: 'Interest in your club' },
  { factType: 'OTHER_CLUB_INTEREST', label: 'Interest from other clubs' },
  { factType: 'WILLINGNESS_TO_MOVE', label: 'Willingness to move' },
  { factType: 'CURRENT_CLUB_MOOD', label: 'Mood at his club' },
  { factType: 'FAMILY_INFLUENCE', label: 'Family influence' },
  { factType: 'LOYALTY', label: 'Loyalty to current club' },
] as const;

export const CONFIDENCE_TEXT: Record<FactConfidence, string> = {
  UNCERTAIN: 'Uncertain',
  LIKELY: 'Likely',
  STRONG: 'Strong evidence',
};

export const RELATIONSHIP_TEXT: Record<RelationshipStatus, string> = {
  TRUSTED_PARTNER: 'Trusted Partner',
  NEUTRAL: 'Neutral',
  FRUSTRATED: 'Frustrated',
  HOSTILE: 'Hostile',
  BLACKLISTED: 'Blacklisted',
};

export const INTEREST_TEXT: Record<InterestLabel, string> = {
  CONFIRMED: 'Confirmed interest',
  RUMORED: 'Rumored interest',
  UNKNOWN: 'Unknown',
};

export const SOURCE_TEXT: Record<string, string> = {
  SCOUT: 'Scout report',
  JOURNALIST: 'Journalist',
  INSIDER: 'Transfer insider',
  CLUB_CONTACT: 'Club contact',
  CLUB_STUDY: 'Club study',
  SOCIAL_MEDIA: 'Social media',
  CONVERSATION: 'Conversation',
};

export const INFORMATION_COSTS = {
  scout: 48,
  insider: 12,
  journalist: 6,
  socialMedia: 6,
  studyClub: 24,
  investigateRumor: 24,
  media: 2,
} as const;

export function factLabel(factType: string): string {
  if (factType === 'SELLING_STANCE') return 'Willingness to sell';
  return INTELLIGENCE_TOPICS.find((topic) => topic.factType === factType)?.label ?? factType;
}

export function isOutdated(
  fact: Pick<DiscoveredFactDto, 'expiresAtGameHour'>,
  elapsedHours: number,
): boolean {
  return fact.expiresAtGameHour !== null && fact.expiresAtGameHour <= elapsedHours;
}

export function unknownTopics(facts: DiscoveredFactDto[], elapsedHours = 0): string[] {
  const known = new Set(facts.filter((fact) => !isOutdated(fact, elapsedHours)).map((fact) => fact.factType));
  return INTELLIGENCE_TOPICS.filter((topic) => !known.has(topic.factType)).map((topic) => topic.label);
}

export const MEDIA_ACTION_TEXT: Record<MediaAction, string> = {
  LEAK_INTEREST: 'Leak your interest',
  DENY_NEGOTIATIONS: 'Publicly deny interest',
  PRAISE_PLAYER: 'Praise him publicly',
  DECLARE_OVER: 'Declare talks over',
};
