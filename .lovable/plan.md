
Fix RAI + Security regressions end-to-end

What I verified
- The hidden `/admin` auth path itself is working; the current role fetch is returning `superadmin`.
- The bigger problem is not lost auth context alone — it is broken wiring across the RAI and Security segments.
- The 5 core RAI engine pages currently invoke backend functions, but they do not persist and render full result data; most of them end at a toast + custom prompt test.
- Security pages are more complete, but dashboard aggregation/history is inconsistent and score units are mixed between normalized values and percentages.
- The visible `admin` persona is still restricted from Core RAI/Core Security in `role-personas.ts` and `Sidebar.tsx`, which does not match your “full access” expectation.
- Data Quality still has a high-frequency control-plane timer and live churn, which can break dropdown usability and page responsiveness.
- The auth timeout screen can still appear after inactivity and needs hardening.

Plan
1. Restore access and navigation consistency
- Make the visible admin experience and `/admin` experience both expose all RAI + Security pages.
- Align `src/lib/role-personas.ts`, route gating, and `src/components/layout/Sidebar.tsx` so sidebar visibility and route access match exactly.

2. Make every RAI engine page fully operational
- Fix `Fairness`, `Hallucination`, `Toxicity`, `Privacy`, and `Explainability` so each page:
  - stores evaluation response state,
  - renders the returned metrics/findings/computation/evidence,
  - supports retry/rerun cleanly,
  - preserves the last-used model selection.
- Reuse existing result components instead of leaving pages as toast-only shells.

3. Normalize Security module behavior
- Fix score consistency across `Security Dashboard`, `Pentest`, `Jailbreak`, and `Threat Modeling`.
- Add recent-run recall/history on the Security detail pages so the last used model/framework and latest outputs remain available for rerun.
- Clean up remaining inconsistent titles/labels inside the Security flow.

4. Stabilize shared controls and responsiveness
- Refactor the DQ control-plane timer/update pattern so it stops thrashing the page.
- Audit fixed overlays/backdrops that may be intercepting clicks.
- Keep shared `Select` / `Dropdown` behavior stable while realtime updates are happening.
- Harden auth loading so normal navigation does not fall into the timeout screen.

5. Do a route-by-route validation pass
- Validate access, load state, run action, result rendering, rerun/history, dropdown usability, and backend response alignment for:
  - `/engine/fairness`
  - `/engine/hallucination`
  - `/engine/toxicity`
  - `/engine/privacy`
  - `/engine/explainability`
  - `/engine/data-quality`
  - `/security`
  - `/security/pentest`
  - `/security/jailbreak`
  - `/security/threats`

Files likely affected
- `src/lib/role-personas.ts`
- `src/components/layout/Sidebar.tsx`
- `src/components/auth/ProtectedRoute.tsx`
- `src/hooks/useAuth.tsx`
- `src/hooks/useDQControlPlane.ts`
- `src/hooks/useSecurityScans.ts`
- `src/pages/engines/FairnessEngine.tsx`
- `src/pages/engines/HallucinationEngine.tsx`
- `src/pages/engines/ToxicityEngine.tsx`
- `src/pages/engines/PrivacyEngine.tsx`
- `src/pages/engines/ExplainabilityEngine.tsx`
- `src/pages/engines/DataQualityEngine.tsx`
- `src/pages/security/SecurityDashboard.tsx`
- `src/pages/security/SecurityPentest.tsx`
- `src/pages/security/SecurityJailbreak.tsx`
- `src/pages/security/SecurityThreatModel.tsx`

Definition of done
- Admin access shows all intended RAI and Security pages with no hidden gaps.
- Every engine page loads, runs, and displays full results.
- Security dashboard values match the actual stored run payloads.
- Recent model/framework selections stay available for rerun.
- Dropdowns/selects work reliably.
- No false auth-timeout screen during normal usage.
