import { MainLayout } from "@/components/layout/MainLayout";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { ComplianceGauge } from "@/components/dashboard/ComplianceGauge";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Button } from "@/components/ui/button";
import { Shield, FileCheck, Download, ChevronRight, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

const controlGroups = [
  { name: "EU AI Act", satisfied: 42, total: 48 },
  { name: "NIST AI RMF", satisfied: 38, total: 42 },
  { name: "ISO/IEC 42001", satisfied: 31, total: 35 },
];

const pendingControls = [
  { id: "C-EU-12", framework: "EU AI Act", title: "Human oversight mechanisms for high-risk systems", severity: "high", dueDate: "Dec 15, 2024" },
  { id: "C-NIST-8", framework: "NIST AI RMF", title: "Continuous monitoring procedures documentation", severity: "medium", dueDate: "Dec 20, 2024" },
  { id: "C-ISO-5", framework: "ISO/IEC 42001", title: "AI system lifecycle documentation", severity: "low", dueDate: "Jan 5, 2025" },
];

const attestations = [
  { id: "ATT-001", title: "EU AI Act Compliance - Q4 2024", status: "signed", signedBy: "J. Smith", date: "Nov 28, 2024" },
  { id: "ATT-002", title: "HIPAA AI Assessment", status: "pending", signedBy: null, date: "Dec 1, 2024" },
  { id: "ATT-003", title: "SOC 2 AI Controls", status: "signed", signedBy: "M. Johnson", date: "Nov 15, 2024" },
];

export default function Governance() {
  return (
    <MainLayout title="Governance & Compliance" subtitle="Regulatory controls, risk assessments, and compliance attestations">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Overall Score"
          value="87%"
          subtitle="111 of 125 controls"
          icon={<Shield className="w-4 h-4 text-success" />}
          status="success"
          trend={{ value: 5, direction: "up" }}
        />
        <MetricCard
          title="Pending Controls"
          value="14"
          subtitle="3 high priority"
          icon={<FileCheck className="w-4 h-4 text-warning" />}
          status="warning"
        />
        <MetricCard
          title="Attestations"
          value="8"
          subtitle="2 pending signature"
          icon={<FileCheck className="w-4 h-4 text-primary" />}
        />
        <MetricCard
          title="Risk Score"
          value="Low"
          subtitle="Last assessed: 2d ago"
          status="success"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Compliance Overview */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              Compliance Posture by Framework
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {controlGroups.map((group) => {
                const pct = Math.round((group.satisfied / group.total) * 100);
                const status = pct >= 90 ? "success" : pct >= 70 ? "warning" : "danger";
                return (
                  <div key={group.name} className="bg-secondary/30 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium text-foreground">{group.name}</span>
                      <span className={cn(
                        "text-2xl font-bold font-mono",
                        status === "success" ? "text-success" : status === "warning" ? "text-warning" : "text-danger"
                      )}>
                        {pct}%
                      </span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          status === "success" ? "bg-success" : status === "warning" ? "bg-warning" : "bg-danger"
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {group.satisfied} of {group.total} controls satisfied
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pending Controls */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground">Pending Controls</h2>
              <Button variant="outline" size="sm">View All</Button>
            </div>

            <div className="space-y-3">
              {pendingControls.map((control) => (
                <div
                  key={control.id}
                  className="flex items-center gap-4 p-4 bg-secondary/30 rounded-xl hover:bg-secondary/50 transition-colors cursor-pointer"
                >
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    control.severity === "high" ? "bg-danger" : control.severity === "medium" ? "bg-warning" : "bg-muted-foreground"
                  )} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground">{control.id}</span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-primary">{control.framework}</span>
                    </div>
                    <p className="text-sm font-medium text-foreground truncate">{control.title}</p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">Due: {control.dueDate}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <ComplianceGauge overallScore={87} controlGroups={controlGroups} />

          {/* Attestations */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-sm font-semibold text-foreground mb-4">Recent Attestations</h3>
            <div className="space-y-3">
              {attestations.map((att) => (
                <div key={att.id} className="p-3 bg-secondary/30 rounded-lg">
                  <div className="flex items-start justify-between mb-1">
                    <span className="text-sm font-medium text-foreground">{att.title}</span>
                    <StatusBadge status={att.status === "signed" ? "compliant" : "pending"} size="sm" />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{att.date}</span>
                    {att.signedBy && (
                      <>
                        <span>•</span>
                        <span>Signed by {att.signedBy}</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Button variant="ghost" size="sm" className="h-7 text-xs">
                      <Download className="w-3 h-3 mr-1" />
                      Download
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs">
                      <ExternalLink className="w-3 h-3 mr-1" />
                      View
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
