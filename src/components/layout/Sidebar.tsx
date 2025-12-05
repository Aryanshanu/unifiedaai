import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Database,
  Activity,
  Shield,
  Users,
  GitBranch,
  Lock,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  Hexagon,
} from "lucide-react";

const navItems = [
  { path: "/", icon: LayoutDashboard, label: "Control Tower", section: "main" },
  { path: "/models", icon: Database, label: "Model Registry", section: "main" },
  { path: "/evaluation", icon: Activity, label: "Evaluation Hub", section: "pillars" },
  { path: "/observability", icon: Activity, label: "Observability", section: "pillars" },
  { path: "/governance", icon: Shield, label: "Governance", section: "pillars" },
  { path: "/hitl", icon: Users, label: "HITL Console", section: "pillars" },
  { path: "/lineage", icon: GitBranch, label: "Knowledge Graph", section: "pillars" },
  { path: "/policy", icon: Lock, label: "Policy Studio", section: "pillars" },
  { path: "/reports", icon: FileText, label: "Scorecards", section: "reports" },
  { path: "/settings", icon: Settings, label: "Settings", section: "system" },
];

const sections = {
  main: "Overview",
  pillars: "Core Pillars",
  reports: "Reports",
  system: "System",
};

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const groupedNav = navItems.reduce((acc, item) => {
    if (!acc[item.section]) acc[item.section] = [];
    acc[item.section].push(item);
    return acc;
  }, {} as Record<string, typeof navItems>);

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
          <div className="w-9 h-9 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow">
            <Hexagon className="w-5 h-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-bold text-foreground text-sm">Fractal</span>
              <span className="text-[10px] text-primary font-medium tracking-wider">RAI OS</span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {Object.entries(groupedNav).map(([section, items]) => (
          <div key={section} className="mb-6">
            {!collapsed && (
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2 block">
                {sections[section as keyof typeof sections]}
              </span>
            )}
            <div className="space-y-1">
              {items.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <NavLink key={item.path} to={item.path}>
                    <Button
                      variant={isActive ? "navActive" : "nav"}
                      size="default"
                      className={cn(
                        collapsed && "justify-center px-0",
                        "h-10"
                      )}
                    >
                      <item.icon className={cn("w-4 h-4 shrink-0", isActive && "text-primary")} />
                      {!collapsed && <span>{item.label}</span>}
                    </Button>
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Collapse Button */}
      <div className="p-3 border-t border-sidebar-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className={cn("w-full", collapsed && "justify-center px-0")}
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
