import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callClaude, CLAUDE_DEFAULT } from "../_shared/claude.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── Types ────────────────────────────────────────────────────────────────────

type SensitivityType = "PII" | "PHI" | "Sensitive" | "Unique" | "Standard";
type DataType = "string" | "integer" | "float" | "date" | "boolean" | "email" | "phone" | "id" | "currency" | "text";

interface ColumnInput {
  name: string;
  sampleValues: string[];
}

interface AnalyzedColumn {
  name: string;
  description: string;
  sensitivity: SensitivityType;
  dataType: DataType;
  qualityIssues: string[];
  validationRule: string;
  isVerified: boolean;
}

interface QualityMetrics {
  completeness: number;
  uniqueness: number;
  validity: number;
  overallScore: number;
  issues: string[];
}

// apiKey removed — key comes from ANTHROPIC_API_KEY Supabase secret
interface AnalysisRequest {
  mode: "columns" | "pdf";
  columns?: ColumnInput[];
  fileName?: string;
  rowCount?: number;
  missingPct?: number;
  duplicateCount?: number;
  pdfBase64?: string;
  pdfName?: string;
}

interface AnalysisResponse {
  status: "success" | "error";
  columns?: AnalyzedColumn[];
  quality?: QualityMetrics;
  pdfSummary?: string;
  pdfColumns?: ColumnInput[];
  error?: string;
}

// ─── Heuristic fallback ───────────────────────────────────────────────────────

function heuristicSensitivity(col: string): SensitivityType {
  const lower = col.toLowerCase();
  if (/^(id|uuid|guid|pk|primary_key|record_id|row_id|_id|seq|sequence)$/.test(lower) ||
      /(_id|_uuid|_key|_guid)$/.test(lower)) return "Unique";
  if (/(medical|health|doctor|hospital|clinic|medication|test_result|condition|disease|diagnosis|icd|patient|treatment|admission|discharge|blood|surgery|therapy|prescription|mrn|beneficiary|biometric|fingerprint|retina)/.test(lower)) return "PHI";
  if (/(name|first_name|last_name|full_name|ssn|social_security|passport|driver.*license|license_plate|dob|date_of_birth|birth|religion|ethnicity|gender|sex|age|email|phone|address|street|city|state|zip|postal|geo|location|ip_address|mac_address|username|candidate_id)/.test(lower)) return "PII";
  if (/(password|secret|token|credential|credit.*card|bank.*account|routing|financial|billing|transaction|salary|wage|income|revenue|profit|tax|api_key|private_key)/.test(lower)) return "Sensitive";
  return "Standard";
}

function heuristicDataType(name: string, samples: string[]): DataType {
  const lower = name.toLowerCase();
  if (/email/.test(lower)) return "email";
  if (/(phone|mobile|cell|tel)/.test(lower)) return "phone";
  if (/^(id|uuid|guid|_id|pk)$/.test(lower) || /_id$/.test(lower)) return "id";
  if (/(price|amount|cost|salary|wage|revenue|fee|balance|total)/.test(lower)) return "currency";
  if (/(date|time|timestamp|created|updated|at|_on)/.test(lower)) return "date";
  if (/(is_|has_|flag|enabled|active|valid|deleted)/.test(lower)) return "boolean";
  const nonEmpty = samples.filter(Boolean).slice(0, 10);
  if (nonEmpty.length === 0) return "string";
  const allNumeric = nonEmpty.every(v => !isNaN(Number(v)));
  if (allNumeric) {
    const hasDecimal = nonEmpty.some(v => v.includes("."));
    return hasDecimal ? "float" : "integer";
  }
  const longText = nonEmpty.some(v => v.length > 80);
  return longText ? "text" : "string";
}

// ─── Quality computation ──────────────────────────────────────────────────────

function computeQuality(
  rowCount: number,
  missingPct: number,
  duplicateCount: number,
  columns: AnalyzedColumn[]
): QualityMetrics {
  const completeness = Math.max(0, 100 - missingPct);
  const uniqueness = rowCount > 0 ? Math.max(0, 100 - (duplicateCount / rowCount) * 100) : 100;
  const sensitiveCount = columns.filter(c => c.sensitivity !== "Standard").length;
  const validity = Math.max(0, 100 - sensitiveCount * 1.5 - (columns.filter(c => c.qualityIssues.length > 0).length * 3));
  const overallScore = Math.round((completeness * 0.4 + uniqueness * 0.3 + validity * 0.3));
  const issues: string[] = [];
  if (missingPct > 5) issues.push(`High missing value rate: ${missingPct.toFixed(1)}%`);
  if (duplicateCount > 0) issues.push(`${duplicateCount} duplicate rows detected`);
  if (sensitiveCount > 0) issues.push(`${sensitiveCount} sensitive columns require governance review`);
  return { completeness: Math.round(completeness), uniqueness: Math.round(uniqueness), validity: Math.round(validity), overallScore, issues };
}

// ─── Claude-powered column analysis ──────────────────────────────────────────

async function analyzeColumnsWithClaude(
  columns: ColumnInput[],
  fileName: string
): Promise<AnalyzedColumn[]> {
  const prompt = `You are a senior data governance expert. Analyze these columns from the dataset "${fileName}".

For each column return a JSON array with these exact fields:
- "name": exact column name (unchanged)
- "description": clear 1–2 sentence business description
- "sensitivity": exactly one of "PII", "PHI", "Sensitive", "Unique", "Standard"
  • PII  = name, email, SSN, DOB, phone, address, gender, race, etc.
  • PHI  = medical, diagnosis, treatment, prescription, patient data
  • Sensitive = financial, credentials, passwords, API keys, salary, revenue
  • Unique = identifiers, primary keys, UUIDs, surrogate keys (unique per record)
  • Standard = regular, non-sensitive operational data
- "dataType": one of "string","integer","float","date","boolean","email","phone","id","currency","text"
- "qualityIssues": array of strings (empty if none)
- "validationRule": short suggested validation rule
- "isVerified": always false

Columns:
${JSON.stringify(columns.map(c => ({ name: c.name, sampleValues: c.sampleValues.slice(0, 5) })), null, 2)}

Return ONLY a valid JSON array. No markdown, no extra text.`;

  const raw = await callClaude(
    [{ role: "user", content: prompt }],
    { model: CLAUDE_DEFAULT, maxTokens: 4096, temperature: 0.1 }
  );

  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("Claude did not return a valid JSON array");
  return JSON.parse(jsonMatch[0]);
}

// ─── Claude-powered PDF analysis ─────────────────────────────────────────────

async function analyzePdfWithClaude(
  pdfBase64: string,
  pdfName: string
): Promise<{ summary: string; columns: ColumnInput[] }> {
  // Anthropic supports PDF documents directly via the messages API
  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
  if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not configured");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: CLAUDE_DEFAULT,
      max_tokens: 2048,
      messages: [{
        role: "user",
        content: [
          {
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: pdfBase64 },
          },
          {
            type: "text",
            text: `You are a data governance expert. Analyze this PDF for metadata management purposes.
1. Write a brief 2–3 sentence summary of the document's content and purpose.
2. If tabular data exists, extract column/field names and up to 3 sample values each.
3. If no tabular data, return empty "columns" array.

Return ONLY valid JSON (no markdown):
{ "summary": "...", "columns": [{ "name": "col", "sampleValues": ["v1","v2"] }] }`,
          },
        ],
      }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Claude PDF analysis error ${response.status}: ${err}`);
  }

  const data = await response.json();
  const raw = data.content?.[0]?.text ?? "";
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Claude did not return valid JSON for PDF analysis");
  return JSON.parse(jsonMatch[0]);
}

// ─── Main handler ─────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: AnalysisRequest = await req.json();
    const { mode } = body;

    // ── PDF mode ──────────────────────────────────────────────────────────────
    if (mode === "pdf") {
      if (!body.pdfBase64 || !body.pdfName) {
        return new Response(
          JSON.stringify({ status: "error", error: "pdfBase64 and pdfName are required for PDF mode." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { summary, columns: pdfColumns } = await analyzePdfWithClaude(body.pdfBase64, body.pdfName);

      let analyzedColumns: AnalyzedColumn[] = [];
      if (pdfColumns.length > 0) {
        try {
          analyzedColumns = await analyzeColumnsWithClaude(pdfColumns, body.pdfName);
        } catch {
          analyzedColumns = pdfColumns.map(c => ({
            name: c.name,
            description: `Auto-extracted column from PDF: ${c.name}`,
            sensitivity: heuristicSensitivity(c.name),
            dataType: heuristicDataType(c.name, c.sampleValues),
            qualityIssues: [],
            validationRule: "Review manually",
            isVerified: false,
          }));
        }
      }

      const response: AnalysisResponse = {
        status: "success",
        pdfSummary: summary,
        pdfColumns,
        columns: analyzedColumns,
      };
      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Columns mode ──────────────────────────────────────────────────────────
    const { columns, fileName = "dataset", rowCount = 0, missingPct = 0, duplicateCount = 0 } = body;

    if (!columns || columns.length === 0) {
      return new Response(
        JSON.stringify({ status: "error", error: "columns array is required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let analyzedColumns: AnalyzedColumn[];
    try {
      analyzedColumns = await analyzeColumnsWithClaude(columns, fileName);
    } catch (claudeErr) {
      console.warn("[inventory-analyze] Claude failed, using heuristics:", claudeErr);
      analyzedColumns = columns.map(c => ({
        name: c.name,
        description: `Column "${c.name}" — heuristic classification (Claude unavailable).`,
        sensitivity: heuristicSensitivity(c.name),
        dataType: heuristicDataType(c.name, c.sampleValues),
        qualityIssues: [],
        validationRule: "Review manually",
        isVerified: false,
      }));
    }

    const quality = computeQuality(rowCount, missingPct, duplicateCount, analyzedColumns);

    const response: AnalysisResponse = {
      status: "success",
      columns: analyzedColumns,
      quality,
    };
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("[inventory-analyze] Error:", err);
    return new Response(
      JSON.stringify({ status: "error", error: err instanceof Error ? err.message : "Unexpected error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
