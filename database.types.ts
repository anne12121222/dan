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
          amount: number
          choice: "RED" | "WHITE"
          created_at: string
          fight_id: number
          id: string
          user_id: string
        }
        Insert: {
          amount: number
          choice: "RED" | "WHITE"
          created_at?: string
          fight_id: number
          id?: string
          user_id: string
        }
        Update: {}
        Relationships: [
          {
            foreignKeyName: "bets_fight_id_fkey"
            columns: ["fight_id"]
            referencedRelation: "fights"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bets_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      coin_requests: {
        Row: {
          amount: number
          created_at: string
          from_user_id: string
          id: string
          status: "PENDING" | "APPROVED" | "DECLINED"
          to_user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          from_user_id: string
          id?: string
          status?: "PENDING" | "APPROVED" | "DECLINED"
          to_user_id: string
        }
        Update: {}
        Relationships: [
          {
            foreignKeyName: "coin_requests_from_user_id_fkey"
            columns: ["from_user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coin_requests_to_user_id_fkey"
            columns: ["to_user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      fights: {
        Row: {
          commission: number
          created_at: string
          id: number
          status: "BETTING_OPEN" | "BETTING_CLOSED" | "SETTLED"
          winner: "RED" | "WHITE" | "DRAW" | "CANCELLED" | null
        }
        Insert: {
          commission?: number
          created_at?: string
          id: number
          status?: "BETTING_OPEN" | "BETTING_CLOSED" | "SETTLED"
          winner?: "RED" | "WHITE" | "DRAW" | "CANCELLED" | null
        }
        Update: {}
        Relationships: []
      }
      messages: {
        Row: {
          created_at: string
          id: string
          receiver_id: string
          sender_id: string
          text: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          receiver_id: string
          sender_id: string
          text?: string | null
        }
        Update: {}
        Relationships: [
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: {
          agent_id: string | null
          coin_balance: number
          commission_balance: number
          commission_rate: number
          transfer_fee: number
          email: string
          id: string
          master_agent_id: string | null
          name: string
          role: "OPERATOR" | "MASTER_AGENT" | "AGENT" | "PLAYER"
        }
        Insert: {
          agent_id?: string | null
          coin_balance?: number
          commission_balance?: number
          commission_rate?: number
          transfer_fee?: number
          email: string
          id: string
          master_agent_id?: string | null
          name: string
          role?: "OPERATOR" | "MASTER_AGENT" | "AGENT" | "PLAYER"
        }
        Update: {}
        Relationships: [
          {
            foreignKeyName: "profiles_agent_id_fkey"
            columns: ["agent_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_master_agent_id_fkey"
            columns: ["master_agent_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      transactions: {
        Row: {
          amount: number
          from_user_id: string | null
          id: string
          timestamp: string
          to_user_id: string | null
          type:
            | "TRANSFER"
            | "COMMISSION"
            | "MINT"
            | "BET_WIN"
            | "BET_PLACE"
            | "BET_REFUND"
        }
        Insert: {
          amount: number
          from_user_id?: string | null
          id?: string
          timestamp?: string
          to_user_id?: string | null
          type:
            | "TRANSFER"
            | "COMMISSION"
            | "MINT"
            | "BET_WIN"
            | "BET_PLACE"
            | "BET_REFUND"
        }
        Update: {}
        Relationships: [
          {
            foreignKeyName: "transactions_from_user_id_fkey"
            columns: ["from_user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_to_user_id_fkey"
            columns: ["to_user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      upcoming_fights: {
        Row: {
          id: number
          participants: Json
        }
        Insert: {
          id?: number
          participants: Json
        }
        Update: {}
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_upcoming_fight: {
        Args: {
          p_red: string
          p_white: string
        }
        Returns: undefined
      }
      close_betting: {
        Args: {
          p_fight_id: number
        }
        Returns: undefined
      }
      create_agent: {
        Args: {
          p_name: string
          p_email: string
          p_password: string
        }
        Returns: string
      }
      create_coin_request: {
        Args: {
          p_amount: number
        }
        Returns: string | null
      }
      declare_winner: {
        Args: {
          p_fight_id: number
          p_winner: "RED" | "WHITE" | "DRAW" | "CANCELLED"
        }
        Returns: undefined
      }
      get_coin_requests_for_user: {
        Args: Record<PropertyKey, never>
        Returns: {
          amount: number
          created_at: string
          from_user_id: string
          id: string
          status: "PENDING" | "APPROVED" | "DECLINED"
          to_user_id: string
        }[]
      }
      get_messages: {
        Args: {
          p_other_user_id: string
        }
        Returns: {
          created_at: string
          id: string
          receiver_id: string
          sender_id: string
          text: string | null
        }[]
      }
      get_transactions_for_user: {
        Args: Record<PropertyKey, never>
        Returns: {
          amount: number
          from_user_id: string | null
          id: string
          transaction_timestamp: string
          to_user_id: string | null
          type:
            | "TRANSFER"
            | "COMMISSION"
            | "MINT"
            | "BET_WIN"
            | "BET_PLACE"
            | "BET_REFUND"
        }[]
      }
      place_bet: {
        Args: {
          p_fight_id: number
          p_amount: number
          p_choice: "RED" | "WHITE"
        }
        Returns: string | null
      }
      respond_to_coin_request: {
        Args: {
          p_request_id: string
          p_response: "PENDING" | "APPROVED" | "DECLINED"
        }
        Returns: string | null
      }
      send_message_and_coins: {
        Args: {
          p_receiver_id: string
          p_text: string
          p_amount: number
        }
        Returns: string | null
      }
      start_next_fight: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
    }
    Enums: {
      bet_choice: "RED" | "WHITE"
      fight_status: "BETTING_OPEN" | "BETTING_CLOSED" | "SETTLED"
      fight_winner: "RED" | "WHITE" | "DRAW" | "CANCELLED"
      request_status: "PENDING" | "APPROVED" | "DECLINED"
      transaction_type:
        | "TRANSFER"
        | "COMMISSION"
        | "MINT"
        | "BET_WIN"
        | "BET_PLACE"
        | "BET_REFUND"
      user_role: "OPERATOR" | "MASTER_AGENT" | "AGENT" | "PLAYER"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}