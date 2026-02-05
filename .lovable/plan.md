
## What’s actually broken (root cause, not vibes)

### 1) “Core Security is not working / I don’t see anything”
From the live preview inspection:
- `attack_library` loads successfully (HTTP 200). So the data is there.
- The Jailbreak Lab can execute an attack and returns a result (we got **“Hypothetical Scenario Escape → Blocked”**).
So the UI is not globally dead.

However, your deeper complaint is valid:

### 2) The module is **not testing the target LLM** (it is simulating)
Right now the security agents (`agent-jailbreaker`, `agent-pentester`, `agent-threat-modeler`) do **not** call the “target system” LLM endpoint/model. They call the Lovable AI gateway and ask it to *guess* whether a typical system would be blocked/vulnerable.

That means:
- Selecting a “target system” mostly just changes the text included in the prompt.
- Results are not grounded in the actual model’s behavior.
- This is why it feels like “rubbish”: it’s an LLM judging an imagined system, not a real red-team harness.

### 3) There is also a security correctness problem
`useSystems()` currently does `.select('*')`, which includes `api_token_encrypted` in the response. That is a serious design flaw: tokens should never be readable by the browser, even if “encrypted”.

---

## Goal (SME + Judge contract)
Make Core Security:
1) **Actually execute prompts against the selected target LLM** (the “system”).
2) Use a separate **Judge LLM** only to *score* the observed response (not simulate it).
3) Persist evidence + results to backend tables (auditability).
4) Provide self-healing + early detection signals (health log + actionable errors).
5) Ensure UI never shows “blank nothing” without an explicit reason (no silent failure).

---

## Target Architecture (real test harness, not simulation)

### Runtime flow for Jailbreak Lab (execute 1 attack)
```text
UI (JailbreakLab.tsx)
  -> invoke backend function: agent-jailbreaker
      -> Auth check (validateSession + canAccessSystem)
      -> Fetch system config (provider + model_name + token) server-side
      -> Execute attack against TARGET LLM (real call)
      -> Judge response using Lovable AI (classification/scoring)
      -> Persist evidence:
           - security_test_runs (type=jailbreak)
           - security_findings (severity/status + evidence JSON)
      -> Return: blocked/succeeded + confidence + excerpts + ids
  -> UI updates + realtime refresh
```

### Runtime flow for Pentesting (run N OWASP tests)
Same pattern:
- Execute each test prompt on the **target LLM**
- Judge outcome using **Lovable AI**
- Persist findings and update test run totals

---

## Implementation Plan (sequenced, minimal risk)

### Phase 0 — Make the “blank screen” impossible (Early Detection UX)
**Frontend**
- Add explicit empty states and diagnostics to Jailbreak Lab:
  - If `systems.length === 0`: show “No target systems configured” + link CTA to model connection.
  - If `attacks.length === 0`: show “Attack library empty” + link to Attack Library.
- Add a compact “Security Health” debug drawer (hidden behind a small icon) that shows:
  - last 20 health events from `useSecurityHealthMonitor`
  - last edge-function failures (from logged errors)
This makes it impossible for the UI to “show nothing” without telling you why.

**Judge checks**
- Simulate: not logged in, logged in with no systems, systems exist but no attacks, slow network. Each must show a clear message, not emptiness.

---

### Phase 1 — Convert “simulation agents” into “real execution agents”
This is the core fix.

#### 1A) Implement server-side target model execution
**Backend**
- Add a shared helper for security agents (in `supabase/functions/_shared/`):
  - Input: system_id, prompt/messages
  - Output: model response text + latency + raw provider metadata
  - Must never expose API tokens to the client
  - Must include timeout + retry
- Use the existing `_shared/llm-gateway` adapters where possible (preferred) so:
  - provider selection is normalized
  - errors become structured (`MODEL_NOT_FOUND`, `RATE_LIMITED`, etc.)

**Important design choice**
- “Target LLM” should come from `systems.provider` + `systems.model_name`.
- “Judge LLM” should default to Lovable AI models (deterministic, no keys required).

**Judge checks**
- If system has no provider/model_name → hard fail with clear error.
- If model call returns non-2xx → return structured error and log evidence.

#### 1B) Update `agent-jailbreaker` to:
- Authenticate properly (use `validateSession` + `requireAuth`)
- Authorize access to `systemId` (use `canAccessSystem`)
- Execute attack payload against the target model (real call)
- Judge the response using Lovable AI (classification: succeeded vs blocked)
- Persist results:
  - Create/attach `security_test_runs` row (test_type=`jailbreak`)
  - Insert into `security_findings` with:
    - vulnerability_id = attack id or attack name
    - severity derived from judge risk score
    - evidence JSON includes: prompt, target_response excerpt, judge_result, timestamps, latency

**Judge checks**
- Attack payload includes placeholders like `[harmful topic]`: ensure we keep it synthetic and do not expand it into real harmful content.
- Ensure evidence is stored and reproducible.

#### 1C) Update `agent-pentester` similarly
Right now it only uses Lovable AI to “analyze” vulnerability without calling the target model at all.
Fix to:
- execute prompt_template on target model
- judge the output vs expected_secure_behavior

**Judge checks**
- Ensure `tests_passed + tests_failed === tests_total`.
- Ensure coverage never exceeds 100.
- Ensure partial failures don’t kill the whole run; persist what completed.

---

### Phase 2 — Make Jailbreak Lab results real + persistent in the UI
**Frontend**
- Refactor `JailbreakLab.tsx`:
  - When executing, show:
    - “Target response” (expandable)
    - “Judge verdict” (blocked/succeeded) with confidence
  - Add “History” section backed by database (not React state)
  - Add realtime invalidation/subscription for:
    - `security_findings`
    - `security_test_runs`
- Export should export the persisted evidence (not ephemeral state)

**Judge checks**
- Refresh page: results still visible.
- Open Security Dashboard: metrics reflect the run immediately.

---

### Phase 3 — Fix the token exposure / security correctness
This is mandatory for a real target-LLM harness.

**Frontend**
- Change `useSystems()` to never select token fields.
  - Replace `.select('*')` with an explicit column list excluding `api_token_encrypted`.

**Backend**
- All agent functions that need tokens must fetch them server-side using service role + explicit access checks.

**Judge checks**
- Browser network tab must never show `api_token_encrypted` in responses.
- Attempt to read token as a non-owner must fail.

---

### Phase 4 — Self-healing + early detection hardening (non-negotiable)
**Frontend**
- Ensure each security page uses:
  - `safeInvoke` for backend function calls
  - `useSecurityHealthMonitor` to log:
    - component mount/unmount
    - operation retries/failures
    - recovery events

**Backend**
- Add consistent structured logging:
  - Include correlation id per run
  - Store run metadata in `security_test_runs.summary`

**Judge checks**
- Force 429/402/timeout: UI must show precise, user-actionable messages.
- Retry logic must not create duplicate test runs; idempotency keys needed for “Run All”.

---

## End-to-end Validation Checklist (what you will use to judge me)
1) Go to **Jailbreak Lab**
   - select a system
   - execute 1 attack
   - see target response + judge verdict
   - refresh page: result still present
2) Go to **Security Dashboard**
   - counts update (findings/test runs)
3) Go to **AI Pentesting**
   - run scan
   - verify findings were produced from actual target responses (evidence includes target output excerpt)
4) Confirm no secrets are present in any browser responses
5) Confirm failures are visible (not silent) and self-heal retries are logged

---

## Files expected to change (high confidence)
**Frontend**
- `src/pages/security/JailbreakLab.tsx` (move from local-only results to persisted history + better error UX)
- `src/pages/security/Pentesting.tsx` (ensure real target execution evidence is used)
- `src/hooks/useSystems.ts` (stop selecting `*`, remove token field exposure)

**Backend**
- `supabase/functions/agent-jailbreaker/index.ts` (real target execution + judge + persistence + auth)
- `supabase/functions/agent-pentester/index.ts` (real target execution + judge + persistence + auth)
- New helper in `supabase/functions/_shared/` for target model execution via `_shared/llm-gateway`

**Possible DB migration**
- Only if we need additional columns for better linking/idempotency (prefer to store in `summary`/`evidence` first to minimize schema churn).

---

## Immediate next thing I will do after approval
1) Implement the “target execution helper” (backend) and wire `agent-jailbreaker` to call the selected system for real.
2) Make Jailbreak Lab show the *real* target response + persist it as evidence so you can’t lose it on refresh.
