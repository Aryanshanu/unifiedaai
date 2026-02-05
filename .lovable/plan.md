

# Threat Modeling Alignment Plan
## Making Threat Modeling Work Like the Fixed Core Security Module

---

## Problem Analysis

After investigating, I found:

### What's Working
- The backend `agent-threat-modeler` edge function **works correctly**
- Threat models are being created with proper risk scores (7/10)
- Vectors are being persisted (9-13 vectors per model)
- Database contains valid data with confidence levels, likelihood, impact scores

### What's Broken (UI Issues)

| Issue | Description |
|-------|-------------|
| **No confidence visualization** | Missing ConfidenceIndicator, SeverityBadge from ScoreTooltip.tsx |
| **No decision traces** | No DecisionTracePanel for explaining how risks were calculated |
| **No tabbed workflow** | Single flow instead of tabs like JailbreakLab (Generate/History/Custom) |
| **Query filtering bug** | When no system selected, queries return all models but UI only shows first match |
| **No real target testing** | Unlike jailbreaker, threat modeler only generates AI analysis, doesn't test the actual target |
| **Missing empty states** | No proper "No systems configured" or "Select a system" messages |

---

## Implementation Plan

### Phase 1: Fix the Query Filtering Logic

**Problem**: When `selectedSystemId` is empty, the hook queries ALL models, but the UI logic:
```typescript
const activeModel = models.find(m => m.framework === selectedFramework);
const activeVectors = vectors.filter(v => v.threat_model_id === activeModel?.id);
```
...only shows vectors for the FIRST matching model, not the correct one for the selected system.

**Fix**: Ensure `selectedSystemId` is required before showing any threat models. Add explicit empty states.

---

### Phase 2: Add ScoreTooltip Components to ThreatModeling

Import and use the new components we created:
- `ConfidenceIndicator` - for vector confidence levels
- `SeverityBadge` - for risk level visualization
- `DecisionTracePanel` - for explainability (expandable breakdown)

Update `ThreatVectorRow.tsx` to use these instead of basic Badge components.

---

### Phase 3: Add Tabbed Interface

Add tabs matching JailbreakLab pattern:
- **Generate**: Run threat model generation for selected framework
- **History**: View previously generated threat models
- **Custom**: Define custom threat vectors manually

---

### Phase 4: Enhance agent-threat-modeler with Real Target Testing

Current behavior: AI generates hypothetical threats.
New behavior: Execute actual prompts against target to validate vulnerability.

Add new action: `action: 'validate-vector'`
- Takes a threat vector
- Generates a test prompt for that specific threat
- Executes against target system
- Returns real validation result

---

### Phase 5: Add Proper Empty States

Add explicit states for:
- No systems configured → CTA to /models
- No system selected → Clear instruction to select
- No threat models for system → CTA to generate
- Generation in progress → Loading state with context

---

## Files to Modify

### 1. `src/pages/security/ThreatModeling.tsx` (MAJOR REWRITE)
- Add tabbed interface (Generate/History/Custom)
- Import ScoreTooltip components
- Add proper empty states
- Fix query filtering logic
- Add vector validation action

### 2. `src/components/security/ThreatVectorRow.tsx` (ENHANCE)
- Replace basic Badge with SeverityBadge
- Add ConfidenceIndicator
- Add collapsible DecisionTracePanel
- Add "Validate" button to test individual vectors

### 3. `supabase/functions/agent-threat-modeler/index.ts` (ENHANCE)
- Add `validate-vector` action
- Use target-executor to test real vulnerabilities
- Add confidence calculation matching jailbreaker pattern
- Add decision trace generation

### 4. `src/hooks/useThreatModels.ts` (MINOR FIX)
- Ensure queries require systemId when filtering vectors
- Add refetch function for realtime updates

---

## Technical Changes

### ThreatModeling.tsx - New Structure

```text
+------------------------------------------+
| Target System Selector | Framework Select |
+------------------------------------------+
| Tabs: [Generate] [History] [Custom]      |
+------------------------------------------+
| Tab Content:                              |
| - Generate: Run threat model + results   |
| - History: Previous models + vectors     |
| - Custom: Manual vector entry            |
+------------------------------------------+
| Vector List with:                        |
| - SeverityBadge (Critical/High/Medium)   |
| - ConfidenceIndicator (color dot + %)    |
| - Validate Button → Real target test     |
| - Collapsible DecisionTrace              |
+------------------------------------------+
```

### ThreatVectorRow.tsx - Enhanced Display

```text
| Threat Title | Framework Tags | L | I | Risk | Confidence | Actions |
|--------------|----------------|---|---|------|------------|---------|
| S01: Spoof   | STRIDE         | 4 | 5 | 20   | [●] 85%    | Validate|
| ↳ Expandable DecisionTrace with:                                     |
|   - Risk calculation breakdown                                       |
|   - Mitigation checklist                                             |
|   - Validation result (if tested)                                    |
```

### agent-threat-modeler - New Action

```typescript
if (action === 'validate-vector') {
  // 1. Fetch the vector details
  // 2. Generate a test prompt for this threat type
  // 3. Execute against target via target-executor
  // 4. Judge response for vulnerability presence
  // 5. Return validation result + decision trace
}
```

---

## Expected Outcome

After implementation:
- Select a system → see clear empty state if no models
- Generate → creates model with confidence-scored vectors
- Each vector shows SeverityBadge + ConfidenceIndicator
- Click "Validate" → tests real target for that vulnerability
- Expand vector → see DecisionTracePanel with full breakdown
- Switch between Generate/History/Custom tabs
- All threat models persist to database
- Realtime updates when new models/vectors created

