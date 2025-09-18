
// Enums matching the database schema
export enum UserRole {
  OPERATOR = 'OPERATOR',
  MASTER_AGENT = 'MASTER_AGENT',
  AGENT = 'AGENT',
  PLAYER = 'PLAYER',
}

export enum FightStatus {
  BETTING_OPEN = 'BETTING_OPEN',
  BETTING_CLOSED = 'BETTING_CLOSED',
  SETTLED = 'SETTLED',
}

export enum TransactionType {
  TRANSFER = 'TRANSFER',
  COMMISSION = 'COMMISSION',
  MINT = 'MINT',
  BET_WIN = 'BET_WIN',
  BET_PLACE = 'BET_PLACE',
  BET_REFUND = 'BET_REFUND',
}

export enum RequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  DECLINED = 'DECLINED',
}

// Base User type
export interface BaseUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  coinBalance: number;
}

// Specific User types
export interface Player extends BaseUser {
  role: UserRole.PLAYER;
  agentId: string | null;
}

export interface Agent extends BaseUser {
  role: UserRole.AGENT;
  masterAgentId: string | null; // Can be unassigned
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

// Union type for any user
export type AllUserTypes = Player | Agent | MasterAgent | Operator;

// Fight and Betting types
export type BetChoice = 'RED' | 'WHITE';
export type FightWinner = 'RED' | 'WHITE' | 'DRAW' | 'CANCELLED';

export interface UpcomingFight {
  id: number;
  participants: {
    red: string;
    white: string;
  };
}

export interface FightResult {
  id: number;
  winner: FightWinner | null;
  commission: number;
}

export interface Bet {
  id: string;
  userId: string;
  fightId: number;
  amount: number;
  choice: BetChoice;
}

export interface PlayerFightHistoryEntry extends FightResult {
  bet: Bet | null;
  outcome: 'WIN' | 'LOSS' | 'REFUND' | null;
}

// Financial types
export interface Transaction {
  id: string;
  from_user_id: string | null;
  to_user_id: string | null;
  amount: number;
  type: TransactionType;
  transaction_timestamp: string;
}

export interface CoinRequest {
  id: string;
  from_user_id: string;
  to_user_id: string;
  amount: number;
  status: RequestStatus;
  created_at: string;
}

// Communication types
export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  amount: number | null;
  createdAt: string;
}

// API Notification type
export interface Notification {
  id: number;
  message: string;
  type: 'success' | 'error';
}

// Component Prop Types
export interface BetCounts {
    red: number;
    white: number;
}

export interface PlayerViewProps {
    currentUser: Player;
    fightStatus: FightStatus;
    fightId: number | null;
    timer: number;
    currentBet: Bet | null;
    bettingPools: { meron: number; wala: number };
    playerFightHistory: PlayerFightHistoryEntry[];
    upcomingFights: UpcomingFight[];
    fightHistory: FightResult[];
    allUsers: { [id: string]: AllUserTypes };
    onPlaceBet: (amount: number, choice: 'RED' | 'WHITE') => Promise<string | null>;
    onCreateCoinRequest: (amount: number, targetUserId?: string) => Promise<string | null>;
    betCounts: BetCounts;
}

export interface MasterAgentViewProps {
    currentUser: MasterAgent;
    agents: Agent[];
    players: Player[];
    transactions: Transaction[];
    coinRequests: CoinRequest[];
    onRespondToRequest: (requestId: string, response: 'APPROVED' | 'DECLINED') => Promise<string | null>;
    onCreateAgent: (name: string, email: string, password: string) => Promise<string | null>;
    onSendMessage: (receiverId: string, text: string, amount: number) => Promise<void>;
    messages: { [userId: string]: Message[] };
    allUsers: { [id: string]: AllUserTypes };
    onOpenChat: (user: AllUserTypes) => void;
    chatTargetUser: AllUserTypes | null;
    onCloseChat: () => void;
    fightStatus: FightStatus;
    fightId: number | null;
    betCounts: BetCounts;
}
