import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { FileText, Download, ExternalLink, Plus, Calendar, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

const scorecards = [
  { id: "SC-001", title: "Credit Scoring v2 - Full Evaluation", model: "Credit Scoring v2", type: "Evaluation", status: "warning", generatedAt: "Dec 3, 2024", format: "PDF" },
  { id: "SC-002", title: "EU AI Act Compliance Report", model: "All High-Risk", type: "Compliance", status: "compliant", generatedAt: "Dec 1, 2024", format: "PDF" },
  { id: "SC-003", title: "Fraud Detection v3 - Fairness Analysis", model: "Fraud Detection v3", type: "Evaluation", status: "healthy", generatedAt: "Nov 28, 2024", format: "PDF" },
  { id: "SC-004", title: "Monthly Risk Assessment - November", model: "Portfolio", type: "Risk", status: "warning", generatedAt: "Nov 30, 2024", format: "PDF" },
  { id: "SC-005", title: "Support Chatbot - LLM Safety Report", model: "Support Chatbot", type: "Safety", status: "healthy", generatedAt: "Nov 25, 2024", format: "PDF" },
  { id: "SC-006", title: "HIPAA Compliance Attestation", model: "Healthcare Models", type: "Attestation", status: "compliant", generatedAt: "Nov 20, 2024", format: "PDF" },
];

const typeColors = {
  Evaluation: "bg-primary/10 text-primary",
  Compliance: "bg-success/10 text-success",
  Risk: "bg-warning/10 text-warning",
  Safety: "bg-accent/10 text-accent",
  Attestation: "bg-blue-500/10 text-blue-400",
};

export default function Reports() {
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
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {scorecards.map((report) => (
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
                  typeColors[report.type as keyof typeof typeColors]
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
