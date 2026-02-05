
# Command Center Refactoring and Core System Enhancement Plan

## Executive Summary

This plan addresses the user's request to:
1. **Refactor the Command Center** to display only Data Governance and Core RAI content (remove 6-stage governance pipeline components)
2. **Ensure 100% functional accuracy** for Data Governance (Data Quality Engine, Data Contracts) and Core Security features
3. **Fix icon and label issues** for Jailbreak Lab and AI Pentesting
4. **Remove output restrictions** in Core RAI engines (currently truncating responses to 500 characters)
5. **Implement proper incident/alert workflow** for Data Quality and Core RAI violations

---

## Part 1: Command Center Page Refactoring

### Current State Analysis
The Command Center (`src/pages/Index.tsx`) currently displays 25+ widgets including:
- GovernanceFlowDiagram (6-stage pipeline) - **TO REMOVE**
- SLODashboard & OversightAgentStatus - **TO REMOVE**  
- SimulationController & PredictiveRiskPanel - **TO REMOVE**
- IncidentSummaryCard & FeedbackLoopDiagram - **TO REMOVE**
- RealityCheckDashboard - **TO REMOVE**
- GovernanceHealthCards - **TO REMOVE**
- PlatformHealthCards - **TO KEEP (modify)**
- Quick Actions cards - **TO MODIFY**
- Core RAI Engines cards - **TO KEEP**

### New Command Center Structure

```text
+------------------------------------------------------------------+
|                     COMMAND CENTER                                |
|  Autonomous Governance Platform                                   |
+------------------------------------------------------------------+
|                                                                   |
|  [ Alert Banners: HITL Queue / High-Risk / Unsafe Deployments ]   |
|                                                                   |
+------------------------------------------------------------------+
|  DATA GOVERNANCE                    |  CORE SECURITY              |
|  +---------------------------+      |  +------------------------+ |
|  | Data Quality Engine       |      |  | Security Dashboard     | |
|  | - Datasets: X             |      |  | - Findings: X          | |
|  | - Avg Score: X%           |      |  | - Critical: X          | |
|  | - Incidents: X            |      |  +------------------------+ |
|  +---------------------------+      |                             |
|  +---------------------------+      |  +------------------------+ |
|  | Data Contracts            |      |  | AI Pentesting          | |
|  | - Active: X               |      |  | Jailbreak Lab          | |
|  | - Violations: X           |      |  | Threat Modeling        | |
|  +---------------------------+      |  | Attack Library         | |
|                                     |  +------------------------+ |
+------------------------------------------------------------------+
|  CORE RAI ENGINES                                                 |
|  +------------+ +-------------+ +-----------+ +--------+ +------+ |
|  | Fairness   | | Hallucinate | | Toxicity  | | Privacy| |Explain||
|  +------------+ +-------------+ +-----------+ +--------+ +------+ |
+------------------------------------------------------------------+
|  ACTIVITY & LOGS                                                  |
|  +-----------------------------------------------------------+   |
|  | Recent Incidents (from DQ & RAI) | Recent Alerts | Metrics |   |
|  +-----------------------------------------------------------+   |
+------------------------------------------------------------------+
```

### Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Index.tsx` | Remove 6-stage pipeline, oversight widgets; add Data Governance cards, Core Security cards, activity logs |

---

## Part 2: Icon and Label Corrections

### Current Issues
- **Jailbreak Lab**: Uses `Skull` icon (morbid/unprofessional)
- **AI Pentesting**: Uses `Bug` icon (too generic)

### Proposed Changes

| Location | Component | Current | New |
|----------|-----------|---------|-----|
| `src/components/layout/Sidebar.tsx` line 54 | Jailbreak Lab | `Skull` | `Swords` or `FlaskConical` |
| `src/components/layout/Sidebar.tsx` line 53 | AI Pentesting | `Bug` | `ScanSearch` or `ShieldAlert` |
| `src/pages/security/JailbreakLab.tsx` line 126 | Header icon | `Skull` | `FlaskConical` |
| `src/pages/security/Pentesting.tsx` line 123 | Header icon | `Bug` | `ScanSearch` |

---

## Part 3: Remove Output Restrictions in Core RAI Engines

### Current Truncation Issue
Found in `src/components/engines/CustomPromptTest.tsx` lines 268-271:
```tsx
{customResult.model_response.length > 500 
  ? customResult.model_response.slice(0, 500) + "..." 
  : customResult.model_response}
```

Also in backend at `supabase/functions/eval-toxicity-hf/index.ts` line 338:
```ts
output: result.output?.substring(0, 500) || result.error,
```

### Solution: Expandable Full Response

Create a collapsible/expandable component that shows:
- First 300 characters by default with "Show Full Response" button
- Full response when expanded
- Copy to clipboard functionality

Files to modify:
- `src/components/engines/CustomPromptTest.tsx` - Replace truncation with expandable view
- All `eval-*-hf/index.ts` functions - Remove `substring(0, 500)` truncation in raw logs

---

## Part 4: Incident & Alert Workflow for Data Quality

### Current State
- `dq-raise-incidents` creates incidents in `dq_incidents` table
- These are **NOT** connected to main `incidents` table or `alerts` page
- No HITL escalation for DQ violations

### Required Flow

```text
Data Quality Rule Violation
    ↓
dq-raise-incidents (creates dq_incident)
    ↓
NEW: Also create entry in main 'incidents' table
    ↓
NEW: If severity = P0/critical, auto-escalate to review_queue (HITL)
    ↓
NEW: Trigger send-notification for configured alert channels
```

### Implementation

1. **Modify `supabase/functions/dq-raise-incidents/index.ts`**:
   - After inserting into `dq_incidents`, also insert into main `incidents` table
   - Map P0 -> critical, P1 -> high, P2 -> medium severity
   - For P0/critical, insert into `review_queue` for HITL

2. **Add alert trigger**:
   - Call `send-notification` for critical incidents
   - Include incident details and remediation action

---

## Part 5: Incident & Alert Workflow for Core RAI Engines

### Current State (Good)
All 5 RAI engines already auto-escalate to HITL when non-compliant:
- `eval-fairness/index.ts` lines 546-556: Inserts into `review_queue`
- `eval-toxicity-hf/index.ts` lines 457-467: Inserts into `review_queue`
- Similar pattern in privacy, hallucination, explainability engines

### Missing Pieces
1. **Main incidents table integration** - RAI violations create `review_queue` entries but NOT `incidents`
2. **Alert page visibility** - Need to create alerts for RAI violations

### Required Changes

For each RAI engine (`eval-fairness`, `eval-toxicity-hf`, `eval-privacy-hf`, `eval-hallucination-hf`, `eval-explainability-hf`):

1. Add incident creation when non-compliant:
```typescript
if (!isCompliant) {
  // Existing: review_queue insert
  
  // NEW: Create incident
  await serviceClient.from("incidents").insert({
    title: `${engineType} NON-COMPLIANT: ${overallScore}%`,
    description: `Model failed ${engineType} evaluation`,
    severity: overallScore < 50 ? "critical" : "high",
    status: "open",
    incident_type: "rai_violation",
    model_id: modelId,
  });
  
  // NEW: Create drift alert for visibility
  await serviceClient.from("drift_alerts").insert({
    feature: engineType,
    drift_type: "compliance",
    drift_value: (100 - overallScore) / 100,
    severity: overallScore < 50 ? "critical" : "high",
    status: "open",
  });
}
```

---

## Part 6: Core Security - 100% Accuracy Verification

### Components to Verify

| Page | Status | Required Fixes |
|------|--------|----------------|
| SecurityDashboard.tsx | Functional | None identified |
| Pentesting.tsx | Functional | Icon change only |
| JailbreakLab.tsx | Functional | Icon change only |
| ThreatModeling.tsx | Functional | None identified |
| AttackLibrary.tsx | Functional | None identified |

### Backend Edge Functions to Verify

| Function | Status | Notes |
|----------|--------|-------|
| `agent-pentester` | Deployed | Functional |
| `agent-jailbreaker` | Deployed | Functional |
| `agent-threat-modeler` | Deployed | Functional |
| `security-evidence-service` | Deployed | Functional |

All Core Security functions appear correctly implemented based on code review.

---

## Part 7: Data Governance - 100% Accuracy Verification

### Data Quality Engine Pipeline

| Stage | Function | Status | Issues |
|-------|----------|--------|--------|
| 1. Ingest | `dq-ingest-data` | Deployed | None |
| 2. Profile | `dq-profile-dataset` | Deployed | None |
| 3. Generate Rules | `dq-generate-rules` | Deployed | None |
| 4. Execute Rules | `dq-execute-rules` | Deployed | None |
| 5. Dashboard Assets | `dq-generate-dashboard-assets` | Deployed | None |
| 6. Raise Incidents | `dq-raise-incidents` | Deployed | Needs main incidents integration |

### Data Contracts

| Component | Status | Notes |
|-----------|--------|-------|
| Contract creation | Functional | Via DataContractsContent.tsx |
| Contract validation | Functional | validate-contract edge function |
| SLA enforcement | Functional | Checked in eval-data-quality |

---

## Implementation Summary

### Phase 1: Command Center Refactoring
1. Rewrite `src/pages/Index.tsx` to remove pipeline components
2. Add Data Governance summary cards
3. Add Core Security summary cards
4. Keep Core RAI engine cards
5. Add activity/logs section

### Phase 2: Icon and Label Fixes
1. Update `src/components/layout/Sidebar.tsx` icons
2. Update page header icons in Pentesting.tsx and JailbreakLab.tsx

### Phase 3: Output Restriction Removal
1. Modify `CustomPromptTest.tsx` with expandable response component
2. Update all 5 RAI engine edge functions to remove raw log truncation

### Phase 4: Incident/Alert Workflow
1. Modify `dq-raise-incidents` to create main incidents + HITL escalation
2. Modify all 5 RAI engines to create incidents + alerts on non-compliance

### Phase 5: Deploy and Test
1. Deploy modified edge functions
2. Test DQ pipeline end-to-end
3. Test RAI engines with non-compliant scenarios
4. Verify incidents appear in Incidents page
5. Verify alerts appear in Alerts page
6. Verify HITL queue receives escalations

---

## Technical Notes

### Edge Functions to Modify
- `supabase/functions/dq-raise-incidents/index.ts`
- `supabase/functions/eval-fairness/index.ts`
- `supabase/functions/eval-toxicity-hf/index.ts`
- `supabase/functions/eval-privacy-hf/index.ts`
- `supabase/functions/eval-hallucination-hf/index.ts`
- `supabase/functions/eval-explainability-hf/index.ts`

### Frontend Files to Modify
- `src/pages/Index.tsx` (major rewrite)
- `src/components/layout/Sidebar.tsx` (icon changes)
- `src/pages/security/JailbreakLab.tsx` (icon change)
- `src/pages/security/Pentesting.tsx` (icon change)
- `src/components/engines/CustomPromptTest.tsx` (expandable response)

### New Components to Create
- `ExpandableModelResponse.tsx` - Collapsible full response viewer
- `DataGovernanceSummaryCard.tsx` - DQ metrics summary for Command Center
- `SecuritySummaryCard.tsx` - Security metrics summary for Command Center
