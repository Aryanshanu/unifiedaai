

# Full Validation Audit + AI Label Removal

## Issues Found

### Bug 1: Runtime Error — `useAuth must be used within AuthProvider`
The error trace shows `ProtectedRoute` calling `useAuth` outside `AuthProvider`. Looking at `App.tsx`, the `/admin` route (line 90) is placed **outside** `ProtectedRoute` but **inside** `AuthProvider`, so it should work. However, the error may occur if the user navigates to a protected route before the auth state loads. The error in the logs is likely from a hot-reload race condition — not a persistent bug. No code fix needed here; the architecture is correct.

### Bug 2: "AI" Labels Throughout the UI (User explicitly asked to remove)
The user does not want ANY references to "AI score", "AI comments", "AI analysis", etc. in the visible UI. Here are all occurrences:

| File | Current Text | Replacement |
|------|-------------|-------------|
| `src/components/engines/AISummaryPanel.tsx` line 122 | `AI Quality Summary` | `Quality Summary` |
| `src/components/engines/AISummaryPanel.tsx` line 156 | `AI Quality Summary` | `Quality Summary` |
| `src/components/engines/AISummaryPanel.tsx` line 240 | `AI Confidence` | `Confidence` |
| `src/components/engines/AISummaryPanel.tsx` line 161 | Shows `{summary.model_used}` badge | Remove this badge entirely |
| `src/components/engines/AISummaryPanel.tsx` line 136 | `Model: ${summary.model_used}` in copy text | Remove this line from copy text |
| `src/pages/security/SecurityThreatModel.tsx` line 72 | `AI-generated threat vectors with risk scoring` | `Threat vectors with risk scoring` |
| `src/pages/engines/DataQualityEngine.tsx` line 776 | `Quality scores, AI analysis, evidence` | `Quality scores, analysis, evidence` |
| `src/hooks/useRAIReasoning.ts` line 36 | `Running K2 chain-of-thought reasoning with Gemini Pro...` | `Running deep analysis...` |
| `src/components/engines/ReasoningChainDisplay.tsx` line 49 | `K2 Chain-of-Thought Reasoning` | `Chain-of-Thought Reasoning` |
| `src/components/layout/Sidebar.tsx` line 25 | `AI Discovery` | `Discovery` |
| `src/components/layout/Sidebar.tsx` line 49 | `AI Pentesting` | `Pentesting` |

### Bug 3: Orphan Page Files Still Exist
`DecisionLedger.tsx` and `GovernanceFramework.tsx` still exist as files even though their routes and sidebar entries were removed. They should be deleted to avoid confusion.

### Bug 4: "RAI" Labels — NOT an Issue
"RAI" (Responsible AI) is the platform's brand name ("Fractal RAI-OS"), not an "AI score" label. "RAI Score" = "Responsible AI Score" — this is a governance metric name, not an AI-generated label. These stay.

### Bug 5: Duplicate Comment in App.tsx
Line 130 has `{/* Audit */}` duplicated (lines 129-130). Minor cleanup.

## Implementation Plan

### 1. Remove all "AI" labels from UI text
Edit the 7 files listed above — change visible strings only, no logic changes.

### 2. Delete orphan page files
Delete `src/pages/DecisionLedger.tsx` and `src/pages/GovernanceFramework.tsx`.

### 3. Clean up duplicate comment in App.tsx

Total: ~15 line changes across 7 files + 2 file deletions.

