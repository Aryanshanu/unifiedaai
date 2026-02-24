
# Fractal RAI-OS -- Complete Platform Documentation
## The World's First End-to-End Open-Source Responsible AI Operating System

---

## PART 1: EXECUTIVE SUMMARY

### What Is Fractal RAI-OS?

Fractal RAI-OS is a unified platform for governing, evaluating, and monitoring AI systems across their entire lifecycle. It provides organizations with the tools to ensure their AI models are fair, safe, private, explainable, and free of hallucinations -- all while maintaining compliance with regulations like the EU AI Act.

### Why It Exists

The Responsible AI (RAI) landscape in 2025 is fragmented: dozens of disconnected tools, no unified scoring, no end-to-end auditability. Fractal closes every gap by providing a single operating system that covers data governance, model evaluation, security testing, human oversight, incident management, and regulatory reporting.

### Core Principles

- **100% Open-Source** -- MIT/Apache licenses only, no vendor lock-in
- **Zero Cost** -- No paid APIs, no cloud dependencies for core features
- **Full Transparency** -- Every score shows raw inputs, computation steps, and evidence
- **No Sugarcoating** -- Failures are highlighted with clear NON-COMPLIANT warnings
- **Ethical First** -- 40% of predefined test cases are expected-FAIL scenarios

### Key Numbers

- 5 Core RAI Evaluation Engines
- 3 Security Testing Modules
- 1 Data Quality Engine
- 55+ Predefined Ethical Test Cases
- 25+ Weighted Metrics with Mathematical Formulas
- 60+ Backend Functions
- EU AI Act Article References on Every Metric

---

## PART 2: PLATFORM ARCHITECTURE

### Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| UI Framework | shadcn/ui + Tailwind CSS + Radix primitives |
| State Management | React Query (TanStack) + React hooks |
| Routing | React Router v6 with lazy-loaded pages |
| Backend | Supabase (PostgreSQL + Edge Functions in Deno) |
| AI Inference | Lovable AI Gateway (google/gemini-3-flash-preview) |
| Authentication | Supabase Auth with JWT + RLS policies |
| Realtime | Supabase Realtime (postgres_changes) |

### AI Infrastructure

All AI-powered evaluations route through a single unified gateway:

- **Gateway URL:** `https://ai.gateway.lovable.dev/v1/chat/completions`
- **Model:** `google/gemini-3-flash-preview`
- **Authentication:** `LOVABLE_API_KEY` (pre-configured, no user setup needed)
- **Scoring Method:** AI-as-Judge (60% weight) + Regex pattern matching (40% weight)

This eliminates all external dependencies on OpenRouter, HuggingFace, or other third-party APIs.

### Database Architecture

PostgreSQL with Row-Level Security (RLS) enforced on all tables. Key tables include:

- `models` -- Registered AI models with provider/endpoint metadata
- `systems` -- Deployment configurations linked to models
- `projects` -- Organizational grouping of systems
- `evaluations` -- Evaluation run results with scores and evidence
- `incidents` -- Governance incidents with severity tracking
- `review_queue` -- Human-in-the-loop review items
- `decision_ledger` -- Immutable decision log with cryptographic hash chains
- `admin_audit_log` -- Immutable audit trail with SHA-256 hash chains
- `datasets` / `dq_incidents` / `dq_rule_executions` -- Data quality governance
- `data_contracts` / `data_contract_violations` -- Schema SLA enforcement
- `kg_nodes` / `kg_edges` -- Knowledge Graph for lineage tracking
- `system_approvals` -- Governance approval workflow
- `attestations` -- Deployment attestation with SLSA levels

### Security Architecture

- **Zero-Trust:** Every function assumes the caller is untrusted
- **JWT Authentication:** User tokens validated at every layer
- **RLS Policies:** Database access enforced at the PostgreSQL level
- **Immutable Audit Logs:** SHA-256 hash chains on all audit records
- **90-Day Auto-Deletion:** GDPR-compliant data retention

---

## PART 3: NAVIGATION AND MODULES (Start to End)

The sidebar organizes the platform into 8 sections. Here is every page, what it does, and how it connects.

### 3.1 COMMAND CENTER (Route: `/`)

The landing dashboard. Shows:
- **HITL Queue Alert** -- Pending items requiring human review
- **Data Governance Panel** -- Dataset count, open DQ incidents, active data contracts, open violations
- **Core Security Cards** -- Quick links to AI Pentesting, Jailbreak Lab, Threat Modeling
- **Core RAI Engines Grid** -- 5 engine cards (Fairness, Hallucination, Toxicity, Privacy, Explainability)
- **Recent Incidents Feed** -- Last 5 incidents with severity badges
- **Platform Stats** -- ML model count, pending approvals, open alerts
- **Realtime Updates** -- Live WebSocket subscription for instant incident/review notifications

### 3.2 MONITOR

#### Observability (`/observability`)
Real-time monitoring of AI system health:
- Data drift detection
- Performance metrics
- Traffic monitoring
- Drift alerts configuration

#### Alerts (`/alerts`)
Alert management console:
- Active alert feed
- Threshold configuration
- Notification channel management
- Alert history

### 3.3 GOVERN

#### Approvals (`/governance/approvals`)
Governance approval workflow for system deployments:
- Pending/approved/rejected approval queue
- Role-based access (admin/reviewer only)
- Auto-created when system moves to `pending_approval` status
- Links to Knowledge Graph for lineage

#### Decision Ledger (`/decision-ledger`)
Immutable, cryptographically signed log of all AI decisions:
- Every decision has `input_hash`, `output_hash`, `record_hash`, `previous_hash`
- Forms an append-only hash chain per model
- Tamper detection via `verify_audit_chain()` database function
- Decision overrides tracked separately with their own hash chain

#### HITL Console (`/hitl`)
Human-in-the-Loop review interface:
- Items flagged by automated evaluation enter the review queue
- Bulk triage panel for batch processing
- SLA countdown timers
- Review decision dialog with approve/reject/escalate options
- Auto-assist suggestions via AI

#### Incidents (`/incidents`)
Incident management system:
- Auto-created when harmful decision outcomes are detected (via `escalate_harmful_outcome` trigger)
- Severity levels: low, medium, high, critical
- Status workflow: open -> investigating -> resolved
- Bulk resolution panel
- 180-day auto-archival for resolved incidents

#### Knowledge Graph (`/lineage`)
Visual knowledge graph showing relationships between:
- Models, Systems, Evaluations, Risks, Incidents, Decisions, Approvals, Attestations
- Auto-synced via database triggers (`sync_model_to_kg`, `sync_evaluation_to_kg`, etc.)
- Vector embeddings for semantic search (`match_nodes` function)
- Node detail panel with explain dialog

### 3.4 DATA GOVERNANCE

#### Data Quality Engine (`/engine/data-quality`)
Full-featured data quality platform:
- **Upload & Ingest** -- CSV/JSON file upload with profiling
- **Profiling** -- Column-level statistics, distribution analysis
- **Rule Generation** -- AI-generated quality rules based on data profile
- **Rule Execution** -- Run rules against datasets with pass/fail verdicts
- **Dashboard** -- Visual quality scorecard with trend charts
- **Monitoring** -- Streaming anomaly detection
- **Incidents** -- Auto-raised when quality thresholds are breached
- **Chat** -- AI assistant for data quality questions
- **Trust Report** -- Downloadable evidence package with SHA-256 hashes
- Hash-chained execution records via `compute_dq_execution_hash` trigger

#### Data Contracts (`/data-contracts`)
Schema-level data governance:
- Define expected schemas, freshness thresholds, quality SLAs
- Contract status: active, violated, expired
- Auto-violation detection via `update_contract_on_violation` trigger
- Validation via `validate-contract` edge function

### 3.5 CORE RAI ENGINES

All 5 engines share a common architecture:
1. **Predefined Test Cases** -- Curated ethical scenarios (40% expected-fail)
2. **Custom Prompt Testing** -- User-defined prompts evaluated by AI-as-Judge
3. **Transparency Components** -- InputOutputScope, ComputationBreakdown, RawDataLog, EvidencePackage
4. **Scoring** -- Weighted multi-metric formulas (detailed below)
5. **Compliance Banner** -- COMPLIANT (>=70%) or NON-COMPLIANT (<70%) with EU AI Act article reference

#### Fairness Engine (`/engine/fairness`)
**EU AI Act Reference:** Article 10 -- Data and data governance

5 Metrics with weights:
- Demographic Parity Difference (DPD) -- 25%
- Equal Opportunity Difference (EOD) -- 25%
- Equalized Odds Difference (EODs) -- 25%
- Group Loss Ratio (GLR) -- 15%
- Bias Tag Rate Gap (BRG) -- 10%

**Formula:** `Score = 0.25*DPD + 0.25*EOD + 0.25*EODs + 0.15*GLR + 0.10*BRG`

12 predefined test cases (7 expected-pass, 5 expected-fail) covering age, gender, income, credit score, region, and ethnicity demographics.

#### Hallucination Engine (`/engine/hallucination`)
**EU AI Act Reference:** Article 15 -- Accuracy and robustness

5 Metrics with weights:
- Response Hallucination Rate (HR) -- 30%
- Claim-level Hallucination Fraction (CHF) -- 25%
- Faithfulness Score (FS) -- 25%
- Unsupported Span Length (USL) -- 10%
- Abstention Quality (AQ) -- 10%

**Formula:** `Score = 0.30*HR + 0.25*CHF + 0.25*FS + 0.10*USL + 0.10*AQ`

Tests include grounding contexts, future-event questions, and factual verification scenarios.

#### Toxicity Engine (`/engine/toxicity`)
**EU AI Act Reference:** Article 9 -- Risk management system

5 Metrics with weights:
- Overall Toxic Output Rate (TOR) -- 30%
- Severe Toxicity Rate (STOR) -- 25%
- Toxicity Differential (delta-tox) -- 20%
- Topic-Conditioned Toxicity (TTOR) -- 15%
- Guardrail Catch Rate (GCR) -- 10%

**Formula:** `Score = 0.30*TOR + 0.25*STOR + 0.20*Diff + 0.15*Topic + 0.10*Guard`

11 test cases: 4 safe content, 4 adversarial probes (jailbreak, injection, hate elicitation, roleplay bypass), 3 boundary tests.

#### Privacy Engine (`/engine/privacy`)
**EU AI Act Reference:** Article 10(5) -- Data protection

5 Metrics with weights:
- PII Leakage Rate (PLR) -- 30%
- PHI Leakage Rate (PHLR) -- 20%
- Redaction Coverage (RC) -- 20%
- Secret/Credential Exposure (SER) -- 20%
- Minimization Compliance (MCR) -- 10%

**Formula:** `Score = 0.30*PII + 0.20*PHI + 0.20*Redact + 0.20*Secrets + 0.10*Min`

12 test cases covering SSN, email, credit card, phone, address, patient IDs, medical records, diagnosis data, API keys, and data extraction probes.

#### Explainability Engine (`/engine/explainability`)
**EU AI Act Reference:** Article 13 -- Transparency and provision of information

5 Metrics with weights:
- Clarity Score (CS) -- 30%
- Faithfulness Score (FS) -- 30%
- Coverage (ECov) -- 20%
- Actionability (AS) -- 10%
- Simplicity (Simple) -- 10%

**Formula:** `Score = 0.30*Clarity + 0.30*Faith + 0.20*Coverage + 0.10*Action + 0.10*Simple`

Includes SHAP visualization, counterfactual analysis, and reasoning chain display.

### Overall RAI Score

When all 5 engines have been run, the platform computes:

**`RAI Score = 0.25*Fairness + 0.25*Hallucination + 0.20*Toxicity + 0.20*Privacy + 0.10*Explainability`**

Status thresholds:
- >= 70%: COMPLIANT
- 50-69%: PARTIAL
- < 50%: NON_COMPLIANT

### 3.6 CORE SECURITY

#### Security Dashboard (`/security`)
Overview of AI security posture with aggregated scores from all security modules.

#### AI Pentesting (`/security/pentest`)
OWASP LLM Top 10 adversarial testing:
- Automated attack vector execution
- Vulnerability scanning
- Attack result reporting with severity classification

#### Jailbreak Lab (`/security/jailbreak`)
Prompt injection resistance testing:
- Pre-built jailbreak templates
- Custom prompt injection crafting
- Resistance scoring

#### Threat Modeling (`/security/threats`)
Multi-framework threat analysis:
- STRIDE methodology
- OWASP framework
- MAESTRO (AI-specific)
- ATLAS (adversarial threat landscape)
- Threat vector cards with mitigation recommendations

### 3.7 RESPOND

#### Policy Studio (`/policy`)
Policy authoring and enforcement:
- Policy DSL editor for writing governance rules
- Policy explainer (AI-powered plain-language summaries)
- Policy linting and validation
- Red team campaign form
- Compilation via `compile-policy` edge function

#### Golden Demo (`/golden`)
End-to-end demonstration workflow:
- Orchestrated demo that walks through the full platform
- Showcases all engines, governance, and security features

### 3.8 IMPACT

#### Impact Dashboard (`/impact-dashboard`)
Organizational AI impact assessment:
- Impact assessment wizard
- Impact matrix visualization
- Impact score cards
- Longitudinal fairness tracking
- Population impact computation

#### Regulatory Reports (`/regulatory-reports`)
Compliance report generation:
- EU AI Act compliance reports
- Audit report generation with hash-signed evidence
- Report ledger with cryptographic chain (`compute_report_ledger_hash`)
- PDF export capability

### 3.9 CONFIGURE

#### Projects (`/projects`)
Project registry:
- Create/manage AI projects
- Project detail pages with activity, documentation, models, and risk tabs

#### Models (`/models`)
Model registry:
- Currently: 1 model (Gemini 3 Flash Preview via Lovable AI Gateway)
- Model detail pages with evaluation history
- Training data lineage tracking

#### Runbooks (`/runbooks`)
Operational runbooks for incident response and governance procedures.

#### Settings (`/settings`)
Platform configuration (admin-only):
- Provider API key management
- HuggingFace integration settings
- User and team management
- Model connection forms

#### Documentation (`/docs`)
Built-in platform documentation.

---

## PART 4: BACKEND FUNCTIONS (Edge Functions)

60+ edge functions organized by capability:

### AI Inference
| Function | Purpose |
|----------|---------|
| `ai-gateway` | Unified LLM gateway routing |
| `llm-generate` | Direct LLM text generation |
| `copilot` | AI copilot assistant |
| `rai-assistant` | RAI-specific AI assistant |
| `rai-reasoning-engine` | Multi-step RAI reasoning |

### RAI Evaluation
| Function | Purpose |
|----------|---------|
| `eval-fairness` | Fairness evaluation with 5 AIF360 metrics |
| `eval-toxicity-hf` | Toxicity evaluation with AI-as-Judge |
| `eval-privacy-hf` | Privacy/PII evaluation |
| `eval-hallucination-hf` | Hallucination detection |
| `eval-explainability-hf` | Explainability scoring |
| `custom-prompt-test` | User-defined prompt evaluation with AI-as-Judge |
| `eval-data-quality` | Data quality scoring |

### Security
| Function | Purpose |
|----------|---------|
| `security-pentest` | OWASP LLM Top 10 testing |
| `security-jailbreak` | Prompt injection testing |
| `security-threat-model` | Multi-framework threat modeling |
| `run-red-team` | Red team campaign execution |

### Data Quality
| Function | Purpose |
|----------|---------|
| `dq-ingest-data` | Dataset ingestion |
| `dq-profile-dataset` | Statistical profiling |
| `dq-generate-rules` | AI-generated quality rules |
| `dq-execute-rules` | Rule execution engine |
| `dq-generate-dashboard-assets` | Dashboard visualization data |
| `dq-raise-incidents` | Auto-incident creation |
| `dq-detect-anomalies` | Anomaly detection |
| `dq-truth-enforcer` | Data truth enforcement |
| `dq-chat` | Data quality AI assistant |
| `dq-control-plane` | DQ orchestration |

### Knowledge Graph
| Function | Purpose |
|----------|---------|
| `kg-upsert` | Node/edge creation |
| `kg-query` | Graph querying |
| `kg-lineage` | Lineage traversal |
| `kg-explain` | AI-powered graph explanation |
| `kg-sync` | Sync entities to graph |

### Governance
| Function | Purpose |
|----------|---------|
| `log-decision` | Decision ledger recording |
| `explain-decision` | AI decision explanation |
| `process-appeal` | Appeal processing |
| `track-outcome` | Outcome tracking |
| `detect-governance-bypass` | Bypass detection |
| `hitl-auto-assist` | HITL AI suggestions |
| `incident-lifecycle` | Incident state management |
| `predictive-governance` | Predictive risk scoring |
| `compute-runtime-risk` | Runtime risk calculation |
| `validate-contract` | Data contract validation |
| `policy-lint` | Policy syntax validation |
| `compile-policy` | Policy compilation |
| `policy-violation-handler` | Violation auto-handling |

### Reporting and Audit
| Function | Purpose |
|----------|---------|
| `generate-scorecard` | RAI scorecard generation |
| `generate-audit-report` | Audit report with hash chains |
| `audit-data` | Audit data retrieval |
| `compute-population-impact` | Population-level impact |
| `generate-remediation` | AI remediation suggestions |

### Monitoring
| Function | Purpose |
|----------|---------|
| `detect-drift` | Data/model drift detection |
| `ml-detection` | ML anomaly detection |
| `ingest-events` | Event ingestion pipeline |
| `process-events` | Event processing |
| `generate-synthetic-events` | Synthetic data generation |
| `generate-test-traffic` | Test traffic simulation |
| `record-mlops-event` | MLOps event logging |
| `run-quality-tests` | Quality test execution |
| `send-notification` | Multi-channel notifications |
| `cicd-gate` | CI/CD governance gate |
| `target-executor` | Target system execution |
| `realtime-chat` | Real-time chat interface |

---

## PART 5: TRANSPARENCY COMPONENTS

Every engine uses 4 shared transparency components:

### InputOutputScope
Banner showing whether the evaluation covers INPUT only, OUTPUT only, or BOTH. Ensures users understand what data the engine analyzed.

### ComputationBreakdown
Shows the exact mathematical formula, weights, intermediate values, and final score calculation. Nothing is hidden -- every number is traceable.

### RawDataLog
Timestamped log of all API calls, latency measurements, and raw response data. Includes execution timestamps and processing duration.

### EvidencePackage
Downloadable JSON containing all evaluation data, signed with SHA-256 hash. Enables independent verification and regulatory audit submission.

### ComplianceBanner
Color-coded compliance status:
- Green: COMPLIANT (score >= 70%)
- Red: NON-COMPLIANT (score < 70%) with EU AI Act article reference and remediation guidance

---

## PART 6: AI-AS-JUDGE SCORING SYSTEM

The platform uses a hybrid scoring approach for custom prompt tests:

### Step 1: Model Response
The user's prompt is sent to `google/gemini-3-flash-preview` via the Lovable AI Gateway. The model generates a response.

### Step 2: AI Judge Evaluation (60% weight)
A second call is made to the same gateway with an engine-specific "judge prompt." The judge evaluates whether the model's response was appropriate in context. For example:
- Did the model refuse a discriminatory request? (Toxicity/Fairness)
- Did the model echo back PII? (Privacy)
- Did the model make unsupported claims? (Hallucination)
- Did the model explain its reasoning clearly? (Explainability)

The judge returns a structured JSON with scores and identified issues.

### Step 3: Regex Pattern Scan (40% weight)
Pattern matching for literal violations (slurs, PII formats, specific phrases).

### Step 4: Combined Score
`Final Score = 0.6 * AI Judge Score + 0.4 * Regex Score`

This ensures both contextual understanding AND measurable pattern detection.

---

## PART 7: DATABASE INTEGRITY AND AUDIT

### Hash Chains
Multiple tables use append-only cryptographic hash chains:
- `admin_audit_log` -- `compute_audit_hash()` trigger
- `decision_ledger` -- `compute_decision_hash()` trigger
- `decision_overrides` -- `compute_override_hash()` trigger
- `dataset_quality_runs` -- `compute_quality_run_hash()` trigger
- `audit_report_ledger` -- `compute_report_ledger_hash()` trigger
- `dq_rule_executions` -- `compute_dq_execution_hash()` trigger

Each record's hash incorporates the previous record's hash, creating a tamper-evident chain. The `verify_audit_chain()` function can validate the entire chain's integrity.

### Auto-Sync Triggers
Database triggers automatically populate the Knowledge Graph:
- `sync_model_to_kg` -- When models are created
- `sync_evaluation_to_kg` -- When evaluations complete
- `sync_risk_to_kg` -- When risk assessments are created
- `sync_incident_to_kg` -- When incidents are raised
- `sync_approval_to_kg` -- When approvals change
- `sync_decision_to_kg` -- When decisions are logged
- `sync_attestation_to_kg` -- When attestations are created
- `sync_mlops_event_to_kg` -- When MLOps events occur

### Auto-Escalation
The `escalate_harmful_outcome()` trigger automatically creates incidents when decision outcomes are classified as harmful with high/critical severity.

---

## PART 8: AUTHENTICATION AND ACCESS CONTROL

### Role-Based Access
- **Admin** -- Full access including Settings, system lock/unlock, audit chain verification
- **Reviewer** -- Access to Approvals queue
- **Analyst** -- Governance management capabilities
- **User** -- Standard access to engines, dashboards, and reports

### Protected Routes
All routes except `/auth` and `/error` require authentication via the `ProtectedRoute` component. Some routes enforce specific roles (e.g., Settings requires `admin`, Approvals requires `admin` or `reviewer`).

### System Lock/Unlock
Admin-only functions with mandatory justification (minimum 20 characters):
- `lock_system()` -- Blocks deployment, records reason in audit log
- `unlock_system()` -- Restores draft status, requires written justification

---

## PART 9: REGULATORY COMPLIANCE

### EU AI Act Mapping
Every metric type maps to a specific EU AI Act article:
- **Fairness** -- Article 10: Data and data governance
- **Toxicity** -- Article 9: Risk management system
- **Privacy** -- Article 10(5): Data protection
- **Hallucination** -- Article 15: Accuracy and robustness
- **Explainability** -- Article 13: Transparency and provision of information

### GDPR Compliance
- 90-day auto-deletion of evaluation data via `cleanup_old_logs()` function
- Data minimization scoring in Privacy engine
- Right to explanation via Explainability engine
- Immutable audit trail for accountability

### Compliance Threshold
70% minimum score required for COMPLIANT status across all engines. Scores below 70% trigger NON-COMPLIANT warnings with specific regulatory references and remediation guidance.

---

## PART 10: DEPLOYMENT AND INFRASTRUCTURE

### Frontend
- Vite build system with lazy-loaded routes for performance
- Dark theme by default (`next-themes` with `ThemeProvider`)
- Responsive sidebar with collapse/expand
- Error boundaries for graceful failure handling
- Structured logging via `@/lib/structured-logger`

### Backend
- 60+ Supabase Edge Functions (Deno runtime)
- Auto-deployed on code changes
- CORS headers on all functions
- Mix of JWT-verified and public endpoints (configured in `supabase/config.toml`)

### Realtime
- WebSocket subscriptions for incidents, review queue, and DQ incidents
- Dashboard auto-refreshes on database changes
- Toast notifications for new incidents

---

This documentation covers the complete Fractal RAI-OS platform from the Command Center landing page through every module, engine, security tool, governance workflow, and backend function. The platform represents a unified, transparent, and regulation-ready approach to Responsible AI governance.
