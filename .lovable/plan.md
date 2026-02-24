
# Sidebar Cleanup + Semantic Layer ("Definition IS the Code") + Model Registration Fix

## Part 1: Remove Sidebar Segments and Routes

### What Gets Removed

| Segment | Items Removed |
|---------|--------------|
| **Impact** | Impact Dashboard, Regulatory Reports (entire segment) |
| **Respond** | Policy Studio, Golden Demo (entire segment) |
| **Configure** | Runbooks |

### Files Modified

**`src/components/layout/Sidebar.tsx`** -- Remove lines 61-66 (Respond + Impact segments) and line 71 (Runbooks) from `navItems` array.

**`src/App.tsx`** -- Remove routes and lazy imports for:
- `/impact-dashboard` (ImpactDashboard)
- `/regulatory-reports` (RegulatoryReports)
- `/policy` (Policy)
- `/golden` (GoldenDemoV2)
- `/runbooks` (Runbooks)

No pages will be deleted (they stay in the codebase for future use), just disconnected from routing and navigation.

---

## Part 2: "Definition IS the Code" -- Semantic Layer Implementation

### Concept

Build a **Semantic Definitions** module where business metric definitions are written once in declarative YAML and become the executable specification. This replaces the traditional split between "governance catalog definition" and "code implementation."

### New Page: `/semantic-definitions`

A full-featured semantic layer editor with:

1. **Definition Editor** -- YAML-based editor where users declare metrics with:
   - Business name and description
   - SQL/computation logic
   - Grain (what entity the metric measures)
   - Synonyms (alternative names AI agents should recognize)
   - AI context (how AI agents should interpret this metric)
   - Owner and governance metadata

2. **Definition Registry** -- List of all semantic definitions with:
   - Status badges (draft, active, deprecated)
   - Version history
   - Consumption tracking (which tools/agents use this definition)

3. **Validation Engine** -- When a definition is saved:
   - Parse YAML for syntax errors
   - Validate SQL logic references
   - Check for semantic conflicts (duplicate metric names, conflicting synonyms)
   - Generate a SHA-256 hash of the definition (immutable versioning)

4. **Drift Detection** -- Compare definitions against actual usage:
   - Flag when a BI tool or AI agent computes a metric differently than the definition
   - Show "semantic drift score" per definition

### Example YAML Definition

```text
metric:
  name: monthly_recurring_revenue
  display_name: "Monthly Recurring Revenue"
  description: "Sum of all active subscription revenues normalized to monthly"
  owner: finance-team@company.com
  grain: customer
  sql: |
    SELECT SUM(amount / billing_interval_months)
    FROM subscriptions
    WHERE status = 'active'
  synonyms:
    - MRR
    - recurring revenue
    - monthly revenue
  ai_context: "Use this metric when users ask about recurring revenue. Never compute revenue differently."
  governance:
    eu_ai_act_article: "Article 13"
    sensitivity: "business-critical"
    refresh_cadence: "daily"
```

### Database Table

New `semantic_definitions` table:
- `id` (uuid, PK)
- `name` (text, unique, not null)
- `display_name` (text)
- `description` (text)
- `definition_yaml` (text, the full YAML source)
- `owner_email` (text)
- `status` (enum: draft, active, deprecated)
- `version` (integer, auto-increment per name)
- `definition_hash` (text, SHA-256 of the YAML content)
- `grain` (text)
- `sql_logic` (text)
- `synonyms` (text array)
- `ai_context` (text)
- `metadata` (jsonb)
- `created_by` (uuid, references auth.users)
- `created_at`, `updated_at` (timestamptz)

RLS: Users can read all, create/update their own.

### Sidebar Addition

Under **DATA GOVERNANCE** section, add:
- "Semantic Layer" with a `BookOpen` icon, pointing to `/semantic-definitions`

### New Files

| File | Purpose |
|------|---------|
| `src/pages/SemanticDefinitions.tsx` | Main page with definition list + YAML editor |
| `src/hooks/useSemanticDefinitions.ts` | CRUD hooks for semantic_definitions table |
| `src/components/semantic/DefinitionEditor.tsx` | YAML editor with syntax highlighting and validation |
| `src/components/semantic/DefinitionCard.tsx` | Card showing a single definition with status/version |
| `src/components/semantic/DriftScoreIndicator.tsx` | Visual indicator for semantic drift |

---

## Part 3: Fix Model Registration Flow (End-to-End)

### Current Problem

The model registration form asks users to enter:
- Provider (OpenAI, Anthropic, HuggingFace, Azure, Custom)
- Endpoint URL
- API Key

This is **dead code** -- the platform routes ALL inference through the Lovable AI Gateway (`google/gemini-3-flash-preview`). The endpoint and API key fields are never used. Users fill them in, the values get stored in the DB, and then get ignored by every edge function.

### Fix: Simplify to Reality

**Remove from ModelRegistrationForm:**
- Step 3 "Provider" -- Remove the provider selection grid (OpenAI, Anthropic, Google, etc.)
- Step 4 "Configuration" -- Remove endpoint URL and API key fields

**Replace with:**
- Auto-set provider to "Lovable" and endpoint to the gateway URL
- Show an informational banner: "This model will be evaluated using the Fractal AI Gateway (Gemini 3 Flash Preview). No API key configuration needed."

**Reduce steps from 6 to 4:**
1. Project Selection
2. Basic Info (name, type, description)
3. Governance (license, access tier, SLA, risk classification, training dataset)
4. Review and Submit

**Also fix `ConnectModelForm.tsx`:**
- Remove entirely or replace with a read-only status card showing the current gateway configuration
- The form currently lets users enter endpoints/keys that are never used

**Also fix `Models.tsx`:**
- Remove the HuggingFace Settings tab (dead code, all inference goes through Lovable AI Gateway)

**`useCreateModel` hook changes:**
- Auto-populate `endpoint` with `https://ai.gateway.lovable.dev/v1/chat/completions`
- Auto-populate `provider` with `Lovable`
- Remove `api_token` from the insert (not needed, LOVABLE_API_KEY is a backend secret)
- System creation auto-sets `model_name` to `google/gemini-3-flash-preview`

### Files Modified

| File | Change |
|------|--------|
| `src/components/models/ModelRegistrationForm.tsx` | Remove steps 3-4, reduce to 4-step flow, auto-set provider/endpoint |
| `src/components/settings/ConnectModelForm.tsx` | Replace with gateway status card |
| `src/pages/Models.tsx` | Remove HuggingFace Settings tab |
| `src/hooks/useModels.ts` | Auto-set provider/endpoint in useCreateModel |

---

## Summary of All Changes

| Area | Action |
|------|--------|
| Sidebar | Remove Impact, Respond, Runbooks segments |
| Routes | Remove 5 routes (impact-dashboard, regulatory-reports, policy, golden, runbooks) |
| Semantic Layer | New page, DB table, hooks, components for "Definition IS the Code" |
| Model Registration | Simplify from 6 steps to 4, auto-configure Lovable AI Gateway |
| ConnectModelForm | Replace fake endpoint/key form with gateway status display |
| Models page | Remove dead HuggingFace tab |
