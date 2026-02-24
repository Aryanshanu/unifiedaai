

# Semantic Layer V2: Production-Grade "Definition IS the Code" Architecture

## Overview

Transform the current basic YAML editor into a full production-grade semantic layer with version history, vector sync for AI agent consumption, a semantic proxy API, drift detection, and an observer dashboard -- all following the GitOps-for-data philosophy.

---

## Part 1: Database Schema Additions

### New Tables

**`semantic_definition_versions`** -- Immutable version history (Git-like snapshots)
- `id` (uuid PK)
- `definition_id` (uuid FK -> semantic_definitions)
- `version` (integer)
- `definition_yaml` (text -- frozen snapshot)
- `definition_hash` (text -- SHA-256)
- `change_summary` (text -- what changed)
- `promoted_by` (uuid -- who approved promotion to active)
- `created_by` (uuid)
- `created_at` (timestamptz)

**`semantic_query_log`** -- Tracks every query executed through the semantic proxy
- `id` (uuid PK)
- `definition_id` (uuid FK)
- `metric_name` (text)
- `consumer_type` (text: 'ai_agent', 'bi_tool', 'api', 'manual')
- `query_latency_ms` (integer)
- `row_count` (integer)
- `status` (text: 'success', 'error')
- `error_message` (text nullable)
- `queried_by` (uuid)
- `queried_at` (timestamptz)

**`semantic_drift_alerts`** -- Drift detection results
- `id` (uuid PK)
- `definition_id` (uuid FK)
- `drift_type` (text: 'synonym_conflict', 'logic_deviation', 'stale_definition', 'schema_mismatch')
- `severity` (text: 'low', 'medium', 'high', 'critical')
- `details` (jsonb)
- `status` (text: 'open', 'acknowledged', 'resolved')
- `detected_at` (timestamptz)
- `resolved_at` (timestamptz nullable)

### Schema Changes to Existing `semantic_definitions`

Add columns:
- `upstream_dependencies` (jsonb -- array of table/metric names this depends on)
- `test_suite` (jsonb -- expectations like `value > 0`, `no_nulls`)
- `deployment_count` (integer default 0 -- how many consumers use this)
- `last_queried_at` (timestamptz nullable)
- `query_count` (integer default 0)
- `embedding` (vector(768) nullable -- pgvector embedding for semantic search)

### Triggers

- `on_definition_update` -- Auto-insert into `semantic_definition_versions` whenever `definition_yaml` changes
- `compute_version_hash` -- SHA-256 hash on version snapshots

---

## Part 2: Enhanced YAML Validation Engine

Replace the basic `parseSimpleYaml` with a proper JSON-Schema-based validator in the `DefinitionEditor`:

**Validation Rules (enforced client-side):**
1. `name` -- Required, must be snake_case (`^[a-z0-9_]+$`)
2. `display_name` -- Required
3. `sql` -- Required, minimum 10 characters
4. `grain` -- Required, must be one of: `customer`, `transaction`, `daily`, `monthly`, `entity`
5. `owner` -- Required, must be valid email format
6. `synonyms` -- Must be unique items
7. `governance.sensitivity` -- Must be one of: `public`, `internal`, `confidential`, `business-critical`

**Live Validation:** Errors appear inline as the user types, not just on button click.

---

## Part 3: Version History & Promotion Workflow

### UI Addition: Version History Panel

When viewing/editing a definition, show a collapsible "Version History" section:
- Timeline of all versions with hash, author, timestamp
- Diff view between any two versions (YAML text diff)
- "Rollback to this version" button

### Promotion Workflow

- New definitions start as `draft`
- Moving to `active` requires clicking "Promote to Production"
- This creates a version snapshot and updates the main record
- Deprecation marks the definition as no longer authoritative

---

## Part 4: Vector Sync Service (AI Agent Consumption)

### Edge Function: `semantic-compiler`

Triggered when a definition is saved. It:
1. Generates a vector embedding of `name + display_name + description + synonyms + ai_context` using the Lovable AI Gateway
2. Stores the embedding in the `embedding` column on `semantic_definitions`
3. This enables AI agents to find the right metric via semantic similarity (e.g., "What was the revenue last month?" matches `monthly_recurring_revenue`)

### Semantic Search Hook: `useSemanticSearch`

New hook that calls `match_nodes`-style vector similarity search against the `semantic_definitions` table, allowing natural language metric discovery.

---

## Part 5: Semantic Proxy Edge Function

### Edge Function: `semantic-query`

This is the "SQL Gatekeeper" -- AI agents and BI tools query metrics through this proxy instead of writing raw SQL.

**Request:** `POST /semantic-query` with `{ metric_name: "mrr", filters: { region: "US" }, grain: "monthly" }`

**Flow:**
1. Look up `metric_name` in `semantic_definitions` (or fuzzy match via synonyms/embedding)
2. Retrieve `sql_logic` from the definition
3. Log the query in `semantic_query_log`
4. Return the metric definition + SQL logic (not execute -- we don't have warehouse access)
5. Update `query_count` and `last_queried_at` on the definition

This ensures every consumer uses the same computation logic.

---

## Part 6: Drift Detection

### Edge Function: `semantic-drift-check`

Analyzes definitions for potential drift:
1. **Synonym Conflicts** -- Two definitions sharing the same synonym
2. **Stale Definitions** -- Active definitions not queried in 30+ days
3. **Schema Issues** -- Definitions referencing tables/columns that may not exist
4. **Duplicate Logic** -- Two definitions with very similar SQL but different names

Results stored in `semantic_drift_alerts` and displayed on definition cards.

### UI: Drift Score on Cards

The `DriftScoreIndicator` component already exists. It will now be wired to real data from `semantic_drift_alerts` count per definition instead of the current hardcoded `0`.

---

## Part 7: Observer Dashboard (Metric Health)

### New Tab System on Semantic Definitions Page

Convert the page from a simple card grid to a tabbed layout:

**Tab 1: Registry** (current card grid)
**Tab 2: Health Dashboard** -- New component showing:
- Total definitions (active/draft/deprecated breakdown)
- Query volume chart (queries per day from `semantic_query_log`)
- Most queried metrics (top 10)
- Least queried metrics (potential deprecation candidates)
- Open drift alerts feed
- Consumer breakdown pie chart (ai_agent vs bi_tool vs api vs manual)

**Tab 3: Drift Alerts** -- Table of all drift alerts with severity badges, status, and resolution actions.

---

## Part 8: Enhanced Definition Card

Update `DefinitionCard` to show:
- Real drift score from `semantic_drift_alerts` count
- Query count badge (e.g., "142 queries")
- Last queried timestamp
- Consumer count
- Upstream dependency badges

---

## Files Modified / Created

| File | Action |
|------|--------|
| **Database Migration** | Add 3 new tables + alter `semantic_definitions` with new columns + triggers |
| `src/pages/SemanticDefinitions.tsx` | Add tabbed layout (Registry, Health, Drift Alerts) |
| `src/components/semantic/DefinitionEditor.tsx` | Replace parser with JSON-Schema validator, add live validation |
| `src/components/semantic/DefinitionCard.tsx` | Wire real drift/query data |
| `src/components/semantic/VersionHistoryPanel.tsx` | **New** -- Version timeline with diff view |
| `src/components/semantic/SemanticHealthDashboard.tsx` | **New** -- Observer dashboard with charts |
| `src/components/semantic/DriftAlertsTable.tsx` | **New** -- Drift alert management table |
| `src/components/semantic/SemanticSearchBar.tsx` | **New** -- Natural language metric search |
| `src/hooks/useSemanticDefinitions.ts` | Add version history hooks, query log hooks, drift alert hooks |
| `src/hooks/useSemanticSearch.ts` | **New** -- Vector similarity search hook |
| `supabase/functions/semantic-compiler/index.ts` | **New** -- Vector embedding generation on save |
| `supabase/functions/semantic-query/index.ts` | **New** -- Semantic proxy / SQL gatekeeper |
| `supabase/functions/semantic-drift-check/index.ts` | **New** -- Drift detection engine |

---

## Technical Notes

- Vector embeddings use pgvector (already installed in the project) with the Lovable AI Gateway to generate embeddings
- All new tables get RLS policies scoped to authenticated users
- Version history is append-only (no deletes) for audit compliance
- The semantic proxy does NOT execute SQL against a warehouse (no warehouse connected) -- it returns the governed SQL logic for the consumer to execute
- Drift detection runs on-demand via the UI, not as a background cron (keeping it user-triggered per the platform's real-data philosophy)

