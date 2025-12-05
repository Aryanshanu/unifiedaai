import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { FileText, Download, ExternalLink, Plus, Calendar, Filter, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEvaluationRuns } from "@/hooks/useEvaluations";
import { useAttestations } from "@/hooks/useGovernance";
import { useModels } from "@/hooks/useModels";
import { useMemo } from "react";
import { format } from "date-fns";

const typeColors: Record<string, string> = {
  Evaluation: "bg-primary/10 text-primary",
  Compliance: "bg-success/10 text-success",
  Risk: "bg-warning/10 text-warning",
  Safety: "bg-accent/10 text-accent",
  Attestation: "bg-blue-500/10 text-blue-400",
};

export default function Reports() {
  const { data: evaluations, isLoading: evalsLoading } = useEvaluationRuns();
  const { data: attestations, isLoading: attestLoading } = useAttestations();
  const { data: models } = useModels();

  const isLoading = evalsLoading || attestLoading;

  const getModelName = (modelId: string | null) => {
    if (!modelId || !models) return 'Unknown Model';
    const model = models.find(m => m.id === modelId);
    return model?.name || 'Unknown Model';
  };

  const getStatus = (score: number | null): 'healthy' | 'warning' | 'critical' => {
    if (score === null) return 'warning';
    if (score >= 80) return 'healthy';
    if (score >= 60) return 'warning';
    return 'critical';
  };

  // Transform evaluations and attestations into report format
  const reports = useMemo(() => {
    const evalReports = (evaluations || [])
      .filter(e => e.status === 'completed')
      .map(e => ({
        id: e.id,
        title: `${getModelName(e.model_id)} - Evaluation Report`,
        model: getModelName(e.model_id),
        type: 'Evaluation' as const,
        status: getStatus(e.overall_score),
        generatedAt: e.completed_at ? format(new Date(e.completed_at), 'MMM d, yyyy') : 'Pending',
        format: 'PDF',
      }));

    const attestReports = (attestations || []).map(a => ({
      id: a.id,
      title: a.title,
      model: getModelName(a.model_id),
      type: 'Attestation' as const,
      status: a.status === 'approved' ? 'compliant' as const : 
              a.status === 'rejected' ? 'critical' as const : 'warning' as const,
      generatedAt: a.signed_at ? format(new Date(a.signed_at), 'MMM d, yyyy') : 
                   format(new Date(a.created_at), 'MMM d, yyyy'),
      format: 'PDF',
    }));

    return [...evalReports, ...attestReports].sort((a, b) => 
      new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
    );
  }, [evaluations, attestations, models]);

  return (
    <MainLayout title="Scorecards & Reports" subtitle="Legal-grade evaluation reports, compliance attestations, and audit evidence">
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex items-center gap-2 flex-1">
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
          <Button variant="outline" size="sm">
            <Calendar className="w-4 h-4 mr-2" />
            Date Range
          </Button>
        </div>
        <Button variant="gradient" size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Generate Report
        </Button>
      </div>

      {/* Reports Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : !reports.length ? (
        <div className="text-center py-24 text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No reports generated yet</p>
          <p className="text-sm">Complete evaluations and attestations to generate reports</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {reports.map((report) => (
            <div
              key={report.id}
              className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-[10px] px-2 py-0.5 rounded-full font-medium",
                    typeColors[report.type]
                  )}>
                    {report.type}
                  </span>
                  <StatusBadge status={report.status as any} size="sm" showDot={false} />
                </div>
              </div>

              <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                {report.title}
              </h3>
              <p className="text-xs text-muted-foreground mb-3">{report.model}</p>

              <div className="flex items-center justify-between pt-3 border-t border-border">
                <span className="text-xs text-muted-foreground">{report.generatedAt}</span>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="iconSm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="iconSm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick Generate Section */}
      <div className="mt-8 bg-card border border-border rounded-xl p-6">
        <h2 className="text-sm font-semibold text-foreground mb-4">Quick Generate</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Fairness Report", desc: "Bias analysis" },
            { label: "Compliance Check", desc: "Regulatory" },
            { label: "Safety Scorecard", desc: "LLM safety" },
            { label: "Audit Evidence", desc: "Full package" },
          ].map((item) => (
            <Button
              key={item.label}
              variant="outline"
              className="h-auto flex-col items-start p-4 hover:border-primary/50"
            >
              <span className="font-medium text-foreground">{item.label}</span>
              <span className="text-xs text-muted-foreground">{item.desc}</span>
            </Button>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
