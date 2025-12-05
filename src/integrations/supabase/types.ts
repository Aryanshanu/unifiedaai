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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      attestations: {
        Row: {
          created_at: string
          document_url: string | null
          expires_at: string | null
          framework_id: string | null
          id: string
          model_id: string | null
          signed_at: string | null
          signed_by: string | null
          status: Database["public"]["Enums"]["review_status"]
          title: string
        }
        Insert: {
          created_at?: string
          document_url?: string | null
          expires_at?: string | null
          framework_id?: string | null
          id?: string
          model_id?: string | null
          signed_at?: string | null
          signed_by?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          title: string
        }
        Update: {
          created_at?: string
          document_url?: string | null
          expires_at?: string | null
          framework_id?: string | null
          id?: string
          model_id?: string | null
          signed_at?: string | null
          signed_by?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "attestations_framework_id_fkey"
            columns: ["framework_id"]
            isOneToOne: false
            referencedRelation: "control_frameworks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attestations_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
      control_assessments: {
        Row: {
          assessed_at: string | null
          assessed_by: string | null
          control_id: string
          created_at: string
          evidence: string | null
          id: string
          model_id: string
          notes: string | null
          status: Database["public"]["Enums"]["control_status"]
          updated_at: string
        }
        Insert: {
          assessed_at?: string | null
          assessed_by?: string | null
          control_id: string
          created_at?: string
          evidence?: string | null
          id?: string
          model_id: string
          notes?: string | null
          status?: Database["public"]["Enums"]["control_status"]
          updated_at?: string
        }
        Update: {
          assessed_at?: string | null
          assessed_by?: string | null
          control_id?: string
          created_at?: string
          evidence?: string | null
          id?: string
          model_id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["control_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "control_assessments_control_id_fkey"
            columns: ["control_id"]
            isOneToOne: false
            referencedRelation: "controls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "control_assessments_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
      control_frameworks: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          total_controls: number
          updated_at: string
          version: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          total_controls?: number
          updated_at?: string
          version?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          total_controls?: number
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      controls: {
        Row: {
          code: string
          created_at: string
          description: string | null
          framework_id: string
          id: string
          severity: Database["public"]["Enums"]["severity_level"]
          title: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          framework_id: string
          id?: string
          severity?: Database["public"]["Enums"]["severity_level"]
          title: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          framework_id?: string
          id?: string
          severity?: Database["public"]["Enums"]["severity_level"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "controls_framework_id_fkey"
            columns: ["framework_id"]
            isOneToOne: false
            referencedRelation: "control_frameworks"
            referencedColumns: ["id"]
          },
        ]
      }
      decisions: {
        Row: {
          conditions: string | null
          decided_at: string
          decision: string
          id: string
          rationale: string | null
          review_id: string
          reviewer_id: string
        }
        Insert: {
          conditions?: string | null
          decided_at?: string
          decision: string
          id?: string
          rationale?: string | null
          review_id: string
          reviewer_id: string
        }
        Update: {
          conditions?: string | null
          decided_at?: string
          decision?: string
          id?: string
          rationale?: string | null
          review_id?: string
          reviewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "decisions_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "review_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      drift_alerts: {
        Row: {
          detected_at: string
          drift_type: string
          drift_value: number
          feature: string
          id: string
          model_id: string
          resolved_at: string | null
          resolved_by: string | null
          severity: Database["public"]["Enums"]["severity_level"]
          status: Database["public"]["Enums"]["incident_status"]
        }
        Insert: {
          detected_at?: string
          drift_type: string
          drift_value: number
          feature: string
          id?: string
          model_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: Database["public"]["Enums"]["severity_level"]
          status?: Database["public"]["Enums"]["incident_status"]
        }
        Update: {
          detected_at?: string
          drift_type?: string
          drift_value?: number
          feature?: string
          id?: string
          model_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: Database["public"]["Enums"]["severity_level"]
          status?: Database["public"]["Enums"]["incident_status"]
        }
        Relationships: [
          {
            foreignKeyName: "drift_alerts_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_results: {
        Row: {
          created_at: string
          details: Json | null
          id: string
          metric_name: string
          metric_value: number
          passed: boolean
          run_id: string
          threshold: number | null
        }
        Insert: {
          created_at?: string
          details?: Json | null
          id?: string
          metric_name: string
          metric_value: number
          passed?: boolean
          run_id: string
          threshold?: number | null
        }
        Update: {
          created_at?: string
          details?: Json | null
          id?: string
          metric_name?: string
          metric_value?: number
          passed?: boolean
          run_id?: string
          threshold?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "evaluation_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_runs: {
        Row: {
          completed_at: string | null
          created_at: string
          details: Json | null
          engine_type: string | null
          explanations: Json | null
          factuality_score: number | null
          fairness_score: number | null
          id: string
          metric_details: Json | null
          model_id: string
          overall_score: number | null
          privacy_score: number | null
          robustness_score: number | null
          started_at: string | null
          status: Database["public"]["Enums"]["evaluation_status"]
          suite_id: string | null
          toxicity_score: number | null
          triggered_by: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          details?: Json | null
          engine_type?: string | null
          explanations?: Json | null
          factuality_score?: number | null
          fairness_score?: number | null
          id?: string
          metric_details?: Json | null
          model_id: string
          overall_score?: number | null
          privacy_score?: number | null
          robustness_score?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["evaluation_status"]
          suite_id?: string | null
          toxicity_score?: number | null
          triggered_by?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          details?: Json | null
          engine_type?: string | null
          explanations?: Json | null
          factuality_score?: number | null
          fairness_score?: number | null
          id?: string
          metric_details?: Json | null
          model_id?: string
          overall_score?: number | null
          privacy_score?: number | null
          robustness_score?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["evaluation_status"]
          suite_id?: string | null
          toxicity_score?: number | null
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_runs_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_runs_suite_id_fkey"
            columns: ["suite_id"]
            isOneToOne: false
            referencedRelation: "evaluation_suites"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_suites: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          test_count: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          test_count?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          test_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      incidents: {
        Row: {
          assignee_id: string | null
          created_at: string
          description: string | null
          id: string
          incident_type: string
          model_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: Database["public"]["Enums"]["severity_level"]
          status: Database["public"]["Enums"]["incident_status"]
          title: string
        }
        Insert: {
          assignee_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          incident_type: string
          model_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: Database["public"]["Enums"]["severity_level"]
          status?: Database["public"]["Enums"]["incident_status"]
          title: string
        }
        Update: {
          assignee_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          incident_type?: string
          model_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: Database["public"]["Enums"]["severity_level"]
          status?: Database["public"]["Enums"]["incident_status"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "incidents_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
      kg_edges: {
        Row: {
          created_at: string
          id: string
          properties: Json | null
          relationship_type: string
          source_node_id: string
          target_node_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          properties?: Json | null
          relationship_type: string
          source_node_id: string
          target_node_id: string
        }
        Update: {
          created_at?: string
          id?: string
          properties?: Json | null
          relationship_type?: string
          source_node_id?: string
          target_node_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kg_edges_source_node_id_fkey"
            columns: ["source_node_id"]
            isOneToOne: false
            referencedRelation: "kg_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kg_edges_target_node_id_fkey"
            columns: ["target_node_id"]
            isOneToOne: false
            referencedRelation: "kg_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      kg_nodes: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          label: string
          properties: Json | null
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          label: string
          properties?: Json | null
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          label?: string
          properties?: Json | null
        }
        Relationships: []
      }
      model_versions: {
        Row: {
          changelog: string | null
          created_at: string
          created_by: string | null
          id: string
          model_id: string
          version: string
        }
        Insert: {
          changelog?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          model_id: string
          version: string
        }
        Update: {
          changelog?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          model_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "model_versions_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
      models: {
        Row: {
          created_at: string
          description: string | null
          endpoint: string | null
          fairness_score: number | null
          huggingface_api_token: string | null
          huggingface_endpoint: string | null
          huggingface_model_id: string | null
          id: string
          metadata: Json | null
          model_type: string
          name: string
          overall_score: number | null
          owner_id: string | null
          privacy_score: number | null
          provider: string | null
          robustness_score: number | null
          status: Database["public"]["Enums"]["model_status"]
          toxicity_score: number | null
          updated_at: string
          use_case: string | null
          version: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          endpoint?: string | null
          fairness_score?: number | null
          huggingface_api_token?: string | null
          huggingface_endpoint?: string | null
          huggingface_model_id?: string | null
          id?: string
          metadata?: Json | null
          model_type: string
          name: string
          overall_score?: number | null
          owner_id?: string | null
          privacy_score?: number | null
          provider?: string | null
          robustness_score?: number | null
          status?: Database["public"]["Enums"]["model_status"]
          toxicity_score?: number | null
          updated_at?: string
          use_case?: string | null
          version?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          endpoint?: string | null
          fairness_score?: number | null
          huggingface_api_token?: string | null
          huggingface_endpoint?: string | null
          huggingface_model_id?: string | null
          id?: string
          metadata?: Json | null
          model_type?: string
          name?: string
          overall_score?: number | null
          owner_id?: string | null
          privacy_score?: number | null
          provider?: string | null
          robustness_score?: number | null
          status?: Database["public"]["Enums"]["model_status"]
          toxicity_score?: number | null
          updated_at?: string
          use_case?: string | null
          version?: string
        }
        Relationships: []
      }
      policy_packs: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          rules: Json | null
          status: Database["public"]["Enums"]["policy_status"]
          updated_at: string
          version: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          rules?: Json | null
          status?: Database["public"]["Enums"]["policy_status"]
          updated_at?: string
          version?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          rules?: Json | null
          status?: Database["public"]["Enums"]["policy_status"]
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      policy_violations: {
        Row: {
          blocked: boolean
          created_at: string
          details: Json | null
          id: string
          model_id: string
          policy_id: string | null
          severity: Database["public"]["Enums"]["severity_level"]
          violation_type: string
        }
        Insert: {
          blocked?: boolean
          created_at?: string
          details?: Json | null
          id?: string
          model_id: string
          policy_id?: string | null
          severity?: Database["public"]["Enums"]["severity_level"]
          violation_type: string
        }
        Update: {
          blocked?: boolean
          created_at?: string
          details?: Json | null
          id?: string
          model_id?: string
          policy_id?: string | null
          severity?: Database["public"]["Enums"]["severity_level"]
          violation_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "policy_violations_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_violations_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policy_packs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      red_team_campaigns: {
        Row: {
          attack_types: Json | null
          completed_at: string | null
          coverage: number | null
          created_at: string
          created_by: string | null
          description: string | null
          findings_count: number | null
          id: string
          model_id: string | null
          name: string
          status: Database["public"]["Enums"]["campaign_status"]
        }
        Insert: {
          attack_types?: Json | null
          completed_at?: string | null
          coverage?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          findings_count?: number | null
          id?: string
          model_id?: string | null
          name: string
          status?: Database["public"]["Enums"]["campaign_status"]
        }
        Update: {
          attack_types?: Json | null
          completed_at?: string | null
          coverage?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          findings_count?: number | null
          id?: string
          model_id?: string | null
          name?: string
          status?: Database["public"]["Enums"]["campaign_status"]
        }
        Relationships: [
          {
            foreignKeyName: "red_team_campaigns_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
      review_queue: {
        Row: {
          assignee_id: string | null
          context: Json | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          model_id: string | null
          review_type: string
          severity: Database["public"]["Enums"]["severity_level"]
          sla_deadline: string | null
          status: Database["public"]["Enums"]["review_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          context?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          model_id?: string | null
          review_type: string
          severity?: Database["public"]["Enums"]["severity_level"]
          sla_deadline?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          context?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          model_id?: string | null
          review_type?: string
          severity?: Database["public"]["Enums"]["severity_level"]
          sla_deadline?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_queue_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
      telemetry_logs: {
        Row: {
          avg_latency_ms: number | null
          error_rate: number | null
          id: string
          model_id: string
          p95_latency_ms: number | null
          p99_latency_ms: number | null
          request_count: number
          timestamp: string
        }
        Insert: {
          avg_latency_ms?: number | null
          error_rate?: number | null
          id?: string
          model_id: string
          p95_latency_ms?: number | null
          p99_latency_ms?: number | null
          request_count?: number
          timestamp?: string
        }
        Update: {
          avg_latency_ms?: number | null
          error_rate?: number | null
          id?: string
          model_id?: string
          p95_latency_ms?: number | null
          p99_latency_ms?: number | null
          request_count?: number
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "telemetry_logs_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
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
          role?: Database["public"]["Enums"]["app_role"]
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
      [_ in never]: never
    }
    Functions: {
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "reviewer" | "analyst" | "viewer"
      campaign_status: "draft" | "running" | "completed" | "paused"
      control_status:
        | "not_started"
        | "in_progress"
        | "compliant"
        | "non_compliant"
        | "not_applicable"
      evaluation_status: "pending" | "running" | "completed" | "failed"
      incident_status: "open" | "investigating" | "mitigating" | "resolved"
      model_status: "draft" | "active" | "deprecated" | "archived"
      policy_status: "draft" | "active" | "disabled"
      review_status:
        | "pending"
        | "in_progress"
        | "approved"
        | "rejected"
        | "escalated"
      severity_level: "low" | "medium" | "high" | "critical"
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
      app_role: ["admin", "reviewer", "analyst", "viewer"],
      campaign_status: ["draft", "running", "completed", "paused"],
      control_status: [
        "not_started",
        "in_progress",
        "compliant",
        "non_compliant",
        "not_applicable",
      ],
      evaluation_status: ["pending", "running", "completed", "failed"],
      incident_status: ["open", "investigating", "mitigating", "resolved"],
      model_status: ["draft", "active", "deprecated", "archived"],
      policy_status: ["draft", "active", "disabled"],
      review_status: [
        "pending",
        "in_progress",
        "approved",
        "rejected",
        "escalated",
      ],
      severity_level: ["low", "medium", "high", "critical"],
    },
  },
} as const
