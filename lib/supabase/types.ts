/**
 * Supabase Database Types
 * Generated types for type-safe database queries
 */

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
      user_profiles: {
        Row: {
          id: string
          name: string | null
          email: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name?: string | null
          email?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string | null
          email?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      teams: {
        Row: {
          id: string
          name: string
          description: string | null
          status: 'active' | 'inactive'
          notes: string | null
          documentation_url: string | null
          owning_user_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          status?: 'active' | 'inactive'
          notes?: string | null
          documentation_url?: string | null
          owning_user_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          status?: 'active' | 'inactive'
          notes?: string | null
          documentation_url?: string | null
          owning_user_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      people: {
        Row: {
          id: string
          full_name: string
          role: string | null
          level: string | null
          start_date: string | null
          notes: string | null
          status: 'active' | 'inactive'
          owning_user_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          full_name: string
          role?: string | null
          level?: string | null
          start_date?: string | null
          notes?: string | null
          status?: 'active' | 'inactive'
          owning_user_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          role?: string | null
          level?: string | null
          start_date?: string | null
          notes?: string | null
          status?: 'active' | 'inactive'
          owning_user_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      team_memberships: {
        Row: {
          id: string
          team_id: string
          person_id: string
          join_date: string
          leave_date: string | null
          created_at: string
        }
        Insert: {
          id?: string
          team_id: string
          person_id: string
          join_date?: string
          leave_date?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          person_id?: string
          join_date?: string
          leave_date?: string | null
          created_at?: string
        }
      }
      tasks: {
        Row: {
          id: string
          title: string
          description: string | null
          status: 'not_started' | 'in_progress' | 'blocked' | 'completed'
          list: 'week' | 'backlog'
          due_date: string | null
          completion_date: string | null
          source: 'manual' | 'meeting_action' | 'recurring_meeting' | 'growth' | 'performance'
          priority: 'low' | 'medium' | 'high' | 'very_high'
          owning_user_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          status?: 'not_started' | 'in_progress' | 'blocked' | 'completed'
          list?: 'week' | 'backlog'
          due_date?: string | null
          completion_date?: string | null
          source?: 'manual' | 'meeting_action' | 'recurring_meeting' | 'growth' | 'performance'
          priority?: 'low' | 'medium' | 'high' | 'very_high'
          owning_user_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          status?: 'not_started' | 'in_progress' | 'blocked' | 'completed'
          list?: 'week' | 'backlog'
          due_date?: string | null
          completion_date?: string | null
          source?: 'manual' | 'meeting_action' | 'recurring_meeting' | 'growth' | 'performance'
          priority?: 'low' | 'medium' | 'high' | 'very_high'
          owning_user_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      task_relations: {
        Row: {
          id: string
          task_id: string
          entity_type: 'person' | 'team'
          entity_id: string
          created_at: string
        }
        Insert: {
          id?: string
          task_id: string
          entity_type: 'person' | 'team'
          entity_id: string
          created_at?: string
        }
        Update: {
          id?: string
          task_id?: string
          entity_type?: 'person' | 'team'
          entity_id?: string
          created_at?: string
        }
      }
      meeting_templates: {
        Row: {
          id: string
          name: string
          notes: string
          is_deleted: boolean
          owning_user_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          notes?: string
          is_deleted?: boolean
          owning_user_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          notes?: string
          is_deleted?: boolean
          owning_user_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      meetings: {
        Row: {
          id: string
          title: string
          meeting_type: string
          meeting_date: string
          next_meeting_date: string | null
          recurrence: string | null
          action_items: string | null
          notes: string | null
          person_id: string | null
          team_id: string | null
          owning_user_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          meeting_type: string
          meeting_date: string
          next_meeting_date?: string | null
          recurrence?: string | null
          action_items?: string | null
          notes?: string | null
          person_id?: string | null
          team_id?: string | null
          owning_user_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          meeting_type?: string
          meeting_date?: string
          next_meeting_date?: string | null
          recurrence?: string | null
          action_items?: string | null
          notes?: string | null
          person_id?: string | null
          team_id?: string | null
          owning_user_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      career_goals_profiles: {
        Row: {
          id: string
          where_you_are: string | null
          where_you_want_to_go: string | null
          owning_user_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          where_you_are?: string | null
          where_you_want_to_go?: string | null
          owning_user_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          where_you_are?: string | null
          where_you_want_to_go?: string | null
          owning_user_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      gap_analysis_categories: {
        Row: {
          id: string
          category: string
          current_state: string | null
          desired_state: string | null
          display_order: number | null
          owning_user_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          category: string
          current_state?: string | null
          desired_state?: string | null
          display_order?: number | null
          owning_user_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          category?: string
          current_state?: string | null
          desired_state?: string | null
          display_order?: number | null
          owning_user_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      focus_distributions: {
        Row: {
          id: string
          time_period: string
          category_id: string
          focus_percent: number | null
          why: string | null
          owning_user_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          time_period: string
          category_id: string
          focus_percent?: number | null
          why?: string | null
          owning_user_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          time_period?: string
          category_id?: string
          focus_percent?: number | null
          why?: string | null
          owning_user_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      career_goals: {
        Row: {
          id: string
          time_period: string
          goal: string
          type: string
          category_id: string
          status: string
          display_order: number | null
          owning_user_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          time_period: string
          goal: string
          type: string
          category_id: string
          status: string
          display_order?: number | null
          owning_user_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          time_period?: string
          goal?: string
          type?: string
          category_id?: string
          status?: string
          display_order?: number | null
          owning_user_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      achievements: {
        Row: {
          id: string
          type: string
          description: string
          achievement_date: string
          key_takeaway: string | null
          owning_user_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          type: string
          description: string
          achievement_date: string
          key_takeaway?: string | null
          owning_user_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          type?: string
          description?: string
          achievement_date?: string
          key_takeaway?: string | null
          owning_user_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      evidence_entries: {
        Row: {
          id: string
          owning_user_id: string
          person_id: string
          category: 'achievement' | 'feedback_given' | 'feedback_received' | 'concern' | 'growth' | 'delivery' | 'behaviour' | 'promotion_evidence' | 'general'
          title: string
          content: string | null
          occurred_at: string
          meeting_id: string | null
          task_id: string | null
          sentiment: 'positive' | 'neutral' | 'negative' | null
          review_period_start: string | null
          review_period_end: string | null
          included_in_review: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owning_user_id: string
          person_id: string
          category: 'achievement' | 'feedback_given' | 'feedback_received' | 'concern' | 'growth' | 'delivery' | 'behaviour' | 'promotion_evidence' | 'general'
          title: string
          content?: string | null
          occurred_at?: string
          meeting_id?: string | null
          task_id?: string | null
          sentiment?: 'positive' | 'neutral' | 'negative' | null
          review_period_start?: string | null
          review_period_end?: string | null
          included_in_review?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owning_user_id?: string
          person_id?: string
          category?: 'achievement' | 'feedback_given' | 'feedback_received' | 'concern' | 'growth' | 'delivery' | 'behaviour' | 'promotion_evidence' | 'general'
          title?: string
          content?: string | null
          occurred_at?: string
          meeting_id?: string | null
          task_id?: string | null
          sentiment?: 'positive' | 'neutral' | 'negative' | null
          review_period_start?: string | null
          review_period_end?: string | null
          included_in_review?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      review_cycles: {
        Row: {
          id: string
          owning_user_id: string
          name: string
          start_date: string
          end_date: string
          status: 'active' | 'completed'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owning_user_id: string
          name: string
          start_date: string
          end_date: string
          status?: 'active' | 'completed'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owning_user_id?: string
          name?: string
          start_date?: string
          end_date?: string
          status?: 'active' | 'completed'
          created_at?: string
          updated_at?: string
        }
      }
      review_summaries: {
        Row: {
          id: string
          owning_user_id: string
          person_id: string
          review_cycle_id: string | null
          period_start: string
          period_end: string
          summary_text: string | null
          manager_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owning_user_id: string
          person_id: string
          review_cycle_id?: string | null
          period_start: string
          period_end: string
          summary_text?: string | null
          manager_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owning_user_id?: string
          person_id?: string
          review_cycle_id?: string | null
          period_start?: string
          period_end?: string
          summary_text?: string | null
          manager_notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
