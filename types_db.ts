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
      profiles: {
        Row: {
          id: string // uuid
          username: string | null // Dibuat nullable
          google_profile_picture: string | null
          created_at: string
        }
        Insert: {
          id: string // uuid
          username?: string | null // Dibuat nullable
          google_profile_picture?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          username?: string | null
          google_profile_picture?: string | null
          created_at?: string
        }
      }
      rooms: {
        Row: {
          id: number // bigint PK
          room_id: string // text UNIQUE
          name: string
          created_by: string | null // uuid
          is_default_room: boolean | null
          created_at: string
        }
        Insert: {
          id?: number
          room_id: string
          name: string
          created_by?: string | null
          is_default_room?: boolean | null
          created_at?: string
        }
        Update: {
          id?: number
          room_id?: string
          name?: string
          created_by?: string | null
          is_default_room?: boolean | null
          created_at?: string
        }
      }
      messages: {
        Row: {
          id: number // bigint PK
          room_id: number // bigint FK
          user_id: string | null // uuid FK
          sender_username: string
          user_creation_date: string | null
          type: string
          text: string | null
          file_url: string | null
          file_name: string | null
          reactions: Json
          created_at: string
        }
        Insert: {
          id?: number
          room_id: number // FK
          user_id?: string | null // FK
          sender_username: string
          user_creation_date?: string | null
          type?: string
          text?: string | null
          file_url?: string | null
          file_name?: string | null
          reactions?: Json
          created_at?: string
        }
        Update: {
          reactions?: Json
          text?: string
        }
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
  }
}