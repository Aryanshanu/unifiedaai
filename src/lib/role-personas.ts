import { Crown, ShieldCheck, Wrench, FileCheck, LucideIcon } from 'lucide-react';

export type AppRole = 'admin' | 'reviewer' | 'analyst' | 'viewer';

export interface PersonaConfig {
  role: AppRole;
  displayName: string;
  description: string;
  icon: LucideIcon;
  avatarEmoji: string;
  avatarGradient: string;
  borderColor: string;
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
    avatarEmoji: '👔',
    avatarGradient: 'from-blue-500 to-purple-600',
    borderColor: 'border-l-blue-500',
    defaultRoute: '/',
    dashboardLayout: 'executive',
    sidebarSections: ['all'],
  },
  reviewer: {
    role: 'reviewer',
    displayName: 'AI Steward',
    description: 'Governance and risk management, policy enforcement, HITL reviews, and incident response',
    icon: ShieldCheck,
    avatarEmoji: '🛡️',
    avatarGradient: 'from-emerald-500 to-teal-600',
    borderColor: 'border-l-emerald-500',
    defaultRoute: '/hitl',
    dashboardLayout: 'governance',
    sidebarSections: ['discover', 'monitor', 'govern', 'data-governance'],
  },
  analyst: {
    role: 'analyst',
    displayName: 'Agent Engineer',
    description: 'Technical configuration, model evaluation, security testing, and data quality operations',
    icon: Wrench,
    avatarEmoji: '⚙️',
    avatarGradient: 'from-orange-500 to-amber-600',
    borderColor: 'border-l-orange-500',
    defaultRoute: '/projects',
    dashboardLayout: 'technical',
    sidebarSections: ['discover', 'monitor', 'core-rai', 'core-security', 'data-governance', 'configure'],
  },
  viewer: {
    role: 'viewer',
    displayName: 'Compliance Auditor',
    description: 'Regulatory compliance, audit trails, evidence packages, and attestation management',
    icon: FileCheck,
    avatarEmoji: '📋',
    avatarGradient: 'from-rose-500 to-pink-600',
    borderColor: 'border-l-rose-500',
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

/**
 * Route-to-role access map.
 * Admin has access to everything, so is omitted (handled in code).
 * Each entry maps a route prefix to allowed non-admin roles.
 */
export const ROUTE_ACCESS_MAP: Record<string, AppRole[]> = {
  '/': ['admin', 'reviewer', 'analyst', 'viewer'],
  '/auth': ['admin', 'reviewer', 'analyst', 'viewer'],
  '/error': ['admin', 'reviewer', 'analyst', 'viewer'],

  // Discover & Monitor
  '/discovery': ['admin', 'reviewer', 'analyst'],
  '/agents': ['admin', 'reviewer', 'analyst'],
  '/observability': ['admin', 'reviewer', 'analyst'],
  '/alerts': ['admin', 'reviewer', 'analyst'],
  '/continuous-evaluation': ['admin', 'reviewer', 'analyst'],
  '/evaluation': ['admin', 'reviewer', 'analyst'],

  // Governance
  '/governance': ['admin', 'reviewer', 'viewer'],
  '/governance/approvals': ['admin', 'reviewer'],
  '/decision-ledger': ['admin', 'reviewer', 'viewer'],
  '/hitl': ['admin', 'reviewer', 'viewer'],
  '/incidents': ['admin', 'reviewer', 'viewer'],
  '/lineage': ['admin', 'reviewer', 'viewer'],
  '/governance-framework': ['admin', 'reviewer', 'viewer'],
  '/audit-center': ['admin', 'reviewer', 'viewer'],

  // Core RAI Engines
  '/engine/fairness': ['admin', 'analyst'],
  '/engine/hallucination': ['admin', 'analyst'],
  '/engine/toxicity': ['admin', 'analyst'],
  '/engine/privacy': ['admin', 'analyst'],
  '/engine/explainability': ['admin', 'analyst'],
  '/engine/data-quality': ['admin', 'reviewer', 'analyst', 'viewer'],

  // Core Security
  '/security': ['admin', 'analyst'],
  '/security/pentest': ['admin', 'analyst'],
  '/security/jailbreak': ['admin', 'analyst'],
  '/security/threats': ['admin', 'analyst'],

  // Data Governance
  '/data-contracts': ['admin', 'reviewer', 'analyst', 'viewer'],
  '/semantic-definitions': ['admin', 'reviewer', 'analyst', 'viewer'],
  '/semantic-hub': ['admin', 'reviewer', 'analyst', 'viewer'],

  // Registry
  '/projects': ['admin', 'analyst'],
  '/models': ['admin', 'analyst'],
  '/environments': ['admin', 'analyst'],

  // Configure
  '/settings': ['admin'],
  '/docs': ['admin', 'reviewer', 'analyst', 'viewer'],
};

/**
 * Check if a role can access a given pathname.
 * Uses longest-prefix matching.
 */
export function canAccessRoute(roles: AppRole[], pathname: string): boolean {
  if (roles.includes('admin')) return true;

  // Find the longest matching route key
  let bestMatch = '';
  for (const routeKey of Object.keys(ROUTE_ACCESS_MAP)) {
    if (pathname === routeKey || pathname.startsWith(routeKey + '/')) {
      if (routeKey.length > bestMatch.length) {
        bestMatch = routeKey;
      }
    }
  }

  // Exact match check
  if (ROUTE_ACCESS_MAP[pathname]) {
    return roles.some(r => ROUTE_ACCESS_MAP[pathname].includes(r));
  }

  if (bestMatch) {
    return roles.some(r => ROUTE_ACCESS_MAP[bestMatch].includes(r));
  }

  // Dynamic routes like /projects/:id or /models/:id - check parent
  const parentPath = '/' + pathname.split('/')[1];
  if (ROUTE_ACCESS_MAP[parentPath]) {
    return roles.some(r => ROUTE_ACCESS_MAP[parentPath].includes(r));
  }

  // Unknown routes: deny for non-admins
  return false;
}

export function getPersona(role: AppRole): PersonaConfig {
  return PERSONA_MAP[role] || PERSONA_MAP.viewer;
}

export function canAccessSection(sidebarSections: string[], sectionLabel: string): boolean {
  if (sidebarSections.includes('all')) return true;
  const key = SECTION_KEY_MAP[sectionLabel];
  if (!key) return true;
  return sidebarSections.includes(key);
}
