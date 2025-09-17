import { UserRole, Player, Agent, MasterAgent, Operator, AllUserTypes } from './types';

// NOTE: This file is now for reference and seeding data only.
// In the live application, user data is managed by Supabase Auth and the 'profiles' table.
// User IDs are now strings (UUIDs) to match the database schema.

export const ALL_USERS_BY_ID: { [id: string]: AllUserTypes } = {
  '1': {
    id: '1', name: 'Operator', email: 'operator@test.com', password: 'password',
    role: UserRole.OPERATOR, coinBalance: 0
  } as Operator,
  '2': {
    id: '2', name: 'Master Agent 1', email: 'joms@gmail.com', password: 'x1qfoega',
    role: UserRole.MASTER_AGENT, coinBalance: 1000000, commissionBalance: 0
  } as MasterAgent,
  '3': {
    id: '3', name: 'Agent 1', email: 'agent1@test.com', password: 'password',
    role: UserRole.AGENT, masterAgentId: '2', coinBalance: 50000
  } as Agent,
  '4': {
    id: '4', name: 'Agent 2', email: 'agent2@test.com', password: 'password',
    role: UserRole.AGENT, masterAgentId: '2', coinBalance: 75000
  } as Agent,
  '5': {
    id: '5', name: 'GB Alpha', email: 'gbalpha@gmail.com', password: 'x1qfoega',
    role: UserRole.MASTER_AGENT, coinBalance: 1000000, commissionBalance: 0
  } as MasterAgent,
  '101': {
    id: '101', name: 'Player One', email: 'player1@test.com', password: 'password',
    role: UserRole.PLAYER, agentId: '3', coinBalance: 1000
  } as Player,
  '102': {
    id: '102', name: 'Player Two', email: 'player2@test.com', password: 'password',
    role: UserRole.PLAYER, agentId: '3', coinBalance: 2500
  } as Player,
  '103': {
    id: '103', name: 'Player Three', email: 'player3@test.com', password: 'password',
    role: UserRole.PLAYER, agentId: '4', coinBalance: 500
  } as Player
};
