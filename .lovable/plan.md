

# Modular Architecture: AI Governance Framework + Semantic Layer for AI

## Current State Assessment

The platform already has significant infrastructure for both modules, but it's tightly coupled to the web UI. The goal is to expose these as **standalone, self-contained API modules** that work independently and can be plugged into Snowflake, Databricks, AI agents, or any external system.

## What Already Exists vs. What Needs to Be Built

### AI Governance Framework

| Component | Exists? | Current State | Work Needed |
|-----------|---------|---------------|-------------|
| Bias Monitoring | Yes | `eval-fairness` edge function, tightly coupled to UI flow | Create unified `/governance/bias-report` API |
| Audit Logging | Yes | `log-decision`, `admin_audit_log` table with hash chains | Create `/governance/audit-log` unified API |
| Model Registry | Yes | `models` table, model registration form | Create `/governance/model-metadata/{modelName}` API |
| Explainability | Partial | `explain-decision` uses **simulated SHAP** (`Math.random()`) | Fix with real AI-powered explanations via `/governance/explain` |
| Human Override | Yes | `review_queue`, `process-appeal` functions | Create `/governance/override-request` API |
| Incident Response | Yes | `incident-lifecycle`, `incidents` table | Create `/governance/incidents` unified API |

### Semantic Layer for AI

| Component | Exists? | Current State | Work Needed |
|-----------|---------|---------------|-------------|
| Feature Store | No | Only `semantic_definitions` for business metrics | Build feature registry table + APIs |
| Feature Calculation | No | DQ profiling exists but not feature computation | Build feature computation pipeline |
| Feature APIs | Partial | `semantic-query` does metric lookup | Create `/semantic/features/{id}` APIs |
| Metadata/Governance | Yes | `semantic_definitions` with versioning, drift checks | Extend with feature-level metadata |

---

## Implementation Plan

### Phase 1: AI Governance Gateway (Single Unified Edge Function)

Create a new edge function `ai-governance-gateway` that acts as the unified API router for all governance operations. This replaces the need for external systems to know about individual function names.

**New file: `supabase/functions/ai-governance-gateway/index.ts`**

Routes:
- `POST /bias-report` -- Run bias evaluation on a model, return structured report
- `POST /audit-log` -- Log a model decision with SHA-256 hash chain
- `GET /audit-log?model_id=X&from=DATE&to=DATE` -- Query audit trail
- `GET /model-metadata/{modelName}` -- Return model card, lineage, scores
- `POST /explain` -- Generate real AI-powered explanation (fix the `Math.random()` in current `explain-decision`)
- `POST /override-request` -- Submit a human review request
- `POST /incidents/check` -- Run incident detection rules
- `GET /incidents?severity=critical&status=open` -- Query incidents

Each route delegates to existing database tables but normalizes the response format for external consumption.

**Key fix:** The current `explain-decision` function uses `Math.random()` for SHAP values (line 38). The gateway will use the Lovable AI Gateway (Gemini) to generate real feature importance analysis.

### Phase 2: Semantic Layer Gateway (Single Unified Edge Function)

Create a new edge function `semantic-layer-gateway` as the unified API for the semantic/feature layer.

**New file: `supabase/functions/semantic-layer-gateway/index.ts`**

Routes:
- `GET /features/{customerId}` -- Retrieve computed features for an entity
- `GET /feature-list` -- List all registered features with metadata
- `POST /realtime-signal` -- Ingest a real-time signal/event
- `GET /definition/{metricName}` -- Get governed metric definition (SQL, version, hash)
- `POST /search` -- Semantic search across definitions
- `GET /lineage/{featureId}` -- Feature dependency graph

### Phase 3: Database Schema for Feature Store

**New migration:** Create `feature_registry` and `feature_values` tables.

```text
feature_registry
+------------------+----------+------------------------------------------+
| Column           | Type     | Description                              |
+------------------+----------+------------------------------------------+
| id               | uuid     | Primary key                              |
| name             | text     | snake_case feature name                  |
| display_name     | text     | Human-readable name                      |
| description      | text     | What this feature represents             |
| data_type        | text     | numeric, categorical, boolean, timestamp |
| grain            | text     | customer, transaction, daily, entity     |
| source_system    | text     | Where raw data comes from                |
| computation_sql  | text     | SQL/logic to compute the feature         |
| version          | integer  | Monotonically increasing version         |
| status           | text     | draft, active, deprecated                |
| owner            | text     | Owner email                              |
| refresh_cadence  | text     | realtime, hourly, daily, weekly          |
| quality_score    | numeric  | Latest computed quality (0-1)            |
| definition_hash  | text     | SHA-256 of computation logic             |
| created_at       | timestamp| Auto-set                                 |
| updated_at       | timestamp| Auto-set                                 |
+------------------+----------+------------------------------------------+

feature_values
+------------------+----------+------------------------------------------+
| id               | uuid     | Primary key                              |
| feature_id       | uuid     | FK to feature_registry                   |
| entity_id        | text     | customer_id, transaction_id, etc.        |
| value            | jsonb    | The computed feature value               |
| computed_at      | timestamp| When this value was calculated           |
| version          | integer  | Which feature version produced this      |
| source_hash      | text     | Hash of source data used                 |
+------------------+----------+------------------------------------------+
```

### Phase 4: Fix Explainability Engine (Critical Bug)

The current `explain-decision` function (lines 28-51) generates **fake SHAP values using `Math.random()`**. This is a critical honesty violation.

**Fix:** Route explanation requests through the Lovable AI Gateway to generate real feature importance analysis based on the actual decision context, input features, and model output.

### Phase 5: Frontend Integration Pages

Create two new hub pages that expose the modular APIs visually:

**New file: `src/pages/GovernanceFramework.tsx`**
- API documentation view showing all `/governance/*` endpoints
- Live API tester (send requests, see responses)
- Status dashboard showing module health
- Integration code snippets (Python, curl, JavaScript)

**New file: `src/pages/SemanticLayerHub.tsx`**
- Feature store browser (list, search, inspect features)
- Feature computation runner
- API documentation for `/semantic/*` endpoints
- Integration guide

**Update: `src/components/layout/Sidebar.tsx`**
- Add "AI Governance API" under GOVERN section
- Add "Feature Store" under DATA GOVERNANCE section

**Update: `src/App.tsx`**
- Add routes for `/governance-framework` and `/semantic-hub`

---

## Summary of All File Changes

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/ai-governance-gateway/index.ts` | CREATE | Unified governance API with 8 routes |
| `supabase/functions/semantic-layer-gateway/index.ts` | CREATE | Unified semantic/feature API with 6 routes |
| `supabase/functions/explain-decision/index.ts` | EDIT | Replace `Math.random()` SHAP with real AI explanations |
| `src/pages/GovernanceFramework.tsx` | CREATE | Governance API hub page |
| `src/pages/SemanticLayerHub.tsx` | CREATE | Semantic Layer / Feature Store hub page |
| `src/components/layout/Sidebar.tsx` | EDIT | Add nav items for new hub pages |
| `src/App.tsx` | EDIT | Add routes |
| Database migration | CREATE | `feature_registry` and `feature_values` tables with RLS |

## Architecture Diagram

```text
External Systems (Snowflake, Databricks, AI Agents, Microservices)
          |                              |
          v                              v
+-------------------+       +---------------------+
| ai-governance-    |       | semantic-layer-     |
| gateway           |       | gateway             |
|                   |       |                     |
| /bias-report      |       | /features/{id}      |
| /audit-log        |       | /feature-list       |
| /model-metadata   |       | /realtime-signal    |
| /explain          |       | /definition/{name}  |
| /override-request |       | /search             |
| /incidents        |       | /lineage/{id}       |
+--------+----------+       +----------+----------+
         |                              |
         v                              v
+------------------------------------------------+
|              Database Layer                     |
| models, evaluation_runs, incidents,            |
| decision_ledger, admin_audit_log,              |
| review_queue, semantic_definitions,            |
| feature_registry (NEW), feature_values (NEW)   |
+------------------------------------------------+
```

## Technical Notes

- Both gateway functions use JWT auth -- external systems authenticate with API keys stored as bearer tokens
- All responses follow a consistent envelope: `{ success: boolean, data: T, meta: { timestamp, version, hash } }`
- The gateways are thin routers -- they delegate to existing database tables and logic, not reimplementing anything
- Feature store uses `jsonb` for values to support any data type without schema changes
- Both modules are fully independent -- either can be deployed/used without the other

