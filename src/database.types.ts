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
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          admin_id: string
          created_at: string | null
          details: Json | null
          id: string
          target_id: string | null
          target_type: string
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string | null
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type: string
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type?: string
        }
        Relationships: []
      }
      agent_decisions: {
        Row: {
          confidence_score: number | null
          context_data: Json | null
          created_at: string
          decision_type: string
          executed: boolean | null
          executed_at: string | null
          id: number
          reasoning: string | null
          recommended_action: string
        }
        Insert: {
          confidence_score?: number | null
          context_data?: Json | null
          created_at?: string
          decision_type: string
          executed?: boolean | null
          executed_at?: string | null
          id?: never
          reasoning?: string | null
          recommended_action: string
        }
        Update: {
          confidence_score?: number | null
          context_data?: Json | null
          created_at?: string
          decision_type?: string
          executed?: boolean | null
          executed_at?: string | null
          id?: never
          reasoning?: string | null
          recommended_action?: string
        }
        Relationships: []
      }
      artwork_downloads: {
        Row: {
          artwork_id: string
          downloaded_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          artwork_id: string
          downloaded_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          artwork_id?: string
          downloaded_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "artwork_downloads_artwork_id_fkey"
            columns: ["artwork_id"]
            isOneToOne: false
            referencedRelation: "free_artworks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artwork_downloads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      book_reviews: {
        Row: {
          book_id: string
          extra_photos: string[] | null
          featured: boolean | null
          id: string
          photo_url: string
          rating: number
          review_text: string | null
          reviewed_at: string | null
          reviewer_note: string | null
          show_in_gallery: boolean | null
          status: string | null
          submitted_at: string | null
          user_id: string
        }
        Insert: {
          book_id: string
          extra_photos?: string[] | null
          featured?: boolean | null
          id?: string
          photo_url: string
          rating: number
          review_text?: string | null
          reviewed_at?: string | null
          reviewer_note?: string | null
          show_in_gallery?: boolean | null
          status?: string | null
          submitted_at?: string | null
          user_id: string
        }
        Update: {
          book_id?: string
          extra_photos?: string[] | null
          featured?: boolean | null
          id?: string
          photo_url?: string
          rating?: number
          review_text?: string | null
          reviewed_at?: string | null
          reviewer_note?: string | null
          show_in_gallery?: boolean | null
          status?: string | null
          submitted_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      content_performance: {
        Row: {
          clicks: number | null
          comments: number | null
          created_at: string
          id: number
          likes: number | null
          platform: string
          post_id: string
          post_type: string
          posted_at: string | null
          reach: number | null
          shares: number | null
          updated_at: string
          utm_campaign: string | null
        }
        Insert: {
          clicks?: number | null
          comments?: number | null
          created_at?: string
          id?: never
          likes?: number | null
          platform: string
          post_id: string
          post_type: string
          posted_at?: string | null
          reach?: number | null
          shares?: number | null
          updated_at?: string
          utm_campaign?: string | null
        }
        Update: {
          clicks?: number | null
          comments?: number | null
          created_at?: string
          id?: never
          likes?: number | null
          platform?: string
          post_id?: string
          post_type?: string
          posted_at?: string | null
          reach?: number | null
          shares?: number | null
          updated_at?: string
          utm_campaign?: string | null
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          reason: string
          ref_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          reason: string
          ref_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          reason?: string
          ref_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      engagement_snapshots: {
        Row: {
          comments: number
          followers: number | null
          id: number
          likes: number
          platform: string
          post_id: string
          shares: number
          snapshot_at: string
        }
        Insert: {
          comments?: number
          followers?: number | null
          id?: never
          likes?: number
          platform: string
          post_id: string
          shares?: number
          snapshot_at?: string
        }
        Update: {
          comments?: number
          followers?: number | null
          id?: never
          likes?: number
          platform?: string
          post_id?: string
          shares?: number
          snapshot_at?: string
        }
        Relationships: []
      }
      fb_group_posts: {
        Row: {
          group_id: string
          group_name: string | null
          id: number
          message: string | null
          post_id: string
          posted_at: string
        }
        Insert: {
          group_id: string
          group_name?: string | null
          id?: never
          message?: string | null
          post_id: string
          posted_at?: string
        }
        Update: {
          group_id?: string
          group_name?: string | null
          id?: never
          message?: string | null
          post_id?: string
          posted_at?: string
        }
        Relationships: []
      }
      free_artworks: {
        Row: {
          active: boolean | null
          category: string
          created_at: string | null
          id: string
          image_path: string
          is_premium: boolean | null
          peanut_cost: number | null
          sort_order: number | null
          thumbnail_path: string
          title_en: string
          title_es: string
        }
        Insert: {
          active?: boolean | null
          category?: string
          created_at?: string | null
          id?: string
          image_path: string
          is_premium?: boolean | null
          peanut_cost?: number | null
          sort_order?: number | null
          thumbnail_path?: string
          title_en?: string
          title_es?: string
        }
        Update: {
          active?: boolean | null
          category?: string
          created_at?: string | null
          id?: string
          image_path?: string
          is_premium?: boolean | null
          peanut_cost?: number | null
          sort_order?: number | null
          thumbnail_path?: string
          title_en?: string
          title_es?: string
        }
        Relationships: []
      }
      gallery_boosts: {
        Row: {
          boost_type: string
          expires_at: string
          id: string
          purchased_at: string | null
          review_id: string
          user_id: string
        }
        Insert: {
          boost_type: string
          expires_at: string
          id?: string
          purchased_at?: string | null
          review_id: string
          user_id: string
        }
        Update: {
          boost_type?: string
          expires_at?: string
          id?: string
          purchased_at?: string | null
          review_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gallery_boosts_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "book_reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gallery_boosts_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "gallery_feed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gallery_boosts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lottery_config: {
        Row: {
          created_at: string | null
          draw_date: string | null
          is_active: boolean
          max_winners: number | null
          min_purchases: number | null
          month: string
          participant_boost: number
          prize_description: string | null
          winner_pct: number | null
        }
        Insert: {
          created_at?: string | null
          draw_date?: string | null
          is_active?: boolean
          max_winners?: number | null
          min_purchases?: number | null
          month: string
          participant_boost?: number
          prize_description?: string | null
          winner_pct?: number | null
        }
        Update: {
          created_at?: string | null
          draw_date?: string | null
          is_active?: boolean
          max_winners?: number | null
          min_purchases?: number | null
          month?: string
          participant_boost?: number
          prize_description?: string | null
          winner_pct?: number | null
        }
        Relationships: []
      }
      lottery_draw_log: {
        Row: {
          config_snapshot: Json
          created_at: string | null
          drawn_by: string | null
          eligible_users: number
          id: string
          month: string
          total_tickets: number
          winners_drawn: number
        }
        Insert: {
          config_snapshot?: Json
          created_at?: string | null
          drawn_by?: string | null
          eligible_users?: number
          id?: string
          month: string
          total_tickets?: number
          winners_drawn?: number
        }
        Update: {
          config_snapshot?: Json
          created_at?: string | null
          drawn_by?: string | null
          eligible_users?: number
          id?: string
          month?: string
          total_tickets?: number
          winners_drawn?: number
        }
        Relationships: []
      }
      lottery_entries: {
        Row: {
          entry_count: number
          id: string
          month: string
          purchased_at: string | null
          user_id: string
        }
        Insert: {
          entry_count?: number
          id?: string
          month: string
          purchased_at?: string | null
          user_id: string
        }
        Update: {
          entry_count?: number
          id?: string
          month?: string
          purchased_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lottery_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lottery_winners: {
        Row: {
          book_chosen: string | null
          claim_deadline: string | null
          claimed: boolean | null
          created_at: string | null
          id: string
          month: string
          notified: boolean | null
          shipping_address: string | null
          shipping_name: string | null
          user_id: string
        }
        Insert: {
          book_chosen?: string | null
          claim_deadline?: string | null
          claimed?: boolean | null
          created_at?: string | null
          id?: string
          month: string
          notified?: boolean | null
          shipping_address?: string | null
          shipping_name?: string | null
          user_id: string
        }
        Update: {
          book_chosen?: string | null
          claim_deadline?: string | null
          claimed?: boolean | null
          created_at?: string | null
          id?: string
          month?: string
          notified?: boolean | null
          shipping_address?: string | null
          shipping_name?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lottery_winners_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_subscribers: {
        Row: {
          confirm_token: string | null
          confirmed: boolean | null
          created_at: string | null
          email: string
          id: string
          lang_pref: string | null
          last_reminder_at: string | null
          name: string | null
          reminder_count: number | null
          source: string | null
        }
        Insert: {
          confirm_token?: string | null
          confirmed?: boolean | null
          created_at?: string | null
          email: string
          id?: string
          lang_pref?: string | null
          last_reminder_at?: string | null
          name?: string | null
          reminder_count?: number | null
          source?: string | null
        }
        Update: {
          confirm_token?: string | null
          confirmed?: boolean | null
          created_at?: string | null
          email?: string
          id?: string
          lang_pref?: string | null
          last_reminder_at?: string | null
          name?: string | null
          reminder_count?: number | null
          source?: string | null
        }
        Relationships: []
      }
      pageviews: {
        Row: {
          country: string | null
          created_at: string | null
          id: number
          path: string
          referrer: string | null
          visitor_hash: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string | null
          id?: never
          path: string
          referrer?: string | null
          visitor_hash?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string | null
          id?: never
          path?: string
          referrer?: string | null
          visitor_hash?: string | null
        }
        Relationships: []
      }
      profile_badges: {
        Row: {
          active: boolean | null
          badge_type: string
          id: string
          purchased_at: string | null
          user_id: string
        }
        Insert: {
          active?: boolean | null
          badge_type: string
          id?: string
          purchased_at?: string | null
          user_id: string
        }
        Update: {
          active?: boolean | null
          badge_type?: string
          id?: string
          purchased_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_badges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          avatar_url: string | null
          city: string | null
          country: string | null
          created_at: string | null
          display_name: string | null
          email: string
          id: string
          is_admin: boolean | null
          lang_pref: string | null
          phone: string | null
          state: string | null
          suspended: boolean
          zip_code: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          display_name?: string | null
          email: string
          id: string
          is_admin?: boolean | null
          lang_pref?: string | null
          phone?: string | null
          state?: string | null
          suspended?: boolean
          zip_code?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string
          id?: string
          is_admin?: boolean | null
          lang_pref?: string | null
          phone?: string | null
          state?: string | null
          suspended?: boolean
          zip_code?: string | null
        }
        Relationships: []
      }
      social_metrics: {
        Row: {
          collected_at: string
          id: number
          metric_type: string
          platform: string
          post_id: string | null
          value: Json
        }
        Insert: {
          collected_at?: string
          id?: never
          metric_type: string
          platform: string
          post_id?: string | null
          value?: Json
        }
        Update: {
          collected_at?: string
          id?: never
          metric_type?: string
          platform?: string
          post_id?: string | null
          value?: Json
        }
        Relationships: []
      }
      social_shares: {
        Row: {
          created_at: string | null
          id: string
          platform: string
          share_date: string
          shared_url: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          platform?: string
          share_date?: string
          shared_url?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          platform?: string
          share_date?: string
          shared_url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_shares_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_transactions: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          reason: string
          ref_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          reason: string
          ref_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          reason?: string
          ref_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      traffic_insights: {
        Row: {
          created_at: string
          date: string
          id: number
          pageviews: number
          sessions: number
          source_category: string
          source_detail: string
          top_pages: Json | null
          unique_visitors: number
        }
        Insert: {
          created_at?: string
          date: string
          id?: never
          pageviews?: number
          sessions?: number
          source_category: string
          source_detail?: string
          top_pages?: Json | null
          unique_visitors?: number
        }
        Update: {
          created_at?: string
          date?: string
          id?: never
          pageviews?: number
          sessions?: number
          source_category?: string
          source_detail?: string
          top_pages?: Json | null
          unique_visitors?: number
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          body_en: string
          body_es: string
          created_at: string
          emailed: boolean
          id: string
          read: boolean
          title_en: string
          title_es: string
          type: string
          user_id: string
        }
        Insert: {
          body_en?: string
          body_es?: string
          created_at?: string
          emailed?: boolean
          id?: string
          read?: boolean
          title_en?: string
          title_es?: string
          type?: string
          user_id: string
        }
        Update: {
          body_en?: string
          body_es?: string
          created_at?: string
          emailed?: boolean
          id?: string
          read?: boolean
          title_en?: string
          title_es?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      gallery_feed: {
        Row: {
          book_id: string | null
          display_name: string | null
          extra_photos: string[] | null
          featured: boolean | null
          has_gold_border: boolean | null
          id: string | null
          is_pinned: boolean | null
          photo_url: string | null
          rating: number | null
          review_text: string | null
          submitted_at: string | null
        }
        Relationships: []
      }
      lottery_winners_public: {
        Row: {
          book_chosen: string | null
          country: string | null
          display_name: string | null
          month: string | null
          state: string | null
          total_tickets: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      award_review_tickets: {
        Args: { p_review_id: string; p_tickets?: number; p_user_id: string }
        Returns: Json
      }
      buy_lottery_entry: {
        Args: {
          p_cost_per_entry?: number
          p_month: string
          p_quantity: number
          p_user_id: string
        }
        Returns: Json
      }
      buy_tickets: {
        Args: {
          p_cost_per_ticket?: number
          p_quantity: number
          p_user_id: string
        }
        Returns: Json
      }
      check_rate_limit: {
        Args: { p_action: string; p_max_per_hour?: number; p_user_id: string }
        Returns: boolean
      }
      check_subscribe_rate_limit: {
        Args: { p_ip: string; p_max_per_hour?: number }
        Returns: boolean
      }
      enter_giveaway: {
        Args: { p_month: string; p_quantity: number; p_user_id: string }
        Returns: Json
      }
      get_shares_today: { Args: { p_user_id: string }; Returns: number }
      get_user_credits: { Args: { p_user_id: string }; Returns: number }
      get_user_tickets: { Args: { p_user_id: string }; Returns: number }
      notify_user: {
        Args: {
          p_body_en: string
          p_body_es: string
          p_title_en: string
          p_title_es: string
          p_type: string
          p_user_id: string
        }
        Returns: undefined
      }
      purchase_badge: {
        Args: { p_badge_type: string; p_cost: number; p_user_id: string }
        Returns: Json
      }
      purchase_boost: {
        Args: {
          p_boost_type: string
          p_cost: number
          p_duration_days?: number
          p_review_id: string
          p_user_id: string
        }
        Returns: Json
      }
      purchase_download: {
        Args: { p_artwork_id: string; p_cost: number; p_user_id: string }
        Returns: Json
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
