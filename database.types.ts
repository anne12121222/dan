export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// FIX: Reverted from `type` to `interface`. The `type` alias was causing a circular reference
// issue with the `add_upcoming_fight` function's return type, leading to `never` type
// inference for all Supabase client operations. `interface` correctly handles this.
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
          status: "PENDING" | "APPROVED" | "DECLINED"
          created_at: string
        }
        Insert: {
          id?: string
          from_user_id: string
          to_user_id: string
          amount: number
          status?: "PENDING"
          created_at?: string
        }
        Update: {
          id?: string
          from_user_id?: string
          to_user_id?: string
          amount?: number
          status?: "PENDING" | "APPROVED" | "DECLINED"
          created_at?: string
        }
      }
      fights: {
        Row: {
          id: number
          winner: "RED" | "WHITE" | "DRAW" | "CANCELLED" | null
          // FIX: Replaced recursive Json type with a specific object type to resolve 'never' type inference.
          participants: { red: string; white: string } | null
          status: "BETTING_OPEN" | "BETTING_CLOSED" | "SETTLED"
          created_at: string
          settled_at: string | null
          commission: number
        }
        Insert: {
          id?: number
          winner?: "RED" | "WHITE" | "DRAW" | "CANCELLED" | null
          // FIX: Replaced recursive Json type with a specific object type to resolve 'never' type inference.
          participants?: { red: string; white: string } | null
          status?: "BETTING_OPEN" | "BETTING_CLOSED" | "SETTLED"
          created_at?: string
          settled_at?: string | null
          commission?: number
        }
        Update: {
          id?: number
          winner?: "RED" | "WHITE" | "DRAW" | "CANCELLED" | null
          // FIX: Replaced recursive Json type with a specific object type to resolve 'never' type inference.
          participants?: { red: string; white: string } | null
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
          type: "MINT" | "TRANSFER" | "COMMISSION" | "BET" | "WINNING" | "REFUND"
          from_user_id: string | null
          to_user_id: string | null
          amount: number
          transaction_timestamp: string
        }
        Insert: {
          id?: string
          type: "MINT" | "TRANSFER" | "COMMISSION" | "BET" | "WINNING" | "REFUND"
          from_user_id?: string | null
          to_user_id?: string | null
          amount: number
          transaction_timestamp?: string
        }
        Update: {
          id?: string
          type?: "MINT" | "TRANSFER" | "COMMISSION" | "BET" | "WINNING" | "REFUND"
          from_user_id?: string | null
          to_user_id?: string | null
          amount?: number
          transaction_timestamp?: string
        }
      }
      upcoming_fights: {
        Row: {
          id: number
          // FIX: Replaced recursive Json type with a specific object type to resolve 'never' type inference.
          participants: { red: string; white: string }
          created_at: string
        }
        Insert: {
          id?: number
          // FIX: Replaced recursive Json type with a specific object type to resolve 'never' type inference.
          participants: { red: string; white: string }
          created_at?: string
        }
        Update: {
          id?: number
          // FIX: Replaced recursive Json type with a specific object type to resolve 'never' type inference.
          participants?: { red: string; white: string }
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_upcoming_fight: {
        Args: {
          p_red_text: string
          p_white_text: string
        }
        // FIX: Reverted the return type to Json to break a subtle circular dependency that was causing
        // the Supabase client to infer 'never' for all RPC calls and table queries. The previous
        // inlined type was too complex for TypeScript to resolve correctly.
        // FURTHER FIX: The recursive `Json` type itself is the likely cause of the 'never' inference issue.
        // Since the return value is not used in the app, changing it to `void` is safe and resolves the type error.
        Returns: void
      }
      close_betting: {
        Args: {
          p_fight_id: number
        }
        Returns: void
      }
      create_agent_user: {
        Args: {
          p_name: string
          p_email: string
          p_password: string
        }
        Returns: string
      }
      create_coin_request: {
        Args: {
          p_to_user_id: string
          p_amount: number
        }
        Returns: void
      }
      create_master_agent_user: {
        Args: {
          p_name: string
          p_email: string
          p_password: string
        }
        Returns: string
      }
      create_operator_user: {
        Args: {
          p_name: string
          p_email: string
          p_password: string
        }
        Returns: string
      }
      declare_winner: {
        Args: {
          p_fight_id: number
          p_winner_text: "RED" | "WHITE" | "DRAW" | "CANCELLED"
        }
        Returns: void
      }
      get_messages: {
        Args: {
          p_contact_id: string
        }
        // FURTHER FIX: Inlined the row type to be more specific than Json and properly fix the 'never' type inference.
        Returns: {
          id: string
          sender_id: string
          receiver_id: string
          text: string
          created_at: string
        }[]
      }
      get_my_coin_requests: {
        Args: Record<string, never>
        // FURTHER FIX: Inlined the row type to be more specific than Json and properly fix the 'never' type inference.
        Returns: {
          id: string
          from_user_id: string
          to_user_id: string
          amount: number
          status: "PENDING" | "APPROVED" | "DECLINED"
          created_at: string
        }[]
      }
      get_my_transactions: {
        Args: Record<string, never>
        // FURTHER FIX: Inlined the row type to be more specific than Json and properly fix the 'never' type inference.
        Returns: {
          id: string
          type: "MINT" | "TRANSFER" | "COMMISSION" | "BET" | "WINNING" | "REFUND"
          from_user_id: string | null
          to_user_id: string | null
          amount: number
          transaction_timestamp: string
        }[]
      }
      get_player_fight_history: {
        Args: Record<string, never>
        // FURTHER FIX: Inlined the row type to be more specific than Json and properly fix the 'never' type inference.
        Returns: {
          id: number
          winner: "RED" | "WHITE" | "DRAW" | "CANCELLED"
          commission: number
          bet: {
            id: string
            user_id: string
            fight_id: number
            amount: number
            choice: "RED" | "WHITE"
          } | null
          outcome: "WIN" | "LOSS" | "REFUND" | null
        }[]
      }
      place_bet: {
        Args: {
          p_fight_id: number
          p_amount: number
          p_choice: "RED" | "WHITE"
        }
        Returns: string
      }
      respond_to_coin_request: {
        Args: {
          p_request_id: string
          p_response: "APPROVED" | "DECLINED"
        }
        Returns: string
      }
      send_message_and_coins: {
        Args: {
          p_receiver_id: string
          p_text: string
          p_amount: number
        }
        Returns: string
      }
      start_next_fight: {
        // FIX: The `Args` type for a function with no arguments should be Record<string, never>, not '{}'.
        // The incorrect type was breaking Supabase client's type inference, causing all RPC and table methods
        // to be inferred as `never`, leading to numerous downstream errors.
        Args: Record<string, never>
        Returns: void
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