import type { DiscoveredFactDto, FactConfidence, RelationshipStatus } from '../api/types.ts';

export const INTELLIGENCE_TOPICS = [
  { factType: 'WAGE_EXPECTATIONS', label: 'Minimum acceptable wage' },
  { factType: 'MOTIVATION', label: 'What motivates him' },
  { factType: 'CLUB_INTEREST', label: 'Interest in your club' },
  { factType: 'OTHER_CLUB_INTEREST', label: 'Interest from other clubs' },
  { factType: 'PLAYING_TIME', label: 'Playing time expectations' },
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

export const SOURCE_TEXT: Record<string, string> = {
  SCOUT: 'Scout report',
  JOURNALIST: 'Journalist',
  INSIDER: 'Transfer insider',
  CLUB_CONTACT: 'Club contact',
  CLUB_STUDY: 'Club study',
  SOCIAL_MEDIA: 'Social media',
  CONVERSATION: 'Conversation',
};

export function unknownTopics(facts: DiscoveredFactDto[]): string[] {
  const known = new Set(facts.map((fact) => fact.factType));
  return INTELLIGENCE_TOPICS.filter((topic) => !known.has(topic.factType)).map((topic) => topic.label);
}
