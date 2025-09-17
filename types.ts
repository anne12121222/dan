export enum UserRole {
  PLAYER = 'PLAYER',
  AGENT = 'AGENT',
  MASTER_AGENT = 'MASTER_AGENT',
  OPERATOR = 'OPERATOR',
}

export interface BaseUser {
  id: string; // Changed from number to string for UUIDs
  name: string;
  email: string;
  password?: string; // Password is now optional as it won't be stored in client state
  role: UserRole;
  coinBalance: number;
}

export interface Player extends BaseUser {
  role: UserRole.PLAYER;
  agentId: string; // Changed from number to string
}

export interface Agent extends BaseUser {
  role: UserRole.AGENT;
  masterAgentId: string; // Changed from number to string
}

export interface MasterAgent extends BaseUser {
  role: UserRole.MASTER_AGENT;
  commissionBalance: number;
}

export interface Operator extends BaseUser {
  role: UserRole.OPERATOR;
}

export type AllUserTypes = Player | Agent | MasterAgent | Operator;

export enum FightStatus {
  IDLE = 'IDLE',
  BETTING_OPEN = 'BETTING_OPEN',
  BETTING_CLOSED = 'BETTING_CLOSED',
  SETTLED = 'SETTLED', // Fight finished, waiting for next one
}

export type BetChoice = 'RED' | 'WHITE';

export interface Bet {
  id: number;
  userId: string; // Changed from number to string
  fightId: number;
  choice: BetChoice;
  amount: number;
}

export interface FightResult {
  id: number;
  // FIX: Add status property to align with database schema and fix type errors.
  status: FightStatus;
  winner: 'RED' | 'WHITE' | 'DRAW' | 'CANCELLED' | null;
  participants: { red: string; white: string };
  commission: number;
}

export interface PlayerFightHistoryEntry extends FightResult {
  bet?: {
    choice: BetChoice;
    amount: number;
  };
  outcome: 'WIN' | 'LOSS' | 'NONE';
}

export interface Transaction {
    id: string;
    from: string | 'MINT'; // Changed from number to string
    to: string; // Changed from number to string
    amount: number;
    timestamp: number; // unix timestamp
    type?: 'COIN_TRANSFER' | 'COMMISSION';
}

export interface Message {
    id: string;
    senderId: string; // Changed from number to string
    receiverId: string; // Changed from number to string
    text: string;
    timestamp: number;
}

export interface UpcomingFight {
    id: number;
    participants: {
        red: string;
        white: string;
    };
}

export enum CoinRequestStatus {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    DECLINED = 'DECLINED',
}

export interface CoinRequest {
    id: string;
    fromUserId: string; // Changed from number to string
    toUserId: string; // Changed from number to string
    amount: number;
    status: CoinRequestStatus;
    timestamp: number;
}
