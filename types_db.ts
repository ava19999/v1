// types_db.ts
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
          id: string
          username: string | null
          google_profile_picture: string | null
          created_at: string
        }
        Insert: {
          id: string
          username?: string | null
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
          id: number
          room_id: string
          name: string
          created_by: string | null
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
          id: number
          room_id: number
          user_id: string | null
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
          room_id: number
          user_id?: string | null
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
          id?: number
          room_id?: number
          user_id?: string | null
          sender_username?: string
          user_creation_date?: string | null
          type?: string
          text?: string | null
          file_url?: string | null
          file_name?: string | null
          reactions?: Json
          created_at?: string
        }
      }
    }
    // [FIX] Ganti tipe 'never' dengan objek kosong
    Views: {}
    Functions: {}
  }
}