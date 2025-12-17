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
      impact_assessments: {
        Row: {
          created_at: string
          created_by: string | null
          dimensions: Json
          id: string
          notes: string | null
          overall_score: number
          project_id: string
          quadrant: Database["public"]["Enums"]["impact_quadrant"]
          questionnaire_answers: Json
          summary: string | null
          system_id: string
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          dimensions?: Json
          id?: string
          notes?: string | null
          overall_score?: number
          project_id: string
          quadrant?: Database["public"]["Enums"]["impact_quadrant"]
          questionnaire_answers?: Json
          summary?: string | null
          system_id: string
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          dimensions?: Json
          id?: string
          notes?: string | null
          overall_score?: number
          project_id?: string
          quadrant?: Database["public"]["Enums"]["impact_quadrant"]
          questionnaire_answers?: Json
          summary?: string | null
          system_id?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "impact_assessments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impact_assessments_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "systems"
            referencedColumns: ["id"]
          },
        ]
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
          evidence: Json | null
          hash: string | null
          id: string
          properties: Json | null
          relationship_type: string
          source_node_id: string
          target_node_id: string
          valid_from: string | null
          valid_to: string | null
          weight: number | null
        }
        Insert: {
          created_at?: string
          evidence?: Json | null
          hash?: string | null
          id?: string
          properties?: Json | null
          relationship_type: string
          source_node_id: string
          target_node_id: string
          valid_from?: string | null
          valid_to?: string | null
          weight?: number | null
        }
        Update: {
          created_at?: string
          evidence?: Json | null
          hash?: string | null
          id?: string
          properties?: Json | null
          relationship_type?: string
          source_node_id?: string
          target_node_id?: string
          valid_from?: string | null
          valid_to?: string | null
          weight?: number | null
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
          hash: string | null
          id: string
          label: string
          metadata: Json | null
          properties: Json | null
          source: string | null
          status: string | null
          version: number | null
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          hash?: string | null
          id?: string
          label: string
          metadata?: Json | null
          properties?: Json | null
          source?: string | null
          status?: string | null
          version?: number | null
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          hash?: string | null
          id?: string
          label?: string
          metadata?: Json | null
          properties?: Json | null
          source?: string | null
          status?: string | null
          version?: number | null
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
          base_model: string | null
          business_owner_email: string | null
          created_at: string
          description: string | null
          endpoint: string | null
          fairness_score: number | null
          huggingface_api_token: string | null
          huggingface_endpoint: string | null
          huggingface_model_id: string | null
          id: string
          license: string | null
          metadata: Json | null
          model_card_url: string | null
          model_type: string
          name: string
          overall_score: number | null
          owner_id: string | null
          privacy_score: number | null
          project_id: string
          provider: string | null
          robustness_score: number | null
          status: Database["public"]["Enums"]["model_status"]
          system_id: string
          toxicity_score: number | null
          updated_at: string
          use_case: string | null
          version: string
        }
        Insert: {
          base_model?: string | null
          business_owner_email?: string | null
          created_at?: string
          description?: string | null
          endpoint?: string | null
          fairness_score?: number | null
          huggingface_api_token?: string | null
          huggingface_endpoint?: string | null
          huggingface_model_id?: string | null
          id?: string
          license?: string | null
          metadata?: Json | null
          model_card_url?: string | null
          model_type: string
          name: string
          overall_score?: number | null
          owner_id?: string | null
          privacy_score?: number | null
          project_id: string
          provider?: string | null
          robustness_score?: number | null
          status?: Database["public"]["Enums"]["model_status"]
          system_id: string
          toxicity_score?: number | null
          updated_at?: string
          use_case?: string | null
          version?: string
        }
        Update: {
          base_model?: string | null
          business_owner_email?: string | null
          created_at?: string
          description?: string | null
          endpoint?: string | null
          fairness_score?: number | null
          huggingface_api_token?: string | null
          huggingface_endpoint?: string | null
          huggingface_model_id?: string | null
          id?: string
          license?: string | null
          metadata?: Json | null
          model_card_url?: string | null
          model_type?: string
          name?: string
          overall_score?: number | null
          owner_id?: string | null
          privacy_score?: number | null
          project_id?: string
          provider?: string | null
          robustness_score?: number | null
          status?: Database["public"]["Enums"]["model_status"]
          system_id?: string
          toxicity_score?: number | null
          updated_at?: string
          use_case?: string | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "models_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "models_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "systems"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_channels: {
        Row: {
          channel_type: string
          config: Json
          created_at: string
          enabled: boolean
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          channel_type: string
          config?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          channel_type?: string
          config?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      organization_settings: {
        Row: {
          created_at: string
          data_retention_days: number | null
          default_workspace: string | null
          id: string
          organization_name: string | null
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data_retention_days?: number | null
          default_workspace?: string | null
          id?: string
          organization_name?: string | null
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data_retention_days?: number | null
          default_workspace?: string | null
          id?: string
          organization_name?: string | null
          timezone?: string | null
          updated_at?: string
          user_id?: string
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
      projects: {
        Row: {
          business_sensitivity: Database["public"]["Enums"]["sensitivity_level"]
          compliance_frameworks: string[] | null
          created_at: string
          criticality: number
          data_residency: string | null
          data_sensitivity: Database["public"]["Enums"]["sensitivity_level"]
          description: string | null
          environment: Database["public"]["Enums"]["environment_type"]
          id: string
          name: string
          organization: string | null
          owner_id: string | null
          primary_owner_email: string | null
          updated_at: string
        }
        Insert: {
          business_sensitivity?: Database["public"]["Enums"]["sensitivity_level"]
          compliance_frameworks?: string[] | null
          created_at?: string
          criticality?: number
          data_residency?: string | null
          data_sensitivity?: Database["public"]["Enums"]["sensitivity_level"]
          description?: string | null
          environment?: Database["public"]["Enums"]["environment_type"]
          id?: string
          name: string
          organization?: string | null
          owner_id?: string | null
          primary_owner_email?: string | null
          updated_at?: string
        }
        Update: {
          business_sensitivity?: Database["public"]["Enums"]["sensitivity_level"]
          compliance_frameworks?: string[] | null
          created_at?: string
          criticality?: number
          data_residency?: string | null
          data_sensitivity?: Database["public"]["Enums"]["sensitivity_level"]
          description?: string | null
          environment?: Database["public"]["Enums"]["environment_type"]
          id?: string
          name?: string
          organization?: string | null
          owner_id?: string | null
          primary_owner_email?: string | null
          updated_at?: string
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
      red_team_tests: {
        Row: {
          category: string
          created_at: string | null
          expected_behavior: string
          id: string
          is_active: boolean | null
          prompt: string
          severity: Database["public"]["Enums"]["severity_level"]
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          expected_behavior: string
          id?: string
          is_active?: boolean | null
          prompt: string
          severity?: Database["public"]["Enums"]["severity_level"]
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          expected_behavior?: string
          id?: string
          is_active?: boolean | null
          prompt?: string
          severity?: Database["public"]["Enums"]["severity_level"]
          updated_at?: string | null
        }
        Relationships: []
      }
      request_logs: {
        Row: {
          created_at: string
          decision: string | null
          engine_scores: Json | null
          environment: string | null
          error_message: string | null
          id: string
          latency_ms: number | null
          project_id: string | null
          request_body: Json | null
          response_body: Json | null
          status_code: number | null
          system_id: string
          trace_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          decision?: string | null
          engine_scores?: Json | null
          environment?: string | null
          error_message?: string | null
          id?: string
          latency_ms?: number | null
          project_id?: string | null
          request_body?: Json | null
          response_body?: Json | null
          status_code?: number | null
          system_id: string
          trace_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          decision?: string | null
          engine_scores?: Json | null
          environment?: string | null
          error_message?: string | null
          id?: string
          latency_ms?: number | null
          project_id?: string | null
          request_body?: Json | null
          response_body?: Json | null
          status_code?: number | null
          system_id?: string
          trace_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "request_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_logs_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "systems"
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
      risk_assessments: {
        Row: {
          created_at: string
          created_by: string | null
          dimension_scores: Json
          id: string
          notes: string | null
          project_id: string
          questionnaire_answers: Json
          risk_tier: Database["public"]["Enums"]["risk_tier"]
          runtime_risk_score: number
          static_risk_score: number
          summary: string | null
          system_id: string
          updated_at: string
          uri_score: number
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          dimension_scores?: Json
          id?: string
          notes?: string | null
          project_id: string
          questionnaire_answers?: Json
          risk_tier?: Database["public"]["Enums"]["risk_tier"]
          runtime_risk_score?: number
          static_risk_score?: number
          summary?: string | null
          system_id: string
          updated_at?: string
          uri_score?: number
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          dimension_scores?: Json
          id?: string
          notes?: string | null
          project_id?: string
          questionnaire_answers?: Json
          risk_tier?: Database["public"]["Enums"]["risk_tier"]
          runtime_risk_score?: number
          static_risk_score?: number
          summary?: string | null
          system_id?: string
          updated_at?: string
          uri_score?: number
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "risk_assessments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_assessments_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "systems"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_metrics: {
        Row: {
          id: string
          metric_name: string
          metric_value: number
          recorded_at: string
          system_id: string
          time_window: string | null
        }
        Insert: {
          id?: string
          metric_name: string
          metric_value: number
          recorded_at?: string
          system_id: string
          time_window?: string | null
        }
        Update: {
          id?: string
          metric_name?: string
          metric_value?: number
          recorded_at?: string
          system_id?: string
          time_window?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "risk_metrics_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "systems"
            referencedColumns: ["id"]
          },
        ]
      }
      system_approvals: {
        Row: {
          approved_at: string | null
          approver_id: string | null
          created_at: string
          id: string
          reason: string | null
          requested_by: string | null
          status: Database["public"]["Enums"]["approval_status"]
          system_id: string
        }
        Insert: {
          approved_at?: string | null
          approver_id?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          requested_by?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
          system_id: string
        }
        Update: {
          approved_at?: string | null
          approver_id?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          requested_by?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
          system_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_approvals_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "systems"
            referencedColumns: ["id"]
          },
        ]
      }
      system_documents: {
        Row: {
          content: string
          created_at: string | null
          document_type: string
          generated_by: string | null
          id: string
          system_id: string
          title: string
          version: number | null
        }
        Insert: {
          content: string
          created_at?: string | null
          document_type?: string
          generated_by?: string | null
          id?: string
          system_id: string
          title: string
          version?: number | null
        }
        Update: {
          content?: string
          created_at?: string | null
          document_type?: string
          generated_by?: string | null
          id?: string
          system_id?: string
          title?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "system_documents_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "systems"
            referencedColumns: ["id"]
          },
        ]
      }
      systems: {
        Row: {
          access_tier: string | null
          api_headers: Json | null
          api_token_encrypted: string | null
          base_model: string | null
          business_owner_email: string | null
          created_at: string
          data_residency: string | null
          deployment_status: Database["public"]["Enums"]["deployment_status"]
          endpoint: string | null
          id: string
          last_risk_calculation: string | null
          license: string | null
          model_card_url: string | null
          model_name: string | null
          name: string
          owner_id: string | null
          project_id: string
          provider: string
          requires_approval: boolean
          runtime_risk_score: number | null
          sla_tier: string | null
          status: Database["public"]["Enums"]["model_status"]
          system_type: Database["public"]["Enums"]["system_type"]
          technical_owner: string | null
          updated_at: string
          uri_score: number | null
          use_case: string | null
        }
        Insert: {
          access_tier?: string | null
          api_headers?: Json | null
          api_token_encrypted?: string | null
          base_model?: string | null
          business_owner_email?: string | null
          created_at?: string
          data_residency?: string | null
          deployment_status?: Database["public"]["Enums"]["deployment_status"]
          endpoint?: string | null
          id?: string
          last_risk_calculation?: string | null
          license?: string | null
          model_card_url?: string | null
          model_name?: string | null
          name: string
          owner_id?: string | null
          project_id: string
          provider: string
          requires_approval?: boolean
          runtime_risk_score?: number | null
          sla_tier?: string | null
          status?: Database["public"]["Enums"]["model_status"]
          system_type?: Database["public"]["Enums"]["system_type"]
          technical_owner?: string | null
          updated_at?: string
          uri_score?: number | null
          use_case?: string | null
        }
        Update: {
          access_tier?: string | null
          api_headers?: Json | null
          api_token_encrypted?: string | null
          base_model?: string | null
          business_owner_email?: string | null
          created_at?: string
          data_residency?: string | null
          deployment_status?: Database["public"]["Enums"]["deployment_status"]
          endpoint?: string | null
          id?: string
          last_risk_calculation?: string | null
          license?: string | null
          model_card_url?: string | null
          model_name?: string | null
          name?: string
          owner_id?: string | null
          project_id?: string
          provider?: string
          requires_approval?: boolean
          runtime_risk_score?: number | null
          sla_tier?: string | null
          status?: Database["public"]["Enums"]["model_status"]
          system_type?: Database["public"]["Enums"]["system_type"]
          technical_owner?: string | null
          updated_at?: string
          uri_score?: number | null
          use_case?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "systems_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
      user_provider_keys: {
        Row: {
          api_key_encrypted: string
          created_at: string
          id: string
          is_active: boolean
          provider: string
          updated_at: string
          user_id: string
        }
        Insert: {
          api_key_encrypted: string
          created_at?: string
          id?: string
          is_active?: boolean
          provider: string
          updated_at?: string
          user_id: string
        }
        Update: {
          api_key_encrypted?: string
          created_at?: string
          id?: string
          is_active?: boolean
          provider?: string
          updated_at?: string
          user_id?: string
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
      approval_status: "pending" | "approved" | "rejected"
      campaign_status: "draft" | "running" | "completed" | "paused"
      control_status:
        | "not_started"
        | "in_progress"
        | "compliant"
        | "non_compliant"
        | "not_applicable"
      deployment_status:
        | "draft"
        | "ready_for_review"
        | "pending_approval"
        | "approved"
        | "blocked"
        | "deployed"
      environment_type: "development" | "staging" | "production"
      evaluation_status: "pending" | "running" | "completed" | "failed"
      impact_quadrant:
        | "low_low"
        | "low_medium"
        | "low_high"
        | "medium_low"
        | "medium_medium"
        | "medium_high"
        | "high_low"
        | "high_medium"
        | "high_high"
        | "critical_critical"
      incident_status: "open" | "investigating" | "mitigating" | "resolved"
      kg_entity_type:
        | "model"
        | "dataset"
        | "feature"
        | "evaluation"
        | "control"
        | "risk"
        | "incident"
        | "decision"
        | "deployment"
        | "outcome"
      kg_relationship:
        | "uses"
        | "derived_from"
        | "violates"
        | "satisfies"
        | "monitored_by"
        | "approved_by"
        | "feeds_into"
        | "trains"
        | "evaluated_by"
        | "governed_by"
        | "deployed_to"
        | "triggers"
      model_status: "draft" | "active" | "deprecated" | "archived"
      policy_status: "draft" | "active" | "disabled"
      review_status:
        | "pending"
        | "in_progress"
        | "approved"
        | "rejected"
        | "escalated"
      risk_tier: "low" | "medium" | "high" | "critical"
      sensitivity_level: "low" | "medium" | "high" | "critical"
      severity_level: "low" | "medium" | "high" | "critical"
      system_type: "model" | "agent" | "provider" | "pipeline"
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
      approval_status: ["pending", "approved", "rejected"],
      campaign_status: ["draft", "running", "completed", "paused"],
      control_status: [
        "not_started",
        "in_progress",
        "compliant",
        "non_compliant",
        "not_applicable",
      ],
      deployment_status: [
        "draft",
        "ready_for_review",
        "pending_approval",
        "approved",
        "blocked",
        "deployed",
      ],
      environment_type: ["development", "staging", "production"],
      evaluation_status: ["pending", "running", "completed", "failed"],
      impact_quadrant: [
        "low_low",
        "low_medium",
        "low_high",
        "medium_low",
        "medium_medium",
        "medium_high",
        "high_low",
        "high_medium",
        "high_high",
        "critical_critical",
      ],
      incident_status: ["open", "investigating", "mitigating", "resolved"],
      kg_entity_type: [
        "model",
        "dataset",
        "feature",
        "evaluation",
        "control",
        "risk",
        "incident",
        "decision",
        "deployment",
        "outcome",
      ],
      kg_relationship: [
        "uses",
        "derived_from",
        "violates",
        "satisfies",
        "monitored_by",
        "approved_by",
        "feeds_into",
        "trains",
        "evaluated_by",
        "governed_by",
        "deployed_to",
        "triggers",
      ],
      model_status: ["draft", "active", "deprecated", "archived"],
      policy_status: ["draft", "active", "disabled"],
      review_status: [
        "pending",
        "in_progress",
        "approved",
        "rejected",
        "escalated",
      ],
      risk_tier: ["low", "medium", "high", "critical"],
      sensitivity_level: ["low", "medium", "high", "critical"],
      severity_level: ["low", "medium", "high", "critical"],
      system_type: ["model", "agent", "provider", "pipeline"],
    },
  },
} as const
