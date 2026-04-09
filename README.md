# UnifiedAAI — Fractal Autonomous Governance Platform

Enterprise AI Governance platform for evaluating, monitoring, and enforcing responsible AI policies across every model and dataset in your organisation.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| UI | shadcn/ui · Tailwind CSS · Recharts |
| Backend | Supabase (PostgreSQL + Auth + Edge Functions) |
| AI | **Claude claude-opus-4-6** (Anthropic) — all inference |
| Auth | Supabase Auth · JWT · RBAC (5 roles) |

---

## Getting Started

### Prerequisites

- Node.js ≥ 18
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- An [Anthropic API key](https://console.anthropic.com/) (`sk-ant-...`)

### 1 — Clone & install

```sh
git clone <YOUR_GIT_URL>
cd unifiedaai
npm install
```

### 2 — Configure environment

```sh
cp .env.example .env.local
# Edit .env.local and fill in your Supabase URL and anon key
```

### 3 — Add your Claude API key (backend secret)

The API key lives **only** on the server — it is never exposed to the browser.

```sh
supabase secrets set ANTHROPIC_API_KEY=sk-ant-api03-...
```

> **Optional:** If you want real ML-based scoring in the evaluation engines, also set:
> ```sh
> supabase secrets set HUGGING_FACE_ACCESS_TOKEN=hf_...
> ```

### 4 — Run locally

```sh
npm run dev
# → http://localhost:5174
```

---

## Environment Variables

### Frontend (`.env.local`)

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/public key |

### Backend (Supabase Secrets — never in `.env`)

| Secret | Required | Description |
|--------|----------|-------------|
| `ANTHROPIC_API_KEY` | **Yes** | Powers every AI feature across all edge functions |
| `HUGGING_FACE_ACCESS_TOKEN` | No | Real ML model scoring in evaluation engines |

---

## AI Architecture

All AI inference routes **exclusively through Claude** (Anthropic) via a single shared backend module:

```
supabase/functions/_shared/claude.ts
```

- No API keys are ever sent to or stored in the frontend
- Every edge function imports `callClaude()` from the shared helper
- The helper reads `ANTHROPIC_API_KEY` from Supabase secrets at runtime
- Model used: `claude-opus-4-6` (complex tasks) · `claude-haiku-4-5-20251001` (fast classification)

```
Frontend  →  supabase.functions.invoke("function-name")
                    ↓
          Supabase Edge Function
                    ↓
          _shared/claude.ts  →  Anthropic API (ANTHROPIC_API_KEY)
```

---

## Platform Features

### RAI Governance Engines
- **Fairness** — Demographic parity, equalized odds, calibration
- **Hallucination** — Factuality, groundedness, BLEU/ROUGE scoring
- **Toxicity** — Content safety, policy adherence
- **Privacy** — PII/PHI detection, data leakage analysis
- **Explainability** — SHAP values, reasoning quality

### Data Inventory (`/inventory`)
Upload CSV, TSV, JSON, or PDF files. Claude automatically:
- Extracts metadata and schema
- Classifies every column as **PII / PHI / Sensitive / Unique / Standard**
- Generates business-grade glossary descriptions
- Validates data quality (completeness, uniqueness, validity)
- Saves history locally for audit trail

### Governance & Compliance
- Policy DSL studio with CI/CD gate enforcement
- Approval workflows and HITL review queues
- Regulatory reporting (GDPR, CCPA, EU AI Act)
- Audit trails, lineage graph, runbooks

### Security Lab
- Penetration testing, jailbreak testing, threat modelling
- Red-team campaign runner with Claude-generated adversarial prompts

### Data Quality
- Automated profiling, rule synthesis, incident management
- DQ chat assistant (ask questions about your pipeline in natural language)

---

## Role-Based Access

| Role | Display Name | Dashboard |
|------|-------------|-----------|
| `admin` | Chief Data & AI Officer | Executive |
| `superadmin` | Platform Admin | All sections |
| `reviewer` | AI Steward | Governance |
| `analyst` | Agent Engineer | Technical |
| `viewer` | Compliance Auditor | Compliance |

---

## Project Structure

```
src/
  pages/          # 47 full-page route components
  components/     # 150+ UI components across 31 domains
  hooks/          # 50+ custom React hooks
  lib/            # RAI formulas, role personas, utilities
  core/           # Evaluator harness

supabase/
  functions/      # 78 edge functions (all use Claude)
    _shared/
      claude.ts         ← Single Claude helper (all functions use this)
      auth-helper.ts
      call-user-model.ts
      llm-gateway/      ← Multi-provider gateway (Anthropic adapter active)
  migrations/     # 60+ SQL migrations
```

---

## Scripts

```sh
npm run dev          # Development server (port 5174)
npm run build        # Production build
npm run preview      # Preview production build
npm run lint         # ESLint check
npm run test         # Vitest unit tests
npm run test:ui      # Vitest visual UI
npm run test:coverage # Coverage report
```

---

## Deploying Edge Functions

```sh
# Deploy all functions
supabase functions deploy

# Deploy a single function
supabase functions deploy inventory-analyze

# Verify secrets are set
supabase secrets list
```
