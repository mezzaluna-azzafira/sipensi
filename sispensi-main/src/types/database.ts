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
      approval_logs: {
        Row: {
          action: Database["public"]["Enums"]["approval_action"]
          approver_id: string | null
          created_at: string
          id: string
          layer: number
          note: string | null
          request_id: string
        }
        Insert: {
          action: Database["public"]["Enums"]["approval_action"]
          approver_id?: string | null
          created_at?: string
          id?: string
          layer: number
          note?: string | null
          request_id: string
        }
        Update: {
          action?: Database["public"]["Enums"]["approval_action"]
          approver_id?: string | null
          created_at?: string
          id?: string
          layer?: number
          note?: string | null
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_logs_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_logs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "permission_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          created_at: string
          grade_level: number | null
          homeroom_teacher_id: string | null
          id: string
          major: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          grade_level?: number | null
          homeroom_teacher_id?: string | null
          id?: string
          major?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          grade_level?: number | null
          homeroom_teacher_id?: string | null
          id?: string
          major?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_homeroom_teacher_id_fkey"
            columns: ["homeroom_teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_letters: {
        Row: {
          id: string
          issued_at: string
          letter_number: string | null
          pdf_url: string | null
          qr_token: string
          request_id: string
        }
        Insert: {
          id?: string
          issued_at?: string
          letter_number?: string | null
          pdf_url?: string | null
          qr_token?: string
          request_id: string
        }
        Update: {
          id?: string
          issued_at?: string
          letter_number?: string | null
          pdf_url?: string | null
          qr_token?: string
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "digital_letters_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "permission_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      escalation_settings: {
        Row: {
          layer: number
          timeout_minutes: number
          updated_at: string
        }
        Insert: {
          layer: number
          timeout_minutes: number
          updated_at?: string
        }
        Update: {
          layer?: number
          timeout_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          request_id: string | null
          title: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          request_id?: string | null
          title?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          request_id?: string | null
          title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "permission_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      permission_requests: {
        Row: {
          class_id: string | null
          created_at: string
          current_approver_id: string | null
          current_deadline: string | null
          current_layer: number
          decided_at: string | null
          decided_by: string | null
          dispen_deadline: string | null
          dispen_started_at: string | null
          duration_minutes: number | null
          returned_at: string | null
          evidence_url: string | null
          id: string
          izin_type: Database["public"]["Enums"]["izin_type"]
          matched_schedule_id: string | null
          reason: string
          requested_at: string
          status: Database["public"]["Enums"]["request_status"]
          student_id: string
          updated_at: string
        }
        Insert: {
          class_id?: string | null
          created_at?: string
          current_approver_id?: string | null
          current_deadline?: string | null
          current_layer?: number
          decided_at?: string | null
          decided_by?: string | null
          dispen_deadline?: string | null
          dispen_started_at?: string | null
          duration_minutes?: number | null
          returned_at?: string | null
          evidence_url?: string | null
          id?: string
          izin_type: Database["public"]["Enums"]["izin_type"]
          matched_schedule_id?: string | null
          reason: string
          requested_at?: string
          status?: Database["public"]["Enums"]["request_status"]
          student_id: string
          updated_at?: string
        }
        Update: {
          class_id?: string | null
          created_at?: string
          current_approver_id?: string | null
          current_deadline?: string | null
          current_layer?: number
          decided_at?: string | null
          decided_by?: string | null
          dispen_deadline?: string | null
          dispen_started_at?: string | null
          duration_minutes?: number | null
          returned_at?: string | null
          evidence_url?: string | null
          id?: string
          izin_type?: Database["public"]["Enums"]["izin_type"]
          matched_schedule_id?: string | null
          reason?: string
          requested_at?: string
          status?: Database["public"]["Enums"]["request_status"]
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "permission_requests_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permission_requests_current_approver_id_fkey"
            columns: ["current_approver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permission_requests_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permission_requests_matched_schedule_id_fkey"
            columns: ["matched_schedule_id"]
            isOneToOne: false
            referencedRelation: "schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permission_requests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          class_id: string | null
          created_at: string
          full_name: string | null
          id: string
          nis: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          class_id?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          nis?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          class_id?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          nis?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      schedules: {
        Row: {
          class_id: string
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          start_time: string
          subject_id: string | null
          teacher_id: string | null
          updated_at: string
        }
        Insert: {
          class_id: string
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          start_time: string
          subject_id?: string | null
          teacher_id?: string | null
          updated_at?: string
        }
        Update: {
          class_id?: string
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          start_time?: string
          subject_id?: string | null
          teacher_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedules_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedules_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedules_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          code: string | null
          created_at: string
          id: string
          name: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_view_profile: { Args: { p_profile: string }; Returns: boolean }
      can_view_request: { Args: { p_request: string }; Returns: boolean }
      cancel_request: { Args: { p_request: string }; Returns: string }
      decide_request: {
        Args: {
          p_request: string
          p_action: Database["public"]["Enums"]["approval_action"]
          p_note?: string
        }
        Returns: string
      }
      detect_layer1_approver: {
        Args: { p_class: string; p_at: string }
        Returns: { approver_id: string; schedule_id: string }[]
      }
      escalate_overdue_requests: { Args: never; Returns: number }
      start_dispen: { Args: { p_request: string }; Returns: string }
      return_dispen: { Args: { p_request: string }; Returns: string }
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      has_acted_on_request: { Args: { p_request: string }; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      is_guru_bk: { Args: never; Returns: boolean }
      is_wali_kelas_of_student: {
        Args: { p_student: string }
        Returns: boolean
      }
      verify_letter: {
        Args: { p_token: string }
        Returns: {
          valid: boolean
          student_name: string | null
          class_name: string | null
          izin_type: Database["public"]["Enums"]["izin_type"]
          requested_at: string
          status: Database["public"]["Enums"]["request_status"]
          issued_at: string
          decided_at: string | null
        }[]
      }
    }
    Enums: {
      approval_action:
        | "submitted"
        | "approved"
        | "rejected"
        | "escalated"
        | "cancelled"
      izin_type:
        | "keluar_sementara"
        | "pulang"
        | "sakit"
        | "keperluan_keluarga"
        | "dispensasi"
        | "lainnya"
      request_status:
        | "pending"
        | "approved"
        | "rejected"
        | "cancelled"
        | "expired"
      user_role: "siswa" | "guru_mapel" | "wali_kelas" | "guru_bk" | "admin"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      approval_action: [
        "submitted",
        "approved",
        "rejected",
        "escalated",
        "cancelled",
      ],
      izin_type: [
        "keluar_sementara",
        "pulang",
        "sakit",
        "keperluan_keluarga",
        "dispensasi",
        "lainnya",
      ],
      request_status: [
        "pending",
        "approved",
        "rejected",
        "cancelled",
        "expired",
      ],
      user_role: ["siswa", "guru_mapel", "wali_kelas", "guru_bk", "admin"],
    },
  },
} as const
