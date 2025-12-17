import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, Download, Shield, Hash, Clock, CheckCircle, Cpu, ExternalLink, AlertTriangle, Scale } from "lucide-react";
import { toast } from "sonner";

interface ModelInfo {
  id: string;
  version: string;
  latency_ms?: number;
}

interface WeightedMetrics {
  [key: string]: number;
}

interface EvidencePackageProps {
  mode?: 'full' | 'download';
  data: {
    results: any;
    rawLogs: any[];
    modelId: string;
    evaluationType?: string;
    hfModels?: ModelInfo[];
    weightedMetrics?: WeightedMetrics;
    weightedFormula?: string;
    overallScore?: number;
    isCompliant?: boolean;
    complianceThreshold?: number;
  };
}

// 2025 SOTA Weighted formulas per engine
const WEIGHTED_FORMULAS: Record<string, { formula: string; weights: Record<string, number> }> = {
  fairness: {
    formula: "0.25×DP + 0.25×EO + 0.25×EOdds + 0.15×GLR + 0.10×Bias",
    weights: { dp: 0.25, eo: 0.25, eodds: 0.25, glr: 0.15, bias: 0.10 }
  },
  hallucination: {
    formula: "0.30×Resp + 0.25×Claim + 0.25×Faith + 0.10×Span + 0.10×Abstain",
    weights: { resp: 0.30, claim: 0.25, faith: 0.25, span: 0.10, abstain: 0.10 }
  },
  toxicity: {
    formula: "0.30×Overall + 0.25×Severe + 0.20×Diff + 0.15×Topic + 0.10×Guard",
    weights: { overall: 0.30, severe: 0.25, diff: 0.20, topic: 0.15, guard: 0.10 }
  },
  privacy: {
    formula: "0.30×PII + 0.20×PHI + 0.20×Redact + 0.20×Secrets + 0.10×Min",
    weights: { pii: 0.30, phi: 0.20, redact: 0.20, secrets: 0.20, min: 0.10 }
  },
  explainability: {
    formula: "0.30×Clarity + 0.30×Faith + 0.20×Coverage + 0.10×Action + 0.10×Simple",
    weights: { clarity: 0.30, faith: 0.30, coverage: 0.20, action: 0.10, simple: 0.10 }
  },
};

// HuggingFace model mappings for each engine type
const HF_MODEL_MAP: Record<string, ModelInfo> = {
  toxicity: { id: "ml6team/toxic-comment-classification", version: "latest" },
  privacy: { id: "obi/deid_roberta_i2b2", version: "latest" },
  hallucination: { id: "vectara/hallucination_evaluation_model", version: "latest" },
  fairness: { id: "AIF360 (statistical)", version: "0.5.1" },
  explainability: { id: "Lovable AI (Gemini 2.5 Pro)", version: "latest" },
};

export function EvidencePackage({ data, mode = 'full' }: EvidencePackageProps) {
  const [downloading, setDownloading] = useState(false);

  const engineType = data.evaluationType || "fairness";
  const formulaInfo = WEIGHTED_FORMULAS[engineType] || WEIGHTED_FORMULAS.fairness;
  const isCompliant = data.isCompliant ?? (data.overallScore !== undefined ? data.overallScore >= 70 : true);
  const threshold = data.complianceThreshold ?? 70;

  // Generate SHA-256 hash
  const generateHash = async (content: string): Promise<string> => {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  };

  // Get HF models for this evaluation type
  const getModelsUsed = (): ModelInfo[] => {
    if (data.hfModels && data.hfModels.length > 0) {
      return data.hfModels;
    }
    const model = HF_MODEL_MAP[engineType];
    return model ? [model] : [];
  };

  const modelsUsed = getModelsUsed();

  const downloadEvidence = async () => {
    setDownloading(true);
    try {
      const timestamp = new Date().toISOString();
      const evidenceContent = JSON.stringify(
        {
          metadata: {
            generatedAt: timestamp,
            evaluationType: engineType,
            modelId: data.modelId,
            version: "2.0.0",
            platform: "Fractal RAI-OS",
            specification: "2025 SOTA Responsible AI Metrics",
            huggingface_models: modelsUsed,
          },
          compliance: {
            overall_score: data.overallScore || data.results?.overall_score,
            threshold: threshold,
            is_compliant: isCompliant,
            status: isCompliant ? "COMPLIANT" : "NON-COMPLIANT",
            regulatory_alignment: ["EU AI Act Article 10", "NIST AI RMF 1.0", "ISO/IEC 42001"],
          },
          weighted_formula: {
            formula: data.weightedFormula || formulaInfo.formula,
            weights: formulaInfo.weights,
            metrics: data.weightedMetrics || data.results?.weighted_metrics,
          },
          model_provenance: {
            evaluation_models: modelsUsed.map(m => ({
              model_id: m.id,
              version: m.version,
              inference_latency_ms: m.latency_ms || null,
              model_card_url: m.id.includes("/") 
                ? `https://huggingface.co/${m.id}` 
                : null,
            })),
          },
          results: data.results,
          rawLogs: data.rawLogs,
        },
        null,
        2
      );

      const hash = await generateHash(evidenceContent);
      
      const fullPackage = JSON.stringify(
        {
          ...JSON.parse(evidenceContent),
          integrity: {
            algorithm: "SHA-256",
            hash: hash,
            generatedAt: timestamp,
            verification_instructions: "Recompute SHA-256 of the evidence content (excluding integrity block) to verify.",
          },
        },
        null,
        2
      );

      const blob = new Blob([fullPackage], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `evidence-${engineType}-${data.modelId}-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Evidence package downloaded with 2025 SOTA metrics, weighted formula, and SHA-256 hash");
    } catch (error) {
      toast.error("Failed to generate evidence package");
    } finally {
      setDownloading(false);
    }
  };

  const packageSize = new Blob([JSON.stringify(data)]).size;
  const formattedSize =
    packageSize > 1024
      ? `${(packageSize / 1024).toFixed(1)} KB`
      : `${packageSize} bytes`;

  if (mode === 'download') {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="w-5 h-5 text-primary" />
            Evidence Package
            <Badge variant="outline" className="ml-2">
              <Shield className="w-3 h-3 mr-1" />
              Tamper-Evident
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.overallScore !== undefined && (
            <div
              className={`p-3 rounded-lg border ${
                isCompliant
                  ? 'bg-success/10 border-success/20'
                  : 'bg-danger/10 border-danger/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isCompliant ? (
                    <CheckCircle className="w-5 h-5 text-success" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-danger" />
                  )}
                  <span
                    className={`font-semibold ${
                      isCompliant ? 'text-success' : 'text-danger'
                    }`}
                  >
                    {isCompliant ? 'COMPLIANT' : 'NON-COMPLIANT'}
                  </span>
                </div>
                <Badge className={isCompliant ? 'bg-success' : 'bg-danger'}>
                  {data.overallScore}% / {threshold}%
                </Badge>
              </div>
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            Includes SHA-256 integrity hash, model provenance, weighted formula, and raw evaluation logs. Size: {formattedSize}
          </div>

          <Button
            onClick={downloadEvidence}
            disabled={downloading}
            className="w-full gap-2"
          >
            <Download className="w-4 h-4" />
            {downloading ? 'Generating...' : 'Download Evidence (JSON)'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Package className="w-5 h-5 text-primary" />
          Evidence Package
          <Badge variant="outline" className="ml-2">
            <Shield className="w-3 h-3 mr-1" />
            Tamper-Evident
          </Badge>
          <Badge variant="outline" className="text-xs">
            2025 SOTA
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Compliance Status Banner */}
        {data.overallScore !== undefined && (
          <div className={`mb-4 p-3 rounded-lg border ${
            isCompliant 
              ? "bg-success/10 border-success/20" 
              : "bg-danger/10 border-danger/20"
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isCompliant ? (
                  <CheckCircle className="w-5 h-5 text-success" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-danger" />
                )}
                <span className={`font-semibold ${isCompliant ? "text-success" : "text-danger"}`}>
                  {isCompliant ? "COMPLIANT" : "NON-COMPLIANT"}
                </span>
              </div>
              <Badge className={isCompliant ? "bg-success" : "bg-danger"}>
                {data.overallScore}% / {threshold}%
              </Badge>
            </div>
          </div>
        )}

        {/* Weighted Formula */}
        <div className="mb-4 p-3 bg-muted/50 border border-border rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Scale className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Weighted Formula ({engineType})</span>
          </div>
          <code className="text-xs text-muted-foreground block">
            {data.weightedFormula || formulaInfo.formula}
          </code>
          {data.weightedMetrics && (
            <div className="mt-2 grid grid-cols-5 gap-1 text-xs">
              {Object.entries(data.weightedMetrics).map(([key, value]) => (
                <div key={key} className="text-center p-1 bg-background rounded">
                  <span className="text-muted-foreground uppercase">{key}</span>
                  <span className="block font-medium">{((value as number) * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* HuggingFace Model Info */}
        {modelsUsed.length > 0 && (
          <div className="mb-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Cpu className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Powered by Open-Source Models</span>
            </div>
            <div className="space-y-1">
              {modelsUsed.map((model, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <code className="text-muted-foreground">{model.id}</code>
                  {model.id.includes("/") && (
                    <a 
                      href={`https://huggingface.co/${model.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Model Card
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <Hash className="w-4 h-4 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Integrity</p>
              <p className="text-sm font-medium">SHA-256</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <Clock className="w-4 h-4 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Timestamp</p>
              <p className="text-sm font-medium">ISO 8601</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <Package className="w-4 h-4 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Size</p>
              <p className="text-sm font-medium">{formattedSize}</p>
            </div>
          </div>
        </div>

        <div className="p-3 bg-success/10 border border-success/20 rounded-lg mb-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-success" />
            <span className="text-sm font-medium text-success">
              Ready for Export
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Package includes: 2025 SOTA weighted metrics, formula computation, evaluation results, 
            raw computation logs, HuggingFace model provenance, compliance status, 
            and cryptographic SHA-256 hash for audit verification.
          </p>
        </div>

        <Button
          onClick={downloadEvidence}
          disabled={downloading}
          className="w-full gap-2"
        >
          <Download className="w-4 h-4" />
          {downloading ? "Generating..." : "Download Evidence Package (JSON)"}
        </Button>
      </CardContent>
    </Card>
  );
}
