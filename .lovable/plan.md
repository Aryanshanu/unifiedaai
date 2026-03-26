

# Two Deliverables: Demo Prep Document + Hidden Superadmin Role

## Part 1: Hidden Superadmin Role (`/admin` secret login)

### How It Works
On the Auth page (`/auth`), a hidden keyboard shortcut or URL trick: typing `/admin` in the browser URL bar (e.g., `yoursite.com/admin`) triggers an auto-login as a new `superadmin` role that has **unrestricted access to every page and every sidebar section**.

### Changes Required

#### 1. `src/lib/role-personas.ts`
- Add `superadmin` to the `AppRole` type: `'admin' | 'reviewer' | 'analyst' | 'viewer' | 'superadmin'`
- Add `superadmin` persona to `PERSONA_MAP` with `sidebarSections: ['all']`, `defaultRoute: '/'`, `dashboardLayout: 'technical'` (shows everything)
- Add `'superadmin'` to **every entry** in `ROUTE_ACCESS_MAP` so it can access all routes
- In `canAccessRoute`: add early return `if (roles.includes('superadmin')) return true`

#### 2. `src/pages/Auth.tsx`
- No changes to the visible role selector (superadmin stays hidden)

#### 3. New page: `src/pages/AdminLogin.tsx`
- A simple page at route `/admin` that auto-calls `signInAsRole('superadmin')` on mount
- Shows a brief "Authenticating..." spinner, then redirects to `/`
- No role cards, no UI — just instant login

#### 4. `src/App.tsx`
- Add route: `<Route path="/admin" element={<AdminLogin />} />`
- This route is NOT behind `<ProtectedRoute>`, just like `/auth`

#### 5. `src/components/auth/RoleSelector.tsx`
- Filter out `superadmin` from `roleOptions` so it never appears in the card list

#### 6. `src/hooks/useAuth.tsx`
- No structural changes needed — `signInAsRole` already accepts any `AppRole` string and calls `assign_own_role` RPC

#### 7. Database: `assign_own_role` RPC
- The existing `assign_own_role` function accepts the role as a parameter. The `app_role` enum needs `superadmin` added via migration: `ALTER TYPE public.app_role ADD VALUE 'superadmin'`

#### 8. `src/components/layout/Sidebar.tsx`
- The `filterNavItems` function already checks `sidebarSections.includes('all')` and returns all items. Since superadmin has `['all']`, sidebar shows everything automatically.

#### 9. `src/pages/Index.tsx` (Command Center)
- For superadmin, show the `TechnicalDashboard` layout (most comprehensive) or a combined view

---

## Part 2: Demo Preparation Document

This will be generated as a comprehensive Markdown document covering:

### Section 1: What Is Fractal RAI-OS?
- Enterprise AI Governance platform for responsible AI oversight
- Covers the full lifecycle: Discovery → Monitoring → Governance → Compliance

### Section 2: Why Does This Exist?
- Regulatory compliance (EU AI Act, NIST AI RMF)
- Risk management for AI/ML deployments
- Centralized governance across multiple AI systems

### Section 3: The 4 Personas & What They See
- CDAO: Executive dashboard, approvals, compliance overview
- AI Steward: HITL reviews, incidents, monitoring
- Agent Engineer: Model evaluation engines, security testing, configuration
- Compliance Auditor: Audit trails, attestations, evidence packages

### Section 4: Feature-by-Feature Walkthrough (Demo Script)
Every page with what it does, what data it shows, and what's clickable:
- Command Center (role-adaptive dashboard)
- AI Discovery & Agent Governance
- Observability, Alerts, Continuous Evaluation
- Approvals workflow, HITL Console, Incidents
- Knowledge Graph (lineage visualization)
- All 6 RAI Engines (Fairness, Hallucination, Toxicity, Privacy, Explainability, Data Quality)
- Security suite (Dashboard, Pentesting, Jailbreak Lab, Threat Modeling)
- Data Contracts, Semantic Layer, Feature Store
- Environment Management, Settings
- Audit Center with hash-chain verification

### Section 5: Technology Stack
- Frontend: React + TypeScript + Vite + Tailwind CSS + shadcn/ui
- Backend: Lovable Cloud (Supabase) — PostgreSQL, Edge Functions, RLS, Auth
- AI Integration: LLM Gateway supporting OpenAI, Gemini, Anthropic, HuggingFace, Perplexity
- Data integrity: SHA-256 hash chains on audit logs, decisions, quality runs
- Knowledge Graph: pgvector embeddings for semantic search
- Security: Zero-trust RBAC, anonymous auth with role assignment, RLS on all tables

### Section 6: Potential Demo Questions & Answers
- "How does the approval workflow work?"
- "What happens when a model fails evaluation?"
- "How is audit immutability ensured?"
- "What AI models can this connect to?"
- "How does role-based access work?"
- etc.

This document will be generated as a downloadable file at `/mnt/documents/demo-prep.md`.

---

## Implementation Order
1. DB migration: add `superadmin` to `app_role` enum
2. Update `role-personas.ts` with superadmin config
3. Create `AdminLogin.tsx` page
4. Update `App.tsx` with `/admin` route
5. Filter superadmin from `RoleSelector.tsx`
6. Update `Index.tsx` dashboard layout for superadmin
7. Generate demo prep document

