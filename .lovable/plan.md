

# Complete Core Security Integration - Error-Free Implementation

## Summary
Complete the Core Security module by fixing the TypeScript error and adding all remaining navigation and routing configurations.

---

## Changes Required

### 1. Fix TypeScript Error in AttackLibrary.tsx (Line 65-73)

**Problem**: The reset state object is missing `owasp_category` property.

**Fix**: Add `owasp_category: null as string | null` to the reset state object.

```typescript
// Line 65-73: Update setNewAttack reset to include owasp_category
setNewAttack({
  name: '',
  description: '',
  category: 'jailbreak',
  owasp_category: null as string | null,  // ADD THIS LINE
  difficulty: 'medium',
  attack_payload: '',
  tags: [],
  is_active: true,
});
```

---

### 2. Update Sidebar.tsx - Add CORE SECURITY Navigation

**Location**: Between "DATA GOVERNANCE" and "CORE RAI" sections

**New imports required**:
- `Bug` - for AI Pentesting
- `Skull` - for Jailbreak Lab  
- `Target` - for Threat Modeling
- `Library` - for Attack Library

**New nav items** (insert after line 44, before CORE RAI):
```typescript
{ divider: true, label: "CORE SECURITY" },
{ path: "/security", icon: Shield, label: "Security Dashboard" },
{ path: "/security/pentesting", icon: Bug, label: "AI Pentesting" },
{ path: "/security/jailbreak-lab", icon: Skull, label: "Jailbreak Lab" },
{ path: "/security/threat-modeling", icon: Target, label: "Threat Modeling" },
{ path: "/security/attack-library", icon: Library, label: "Attack Library" },
```

---

### 3. Update App.tsx - Add Security Routes

**New imports required**:
```typescript
import SecurityDashboard from "./pages/security/SecurityDashboard";
import Pentesting from "./pages/security/Pentesting";
import JailbreakLab from "./pages/security/JailbreakLab";
import ThreatModeling from "./pages/security/ThreatModeling";
import AttackLibrary from "./pages/security/AttackLibrary";
```

**New routes** (add after line 88, before Data Governance comment):
```typescript
{/* Core Security */}
<Route path="/security" element={<ProtectedRoute><SecurityDashboard /></ProtectedRoute>} />
<Route path="/security/pentesting" element={<ProtectedRoute><Pentesting /></ProtectedRoute>} />
<Route path="/security/jailbreak-lab" element={<ProtectedRoute><JailbreakLab /></ProtectedRoute>} />
<Route path="/security/threat-modeling" element={<ProtectedRoute><ThreatModeling /></ProtectedRoute>} />
<Route path="/security/attack-library" element={<ProtectedRoute><AttackLibrary /></ProtectedRoute>} />
```

---

### 4. Update supabase/config.toml - Add Edge Function Configs

**Add at end of file** (4 new edge functions with JWT verification):
```toml
[functions.agent-pentester]
verify_jwt = false

[functions.agent-jailbreaker]
verify_jwt = false

[functions.agent-threat-modeler]
verify_jwt = false

[functions.security-evidence-service]
verify_jwt = false
```

Note: Using `verify_jwt = false` following project pattern for edge functions that handle auth internally via auth-helper.

---

## Files Modified

| File | Change |
|------|--------|
| `src/pages/security/AttackLibrary.tsx` | Add `owasp_category` to reset state |
| `src/components/layout/Sidebar.tsx` | Add CORE SECURITY nav section with 5 items |
| `src/App.tsx` | Add 5 security route imports and routes |
| `supabase/config.toml` | Add 4 new edge function configurations |

---

## Final Navigation Order

1. Command Center
2. **Monitor**: Observability, Alerts
3. **Govern**: Approvals, Decision Ledger, HITL, Incidents, Knowledge Graph
4. **DATA GOVERNANCE**: Data Quality Engine, Data Contracts
5. **CORE SECURITY** (NEW): Security Dashboard, AI Pentesting, Jailbreak Lab, Threat Modeling, Attack Library
6. **CORE RAI**: Fairness, Hallucination, Toxicity, Privacy, Explainability
7. **Respond**: Policy Studio, Golden Demo
8. **Impact**: Impact Dashboard, Regulatory Reports
9. **Configure**: Projects, Models, Settings, Documentation

