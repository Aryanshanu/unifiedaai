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
      admin_audit_log: {
        Row: {
          action_type: string
          change_summary: string | null
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          performed_at: string
          performed_by: string | null
          previous_hash: string | null
          record_hash: string | null
          record_id: string | null
          session_id: string | null
          table_name: string
          user_agent: string | null
        }
        Insert: {
          action_type: string
          change_summary?: string | null
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          performed_at?: string
          performed_by?: string | null
          previous_hash?: string | null
          record_hash?: string | null
          record_id?: string | null
          session_id?: string | null
          table_name: string
          user_agent?: string | null
        }
        Update: {
          action_type?: string
          change_summary?: string | null
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          performed_at?: string
          performed_by?: string | null
          previous_hash?: string | null
          record_hash?: string | null
          record_id?: string | null
          session_id?: string | null
          table_name?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      app_errors: {
        Row: {
          component_name: string | null
          created_at: string
          error_message: string
          error_stack: string | null
          error_type: string
          id: string
          metadata: Json | null
          page_url: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          component_name?: string | null
          created_at?: string
          error_message: string
          error_stack?: string | null
          error_type: string
          id?: string
          metadata?: Json | null
          page_url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          component_name?: string | null
          created_at?: string
          error_message?: string
          error_stack?: string | null
          error_type?: string
          id?: string
          metadata?: Json | null
          page_url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
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
      audit_report_ledger: {
        Row: {
          content_hash: string
          created_at: string | null
          file_size_bytes: number | null
          generated_at: string
          generated_by: string | null
          id: string
          metadata: Json | null
          pdf_hash: string | null
          previous_hash: string | null
          record_hash: string | null
          report_id: string
          report_period_end: string | null
          report_period_start: string | null
          report_type: string
          storage_bucket: string
          storage_path: string
          verification_status: string | null
          verified_at: string | null
        }
        Insert: {
          content_hash: string
          created_at?: string | null
          file_size_bytes?: number | null
          generated_at: string
          generated_by?: string | null
          id?: string
          metadata?: Json | null
          pdf_hash?: string | null
          previous_hash?: string | null
          record_hash?: string | null
          report_id: string
          report_period_end?: string | null
          report_period_start?: string | null
          report_type?: string
          storage_bucket?: string
          storage_path: string
          verification_status?: string | null
          verified_at?: string | null
        }
        Update: {
          content_hash?: string
          created_at?: string | null
          file_size_bytes?: number | null
          generated_at?: string
          generated_by?: string | null
          id?: string
          metadata?: Json | null
          pdf_hash?: string | null
          previous_hash?: string | null
          record_hash?: string | null
          report_id?: string
          report_period_end?: string | null
          report_period_start?: string | null
          report_type?: string
          storage_bucket?: string
          storage_path?: string
          verification_status?: string | null
          verified_at?: string | null
        }
        Relationships: []
      }
      bronze_data: {
        Row: {
          created_at: string | null
          id: string
          raw_data: Json
          record_hash: string | null
          row_index: number
          upload_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          raw_data: Json
          record_hash?: string | null
          row_index: number
          upload_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          raw_data?: Json
          record_hash?: string | null
          row_index?: number
          upload_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bronze_data_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "data_uploads"
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
      data_contract_violations: {
        Row: {
          auto_actions_taken: Json | null
          contract_id: string
          created_at: string
          dataset_id: string
          id: string
          impacted_models: string[] | null
          quality_run_id: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          status: string
          violation_details: Json
          violation_type: string
        }
        Insert: {
          auto_actions_taken?: Json | null
          contract_id: string
          created_at?: string
          dataset_id: string
          id?: string
          impacted_models?: string[] | null
          quality_run_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          status?: string
          violation_details?: Json
          violation_type: string
        }
        Update: {
          auto_actions_taken?: Json | null
          contract_id?: string
          created_at?: string
          dataset_id?: string
          id?: string
          impacted_models?: string[] | null
          quality_run_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          violation_details?: Json
          violation_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_contract_violations_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "data_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_contract_violations_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "datasets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_contract_violations_quality_run_id_fkey"
            columns: ["quality_run_id"]
            isOneToOne: false
            referencedRelation: "dataset_quality_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      data_contracts: {
        Row: {
          created_at: string
          created_by: string | null
          dataset_id: string
          distribution_expectations: Json | null
          enforcement_mode: string
          freshness_sla_hours: number | null
          id: string
          name: string
          pii_guarantees: Json | null
          quality_thresholds: Json | null
          schema_expectations: Json
          status: string
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          dataset_id: string
          distribution_expectations?: Json | null
          enforcement_mode?: string
          freshness_sla_hours?: number | null
          id?: string
          name: string
          pii_guarantees?: Json | null
          quality_thresholds?: Json | null
          schema_expectations?: Json
          status?: string
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          dataset_id?: string
          distribution_expectations?: Json | null
          enforcement_mode?: string
          freshness_sla_hours?: number | null
          id?: string
          name?: string
          pii_guarantees?: Json | null
          quality_thresholds?: Json | null
          schema_expectations?: Json
          status?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "data_contracts_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "datasets"
            referencedColumns: ["id"]
          },
        ]
      }
      data_drift_events: {
        Row: {
          baseline_value: Json
          current_value: Json
          dataset_id: string
          detected_at: string
          drift_metric: string
          drift_score: number | null
          drift_type: string
          feature: string
          id: string
          impacted_models: string[] | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          status: string
          threshold: number | null
        }
        Insert: {
          baseline_value: Json
          current_value: Json
          dataset_id: string
          detected_at?: string
          drift_metric: string
          drift_score?: number | null
          drift_type: string
          feature: string
          id?: string
          impacted_models?: string[] | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          status?: string
          threshold?: number | null
        }
        Update: {
          baseline_value?: Json
          current_value?: Json
          dataset_id?: string
          detected_at?: string
          drift_metric?: string
          drift_score?: number | null
          drift_type?: string
          feature?: string
          id?: string
          impacted_models?: string[] | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          threshold?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "data_drift_events_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "datasets"
            referencedColumns: ["id"]
          },
        ]
      }
      data_uploads: {
        Row: {
          analysis_details: Json | null
          completed_at: string | null
          contract_check_status: string | null
          contract_id: string | null
          contract_violations: Json | null
          created_at: string | null
          error_message: string | null
          file_name: string
          file_path: string
          file_size_bytes: number | null
          file_type: string | null
          file_url: string | null
          id: string
          metadata: Json | null
          parsed_column_count: number | null
          parsed_row_count: number | null
          processing_time_ms: number | null
          quality_score: number | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          analysis_details?: Json | null
          completed_at?: string | null
          contract_check_status?: string | null
          contract_id?: string | null
          contract_violations?: Json | null
          created_at?: string | null
          error_message?: string | null
          file_name: string
          file_path: string
          file_size_bytes?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          metadata?: Json | null
          parsed_column_count?: number | null
          parsed_row_count?: number | null
          processing_time_ms?: number | null
          quality_score?: number | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          analysis_details?: Json | null
          completed_at?: string | null
          contract_check_status?: string | null
          contract_id?: string | null
          contract_violations?: Json | null
          created_at?: string | null
          error_message?: string | null
          file_name?: string
          file_path?: string
          file_size_bytes?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          metadata?: Json | null
          parsed_column_count?: number | null
          parsed_row_count?: number | null
          processing_time_ms?: number | null
          quality_score?: number | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "data_uploads_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "data_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      dataset_lineage_edges: {
        Row: {
          created_at: string
          created_by: string | null
          dataset_hash: string
          id: string
          properties: Json | null
          relationship_type: string
          source_dataset_id: string
          target_entity_id: string
          target_entity_type: string
          transformation_hash: string | null
          valid_from: string
          valid_to: string | null
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          dataset_hash: string
          id?: string
          properties?: Json | null
          relationship_type: string
          source_dataset_id: string
          target_entity_id: string
          target_entity_type: string
          transformation_hash?: string | null
          valid_from?: string
          valid_to?: string | null
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          dataset_hash?: string
          id?: string
          properties?: Json | null
          relationship_type?: string
          source_dataset_id?: string
          target_entity_id?: string
          target_entity_type?: string
          transformation_hash?: string | null
          valid_from?: string
          valid_to?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "dataset_lineage_edges_source_dataset_id_fkey"
            columns: ["source_dataset_id"]
            isOneToOne: false
            referencedRelation: "datasets"
            referencedColumns: ["id"]
          },
        ]
      }
      dataset_quality_runs: {
        Row: {
          completeness_score: number | null
          created_at: string
          created_by: string | null
          dataset_id: string
          distribution_skew: Json | null
          evidence_hash: string | null
          freshness_score: number | null
          id: string
          metric_details: Json | null
          overall_score: number | null
          previous_hash: string | null
          record_hash: string | null
          run_type: string
          sensitive_attribute_balance: Json | null
          uniqueness_score: number | null
          validity_score: number | null
          verdict: string
        }
        Insert: {
          completeness_score?: number | null
          created_at?: string
          created_by?: string | null
          dataset_id: string
          distribution_skew?: Json | null
          evidence_hash?: string | null
          freshness_score?: number | null
          id?: string
          metric_details?: Json | null
          overall_score?: number | null
          previous_hash?: string | null
          record_hash?: string | null
          run_type: string
          sensitive_attribute_balance?: Json | null
          uniqueness_score?: number | null
          validity_score?: number | null
          verdict: string
        }
        Update: {
          completeness_score?: number | null
          created_at?: string
          created_by?: string | null
          dataset_id?: string
          distribution_skew?: Json | null
          evidence_hash?: string | null
          freshness_score?: number | null
          id?: string
          metric_details?: Json | null
          overall_score?: number | null
          previous_hash?: string | null
          record_hash?: string | null
          run_type?: string
          sensitive_attribute_balance?: Json | null
          uniqueness_score?: number | null
          validity_score?: number | null
          verdict?: string
        }
        Relationships: [
          {
            foreignKeyName: "dataset_quality_runs_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "datasets"
            referencedColumns: ["id"]
          },
        ]
      }
      datasets: {
        Row: {
          consent_status: string
          created_at: string
          data_types: string[] | null
          description: string | null
          environment: string | null
          id: string
          jurisdiction: string[] | null
          name: string
          owner_id: string | null
          retention_days: number | null
          row_count: number | null
          sensitivity_level: string | null
          source: string
          source_url: string | null
          updated_at: string
        }
        Insert: {
          consent_status?: string
          created_at?: string
          data_types?: string[] | null
          description?: string | null
          environment?: string | null
          id?: string
          jurisdiction?: string[] | null
          name: string
          owner_id?: string | null
          retention_days?: number | null
          row_count?: number | null
          sensitivity_level?: string | null
          source: string
          source_url?: string | null
          updated_at?: string
        }
        Update: {
          consent_status?: string
          created_at?: string
          data_types?: string[] | null
          description?: string | null
          environment?: string | null
          id?: string
          jurisdiction?: string[] | null
          name?: string
          owner_id?: string | null
          retention_days?: number | null
          row_count?: number | null
          sensitivity_level?: string | null
          source?: string
          source_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      decision_appeals: {
        Row: {
          appeal_category: string
          appeal_reason: string
          appellant_reference: string
          assigned_to: string | null
          created_at: string
          decision_id: string
          final_decision: string | null
          id: string
          resolved_at: string | null
          review_notes: string | null
          sla_deadline: string | null
          status: string
          updated_at: string
        }
        Insert: {
          appeal_category: string
          appeal_reason: string
          appellant_reference: string
          assigned_to?: string | null
          created_at?: string
          decision_id: string
          final_decision?: string | null
          id?: string
          resolved_at?: string | null
          review_notes?: string | null
          sla_deadline?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          appeal_category?: string
          appeal_reason?: string
          appellant_reference?: string
          assigned_to?: string | null
          created_at?: string
          decision_id?: string
          final_decision?: string | null
          id?: string
          resolved_at?: string | null
          review_notes?: string | null
          sla_deadline?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "decision_appeals_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "decision_ledger"
            referencedColumns: ["id"]
          },
        ]
      }
      decision_explanations: {
        Row: {
          counterfactual: Json | null
          created_at: string
          decision_id: string
          explanation_type: string
          feature_influences: Json | null
          generation_method: string | null
          id: string
          natural_language: string | null
        }
        Insert: {
          counterfactual?: Json | null
          created_at?: string
          decision_id: string
          explanation_type: string
          feature_influences?: Json | null
          generation_method?: string | null
          id?: string
          natural_language?: string | null
        }
        Update: {
          counterfactual?: Json | null
          created_at?: string
          decision_id?: string
          explanation_type?: string
          feature_influences?: Json | null
          generation_method?: string | null
          id?: string
          natural_language?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "decision_explanations_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "decision_ledger"
            referencedColumns: ["id"]
          },
        ]
      }
      decision_ledger: {
        Row: {
          confidence: number | null
          context: Json | null
          created_at: string
          decision_ref: string
          decision_timestamp: string
          decision_value: string
          demographic_context: Json | null
          id: string
          input_hash: string
          model_id: string
          model_version: string
          output_hash: string
          previous_hash: string | null
          record_hash: string
        }
        Insert: {
          confidence?: number | null
          context?: Json | null
          created_at?: string
          decision_ref: string
          decision_timestamp: string
          decision_value: string
          demographic_context?: Json | null
          id?: string
          input_hash: string
          model_id: string
          model_version: string
          output_hash: string
          previous_hash?: string | null
          record_hash: string
        }
        Update: {
          confidence?: number | null
          context?: Json | null
          created_at?: string
          decision_ref?: string
          decision_timestamp?: string
          decision_value?: string
          demographic_context?: Json | null
          id?: string
          input_hash?: string
          model_id?: string
          model_version?: string
          output_hash?: string
          previous_hash?: string | null
          record_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "decision_ledger_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
      decision_outcomes: {
        Row: {
          created_at: string
          decision_id: string
          detected_at: string | null
          harm_category: string | null
          harm_severity: string | null
          id: string
          outcome_details: Json | null
          outcome_type: string
          remediation_taken: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          decision_id: string
          detected_at?: string | null
          harm_category?: string | null
          harm_severity?: string | null
          id?: string
          outcome_details?: Json | null
          outcome_type: string
          remediation_taken?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          decision_id?: string
          detected_at?: string | null
          harm_category?: string | null
          harm_severity?: string | null
          id?: string
          outcome_details?: Json | null
          outcome_type?: string
          remediation_taken?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "decision_outcomes_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "decision_ledger"
            referencedColumns: ["id"]
          },
        ]
      }
      decision_overrides: {
        Row: {
          appeal_id: string | null
          authorization_level: string
          authorized_by: string
          created_at: string
          decision_id: string
          evidence_hash: string | null
          id: string
          new_decision: string
          original_decision: string
          override_reason: string
          previous_hash: string | null
          record_hash: string | null
        }
        Insert: {
          appeal_id?: string | null
          authorization_level: string
          authorized_by: string
          created_at?: string
          decision_id: string
          evidence_hash?: string | null
          id?: string
          new_decision: string
          original_decision: string
          override_reason: string
          previous_hash?: string | null
          record_hash?: string | null
        }
        Update: {
          appeal_id?: string | null
          authorization_level?: string
          authorized_by?: string
          created_at?: string
          decision_id?: string
          evidence_hash?: string | null
          id?: string
          new_decision?: string
          original_decision?: string
          override_reason?: string
          previous_hash?: string | null
          record_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "decision_overrides_appeal_id_fkey"
            columns: ["appeal_id"]
            isOneToOne: false
            referencedRelation: "decision_appeals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decision_overrides_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "decision_ledger"
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
      deployment_attestations: {
        Row: {
          approved_artifact_hash: string | null
          artifact_hash: string
          attestation_bundle: Json | null
          bypass_authorized_by: string | null
          bypass_reason: string | null
          commit_sha: string
          created_at: string
          deployment_id: string
          hash_match: boolean | null
          id: string
          model_id: string
          signature: string | null
          slsa_level: number | null
          system_id: string
          verification_status: string
          verified_at: string | null
        }
        Insert: {
          approved_artifact_hash?: string | null
          artifact_hash: string
          attestation_bundle?: Json | null
          bypass_authorized_by?: string | null
          bypass_reason?: string | null
          commit_sha: string
          created_at?: string
          deployment_id: string
          hash_match?: boolean | null
          id?: string
          model_id: string
          signature?: string | null
          slsa_level?: number | null
          system_id: string
          verification_status?: string
          verified_at?: string | null
        }
        Update: {
          approved_artifact_hash?: string | null
          artifact_hash?: string
          attestation_bundle?: Json | null
          bypass_authorized_by?: string | null
          bypass_reason?: string | null
          commit_sha?: string
          created_at?: string
          deployment_id?: string
          hash_match?: boolean | null
          id?: string
          model_id?: string
          signature?: string | null
          slsa_level?: number | null
          system_id?: string
          verification_status?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deployment_attestations_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deployment_attestations_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "systems"
            referencedColumns: ["id"]
          },
        ]
      }
      dq_dashboard_assets: {
        Row: {
          dataset_id: string
          dimension_breakdown_sql: string
          execution_id: string
          generated_at: string | null
          hotspots_sql: string
          id: string
          summary_sql: string
        }
        Insert: {
          dataset_id: string
          dimension_breakdown_sql: string
          execution_id: string
          generated_at?: string | null
          hotspots_sql: string
          id?: string
          summary_sql: string
        }
        Update: {
          dataset_id?: string
          dimension_breakdown_sql?: string
          execution_id?: string
          generated_at?: string | null
          hotspots_sql?: string
          id?: string
          summary_sql?: string
        }
        Relationships: [
          {
            foreignKeyName: "dq_dashboard_assets_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "datasets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dq_dashboard_assets_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "dq_rule_executions"
            referencedColumns: ["id"]
          },
        ]
      }
      dq_incidents: {
        Row: {
          action: string
          created_at: string | null
          dataset_id: string
          dimension: string
          example_failed_rows: Json | null
          execution_id: string | null
          failure_signature: string | null
          id: string
          profiling_reference: string | null
          resolved_at: string | null
          resolved_by: string | null
          rule_id: string | null
          severity: string
          status: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          dataset_id: string
          dimension: string
          example_failed_rows?: Json | null
          execution_id?: string | null
          failure_signature?: string | null
          id?: string
          profiling_reference?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          rule_id?: string | null
          severity: string
          status?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          dataset_id?: string
          dimension?: string
          example_failed_rows?: Json | null
          execution_id?: string | null
          failure_signature?: string | null
          id?: string
          profiling_reference?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          rule_id?: string | null
          severity?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dq_incidents_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "datasets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dq_incidents_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "dq_rule_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dq_incidents_profiling_reference_fkey"
            columns: ["profiling_reference"]
            isOneToOne: false
            referencedRelation: "dq_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dq_incidents_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "dq_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      dq_profiles: {
        Row: {
          column_profiles: Json
          created_at: string | null
          created_by: string | null
          dataset_id: string
          dataset_version: string | null
          execution_time_ms: number | null
          id: string
          profile_ts: string
          record_hash: string | null
          row_count: number
        }
        Insert: {
          column_profiles?: Json
          created_at?: string | null
          created_by?: string | null
          dataset_id: string
          dataset_version?: string | null
          execution_time_ms?: number | null
          id?: string
          profile_ts?: string
          record_hash?: string | null
          row_count: number
        }
        Update: {
          column_profiles?: Json
          created_at?: string | null
          created_by?: string | null
          dataset_id?: string
          dataset_version?: string | null
          execution_time_ms?: number | null
          id?: string
          profile_ts?: string
          record_hash?: string | null
          row_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "dq_profiles_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "datasets"
            referencedColumns: ["id"]
          },
        ]
      }
      dq_rule_executions: {
        Row: {
          circuit_breaker_tripped: boolean | null
          created_by: string | null
          dataset_id: string
          execution_mode: string
          execution_time_ms: number | null
          execution_ts: string | null
          id: string
          metrics: Json
          previous_hash: string | null
          profile_id: string | null
          record_hash: string | null
          rules_version: number
          summary: Json
        }
        Insert: {
          circuit_breaker_tripped?: boolean | null
          created_by?: string | null
          dataset_id: string
          execution_mode: string
          execution_time_ms?: number | null
          execution_ts?: string | null
          id?: string
          metrics?: Json
          previous_hash?: string | null
          profile_id?: string | null
          record_hash?: string | null
          rules_version: number
          summary?: Json
        }
        Update: {
          circuit_breaker_tripped?: boolean | null
          created_by?: string | null
          dataset_id?: string
          execution_mode?: string
          execution_time_ms?: number | null
          execution_ts?: string | null
          id?: string
          metrics?: Json
          previous_hash?: string | null
          profile_id?: string | null
          record_hash?: string | null
          rules_version?: number
          summary?: Json
        }
        Relationships: [
          {
            foreignKeyName: "dq_rule_executions_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "datasets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dq_rule_executions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "dq_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      dq_rules: {
        Row: {
          business_impact: string | null
          calibration_metadata: Json | null
          column_name: string | null
          confidence: number | null
          created_at: string | null
          dataset_id: string
          dimension: string
          id: string
          is_active: boolean | null
          logic_code: string
          logic_type: string
          profile_id: string | null
          rule_name: string
          severity: string
          threshold: number
          updated_at: string | null
          version: number
        }
        Insert: {
          business_impact?: string | null
          calibration_metadata?: Json | null
          column_name?: string | null
          confidence?: number | null
          created_at?: string | null
          dataset_id: string
          dimension: string
          id?: string
          is_active?: boolean | null
          logic_code: string
          logic_type: string
          profile_id?: string | null
          rule_name: string
          severity: string
          threshold: number
          updated_at?: string | null
          version?: number
        }
        Update: {
          business_impact?: string | null
          calibration_metadata?: Json | null
          column_name?: string | null
          confidence?: number | null
          created_at?: string | null
          dataset_id?: string
          dimension?: string
          id?: string
          is_active?: boolean | null
          logic_code?: string
          logic_type?: string
          profile_id?: string | null
          rule_name?: string
          severity?: string
          threshold?: number
          updated_at?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "dq_rules_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "datasets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dq_rules_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "dq_profiles"
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
      evaluation_requirements: {
        Row: {
          created_at: string
          engine_type: string
          id: string
          is_blocking: boolean
          min_score: number
          system_id: string
        }
        Insert: {
          created_at?: string
          engine_type: string
          id?: string
          is_blocking?: boolean
          min_score?: number
          system_id: string
        }
        Update: {
          created_at?: string
          engine_type?: string
          id?: string
          is_blocking?: boolean
          min_score?: number
          system_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_requirements_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "systems"
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
          fail_closed: boolean | null
          failed_reason: string | null
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
          fail_closed?: boolean | null
          failed_reason?: string | null
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
          fail_closed?: boolean | null
          failed_reason?: string | null
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
      gateway_config: {
        Row: {
          config_key: string
          config_value: Json
          description: string | null
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          config_key: string
          config_value?: Json
          description?: string | null
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          config_key?: string
          config_value?: Json
          description?: string | null
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      gold_quality_metrics: {
        Row: {
          bias_score: number | null
          completeness_score: number | null
          created_at: string | null
          files_processed: number | null
          freshness_score: number | null
          id: string
          issue_count: number | null
          metric_date: string
          overall_score: number | null
          remediation_count: number | null
          trust_grade: string | null
          uniqueness_score: number | null
          upload_id: string | null
          user_id: string | null
          validity_score: number | null
        }
        Insert: {
          bias_score?: number | null
          completeness_score?: number | null
          created_at?: string | null
          files_processed?: number | null
          freshness_score?: number | null
          id?: string
          issue_count?: number | null
          metric_date: string
          overall_score?: number | null
          remediation_count?: number | null
          trust_grade?: string | null
          uniqueness_score?: number | null
          upload_id?: string | null
          user_id?: string | null
          validity_score?: number | null
        }
        Update: {
          bias_score?: number | null
          completeness_score?: number | null
          created_at?: string | null
          files_processed?: number | null
          freshness_score?: number | null
          id?: string
          issue_count?: number | null
          metric_date?: string
          overall_score?: number | null
          remediation_count?: number | null
          trust_grade?: string | null
          uniqueness_score?: number | null
          upload_id?: string | null
          user_id?: string | null
          validity_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "gold_quality_metrics_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "data_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      governance_activation_state: {
        Row: {
          activated_at: string | null
          activated_by: string | null
          capability: string
          created_at: string | null
          id: string
          notes: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          activated_at?: string | null
          activated_by?: string | null
          capability: string
          created_at?: string | null
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          activated_at?: string | null
          activated_by?: string | null
          capability?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      harm_taxonomy: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          regulatory_references: string[] | null
          remediation_guidelines: string | null
          severity_levels: Json
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          regulatory_references?: string[] | null
          remediation_guidelines?: string | null
          severity_levels?: Json
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          regulatory_references?: string[] | null
          remediation_guidelines?: string | null
          severity_levels?: Json
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
          archived_at: string | null
          archived_by: string | null
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
          archived_at?: string | null
          archived_by?: string | null
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
          archived_at?: string | null
          archived_by?: string | null
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
          embedding: string | null
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
          embedding?: string | null
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
          embedding?: string | null
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
      mlops_governance_events: {
        Row: {
          actor_id: string | null
          event_details: Json
          event_type: string
          governance_decision: string
          id: string
          model_id: string | null
          recorded_at: string
          system_id: string | null
          violations: string[] | null
        }
        Insert: {
          actor_id?: string | null
          event_details?: Json
          event_type: string
          governance_decision: string
          id?: string
          model_id?: string | null
          recorded_at?: string
          system_id?: string | null
          violations?: string[] | null
        }
        Update: {
          actor_id?: string | null
          event_details?: Json
          event_type?: string
          governance_decision?: string
          id?: string
          model_id?: string | null
          recorded_at?: string
          system_id?: string | null
          violations?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "mlops_governance_events_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mlops_governance_events_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "systems"
            referencedColumns: ["id"]
          },
        ]
      }
      model_datasets: {
        Row: {
          created_at: string
          dataset_id: string
          id: string
          model_id: string
          usage_type: string
        }
        Insert: {
          created_at?: string
          dataset_id: string
          id?: string
          model_id: string
          usage_type: string
        }
        Update: {
          created_at?: string
          dataset_id?: string
          id?: string
          model_id?: string
          usage_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "model_datasets_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "datasets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "model_datasets_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
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
      notification_history: {
        Row: {
          channel_id: string | null
          created_at: string | null
          delivered_at: string | null
          delivery_status: string
          error_message: string | null
          failed_at: string | null
          id: string
          message: string
          metadata: Json | null
          notification_type: string
          provider: string | null
          provider_message_id: string | null
          provider_response: Json | null
          recipient: string
          retry_count: number | null
          sent_at: string | null
          severity: string | null
          title: string
        }
        Insert: {
          channel_id?: string | null
          created_at?: string | null
          delivered_at?: string | null
          delivery_status?: string
          error_message?: string | null
          failed_at?: string | null
          id?: string
          message: string
          metadata?: Json | null
          notification_type: string
          provider?: string | null
          provider_message_id?: string | null
          provider_response?: Json | null
          recipient: string
          retry_count?: number | null
          sent_at?: string | null
          severity?: string | null
          title: string
        }
        Update: {
          channel_id?: string | null
          created_at?: string | null
          delivered_at?: string | null
          delivery_status?: string
          error_message?: string | null
          failed_at?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          notification_type?: string
          provider?: string | null
          provider_message_id?: string | null
          provider_response?: Json | null
          recipient?: string
          retry_count?: number | null
          sent_at?: string | null
          severity?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_history_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "notification_channels"
            referencedColumns: ["id"]
          },
        ]
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
      population_impact_metrics: {
        Row: {
          created_at: string
          group_value: string
          id: string
          is_compliant: boolean | null
          measurement_period_end: string
          measurement_period_start: string
          metric_type: string
          metric_value: number | null
          model_id: string
          protected_attribute: string
          sample_size: number | null
          threshold: number | null
        }
        Insert: {
          created_at?: string
          group_value: string
          id?: string
          is_compliant?: boolean | null
          measurement_period_end: string
          measurement_period_start: string
          metric_type: string
          metric_value?: number | null
          model_id: string
          protected_attribute: string
          sample_size?: number | null
          threshold?: number | null
        }
        Update: {
          created_at?: string
          group_value?: string
          id?: string
          is_compliant?: boolean | null
          measurement_period_end?: string
          measurement_period_start?: string
          metric_type?: string
          metric_value?: number | null
          model_id?: string
          protected_attribute?: string
          sample_size?: number | null
          threshold?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "population_impact_metrics_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
      processing_queue: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          result: Json | null
          stage: string
          started_at: string | null
          status: string | null
          upload_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          result?: Json | null
          stage: string
          started_at?: string | null
          status?: string | null
          upload_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          result?: Json | null
          stage?: string
          started_at?: string | null
          status?: string | null
          upload_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "processing_queue_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "data_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          demographics: Json | null
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          demographics?: Json | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          demographics?: Json | null
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
      quality_issues: {
        Row: {
          column_name: string | null
          created_at: string | null
          dataset_id: string | null
          description: string
          id: string
          issue_type: string
          resolved_at: string | null
          resolved_by: string | null
          row_reference: number | null
          severity: string | null
          status: string | null
          suggested_fix: string | null
          upload_id: string | null
          value_sample: string | null
        }
        Insert: {
          column_name?: string | null
          created_at?: string | null
          dataset_id?: string | null
          description: string
          id?: string
          issue_type: string
          resolved_at?: string | null
          resolved_by?: string | null
          row_reference?: number | null
          severity?: string | null
          status?: string | null
          suggested_fix?: string | null
          upload_id?: string | null
          value_sample?: string | null
        }
        Update: {
          column_name?: string | null
          created_at?: string | null
          dataset_id?: string | null
          description?: string
          id?: string
          issue_type?: string
          resolved_at?: string | null
          resolved_by?: string | null
          row_reference?: number | null
          severity?: string | null
          status?: string | null
          suggested_fix?: string | null
          upload_id?: string | null
          value_sample?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quality_issues_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "datasets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quality_issues_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "data_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      rai_composite_scores: {
        Row: {
          composite_score: number
          created_at: string | null
          domain: string | null
          evaluated_at: string | null
          explainability_score: number | null
          fairness_score: number | null
          hallucination_score: number | null
          id: string
          is_compliant: boolean | null
          model_id: string | null
          privacy_score: number | null
          toxicity_score: number | null
        }
        Insert: {
          composite_score: number
          created_at?: string | null
          domain?: string | null
          evaluated_at?: string | null
          explainability_score?: number | null
          fairness_score?: number | null
          hallucination_score?: number | null
          id?: string
          is_compliant?: boolean | null
          model_id?: string | null
          privacy_score?: number | null
          toxicity_score?: number | null
        }
        Update: {
          composite_score?: number
          created_at?: string | null
          domain?: string | null
          evaluated_at?: string | null
          explainability_score?: number | null
          fairness_score?: number | null
          hallucination_score?: number | null
          id?: string
          is_compliant?: boolean | null
          model_id?: string | null
          privacy_score?: number | null
          toxicity_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rai_composite_scores_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          count: number
          created_at: string
          id: string
          identifier: string
          window_ms: number
          window_start: string
        }
        Insert: {
          count?: number
          created_at?: string
          id?: string
          identifier: string
          window_ms?: number
          window_start?: string
        }
        Update: {
          count?: number
          created_at?: string
          id?: string
          identifier?: string
          window_ms?: number
          window_start?: string
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
      regulatory_reports: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          document_hash: string | null
          document_url: string | null
          generated_at: string
          generated_by: string | null
          id: string
          model_id: string | null
          report_content: Json
          report_type: string
          report_version: number
          status: string
          system_id: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          document_hash?: string | null
          document_url?: string | null
          generated_at?: string
          generated_by?: string | null
          id?: string
          model_id?: string | null
          report_content?: Json
          report_type: string
          report_version?: number
          status?: string
          system_id?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          document_hash?: string | null
          document_url?: string | null
          generated_at?: string
          generated_by?: string | null
          id?: string
          model_id?: string | null
          report_content?: Json
          report_type?: string
          report_version?: number
          status?: string
          system_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "regulatory_reports_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "regulatory_reports_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "systems"
            referencedColumns: ["id"]
          },
        ]
      }
      remediation_actions: {
        Row: {
          action_type: string
          affected_columns: string[] | null
          affected_rows: number | null
          created_at: string | null
          description: string | null
          estimated_impact: Json | null
          executed_at: string | null
          executed_by: string | null
          execution_result: Json | null
          id: string
          issue_id: string | null
          python_script: string | null
          reversible: boolean | null
          safety_score: number | null
          sql_preview: string | null
          status: string | null
          upload_id: string
        }
        Insert: {
          action_type: string
          affected_columns?: string[] | null
          affected_rows?: number | null
          created_at?: string | null
          description?: string | null
          estimated_impact?: Json | null
          executed_at?: string | null
          executed_by?: string | null
          execution_result?: Json | null
          id?: string
          issue_id?: string | null
          python_script?: string | null
          reversible?: boolean | null
          safety_score?: number | null
          sql_preview?: string | null
          status?: string | null
          upload_id: string
        }
        Update: {
          action_type?: string
          affected_columns?: string[] | null
          affected_rows?: number | null
          created_at?: string | null
          description?: string | null
          estimated_impact?: Json | null
          executed_at?: string | null
          executed_by?: string | null
          execution_result?: Json | null
          id?: string
          issue_id?: string | null
          python_script?: string | null
          reversible?: boolean | null
          safety_score?: number | null
          sql_preview?: string | null
          status?: string | null
          upload_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "remediation_actions_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "quality_issues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remediation_actions_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "data_uploads"
            referencedColumns: ["id"]
          },
        ]
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
      risk_policy_bindings: {
        Row: {
          action_type: string
          auto_enforce: boolean
          created_at: string
          enforcement_description: string | null
          id: string
          required_action: string
          risk_tier: string
          updated_at: string
        }
        Insert: {
          action_type: string
          auto_enforce?: boolean
          created_at?: string
          enforcement_description?: string | null
          id?: string
          required_action: string
          risk_tier: string
          updated_at?: string
        }
        Update: {
          action_type?: string
          auto_enforce?: boolean
          created_at?: string
          enforcement_description?: string | null
          id?: string
          required_action?: string
          risk_tier?: string
          updated_at?: string
        }
        Relationships: []
      }
      silver_data: {
        Row: {
          bronze_id: string
          clean_data: Json
          created_at: string | null
          id: string
          remediation_ids: string[] | null
          transformations_applied: string[] | null
          upload_id: string
          validation_passed: boolean | null
        }
        Insert: {
          bronze_id: string
          clean_data: Json
          created_at?: string | null
          id?: string
          remediation_ids?: string[] | null
          transformations_applied?: string[] | null
          upload_id: string
          validation_passed?: boolean | null
        }
        Update: {
          bronze_id?: string
          clean_data?: Json
          created_at?: string | null
          id?: string
          remediation_ids?: string[] | null
          transformations_applied?: string[] | null
          upload_id?: string
          validation_passed?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "silver_data_bronze_id_fkey"
            columns: ["bronze_id"]
            isOneToOne: false
            referencedRelation: "bronze_data"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "silver_data_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "data_uploads"
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
          lock_reason: string | null
          locked_at: string | null
          locked_by: string | null
          model_card_url: string | null
          model_name: string | null
          name: string
          owner_id: string | null
          project_id: string
          provider: string
          registry_locked: boolean
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
          lock_reason?: string | null
          locked_at?: string | null
          locked_by?: string | null
          model_card_url?: string | null
          model_name?: string | null
          name: string
          owner_id?: string | null
          project_id: string
          provider: string
          registry_locked?: boolean
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
          lock_reason?: string | null
          locked_at?: string | null
          locked_by?: string | null
          model_card_url?: string | null
          model_name?: string | null
          name?: string
          owner_id?: string | null
          project_id?: string
          provider?: string
          registry_locked?: boolean
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
      test_run_results: {
        Row: {
          actual_score: number | null
          created_at: string | null
          detected_issues: string[] | null
          execution_time_ms: number | null
          failure_reasons: string[] | null
          id: string
          passed: boolean
          run_by: string | null
          scenario_id: string
        }
        Insert: {
          actual_score?: number | null
          created_at?: string | null
          detected_issues?: string[] | null
          execution_time_ms?: number | null
          failure_reasons?: string[] | null
          id?: string
          passed: boolean
          run_by?: string | null
          scenario_id: string
        }
        Update: {
          actual_score?: number | null
          created_at?: string | null
          detected_issues?: string[] | null
          execution_time_ms?: number | null
          failure_reasons?: string[] | null
          id?: string
          passed?: boolean
          run_by?: string | null
          scenario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_run_results_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "test_scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      test_scenarios: {
        Row: {
          category: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          difficulty: string | null
          expected_issues: string[] | null
          expected_score_max: number
          expected_score_min: number
          forbidden_issues: string[] | null
          id: string
          input_payload: Json
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          difficulty?: string | null
          expected_issues?: string[] | null
          expected_score_max: number
          expected_score_min: number
          forbidden_issues?: string[] | null
          id?: string
          input_payload: Json
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          difficulty?: string | null
          expected_issues?: string[] | null
          expected_score_max?: number
          expected_score_min?: number
          forbidden_issues?: string[] | null
          id?: string
          input_payload?: Json
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
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
      weight_profiles: {
        Row: {
          column_importance: Json | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_default: boolean | null
          name: string
          updated_at: string | null
          use_case: string | null
          weights: Json
        }
        Insert: {
          column_importance?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          updated_at?: string | null
          use_case?: string | null
          weights: Json
        }
        Update: {
          column_importance?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          updated_at?: string | null
          use_case?: string | null
          weights?: Json
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_manage_governance: { Args: never; Returns: boolean }
      cleanup_old_logs: { Args: never; Returns: undefined }
      cleanup_old_rate_limits: { Args: never; Returns: undefined }
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
      is_system_actor: { Args: never; Returns: boolean }
      lock_system: {
        Args: { p_reason?: string; p_system_id: string }
        Returns: undefined
      }
      match_nodes: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          entity_id: string
          entity_type: string
          id: string
          label: string
          metadata: Json
          properties: Json
          similarity: number
        }[]
      }
      unlock_system: {
        Args: { p_justification: string; p_system_id: string }
        Returns: undefined
      }
      verify_audit_chain: {
        Args: never
        Returns: {
          broken_at: string
          is_valid: boolean
          message: string
        }[]
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
      environment_type: "development" | "staging" | "production" | "sandbox"
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
      environment_type: ["development", "staging", "production", "sandbox"],
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
