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
      },
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
      },
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
      },
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
      },
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
      },
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
      },
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
      add_upcoming_fight: {
        Args: {
          p_red_text: string
          p_white_text: string
        }
        Returns: Database["public"]["Tables"]["upcoming_fights"]["Row"][]
      },
      close_betting: {
        Args: {
          p_fight_id: number
        }
        Returns: void
      },
      create_agent_user: {
        Args: {
          p_name: string
          p_email: string
          p_password: string
        }
        Returns: string
      },
      create_master_agent_user: {
        Args: {
          p_name: string
          p_email: string
          p_password: string
        }
        Returns: string
      },
      create_operator_user: {
        Args: {
          p_name: string
          p_email: string
          p_password: string
        }
        Returns: string
      },
      create_coin_request: {
        Args: {
          p_to_user_id: string
          p_amount: number
        }
        Returns: void
      },
      declare_winner: {
        Args: {
          p_fight_id: number
          p_winner_text: "RED" | "WHITE" | "DRAW" | "CANCELLED"
        }
        Returns: void
      },
      get_messages: {
        Args: {
          p_contact_id: string
        }
        Returns: Json
      },
      get_my_coin_requests: {
        Args: Record<string, never>
        Returns: Json
      },
      get_my_transactions: {
        Args: Record<string, never>
        Returns: Json
      },
      get_player_fight_history: {
        Args: Record<string, never>
        Returns: Json
      },
      place_bet: {
        Args: {
          p_fight_id: number
          p_amount: number
          p_choice: "RED" | "WHITE"
        }
        Returns: string
      },
      respond_to_coin_request: {
        Args: {
          p_request_id: string
          p_response: "APPROVED" | "DECLINED"
        }
        Returns: string
      },
      send_message_and_coins: {
        Args: {
          p_receiver_id: string
          p_text: string
          p_amount: number
        }
        Returns: string
      },
      start_next_fight: {
        Args: {}
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