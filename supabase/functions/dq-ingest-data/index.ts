import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface IngestInput {
  dataset_name: string;
  dataset_description?: string | null;
  source: 'file_upload' | 'manual_entry';
  rows: Record<string, unknown>[];
  columns: string[];
  file_name?: string;
}

interface IngestOutput {
  status: "success" | "error";
  code: string;
  message: string;
  dataset_id?: string;
  upload_id?: string;
  rows_ingested?: number;
  detail?: string;
}

function validateInput(input: unknown): { valid: boolean; error?: string; data?: IngestInput } {
  if (!input || typeof input !== "object") {
    return { valid: false, error: "Input must be a JSON object" };
  }

  const obj = input as Record<string, unknown>;

  if (!obj.dataset_name || typeof obj.dataset_name !== "string" || obj.dataset_name.trim() === "") {
    return { valid: false, error: "dataset_name is required and must be a non-empty string" };
  }

  if (!obj.rows || !Array.isArray(obj.rows) || obj.rows.length === 0) {
    return { valid: false, error: "rows is required and must be a non-empty array" };
  }

  if (!obj.columns || !Array.isArray(obj.columns) || obj.columns.length === 0) {
    return { valid: false, error: "columns is required and must be a non-empty array" };
  }

  if (obj.source && !["file_upload", "manual_entry"].includes(obj.source as string)) {
    return { valid: false, error: "source must be 'file_upload' or 'manual_entry'" };
  }

  return {
    valid: true,
    data: {
      dataset_name: (obj.dataset_name as string).trim(),
      dataset_description: obj.dataset_description ? String(obj.dataset_description).trim() : null,
      source: (obj.source as 'file_upload' | 'manual_entry') || 'manual_entry',
      rows: obj.rows as Record<string, unknown>[],
      columns: obj.columns as string[],
      file_name: obj.file_name ? String(obj.file_name) : undefined,
    },
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("[DQ Ingest] Starting data ingestion...");

  try {
    // Parse input
    let input: unknown;
    try {
      input = await req.json();
    } catch {
      const response: IngestOutput = {
        status: "error",
        code: "INVALID_JSON",
        message: "Request body must be valid JSON",
      };
      return new Response(JSON.stringify(response), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate input
    const validation = validateInput(input);
    if (!validation.valid || !validation.data) {
      const response: IngestOutput = {
        status: "error",
        code: "INVALID_INPUT",
        message: validation.error || "Invalid input",
      };
      return new Response(JSON.stringify(response), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { dataset_name, dataset_description, source, rows, columns, file_name } = validation.data;

    console.log(`[DQ Ingest] Ingesting ${rows.length} rows for dataset: ${dataset_name}`);

    // Initialize Supabase client with service role (bypasses RLS)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Step 1: Create dataset record
    const { data: dataset, error: datasetError } = await supabase
      .from("datasets")
      .insert({
        name: dataset_name,
        description: dataset_description,
        source: source,
        row_count: rows.length,
        data_types: columns,
        consent_status: "pending",
        environment: "development",
      })
      .select()
      .single();

    if (datasetError) {
      console.error("[DQ Ingest] Failed to create dataset:", datasetError);
      const response: IngestOutput = {
        status: "error",
        code: "DATASET_CREATE_FAILED",
        message: "Failed to create dataset record",
        detail: datasetError.message,
      };
      return new Response(JSON.stringify(response), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[DQ Ingest] Dataset created: ${dataset.id}`);

    // Step 2: Create data_uploads record
    const { data: upload, error: uploadError } = await supabase
      .from("data_uploads")
      .insert({
        file_name: file_name || `${dataset_name}_manual.json`,
        file_path: `/uploads/${dataset.id}`,
        status: "completed",
        parsed_row_count: rows.length,
        parsed_column_count: columns.length,
        quality_score: null,
      })
      .select()
      .single();

    if (uploadError) {
      console.error("[DQ Ingest] Failed to create upload record:", uploadError);
      // Rollback dataset creation
      await supabase.from("datasets").delete().eq("id", dataset.id);
      
      const response: IngestOutput = {
        status: "error",
        code: "UPLOAD_CREATE_FAILED",
        message: "Failed to create upload record",
        detail: uploadError.message,
      };
      return new Response(JSON.stringify(response), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[DQ Ingest] Upload record created: ${upload.id}`);

    // Step 3: Insert bronze_data rows
    const bronzeRecords = rows.map((row, idx) => ({
      upload_id: upload.id,
      row_index: idx,
      raw_data: row,
    }));

    const { error: bronzeError } = await supabase
      .from("bronze_data")
      .insert(bronzeRecords);

    if (bronzeError) {
      console.error("[DQ Ingest] Failed to insert bronze data:", bronzeError);
      // Rollback upload and dataset creation
      await supabase.from("data_uploads").delete().eq("id", upload.id);
      await supabase.from("datasets").delete().eq("id", dataset.id);
      
      const response: IngestOutput = {
        status: "error",
        code: "BRONZE_INSERT_FAILED",
        message: "Failed to insert bronze data records",
        detail: bronzeError.message,
      };
      return new Response(JSON.stringify(response), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[DQ Ingest] ✅ Successfully ingested ${rows.length} rows into bronze_data`);

    // Step 4: Verify data was inserted
    const { count: verifyCount } = await supabase
      .from("bronze_data")
      .select("id", { count: "exact", head: true })
      .eq("upload_id", upload.id);

    console.log(`[DQ Ingest] Verification: ${verifyCount} rows in bronze_data for upload ${upload.id}`);

    const response: IngestOutput = {
      status: "success",
      code: "DATA_INGESTED",
      message: `Successfully ingested ${rows.length} rows`,
      dataset_id: dataset.id,
      upload_id: upload.id,
      rows_ingested: rows.length,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[DQ Ingest] Unexpected error:", error);
    const response: IngestOutput = {
      status: "error",
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred during data ingestion",
      detail: error instanceof Error ? error.message : "Unknown error",
    };
    return new Response(JSON.stringify(response), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
