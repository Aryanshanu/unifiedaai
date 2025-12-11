import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, Download, Shield, Hash, Clock, CheckCircle, Cpu, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface ModelInfo {
  id: string;
  version: string;
  latency_ms?: number;
}

interface EvidencePackageProps {
  data: {
    results: any;
    rawLogs: any[];
    modelId: string;
    evaluationType?: string;
    hfModels?: ModelInfo[];
  };
}

// HuggingFace model mappings for each engine type
const HF_MODEL_MAP: Record<string, ModelInfo> = {
  toxicity: { id: "ml6team/toxic-comment-classification", version: "latest" },
  privacy: { id: "obi/deid_roberta_i2b2", version: "latest" },
  hallucination: { id: "vectara/hallucination_evaluation_model", version: "latest" },
  fairness: { id: "AIF360 (statistical)", version: "0.5.1" },
  explainability: { id: "SHAP + LLM Analysis", version: "latest" },
};

export function EvidencePackage({ data }: EvidencePackageProps) {
  const [downloading, setDownloading] = useState(false);

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
    const engineType = data.evaluationType || "fairness";
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
            evaluationType: data.evaluationType || "fairness",
            modelId: data.modelId,
            version: "1.0.0",
            platform: "Fractal RAI-OS",
            huggingface_models: modelsUsed,
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
          },
        },
        null,
        2
      );

      const blob = new Blob([fullPackage], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `evidence-${data.modelId}-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Evidence package downloaded with SHA-256 hash and HuggingFace model provenance");
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
      <CardContent>
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
            Package includes: evaluation results, raw computation logs, HuggingFace model provenance,
            and cryptographic hash for audit verification.
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
