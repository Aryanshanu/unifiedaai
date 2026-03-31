import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSidebarContext } from "@/contexts/SidebarContext";
import { useAuth } from "@/hooks/useAuth";
import { canAccessSection } from "@/lib/role-personas";
import {
  LayoutDashboard, FolderOpen, Database, Scale, AlertCircle,
  ShieldAlert, Lock, Eye, Settings, ChevronLeft, ChevronRight,
  Shield, GitBranch, Users, Activity, FileText, Bell, BookOpen,
  ScanSearch, FlaskConical, Target, Bot, Clock, Server, Layers,
} from "lucide-react";

interface NavItem {
  path?: string;
  icon?: any;
  label: string;
  divider?: boolean;
}

const navItems: NavItem[] = [
  { path: "/", icon: LayoutDashboard, label: "Command Center" },
  { divider: true, label: "AUDIT" },
  { path: "/discovery", icon: ScanSearch, label: "System Audit" },
  { path: "/agents", icon: Bot, label: "Controller Governance" },
  { divider: true, label: "Monitor" },
  { path: "/observability", icon: Activity, label: "Observability" },
  { path: "/alerts", icon: Bell, label: "Alerts" },
  { path: "/continuous-validation", icon: Clock, label: "Ongoing Validation" },
  { divider: true, label: "Govern" },
  { path: "/governance/approvals", icon: Shield, label: "Approvals" },
  { path: "/oversight", icon: Users, label: "Oversight Console" },
  { path: "/anomalies", icon: AlertCircle, label: "Anomalies" },
  { path: "/lineage", icon: GitBranch, label: "Knowledge Graph" },
  { path: "/validation", icon: FlaskConical, label: "Validation Hub" },
  { path: "/impact", icon: Target, label: "Impact Dashboard" },
  { path: "/runbooks", icon: BookOpen, label: "Runbooks" },
  { path: "/policy", icon: FileText, label: "Policy Studio" },
  { path: "/regulatory-reports", icon: FileText, label: "Regulatory Reports" },
  { divider: true, label: "DATA GOVERNANCE" },
  { path: "/engine/data-quality", icon: Database, label: "Data Quality Engine" },
  { path: "/data-contracts", icon: FileText, label: "Data Contracts" },
  { path: "/semantic-definitions", icon: BookOpen, label: "Semantic Layer" },
  { path: "/semantic-hub", icon: Database, label: "Feature Store" },
  { divider: true, label: "LOGIC GOVERNANCE" },
  { path: "/engine/fairness", icon: Scale, label: "Bias Mitigation" },
  { path: "/engine/hallucination", icon: AlertCircle, label: "Factuality Auditor" },
  { path: "/engine/toxicity", icon: ShieldAlert, label: "Safety Engine" },
  { path: "/engine/privacy", icon: Lock, label: "Data Protection" },
  { path: "/engine/explainability", icon: Eye, label: "Logic Transparency" },
  { divider: true, label: "CORE SECURITY" },
  { path: "/security", icon: Shield, label: "Security Dashboard" },
  { path: "/security/pentest", icon: ScanSearch, label: "System Hardening" },
  { path: "/security/jailbreak", icon: FlaskConical, label: "Constraint Testing" },
  { path: "/security/threats", icon: Target, label: "Threat Modeling" },
  { divider: true, label: "Configure" },
  { path: "/projects", icon: FolderOpen, label: "Projects" },
  { path: "/engines", icon: Database, label: "Logic Engines" },
  { path: "/benchmarks", icon: Layers, label: "Stability Benchmarks" },
  { path: "/simulation", icon: FlaskConical, label: "Lifecycle Simulation" },
  { path: "/environments", icon: Server, label: "Environments" },
  { path: "/settings", icon: Settings, label: "Settings" },
  { path: "/docs", icon: BookOpen, label: "Documentation" },
];

export function Sidebar() {
  const { collapsed, toggle } = useSidebarContext();
  const location = useLocation();
  const { persona } = useAuth();

  const sidebarSections = persona.sidebarSections;

  // Filter nav items based on role's allowed sections
  const filteredItems = filterNavItems(navItems, sidebarSections);

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
              <span className="font-bold text-foreground text-sm tracking-tight">UnifiedAAI System</span>
              <Badge variant="outline" className="text-[9px] h-4 px-1.5 w-fit capitalize mt-0.5">
                {persona.displayName}
              </Badge>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {filteredItems.map((item, index) => {
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
          onClick={toggle}
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

/** Filters nav items to only show sections allowed for the role */
function filterNavItems(items: NavItem[], sidebarSections: string[]): NavItem[] {
  if (sidebarSections.includes('all')) return items;

  const result: NavItem[] = [];
  let currentSectionAllowed = true; // Command Center (before first divider) is always allowed

  for (const item of items) {
    if (item.divider) {
      currentSectionAllowed = canAccessSection(sidebarSections, item.label);
      if (currentSectionAllowed) {
        result.push(item);
      }
    } else if (item.path === '/') {
      // Command Center always visible
      result.push(item);
    } else if (item.path === '/docs') {
      // Docs visible for roles with 'docs' section
      if (sidebarSections.includes('docs') || currentSectionAllowed) {
        result.push(item);
      }
    } else if (currentSectionAllowed) {
      result.push(item);
    }
  }

  return result;
}
