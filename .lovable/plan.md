

# Fix Unreachable Pages, Broken Interactions, and Data Bugs

## What's Wrong

1. **5 pages exist but have no routes** — ImpactDashboard, RegulatoryReports, Runbooks, Policy, GoldenDemoV2 are unreachable
2. **Hook ordering crash** in ImpactDashboard.tsx — `useState` defined after `useMutation` that references their setters
3. **Wrong column names** in RegulatoryReports.tsx insert — uses `content` / `content_hash` but DB columns are `report_content` / `document_hash`
4. **Evaluation.tsx disabled buttons** — Schedule, Create Suite, and Play on suite cards are all disabled/no-op
5. **Hardcoded +23% trend** in Evaluation.tsx — never derived from real data
6. **Missing sidebar entries** for Policy, Runbooks, ImpactDashboard, RegulatoryReports, Evaluation

## Plan

### 1. Add missing routes in App.tsx

Register these 5 lazy-loaded routes inside `ProtectedRoute`:
- `/impact` → ImpactDashboard
- `/regulatory-reports` → RegulatoryReports  
- `/runbooks` → Runbooks
- `/policy` → Policy
- `/golden-demo` → GoldenDemoV2

### 2. Fix hook ordering in ImpactDashboard.tsx

Move the 3 `useState` declarations (lines 104–106) to before the `useMutation` call (line 75). React requires all hooks in stable order before any conditional logic.

### 3. Fix column names in RegulatoryReports.tsx

Line 90–91: change `content: data` → `report_content: data` and `content_hash: data.content_hash` → `document_hash: data.content_hash`.

### 4. Wire Evaluation.tsx buttons

- **Schedule button**: Navigate to `/continuous-evaluation` instead of being disabled
- **Create Suite button**: Open `EvaluationSuiteForm` dialog (component already exists)
- **Play button on suite cards**: Trigger a new evaluation run via `supabase.functions.invoke('run-scheduled-evaluations')` with the suite ID
- **Fix +23% hardcoded trend**: Compute from real `runs` data — compare this month's count vs last month's

### 5. Add sidebar entries

Add to the appropriate sections in `Sidebar.tsx` navItems:
- Under **Govern**: `/evaluation` (Evaluation Hub), `/impact` (Impact Dashboard), `/runbooks` (Runbooks)
- Under **Monitor**: `/regulatory-reports` (Regulatory Reports)
- Under **Configure** or a new **Respond** section: `/policy` (Policy Studio)

### Files Changed

| File | Change |
|------|--------|
| `src/App.tsx` | Add 5 lazy imports + 5 routes |
| `src/components/layout/Sidebar.tsx` | Add 5 nav items |
| `src/pages/ImpactDashboard.tsx` | Move useState hooks before useMutation |
| `src/pages/RegulatoryReports.tsx` | Fix column names in insert |
| `src/pages/Evaluation.tsx` | Wire Schedule→navigate, Create Suite→dialog, Play→invoke, fix trend |

