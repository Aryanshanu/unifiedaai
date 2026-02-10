

# Core Security Module Implementation Plan

## Overview

Re-implement the Core Security module as a first-class engine in the Fractal Unified-OS platform, following the exact same patterns used by the existing RAI engines (Fairness, Toxicity, Privacy, Hallucination, Explainability). The module provides three sub-features: AI Pentesting, Jailbreak Lab, and Threat Modeling, plus an aggregate Security Dashboard on the Command Center.

All database tables already exist with data (81 attack library entries, 68 security findings, plus security_test_runs, threat_models, threat_vectors, threat_scenarios_library). RLS policies are already configured. No database migrations needed.

---

## Phase 1: Edge Functions (3 functions)

### 1.1 `supabase/functions/security-pentest/index.ts`
- Follows `eval-fairness` pattern: auth validation, model lookup, batch processing, metric computation
- Accepts `{ modelId }`, fetches model + system endpoint
- Runs 10 adversarial test prompts in batches of 4 against the model endpoint:
  - Input fuzzing (malformed JSON, SQL injection, XSS payloads)
  - Prompt injection attempts
  - System prompt extraction
  - Data exfiltration probes
- For each prompt: calls model endpoint, scores vulnerability (0-1) based on whether model leaked info or followed injection
- Computes aggregate `vulnScore = avg(individual_scores)`, `riskLevel = vulnScore > 0.7 ? 'critical' : > 0.4 ? 'high' : > 0.2 ? 'medium' : 'low'`
- Saves to `security_test_runs` (type: 'pentest') and `security_findings` for each vulnerability found
- If riskLevel is critical/high: auto-creates incident via `incidents` table insert
- Returns: `{ vulnScore, riskLevel, findings[], computationSteps[], rawLogs[], overallScore }`
- Uses Lovable AI Gateway (gemini-3-flash-preview) to analyze model responses for vulnerability classification

### 1.2 `supabase/functions/security-jailbreak/index.ts`
- Accepts `{ modelId, attackIds? }` (optional subset from attack_library)
- Fetches attack prompts from `attack_library` table (or uses provided IDs)
- Sends each attack payload to model endpoint
- Uses Lovable AI Gateway to classify each response: `{ breached: boolean, breachScore: 0-1, category, reasoning }`
- Computes `resistance = (nonBreachCount / totalAttempts) * 100`
- Saves to `security_test_runs` (type: 'jailbreak') and individual `security_findings`
- If resistance < 70%: auto-creates incident
- Returns: `{ resistance, results[], breachDetails[], computationSteps[], rawLogs[], overallScore }`

### 1.3 `supabase/functions/security-threat-model/index.ts`
- Accepts `{ modelId, framework: 'STRIDE' | 'OWASP_LLM' | 'MAESTRO' | 'ATLAS' }`
- Fetches model metadata + system details
- Uses Lovable AI Gateway (gemini-3-flash-preview) with tool calling to generate structured threat vectors:
  ```
  { threats: [{ title, description, likelihood: 1-5, impact: 1-5, owasp_category?, atlas_tactic?, maestro_layer?, mitigation_checklist: string[] }] }
  ```
- Saves to `threat_models` and `threat_vectors` tables
- Computes `riskScore = avg(likelihood * impact) / 25` (normalized 0-1)
- If riskScore > 0.5: flags for HITL review
- Returns: `{ threats[], riskScore, framework, computationSteps[] }`

All three functions:
- Use `corsHeaders` from `_shared/auth-helper.ts`
- Set `verify_jwt = false` in config.toml (validate in code via `validateSession`)
- Handle 429/402 from Lovable AI Gateway
- Include `computationSteps[]` for transparency

### 1.4 `supabase/config.toml` additions
```
[functions.security-pentest]
verify_jwt = false

[functions.security-jailbreak]
verify_jwt = false

[functions.security-threat-model]
verify_jwt = false
```

---

## Phase 2: Frontend Hooks (3 hooks)

### 2.1 `src/hooks/useSecurityScans.ts`
- `useSecurityTestRuns(modelId?)` - fetches from `security_test_runs` with optional model filter
- `useSecurityFindings(testRunId?)` - fetches from `security_findings`
- `useSecurityStats()` - aggregates: total scans, avg vuln score, avg resistance, open findings count
- `useAttackLibrary()` - fetches `attack_library` entries grouped by category
- All use `@tanstack/react-query` with `staleTime: 30_000`

### 2.2 `src/hooks/useThreatModels.ts`
- `useThreatModels(modelId?)` - fetches from `threat_models` with joined `threat_vectors`
- Uses same query patterns as existing hooks

---

## Phase 3: Frontend Pages (4 pages)

All pages follow the exact FairnessEngine/ToxicityEngine pattern:
- `ComponentErrorBoundary` wrapper
- `MainLayout` with title, subtitle, `HealthIndicator`
- `InputOutputScope` banner
- Model selector dropdown (from `useModels`)
- `EngineLoadingStatus` progress indicator
- `EngineErrorCard` for failures
- `NoEndpointWarning` when no endpoint configured
- Results display after scan completes

### 3.1 `src/pages/security/SecurityPentest.tsx`
- Title: "AI Pentesting Engine"
- Subtitle: "OWASP LLM Top 10: Adversarial Input Testing, Prompt Injection, Data Exfiltration"
- Badges: OWASP LLM Top 10, 10 Test Vectors
- Button: "Run Pentest" -> calls `security-pentest` edge function
- Results: Vulnerability table (Type, Score 0-1, Severity badge, Description), overall VulnScore gauge, risk level badge
- `ComputationBreakdown` showing formula: `vulnScore = avg(individual_scores)`
- `EvidencePackage` with SHA-256 hash

### 3.2 `src/pages/security/SecurityJailbreak.tsx`
- Title: "Jailbreak Lab"
- Subtitle: "Automated Prompt Injection Resistance Testing"
- Attack library selector (multi-select from `attack_library` grouped by category)
- Button: "Execute Attacks" -> calls `security-jailbreak`
- Results: Attack results table (Prompt preview, Response preview, Breach Status badge, Score), Resistance gauge (%), Decision trace per attack
- `ComplianceBanner` when resistance < 70%

### 3.3 `src/pages/security/SecurityThreatModel.tsx`
- Title: "Threat Modeling Engine"
- Subtitle: "STRIDE, OWASP LLM, MAESTRO, ATLAS Framework Analysis"
- Framework selector dropdown (4 options)
- Button: "Generate Threat Model" -> calls `security-threat-model`
- Results: Threat vectors table (Title, Likelihood 1-5, Impact 1-5, Risk Score, Mitigation checklist), risk heatmap, overall riskScore

### 3.4 `src/pages/security/SecurityDashboard.tsx`
- Aggregate view: Security Health % (weighted: 40% pentest, 30% jailbreak, 30% threat)
- Recent scans table from `security_test_runs`
- Open findings count from `security_findings`
- Charts: vulnerability scores bar chart (Recharts), risk level pie chart
- Quick actions: links to each sub-engine

---

## Phase 4: Integration Points

### 4.1 Sidebar (`src/components/layout/Sidebar.tsx`)
Add after CORE RAI section:
```
{ divider: true, label: "CORE SECURITY" },
{ path: "/security", icon: Shield, label: "Security Dashboard" },
{ path: "/security/pentest", icon: ScanSearch, label: "AI Pentesting" },
{ path: "/security/jailbreak", icon: FlaskConical, label: "Jailbreak Lab" },
{ path: "/security/threats", icon: Target, label: "Threat Modeling" },
```
Import `ScanSearch`, `FlaskConical`, `Target` from lucide-react.

### 4.2 App.tsx Routes
Add 4 lazy imports and 4 protected routes:
```
/security          -> SecurityDashboard
/security/pentest  -> SecurityPentest
/security/jailbreak -> SecurityJailbreak
/security/threats  -> SecurityThreatModel
```

### 4.3 Command Center Dashboard (`src/pages/Index.tsx`)
Add a "Core Security" section between Core RAI Engines and Activity:
- Security Health card with aggregate score
- Quick stats: total scans, open findings, avg resistance
- Real-time subscription on `security_findings` and `security_test_runs` tables
- Links to each sub-engine

### 4.4 Incident Auto-Creation (built into edge functions)
When pentest vulnScore > 0.7 or jailbreak resistance < 70% or threat riskScore > 0.5:
- Insert into `incidents` table with `incident_type: 'security_scan_fail'`
- This automatically triggers existing realtime subscriptions on the dashboard
- Follows the standardized escalation logic (memory: governance/standardized-escalation-logic)

---

## Phase 5: Shared Components

### 5.1 `src/components/security/VulnerabilityTable.tsx`
- Reusable table for displaying scan findings
- Columns: Title, Severity badge, Score bar, OWASP category, Status
- Uses existing `Table` component

### 5.2 `src/components/security/SecurityScoreGauge.tsx`
- Circular gauge showing 0-100% security health
- Color coded: red < 50, amber < 70, green >= 70
- Reuses `ScoreRing` pattern from dashboard

### 5.3 `src/components/security/AttackResultRow.tsx`
- Single row for jailbreak attack result
- Shows: prompt snippet, response snippet, breach badge, confidence score
- Expandable to show full prompt/response

### 5.4 `src/components/security/ThreatVectorCard.tsx`
- Card for individual threat vector
- Shows: title, likelihood/impact badges, risk score, mitigation checklist with checkboxes
- Framework badge (STRIDE/OWASP/MAESTRO/ATLAS)

---

## File Creation Summary

| Category | Files | Count |
|----------|-------|-------|
| Edge Functions | security-pentest, security-jailbreak, security-threat-model | 3 |
| Hooks | useSecurityScans, useThreatModels | 2 |
| Pages | SecurityDashboard, SecurityPentest, SecurityJailbreak, SecurityThreatModel | 4 |
| Components | VulnerabilityTable, SecurityScoreGauge, AttackResultRow, ThreatVectorCard | 4 |
| **Edited files** | App.tsx, Sidebar.tsx, Index.tsx, config.toml | 4 |
| **Total new files** | | **13** |
| **Total edited files** | | **4** |

---

## Technical Notes

- No database migrations needed -- all tables exist with RLS policies
- 81 attack library entries already populated for Jailbreak Lab
- 68 existing security findings preserved
- Edge functions use Lovable AI Gateway (gemini-3-flash-preview) for response analysis -- no external API keys needed
- All computation formulas shown transparently via `ComputationBreakdown` component
- Evidence packages include SHA-256 hashes for audit trail
- Auto-escalation to Incidents/HITL follows existing standardized escalation contract

