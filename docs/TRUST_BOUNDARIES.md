# Fractal RAI-OS — Trust Boundaries

**Version:** 1.0  
**Effective Date:** December 21, 2025  
**Classification:** Internal Architecture Document

## 1. Overview

This document defines the explicit trust zones, token acceptance policies, and failure modes for the Fractal RAI-OS platform. All components MUST adhere to these boundaries.

## 2. Trust Zones

| Zone | Trust Level | Components | Description |
|------|-------------|------------|-------------|
| **User Zone** | ❌ Untrusted | Browser, UI, Frontend | Cannot enforce governance; display only |
| **API Zone** | ⚠️ Conditionally Trusted | ai-gateway, Edge Functions | Requires valid User JWT; RLS enforced |
| **Control Plane** | ✅ Trusted | cicd-gate, Governance functions | Requires signed Deployment JWT; governance checks |
| **Data Plane** | 🔒 Immutable | Database, Audit Logs | RLS + constraints; final authority |

## 3. Token Acceptance Policy

### 3.1 User JWT (API Zone)

**Issuer:** Supabase Auth  
**Accepted By:** ai-gateway, RLS policies  
**Validation:**
- Verify `exp` (expiry)
- Verify `iss` (issuer = Supabase project)
- Verify `aud` (audience)
- Extract `sub` for user identity

**Failure Mode:** CLOSED — reject request with 401

### 3.2 Deployment JWT (Control Plane)

**Issuer:** cicd-gate  
**Accepted By:** CI/CD pipelines, deployment systems  
**Validation:**
- Verify HMAC-SHA256 signature using `DEPLOYMENT_SIGNING_SECRET`
- Verify `exp` ≤ 1 hour from issuance
- Verify `aud` = "cicd-pipeline"
- Re-check governance state (TOCTOU protection)

**Failure Mode:** CLOSED — reject deployment with 403

### 3.3 Service Role Key (Data Plane)

**Usage:** RESTRICTED — See `docs/SERVICE_ROLE_KEY_POLICY.md`  
**Accepted By:** Control plane functions only  
**Validation:** N/A (root access)

**Failure Mode:** N/A — never exposed to untrusted zones

## 4. Enforcement Matrix

| Component | Reads | Writes | Enforcement |
|-----------|-------|--------|-------------|
| UI | Via user context | Via user context | Display only |
| ai-gateway | User JWT + RLS | User JWT + RLS | Runtime block/allow |
| cicd-gate | Service Role | Service Role | Deploy allow/block |
| Edge Functions | User JWT + RLS | User JWT + RLS | Function-specific |
| Database | RLS | RLS + constraints | Final authority |

## 5. Failure Modes

All components MUST fail CLOSED:

| Scenario | Action |
|----------|--------|
| JWT validation fails | Reject with 401/403 |
| Token expired | Reject with 401 |
| Signature invalid | Reject with 403 |
| Governance state changed | Re-run checks, reject if failed |
| Database constraint violation | Reject operation |
| RLS policy denies | Return empty/error |
| Service unavailable | Return 503, do not allow |

## 6. RLS Bypass Policy

**ONLY the following are permitted to bypass RLS:**

1. `cicd-gate` — for cross-user governance checks (documented in SERVICE_ROLE_KEY_POLICY.md)
2. `kg-sync` — for knowledge graph aggregation
3. Audit logging triggers — for immutable record creation

All other functions MUST use user context with RLS enforced.

## 7. Audit Requirements

Every governance action MUST produce an immutable audit log entry containing:
- `previous_hash` — SHA-256 of previous record
- `record_hash` — SHA-256 of current record
- `performed_by` — Actor identity
- `performed_at` — Timestamp
- `action_type` — Action classification

Verification: `SELECT * FROM verify_audit_chain()` MUST return `is_valid = true`

## 8. UI Truthfulness

The UI MUST display enforcement status badges:
- **ENFORCED** — Backend blocks non-compliant actions
- **ADVISORY** — Logged and alerted, not blocked
- **UI-ONLY** — Display only, no backend enforcement
- **DISABLED** — Feature not implemented

The UI MUST NOT imply enforcement that does not exist.

---

**Document Owner:** Platform Security Team  
**Review Cycle:** Quarterly  
**Next Review:** March 2026
