

# Plan: Visual Profile Avatars, Strict Route Access Control & Latency Hardening

## 1. Visual Profile Avatars on Login Page

Replace the monochrome Lucide icons on the role selector cards with colorful, distinctive emoji-style avatars that give each persona a memorable visual identity.

| Role | Avatar | Color Accent |
|------|--------|-------------|
| Chief Data & AI Officer | 👔 Executive with gradient blue-purple bg | `from-blue-500 to-purple-600` |
| AI Steward | 🛡️ Shield guardian with gradient emerald bg | `from-emerald-500 to-teal-600` |
| Agent Engineer | ⚙️ Engineer with gradient orange bg | `from-orange-500 to-amber-600` |
| Compliance Auditor | 📋 Clipboard with gradient rose bg | `from-rose-500 to-pink-600` |

Each card gets a large (48×48) rounded avatar container with a gradient background and a text emoji inside, replacing the current small gray icon box. The cards themselves get a subtle colored left border matching their persona color.

**Files:** `src/components/auth/RoleSelector.tsx`, `src/components/layout/Header.tsx` (avatar in header also gets the colored treatment)

---

## 2. Strict Route-Level Access Control

Currently, only `/governance/approvals` and `/settings` have `requiredRoles` on their routes. All other routes are accessible to any authenticated user. This needs to be locked down so each role can only access pages within their allowed sidebar sections.

### Route-to-Role Mapping

**Admin (`admin`):** All routes  
**Reviewer (`reviewer`):** `/`, `/discovery`, `/agents`, `/observability`, `/alerts`, `/continuous-evaluation`, `/governance/*`, `/decision-ledger`, `/hitl`, `/incidents`, `/lineage`, `/engine/data-quality`, `/data-contracts`, `/semantic-definitions`, `/semantic-hub`, `/docs`  
**Analyst (`analyst`):** `/`, `/discovery`, `/agents`, `/observability`, `/alerts`, `/continuous-evaluation`, `/engine/*` (all RAI), `/security/*`, `/engine/data-quality`, `/data-contracts`, `/semantic-definitions`, `/semantic-hub`, `/projects`, `/models`, `/environments`, `/settings`, `/docs`  
**Viewer (`viewer`):** `/`, `/governance/*`, `/decision-ledger`, `/hitl` (read-only), `/incidents`, `/lineage`, `/engine/data-quality`, `/data-contracts`, `/semantic-definitions`, `/semantic-hub`, `/docs`

### Implementation
Create a route access map in `src/lib/role-personas.ts` that maps each route pattern to allowed roles. Update `ProtectedRoute` to automatically check the current pathname against this map, so we don't need to manually add `requiredRoles` to every `<Route>`. If a role tries to access a page not in their allowed list, they see the "Access Denied" screen with a button to go back to their dashboard.

**Files:** `src/lib/role-personas.ts` (add `ROUTE_ACCESS_MAP`), `src/components/auth/ProtectedRoute.tsx` (auto-check route access), `src/App.tsx` (remove manual `requiredRoles` props since ProtectedRoute handles it automatically)

---

## 3. Latency & Self-Healing Hardening

### QueryClient Optimization
- Increase `staleTime` to `120_000` (2 min) to reduce redundant fetches
- Add `gcTime: 300_000` (5 min garbage collection)
- Set `refetchOnMount: false` globally

### Header Notification Optimization  
The Header component currently fires 2 DB queries + subscribes to 2 realtime channels on every mount. Wrap in a dedicated hook with `staleTime: 120_000` and debounced realtime handlers.

### Index Page Query Consolidation
The Index page fires 4+ separate queries (dqMetrics, semanticMetrics, recentIncidents, plus models and platformMetrics). Add proper `staleTime` and `gcTime` to all of them to prevent re-fetching on every navigation.

**Files:** `src/App.tsx` (QueryClient defaults), `src/components/layout/Header.tsx` (optimize notification fetching)

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/components/auth/RoleSelector.tsx` | EDIT | Colorful emoji avatars with gradient backgrounds |
| `src/lib/role-personas.ts` | EDIT | Add `ROUTE_ACCESS_MAP` and `avatarEmoji`/`avatarGradient` per persona |
| `src/components/auth/ProtectedRoute.tsx` | EDIT | Auto-check route access from map |
| `src/components/layout/Header.tsx` | EDIT | Colored avatar, optimized notifications |
| `src/App.tsx` | EDIT | QueryClient perf tuning, clean up manual requiredRoles |

