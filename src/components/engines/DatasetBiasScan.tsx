import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { 
  Scale, AlertTriangle, CheckCircle, Loader2, 
  Users, TrendingDown, BarChart3, Info
} from "lucide-react";

interface BiasReport {
  dataset_id: string;
  dataset_name: string;
  scan_timestamp: string;
  overall_bias_score: number;
  demographic_skew: {
    column: string;
    skew_ratio: number;
    dominant_value: string;
    representation: Record<string, number>;
  }[];
  class_imbalance: {
    column: string;
    imbalance_ratio: number;
    classes: Record<string, number>;
  }[];
  missing_patterns: {
    column: string;
    missing_rate: number;
    pattern_type: string;
  }[];
  recommendations: string[];
}

export function DatasetBiasScan() {
  const [selectedDataset, setSelectedDataset] = useState<string>("");
  const [biasReport, setBiasReport] = useState<BiasReport | null>(null);
  const queryClient = useQueryClient();

  const { data: datasets, isLoading: datasetsLoading } = useQuery({
    queryKey: ["datasets-for-bias-scan"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("datasets")
        .select("id, name, row_count")
        .order("name");
      
      if (error) throw error;
      return data;
    },
  });

  const runBiasScan = useMutation({
    mutationFn: async (datasetId: string) => {
      // Simulate bias scan - in production this would call an edge function
      const dataset = datasets?.find(d => d.id === datasetId);
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Generate simulated bias report
      const report: BiasReport = {
        dataset_id: datasetId,
        dataset_name: dataset?.name || "Unknown",
        scan_timestamp: new Date().toISOString(),
        overall_bias_score: Math.floor(Math.random() * 30) + 70, // 70-100
        demographic_skew: [
          {
            column: "gender",
            skew_ratio: 0.65,
            dominant_value: "Male",
            representation: { Male: 65, Female: 32, Other: 3 }
          },
          {
            column: "age_group",
            skew_ratio: 0.45,
            dominant_value: "25-34",
            representation: { "18-24": 15, "25-34": 45, "35-44": 25, "45+": 15 }
          }
        ],
        class_imbalance: [
          {
            column: "outcome",
            imbalance_ratio: 0.8,
            classes: { approved: 80, rejected: 20 }
          }
        ],
        missing_patterns: [
          {
            column: "income",
            missing_rate: 12.5,
            pattern_type: "MNAR" // Missing Not At Random
          }
        ],
        recommendations: [
          "Consider oversampling underrepresented gender groups",
          "Age distribution shows skew towards 25-34 - validate if representative of target population",
          "Class imbalance in outcome variable may require resampling techniques",
          "Investigate missing pattern in income column - may introduce bias"
        ]
      };
      
      return report;
    },
    onSuccess: (report) => {
      setBiasReport(report);
      toast.success("Bias scan completed");
    },
    onError: (error: Error) => {
      toast.error("Bias scan failed", { description: error.message });
    },
  });

  const getBiasLevel = (score: number) => {
    if (score >= 90) return { label: "Low Risk", color: "text-success", bg: "bg-success/10" };
    if (score >= 75) return { label: "Medium Risk", color: "text-warning", bg: "bg-warning/10" };
    return { label: "High Risk", color: "text-destructive", bg: "bg-destructive/10" };
  };

  return (
    <div className="space-y-6">
      {/* Scan Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            Pre-AI Bias Scan
          </CardTitle>
          <CardDescription>
            Detect demographic skew, class imbalance, and missing patterns before AI training
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Select value={selectedDataset} onValueChange={setSelectedDataset}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a dataset to scan" />
                </SelectTrigger>
                <SelectContent>
                  {datasets?.map((dataset) => (
                    <SelectItem key={dataset.id} value={dataset.id}>
                      {dataset.name} ({(dataset.row_count || 0).toLocaleString()} rows)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() => runBiasScan.mutate(selectedDataset)}
              disabled={!selectedDataset || runBiasScan.isPending}
            >
              {runBiasScan.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Scanning...
                </>
              ) : (
                <>
                  <Scale className="h-4 w-4 mr-2" />
                  Run Bias Scan
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bias Report */}
      {biasReport && (
        <div className="space-y-4">
          {/* Overall Score */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold">{biasReport.dataset_name}</h3>
                  <p className="text-sm text-muted-foreground">
                    Scanned: {new Date(biasReport.scan_timestamp).toLocaleString()}
                  </p>
                </div>
                <div className={`p-4 rounded-xl ${getBiasLevel(biasReport.overall_bias_score).bg}`}>
                  <div className="text-center">
                    <p className={`text-3xl font-bold ${getBiasLevel(biasReport.overall_bias_score).color}`}>
                      {biasReport.overall_bias_score}%
                    </p>
                    <p className="text-sm font-medium">
                      {getBiasLevel(biasReport.overall_bias_score).label}
                    </p>
                  </div>
                </div>
              </div>
              <Progress value={biasReport.overall_bias_score} className="h-2" />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Demographic Skew */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Demographic Skew
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {biasReport.demographic_skew.map((skew, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium capitalize">{skew.column}</span>
                      <Badge variant={skew.skew_ratio > 0.5 ? "destructive" : "secondary"}>
                        {Math.round(skew.skew_ratio * 100)}% skewed
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {Object.entries(skew.representation).map(([key, value]) => (
                        <div key={key} className="flex-1">
                          <div className="text-xs text-muted-foreground mb-1">{key}</div>
                          <Progress value={value as number} className="h-1.5" />
                          <div className="text-xs text-center mt-0.5">{value}%</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Class Imbalance */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Class Imbalance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {biasReport.class_imbalance.map((imbalance, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium capitalize">{imbalance.column}</span>
                      <Badge variant={imbalance.imbalance_ratio > 0.7 ? "destructive" : "secondary"}>
                        {Math.round(imbalance.imbalance_ratio * 100)}% imbalanced
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {Object.entries(imbalance.classes).map(([key, value]) => (
                        <div key={key} className="flex-1">
                          <div className="text-xs text-muted-foreground mb-1 capitalize">{key}</div>
                          <Progress value={value as number} className="h-1.5" />
                          <div className="text-xs text-center mt-0.5">{value}%</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Missing Patterns */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingDown className="h-4 w-4" />
                Missing Value Patterns
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {biasReport.missing_patterns.map((pattern, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-4 w-4 text-warning" />
                      <div>
                        <p className="font-medium capitalize">{pattern.column}</p>
                        <p className="text-sm text-muted-foreground">
                          Pattern: {pattern.pattern_type}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline">{pattern.missing_rate}% missing</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Info className="h-4 w-4" />
                Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {biasReport.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
