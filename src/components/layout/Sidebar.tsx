import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FractalBadge } from "@/components/fractal";
import { usePlatformMetrics } from "@/hooks/usePlatformMetrics";
import {
  LayoutDashboard,
  FolderOpen,
  Database,
  Scale,
  AlertCircle,
  ShieldAlert,
  Lock,
  Eye,
  Settings,
  ChevronLeft,
  ChevronRight,
  Shield,
  GitBranch,
  Users,
  Activity,
  FileText,
  Bell,
  BookOpen,
  Play,
  FlaskConical,
  Terminal,
  Radar,
  Workflow,
  BarChart3,
  FileCheck,
} from "lucide-react";

const navItems = [
  { path: "/", icon: LayoutDashboard, label: "Command Center" },
  { path: "/rai-dashboard", icon: Radar, label: "RAI Dashboard" },
  { divider: true, label: "Monitor" },
  { path: "/observability", icon: Activity, label: "Observability" },
  { path: "/live-logs", icon: Terminal, label: "Live Telemetry" },
  { path: "/alerts", icon: Bell, label: "Alerts" },
  { divider: true, label: "Govern" },
  { path: "/governance/approvals", icon: Shield, label: "Approvals", showBadge: true },
  { path: "/decision-ledger", icon: FileText, label: "Decision Ledger" },
  { path: "/decision-appeals", icon: Users, label: "Appeals" },
  { path: "/mlops-audit", icon: Workflow, label: "MLOps Audit" },
  { path: "/hitl", icon: Users, label: "HITL Console" },
  { path: "/incidents", icon: AlertCircle, label: "Incidents" },
  { path: "/lineage", icon: GitBranch, label: "Knowledge Graph" },
  { divider: true, label: "Evaluate" },
  { path: "/engine/fairness", icon: Scale, label: "Fairness" },
  { path: "/engine/hallucination", icon: AlertCircle, label: "Hallucination" },
  { path: "/engine/toxicity", icon: ShieldAlert, label: "Toxicity" },
  { path: "/engine/privacy", icon: Lock, label: "Privacy" },
  { path: "/engine/explainability", icon: Eye, label: "Explainability" },
  { path: "/engine/data-quality", icon: Database, label: "Data Quality" },
  { path: "/data-quality-dashboard", icon: FileCheck, label: "Quality Audit" },
  { divider: true, label: "Respond" },
  { path: "/policy", icon: FileText, label: "Policy Studio" },
  { path: "/data-contracts", icon: FileText, label: "Data Contracts" },
  { path: "/golden", icon: Play, label: "Golden Demo" },
  { path: "/run-tests", icon: FlaskConical, label: "Run Tests" },
  { divider: true, label: "Impact" },
  { path: "/impact-dashboard", icon: BarChart3, label: "Impact Dashboard" },
  { path: "/regulatory-reports", icon: FileCheck, label: "Regulatory Reports" },
  { divider: true, label: "Configure" },
  { path: "/projects", icon: FolderOpen, label: "Projects" },
  { path: "/models", icon: Database, label: "Models" },
  { path: "/demo-seed", icon: FlaskConical, label: "Demo Seeder" },
  { path: "/target-state", icon: FileCheck, label: "Target State" },
  { path: "/security-architecture", icon: Shield, label: "Security" },
  { path: "/settings", icon: Settings, label: "Settings" },
  { path: "/docs", icon: BookOpen, label: "Documentation" },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { data: metrics } = usePlatformMetrics();

  const pendingApprovals = metrics?.pendingApprovals || 0;

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 flex flex-col",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">F</span>
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-bold text-foreground text-base tracking-tight">Fractal RAI</span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {navItems.map((item, index) => {
          if (item.divider) {
            if (collapsed) return null;
            return (
              <div key={`divider-${index}`} className="mt-4 mb-2 px-3">
                <span className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider">
                  {item.label}
                </span>
              </div>
            );
          }

          const isActive = location.pathname === item.path || 
            (item.path !== "/" && location.pathname.startsWith(item.path!));
          const Icon = item.icon!;

          return (
            <NavLink key={item.path} to={item.path!}>
              <div
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 mb-0.5",
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground",
                  collapsed && "justify-center px-2"
                )}
              >
                <Icon className={cn("w-4 h-4 shrink-0", isActive && "text-primary")} />
                {!collapsed && (
                  <span className="truncate flex-1">{item.label}</span>
                )}
                {!collapsed && item.showBadge && pendingApprovals > 0 && (
                  <FractalBadge 
                    type="risk" 
                    severity="high" 
                    label={pendingApprovals.toString()} 
                    size="sm"
                    showIcon={false}
                  />
                )}
              </div>
            </NavLink>
          );
        })}
      </nav>

      {/* Collapse Button */}
      <div className="p-3 border-t border-sidebar-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className={cn("w-full h-8", collapsed && "justify-center px-0")}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span>Collapse</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}
