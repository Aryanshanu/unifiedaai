

# Full End-to-End Application Audit Plan

## Scope

A comprehensive walkthrough of every module, page, route, database table, edge function, hook, and component in the Fractal Unified-OS platform -- covering functional correctness, data integrity, UI/backend alignment, security posture, and integration continuity.

---

## Module Inventory (31 routes, 100+ tables, 50+ edge functions)

| # | Route | Page | Status |
|---|-------|------|--------|
| 1 | `/auth` | Auth (Login/Signup) | Public |
| 2 | `/` | Command Center (Index) | Protected |
| 3 | `/projects` | Projects Registry | Protected |
| 4 | `/projects/:id` | Project Detail | Protected |
| 5 | `/systems/:id` | System Detail | Protected |
| 6 | `/models` | Models Registry | Protected |
| 7 | `/models/:id` | Model Detail | Protected |
| 8 | `/governance` | Governance Hub | Protected |
| 9 | `/governance/approvals` | Approvals | Admin/Reviewer |
| 10 | `/hitl` | HITL Console | Protected |
| 11 | `/decision-ledger` | Decision Ledger | Protected |
| 12 | `/incidents` | Incidents | Protected |
| 13 | `/lineage` | Knowledge Graph | Protected |
| 14 | `/observability` | Observability | Protected |
| 15 | `/alerts` | Alerts | Protected |
| 16 | `/evaluation` | Evaluation Suites | Protected |
| 17 | `/impact-dashboard` | Impact Dashboard | Protected |
| 18 | `/regulatory-reports` | Regulatory Reports | Protected |
| 19 | `/engine/fairness` | Fairness Engine | Protected |
| 20 | `/engine/hallucination` | Hallucination Engine | Protected |
| 21 | `/engine/toxicity` | Toxicity Engine | Protected |
| 22 | `/engine/privacy` | Privacy Engine | Protected |
| 23 | `/engine/explainability` | Explainability Engine | Protected |
| 24 | `/engine/data-quality` | Data Quality Engine | Protected |
| 25 | `/security` | Security Dashboard | Protected |
| 26 | `/security/pentest` | AI Pentesting | Protected |
| 27 | `/security/jailbreak` | Jailbreak Lab | Protected |
| 28 | `/security/threats` | Threat Modeling | Protected |
| 29 | `/data-contracts` | Data Contracts | Protected |
| 30 | `/policy` | Policy Studio | Protected |
| 31 | `/golden` | Golden Demo | Protected |
| 32 | `/settings` | Settings | Admin |
| 33 | `/configuration` | Configuration (redirects to Settings) | Admin |
| 34 | `/runbooks` | Runbooks | Protected |
| 35 | `/audit-center` | Audit Center | Protected |
| 36 | `/docs` | Documentation | Protected |
| 37 | `/error` | Error Page | Public |
| 38 | `*` | 404 Not Found | Public |

---

## Phase 1: Infrastructure & Auth Layer

### 1.1 Authentication Flow
- **Test:** Navigate to `/auth`, verify login and signup forms render
- **Test:** Submit invalid email format -- expect Zod validation error
- **Test:** Submit valid credentials -- expect redirect to `/` (from state preserved)
- **Test:** Access any protected route unauthenticated -- expect redirect to `/auth`
- **Test:** Auth timeout (10s) -- expect "Reload Page" UI
- **Test:** Role-based access: non-admin accessing `/settings` or `/governance/approvals` -- expect "Access Denied"
- **DB Check:** `SELECT count(*) FROM profiles` -- verify user profiles exist
- **DB Check:** `SELECT count(*) FROM user_roles` -- verify roles assigned

### 1.2 Protected Route Guards
- **Verify:** `ProtectedRoute` handles `loading`, `timedOut`, `!user`, and `requiredRoles` states
- **Verify:** Role check uses `requiredRoles.some(role => roles.includes(role))`

### 1.3 Global Infrastructure
- **Verify:** `ErrorBoundary` wraps entire app
- **Verify:** `QueryClient` config: staleTime=30s, retry=2, refetchOnWindowFocus=false
- **Verify:** Lazy loading with `Suspense` fallback (Loader2 spinner)
- **Verify:** `GlobalBanner` renders above routes
- **Verify:** `SidebarProvider` context provides collapsed/expanded state

---

## Phase 2: Command Center Dashboard (`/`)

### 2.1 Data Queries
- **DB Check:** `SELECT count(*) FROM review_queue WHERE status = 'pending'` -- verify pendingReviewsCount
- **DB Check:** `SELECT count(*) FROM datasets` -- verify dqMetrics.datasets
- **DB Check:** `SELECT count(*) FROM dq_incidents WHERE status = 'open'` -- verify openIncidents
- **DB Check:** `SELECT count(*) FROM data_contracts WHERE status = 'active'` -- verify activeContracts
- **DB Check:** `SELECT count(*) FROM data_contract_violations WHERE status = 'open'` -- verify openViolations
- **DB Check:** `SELECT * FROM incidents ORDER BY created_at DESC LIMIT 5` -- verify recentIncidents

### 2.2 Realtime Subscriptions
- **Verify:** Channel `dashboard-realtime` subscribes to `incidents`, `dq_incidents`, `review_queue`
- **Verify:** New incident INSERT triggers toast warning
- **Verify:** Channel cleanup on unmount

### 2.3 UI Sections
- **Verify:** HITL queue alert shows when pendingReviewsCount > 0
- **Verify:** Data Governance section: Data Quality Engine card + Data Contracts card with metrics
- **Verify:** Core Security section: 3 cards (AI Pentesting, Jailbreak Lab, Threat Modeling) navigate to correct routes
- **Verify:** Core RAI Engines: 5 cards (Fairness, Hallucination, Toxicity, Privacy, Explainability)
- **Verify:** Recent Incidents list with severity badges
- **Verify:** Platform Stats: ML Models count, Pending Approvals, Open Alerts
- **Verify:** HealthIndicator shows status and lastUpdated

---

## Phase 3: Sidebar Navigation

### 3.1 Structure Verification
- **Verify:** 7 sections: Monitor, Govern, DATA GOVERNANCE, CORE RAI, CORE SECURITY, Respond, Impact, Configure
- **Verify:** 23 navigation items render with correct icons and paths
- **Verify:** Active state highlighting matches current route
- **Verify:** Collapse/expand toggle works, dividers hidden when collapsed
- **Verify:** Approval badge shows count from `usePlatformMetrics`

---

## Phase 4: Core RAI Engines (5 engines)

For EACH engine (Fairness, Hallucination, Toxicity, Privacy, Explainability):

### 4.1 Page Load
- **Test:** Page loads with `MainLayout`, title, subtitle, `HealthIndicator`
- **Test:** `InputOutputScope` banner renders with correct scope (BOTH/OUTPUT)
- **Test:** Model selector dropdown populates from `useModels` hook
- **Test:** Loading state shows `EngineSkeleton`

### 4.2 Engine Execution
- **Test:** Select model, click "Run" -- invokes corresponding edge function
- **Test:** Progress states: idle -> sending -> analyzing -> complete/error
- **Test:** Error state shows `EngineErrorCard` with retry
- **Test:** `NoEndpointWarning` shows when model has no endpoint

### 4.3 Results Display
- **Test:** `ComplianceBanner` shows COMPLIANT (>=70) or NON-COMPLIANT (<70)
- **Test:** `ComputationBreakdown` shows formula steps
- **Test:** `EvidencePackage` allows download with SHA-256 hash
- **Test:** Score gauges show correct values

### 4.4 Edge Functions
- **Verify:** `eval-fairness`, `eval-toxicity-hf`, `eval-privacy-hf`, `eval-hallucination-hf`, `eval-explainability-hf` deployed
- **Verify:** Each uses `validateSession` + `requireAuth`
- **Verify:** Each saves to `evaluation_runs`/`evaluation_results`

---

## Phase 5: Core Security Module (4 pages)

### 5.1 Security Dashboard (`/security`)
- **Test:** Loads without crash (avgResistance null guard fixed)
- **DB Check:** `SELECT count(*) FROM security_test_runs` -- verify totalScans
- **DB Check:** `SELECT count(*) FROM security_findings WHERE status = 'open'` -- verify openFindings
- **Test:** SecurityScoreGauge renders security health (weighted: 40% pentest, 30% jailbreak, 30% threat)
- **Test:** Recent scans table shows last 10 runs with risk badges
- **Test:** Engine cards navigate to `/security/pentest`, `/security/jailbreak`, `/security/threats`

### 5.2 AI Pentesting (`/security/pentest`)
- **Test:** Page loads with InputOutputScope (BOTH), OWASP badges
- **Test:** Model selector populates, NoEndpointWarning if no endpoint
- **Test:** "Run Pentest" calls `security-pentest` edge function
- **Verify Edge Function:** 10 test prompts (input_fuzzing, prompt_injection, system_prompt_extraction, data_exfiltration)
- **Verify:** `scoreVulnerability` function classifies each response correctly
- **Verify:** `vulnScore = avg(individual_scores)`, `overallScore = (1 - vulnScore) * 100`
- **Verify:** Saves to `security_test_runs` (type: pentest) and `security_findings`
- **Verify:** Auto-escalation: if critical/high, creates `incidents` + `review_queue` entries
- **Test:** Results display: VulnerabilityTable, SecurityScoreGauge, risk badge
- **Test:** ComputationBreakdown shows 4 steps
- **Test:** EvidencePackage download works

### 5.3 Jailbreak Lab (`/security/jailbreak`)
- **Test:** Attack library selector loads from `attack_library` table
- **DB Check:** `SELECT count(*) FROM attack_library WHERE is_active = true` -- expect 81 entries
- **Test:** Grouped by category with checkboxes
- **Test:** "Execute Attacks" calls `security-jailbreak` edge function
- **Verify Edge Function:** Fetches from `attack_library`, calls model endpoint per attack
- **Verify:** Uses Lovable AI Gateway (`gemini-3-flash-preview`) for breach classification with `classify_breach` tool
- **Verify:** Falls back to `heuristicClassify` on 429/402 or missing API key
- **Verify:** `resistance = (nonBreachCount / totalAttempts) * 100`
- **Verify:** Auto-escalation if resistance < 70%
- **Test:** AttackResultRow shows BREACHED/RESISTED badges, expandable details
- **Test:** ComplianceBanner shows compliance status

### 5.4 Threat Modeling (`/security/threats`)
- **Test:** Framework selector: STRIDE, OWASP_LLM, MAESTRO, ATLAS
- **Test:** "Generate Threat Model" calls `security-threat-model` edge function
- **Verify Edge Function:** Uses AI Gateway with `generate_threats` tool
- **Verify:** Falls back to `generateFallbackThreats` (6 predefined threats)
- **Verify:** `riskScore = avg(likelihood * impact) / 25`
- **Verify:** Saves to `threat_models` + `threat_vectors` + `security_test_runs`
- **Verify:** Auto-escalation if riskScore > 0.5, creates `review_queue` entry
- **Test:** ThreatVectorCard shows likelihood/impact badges, mitigation checklist
- **Test:** ComputationBreakdown shows formula

---

## Phase 6: Data Governance

### 6.1 Data Quality Engine (`/engine/data-quality`)
- **Test:** Page loads (851 lines, largest page)
- **Test:** Dataset selector, pipeline execution (profile -> rules -> execute -> dashboard assets)
- **DB Check:** `SELECT count(*) FROM datasets`
- **DB Check:** `SELECT count(*) FROM dq_rules`
- **DB Check:** `SELECT count(*) FROM dq_rule_executions`
- **Verify:** Edge functions: `dq-profile-dataset`, `dq-generate-rules`, `dq-execute-rules`, etc.

### 6.2 Data Contracts (`/data-contracts`)
- **Test:** Contract list loads with active/violated status
- **DB Check:** `SELECT count(*) FROM data_contracts`
- **DB Check:** `SELECT count(*) FROM data_contract_violations`
- **Verify:** Violation auto-trigger via `update_contract_on_violation` DB function

---

## Phase 7: Governance Module

### 7.1 Governance Hub (`/governance`)
- **Test:** Compliance stats, frameworks, controls, attestations load
- **DB Check:** `SELECT count(*) FROM control_frameworks`
- **DB Check:** `SELECT count(*) FROM controls`
- **DB Check:** `SELECT count(*) FROM control_assessments`
- **DB Check:** `SELECT count(*) FROM attestations`
- **Test:** Realtime subscription active
- **Test:** EnforcementBadge shows correct status

### 7.2 Approvals (`/governance/approvals`)
- **Test:** Role gate: only admin/reviewer can access
- **DB Check:** `SELECT count(*) FROM system_approvals WHERE status = 'pending'`

### 7.3 HITL Console (`/hitl`)
- **Test:** Review queue loads with tabs (All, Pending, etc.)
- **DB Check:** `SELECT count(*) FROM review_queue WHERE status = 'pending'`
- **Test:** ReviewDecisionDialog opens, approve/reject works
- **Test:** SLACountdown shows time remaining
- **Test:** BulkTriagePanel for batch operations
- **Test:** Realtime subscription on `review_queue` and `decisions`

### 7.4 Decision Ledger (`/decision-ledger`)
- **Test:** Decisions load with hash chain verification
- **DB Check:** `SELECT count(*) FROM decision_ledger`
- **Test:** Search/filter works
- **Test:** Hash chain display (previous_hash, record_hash)

### 7.5 Incidents (`/incidents`)
- **Test:** Incident list with severity/status filters
- **DB Check:** `SELECT count(*) FROM incidents`
- **Test:** Incident detail dialog
- **Test:** Bulk archive/resolve operations
- **Test:** Realtime updates

---

## Phase 8: Monitoring & Observability

### 8.1 Observability (`/observability`)
- **Test:** Drift alerts, model status, system health
- **Test:** SimulationController, DriftDetector, RealtimeChatDemo, RAIAssistant
- **DB Check:** `SELECT count(*) FROM drift_alerts`
- **DB Check:** `SELECT count(*) FROM request_logs`

### 8.2 Alerts (`/alerts`)
- **Test:** Alert list from drift_alerts and incidents
- **Test:** Notification channels configuration
- **DB Check:** `SELECT count(*) FROM notification_channels`

### 8.3 Evaluation (`/evaluation`)
- **Test:** Evaluation suites and runs load
- **DB Check:** `SELECT count(*) FROM evaluation_runs`

---

## Phase 9: Knowledge Graph (`/lineage`)

- **Test:** KG nodes and edges render as graph visualization
- **DB Check:** `SELECT count(*) FROM kg_nodes`
- **DB Check:** `SELECT count(*) FROM kg_edges`
- **Test:** Node detail panel, explain dialog
- **Test:** KG sync functionality
- **Test:** Search/filter by entity type

---

## Phase 10: Impact & Reporting

### 10.1 Impact Dashboard (`/impact-dashboard`)
- **Test:** System selector, time window filter
- **Test:** LongitudinalFairness chart, ImpactScoreCard
- **DB Check:** `SELECT count(*) FROM impact_assessments`

### 10.2 Regulatory Reports (`/regulatory-reports`)
- **Test:** Report list, generate new report
- **DB Check:** `SELECT count(*) FROM regulatory_reports`
- **Test:** Report download

---

## Phase 11: Policy & Response

### 11.1 Policy Studio (`/policy`)
- **Test:** Policy packs list, DSL editor
- **Test:** Red team campaigns
- **DB Check:** `SELECT count(*) FROM policy_packs`
- **DB Check:** `SELECT count(*) FROM red_team_campaigns`

### 11.2 Golden Demo (`/golden`)
- **Test:** 7-step demo workflow executes
- **Test:** Project/model selection, sequential engine execution

---

## Phase 12: Registry (Projects, Models, Systems)

### 12.1 Projects (`/projects`, `/projects/:id`)
- **Test:** Project list, create form, detail tabs
- **DB Check:** `SELECT count(*) FROM projects`

### 12.2 Models (`/models`, `/models/:id`)
- **Test:** Model list, registration form, HuggingFace settings
- **Test:** Model status derivation (healthy/warning/critical)
- **DB Check:** `SELECT count(*) FROM models`

### 12.3 Systems (`/systems/:id`)
- **Test:** System detail with governance lock/unlock
- **DB Check:** `SELECT count(*) FROM systems`

---

## Phase 13: Configuration & Admin

### 13.1 Settings (`/settings`)
- **Test:** 7 sections (General, Platform Config, Users, Security, Notifications, Integrations, Provider Keys)
- **Test:** Engine weights slider, SLO targets, DQ thresholds
- **Test:** UsersTeamsSection, ConnectModelForm, ProviderKeysSection

### 13.2 Configuration (`/configuration`)
- **Verify:** Redirects to `/settings`

### 13.3 Runbooks (`/runbooks`)
- **Test:** Runbook list from DB

### 13.4 Audit Center (`/audit-center`)
- **Test:** Audit log list with hash chain
- **DB Check:** `SELECT count(*) FROM admin_audit_log`
- **Test:** Hash chain verification via `verify_audit_chain()`

### 13.5 Documentation (`/docs`)
- **Test:** Documentation page loads

---

## Phase 14: Database Integrity Checks

### 14.1 Hash Chain Verification
- Execute `SELECT * FROM verify_audit_chain()` -- expect `is_valid = true`
- Check `decision_ledger` hash chain continuity
- Check `dataset_quality_runs` hash chain continuity

### 14.2 Data Population Minimums (from test fixtures)
| Table | Minimum Required |
|-------|-----------------|
| request_logs | 250 |
| drift_alerts | 30 |
| incidents | 15 |
| review_queue | 40 |
| red_team_campaigns | 5 |
| policy_violations | 12 |
| control_assessments | 50 |
| attestations | 3 |
| decisions | 8 |
| projects | 1 |
| systems | 1 |
| models | 1 |
| attack_library | 81 |
| security_findings | 68 |

### 14.3 RLS Policy Verification
- Run `supabase--linter` to check all tables have RLS enabled
- Verify no tables are exposed without policies

---

## Phase 15: Edge Function Deployment Verification

### Critical Functions to Verify
| Function | JWT | Purpose |
|----------|-----|---------|
| security-pentest | false | OWASP LLM pentesting |
| security-jailbreak | false | Jailbreak resistance |
| security-threat-model | false | Threat vector generation |
| eval-fairness | true | Fairness evaluation |
| eval-toxicity-hf | true | Toxicity evaluation |
| eval-privacy-hf | true | Privacy evaluation |
| eval-hallucination-hf | true | Hallucination evaluation |
| eval-explainability-hf | true | Explainability evaluation |
| ai-gateway | true | LLM routing |
| generate-scorecard | true | Report generation |
| cicd-gate | true | Deployment governance |

### Test Each Security Function
- Call `security-pentest` with valid modelId -- expect 200 with vulnScore
- Call `security-jailbreak` with valid modelId -- expect 200 with resistance
- Call `security-threat-model` with valid modelId + framework -- expect 200 with threats

---

## Phase 16: Realtime Subscriptions Audit

| Page | Channel | Tables |
|------|---------|--------|
| Index (Dashboard) | dashboard-realtime | incidents, dq_incidents, review_queue |
| HITL | hitl-realtime | review_queue, decisions |
| Governance | governance-realtime | controls, system_approvals |
| Observability | drift-realtime | drift_alerts |

**Verify:** All channels clean up on unmount (`supabase.removeChannel`)

---

## Phase 17: Cross-Module Integration Tests

### 17.1 Security -> Incidents Flow
1. Run pentest with high vulnScore (>0.7) on a model
2. Verify incident auto-created in `incidents` table
3. Verify review_queue entry created
4. Navigate to `/incidents` -- confirm new incident visible
5. Navigate to `/hitl` -- confirm review item queued

### 17.2 Security -> Dashboard Flow
1. Run any security scan
2. Navigate to `/security` -- verify updated totalScans, securityHealth
3. Navigate to `/` -- verify Core Security cards still functional

### 17.3 Engine -> Evaluation Flow
1. Run Fairness engine on model
2. Verify `evaluation_runs` entry created
3. Navigate to `/evaluation` -- confirm run visible

### 17.4 Governance -> Knowledge Graph Flow
1. Create approval decision
2. Verify KG node auto-created via `sync_approval_to_kg` trigger
3. Navigate to `/lineage` -- confirm node appears

---

## Phase 18: Error Handling & Edge Cases

### 18.1 Null/Undefined Guards
- All `stats?.field` patterns use `!= null` (loose equality) not `!== null`
- All `.toFixed()` calls guarded against undefined
- All array `.map()` calls guarded with `?.` or `?? []`

### 18.2 Loading States
- Every page has skeleton/spinner during data fetch
- Every engine has `EngineLoadingStatus` progress indicator

### 18.3 Empty States
- Dashboard shows "No recent incidents" when empty
- Security Dashboard shows "No scans yet" when empty
- All engines show "Select a Model" prompt

### 18.4 Error Recovery
- `ComponentErrorBoundary` on every security page
- `EngineErrorCard` with retry button on edge function failures
- Toast notifications for success/failure

---

## Execution Priority

| Priority | Phase | Risk |
|----------|-------|------|
| P0 | Phase 1 (Auth) | Blocks everything |
| P0 | Phase 14 (DB Integrity) | Data corruption risk |
| P0 | Phase 5 (Core Security) | Recently implemented |
| P1 | Phase 2 (Dashboard) | Primary user entry point |
| P1 | Phase 4 (RAI Engines) | Core functionality |
| P1 | Phase 15 (Edge Functions) | Backend correctness |
| P2 | Phase 7 (Governance) | Compliance critical |
| P2 | Phase 17 (Integration) | Cross-module bugs |
| P3 | All remaining phases | Feature completeness |

---

## Success Criteria

1. All 38 routes load without crashes or console errors
2. All database counts meet minimum thresholds from test fixtures
3. All hash chains validate (`verify_audit_chain()` returns true)
4. All 3 security edge functions return 200 with valid payloads
5. All 5 RAI engine edge functions callable
6. Realtime subscriptions connect and trigger invalidations
7. Auto-escalation creates incidents for high-risk security findings
8. Role-based access correctly restricts Settings and Approvals
9. No `TypeError` or `Cannot read properties of undefined` errors in any page

