

# Fix Core Security Backend and Sidebar Layout Issues

## Summary

Two critical issues identified and must be fixed:

1. **Backend Not Working**: The `agent-pentester` edge function runs but returns 0 findings because the `automated_test_cases` and `attack_library` tables are empty - no seed data exists
2. **Sidebar Jumping**: The `MainLayout.tsx` has a hardcoded `pl-64` padding that doesn't respond to sidebar collapse state, causing layout instability

---

## Phase 1: Seed Security Test Data

Create a database migration to populate the required tables with curated security test cases.

### 1.1 OWASP LLM Top 10 Automated Test Cases (40 tests)

Insert into `automated_test_cases` table:

| Category | Test Code | Description |
|----------|-----------|-------------|
| LLM01 | PENTEST_LLM01_001-005 | Prompt Injection tests (5) |
| LLM02 | PENTEST_LLM02_001-004 | Insecure Output Handling (4) |
| LLM03 | PENTEST_LLM03_001-003 | Training Data Poisoning (3) |
| LLM04 | PENTEST_LLM04_001-004 | Model Denial of Service (4) |
| LLM05 | PENTEST_LLM05_001-003 | Supply Chain Vulnerabilities (3) |
| LLM06 | PENTEST_LLM06_001-005 | Sensitive Info Disclosure (5) |
| LLM07 | PENTEST_LLM07_001-003 | Insecure Plugin Design (3) |
| LLM08 | PENTEST_LLM08_001-004 | Excessive Agency (4) |
| LLM09 | PENTEST_LLM09_001-003 | Overreliance (3) |
| LLM10 | PENTEST_LLM10_001-003 | Model Theft (3) |

### 1.2 Attack Library Seed Data (50+ attacks)

Insert into `attack_library` table:

| Category | Count | Examples |
|----------|-------|----------|
| Jailbreak | 10 | DAN prompt, Role-play escape, Hypothetical scenarios |
| Prompt Injection | 10 | Ignore previous, System prompt extraction |
| Toxicity | 8 | Hate speech probes, Discrimination tests |
| PII Extraction | 8 | SSN extraction, Email harvesting |
| Harmful Content | 7 | Violence instructions, Illegal activity |
| Policy Bypass | 7 | Content filter bypass, Safety override |

---

## Phase 2: Fix Sidebar Layout Synchronization

### 2.1 Create Shared Sidebar Context

Create a new context to share the collapsed state between `Sidebar` and `MainLayout`:

```typescript
// src/contexts/SidebarContext.tsx
import { createContext, useContext, useState, ReactNode } from 'react';

interface SidebarContextType {
  collapsed: boolean;
  setCollapsed: (value: boolean) => void;
  toggle: () => void;
}

const SidebarContext = createContext<SidebarContextType | null>(null);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <SidebarContext.Provider value={{ 
      collapsed, 
      setCollapsed,
      toggle: () => setCollapsed(prev => !prev) 
    }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebarContext() {
  const context = useContext(SidebarContext);
  if (!context) throw new Error('useSidebarContext must be used within SidebarProvider');
  return context;
}
```

### 2.2 Update Sidebar.tsx

- Remove local `collapsed` state
- Use `useSidebarContext()` hook instead
- Call `toggle()` from context on collapse button click

### 2.3 Update MainLayout.tsx

- Import and use `useSidebarContext()`
- Change padding from hardcoded `pl-64` to dynamic:

```typescript
const { collapsed } = useSidebarContext();
// ...
<div className={cn(
  "transition-all duration-300 flex flex-col flex-1",
  collapsed ? "pl-16" : "pl-64"
)}>
```

### 2.4 Wrap App with SidebarProvider

Update `App.tsx` to wrap the router with `SidebarProvider`.

---

## Phase 3: Add Loading State Stabilization

### 3.1 Prevent Sidebar Re-renders

In `Sidebar.tsx`, memoize the metrics query or use `staleTime` to prevent frequent re-fetches:

```typescript
const { data: metrics } = usePlatformMetrics({ 
  staleTime: 30000 // 30 seconds 
});
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/contexts/SidebarContext.tsx` | Shared sidebar state context |
| `supabase/migrations/xxx_seed_security_data.sql` | Seed test cases and attack library |

## Files to Modify

| File | Change |
|------|--------|
| `src/components/layout/Sidebar.tsx` | Use shared context instead of local state |
| `src/components/layout/MainLayout.tsx` | Dynamic padding based on collapsed state |
| `src/App.tsx` | Wrap with SidebarProvider |
| `src/hooks/usePlatformMetrics.ts` | Add staleTime option |

---

## Expected Outcome

After implementation:

1. **AI Pentesting** will execute 40 real test cases and generate findings
2. **Jailbreak Lab** will have 50+ curated attacks to test
3. **Sidebar** will smoothly collapse/expand with synchronized content padding
4. **No visual jumping** from async data loading

