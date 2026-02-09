/**
 * Fractal Design System - Single Source of Truth
 * 
 * This file defines the official Fractal risk vocabulary, colors, and visual language.
 * All risk/status displays across the platform MUST use these tokens.
 */

import {
  ShieldX,
  ShieldAlert,
  Shield,
  ShieldCheck,
  Lock,
  Unlock,
  CheckCircle2,
  XCircle,
  Clock,
  HelpCircle,
  type LucideIcon,
} from "lucide-react";

// =============================================================================
// RISK LEVELS - The Fractal Risk Language
// =============================================================================

export type RiskLevel = "critical" | "high" | "medium" | "low";

export interface RiskConfig {
  bg: string;
  text: string;
  border: string;
  icon: LucideIcon;
  label: string;
  description: string;
}

export const FRACTAL_RISK: Record<RiskLevel, RiskConfig> = {
  critical: {
    bg: "bg-risk-critical/10",
    text: "text-risk-critical",
    border: "border-risk-critical/30",
    icon: ShieldX,
    label: "Critical",
    description: "Immediate action required",
  },
  high: {
    bg: "bg-risk-high/10",
    text: "text-risk-high",
    border: "border-risk-high/30",
    icon: ShieldAlert,
    label: "High",
    description: "Action required within 24 hours",
  },
  medium: {
    bg: "bg-risk-medium/10",
    text: "text-risk-medium",
    border: "border-risk-medium/30",
    icon: Shield,
    label: "Medium",
    description: "Review within 7 days",
  },
  low: {
    bg: "bg-muted",
    text: "text-muted-foreground",
    border: "border-border",
    icon: ShieldCheck,
    label: "Low",
    description: "Monitor as normal",
  },
};

// =============================================================================
// COMPLIANCE STATUS
// =============================================================================

export type ComplianceLevel = "compliant" | "non-compliant" | "pending" | "not-assessed";

export interface ComplianceConfig {
  bg: string;
  text: string;
  border: string;
  icon: LucideIcon;
  label: string;
}

export const FRACTAL_COMPLIANCE: Record<ComplianceLevel, ComplianceConfig> = {
  compliant: {
    bg: "bg-success/10",
    text: "text-success",
    border: "border-success/30",
    icon: CheckCircle2,
    label: "Compliant",
  },
  "non-compliant": {
    bg: "bg-risk-critical/10",
    text: "text-risk-critical",
    border: "border-risk-critical/30",
    icon: XCircle,
    label: "Non-Compliant",
  },
  pending: {
    bg: "bg-risk-high/10",
    text: "text-risk-high",
    border: "border-risk-high/30",
    icon: Clock,
    label: "Pending Review",
  },
  "not-assessed": {
    bg: "bg-muted",
    text: "text-muted-foreground",
    border: "border-border",
    icon: HelpCircle,
    label: "Not Assessed",
  },
};

// =============================================================================
// GOVERNANCE STATUS
// =============================================================================

export type GovernanceStatus = "enforced" | "governed" | "locked" | "open";

export interface GovernanceConfig {
  bg: string;
  text: string;
  border: string;
  icon: LucideIcon;
  label: string;
}

export const FRACTAL_GOVERNANCE: Record<GovernanceStatus, GovernanceConfig> = {
  enforced: {
    bg: "bg-primary/10",
    text: "text-primary",
    border: "border-primary/30",
    icon: ShieldCheck,
    label: "Enforced",
  },
  governed: {
    bg: "bg-success/10",
    text: "text-success",
    border: "border-success/30",
    icon: Shield,
    label: "Governed",
  },
  locked: {
    bg: "bg-risk-high/10",
    text: "text-risk-high",
    border: "border-risk-high/30",
    icon: Lock,
    label: "Locked",
  },
  open: {
    bg: "bg-muted",
    text: "text-muted-foreground",
    border: "border-border",
    icon: Unlock,
    label: "Open",
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Normalize severity strings to RiskLevel
 */
export function normalizeRiskLevel(severity: string | null | undefined): RiskLevel {
  const normalized = severity?.toLowerCase();
  if (normalized === "critical") return "critical";
  if (normalized === "high") return "high";
  if (normalized === "medium") return "medium";
  return "low";
}

/**
 * Get risk config from any severity string
 */
export function getRiskConfig(severity: string | null | undefined): RiskConfig {
  return FRACTAL_RISK[normalizeRiskLevel(severity)];
}

/**
 * Get compliance config from any status string
 */
export function getComplianceConfig(status: string | null | undefined): ComplianceConfig {
  const normalized = status?.toLowerCase().replace(/[_\s]/g, "-") as ComplianceLevel;
  return FRACTAL_COMPLIANCE[normalized] || FRACTAL_COMPLIANCE["not-assessed"];
}

// =============================================================================
// CHART COLORS - CSS variable-based, theme-aware
// =============================================================================

export const CHART_COLORS = {
  primary: "hsl(var(--primary))",
  success: "hsl(var(--success))",
  warning: "hsl(173, 80%, 45%)", // Fractal teal accent
  danger: "hsl(var(--destructive))",
  muted: "hsl(var(--muted-foreground))",
  accent: "hsl(var(--accent))",
  riskCritical: "hsl(var(--risk-critical))",
  riskHigh: "hsl(var(--risk-high))",
  riskMedium: "hsl(var(--risk-medium))",
} as const;
