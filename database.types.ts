export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      bets: {
        Row: {
          id: string
          user_id: string
          fight_id: number
          amount: number
          choice: "RED" | "WHITE"
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          fight_id: number
          amount: number
          choice: "RED" | "WHITE"
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          fight_id?: number
          amount?: number
          choice?: "RED" | "WHITE"
          created_at?: string
        }
      }
      coin_requests: {
          Row: {
              id: string
              from_user_id: string
              to_user_id: string
              amount: number
              status: 'PENDING' | 'APPROVED' | 'DECLINED'
              created_at: string
          }
          Insert: {
              id?: string
              from_user_id: string
              to_user_id: string
              amount: number
              status?: 'PENDING'
              created_at?: string
          }
          Update: {
              id?: string
              from_user_id?: string
              to_user_id?: string
              amount?: number
              status?: 'PENDING' | 'APPROVED' | 'DECLINED'
              created_at?: string
          }
      }
      fights: {
        Row: {
          id: number
          winner: "RED" | "WHITE" | "DRAW" | "CANCELLED" | null
          participants: Json | null
          status: "BETTING_OPEN" | "BETTING_CLOSED" | "SETTLED"
          created_at: string
          settled_at: string | null
          commission: number
        }
        Insert: {
          id?: number
          winner?: "RED" | "WHITE" | "DRAW" | "CANCELLED" | null
          participants?: Json | null
          status?: "BETTING_OPEN" | "BETTING_CLOSED" | "SETTLED"
          created_at?: string
          settled_at?: string | null
          commission?: number
        }
        Update: {
          id?: number
          winner?: "RED" | "WHITE" | "DRAW" | "CANCELLED" | null
          participants?: Json | null
          status?: "BETTING_OPEN" | "BETTING_CLOSED" | "SETTLED"
          created_at?: string
          settled_at?: string | null
          commission?: number
        }
      }
      messages: {
        Row: {
          id: string
          sender_id: string
          receiver_id: string
          text: string
          created_at: string
        }
        Insert: {
          id?: string
          sender_id: string
          receiver_id: string
          text: string
          created_at?: string
        }
        Update: {
          id?: string
          sender_id?: string
          receiver_id?: string
          text?: string
          created_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          name: string
          email: string
          role: "PLAYER" | "AGENT" | "MASTER_AGENT" | "OPERATOR"
          coin_balance: number
          commission_balance: number
          commission_rate: number
          transfer_fee: number
          agent_id: string | null
          master_agent_id: string | null
        }
        Insert: {
          id: string
          name: string
          email: string
          role: "PLAYER" | "AGENT" | "MASTER_AGENT" | "OPERATOR"
          coin_balance?: number
          commission_balance?: number
          commission_rate?: number
          transfer_fee?: number
          agent_id?: string | null
          master_agent_id?: string | null
        }
        Update: {
          id?: string
          name?: string
          email?: string
          role?: "PLAYER" | "AGENT" | "MASTER_AGENT" | "OPERATOR"
          coin_balance?: number
          commission_balance?: number
          commission_rate?: number
          transfer_fee?: number
          agent_id?: string | null
          master_agent_id?: string | null
        }
      }
      transactions: {
          Row: {
              id: string
              type: 'MINT' | 'TRANSFER' | 'COMMISSION' | 'BET' | 'WINNING' | 'REFUND'
              from_user_id: string | null
              to_user_id: string | null
              amount: number
              transaction_timestamp: string
          }
          Insert: {
              id?: string
              type: 'MINT' | 'TRANSFER' | 'COMMISSION' | 'BET' | 'WINNING' | 'REFUND'
              from_user_id?: string | null
              to_user_id?: string | null
              amount: number
              transaction_timestamp?: string
          }
          Update: {
              id?: string
              type?: 'MINT' | 'TRANSFER' | 'COMMISSION' | 'BET' | 'WINNING' | 'REFUND'
              from_user_id?: string | null
              to_user_id?: string | null
              amount?: number
              transaction_timestamp?: string
          }
      }
      upcoming_fights: {
        Row: {
          id: number
          participants: Json
          created_at: string
        }
        Insert: {
          id?: number
          participants: Json
          created_at?: string
        }
        Update: {
          id?: number
          participants?: Json
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      // FIX: Added type definition for the create_agent_user RPC to resolve typing errors in App.tsx.
      create_agent_user: {
        Args: {
          p_name: string
          p_email: string
          p_password: string
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}