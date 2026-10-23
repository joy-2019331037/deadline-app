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
}

export interface CreateGameResponse {
  game: GameStateDto;
  sessionToken: string;
}

export type GameAction =
  | { type: 'WAIT'; hours: number }
  | { type: 'SHORTLIST_PLAYER'; playerId: string; priority: ShortlistPriority }
  | { type: 'REMOVE_FROM_SHORTLIST'; playerId: string };

export interface ActionResponse {
  game: GameStateDto;
  event: GameEventDto;
  replayed: boolean;
}
