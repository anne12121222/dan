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
          commission_paid_out: boolean
          created_at: string
          id: number
          participants: Json
          status: Database["public"]["Enums"]["fight_status"]
          winner: Database["public"]["Enums"]["fight_winner"] | null
        }
        Insert: {
          commission_paid_out?: boolean
          created_at?: string
          id?: number
          participants: Json
          status?: Database["public"]["Enums"]["fight_status"]
          winner?: Database["public"]["Enums"]["fight_winner"] | null
        }
        Update: {
          commission_paid_out?: boolean
          created_at?: string
          id?: number
          participants?: Json
          status?: Database["public"]["Enums"]["fight_status"]
          winner?: Database["public"]["Enums"]["fight_winner"] | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          amount: number
          created_at: string
          id: string
          receiver_id: string
          sender_id: string
          text: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          receiver_id: string
          sender_id: string
          text: string
        }
        Update: {
          amount?: number
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
          role?: Database["public"]["Enums"]["user_role"]
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
          to_user_id: string
          transaction_timestamp: string
          type: Database["public"]["Enums"]["transaction_type"]
        }
        Insert: {
          amount: number
          from_user_id?: string | null
          id?: string
          to_user_id: string
          transaction_timestamp?: string
          type: Database["public"]["Enums"]["transaction_type"]
        }
        Update: {
          amount?: number
          from_user_id?: string | null
          id?: string
          to_user_id?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_agent_user: {
        Args: {
          p_name: string
          p_email: string
          p_password: string
        }
        Returns: string
      }
      get_registerable_agents: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          name: string
        }[]
      }
      // Other functions from the setup script would go here...
    }
    Enums: {
      bet_choice: "RED" | "WHITE"
      fight_status: "UPCOMING" | "BETTING_OPEN" | "BETTING_CLOSED" | "SETTLED"
      fight_winner: "RED" | "WHITE" | "DRAW" | "CANCELLED"
      request_status: "PENDING" | "APPROVED" | "DECLINED"
      transaction_type: "MINT" | "TRANSFER" | "COMMISSION" | "BET_WIN" | "BET_PLACE" | "BET_REFUND"
      user_role: "OPERATOR" | "MASTER_AGENT" | "AGENT" | "PLAYER"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
