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
            referencedRelation: "monthly_leaderboard"
            referencedColumns: ["user_id"]
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
      book_early_access_config: {
        Row: {
          book_id: string
          cover_src: string | null
          created_at: string
          early_access_url: string | null
          release_at: string
          title_en: string | null
          title_es: string | null
        }
        Insert: {
          book_id: string
          cover_src?: string | null
          created_at?: string
          early_access_url?: string | null
          release_at: string
          title_en?: string | null
          title_es?: string | null
        }
        Update: {
          book_id?: string
          cover_src?: string | null
          created_at?: string
          early_access_url?: string | null
          release_at?: string
          title_en?: string | null
          title_es?: string | null
        }
        Relationships: []
      }
      book_early_access_unlocks: {
        Row: {
          book_id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          book_id: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          book_id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_early_access_unlocks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "monthly_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "book_early_access_unlocks_user_id_fkey"
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
          thanked_at: string | null
          thanked_channels: Json | null
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
          thanked_at?: string | null
          thanked_channels?: Json | null
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
          thanked_at?: string | null
          thanked_channels?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "monthly_leaderboard"
            referencedColumns: ["user_id"]
          },
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
          content_url: string | null
          created_at: string
          ctr: number | null
          id: number
          impressions: number | null
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
          content_url?: string | null
          created_at?: string
          ctr?: number | null
          id?: never
          impressions?: number | null
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
          content_url?: string | null
          created_at?: string
          ctr?: number | null
          id?: never
          impressions?: number | null
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
            referencedRelation: "monthly_leaderboard"
            referencedColumns: ["user_id"]
          },
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
            foreignKeyName: "gallery_boosts_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews_awaiting_thanks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gallery_boosts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "monthly_leaderboard"
            referencedColumns: ["user_id"]
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
      home_pins: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          review_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          review_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          review_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "home_pins_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "book_reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "home_pins_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "gallery_feed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "home_pins_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews_awaiting_thanks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "home_pins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "monthly_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "home_pins_user_id_fkey"
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
          prize_book_id: string | null
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
          prize_book_id?: string | null
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
          prize_book_id?: string | null
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
            referencedRelation: "monthly_leaderboard"
            referencedColumns: ["user_id"]
          },
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
            referencedRelation: "monthly_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "lottery_winners_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_reports: {
        Row: {
          best_post_types: Json
          best_posting_hours: Json
          blog_performance: Json
          follower_deltas: Json
          generated_at: string
          id: number
          month_end: string
          month_start: string
          new_subscribers: number
          raw_data: Json
          recommendations: Json
          source_breakdown: Json
          summary: string | null
          top_posts: Json
          total_clicks: number
          total_engagement: number
          total_pageviews: number
          total_posts: number
          unique_visitors: number
          utm_attribution: Json
          week_over_week: Json
        }
        Insert: {
          best_post_types?: Json
          best_posting_hours?: Json
          blog_performance?: Json
          follower_deltas?: Json
          generated_at?: string
          id?: never
          month_end: string
          month_start: string
          new_subscribers?: number
          raw_data?: Json
          recommendations?: Json
          source_breakdown?: Json
          summary?: string | null
          top_posts?: Json
          total_clicks?: number
          total_engagement?: number
          total_pageviews?: number
          total_posts?: number
          unique_visitors?: number
          utm_attribution?: Json
          week_over_week?: Json
        }
        Update: {
          best_post_types?: Json
          best_posting_hours?: Json
          blog_performance?: Json
          follower_deltas?: Json
          generated_at?: string
          id?: never
          month_end?: string
          month_start?: string
          new_subscribers?: number
          raw_data?: Json
          recommendations?: Json
          source_breakdown?: Json
          summary?: string | null
          top_posts?: Json
          total_clicks?: number
          total_engagement?: number
          total_pageviews?: number
          total_posts?: number
          unique_visitors?: number
          utm_attribution?: Json
          week_over_week?: Json
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          confirm_token: string | null
          confirmed: boolean | null
          created_at: string | null
          email: string
          id: string
          ip_hash: string | null
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
          ip_hash?: string | null
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
          ip_hash?: string | null
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
          landing_page: string | null
          path: string
          referrer: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          visitor_hash: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string | null
          id?: never
          landing_page?: string | null
          path: string
          referrer?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          visitor_hash?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string | null
          id?: never
          landing_page?: string | null
          path?: string
          referrer?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          visitor_hash?: string | null
        }
        Relationships: []
      }
      pending_gifts: {
        Row: {
          claimed_at: string | null
          claimed_by: string | null
          created_at: string
          expires_at: string
          id: string
          quantity: number
          recipient_email: string
          recipient_email_norm: string | null
          referral_bonus_paid_at: string | null
          refunded_at: string | null
          sender_id: string
          sender_tx_id: string | null
          token: string
        }
        Insert: {
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          expires_at: string
          id?: string
          quantity: number
          recipient_email: string
          recipient_email_norm?: string | null
          referral_bonus_paid_at?: string | null
          refunded_at?: string | null
          sender_id: string
          sender_tx_id?: string | null
          token: string
        }
        Update: {
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          quantity?: number
          recipient_email?: string
          recipient_email_norm?: string | null
          referral_bonus_paid_at?: string | null
          refunded_at?: string | null
          sender_id?: string
          sender_tx_id?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_gifts_claimed_by_fkey"
            columns: ["claimed_by"]
            isOneToOne: false
            referencedRelation: "monthly_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "pending_gifts_claimed_by_fkey"
            columns: ["claimed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_gifts_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "monthly_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "pending_gifts_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_badges: {
        Row: {
          active: boolean | null
          badge_type: string
          expires_at: string | null
          id: string
          purchased_at: string | null
          user_id: string
        }
        Insert: {
          active?: boolean | null
          badge_type: string
          expires_at?: string | null
          id?: string
          purchased_at?: string | null
          user_id: string
        }
        Update: {
          active?: boolean | null
          badge_type?: string
          expires_at?: string | null
          id?: string
          purchased_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_badges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "monthly_leaderboard"
            referencedColumns: ["user_id"]
          },
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
          accent_color: string | null
          address_line1: string | null
          address_line2: string | null
          avatar_url: string | null
          city: string | null
          country: string | null
          created_at: string | null
          display_name: string | null
          email: string
          featured_badge: string | null
          id: string
          is_admin: boolean | null
          lang_pref: string | null
          notification_prefs: Json
          parent_consent_at: string | null
          phone: string | null
          premium_download_credits: number
          show_in_leaderboards: boolean
          state: string | null
          suspended: boolean
          zip_code: string | null
        }
        Insert: {
          accent_color?: string | null
          address_line1?: string | null
          address_line2?: string | null
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          display_name?: string | null
          email: string
          featured_badge?: string | null
          id: string
          is_admin?: boolean | null
          lang_pref?: string | null
          notification_prefs?: Json
          parent_consent_at?: string | null
          phone?: string | null
          premium_download_credits?: number
          show_in_leaderboards?: boolean
          state?: string | null
          suspended?: boolean
          zip_code?: string | null
        }
        Update: {
          accent_color?: string | null
          address_line1?: string | null
          address_line2?: string | null
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string
          featured_badge?: string | null
          id?: string
          is_admin?: boolean | null
          lang_pref?: string | null
          notification_prefs?: Json
          parent_consent_at?: string | null
          phone?: string | null
          premium_download_credits?: number
          show_in_leaderboards?: boolean
          state?: string | null
          suspended?: boolean
          zip_code?: string | null
        }
        Relationships: []
      }
      shop_drops: {
        Row: {
          active_from: string
          active_to: string
          badge_type: string
          cost: number
          created_at: string
          desc_en: string | null
          desc_es: string | null
          icon: string
          id: string
          label_en: string
          label_es: string
        }
        Insert: {
          active_from: string
          active_to: string
          badge_type: string
          cost: number
          created_at?: string
          desc_en?: string | null
          desc_es?: string | null
          icon?: string
          id: string
          label_en: string
          label_es: string
        }
        Update: {
          active_from?: string
          active_to?: string
          badge_type?: string
          cost?: number
          created_at?: string
          desc_en?: string | null
          desc_es?: string | null
          icon?: string
          id?: string
          label_en?: string
          label_es?: string
        }
        Relationships: []
      }
      shoutout_orders: {
        Row: {
          admin_note: string | null
          cost: number
          created_at: string
          id: string
          published_at: string | null
          published_url: string | null
          review_id: string
          reviewed_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          cost: number
          created_at?: string
          id?: string
          published_at?: string | null
          published_url?: string | null
          review_id: string
          reviewed_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          cost?: number
          created_at?: string
          id?: string
          published_at?: string | null
          published_url?: string | null
          review_id?: string
          reviewed_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shoutout_orders_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "book_reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shoutout_orders_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "gallery_feed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shoutout_orders_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews_awaiting_thanks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shoutout_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "monthly_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "shoutout_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "monthly_leaderboard"
            referencedColumns: ["user_id"]
          },
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
            referencedRelation: "monthly_leaderboard"
            referencedColumns: ["user_id"]
          },
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
            referencedRelation: "monthly_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_streaks: {
        Row: {
          current_streak: number
          last_visit_date: string
          longest_streak: number
          updated_at: string
          user_id: string
        }
        Insert: {
          current_streak?: number
          last_visit_date: string
          longest_streak?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          current_streak?: number
          last_visit_date?: string
          longest_streak?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      validation_failures: {
        Row: {
          concept: string | null
          creative_id: string | null
          first_attempt: Json
          flywheel_stage: number | null
          id: number
          lang: string
          post_type: string
          reason: string
          retry_attempt: Json
          ts: string
        }
        Insert: {
          concept?: string | null
          creative_id?: string | null
          first_attempt?: Json
          flywheel_stage?: number | null
          id?: never
          lang: string
          post_type: string
          reason?: string
          retry_attempt?: Json
          ts?: string
        }
        Update: {
          concept?: string | null
          creative_id?: string | null
          first_attempt?: Json
          flywheel_stage?: number | null
          id?: never
          lang?: string
          post_type?: string
          reason?: string
          retry_attempt?: Json
          ts?: string
        }
        Relationships: []
      }
      weekly_reports: {
        Row: {
          best_post_types: Json
          best_posting_hours: Json
          blog_performance: Json
          follower_deltas: Json
          generated_at: string
          id: number
          new_subscribers: number
          raw_data: Json
          recommendations: Json
          source_breakdown: Json
          summary: string | null
          top_posts: Json
          total_clicks: number
          total_engagement: number
          total_pageviews: number
          total_posts: number
          unique_visitors: number
          utm_attribution: Json
          week_end: string
          week_start: string
          worst_posts: Json
        }
        Insert: {
          best_post_types?: Json
          best_posting_hours?: Json
          blog_performance?: Json
          follower_deltas?: Json
          generated_at?: string
          id?: never
          new_subscribers?: number
          raw_data?: Json
          recommendations?: Json
          source_breakdown?: Json
          summary?: string | null
          top_posts?: Json
          total_clicks?: number
          total_engagement?: number
          total_pageviews?: number
          total_posts?: number
          unique_visitors?: number
          utm_attribution?: Json
          week_end: string
          week_start: string
          worst_posts?: Json
        }
        Update: {
          best_post_types?: Json
          best_posting_hours?: Json
          blog_performance?: Json
          follower_deltas?: Json
          generated_at?: string
          id?: never
          new_subscribers?: number
          raw_data?: Json
          recommendations?: Json
          source_breakdown?: Json
          summary?: string | null
          top_posts?: Json
          total_clicks?: number
          total_engagement?: number
          total_pageviews?: number
          total_posts?: number
          unique_visitors?: number
          utm_attribution?: Json
          week_end?: string
          week_start?: string
          worst_posts?: Json
        }
        Relationships: []
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
          is_highlighted: boolean | null
          is_pinned: boolean | null
          photo_url: string | null
          rating: number | null
          review_text: string | null
          submitted_at: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "book_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "monthly_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "book_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      monthly_leaderboard: {
        Row: {
          display_name: string | null
          month_end: string | null
          month_start: string | null
          peanuts_earned: number | null
          rank: number | null
          user_id: string | null
        }
        Relationships: []
      }
      reviews_awaiting_thanks: {
        Row: {
          book_id: string | null
          id: string | null
          photo_url: string | null
          rating: number | null
          review_text: string | null
          reviewed_at: string | null
          reviewer_avatar: string | null
          reviewer_name: string | null
          submitted_at: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "book_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "monthly_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "book_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      v_content_performance_30d: {
        Row: {
          avg_ctr: number | null
          avg_engagement: number | null
          platform: string | null
          post_count: number | null
          post_type: string | null
          total_clicks: number | null
          total_comments: number | null
          total_impressions: number | null
          total_likes: number | null
          total_reach: number | null
          total_shares: number | null
        }
        Relationships: []
      }
      v_content_performance_7d: {
        Row: {
          avg_ctr: number | null
          avg_engagement: number | null
          platform: string | null
          post_count: number | null
          post_type: string | null
          total_clicks: number | null
          total_comments: number | null
          total_impressions: number | null
          total_likes: number | null
          total_reach: number | null
          total_shares: number | null
        }
        Relationships: []
      }
      v_utm_clicks_30d: {
        Row: {
          clicks: number | null
          first_click: string | null
          last_click: string | null
          unique_clicks: number | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Relationships: []
      }
      validation_failures_recent: {
        Row: {
          concept: string | null
          creative_id: string | null
          first_attempt_violation_count: number | null
          flywheel_stage: number | null
          id: number | null
          lang: string | null
          post_type: string | null
          reason: string | null
          retry_violation_count: number | null
          ts: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      award_monthly_top_earners: { Args: never; Returns: Json }
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
      can_send_email: {
        Args: { p_kind: string; p_user_id: string }
        Returns: boolean
      }
      check_rate_limit: {
        Args: { p_action: string; p_max_per_hour?: number; p_user_id: string }
        Returns: boolean
      }
      check_subscribe_rate_limit: {
        Args: { p_ip: string; p_max_per_hour?: number }
        Returns: boolean
      }
      claim_pending_gifts_for_profile: {
        Args: { p_user_id: string }
        Returns: number
      }
      confirm_parental_consent: { Args: never; Returns: Json }
      delete_user_account: {
        Args: { p_confirm: string; p_user_id: string }
        Returns: Json
      }
      enter_giveaway: {
        Args: { p_month: string; p_quantity: number; p_user_id: string }
        Returns: Json
      }
      get_shares_today: { Args: { p_user_id: string }; Returns: number }
      get_streak: { Args: { p_user_id: string }; Returns: Json }
      get_user_credits: { Args: { p_user_id: string }; Returns: number }
      get_user_tickets: { Args: { p_user_id: string }; Returns: number }
      gift_tickets: {
        Args: {
          p_quantity: number
          p_recipient_email: string
          p_sender_id: string
        }
        Returns: Json
      }
      grant_giveaway_bonus: {
        Args: { p_amount?: number; p_winner_id: string }
        Returns: {
          new_balance: number
          status: string
        }[]
      }
      grant_milestone_badges: {
        Args: { p_user_id: string }
        Returns: undefined
      }
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
      purchase_accent_color: {
        Args: { p_color: string; p_cost: number; p_user_id: string }
        Returns: Json
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
      purchase_download_multipack: {
        Args: { p_cost?: number; p_credits?: number; p_user_id: string }
        Returns: Json
      }
      purchase_drop: {
        Args: { p_drop_id: string; p_user_id: string }
        Returns: Json
      }
      purchase_early_access: {
        Args: { p_book_id: string; p_cost?: number; p_user_id: string }
        Returns: Json
      }
      purchase_highlight: {
        Args: {
          p_cost: number
          p_duration_days?: number
          p_review_id: string
          p_user_id: string
        }
        Returns: Json
      }
      purchase_home_pin: {
        Args: {
          p_cost?: number
          p_duration_days?: number
          p_review_id: string
          p_user_id: string
        }
        Returns: Json
      }
      purchase_shoutout: {
        Args: { p_cost?: number; p_review_id: string; p_user_id: string }
        Returns: Json
      }
      refresh_monthly_leaderboard: { Args: never; Returns: undefined }
      refund_expired_pending_gifts: { Args: never; Returns: number }
      refund_shoutout: {
        Args: { p_admin_note?: string; p_order_id: string }
        Returns: Json
      }
      set_featured_badge: {
        Args: { p_badge_type: string; p_user_id: string }
        Returns: Json
      }
      touch_streak: { Args: { p_user_id: string }; Returns: Json }
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
  public: {
    Enums: {},
  },
} as const
