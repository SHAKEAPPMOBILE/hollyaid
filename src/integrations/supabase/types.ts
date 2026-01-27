export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_activity_logs: {
        Row: {
          action_type: string
          admin_email: string
          admin_user_id: string
          created_at: string
          details: Json | null
          id: string
          target_id: string | null
          target_name: string | null
          target_type: string
        }
        Insert: {
          action_type: string
          admin_email: string
          admin_user_id: string
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_name?: string | null
          target_type: string
        }
        Update: {
          action_type?: string
          admin_email?: string
          admin_user_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_name?: string | null
          target_type?: string
        }
        Relationships: []
      }
      availability_slots: {
        Row: {
          created_at: string
          end_time: string
          id: string
          is_booked: boolean | null
          specialist_id: string
          start_time: string
        }
        Insert: {
          created_at?: string
          end_time: string
          id?: string
          is_booked?: boolean | null
          specialist_id: string
          start_time: string
        }
        Update: {
          created_at?: string
          end_time?: string
          id?: string
          is_booked?: boolean | null
          specialist_id?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_slots_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "specialists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_slots_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "specialists_public"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_message_reads: {
        Row: {
          booking_id: string
          created_at: string
          id: string
          last_read_at: string
          user_id: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          id?: string
          last_read_at?: string
          user_id: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          id?: string
          last_read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_message_reads_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_messages: {
        Row: {
          booking_id: string
          created_at: string
          id: string
          message: string
          sender_type: string
          sender_user_id: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          id?: string
          message: string
          sender_type: string
          sender_user_id: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          id?: string
          message?: string
          sender_type?: string
          sender_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_messages_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          confirmed_datetime: string | null
          created_at: string
          employee_user_id: string
          id: string
          meeting_link: string | null
          notes: string | null
          proposed_datetime: string | null
          session_duration: number
          session_type: string
          slot_id: string | null
          specialist_id: string
          status: string
          updated_at: string
          zoom_link: string | null
        }
        Insert: {
          confirmed_datetime?: string | null
          created_at?: string
          employee_user_id: string
          id?: string
          meeting_link?: string | null
          notes?: string | null
          proposed_datetime?: string | null
          session_duration?: number
          session_type?: string
          slot_id?: string | null
          specialist_id: string
          status?: string
          updated_at?: string
          zoom_link?: string | null
        }
        Update: {
          confirmed_datetime?: string | null
          created_at?: string
          employee_user_id?: string
          id?: string
          meeting_link?: string | null
          notes?: string | null
          proposed_datetime?: string | null
          session_duration?: number
          session_type?: string
          slot_id?: string | null
          specialist_id?: string
          status?: string
          updated_at?: string
          zoom_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "availability_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "specialists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "specialists_public"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          admin_user_id: string | null
          created_at: string
          email_domain: string
          id: string
          is_paid: boolean | null
          is_test_account: boolean | null
          logo_url: string | null
          max_employees: number | null
          minutes_included: number | null
          minutes_used: number | null
          name: string
          plan_type: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_period_end: string | null
          subscription_period_start: string | null
          subscription_status: string | null
          updated_at: string
        }
        Insert: {
          admin_user_id?: string | null
          created_at?: string
          email_domain: string
          id?: string
          is_paid?: boolean | null
          is_test_account?: boolean | null
          logo_url?: string | null
          max_employees?: number | null
          minutes_included?: number | null
          minutes_used?: number | null
          name: string
          plan_type?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_period_end?: string | null
          subscription_period_start?: string | null
          subscription_status?: string | null
          updated_at?: string
        }
        Update: {
          admin_user_id?: string | null
          created_at?: string
          email_domain?: string
          id?: string
          is_paid?: boolean | null
          is_test_account?: boolean | null
          logo_url?: string | null
          max_employees?: number | null
          minutes_included?: number | null
          minutes_used?: number | null
          name?: string
          plan_type?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_period_end?: string | null
          subscription_period_start?: string | null
          subscription_status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      company_employees: {
        Row: {
          accepted_at: string | null
          auto_joined: boolean | null
          company_id: string
          email: string
          id: string
          invited_at: string
          status: string
          user_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          auto_joined?: boolean | null
          company_id: string
          email: string
          id?: string
          invited_at?: string
          status?: string
          user_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          auto_joined?: boolean | null
          company_id?: string
          email?: string
          id?: string
          invited_at?: string
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_employees_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_requests: {
        Row: {
          amount: number
          created_at: string
          id: string
          notes: string | null
          period_end: string
          period_start: string
          processed_at: string | null
          processed_by: string | null
          specialist_id: string
          status: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          notes?: string | null
          period_end: string
          period_start: string
          processed_at?: string | null
          processed_by?: string | null
          specialist_id: string
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          period_end?: string
          period_start?: string
          processed_at?: string | null
          processed_by?: string | null
          specialist_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payout_requests_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "specialists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payout_requests_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "specialists_public"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          department: string | null
          email: string
          full_name: string | null
          id: string
          job_title: string | null
          notification_preference: string
          onboarding_completed_at: string | null
          phone_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          email: string
          full_name?: string | null
          id?: string
          job_title?: string | null
          notification_preference?: string
          onboarding_completed_at?: string | null
          phone_number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          email?: string
          full_name?: string | null
          id?: string
          job_title?: string | null
          notification_preference?: string
          onboarding_completed_at?: string | null
          phone_number?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      specialist_reviews: {
        Row: {
          booking_id: string
          comment: string | null
          created_at: string
          employee_user_id: string
          id: string
          rating: number
          specialist_id: string
        }
        Insert: {
          booking_id: string
          comment?: string | null
          created_at?: string
          employee_user_id: string
          id?: string
          rating: number
          specialist_id: string
        }
        Update: {
          booking_id?: string
          comment?: string | null
          created_at?: string
          employee_user_id?: string
          id?: string
          rating?: number
          specialist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "specialist_reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "specialist_reviews_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "specialists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "specialist_reviews_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "specialists_public"
            referencedColumns: ["id"]
          },
        ]
      }
      specialists: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          email: string
          full_name: string
          has_set_availability: boolean | null
          hourly_rate: number
          id: string
          invitation_accepted_at: string | null
          invitation_sent_at: string | null
          invitation_token: string | null
          is_active: boolean | null
          phone_number: string | null
          rate_tier: Database["public"]["Enums"]["specialist_rate_tier"] | null
          specialty: string
          updated_at: string
          user_id: string | null
          video_url: string | null
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email: string
          full_name: string
          has_set_availability?: boolean | null
          hourly_rate?: number
          id?: string
          invitation_accepted_at?: string | null
          invitation_sent_at?: string | null
          invitation_token?: string | null
          is_active?: boolean | null
          phone_number?: string | null
          rate_tier?: Database["public"]["Enums"]["specialist_rate_tier"] | null
          specialty: string
          updated_at?: string
          user_id?: string | null
          video_url?: string | null
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string
          full_name?: string
          has_set_availability?: boolean | null
          hourly_rate?: number
          id?: string
          invitation_accepted_at?: string | null
          invitation_sent_at?: string | null
          invitation_token?: string | null
          is_active?: boolean | null
          phone_number?: string | null
          rate_tier?: Database["public"]["Enums"]["specialist_rate_tier"] | null
          specialty?: string
          updated_at?: string
          user_id?: string | null
          video_url?: string | null
          website?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      specialists_public: {
        Row: {
          avatar_url: string | null
          bio: string | null
          full_name: string | null
          id: string | null
          is_active: boolean | null
          rate_tier: Database["public"]["Enums"]["specialist_rate_tier"] | null
          specialty: string | null
          video_url: string | null
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          full_name?: string | null
          id?: string | null
          is_active?: boolean | null
          rate_tier?: Database["public"]["Enums"]["specialist_rate_tier"] | null
          specialty?: string | null
          video_url?: string | null
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          full_name?: string | null
          id?: string | null
          is_active?: boolean | null
          rate_tier?: Database["public"]["Enums"]["specialist_rate_tier"] | null
          specialty?: string | null
          video_url?: string | null
          website?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_company_admin: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      is_specialist_owner: {
        Args: { _specialist_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "company_admin" | "employee" | "specialist"
      specialist_rate_tier: "standard" | "advanced" | "expert" | "master"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "company_admin", "employee", "specialist"],
      specialist_rate_tier: ["standard", "advanced", "expert", "master"],
    },
  },
} as const
