
export enum UserRole {
  OPERATOR = 'OPERATOR',
  MASTER_AGENT = 'MASTER_AGENT',
  AGENT = 'AGENT',
  PLAYER = 'PLAYER',
}

export enum FightStatus {
  BETTING_OPEN = 'BETTING_OPEN',
  BETTING_CLOSED = 'BETTING_CLOSED',
  SETTLED = 'SETTLED', // Waiting for next fight
}

export type BetChoice = 'RED' | 'WHITE';
export type FightWinner = 'RED' | 'WHITE' | 'DRAW' | 'CANCELLED';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  coinBalance: number;
}

export interface Player extends User {
  role: UserRole.PLAYER;
  agentId: string;
}

export interface Agent extends User {
  role: UserRole.AGENT;
  masterAgentId: string;
}

export interface MasterAgent extends User {
  role: UserRole.MASTER_AGENT;
  commissionBalance: number;
}

export interface Operator extends User {
  role: UserRole.OPERATOR;
}

export type AllUserTypes = Player | Agent | MasterAgent | Operator;

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
  status: FightStatus;
  created_at: string;
}

export interface Bet {
  id: string;
  userId: string;
  fightId: number;
  choice: BetChoice;
  amount: number;
}

export interface PlayerFightHistoryEntry extends FightResult {
  bet: Bet | null;
  outcome: 'WIN' | 'LOSS' | 'REFUND' | null;
}

export interface Transaction {
    id: string;
    from: string; // user ID or 'MINT'
    to: string; // user ID
    amount: number;
    type: 'TRANSFER' | 'COMMISSION' | 'MINT' | 'BET_WIN' | 'BET_PLACE' | 'BET_REFUND';
    timestamp: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  createdAt: string;
}

export interface CoinRequest {
    id: string;
    fromUserId: string;
    toUserId: string;
    amount: number;
    status: 'PENDING' | 'APPROVED' | 'DECLINED';
    createdAt: string;
}

export interface NotificationMessage {
  message: string;
  type: 'success' | 'error';
}