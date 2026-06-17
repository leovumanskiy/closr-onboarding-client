export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type StepType =
  | 'video'
  | 'document'
  | 'form'
  | 'upload'
  | 'booking'
  | 'conditional'
  | 'external'
  | 'dashboard'
  | 'video_document'
  | 'iframe'
  | 'checkpoint'

export type StepStatus = 'locked' | 'available' | 'in_progress' | 'completed'
export type UserRole = 'client' | 'admin'
export type ClientStatus = 'active' | 'paused' | 'completed' | 'churned'
export type NotificationType = 'step_completed' | 'module_unlocked' | 'reminder' | 'stuck_alert' | 'file_uploaded' | 'system'

export interface Database {
  public: {
    Tables: {
      clients: {
        Row: {
          id: string
          email: string
          full_name: string | null
          business_name: string
          business_website: string | null
          niche: string | null
          start_date: string | null
          image_url: string | null
          role: UserRole
          must_change_password: boolean
          has_ghl: boolean
          has_fb_ads: boolean
          status: ClientStatus
          current_module_id: string | null
          notes: string | null
          ghl_access_token: string | null
          ghl_refresh_token: string | null
          ghl_token_expires_at: string | null
          ghl_location_id: string | null
          slack_channel_id: string | null
          slack_user_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          full_name?: string | null
          business_name: string
          business_website?: string | null
          niche?: string | null
          start_date?: string | null
          image_url?: string | null
          role?: UserRole
          must_change_password?: boolean
          has_ghl?: boolean
          has_fb_ads?: boolean
          status?: ClientStatus
          current_module_id?: string | null
          notes?: string | null
          ghl_access_token?: string | null
          ghl_refresh_token?: string | null
          ghl_token_expires_at?: string | null
          ghl_location_id?: string | null
          slack_channel_id?: string | null
          slack_user_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          email?: string
          full_name?: string | null
          business_name?: string
          business_website?: string | null
          niche?: string | null
          start_date?: string | null
          image_url?: string | null
          role?: UserRole
          must_change_password?: boolean
          has_ghl?: boolean
          has_fb_ads?: boolean
          status?: ClientStatus
          current_module_id?: string | null
          notes?: string | null
          ghl_access_token?: string | null
          ghl_refresh_token?: string | null
          ghl_token_expires_at?: string | null
          ghl_location_id?: string | null
          slack_channel_id?: string | null
          slack_user_id?: string | null
          updated_at?: string
        }
      }
      modules: {
        Row: {
          id: string
          slug: string
          order_index: number
          title: string
          description: string | null
          unlock_rule: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          order_index: number
          title: string
          description?: string | null
          unlock_rule?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          slug?: string
          order_index?: number
          title?: string
          description?: string | null
          unlock_rule?: string
          updated_at?: string
        }
      }
      steps: {
        Row: {
          id: string
          module_id: string
          slug: string
          order_index: number
          title: string
          type: StepType
          config: Json
          sla_hours: number
          version: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          module_id: string
          slug: string
          order_index: number
          title: string
          type: StepType
          config?: Json
          sla_hours?: number
          version?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          slug?: string
          order_index?: number
          title?: string
          type?: StepType
          config?: Json
          sla_hours?: number
          version?: number
          updated_at?: string
        }
      }
      client_progress: {
        Row: {
          id: string
          client_id: string
          step_id: string
          status: StepStatus
          started_at: string | null
          completed_at: string | null
          due_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          step_id: string
          status?: StepStatus
          started_at?: string | null
          completed_at?: string | null
          due_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          status?: StepStatus
          started_at?: string | null
          completed_at?: string | null
          due_at?: string | null
          updated_at?: string
        }
      }
      client_form_submissions: {
        Row: {
          id: string
          client_id: string
          step_id: string
          payload: Json
          submitted_at: string
        }
        Insert: {
          id?: string
          client_id: string
          step_id: string
          payload: Json
          submitted_at?: string
        }
        Update: never
      }
      client_uploads: {
        Row: {
          id: string
          client_id: string
          step_id: string
          file_path: string
          file_name: string
          size: number
          mime: string
          uploaded_at: string
        }
        Insert: {
          id?: string
          client_id: string
          step_id: string
          file_path: string
          file_name: string
          size: number
          mime: string
          uploaded_at?: string
        }
        Update: never
      }
      client_bookings: {
        Row: {
          id: string
          client_id: string
          step_id: string
          scheduled_for: string | null
          provider: string
          external_id: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          client_id: string
          step_id: string
          scheduled_for?: string | null
          provider?: string
          external_id?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          scheduled_for?: string | null
          external_id?: string | null
          notes?: string | null
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: NotificationType
          title: string
          body: string
          link: string | null
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: NotificationType
          title: string
          body: string
          link?: string | null
          read_at?: string | null
          created_at?: string
        }
        Update: {
          read_at?: string | null
        }
      }
      reminder_log: {
        Row: {
          id: string
          client_id: string
          step_id: string | null
          module_id: string | null
          kind: string
          sent_at: string
        }
        Insert: {
          id?: string
          client_id: string
          step_id?: string | null
          module_id?: string | null
          kind: string
          sent_at?: string
        }
        Update: never
      }
      audit_log: {
        Row: {
          id: string
          actor_id: string
          action: string
          subject_table: string
          subject_id: string
          meta: Json
          created_at: string
        }
        Insert: {
          id?: string
          actor_id: string
          action: string
          subject_table: string
          subject_id: string
          meta?: Json
          created_at?: string
        }
        Update: never
      }
    }
    Views: Record<string, never>
    Functions: {
      unlock_next_steps: {
        Args: { p_client_id: string }
        Returns: void
      }
    }
    Enums: Record<string, never>
  }
}
