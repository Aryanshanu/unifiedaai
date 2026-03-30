import { Crown, ShieldCheck, Wrench, FileCheck, LucideIcon } from 'lucide-react';

export type AppRole = 'admin' | 'reviewer' | 'analyst' | 'viewer' | 'superadmin';

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
    sidebarSections: ['discover', 'monitor', 'govern', 'data-governance', 'core-rai', 'core-security', 'configure', 'docs'],
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
    defaultRoute: '/audit-center',
    dashboardLayout: 'compliance',
    sidebarSections: ['govern', 'data-governance', 'docs'],
  },
  superadmin: {
    role: 'superadmin',
    displayName: 'Platform Admin',
    description: 'Full unrestricted access to all platform features, engines, and configuration',
    icon: Crown,
    avatarEmoji: '🔑',
    avatarGradient: 'from-yellow-500 to-red-600',
    borderColor: 'border-l-yellow-500',
    defaultRoute: '/',
    dashboardLayout: 'technical',
    sidebarSections: ['all'],
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
 * Every role is explicitly listed — there is NO admin bypass.
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
  '/continuous-evaluation': ['admin', 'analyst'],
  '/evaluation': ['admin', 'analyst'],

  // Governance
  '/governance': ['admin', 'reviewer', 'viewer'],
  '/governance/approvals': ['admin', 'reviewer'],
  '/hitl': ['admin', 'reviewer'],
  '/incidents': ['admin', 'reviewer', 'viewer'],
  '/lineage': ['admin', 'reviewer', 'viewer'],
  '/audit-center': ['admin', 'reviewer', 'viewer'],
  '/impact': ['admin', 'reviewer', 'analyst'],
  '/regulatory-reports': ['admin', 'reviewer', 'viewer'],
  '/runbooks': ['admin', 'reviewer', 'analyst'],
  '/policy': ['admin', 'analyst'],
  '/golden-demo': ['admin', 'analyst'],

  // Core RAI Engines — admin + analyst
  '/engine/fairness': ['admin', 'analyst'],
  '/engine/hallucination': ['admin', 'analyst'],
  '/engine/toxicity': ['admin', 'analyst'],
  '/engine/privacy': ['admin', 'analyst'],
  '/engine/explainability': ['admin', 'analyst'],
  '/engine/data-quality': ['admin', 'analyst', 'reviewer', 'viewer'],

  // Core Security — admin + analyst
  '/security': ['admin', 'analyst'],
  '/security/pentest': ['admin', 'analyst'],
  '/security/jailbreak': ['admin', 'analyst'],
  '/security/threats': ['admin', 'analyst'],

  // Data Governance — all roles for oversight
  '/data-contracts': ['admin', 'reviewer', 'analyst', 'viewer'],
  '/semantic-definitions': ['admin', 'reviewer', 'analyst', 'viewer'],
  '/semantic-hub': ['admin', 'reviewer', 'analyst', 'viewer'],

  // Configure — admin + analyst
  '/projects': ['admin', 'analyst'],
  '/models': ['admin', 'analyst'],
  '/environments': ['admin', 'analyst'],
  '/settings': ['admin', 'analyst'],
  '/vendors': ['admin', 'analyst'],
  '/docs': ['admin', 'reviewer', 'analyst', 'viewer'],
};

/**
 * Check if a role can access a given pathname.
 * Exact match → dynamic parent lookup → deny (fail-closed).
 */
export function canAccessRoute(roles: AppRole[], pathname: string): boolean {
  // Superadmin bypasses all route restrictions
  if (roles.includes('superadmin')) return true;

  // 1. Exact match — highest priority
  if (ROUTE_ACCESS_MAP[pathname]) {
    return roles.some(r => ROUTE_ACCESS_MAP[pathname].includes(r));
  }

  // 2. Dynamic routes: /projects/:id, /models/:id, /systems/:id
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length >= 2) {
    const parentPath = '/' + parts[0];
    if (ROUTE_ACCESS_MAP[parentPath]) {
      return roles.some(r => ROUTE_ACCESS_MAP[parentPath].includes(r));
    }
  }

  // 3. Unknown routes: DENY (fail-closed)
  console.warn(`[RBAC] Unknown route "${pathname}" — denying access. Register in ROUTE_ACCESS_MAP.`);
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
