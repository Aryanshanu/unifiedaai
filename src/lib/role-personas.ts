import { Crown, ShieldCheck, Wrench, FileCheck, LucideIcon } from 'lucide-react';

export type AppRole = 'admin' | 'reviewer' | 'analyst' | 'viewer';

export interface PersonaConfig {
  role: AppRole;
  displayName: string;
  description: string;
  icon: LucideIcon;
  defaultRoute: string;
  dashboardLayout: 'executive' | 'governance' | 'technical' | 'compliance';
  sidebarSections: string[];
}

export const PERSONA_MAP: Record<AppRole, PersonaConfig> = {
  admin: {
    role: 'admin',
    displayName: 'Chief Data & AI Officer',
    description: 'Executive oversight of AI governance, risk posture, and compliance across the enterprise',
    icon: Crown,
    defaultRoute: '/',
    dashboardLayout: 'executive',
    sidebarSections: ['all'],
  },
  reviewer: {
    role: 'reviewer',
    displayName: 'AI Steward',
    description: 'Governance and risk management, policy enforcement, HITL reviews, and incident response',
    icon: ShieldCheck,
    defaultRoute: '/hitl',
    dashboardLayout: 'governance',
    sidebarSections: ['discover', 'monitor', 'govern', 'data-governance'],
  },
  analyst: {
    role: 'analyst',
    displayName: 'Agent Engineer',
    description: 'Technical configuration, model evaluation, security testing, and data quality operations',
    icon: Wrench,
    defaultRoute: '/projects',
    dashboardLayout: 'technical',
    sidebarSections: ['discover', 'monitor', 'core-rai', 'core-security', 'data-governance', 'configure'],
  },
  viewer: {
    role: 'viewer',
    displayName: 'Compliance Auditor',
    description: 'Regulatory compliance, audit trails, evidence packages, and attestation management',
    icon: FileCheck,
    defaultRoute: '/decision-ledger',
    dashboardLayout: 'compliance',
    sidebarSections: ['govern', 'data-governance', 'docs'],
  },
};

/** Map sidebar section labels to their key identifiers */
export const SECTION_KEY_MAP: Record<string, string> = {
  'DISCOVER': 'discover',
  'Monitor': 'monitor',
  'Govern': 'govern',
  'DATA GOVERNANCE': 'data-governance',
  'CORE RAI': 'core-rai',
  'CORE SECURITY': 'core-security',
  'Configure': 'configure',
};

export function getPersona(role: AppRole): PersonaConfig {
  return PERSONA_MAP[role] || PERSONA_MAP.viewer;
}

export function canAccessSection(sidebarSections: string[], sectionLabel: string): boolean {
  if (sidebarSections.includes('all')) return true;
  const key = SECTION_KEY_MAP[sectionLabel];
  if (!key) return true; // Command Center is always visible
  // Special case: docs is in 'configure' section but auditor gets it via 'docs'
  return sidebarSections.includes(key);
}
