import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Database,
  Scale,
  AlertCircle,
  ShieldAlert,
  Lock,
  Eye,
  Activity,
  MonitorDot,
  ClipboardCheck,
  Shield,
  FileText,
  Users,
  Brain,
  GitBranch,
  Target,
  FileCode,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const navItems = [
  { path: "/", icon: LayoutDashboard, label: "Control Tower" },
  { path: "/dashboard", icon: MonitorDot, label: "Dashboard" },
  { path: "/models", icon: Database, label: "Model Registry" },
  { divider: true, label: "Core Engines" },
  { path: "/evaluation/fairness", icon: Scale, label: "Fairness Engine" },
  { path: "/evaluation/hallucination", icon: AlertCircle, label: "Hallucination Engine" },
  { path: "/evaluation/toxicity", icon: ShieldAlert, label: "Toxicity Engine" },
  { path: "/evaluation/privacy", icon: Lock, label: "Privacy Engine" },
  { path: "/evaluation/explainability", icon: Eye, label: "Explainability Engine" },
  { divider: true, label: "Monitoring" },
  { path: "/observability", icon: Activity, label: "Real-Time Observability" },
  { path: "/monitoring", icon: MonitorDot, label: "Monitoring Dashboard" },
  { divider: true, label: "Governance" },
  { path: "/compliance", icon: ClipboardCheck, label: "Compliance Center" },
  { path: "/governance", icon: Shield, label: "Governance" },
  { path: "/reports", icon: FileText, label: "Reports & Scorecards" },
  { divider: true, label: "Operations" },
  { path: "/hitl", icon: Users, label: "Human-in-the-Loop" },
  { path: "/decision", icon: Brain, label: "Decision Intelligence" },
  { path: "/lineage", icon: GitBranch, label: "Knowledge Graph" },
  { divider: true, label: "Security" },
  { path: "/redteam", icon: Target, label: "Red-Team Orchestrator" },
  { path: "/policy", icon: FileCode, label: "Policy Enforcement" },
  { divider: true, label: "System" },
  { path: "/settings", icon: Settings, label: "Settings" },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

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
              <span className="font-bold text-foreground text-base tracking-tight">fractal</span>
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
                {!collapsed && <span className="truncate">{item.label}</span>}
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
