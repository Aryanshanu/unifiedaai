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
    description: 'Executive oversight, risk strategy, and platform-wide governance reports.',
    icon: Crown,
    avatarEmoji: '👔',
    avatarGradient: 'from-blue-600 to-indigo-600',
    borderColor: 'border-blue-500/50',
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
    defaultRoute: '/governance/approvals',
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
    description: 'Global system administration, user management, and infrastructure control.',
    icon: Crown,
    avatarEmoji: '⚡',
    avatarGradient: 'from-slate-700 to-slate-900',
    borderColor: 'border-slate-500/50',
    defaultRoute: '/admin',
    dashboardLayout: 'executive',
    sidebarSections: ['all'],
  },
};

/** Map sidebar section labels to their key identifiers */
export const SECTION_KEY_MAP: Record<string, string> = {
  'AUDIT': 'discover',
  'DISCOVER': 'discover',
  'Audit Center': 'discover',
  'System Audit': 'discover',
  'Monitor': 'monitor',
  'Govern': 'govern',
  'DATA GOVERNANCE': 'data-governance',
  'LOGIC GOVERNANCE': 'core-rai',
  'CORE RAI': 'core-rai',
  'CORE SECURITY': 'core-security',
  'Configure': 'configure',
  'Risk & Impact': 'monitor',
  'Impact Dashboard': 'monitor',
};

/**
 * Route-to-role access map.
 * Every role is explicitly listed — there is NO admin bypass.
 */
export const ROUTE_ACCESS_MAP: Record<string, AppRole[]> = {
  '/': ['admin', 'reviewer', 'analyst', 'viewer', 'superadmin'],
  '/auth': ['admin', 'reviewer', 'analyst', 'viewer', 'superadmin'],
  '/error': ['admin', 'reviewer', 'analyst', 'viewer', 'superadmin'],
  '/admin': ['admin', 'superadmin'],

  // Infrastructure & Discovery
  '/discovery': ['admin', 'reviewer', 'analyst', 'superadmin'],
  '/agents': ['admin', 'reviewer', 'analyst', 'superadmin'],
  '/observability': ['admin', 'reviewer', 'analyst', 'superadmin'],
  '/alerts': ['admin', 'reviewer', 'analyst', 'superadmin'],
  '/continuous-validation': ['admin', 'analyst', 'superadmin'],
  '/evaluation': ['admin', 'analyst', 'superadmin'],
  '/benchmarks': ['admin', 'analyst', 'superadmin'],

  // Projects & Registries
  '/projects': ['admin', 'analyst', 'superadmin'],
  '/projects/:id': ['admin', 'analyst', 'superadmin'],
  '/systems/:id': ['admin', 'analyst', 'superadmin'],
  '/engines': ['admin', 'analyst', 'superadmin'],
  '/engines/:id': ['admin', 'analyst', 'superadmin'],

  // Governance Hub
  '/governance': ['admin', 'reviewer', 'viewer', 'superadmin'],
  '/governance/approvals': ['admin', 'reviewer', 'superadmin'],
  '/oversight': ['admin', 'reviewer', 'superadmin'],
  '/anomalies': ['admin', 'reviewer', 'viewer', 'superadmin'],
  '/lineage': ['admin', 'reviewer', 'viewer', 'superadmin'],
  '/audit-center': ['admin', 'reviewer', 'viewer', 'superadmin'],
  '/audit': ['admin', 'reviewer', 'viewer', 'superadmin'],
  '/impact': ['admin', 'reviewer', 'viewer', 'superadmin'],
  '/risk': ['admin', 'reviewer', 'viewer', 'superadmin'],
  '/regulatory-reports': ['admin', 'reviewer', 'viewer', 'superadmin'],
  '/runbooks': ['admin', 'reviewer', 'viewer', 'superadmin'],
  '/policy': ['admin', 'reviewer', 'superadmin'],

  // Security Lab
  '/security': ['admin', 'analyst', 'superadmin'],
  '/security/pentest': ['admin', 'analyst', 'superadmin'],
  '/security/jailbreak': ['admin', 'analyst', 'superadmin'],
  '/security/threats': ['admin', 'analyst', 'superadmin'],

  // Logic Governance (Core RAI Engines)
  '/engine/fairness': ['admin', 'analyst', 'superadmin'],
  '/engine/hallucination': ['admin', 'analyst', 'superadmin'],
  '/engine/toxicity': ['admin', 'analyst', 'superadmin'],
  '/engine/privacy': ['admin', 'analyst', 'superadmin'],
  '/engine/explainability': ['admin', 'analyst', 'superadmin'],
  '/engine/data-quality': ['admin', 'analyst', 'superadmin'],

  // Data Governance
  '/data-contracts': ['admin', 'reviewer', 'analyst', 'viewer', 'superadmin'],
  '/semantic-definitions': ['admin', 'reviewer', 'analyst', 'viewer', 'superadmin'],
  '/semantic-hub': ['admin', 'reviewer', 'analyst', 'viewer', 'superadmin'],
  '/semantic-layer': ['admin', 'reviewer', 'analyst', 'viewer', 'superadmin'],

  // Platform Ops & Simulation
  '/environments': ['admin', 'analyst', 'superadmin'],
  '/providers': ['admin', 'analyst', 'superadmin'],
  '/simulation': ['admin', 'analyst', 'superadmin'],
  '/settings': ['admin', 'analyst', 'superadmin'],
  '/docs': ['admin', 'reviewer', 'analyst', 'viewer', 'superadmin'],
};

/**
 * Check if a role can access a given pathname.
 * Uses longest-prefix matching. No admin bypass.
 */
export function canAccessRoute(roles: AppRole[], pathname: string): boolean {
  // Superadmin bypasses all route restrictions
  if (roles.includes('superadmin')) return true;

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

  // Unknown routes: deny
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
