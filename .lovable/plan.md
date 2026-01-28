

# Core Security Module Implementation Plan

## Overview

Implement a comprehensive **AI Security Studio** module as a new "CORE SECURITY" section in the sidebar, positioned between "DATA GOVERNANCE" and "CORE RAI". This module provides enterprise-grade AI penetration testing, jailbreak lab, and threat modeling capabilities integrated into the existing Fractal Unified Governance platform.

---

## Architecture Summary

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                          CORE SECURITY DOMAIN                                │
├─────────────────────────────────────────────────────────────────────────────┤
│  Security Dashboard    │  AI Pentesting     │  Jailbreak Lab  │  Threat Modeling │
│  (Overview + Posture)  │  (OWASP LLM Top 10)│  (50+ Attacks)  │  (STRIDE/ATLAS)  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │       EDGE FUNCTIONS          │
                    ├───────────────────────────────┤
                    │ agent-pentester               │
                    │ agent-jailbreaker             │
                    │ agent-threat-modeler          │
                    │ security-evidence-service     │
                    └───────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │       DATABASE TABLES         │
                    ├───────────────────────────────┤
                    │ security_findings             │
                    │ security_test_runs            │
                    │ attack_library                │
                    │ threat_models                 │
                    │ threat_vectors                │
                    │ automated_test_cases          │
                    └───────────────────────────────┘
```

---

## Navigation Structure

Update sidebar to include new "CORE SECURITY" section:

| Route | Page | Icon | Description |
|-------|------|------|-------------|
| `/security` | SecurityDashboard.tsx | Shield | Security posture overview |
| `/security/pentesting` | Pentesting.tsx | Bug | OWASP LLM Top 10 scanning |
| `/security/jailbreak-lab` | JailbreakLab.tsx | Skull | Adversarial attack testing |
| `/security/threat-modeling` | ThreatModeling.tsx | Target | Multi-framework threat analysis |
| `/security/attack-library` | AttackLibrary.tsx | Library | Browse curated attack patterns |

---

## Phase 1: Database Schema (7 New Tables)

### 1.1 Core Security Tables

```sql
-- Security findings from pentesting/jailbreak scans
CREATE TABLE security_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_run_id UUID REFERENCES security_test_runs(id),
  system_id UUID NOT NULL REFERENCES systems(id),
  vulnerability_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'mitigated', 'false_positive')),
  mitigation TEXT,
  exploitability_score INTEGER,
  business_impact_score INTEGER,
  fractal_risk_index NUMERIC,
  evidence JSONB DEFAULT '{}',
  framework_mappings JSONB DEFAULT '{}',
  owasp_category TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Security test execution runs
CREATE TABLE security_test_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id UUID NOT NULL REFERENCES systems(id),
  test_type TEXT NOT NULL CHECK (test_type IN ('pentesting', 'jailbreak', 'threat_model')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  tests_total INTEGER DEFAULT 0,
  tests_passed INTEGER DEFAULT 0,
  tests_failed INTEGER DEFAULT 0,
  coverage_percentage NUMERIC,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  triggered_by UUID,
  summary JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Attack pattern library
CREATE TABLE attack_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  owasp_category TEXT,
  difficulty TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard', 'expert')),
  attack_payload TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  success_rate NUMERIC DEFAULT 0,
  first_seen TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Automated security test cases
CREATE TABLE automated_test_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module TEXT NOT NULL CHECK (module IN ('pentesting', 'jailbreak')),
  code TEXT NOT NULL UNIQUE,
  owasp_category TEXT,
  objective TEXT NOT NULL,
  prompt_template TEXT NOT NULL,
  expected_secure_behavior TEXT NOT NULL,
  attack_objective TEXT[],
  conversation_script JSONB,
  detection_config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Threat models
CREATE TABLE threat_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id UUID NOT NULL REFERENCES systems(id),
  name TEXT NOT NULL,
  description TEXT,
  framework TEXT CHECK (framework IN ('STRIDE', 'MAESTRO', 'ATLAS', 'OWASP')),
  architecture_graph JSONB DEFAULT '{}',
  risk_score NUMERIC,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Threat vectors within a model
CREATE TABLE threat_vectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  threat_model_id UUID NOT NULL REFERENCES threat_models(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  atlas_tactic TEXT,
  owasp_category TEXT,
  maestro_layer TEXT,
  likelihood INTEGER CHECK (likelihood BETWEEN 1 AND 5),
  impact INTEGER CHECK (impact BETWEEN 1 AND 5),
  confidence_level TEXT DEFAULT 'medium' CHECK (confidence_level IN ('high', 'medium', 'low')),
  is_accepted BOOLEAN DEFAULT false,
  mitigation_checklist JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Pre-defined threat scenarios
CREATE TABLE threat_scenarios_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  default_framework TEXT DEFAULT 'STRIDE',
  risk_category TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Phase 2: Edge Functions (4 New Functions)

### 2.1 agent-pentester
- **Purpose**: OWASP LLM Top 10 automated vulnerability scanning
- **Endpoints**: 
  - `POST /` - Run full scan against a system
  - `POST /custom-test` - Execute single custom test
- **Logic**:
  - Fetches test cases from `automated_test_cases` table
  - Executes prompts against target systems via `ai-gateway`
  - Uses Lovable AI (Gemini) to analyze responses for vulnerabilities
  - Calculates confidence scores with breakdown
  - Stores findings in `security_findings` table

### 2.2 agent-jailbreaker
- **Purpose**: Adversarial jailbreak attack testing
- **Endpoints**:
  - `POST /execute` - Run single attack
  - `POST /automated` - Run all active attacks from library
- **Logic**:
  - Fetches attacks from `attack_library` table
  - Tests system resistance to jailbreaks
  - Updates success rates on attacks
  - Creates incidents for critical failures

### 2.3 agent-threat-modeler
- **Purpose**: AI-powered threat analysis
- **Endpoints**:
  - `POST /generate` - Generate threat model for a system
  - `POST /run-library-scenarios` - Test predefined scenarios
- **Logic**:
  - Multi-framework support (STRIDE, MAESTRO, ATLAS, OWASP)
  - Generates architecture graphs based on system type
  - Extracts mitigations from AI analysis
  - Stores results in `threat_models` and `threat_vectors`

### 2.4 security-evidence-service
- **Purpose**: Forensic evidence capture with integrity hashing
- **Endpoints**:
  - `POST /capture` - Store evidence with SHA256 hash
  - `POST /verify` - Verify evidence integrity
  - `GET /evidence/:testRunId` - Retrieve evidence

---

## Phase 3: New Pages (5 Pages)

### 3.1 SecurityDashboard.tsx (`/security`)
- **Components**:
  - Security Posture Score (0-100, color-coded gauge)
  - OWASP Coverage Radar Chart
  - Recent Findings List (severity badges)
  - Systems Security Status Table
  - Quick Action Buttons (Run Pentest, Start Jailbreak Test)

### 3.2 Pentesting.tsx (`/security/pentesting`)
- **Features**:
  - System selector dropdown
  - OWASP LLM Top 10 category checklist
  - "Run Full Scan" button
  - Real-time progress indicator
  - Findings table with severity sorting
  - Remediation suggestions panel

### 3.3 JailbreakLab.tsx (`/security/jailbreak-lab`)
- **Features**:
  - Attack category filter (Jailbreak, Prompt Injection, Toxicity, PII Extraction)
  - Attack library browser
  - "Run Attack" and "Run All" buttons
  - Success/Block rate visualization
  - Detailed attack result cards

### 3.4 ThreatModeling.tsx (`/security/threat-modeling`)
- **Features**:
  - System selector
  - Framework picker (STRIDE, MAESTRO, ATLAS, OWASP)
  - "Generate Threat Model" button
  - Interactive architecture diagram
  - Threat vectors table with likelihood/impact matrix
  - Mitigation checklist

### 3.5 AttackLibrary.tsx (`/security/attack-library`)
- **Features**:
  - Searchable attack pattern catalog
  - Category and difficulty filters
  - Attack detail cards with payloads
  - Success rate statistics
  - "Add Custom Attack" form

---

## Phase 4: React Hooks (5 New Hooks)

| Hook | Purpose |
|------|---------|
| `useSecurityFindings` | CRUD for security findings |
| `useSecurityTestRuns` | Manage test execution runs |
| `useAttackLibrary` | Fetch/manage attack patterns |
| `useThreatModels` | Threat model operations |
| `useSecurityStats` | Aggregate security metrics |

---

## Phase 5: UI Components (8 New Components)

| Component | Purpose |
|-----------|---------|
| `SecurityPostureGauge` | Visual security score indicator |
| `OWASPCoverageChart` | Radar chart for OWASP categories |
| `FindingCard` | Display individual vulnerability |
| `AttackCard` | Attack pattern display |
| `ThreatVectorRow` | Threat vector table row |
| `SecurityScoreTooltip` | Confidence/severity interpretation |
| `FrameworkBadge` | STRIDE/ATLAS/MAESTRO badge |
| `PentestProgress` | Real-time scan progress |

---

## Phase 6: Sidebar Navigation Update

```typescript
// In Sidebar.tsx navItems array, add after DATA GOVERNANCE:
{ divider: true, label: "CORE SECURITY" },
{ path: "/security", icon: Shield, label: "Security Dashboard" },
{ path: "/security/pentesting", icon: Bug, label: "AI Pentesting" },
{ path: "/security/jailbreak-lab", icon: Skull, label: "Jailbreak Lab" },
{ path: "/security/threat-modeling", icon: Target, label: "Threat Modeling" },
{ path: "/security/attack-library", icon: Library, label: "Attack Library" },
```

---

## Phase 7: Integration Points

### 7.1 Existing System Integration
- **Incidents**: Security findings auto-create incidents for critical vulnerabilities
- **Alerts**: New security alerts for scan completions and critical findings
- **Knowledge Graph**: Security entities linked to systems and models
- **Policy Studio**: Security policies can reference threat models
- **HITL Console**: High-risk findings routed for human review

### 7.2 Security Score Calculation
```typescript
// Security posture score formula
const systemsScore = Math.min((systemsCount || 0) * 5, 40);    // +5/system (max 40)
const coverageScore = Math.min(pentestCoverage / 2, 30);       // +0.5/% (max 30)
const riskPenalty = Math.min((criticalFindings || 0) * 5, 20); // -5/finding (max -20)
const securityScore = Math.max(0, Math.min(100, 
  systemsScore + coverageScore - riskPenalty + 30              // +30 base
));
```

---

## Phase 8: Seed Data (Attack Library)

Pre-populate `attack_library` with 50+ curated attacks:
- 10 Jailbreak attacks
- 10 Prompt injection attacks
- 8 Toxicity probes
- 8 PII extraction attempts
- 7 Harmful content requests
- 7 Policy bypass attempts

Pre-populate `automated_test_cases` with OWASP LLM Top 10:
- LLM01: Prompt Injection (5 tests)
- LLM02: Insecure Output Handling (4 tests)
- LLM03: Training Data Poisoning (3 tests)
- LLM04: Model Denial of Service (4 tests)
- LLM05: Supply Chain Vulnerabilities (3 tests)
- LLM06: Sensitive Information Disclosure (5 tests)
- LLM07: Insecure Plugin Design (3 tests)
- LLM08: Excessive Agency (4 tests)
- LLM09: Overreliance (3 tests)
- LLM10: Model Theft (3 tests)

---

## Files to Create

| File | Type |
|------|------|
| `src/pages/security/SecurityDashboard.tsx` | Page |
| `src/pages/security/Pentesting.tsx` | Page |
| `src/pages/security/JailbreakLab.tsx` | Page |
| `src/pages/security/ThreatModeling.tsx` | Page |
| `src/pages/security/AttackLibrary.tsx` | Page |
| `src/hooks/useSecurityFindings.ts` | Hook |
| `src/hooks/useSecurityTestRuns.ts` | Hook |
| `src/hooks/useAttackLibrary.ts` | Hook |
| `src/hooks/useThreatModels.ts` | Hook |
| `src/hooks/useSecurityStats.ts` | Hook |
| `src/components/security/SecurityPostureGauge.tsx` | Component |
| `src/components/security/OWASPCoverageChart.tsx` | Component |
| `src/components/security/FindingCard.tsx` | Component |
| `src/components/security/AttackCard.tsx` | Component |
| `src/components/security/ThreatVectorRow.tsx` | Component |
| `supabase/functions/agent-pentester/index.ts` | Edge Function |
| `supabase/functions/agent-jailbreaker/index.ts` | Edge Function |
| `supabase/functions/agent-threat-modeler/index.ts` | Edge Function |
| `supabase/functions/security-evidence-service/index.ts` | Edge Function |

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/layout/Sidebar.tsx` | Add CORE SECURITY nav section |
| `src/App.tsx` | Add security routes |
| `supabase/config.toml` | Add new edge function configs |

---

## Technical Notes

- All edge functions use JWT verification via `validateSession` from `auth-helper.ts`
- Security findings link to existing `incidents` table for escalation
- Attack library uses Lovable AI for dynamic prompt generation
- RLS policies restrict access to organization members
- All test results stored with SHA256 evidence hashes for audit

