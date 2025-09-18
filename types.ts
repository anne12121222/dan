// Enums
export enum UserRole {
  OPERATOR = 'OPERATOR',
  MASTER_AGENT = 'MASTER_AGENT',
  AGENT = 'AGENT',
  PLAYER = 'PLAYER',
}

export enum FightStatus {
  SETTLED = 'SETTLED', // Waiting for operator to start
  BETTING_OPEN = 'BETTING_OPEN', // Bets can be placed
  BETTING_CLOSED = 'BETTING_CLOSED', // Bets are locked, fight in progress
}

export type BetChoice = 'RED' | 'WHITE';
export type FightWinner = BetChoice | 'DRAW' | 'CANCELLED';

// Base User
interface BaseUser {
  id: string; // UUID from Supabase Auth
  name: string;
  email: string;
  coinBalance: number;
}

// User Roles
export interface Player extends BaseUser {
  role: UserRole.PLAYER;
  agentId: string | null;
}

export interface Agent extends BaseUser {
  role: UserRole.AGENT;
  masterAgentId: string;
  commissionBalance: number;
  commissionRate: number;
  transferFee: number;
}

export interface MasterAgent extends BaseUser {
  role: UserRole.MASTER_AGENT;
  commissionBalance: number;
  commissionRate: number;
  transferFee: number;
}

export interface Operator extends BaseUser {
  role: UserRole.OPERATOR;
}

// Union Type for any user
export type AllUserTypes = Player | Agent | MasterAgent | Operator;

// Betting & Fights
export interface Bet {
  id: string;
  userId: string;
  fightId: number;
  amount: number;
  choice: BetChoice;
}

export interface UpcomingFight {
  id: number;
  participants: {
    red: string;
    white: string;
  };
  status: 'UPCOMING';
}

export interface FightResult {
  id: number;
  winner: FightWinner;
  commission: number; // For operator/MA view
}

// For player-specific history
export interface PlayerFightHistoryEntry extends FightResult {
  bet: Bet | null;
  outcome: 'WIN' | 'LOSS' | 'REFUND' | null;
}

// Transactions & Requests
export interface Transaction {
  id: string;
  from_user_id: string | null; // null for MINT
  to_user_id: string;
  amount: number;
  type: 'MINT' | 'TRANSFER' | 'COMMISSION';
  transaction_timestamp: string;
}

export interface CoinRequest {
  id: string;
  from_user_id: string;
  to_user_id: string;
  amount: number;
  status: 'PENDING' | 'APPROVED' | 'DECLINED';
  created_at: string;
}

// Messaging
export interface Message {
    id: string;
    senderId: string;
    receiverId: string;
    text: string;
    amount: number;
    createdAt: string;
}

// Component Props
export interface AuthViewProps {
  onLogin: (email: string, password: string) => Promise<string | null>;
  onRegister: (name: string, email: string, password: string, agentId: string) => Promise<string | null>;
  isSupabaseConfigured: boolean;
  agents: Agent[];
}

export interface PlayerViewProps {
  currentUser: Player;
  fightStatus: FightStatus;
  fightId: number | null;
  timer: number;
  currentBet: Bet | null;
  bettingPools: { meron: number; wala: number };
  playerFightHistory: PlayerFightHistoryEntry[];
  fightHistory: FightResult[]; // For Trends component
  allUsers: { [id: string]: AllUserTypes }; // Keep this for looking up agent name
  onPlaceBet: (amount: number, choice: BetChoice) => Promise<string | null>;
  onCreateCoinRequest: (amount: number) => Promise<string | null>;
  betCounts: { red: number; white: number };
}

export interface AgentViewProps {
  currentUser: Agent;
  players: Player[];
  transactions: Transaction[];
  coinRequests: CoinRequest[];
  allUsers: { [id: string]: AllUserTypes }; // Keep for name lookups
  onTransferCoins: (receiverId: string, amount: number) => Promise<string | null>;
  onRespondToRequest: (requestId: string, response: 'APPROVED' | 'DECLINED') => Promise<string | null>;
  onCreateCoinRequest: (amount: number) => Promise<string | null>;
  onMasquerade: (userId: string) => void;
  onOpenChat: (user: AllUserTypes) => void;
}

export interface MasterAgentViewProps {
  currentUser: MasterAgent;
  agents: Agent[];
  transactions: Transaction[];
  coinRequests: CoinRequest[];
  allUsers: { [id: string]: AllUserTypes }; // Keep for name lookups
  onTransferCoins: (receiverId: string, amount: number) => Promise<string | null>;
  onCreateAgent: (name: string, email: string, password: string) => Promise<string | null>;
  onRespondToRequest: (requestId: string, response: 'APPROVED' | 'DECLINED') => Promise<string | null>;
  onMasquerade: (userId: string) => void;
  onOpenChat: (user: AllUserTypes) => void;
}
