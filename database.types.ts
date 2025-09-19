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
          choice: Database["public"]["Enums"]["bet_choice"]
          created_at: string
          fight_id: number
          id: string
          user_id: string
        }
        Insert: {
          amount: number
          choice: Database["public"]["Enums"]["bet_choice"]
          created_at?: string
          fight_id: number
          id?: string
          user_id: string
        }
        Update: {
          amount?: number
          choice?: Database["public"]["Enums"]["bet_choice"]
          created_at?: string
          fight_id?: number
          id?: string
          user_id?: string
        }
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
          status: Database["public"]["Enums"]["request_status"]
          to_user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          from_user_id: string
          id?: string
          status?: Database["public"]["Enums"]["request_status"]
          to_user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          from_user_id?: string
          id?: string
          status?: Database["public"]["Enums"]["request_status"]
          to_user_id?: string
        }
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
          betting_ends_at: string | null
          commission: number | null
          created_at: string
          id: number
          status: Database["public"]["Enums"]["fight_status"]
          winner: Database["public"]["Enums"]["fight_winner"] | null
        }
        Insert: {
          betting_ends_at?: string | null
          commission?: number | null
          created_at?: string
          id?: number
          status?: Database["public"]["Enums"]["fight_status"]
          winner?: Database["public"]["Enums"]["fight_winner"] | null
        }
        Update: {
          betting_ends_at?: string | null
          commission?: number | null
          created_at?: string
          id?: number
          status?: Database["public"]["Enums"]["fight_status"]
          winner?: Database["public"]["Enums"]["fight_winner"] | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          created_at: string
          id: string
          receiver_id: string
          sender_id: string
          text: string
        }
        Insert: {
          created_at?: string
          id?: string
          receiver_id: string
          sender_id: string
          text: string
        }
        Update: {
          created_at?: string
          id?: string
          receiver_id?: string
          sender_id?: string
          text?: string
        }
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
          email: string
          id: string
          master_agent_id: string | null
          name: string
          role: Database["public"]["Enums"]["user_role"]
          transfer_fee: number
        }
        Insert: {
          agent_id?: string | null
          coin_balance?: number
          commission_balance?: number
          commission_rate?: number
          email: string
          id: string
          master_agent_id?: string | null
          name: string
          role: Database["public"]["Enums"]["user_role"]
          transfer_fee?: number
        }
        Update: {
          agent_id?: string | null
          coin_balance?: number
          commission_balance?: number
          commission_rate?: number
          email?: string
          id?: string
          master_agent_id?: string | null
          name?: string
          role?: Database["public"]["Enums"]["user_role"]
          transfer_fee?: number
        }
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
          to_user_id: string | null
          transaction_timestamp: string
          type: Database["public"]["Enums"]["transaction_type"]
        }
        Insert: {
          amount: number
          from_user_id?: string | null
          id?: string
          to_user_id?: string | null
          transaction_timestamp?: string
          type: Database["public"]["Enums"]["transaction_type"]
        }
        Update: {
          amount?: number
          from_user_id?: string | null
          id?: string
          to_user_id?: string | null
          transaction_timestamp?: string
          type?: Database["public"]["Enums"]["transaction_type"]
        }
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
          created_at: string
          id: number
          red_participant: string
          white_participant: string
        }
        Insert: {
          created_at?: string
          id?: number
          red_participant: string
          white_participant: string
        }
        Update: {
          created_at?: string
          id?: number
          red_participant?: string
          white_participant?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      close_betting: {
        Args: {
          p_fight_id: number
        }
        Returns: undefined
      }
      create_user_by_master_agent: {
        Args: {
          name: string
          email: string
          password: string
          role: Database["public"]["Enums"]["user_role"]
          master_agent_id: string
        }
        Returns: string
      }
      declare_winner: {
        Args: {
          p_fight_id: number
          p_winner: Database["public"]["Enums"]["fight_winner"]
        }
        Returns: undefined
      }
      get_agent_requests_for_master: {
        Args: {
          p_master_agent_id: string
        }
        Returns: {
          amount: number
          created_at: string
          from_user_id: string
          id: string
          status: Database["public"]["Enums"]["request_status"]
          to_user_id: string
        }[]
      }
      get_messages: {
        Args: {
          user1_id: string
          user2_id: string
        }
        Returns: {
          created_at: string
          id: string
          receiver_id: string
          sender_id: string
          text: string
        }[]
      }
      get_player_fight_history: {
        Args: {
          p_user_id: string
        }
        Returns: {
          id: number
          winner: Database["public"]["Enums"]["fight_winner"]
          commission: number
          bet: Json
          outcome: string
        }[]
      }
      get_user_transactions: {
        Args: {
          p_user_id: string
        }
        Returns: {
          amount: number
          from_user_id: string | null
          id: string
          to_user_id: string | null
          transaction_timestamp: string
          type: Database["public"]["Enums"]["transaction_type"]
        }[]
      }
      handle_new_player: {
        Args: {
          name: string
          email: string
          password: string
          agent_id: string
        }
        Returns: string
      }
      respond_to_coin_request: {
        Args: {
          p_request_id: string
          p_response: string
        }
        Returns: undefined
      }
      send_message: {
        Args: {
          p_receiver_id: string
          p_text: string
          p_coin_amount: number
        }
        Returns: undefined
      }
      start_next_fight: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      bet_choice: "RED" | "WHITE"
      fight_status: "BETTING_OPEN" | "BETTING_CLOSED" | "SETTLED"
      fight_winner: "RED" | "WHITE" | "DRAW" | "CANCELLED"
      request_status: "PENDING" | "APPROVED" | "DECLINED"
      transaction_type:
        | "MINT"
        | "TRANSFER"
        | "COMMISSION"
        | "BET"
        | "WINNING"
        | "REFUND"
      user_role: "PLAYER" | "AGENT" | "MASTER_AGENT" | "OPERATOR"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
