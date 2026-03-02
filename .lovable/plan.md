
# Validation: What Is Implemented vs. What Is NOT

## 1. Discovery and Inventory

| Claimed Feature | Status | Evidence |
|----------------|--------|----------|
| AI Registry -- catalog all AI systems | IMPLEMENTED | `Projects.tsx`, `Models.tsx`, `SystemDetail.tsx` -- project/system/model registry with CRUD |
| Shadow AI discovery | NOT IMPLEMENTED | Zero code references to shadow AI detection, auto-discovery, or scanning |
| Agent cataloging | NOT IMPLEMENTED | No agent registry, agent type tracking, or agent inventory exists |
| App-level cataloging | PARTIAL | Systems table tracks "apps" loosely, but no formal app-type classification |
| Vendor tracking across enterprise | NOT IMPLEMENTED | No vendor registry, third-party AI vendor scanning, or vendor risk profiles |
| Hyperscaler integration (AWS/Azure/GCP) | NOT IMPLEMENTED | No cloud provider connectors, no API integrations with hyperscaler AI services |
| Automatic discovery | NOT IMPLEMENTED | All registration is manual via forms -- no scanning, crawling, or auto-detect |

**Verdict: ~25% implemented.** You have a manual registry. The "automatic discovery" and "shadow AI" claims are entirely missing.

---

## 2. Risk Assessment

| Claimed Feature | Status | Evidence |
|----------------|--------|----------|
| Bias evaluation | IMPLEMENTED | `eval-fairness` edge function with real AIF360-based metrics (DPD, EOD, EOdds) |
| Security assessment | IMPLEMENTED | `security-pentest`, `security-jailbreak`, `security-threat-model` edge functions |
| Privacy evaluation | IMPLEMENTED | `eval-privacy-hf` edge function via Lovable AI Gateway |
| Hallucination evaluation | IMPLEMENTED | `eval-hallucination-hf` edge function via Lovable AI Gateway |
| Drift detection | IMPLEMENTED | `detect-drift` with real PSI and KL Divergence calculations |
| Compliance assessment | IMPLEMENTED | `Governance.tsx` with control frameworks, assessments, attestations |
| Proprietary risk library trained on thousands of scenarios | NOT IMPLEMENTED | No pre-trained risk scenario library exists; evaluations run on user-provided data |
| Continuous/real-time assessment | PARTIAL | Evaluations are on-demand (user-triggered), not continuous or scheduled |
| Agent-level assessment | NOT IMPLEMENTED | No agent-specific risk evaluation |
| Application-level assessment | PARTIAL | System-level risk via `compute-runtime-risk`, but not true "application-level" |

**Verdict: ~60% implemented.** Core risk engines (bias, security, privacy, hallucination, drift) are real. Missing: continuous scheduling, agent-level, proprietary risk library.

---

## 3. Policy Enforcement

| Claimed Feature | Status | Evidence |
|----------------|--------|----------|
| Policy packs | IMPLEMENTED | `usePolicies.ts`, `PolicyDSLEditor.tsx` -- create and manage policy packs |
| EU AI Act workflows | IMPLEMENTED | `EUAIActAssessment.tsx`, compliance banners reference EU AI Act articles |
| NIST AI RMF | PARTIAL | Referenced in documentation and compliance banners, but no dedicated NIST control pack |
| ISO 42001 | PARTIAL | Referenced in `evaluator-harness.ts` but no dedicated ISO 42001 control framework |
| SOC 2 | PARTIAL | Referenced in Settings as "Enterprise feature" -- planned, not implemented |
| HITRUST | NOT IMPLEMENTED | Zero code references |
| Deployment gates | IMPLEMENTED | `cicd-gate` edge function with JWT tokens, governance checks, TOCTOU validation |
| Human-in-the-loop escalations | IMPLEMENTED | `HITL.tsx`, `review_queue` table, `policy-violation-handler` auto-escalation |
| Audit-ready documentation generation | IMPLEMENTED | `generate-audit-report`, `generate-scorecard`, `RegulatoryReports.tsx` |
| Pre-built policy packs (out of the box) | NOT IMPLEMENTED | Users must create all policies manually; no pre-loaded regulation-specific packs |

**Verdict: ~55% implemented.** Core policy engine + HITL + deployment gates work. Missing: pre-built regulation packs (NIST, ISO 42001, SOC 2, HITRUST), auto-enforcement workflows.

---

## 4. Runtime Monitoring

| Claimed Feature | Status | Evidence |
|----------------|--------|----------|
| Always-on monitoring | PARTIAL | `Observability.tsx` with Supabase Realtime subscriptions on `request_logs`, `drift_alerts` |
| Policy violation detection | IMPLEMENTED | `policy-violation-handler` auto-detects and escalates violations |
| Drift detection | IMPLEMENTED | `detect-drift` with PSI/KL Divergence, `DriftDetector.tsx` UI |
| Automated enforcement | IMPLEMENTED | `compute-runtime-risk` auto-suspends systems with >20% block rate |
| Agent trace monitoring | NOT IMPLEMENTED | No agent trace capture, agent execution logging, or agent behavior analysis |
| Emergent behavior detection | NOT IMPLEMENTED | No behavioral anomaly detection or emergent pattern analysis |
| Runtime risk scoring | IMPLEMENTED | `compute-runtime-risk` calculates URI score combining static + runtime risk |

**Verdict: ~50% implemented.** Runtime risk scoring, drift detection, and auto-enforcement are real. Missing: agent traces, emergent behavior detection, truly "always-on" (currently requires manual trigger or page visit).

---

## 5. Reporting and Scaling

| Claimed Feature | Status | Evidence |
|----------------|--------|----------|
| Unified reporting | IMPLEMENTED | `RegulatoryReports.tsx`, `AuditCenter.tsx`, `generate-scorecard` |
| Evidence generation | IMPLEMENTED | `EvidencePackage.tsx` with SHA-256 hashes, downloadable JSON |
| Stakeholder alignment | PARTIAL | Reports exist but no stakeholder-specific views, role-based report access, or executive dashboards |
| Modular expansion | IMPLEMENTED | `GovernanceFramework.tsx`, `SemanticLayerHub.tsx` with standalone API gateways |
| Pilot to production scaling | NOT IMPLEMENTED | No environment management (dev/staging/prod), no multi-tenant isolation, no scaling controls |
| Fortune 500 trust / "Measurable Trust" branding | NOT APPLICABLE | Marketing claims, not a technical feature |

**Verdict: ~50% implemented.** Reporting and evidence generation work. Missing: stakeholder-specific views, environment management, scaling infrastructure.

---

## Summary Scorecard

| Pillar | Implemented | Gaps |
|--------|------------|------|
| 1. Discovery and Inventory | 25% | Shadow AI, auto-discovery, vendor tracking, hyperscaler integration |
| 2. Risk Assessment | 60% | Continuous scheduling, agent-level, proprietary risk library |
| 3. Policy Enforcement | 55% | Pre-built regulation packs (NIST, ISO 42001, SOC 2, HITRUST) |
| 4. Runtime Monitoring | 50% | Agent traces, emergent behavior, truly always-on scheduling |
| 5. Reporting and Scaling | 50% | Stakeholder views, environment management, multi-tenant |

## Overall Platform Readiness: ~48%

## Critical Gaps to Address (Priority Order)

1. **Shadow AI Discovery and Auto-Inventory** -- The entire first pillar depends on automatic scanning. Currently everything is manual registration.
2. **Pre-Built Regulation Policy Packs** -- EU AI Act, NIST AI RMF, ISO 42001, SOC 2 need to ship as ready-to-use control frameworks with pre-mapped controls.
3. **Continuous/Scheduled Evaluations** -- Risk assessments are user-triggered only. Need cron-based or event-driven continuous evaluation.
4. **Agent-Level Governance** -- No agent registry, no agent trace monitoring, no agent-level risk assessment. This is a complete blind spot.
5. **Environment Management and Scaling** -- No dev/staging/prod isolation, no multi-tenant support, no horizontal scaling controls.
