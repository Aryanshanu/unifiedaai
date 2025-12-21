# Fractal RAI-OS — SERVICE_ROLE_KEY Usage Policy

**Version:** 1.0  
**Effective Date:** December 21, 2025  
**Classification:** Security Policy Document

## 1. Overview

The `SUPABASE_SERVICE_ROLE_KEY` provides root-level database access that bypasses Row Level Security (RLS). This document defines when its usage is acceptable and the required safeguards.

## 2. Current Status: Option B (Acceptable Short-Term)

We have chosen **Option B** — retain SERVICE_ROLE_KEY with strict controls.

**Migration Target:** Option A (remove SERVICE_ROLE_KEY, use stored procedures)  
**Target Date:** Q2 2026

## 3. Permitted Usages

The SERVICE_ROLE_KEY may ONLY be used for:

| Function | Purpose | Justification |
|----------|---------|---------------|
| `cicd-gate` | Cross-user governance checks | Must verify all systems regardless of ownership |
| `ai-gateway` | Request logging | Must log all requests for audit trail |
| `kg-sync` | Knowledge graph aggregation | Must aggregate entities across all users |
| `generate-audit-report` | Report generation | Must read all audit data |
| `compute-runtime-risk` | Risk computation | Must aggregate risk metrics |
| Audit triggers | Immutable logging | Must write regardless of user context |

## 4. Prohibited Usages

SERVICE_ROLE_KEY MUST NOT be used for:

- User-facing read operations (use user JWT + RLS)
- Operations where user context is available
- Any function that could expose data across users
- Direct database queries from frontend

## 5. Required Safeguards

### 5.1 Import Path

All SERVICE_ROLE_KEY usage MUST go through a single import:

```typescript
// supabase/functions/_shared/service-client.ts
export function getServiceClient() {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  
  console.log(`[service-client] Service role client created at ${new Date().toISOString()}`);
  
  return createClient(url, key);
}
```

### 5.2 Logging Requirements

Every SERVICE_ROLE_KEY write operation MUST be logged:

```typescript
console.log(`[${functionName}] Service role write: ${operation}`, {
  table: tableName,
  action: actionType,
  timestamp: new Date().toISOString(),
});
```

### 5.3 Code Review

All PRs adding SERVICE_ROLE_KEY usage MUST be reviewed by security team.

## 6. Current Usage Inventory

| Function | Reads | Writes | Migration Priority |
|----------|-------|--------|-------------------|
| ai-gateway | ✅ | ✅ (logs) | Medium |
| cicd-gate | ✅ | ✅ (logs) | Low (required for governance) |
| kg-sync | ✅ | ✅ | Medium |
| generate-audit-report | ✅ | ❌ | High |
| compute-runtime-risk | ✅ | ✅ | Medium |
| copilot | ✅ | ❌ | High |
| realtime-chat | ✅ | ✅ | High |
| Other functions (17) | ✅ | Varies | High |

## 7. Migration Path to Option A

### Phase 1: High Priority (Q1 2026)
- Migrate `copilot` to auth-helper
- Migrate `realtime-chat` to auth-helper
- Migrate `generate-audit-report` to user context

### Phase 2: Medium Priority (Q2 2026)
- Create security-definer stored procedures for aggregate operations
- Migrate `kg-sync` to stored procedures
- Migrate `compute-runtime-risk` to stored procedures

### Phase 3: Control Plane (Q3 2026)
- Evaluate if `cicd-gate` can use stored procedures
- Document remaining SERVICE_ROLE_KEY usages as permanent exceptions

## 8. Audit Trail

All SERVICE_ROLE_KEY operations are logged to:
- Edge function logs (Supabase dashboard)
- `request_logs` table (for gateway operations)
- `admin_audit_log` table (for governance changes)

## 9. Incident Response

If SERVICE_ROLE_KEY is compromised:
1. Immediately rotate key in Supabase dashboard
2. Redeploy all edge functions
3. Review audit logs for unauthorized access
4. Notify security team

---

**Document Owner:** Platform Security Team  
**Review Cycle:** Monthly  
**Next Review:** January 2026
