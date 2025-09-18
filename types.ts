// Grand Overhaul: This file has been updated to support all production features,
// including the new commission system properties.

export enum UserRole {
  OPERATOR = "OPERATOR",
  MASTER_AGENT = "MASTER_AGENT",
  AGENT = "AGENT",
  PLAYER = "PLAYER",
}

export enum FightStatus {
  BETTING_OPEN = "BETTING_OPEN",
  BETTING_CLOSED = "BETTING_CLOSED",
  SETTLED = "SETTLED",
}

export type FightWinner = "RED" | "WHITE" | "DRAW" | "CANCELLED";
export type BetChoice = "RED" | "WHITE";
export type RequestStatus = "PENDING" | "APPROVED" | "DECLINED";
export type TransactionType = "TRANSFER" | "COMMISSION" | "MINT" | "BET_WIN" | "BET_PLACE" | "BET_REFUND";


export interface Player {
    id: string;
    name: string;
    email: string;
    role: UserRole.PLAYER;
    agentId: string;
    coinBalance: number;
}
export interface Agent {
    id: string;
    name: string;
    email: string;
    role: UserRole.AGENT;
    masterAgentId: string;
    coinBalance: number;
    // FIX: Add missing 'commissionBalance' property to align with database schema and UI requirements.
    commissionBalance: number;
    commissionRate: number; // e.g., 0.07 for 7%
    transferFee: number;   // e.g., 0.01 for 1%
}
export interface MasterAgent {
    id: string;
    name: string;
    email: string;
    role: UserRole.MASTER_AGENT;
    coinBalance: number;
    commissionBalance: number;
    commissionRate: number; // e.g., 0.07 for 7%
    transferFee: number;   // e.g., 0.01 for 1%
}
export interface Operator {
    id: string;
    name: string;
    email: string;
    role: UserRole.OPERATOR;
    coinBalance: number;
}

export type AllUserTypes = Player | Agent | MasterAgent | Operator;

export interface FightResult {
  id: number;
  winner: FightWinner | null;
  commission: number;
  status: FightStatus;
  created_at: string;
  // FIX: Add optional 'bets' property to store bet history for each fight. This resolves the error on App.tsx.
  bets?: Bet[];
}

export interface UpcomingFight {
  id: number;
  participants: {
    red: string;
    white: string;
  };
}

export interface Bet {
  id: string;
  userId: string;
  fightId: number;
  amount: number;
  choice: BetChoice;
}

export interface PlayerFightHistoryEntry extends FightResult {
  bet?: Bet;
  outcome?: 'WIN' | 'LOSS' | 'REFUND';
}

export interface Transaction {
  id: string;
  from_user_id: string | null;
  to_user_id: string | null;
  amount: number;
  type: TransactionType;
  // FIX: Renamed to match the database function's return value and avoid SQL keyword conflicts.
  transaction_timestamp: string;
}

export interface Message {
    id: string;
    senderId: string;
    receiverId: string;
    text: string;
    createdAt: string;
    amount?: number; 
}

export interface CoinRequest {
    id: string;
    from_user_id: string;
    to_user_id: string;
    amount: number;
    status: RequestStatus;
    created_at: string;
}

export interface Notification {
  id: number;
  message: string;
  type: 'success' | 'error';
}