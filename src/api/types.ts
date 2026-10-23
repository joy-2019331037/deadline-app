export type Position = 'GK' | 'LB' | 'CB' | 'RB' | 'DM' | 'CM' | 'AM' | 'LW' | 'RW' | 'ST';

export const POSITIONS: readonly Position[] = ['GK', 'LB', 'CB', 'RB', 'DM', 'CM', 'AM', 'LW', 'RW', 'ST'];

export type GameStatus = 'ACTIVE' | 'COMPLETED';
export type BoardObjectiveStatus = 'PENDING' | 'MET' | 'FAILED';
export type ShortlistPriority = 'PRIMARY' | 'BACKUP';
export type AvailabilityState = 'AVAILABLE' | 'TRANSFER_LISTED' | 'NOT_FOR_SALE' | 'TRANSFERRED';
export type RelationshipStatus = 'TRUSTED_PARTNER' | 'NEUTRAL' | 'FRUSTRATED' | 'HOSTILE' | 'BLACKLISTED';
export type FactConfidence = 'UNCERTAIN' | 'LIKELY' | 'STRONG';
export type StrengthLabel = 'POOR' | 'WEAK' | 'AVERAGE' | 'STRONG' | 'EXCELLENT';
export type AgeProfileLabel = 'YOUNG' | 'BALANCED' | 'AGING';
export type SquadWeakness = 'NO_RELIABLE_STRIKER' | 'AGING_DEFENCE' | 'THIN_SQUAD' | 'HIGH_WAGE_BILL';

export interface ClubDto {
  id: string;
  name: string;
  shortName: string;
  country: string;
  league: string;
  prestige: number;
  isUserClub: boolean;
}

export interface GameClock {
  day: number;
  hour: number;
  windowLengthDays: number;
  elapsedHours: number;
  remainingHours: number;
  isDeadlineDay: boolean;
  isWindowClosed: boolean;
}

export interface BoardObjectiveDto {
  key: string;
  description: string;
  priority: number;
  status: BoardObjectiveStatus;
}

export interface ShortlistEntryDto {
  playerId: string;
  priority: ShortlistPriority;
  addedAtGameHour: number;
}

export interface GameStateDto {
  id: string;
  status: GameStatus;
  club: ClubDto | null;
  clock: GameClock;
  budgets: {
    transfer: number;
    wage: number;
    initialTransfer: number;
    initialWage: number;
  };
  boardObjectives: BoardObjectiveDto[];
  shortlist: ShortlistEntryDto[];
  activeNegotiationIds: string[];
  signedPlayerIds: string[];
  soldPlayerIds: string[];
  reputation: {
    identity: ReputationIdentity | null;
    traits: { identity: ReputationIdentity; level: 'EMERGING' | 'ESTABLISHED' }[];
  };
  version: number;
}

export interface GameEventDto {
  id: string;
  eventType: string;
  payload: Record<string, unknown>;
  createdAtGameHour: number;
}

export interface PlayerStatsDto {
  appearances: number;
  goals: number;
  assists: number;
  cleanSheets: number;
}

export interface PlayerDto {
  id: string;
  name: string;
  nationality: string;
  age: number;
  position: Position;
  rating: number;
  stats: PlayerStatsDto;
  currentClubId: string;
  contractYearsRemaining: number;
  marketValue: number;
  playingStyle: string;
  agentId: string;
  availabilityState: AvailabilityState;
}

export interface SquadPlayerDto extends PlayerDto {
  weeklyWage: number;
}

export interface AgentDto {
  id: string;
  name: string;
  agency: string;
  publicReputation: string;
  relationshipStatus: RelationshipStatus;
}

export interface DiscoveredFactDto {
  id: string;
  subjectId: string;
  subjectType: 'PLAYER' | 'AGENT' | 'CLUB';
  factType: string;
  relatedClubId: string | null;
  interpretation: string;
  confidence: FactConfidence;
  sourceType: string;
  discoveredAtGameHour: number;
  expiresAtGameHour: number | null;
}

export interface SquadAnalysis {
  ratings: {
    attack: StrengthLabel;
    midfield: StrengthLabel;
    defence: StrengthLabel;
    depth: StrengthLabel;
    ageProfile: AgeProfileLabel;
  };
  weaknesses: SquadWeakness[];
  squadSize: number;
  averageAge: number;
  startingAverageAge: number;
  startingElevenIds: string[];
  wages: { totalWeekly: number; averageWeekly: number; highestWeekly: number };
  contracts: {
    expiringPlayerIds: string[];
    byYearsRemaining: { years: number; count: number }[];
  };
}

export interface SquadReport {
  players: SquadPlayerDto[];
  analysis: SquadAnalysis;
}

export interface MarketResponse {
  players: PlayerDto[];
  clubs: ClubDto[];
}

export interface PlayerProfile {
  player: PlayerDto | SquadPlayerDto;
  isOwnPlayer: boolean;
  club: ClubDto | null;
  agent: AgentDto | null;
  shortlistPriority: ShortlistPriority | null;
  intelligence: DiscoveredFactDto[];
  clubIntelligence: DiscoveredFactDto[];
  rivalInterest: RivalInterestDto[];
}

export type InterestLabel = 'CONFIRMED' | 'RUMORED' | 'UNKNOWN';

export interface RivalInterestDto {
  clubId: string;
  clubName: string;
  label: InterestLabel;
}

export interface JournalistDto {
  id: string;
  name: string;
  outlet: string;
  reputation: string;
}

export type Investigation =
  | { kind: 'CONTACT_INSIDER'; playerId: string }
  | { kind: 'ASK_JOURNALIST'; playerId: string; journalistId: string }
  | { kind: 'STUDY_CLUB'; clubId: string }
  | { kind: 'MONITOR_SOCIAL_MEDIA'; playerId: string };

export interface GameCommandResponse {
  game: GameStateDto;
  event: GameEventDto;
  replayed: boolean;
}

export type ReputationIdentity =
  'LOWBALLER' | 'BIG_SPENDER' | 'PROMISE_KEEPER' | 'OPPORTUNIST' | 'UNTRUSTWORTHY';

export interface CreateGameResponse {
  game: GameStateDto;
  sessionToken: string;
}

export type GameAction =
  | { type: 'WAIT'; hours: number }
  | { type: 'SHORTLIST_PLAYER'; playerId: string; priority: ShortlistPriority }
  | { type: 'REMOVE_FROM_SHORTLIST'; playerId: string };

export type SquadRole = 'KEY_PLAYER' | 'STARTER' | 'ROTATION' | 'BACKUP' | 'PROSPECT';

export const SQUAD_ROLES: readonly SquadRole[] = ['KEY_PLAYER', 'STARTER', 'ROTATION', 'BACKUP', 'PROSPECT'];

export type NegotiationStatus =
  | 'NOT_CONTACTED'
  | 'CONTACTED'
  | 'INFORMATION_GATHERING'
  | 'NEGOTIATING'
  | 'TERMS_AGREED'
  | 'MEDICAL_PENDING'
  | 'COMPLETED'
  | 'REJECTED'
  | 'WALKED_AWAY'
  | 'EXPIRED'
  | 'HIJACKED';

export type NegotiationFailureReason =
  'FINANCIAL' | 'RELATIONSHIP' | 'COMPETITION' | 'TIME' | 'PROMISE_CONFLICT' | 'WITHDRAWAL';

export type OfferOutcome = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'COUNTERED';
export type AgentMood = 'RECEPTIVE' | 'IMPATIENT' | 'EXASPERATED';
export type Speaker = 'USER' | 'AGENT' | 'SYSTEM';

export interface ContractTerms {
  transferFee: number;
  weeklyWage: number;
  contractYears: number;
  signingBonus: number;
  goalBonus: number;
  appearanceBonus: number;
  loyaltyBonus: number;
  releaseClause: number | null;
  squadRole: SquadRole;
  captaincy: boolean;
}

export interface OfferDto {
  id: string;
  terms: ContractTerms;
  submittedAtGameHour: number;
  outcome: OfferOutcome;
}

export interface CounterofferDto {
  id: string;
  fromParty: 'SELLING_CLUB' | 'AGENT';
  terms: ContractTerms;
  createdAtGameHour: number;
}

export interface NegotiationDto {
  id: string;
  playerId: string;
  agentId: string;
  sellingClubId: string;
  status: NegotiationStatus;
  failureReason: NegotiationFailureReason | null;
  offers: OfferDto[];
  counteroffers: CounterofferDto[];
  proposedTerms: ContractTerms | null;
  agreedTerms: ContractTerms | null;
  promiseIds: string[];
  startedAtGameHour: number;
  expiresAtGameHour: number | null;
  lastInteractionAtGameHour: number | null;
  version: number;
}

export interface MessageDto {
  id: string;
  negotiationId: string;
  speaker: Speaker;
  content: string;
  tone: string | null;
  intent: string | null;
  createdAtGameHour: number;
}

export interface NegotiationView {
  negotiation: NegotiationDto;
  player: PlayerDto;
  agent: AgentDto;
  club: ClubDto | null;
  messages: MessageDto[];
  agentMood: AgentMood;
  outcomeNarrative: string | null;
}

export interface NegotiationActionResponse extends NegotiationView {
  game: GameStateDto;
  event: GameEventDto;
  replayed: boolean;
}

export interface NegotiationList {
  negotiations: NegotiationDto[];
  players: PlayerDto[];
  agents: AgentDto[];
}

export interface ActionResponse {
  game: GameStateDto;
  event: GameEventDto;
  replayed: boolean;
}
