
Goal: Make every Core Security surface (Security Dashboard, AI Pentesting, Jailbreak Lab, Threat Modeling, Attack Library) work end-to-end in Preview with “Built-in fallback” as the target, with evidence-based outputs (real target responses, real judge reasoning, explicit labels) and no silent failures.

Non-negotiables (your mandates translated into engineering constraints)
- No “pretend success”: every UI success state must correspond to a real DB write and/or a real backend function response.
- No “fake” coverage/metrics: dashboards must be computed from persisted runs/results, not inferred from unrelated tables.
- No raw technical errors shown to end users: errors must be friendly but still truthful (e.g., “Selected model unavailable” rather than generic “not found”).
- Built-in fallback must be explicit and auditable: UI must clearly state when the “Built-in target” is used vs a user-configured external system.

What I verified (hard evidence, not guesses)
1) Security Dashboard renders and pulls real stats. I can see real counts (findings, attacks, threat models) in the UI extract.
2) AI Pentesting “Run Full Scan” creates a test run row in the database and triggers the backend.
3) The actual failure cause for “Not real / No action” is in backend execution:
   - agent-pentester logs show repeated OpenRouter 404: “No endpoints found for qwen/qwen3-30b-a3b:free.”
   - This yields 30/30 indeterminate and 0% coverage.
4) The PentestProgress UI can appear stuck “Running” because the UI chooses the first “running” test run it finds — and there are older runs stuck in “running” status in the DB. So even when a new run completes, the UI can still display an old “running” run.

Root causes (why it feels “broken” across modules)
A) “Built-in fallback” is not actually enforced
- You selected “Built-in fallback” as the desired target setup, but the system dropdown is selecting external OpenRouter systems.
- The target-executor currently routes based on system.provider/endpoint; if the chosen system points to OpenRouter and that model is unavailable, you get indeterminate results (not real vulnerability verdicts).

B) Stale “running” test runs poison UI state
- There are older security_test_runs rows stuck in status=running.
- Pentesting page picks “any running run” first, so progress can look permanently running.

C) Truth/UX gaps: indeterminate outcomes are not surfaced clearly
- Pentesting UI mainly shows findings. When tests are indeterminate (target failed), you get “no findings,” which looks like “no action” or “not real,” even though the backend ran.
- Error sanitization currently maps many 404-ish errors to generic “not found,” which hides the real reason (model unavailable).

D) Threat modeling uses inconsistent system fields
- agent-threat-modeler references system.endpoint_url (likely not the correct column; systems uses endpoint). That makes system info inaccurate and contributes to “not real” perception.

Plan (implementation sequencing, minimal risk, and explicit verification)

Phase 1 — Make “Built-in Target” a first-class, click-to-create option (so fallback is real, explicit, and user-driven)
1. Add a “Built-in Target (no external keys)” option that the user can create from the UI:
   - Best place: /models page and also a CTA inside each Core Security page empty/blocked state.
   - This creates a real row in systems table with:
     - provider = 'lovable'
     - endpoint = null
     - api_token_encrypted = null
     - model_name = (optional) 'google/gemini-2.5-flash' or left null
   - This satisfies “no fake data” because it’s a user-initiated configuration, not hidden seeding.
2. Update all Core Security pages to strongly guide selection:
   - If user has external systems but chooses “Built-in target,” the UI must show: “Target: Built-in (Lovable AI)”.
   - If user selects an external system and it fails, the UI should recommend switching to Built-in target.

Files likely involved
- src/pages/Models.tsx (add “Create Built-in Target” button using existing useCreateSystem hook)
- src/pages/security/Pentesting.tsx, JailbreakLab.tsx, ThreatModeling.tsx (add CTA banner if failures detected)

Acceptance criteria
- User can create Built-in target in 1 click, see it in the dropdown, and run tests without any external provider dependency.

Phase 2 — Fix target execution so fallback is guaranteed to work and is labeled (no silent OpenRouter dependency)
1. Update supabase/functions/target-executor/index.ts routing logic:
   - If provider === 'lovable': always run executeLovable() and return metadata.provider='lovable', metadata.model='google/gemini-2.5-flash'.
   - If OpenRouter returns “No endpoints found…”:
     - Return success=false with a specific errorCode (e.g., MODEL_UNAVAILABLE) and a user-safe error message.
     - Do not silently convert to success.
2. Ensure CORS headers match the platform-required list (prevents “no action” due to preflight mismatch in some browsers):
   - Expand Access-Control-Allow-Headers to include the full set required by the platform (authorization, x-client-info, apikey, content-type, x-supabase-client-platform, etc.).

Files likely involved
- supabase/functions/target-executor/index.ts

Acceptance criteria
- Built-in target always returns a real model response (not empty) and includes metadata showing it was built-in.
- OpenRouter failures are explicit and traceable, not masked.

Phase 3 — Stop Pentesting from lying via UI state (stale runs + indeterminate visibility)
1. Fix the “currentRun” selection logic in src/pages/security/Pentesting.tsx:
   - Prefer the most recent run by created_at.
   - Only treat a run as “running” if it started recently (e.g., within last 10–15 minutes). Otherwise mark it “stale.”
2. Add a “Resolve stale run” action:
   - Button: “Mark stale run as failed” (updates the row to status='failed' and completed_at=now).
3. Update UI to show indeterminate results clearly:
   - If agent-pentester returns indeterminate > 0 and passed+failed = 0:
     - Show a prominent warning card: “All tests indeterminate — target unreachable/unavailable.”
     - Show the top error reason (from backend response if available).
     - Offer one-click suggestion: “Switch to Built-in target.”
4. Fix the type mismatch and returned fields expectation:
   - Frontend currently expects {passed, failed, coverage}. Backend returns {passed, failed, indeterminate, total, coverage, ...}.
   - Update front-end typing so it can consume indeterminate and show it.

Files likely involved
- src/pages/security/Pentesting.tsx
- src/components/security/PentestProgress.tsx (add indeterminate/stale display)
- src/lib/ui-helpers.ts (improve sanitizeErrorMessage mapping for OpenRouter “No endpoints found…”)

Acceptance criteria
- Running scan always transitions out of “Running” (either completed or failed) and UI reflects it correctly.
- If 0 findings because everything indeterminate, UI explains why (truthfully) rather than appearing “dead.”

Phase 4 — Make backend test runs self-healing (no more stuck “running” rows)
1. Update agent-pentester to update security_test_runs server-side using testRunId:
   - On start: confirm status running (optional)
   - On finish (success OR all-indeterminate): set status='completed', completed_at, tests_passed/failed, coverage_percentage, and store a summary that includes:
     - indeterminate count
     - resultsByCategory counts
     - top errors (aggregated)
   - On fatal error: set status='failed' and store error summary.
2. Update agent-jailbreaker similarly if it ever writes runs (if not, skip).
3. Add a lightweight cleanup path:
   - If a run is “running” but older than threshold, allow UI + backend to mark it failed.

Files likely involved
- supabase/functions/agent-pentester/index.ts (small targeted edits only; avoid rewriting the whole large file)
- potentially supabase/functions/agent-jailbreaker/index.ts (only if it writes runs)

Acceptance criteria
- Even if the user navigates away mid-run, the backend still finalizes the run status, preventing stale running rows.

Phase 5 — Threat Modeling correctness + “Validate vector” must use the same truthful target pipeline
1. Fix system field usage in agent-threat-modeler:
   - Replace endpoint_url with endpoint (or remove endpoint from prompt if not needed).
   - Restrict select('*') to only needed fields to reduce accidental leakage.
2. Make validate-vector execution consistent:
   - Use target-executor and record whether the target call succeeded.
   - If executionSuccess=false, return success=false and show a clear UI message “Could not validate against target.”
3. In the UI (ThreatVectorRow), remove any synthetic “decision trace” values that are not derived from backend:
   - Right now ThreatVectorRow constructs a DecisionTrace locally (signalsTriggered=3, parseSuccess=true, etc.). That violates your “no hallucination” rule because it looks like real computation.
   - Replace with either:
     - “Decision trace unavailable (not computed)” or
     - A real decision trace returned from backend validation, persisted in mitigation_checklist or a dedicated field.

Files likely involved
- supabase/functions/agent-threat-modeler/index.ts
- src/components/security/ThreatVectorRow.tsx
- src/pages/security/ThreatModeling.tsx

Acceptance criteria
- Threat modeling shows only real computed traces (from backend) or explicitly shows “not available,” never made-up values.

Phase 6 — Attack Library reliability and honesty polish (so it never feels “dead”)
1. Add inline success/failure feedback after “Add Attack”:
   - If createAttack fails due to permissions/RLS, show a friendly actionable message.
2. Ensure “Add Attack” never silently closes if mutation fails.

Files likely involved
- src/pages/security/AttackLibrary.tsx
- src/hooks/useAttackLibrary.ts

Acceptance criteria
- User can add an attack and immediately see it in the grid, or gets a clear, non-technical reason why it can’t be added.

Phase 7 — One-click Core Security “Smoke Test” (evidence-based verification, not “trust me”)
Add a “Run Core Security Smoke Test” button on Security Dashboard:
- It runs a minimal sequence (fast, deterministic) against Built-in target:
  1) target-executor: simple prompt → expect a response
  2) JailbreakLab custom-test: “Say X” → verify a result object and DB evidence write (if vulnerability)
  3) Pentesting custom-test: simple test → verify result and that a test_run is finalized
  4) Threat modeling generate: create a model + vectors row count check
- Show a checklist UI with PASS/FAIL and correlation IDs for each step.

Files likely involved
- src/pages/security/SecurityDashboard.tsx (add button)
- supabase/functions/security-smoke-test/index.ts (new backend function) OR reuse existing functions directly from UI with careful sequencing and DB verification.

Acceptance criteria
- You can press one button and get a factual PASS/FAIL report for each Core Security module, with correlation IDs.

End-to-end verification checklist (what I will do after implementing, in Preview)
1) Create Built-in target from /models.
2) Security Dashboard: confirm stats load and quick links navigate.
3) Attack Library: open, filter, show payload, add a test attack (optional).
4) Jailbreak Lab:
   - select Built-in target
   - run Custom payload test
   - run 1 library attack
   - verify result shows targetResponse and judge reasoning
5) AI Pentesting:
   - select Built-in target
   - run scan
   - confirm test run finalizes (no stuck running), and UI shows indeterminate if applicable
6) Threat Modeling:
   - generate model
   - validate one vector
   - confirm no fake decision traces; only backend-derived or “unavailable”

Important note (truth statement)
- With “Built-in fallback,” results are real model outputs and real judge outputs, but they are not testing your external OpenRouter systems. The UI will explicitly label the target as “Built-in” so it cannot be mistaken as external testing.

Scope control (because you said TIME CRITICAL)
- This plan prioritizes: (1) make fallback truly functional everywhere, (2) eliminate stale run confusion, (3) eliminate any fabricated traces, (4) add a smoke-test so we can prove it works.
- If you want me to also make OpenRouter/external systems “work 100%,” that is a separate follow-up request because it requires validating model IDs/availability per provider and possibly reworking how provider endpoints/models are stored.

If you want me to continue after this request:
- I will implement Phases 1–4 first (those unblock “works now” with built-in fallback), then Phase 5 (remove fake traces), then Phase 7 (smoke test).
