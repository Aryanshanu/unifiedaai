import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface IngestInput {
  // For creating new dataset
  dataset_name?: string;
  dataset_description?: string | null;
  source?: 'file_upload' | 'manual_entry';
  file_name?: string;
  // For attaching to existing dataset
  dataset_id?: string;
  overwrite?: boolean;
  // Required data
  rows: Record<string, unknown>[];
  columns: string[];
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

  // Must have either dataset_name (create mode) or dataset_id (attach mode)
  const hasDatasetName = obj.dataset_name && typeof obj.dataset_name === "string" && (obj.dataset_name as string).trim() !== "";
  const hasDatasetId = obj.dataset_id && typeof obj.dataset_id === "string" && (obj.dataset_id as string).trim() !== "";

  if (!hasDatasetName && !hasDatasetId) {
    return { valid: false, error: "Either dataset_name (for new) or dataset_id (for attach) is required" };
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
      dataset_name: hasDatasetName ? (obj.dataset_name as string).trim() : undefined,
      dataset_description: obj.dataset_description ? String(obj.dataset_description).trim() : null,
      source: (obj.source as 'file_upload' | 'manual_entry') || 'manual_entry',
      rows: obj.rows as Record<string, unknown>[],
      columns: obj.columns as string[],
      file_name: obj.file_name ? String(obj.file_name) : undefined,
      dataset_id: hasDatasetId ? (obj.dataset_id as string).trim() : undefined,
      overwrite: obj.overwrite === true,
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

    const { dataset_name, dataset_description, source, rows, columns, file_name, dataset_id: existingDatasetId, overwrite } = validation.data;

    console.log(`[DQ Ingest] Mode: ${existingDatasetId ? 'attach' : 'create'}, Rows: ${rows.length}`);

    // Initialize Supabase client with service role (bypasses RLS)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let datasetId: string;
    let datasetName: string;

    // === ATTACH MODE: Use existing dataset ===
    if (existingDatasetId) {
      // Verify dataset exists
      const { data: existingDataset, error: fetchError } = await supabase
        .from("datasets")
        .select("id, name")
        .eq("id", existingDatasetId)
        .single();

      if (fetchError || !existingDataset) {
        const response: IngestOutput = {
          status: "error",
          code: "DATASET_NOT_FOUND",
          message: `Dataset not found: ${existingDatasetId}`,
        };
        return new Response(JSON.stringify(response), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      datasetId = existingDataset.id;
      datasetName = existingDataset.name;

      // If overwrite, delete existing dq_data rows for this dataset
      if (overwrite) {
        console.log(`[DQ Ingest] Overwrite mode: deleting existing dq_data for dataset ${datasetId}`);
        await supabase.from("dq_data").delete().eq("dataset_id", datasetId);
      }
    } else {
      // === CREATE MODE: Create new dataset ===
      const { data: dataset, error: datasetError } = await supabase
        .from("datasets")
        .insert({
          name: dataset_name!,
          description: dataset_description,
          source: source || 'manual_entry',
          row_count: rows.length,
          data_types: columns,
          consent_status: "pending",
          environment: "development",
          ingested_row_count: 0, // Will be updated after insert
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

      datasetId = dataset.id;
      datasetName = dataset.name;
      console.log(`[DQ Ingest] Dataset created: ${datasetId}`);
    }

    // Step 2: Create data_uploads record
    const { data: upload, error: uploadError } = await supabase
      .from("data_uploads")
      .insert({
        file_name: file_name || `${datasetName}_manual.json`,
        file_path: `/uploads/${datasetId}`,
        status: "completed",
        parsed_row_count: rows.length,
        parsed_column_count: columns.length,
        quality_score: null,
      })
      .select()
      .single();

    if (uploadError) {
      console.error("[DQ Ingest] Failed to create upload record:", uploadError);
      // Rollback dataset creation if we created it
      if (!existingDatasetId) {
        await supabase.from("datasets").delete().eq("id", datasetId);
      }
      
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

    // Step 3: Insert dq_data rows in batches (prevents timeout for large datasets)
    const BATCH_SIZE = 1000;
    let totalInserted = 0;

    console.log(`[DQ Ingest] Inserting ${rows.length} rows in batches of ${BATCH_SIZE}...`);

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const dqRecords = batch.map((row, idx) => ({
        dataset_id: datasetId,
        upload_id: upload.id,
        row_index: i + idx,
        raw_data: row,
      }));

      const { error: batchError } = await supabase
        .from("dq_data")
        .insert(dqRecords);

      if (batchError) {
        console.error(`[DQ Ingest] Batch ${Math.floor(i/BATCH_SIZE) + 1} failed:`, batchError);
        // Rollback upload and dataset creation
        await supabase.from("data_uploads").delete().eq("id", upload.id);
        await supabase.from("dq_data").delete().eq("dataset_id", datasetId);
        if (!existingDatasetId) {
          await supabase.from("datasets").delete().eq("id", datasetId);
        }
        
        const response: IngestOutput = {
          status: "error",
          code: "DQ_DATA_INSERT_FAILED",
          message: "Failed to insert data records",
          detail: batchError.message,
        };
        return new Response(JSON.stringify(response), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      totalInserted += batch.length;
      console.log(`[DQ Ingest] Inserted batch ${Math.floor(i/BATCH_SIZE) + 1}: ${totalInserted}/${rows.length} rows`);
    }

    console.log(`[DQ Ingest] ✅ Successfully ingested ${rows.length} rows into dq_data`);

    // Step 4: Verify data was inserted and update ingested_row_count
    const { count: verifyCount } = await supabase
      .from("dq_data")
      .select("id", { count: "exact", head: true })
      .eq("dataset_id", datasetId);

    console.log(`[DQ Ingest] Verification: ${verifyCount} rows in dq_data for dataset ${datasetId}`);

    // Update the dataset's ingested_row_count to reflect truth
    const { error: updateError } = await supabase
      .from("datasets")
      .update({ 
        ingested_row_count: verifyCount || 0,
        row_count: verifyCount || 0 // Keep row_count in sync
      })
      .eq("id", datasetId);

    if (updateError) {
      console.error("[DQ Ingest] Warning: Failed to update ingested_row_count:", updateError);
      // Not fatal, continue
    }

    const response: IngestOutput = {
      status: "success",
      code: "DATA_INGESTED",
      message: `Successfully ingested ${verifyCount || rows.length} rows`,
      dataset_id: datasetId,
      upload_id: upload.id,
      rows_ingested: verifyCount || rows.length,
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
