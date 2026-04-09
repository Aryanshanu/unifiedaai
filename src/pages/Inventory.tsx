import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  UploadCloud, Database, ShieldAlert, CheckCircle, FileText,
  AlertTriangle, UserRound, Trash2, Download,
  RefreshCw, Fingerprint, Lock, Star,
  Layers, History, X, FileSearch, Brain, BarChart2
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// ─── Types ─────────────────────────────────────────────────────────────────────

type SensitivityType = "PII" | "PHI" | "Sensitive" | "Unique" | "Standard";
type DataType = "string" | "integer" | "float" | "date" | "boolean" | "email" | "phone" | "id" | "currency" | "text";
type FileFormat = "csv" | "json" | "pdf" | "tsv" | "unknown";

interface ColumnMeta {
  name: string;
  dataType: DataType;
  description: string;
  sensitivity: SensitivityType;
  isVerified: boolean;
  qualityIssues: string[];
  validationRule: string;
  sampleValues: string[];
  missingPct: number;
  uniquePct: number;
}

interface QualityMetrics {
  completeness: number;
  uniqueness: number;
  validity: number;
  overallScore: number;
  issues: string[];
}

interface DatasetAnalysis {
  filename: string;
  fileFormat: FileFormat;
  fileSizeKb: number;
  totalRows: number;
  totalCols: number;
  duplicateRows: number;
  quality: QualityMetrics;
  columns: ColumnMeta[];
  pdfSummary?: string;
  analyzedAt: string;
  aiPowered: boolean;
}

interface SavedDataset extends DatasetAnalysis {
  id: string;
  ownerName: string;
  ownerEmail: string;
  datasetDescription: string;
  registeredAt: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const HISTORY_STORAGE = "inventory_dataset_history";

const SENSITIVITY_CONFIG: Record<SensitivityType, { label: string; color: string; icon: React.ReactNode; description: string }> = {
  PII: {
    label: "PII",
    color: "bg-amber-500/10 text-amber-500 border-amber-500/30",
    icon: <UserRound className="w-3 h-3" />,
    description: "Personally Identifiable Information",
  },
  PHI: {
    label: "PHI",
    color: "bg-rose-500/10 text-rose-500 border-rose-500/30",
    icon: <ShieldAlert className="w-3 h-3" />,
    description: "Protected Health Information",
  },
  Sensitive: {
    label: "Sensitive",
    color: "bg-purple-500/10 text-purple-500 border-purple-500/30",
    icon: <Lock className="w-3 h-3" />,
    description: "Confidential / Financial / Credentials",
  },
  Unique: {
    label: "Unique ID",
    color: "bg-blue-500/10 text-blue-500 border-blue-500/30",
    icon: <Fingerprint className="w-3 h-3" />,
    description: "Primary key or unique identifier",
  },
  Standard: {
    label: "Standard",
    color: "bg-muted text-muted-foreground border-border",
    icon: <Layers className="w-3 h-3" />,
    description: "Non-sensitive operational data",
  },
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function detectFormat(file: File): FileFormat {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "csv") return "csv";
  if (ext === "tsv") return "tsv";
  if (ext === "json") return "json";
  if (ext === "pdf") return "pdf";
  return "unknown";
}

function parseCSVLine(line: string, delimiter = ","): string[] {
  const result: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (const char of line) {
    if (char === '"') { inQuotes = !inQuotes; }
    else if (char === delimiter && !inQuotes) { result.push(cell.trim().replace(/^"|"$/g, "")); cell = ""; }
    else { cell += char; }
  }
  result.push(cell.trim().replace(/^"|"$/g, ""));
  return result;
}

function heuristicSensitivity(col: string): SensitivityType {
  const lower = col.toLowerCase();
  if (/^(id|uuid|guid|pk|record_id|row_id|seq|sequence)$/.test(lower) || /(_id|_uuid|_key|_guid)$/.test(lower)) return "Unique";
  if (/(medical|health|doctor|hospital|clinic|medication|diagnosis|icd|patient|treatment|admission|discharge|blood|surgery|therapy|prescription|mrn|beneficiary|biometric|fingerprint)/.test(lower)) return "PHI";
  if (/(name|first_name|last_name|full_name|ssn|social_security|passport|driver.*license|dob|date_of_birth|birth|religion|ethnicity|gender|sex|age|email|phone|address|street|city|zip|postal|geo|location|ip_address|username|candidate_id)/.test(lower)) return "PII";
  if (/(password|secret|token|credential|credit.*card|bank.*account|routing|salary|wage|income|revenue|profit|tax|api_key|private_key|billing|transaction)/.test(lower)) return "Sensitive";
  return "Standard";
}

function heuristicDataType(name: string, samples: string[]): DataType {
  const lower = name.toLowerCase();
  if (/email/.test(lower)) return "email";
  if (/(phone|mobile|cell|tel)/.test(lower)) return "phone";
  if (/^(id|uuid|guid|pk)$/.test(lower) || /_id$/.test(lower)) return "id";
  if (/(price|amount|cost|salary|wage|revenue|fee|balance|total)/.test(lower)) return "currency";
  if (/(date|time|timestamp|created_at|updated_at|born|_on)/.test(lower)) return "date";
  if (/(is_|has_|flag|enabled|active|valid|deleted)/.test(lower)) return "boolean";
  const nonEmpty = samples.filter(Boolean).slice(0, 10);
  if (!nonEmpty.length) return "string";
  if (nonEmpty.every(v => !isNaN(Number(v)))) return nonEmpty.some(v => v.includes(".")) ? "float" : "integer";
  return nonEmpty.some(v => v.length > 80) ? "text" : "string";
}

function computeColumnStats(colIndex: number, dataRows: string[][]): Pick<ColumnMeta, "sampleValues" | "missingPct" | "uniquePct"> {
  const values = dataRows.map(r => r[colIndex] ?? "");
  const nonEmpty = values.filter(v => v && v.toLowerCase() !== "null" && v.toLowerCase() !== "na" && v.toLowerCase() !== "n/a");
  const missingCount = values.length - nonEmpty.length;
  const uniqueSet = new Set(nonEmpty);
  return {
    sampleValues: nonEmpty.slice(0, 5),
    missingPct: values.length > 0 ? parseFloat(((missingCount / values.length) * 100).toFixed(1)) : 0,
    uniquePct: nonEmpty.length > 0 ? parseFloat(((uniqueSet.size / nonEmpty.length) * 100).toFixed(1)) : 0,
  };
}

function computeQualityLocal(totalRows: number, missingPct: number, duplicateCount: number, columns: ColumnMeta[]): QualityMetrics {
  const completeness = Math.max(0, 100 - missingPct);
  const uniqueness = totalRows > 0 ? Math.max(0, 100 - (duplicateCount / totalRows) * 100) : 100;
  const issueCount = columns.reduce((s, c) => s + c.qualityIssues.length, 0);
  const validity = Math.max(0, 100 - issueCount * 4);
  const overallScore = Math.round(completeness * 0.4 + uniqueness * 0.3 + validity * 0.3);
  const issues: string[] = [];
  if (missingPct > 5) issues.push(`High missing value rate: ${missingPct.toFixed(1)}%`);
  if (duplicateCount > 0) issues.push(`${duplicateCount} duplicate rows detected`);
  const sensitiveCount = columns.filter(c => c.sensitivity !== "Standard").length;
  if (sensitiveCount > 0) issues.push(`${sensitiveCount} sensitive columns require governance tagging`);
  return { completeness: Math.round(completeness), uniqueness: Math.round(uniqueness), validity: Math.round(validity), overallScore, issues };
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function SensitivityBadge({ type }: { type: SensitivityType }) {
  const cfg = SENSITIVITY_CONFIG[type];
  return (
    <Badge variant="outline" className={`gap-1 text-xs ${cfg.color}`}>
      {cfg.icon}{cfg.label}
    </Badge>
  );
}

function QualityBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}%</span>
      </div>
      <Progress value={value} className="h-2" />
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function Inventory() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<"idle" | "parsing" | "analyzing" | "done">("idle");
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [analysis, setAnalysis] = useState<DatasetAnalysis | null>(null);

  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [datasetDescription, setDatasetDescription] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const [history, setHistory] = useState<SavedDataset[]>(() => {
    try { return JSON.parse(localStorage.getItem(HISTORY_STORAGE) ?? "[]"); }
    catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem(HISTORY_STORAGE, JSON.stringify(history));
  }, [history]);

  // ── File handling ─────────────────────────────────────────────────────────

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) processFile(dropped);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) processFile(selected);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  async function processFile(uploadedFile: File) {
    const format = detectFormat(uploadedFile);
    if (format === "unknown") {
      toast({ title: "Unsupported Format", description: "Please upload CSV, TSV, JSON, or PDF.", variant: "destructive" });
      return;
    }
    setFile(uploadedFile);
    setStep("parsing");
    setProgress(10);
    setProgressLabel("Reading file...");
    try {
      if (format === "pdf") await processPdf(uploadedFile);
      else await processTabular(uploadedFile, format);
    } catch (err) {
      toast({ title: "Analysis Failed", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
      setStep("idle");
      setFile(null);
    }
  }

  async function processTabular(uploadedFile: File, format: FileFormat) {
    const text = await uploadedFile.text();
    const delimiter = format === "tsv" ? "\t" : ",";
    setProgress(20);
    setProgressLabel("Parsing columns and rows...");

    let headers: string[] = [];
    let dataRows: string[][] = [];

    if (format === "json") {
      let parsed: unknown;
      try { parsed = JSON.parse(text); } catch { throw new Error("Invalid JSON file"); }
      const arr = Array.isArray(parsed) ? parsed : (parsed as Record<string, unknown[]>)[Object.keys(parsed as object)[0]];
      if (!Array.isArray(arr) || arr.length === 0) throw new Error("JSON must contain an array of objects");
      headers = Object.keys(arr[0] as object);
      dataRows = (arr as Record<string, unknown>[]).map(row => headers.map(h => String(row[h] ?? "")));
    } else {
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (!lines.length) throw new Error("Empty file");
      headers = parseCSVLine(lines[0], delimiter);
      dataRows = lines.slice(1).map(l => parseCSVLine(l, delimiter));
    }

    setProgress(40);
    setProgressLabel("Computing column statistics...");

    const rowStrings = dataRows.map(r => r.join("|"));
    const duplicateCount = rowStrings.length - new Set(rowStrings).size;
    const totalMissingCells = dataRows.reduce((sum, row) => sum + row.filter(v => !v || v.toLowerCase() === "null" || v.toLowerCase() === "na").length, 0);
    const totalCells = dataRows.length * headers.length;
    const overallMissingPct = totalCells > 0 ? (totalMissingCells / totalCells) * 100 : 0;

    const columnStubs: ColumnMeta[] = headers.map((h, idx) => {
      const stats = computeColumnStats(idx, dataRows);
      return {
        name: h,
        dataType: heuristicDataType(h, stats.sampleValues),
        description: `Column "${h}" — awaiting AI analysis.`,
        sensitivity: heuristicSensitivity(h),
        isVerified: false,
        qualityIssues: stats.missingPct > 20 ? [`High missing rate: ${stats.missingPct}%`] : [],
        validationRule: "Pending review",
        ...stats,
      };
    });

    setProgress(55);
    setProgressLabel("Claude is analyzing column metadata...");

    let finalColumns = columnStubs;
    let aiPowered = false;

    try {
      const { data, error } = await supabase.functions.invoke("inventory-analyze", {
        body: {
          mode: "columns",
          columns: columnStubs.map(c => ({ name: c.name, sampleValues: c.sampleValues })),
          fileName: uploadedFile.name,
          rowCount: dataRows.length,
          missingPct: overallMissingPct,
          duplicateCount,
        },
      });
      if (!error && data?.status === "success" && data.columns) {
        finalColumns = data.columns.map((ai: ColumnMeta, i: number) => ({
          ...columnStubs[i],
          ...ai,
          sampleValues: columnStubs[i]?.sampleValues ?? [],
          missingPct: columnStubs[i]?.missingPct ?? 0,
          uniquePct: columnStubs[i]?.uniquePct ?? 0,
        }));
        aiPowered = true;
      }
    } catch (err) {
      console.warn("[Inventory] Claude analysis failed, using heuristics:", err);
    }

    setProgress(80);
    setProgressLabel("Computing data quality metrics...");
    const quality = computeQualityLocal(dataRows.length, overallMissingPct, duplicateCount, finalColumns);

    setProgress(100);
    setAnalysis({
      filename: uploadedFile.name,
      fileFormat: format,
      fileSizeKb: Math.round(uploadedFile.size / 1024),
      totalRows: dataRows.length,
      totalCols: headers.length,
      duplicateRows: duplicateCount,
      quality,
      columns: finalColumns,
      analyzedAt: new Date().toISOString(),
      aiPowered,
    });
    setStep("done");
  }

  async function processPdf(uploadedFile: File) {
    setProgress(30);
    setProgressLabel("Reading PDF...");

    const buffer = await uploadedFile.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";
    bytes.forEach(b => (binary += String.fromCharCode(b)));
    const base64 = btoa(binary);

    setProgress(55);
    setProgressLabel("Claude is reading the PDF...");

    const { data, error } = await supabase.functions.invoke("inventory-analyze", {
      body: { mode: "pdf", pdfBase64: base64, pdfName: uploadedFile.name },
    });

    if (error || data?.status === "error") {
      throw new Error(data?.error ?? error?.message ?? "PDF analysis failed");
    }

    setProgress(85);
    setProgressLabel("Building metadata profile...");

    const columns: ColumnMeta[] = (data.columns ?? []).map((c: ColumnMeta) => ({
      name: c.name,
      dataType: c.dataType ?? "string",
      description: c.description ?? `Column "${c.name}" extracted from PDF.`,
      sensitivity: c.sensitivity ?? heuristicSensitivity(c.name),
      isVerified: false,
      qualityIssues: c.qualityIssues ?? [],
      validationRule: c.validationRule ?? "Review manually",
      sampleValues: (data.pdfColumns ?? []).find((p: { name: string; sampleValues: string[] }) => p.name === c.name)?.sampleValues ?? [],
      missingPct: 0,
      uniquePct: 0,
    }));

    const quality = computeQualityLocal(0, 0, 0, columns);
    setProgress(100);
    setAnalysis({
      filename: uploadedFile.name,
      fileFormat: "pdf",
      fileSizeKb: Math.round(uploadedFile.size / 1024),
      totalRows: 0,
      totalCols: columns.length,
      duplicateRows: 0,
      quality,
      columns,
      pdfSummary: data.pdfSummary,
      analyzedAt: new Date().toISOString(),
      aiPowered: true,
    });
    setStep("done");
  }

  // ── Save to history ───────────────────────────────────────────────────────

  const registerDataset = () => {
    if (!ownerName.trim() || !ownerEmail.trim()) {
      toast({ title: "Required Fields Missing", description: "Please provide Business Owner name and email.", variant: "destructive" });
      return;
    }
    if (!analysis) return;
    const saved: SavedDataset = {
      ...analysis,
      id: crypto.randomUUID(),
      ownerName: ownerName.trim(),
      ownerEmail: ownerEmail.trim(),
      datasetDescription: datasetDescription.trim(),
      registeredAt: new Date().toISOString(),
    };
    setHistory(prev => [saved, ...prev]);
    toast({ title: "Dataset Registered", description: `${analysis.filename} has been catalogued.` });
    setFile(null); setAnalysis(null); setOwnerName(""); setOwnerEmail(""); setDatasetDescription(""); setProgress(0); setStep("idle");
  };

  const deleteHistory = (id: string) => {
    setHistory(prev => prev.filter(d => d.id !== id));
    toast({ title: "Entry Removed" });
  };

  const exportHistory = () => {
    const blob = new Blob([JSON.stringify(history, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `data-inventory-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const sensitivityCounts = analysis
    ? (["PII", "PHI", "Sensitive", "Unique", "Standard"] as SensitivityType[]).map(t => ({
        type: t, count: analysis.columns.filter(c => c.sensitivity === t).length,
      }))
    : [];

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <MainLayout title="Data Inventory" subtitle="Metadata management, sensitivity classification, and AI-powered glossary validation">
      <div className="space-y-6">

        {/* ── Upload / History ─────────────────────────────────────────── */}
        {step === "idle" && !analysis && (
          <div className="space-y-6">
            <Card
              className={`border-2 border-dashed transition-all cursor-pointer ${isDragging ? "border-primary bg-primary/5 scale-[1.01]" : "border-border bg-muted/20 hover:border-primary/50 hover:bg-muted/30"}`}
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <CardContent className="flex flex-col items-center justify-center py-16 space-y-4">
                <div className={`p-5 rounded-2xl transition-all ${isDragging ? "bg-primary/20" : "bg-muted"}`}>
                  <UploadCloud className={`w-10 h-10 ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-semibold">Drop your dataset here</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Supports <span className="font-medium text-foreground">CSV, TSV, JSON</span> and{" "}
                    <span className="font-medium text-primary">PDF</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Claude AI analyses every column automatically on the backend</p>
                </div>
                <Button variant="outline" className="pointer-events-none">
                  <FileSearch className="w-4 h-4 mr-2" /> Browse Files
                </Button>
                <input ref={fileInputRef} type="file" accept=".csv,.tsv,.json,.pdf" className="hidden" onChange={handleFileInput} />
              </CardContent>
            </Card>

            {history.length > 0 && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <History className="w-5 h-5 text-primary" /> Registered Datasets
                    </CardTitle>
                    <CardDescription>{history.length} dataset{history.length !== 1 ? "s" : ""} catalogued</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={exportHistory}>
                    <Download className="w-4 h-4 mr-2" /> Export JSON
                  </Button>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Dataset</TableHead>
                        <TableHead>Owner</TableHead>
                        <TableHead>Format</TableHead>
                        <TableHead>Rows / Cols</TableHead>
                        <TableHead>Quality</TableHead>
                        <TableHead>AI</TableHead>
                        <TableHead className="text-right">Registered</TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.map(ds => (
                        <TableRow key={ds.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                              <div>
                                <p className="truncate max-w-[180px]" title={ds.filename}>{ds.filename}</p>
                                {ds.datasetDescription && <p className="text-xs text-muted-foreground truncate max-w-[180px]">{ds.datasetDescription}</p>}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-sm">{ds.ownerName}</span>
                              <span className="text-xs text-muted-foreground">{ds.ownerEmail}</span>
                            </div>
                          </TableCell>
                          <TableCell><Badge variant="outline" className="font-mono text-xs uppercase">{ds.fileFormat}</Badge></TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {ds.totalRows > 0 ? `${ds.totalRows.toLocaleString()} / ${ds.totalCols}` : `— / ${ds.totalCols}`}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={ds.quality.overallScore >= 85 ? "text-emerald-500 border-emerald-500/30 bg-emerald-500/10" : ds.quality.overallScore >= 65 ? "text-amber-500 border-amber-500/30 bg-amber-500/10" : "text-rose-500 border-rose-500/30 bg-rose-500/10"}>
                              {ds.quality.overallScore}%
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {ds.aiPowered
                              ? <Badge variant="outline" className="text-primary border-primary/30 bg-primary/10 text-xs gap-1"><Brain className="w-3 h-3" /> Claude</Badge>
                              : <span className="text-xs text-muted-foreground">Heuristic</span>}
                          </TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground">{new Date(ds.registeredAt).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteHistory(ds.id)}>
                              <X className="w-3 h-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ── Progress ──────────────────────────────────────────────────── */}
        {(step === "parsing" || step === "analyzing") && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 space-y-6">
              <div className="p-4 rounded-2xl bg-primary/10">
                <Brain className="w-10 h-10 text-primary animate-pulse" />
              </div>
              <div className="text-center space-y-2 w-full max-w-md">
                <h3 className="text-lg font-semibold animate-pulse">{progressLabel}</h3>
                <p className="text-sm text-muted-foreground">Powered by Claude claude-opus-4-6 on the backend</p>
                <Progress value={progress} className="h-2 mt-4" />
                <p className="text-xs text-muted-foreground">{progress}%</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Results ───────────────────────────────────────────────────── */}
        {step === "done" && analysis && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">

            {analysis.fileFormat === "pdf" && analysis.pdfSummary && (
              <Card className="border-primary/30 bg-primary/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" /> Document Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">{analysis.pdfSummary}</p>
                </CardContent>
              </Card>
            )}

            {/* Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4 pb-4">
                  <p className="text-lg font-bold truncate" title={analysis.filename}>{analysis.filename}</p>
                  <p className="text-xs text-muted-foreground mt-1">{analysis.fileSizeKb} KB · {analysis.fileFormat.toUpperCase()}</p>
                  {analysis.aiPowered && <Badge variant="outline" className="mt-2 text-primary border-primary/30 bg-primary/10 text-xs gap-1"><Brain className="w-3 h-3" /> Claude</Badge>}
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4">
                  <p className="text-2xl font-bold">{analysis.totalCols}</p>
                  <p className="text-xs text-muted-foreground mt-1">Columns detected</p>
                  <p className="text-xs text-muted-foreground">{analysis.totalRows > 0 ? `${analysis.totalRows.toLocaleString()} rows` : "PDF document"}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4">
                  <p className={`text-2xl font-bold ${analysis.quality.overallScore >= 80 ? "text-emerald-500" : analysis.quality.overallScore >= 60 ? "text-amber-500" : "text-rose-500"}`}>
                    {analysis.quality.overallScore}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Quality Score / 100</p>
                  {analysis.duplicateRows > 0 && <p className="text-xs text-amber-500 mt-1">{analysis.duplicateRows} duplicates</p>}
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4 space-y-1">
                  {sensitivityCounts.filter(s => s.count > 0).map(({ type, count }) => (
                    <div key={type} className="flex items-center justify-between">
                      <SensitivityBadge type={type} />
                      <span className="text-sm font-bold">{count}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="glossary">
              <TabsList>
                <TabsTrigger value="glossary"><FileText className="w-3.5 h-3.5 mr-1.5" />Glossary & Classification</TabsTrigger>
                <TabsTrigger value="quality"><BarChart2 className="w-3.5 h-3.5 mr-1.5" />Data Quality</TabsTrigger>
                <TabsTrigger value="register"><UserRound className="w-3.5 h-3.5 mr-1.5" />Register Dataset</TabsTrigger>
              </TabsList>

              {/* Glossary */}
              <TabsContent value="glossary">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="w-5 h-5 text-primary" /> Column Metadata & Sensitivity Classification
                    </CardTitle>
                    <CardDescription>
                      {analysis.aiPowered ? "Descriptions generated by Claude claude-opus-4-6 — verify before publishing" : "Heuristic classification — Claude analysis unavailable"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-36">Column</TableHead>
                          <TableHead className="w-24">Type</TableHead>
                          <TableHead>Description / Glossary</TableHead>
                          <TableHead className="w-28">Sensitivity</TableHead>
                          <TableHead className="w-32">Validation Rule</TableHead>
                          <TableHead className="w-20 text-center">Status</TableHead>
                          <TableHead className="w-32">Samples</TableHead>
                          <TableHead className="w-20 text-right">Missing</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analysis.columns.map((col, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-mono text-xs font-medium">{col.name}</TableCell>
                            <TableCell><Badge variant="outline" className="font-mono text-xs text-muted-foreground">{col.dataType}</Badge></TableCell>
                            <TableCell className="text-sm max-w-xs">
                              <p className="line-clamp-2" title={col.description}>{col.description}</p>
                              {col.qualityIssues.length > 0 && (
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {col.qualityIssues.map((issue, i) => (
                                    <span key={i} className="text-xs text-amber-500 flex items-center gap-0.5">
                                      <AlertTriangle className="w-3 h-3" />{issue}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </TableCell>
                            <TableCell><SensitivityBadge type={col.sensitivity} /></TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate" title={col.validationRule}>{col.validationRule}</TableCell>
                            <TableCell className="text-center">
                              {col.isVerified
                                ? <span className="flex items-center justify-center text-xs text-emerald-500 gap-1"><CheckCircle className="w-3 h-3" /> Verified</span>
                                : <span className="flex items-center justify-center text-xs text-amber-500 gap-1"><AlertTriangle className="w-3 h-3" /> Pending</span>}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {col.sampleValues.slice(0, 3).map((v, i) => (
                                  <span key={i} className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono truncate max-w-[60px]" title={v}>{v || "—"}</span>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell className="text-right text-xs">
                              <span className={col.missingPct > 10 ? "text-amber-500 font-medium" : "text-muted-foreground"}>{col.missingPct}%</span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Quality */}
              <TabsContent value="quality">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2"><BarChart2 className="w-5 h-5 text-primary" /> Quality Dimensions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <QualityBar label="Completeness" value={analysis.quality.completeness} />
                      <QualityBar label="Uniqueness" value={analysis.quality.uniqueness} />
                      <QualityBar label="Validity" value={analysis.quality.validity} />
                      <div className="pt-2 border-t flex justify-between items-center">
                        <span className="text-sm font-medium">Overall Score</span>
                        <span className={`text-2xl font-bold ${analysis.quality.overallScore >= 80 ? "text-emerald-500" : analysis.quality.overallScore >= 60 ? "text-amber-500" : "text-rose-500"}`}>
                          {analysis.quality.overallScore}/100
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-amber-500" /> Quality Issues</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {analysis.quality.issues.length === 0 ? (
                        <div className="flex flex-col items-center py-8 text-center">
                          <CheckCircle className="w-8 h-8 text-emerald-500 mb-2" />
                          <p className="font-medium">No critical issues detected</p>
                        </div>
                      ) : (
                        <ul className="space-y-2">
                          {analysis.quality.issues.map((issue, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />{issue}
                            </li>
                          ))}
                        </ul>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="md:col-span-2">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-primary" /> Sensitivity Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {(["PII", "PHI", "Sensitive", "Unique", "Standard"] as SensitivityType[]).map(type => {
                          const cfg = SENSITIVITY_CONFIG[type];
                          const count = analysis.columns.filter(c => c.sensitivity === type).length;
                          const pct = analysis.totalCols > 0 ? Math.round((count / analysis.totalCols) * 100) : 0;
                          return (
                            <div key={type} className={`p-4 rounded-xl border ${cfg.color} space-y-2`}>
                              <div className="flex items-center gap-2 text-sm font-medium">{cfg.icon}{cfg.label}</div>
                              <p className="text-2xl font-bold">{count}</p>
                              <p className="text-xs opacity-70">{pct}% of columns</p>
                              <p className="text-xs opacity-60 leading-snug">{cfg.description}</p>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Register */}
              <TabsContent value="register">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><UserRound className="w-5 h-5 text-primary" /> Register in Data Catalog</CardTitle>
                    <CardDescription>Assign ownership and save to the persistent inventory history</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Business Owner Name <span className="text-rose-500">*</span></Label>
                        <Input placeholder="Jane Doe" value={ownerName} onChange={e => setOwnerName(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Business Owner Email <span className="text-rose-500">*</span></Label>
                        <Input placeholder="owner@company.com" type="email" value={ownerEmail} onChange={e => setOwnerEmail(e.target.value)} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Dataset Description</Label>
                      <Textarea placeholder="Describe what this dataset contains..." value={datasetDescription} onChange={e => setDatasetDescription(e.target.value)} rows={3} />
                    </div>
                    <div className="p-4 rounded-lg bg-muted/30 border text-sm space-y-1">
                      <p className="font-medium">Summary</p>
                      <p className="text-muted-foreground">{analysis.filename} · {analysis.fileFormat.toUpperCase()} · {analysis.fileSizeKb} KB</p>
                      {analysis.totalRows > 0 && <p className="text-muted-foreground">{analysis.totalRows.toLocaleString()} rows · {analysis.totalCols} columns</p>}
                      <p className="text-muted-foreground">Quality: {analysis.quality.overallScore}/100 · {analysis.aiPowered ? "Claude-analyzed" : "Heuristic"}</p>
                    </div>
                    <div className="flex gap-3 justify-end">
                      <Button variant="outline" onClick={() => { setStep("idle"); setFile(null); setAnalysis(null); }}>Discard</Button>
                      <Button onClick={registerDataset} className="gap-2"><Star className="w-4 h-4" /> Register Dataset</Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <div className="flex justify-center">
              <Button variant="ghost" size="sm" onClick={() => { setStep("idle"); setFile(null); setAnalysis(null); }}>
                <RefreshCw className="w-4 h-4 mr-2" /> Analyze Another File
              </Button>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
