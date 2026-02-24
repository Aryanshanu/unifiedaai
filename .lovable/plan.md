

# Semantic Layer Full Integration Across Platform

## Overview

The Semantic Layer currently lives as a standalone page at `/semantic-definitions`. This plan wires it into every relevant part of the platform workflow: Command Center, Data Quality Engine, Data Contracts, Knowledge Graph, RAI Engines, Model Registration, Copilot/Assistant, and Observability.

---

## Integration Point 1: Command Center Dashboard

**Location:** `src/pages/Index.tsx`

**What:** Add a "Semantic Layer" summary card under the Data Governance section (alongside Data Quality Engine and Data Contracts).

**Details:**
- Query `semantic_definitions` for counts: total active, total draft, total deprecated
- Query `semantic_drift_alerts` for open drift alert count
- Display card with BookOpen icon, definition counts, and open drift alerts
- Click navigates to `/semantic-definitions`
- Add realtime subscription for `semantic_drift_alerts` table changes

**Priority:** HIGH -- Command Center should surface semantic health at a glance.

---

## Integration Point 2: Data Quality Engine

**Location:** `src/pages/engines/DataQualityEngine.tsx`

**What:** When profiling or validating a dataset, show which semantic definitions reference that dataset's tables/columns.

**Details:**
- After profiling completes, query `semantic_definitions` where `sql_logic` contains the dataset name or column names (text search)
- Show a small "Linked Semantic Definitions" badge/panel in the profiling results
- If a column is referenced by a semantic definition, show a BookOpen icon next to it in the column analysis grid
- Clicking the badge navigates to the definition editor

**Priority:** MEDIUM -- Helps users understand which metrics depend on their data.

---

## Integration Point 3: Data Contracts

**Location:** `src/pages/DataContracts.tsx`

**What:** Link data contracts to semantic definitions that consume the contracted dataset.

**Details:**
- When viewing a data contract, show "Consuming Definitions" section listing semantic definitions whose `upstream_dependencies` or `sql_logic` references the contracted dataset
- When a contract violation occurs, show which semantic definitions are impacted
- Add a "Create Definition" quick action from the contract view

**Priority:** MEDIUM -- Contracts protect datasets; definitions consume them.

---

## Integration Point 4: Knowledge Graph

**Location:** `src/pages/Lineage.tsx` + database triggers

**What:** Sync semantic definitions to the Knowledge Graph as `semantic_definition` node type.

**Details:**
- New database trigger: `sync_semantic_definition_to_kg` -- on INSERT/UPDATE to `semantic_definitions`, upsert a KG node with `entity_type = 'semantic_definition'`
- Create edges: `semantic_definition` -> `depends_on` -> `dataset` (based on `upstream_dependencies`)
- Add `semantic_definition` to the node color map in `Lineage.tsx` (e.g., teal/BookOpen)
- This makes definitions visible in the lineage graph alongside models, datasets, and evaluations

**Priority:** HIGH -- The KG is the governance backbone; definitions must appear in it.

---

## Integration Point 5: RAI Engine Evaluation Context

**Location:** All 5 engine pages (`FairnessEngine.tsx`, etc.)

**What:** When running an evaluation, pass relevant semantic definitions as context to the AI judge.

**Details:**
- Before evaluation, check if the selected model has related semantic definitions (via system -> project -> definitions)
- If definitions exist, include their `ai_context` field in the evaluation prompt sent to the AI gateway
- This makes the AI judge aware of the business metric semantics when scoring
- Show a small "Semantic Context" indicator (BookOpen badge) on the engine page when definitions are being used

**Priority:** LOW -- Enhancement for AI judge accuracy; not blocking.

---

## Integration Point 6: Model Registration

**Location:** `src/components/models/ModelRegistrationForm.tsx`

**What:** During model registration (Step 3: Governance), allow linking semantic definitions to the model.

**Details:**
- Add an optional "Linked Semantic Definitions" multi-select field in the Governance step
- Query active definitions from `semantic_definitions` for the dropdown
- Store selected definition IDs in the model's `metadata` JSONB field (key: `semantic_definitions`)
- This establishes a formal link between models and the metrics they compute

**Priority:** MEDIUM -- Governance traceability.

---

## Integration Point 7: Copilot / RAI Assistant

**Location:** `src/components/copilot/CopilotDrawer.tsx` + `src/components/assistant/RAIAssistant.tsx` + `supabase/functions/copilot/index.ts` + `supabase/functions/rai-assistant/index.ts`

**What:** Make the AI assistants aware of semantic definitions so they can answer metric questions accurately.

**Details:**
- In the `copilot` and `rai-assistant` edge functions, before generating a response, query `semantic_definitions` for active definitions
- Include definition names, descriptions, SQL logic, and AI context in the system prompt
- This prevents the AI from hallucinating metric definitions -- it uses the governed semantic contract
- Add suggested questions: "What semantic definitions are active?", "How is MRR calculated?"

**Priority:** HIGH -- This is the core "Definition IS the Code" value: AI agents consume the semantic contract.

---

## Integration Point 8: Drift Alerts on Observability

**Location:** `src/pages/Observability.tsx`

**What:** Surface semantic drift alerts alongside data drift alerts.

**Details:**
- Add a "Semantic Drift" section or tab showing open `semantic_drift_alerts`
- Reuse the `DriftAlertsTable` component already built
- This gives operators a single pane of glass for all drift types

**Priority:** LOW -- Nice consolidation but the dedicated Drift tab on Semantic page already covers this.

---

## Summary of Changes by File

| File | Change | Priority |
|------|--------|----------|
| `src/pages/Index.tsx` | Add Semantic Layer summary card + realtime subscription | HIGH |
| `src/pages/Lineage.tsx` | Add `semantic_definition` node color | HIGH |
| Database migration | KG sync trigger for semantic definitions | HIGH |
| `supabase/functions/copilot/index.ts` | Include semantic definitions in system prompt | HIGH |
| `supabase/functions/rai-assistant/index.ts` | Include semantic definitions in system prompt | HIGH |
| `src/pages/DataContracts.tsx` | Add "Consuming Definitions" section | MEDIUM |
| `src/components/models/ModelRegistrationForm.tsx` | Add linked definitions multi-select | MEDIUM |
| `src/pages/engines/DataQualityEngine.tsx` | Show linked definitions in profiling | MEDIUM |
| `src/pages/engines/FairnessEngine.tsx` (and 4 others) | Semantic context indicator | LOW |
| `src/pages/Observability.tsx` | Semantic drift section | LOW |

---

## Technical Notes

- All new queries use `(supabase as any)` pattern consistent with existing semantic hooks
- KG sync trigger follows the exact pattern of `sync_model_to_kg`, `sync_evaluation_to_kg`, etc.
- No new tables needed -- all integration uses existing `semantic_definitions`, `semantic_drift_alerts`, and `kg_nodes`/`kg_edges`
- Copilot/Assistant integration queries definitions at request time (not cached) to always use the latest active definitions
- Priority ordering: HIGH items first (Command Center, KG, Copilot), then MEDIUM (Contracts, Models, DQ), then LOW (Engines, Observability)
