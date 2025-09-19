
export enum UserRole {
  PLAYER = 'PLAYER',
  AGENT = 'AGENT',
  MASTER_AGENT = 'MASTER_AGENT',
  OPERATOR = 'OPERATOR',
}

interface BaseUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  coinBalance: number;
}

export interface Player extends BaseUser {
  role: UserRole.PLAYER;
  agentId: string | null;
}

export interface Agent extends BaseUser {
  role: UserRole.AGENT;
  masterAgentId: string | null;
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

export type AllUserTypes = Player | Agent | MasterAgent | Operator;

export enum FightStatus {
  BETTING_OPEN = 'BETTING_OPEN',
  BETTING_CLOSED = 'BETTING_CLOSED',
  SETTLED = 'SETTLED', // Bets are paid out, waiting for next fight
}

export type BetChoice = 'RED' | 'WHITE';
export type FightWinner = 'RED' | 'WHITE' | 'DRAW' | 'CANCELLED';

export interface Bet {
  id: string;
  userId: string;
  fightId: number;
  amount: number;
  choice: BetChoice;
}

export interface FightResult {
  id: number;
  winner: FightWinner;
  commission: number;
}

export interface PlayerFightHistoryEntry extends FightResult {
  bet: Bet | null;
  outcome: 'WIN' | 'LOSS' | 'REFUND' | null;
}

export interface UpcomingFight {
  id: number;
  participants: {
    red: string;
    white: string;
  };
}

export interface Transaction {
    id: string;
    type: 'MINT' | 'TRANSFER' | 'COMMISSION' | 'BET' | 'WINNING' | 'REFUND';
    fromUserId: string | null;
    toUserId: string | null;
    amount: number;
    transactionTimestamp: string;
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

export interface AuthViewProps {
  onLogin: (email: string, password: string) => Promise<string | null>;
  onRegister: (name: string, email: string, password: string, agentId: string) => Promise<string | null>;
  isSupabaseConfigured: boolean;
  agents: Agent[];
}
