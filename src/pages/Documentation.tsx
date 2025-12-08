import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen, 
  Search, 
  ChevronRight, 
  FolderOpen, 
  Database, 
  Shield, 
  Activity,
  Scale,
  AlertCircle,
  Lock,
  Eye,
  GitBranch,
  Users,
  Settings,
  FileText,
  Zap,
  Target,
  Layers,
  CheckCircle,
  PlayCircle,
  TestTube,
  Download,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

const docSections = [
  {
    id: 'overview',
    title: 'Platform Overview',
    icon: BookOpen,
    content: `
# Fractal RAI OS — The World's First Responsible AI Operating System

## Mission Statement

Fractal RAI OS provides comprehensive governance, evaluation, and monitoring capabilities for AI/ML systems at enterprise scale. It enables organizations to deploy AI systems that are **safe**, **fair**, **transparent**, and **compliant** with regulatory requirements like the EU AI Act.

## The 6 Core Pillars

Fractal RAI OS is built on six foundational pillars that work together to provide complete AI governance:

### 1. RAI Evaluation Engines
Five independent engines (Fairness, Toxicity, Privacy, Hallucination, Explainability) that perform systematic checks on AI models using K2 chain-of-thought reasoning for full transparency.

### 2. Real-Time AI Observability
Streaming telemetry, drift detection, safety alerts, and SLA monitoring for all deployed AI systems.

### 3. Governance & Regulatory Compliance
Control library mappings (EU AI Act, NIST AI RMF, ISO/IEC), risk scoring, and certified attestations.

### 4. Human-in-the-Loop Decision Layer
Escalation queues, reviewer workflows, deployment gates, and complete audit trails.

### 5. Knowledge Graph
Connects models, data, risks, controls, incidents, and decisions through provenance-tracked relationships with lineage and blast radius analysis.

### 6. Policy Enforcement & Red Team Orchestration
Runtime guardrails, policy DSL, jailbreak detection, and adversarial campaign testing.

## Getting Started

1. **Create a Project** — Organize your AI initiatives
2. **Register Models** — Import from Hugging Face or register manually
3. **Run Risk Assessment** — Evaluate static and runtime risks
4. **Configure Policies** — Set up guardrails and enforcement rules
5. **Deploy with Governance** — Approval workflows for high-risk systems
6. **Monitor Continuously** — Real-time observability and alerting
    `,
  },
  {
    id: 'projects',
    title: 'Projects & Systems',
    icon: FolderOpen,
    content: `
# Projects & Systems

## Hierarchy Structure

\`\`\`
Project (Top-level container)
├── System (AI deployment unit with governance)
│   ├── Model (AI model metadata)
│   ├── Risk Assessment (Static + Runtime)
│   ├── Impact Assessment
│   └── Approval Workflow
└── Multiple Systems per Project
\`\`\`

## Project Properties

- **Name** — Descriptive identifier
- **Description** — Purpose and scope
- **Environment** — Development, Staging, or Production
- **Data Sensitivity** — Low, Medium, High, Critical
- **Business Sensitivity** — Impact on business operations
- **Criticality** — 1-10 scale for business importance
- **Compliance Frameworks** — EU AI Act, NIST AI RMF, ISO/IEC
- **Data Residency** — Geographic location requirements
- **Primary Owner Email** — Accountability contact

## Systems

A System represents the actual deployed AI component with:
- API endpoint configuration
- Runtime risk scoring (URI Score)
- Approval status tracking
- Request logging and telemetry
- Policy enforcement at the gateway level

## Creating a Project

1. Navigate to **Projects** → **Create Project**
2. Fill in required governance fields
3. Select applicable compliance frameworks
4. The system auto-creates initial risk profile

## Risk-Based Governance

Systems with **High/Critical** risk tier or **Impact Score > 60** automatically require approval before deployment.
    `,
  },
  {
    id: 'models',
    title: 'Model Registry',
    icon: Database,
    content: `
# Model Registry

## What is a Model?

A Model represents AI/ML model metadata registered for governance. Every model is linked to a System which handles deployment and runtime governance.

## Model Types Supported

- **LLM** — Large Language Models (GPT, Claude, Llama, etc.)
- **Classification** — Binary/multi-class classifiers
- **Regression** — Numerical prediction models
- **NER** — Named Entity Recognition
- **Embedding** — Vector embedding models
- **Custom** — Other model architectures

## Registering a Model

### Via Hugging Face Import
1. Click **Add Model** → **Import from Hugging Face**
2. Enter the Hugging Face Model ID (e.g., \`meta-llama/Llama-3-8B-Instruct\`)
3. Configure the Inference Endpoint URL
4. Add your API Token (securely encrypted)
5. Review and submit — System is auto-created

### Manual Registration
1. Click **Add Model** → **Manual Registration**
2. Enter model metadata (name, type, version)
3. Configure API endpoint
4. Add governance fields (license, owner, use case)

## Model Scores

After evaluation, models display scores for:
- **Fairness** — Demographic parity, equalized odds
- **Privacy** — PII detection, data leakage risk
- **Toxicity** — Harmful content detection
- **Robustness** — Hallucination resistance, factuality
- **Explainability** — Reasoning quality
- **Overall** — Weighted composite score

## Status Indicators

- 🟢 **Healthy** — All scores above thresholds
- 🟡 **Warning** — Some metrics need attention
- 🔴 **Critical** — Urgent remediation required
    `,
  },
  {
    id: 'engines',
    title: 'Core RAI Engines',
    icon: Scale,
    content: `
# Core RAI Evaluation Engines

## Overview

Five independent engines evaluate different dimensions of responsible AI. Each uses **K2 chain-of-thought reasoning** with Gemini 2.5 Pro for complete transparency.

## 1. Fairness Engine

**Purpose**: Detect and measure bias across demographic groups

**Metrics**:
- Demographic Parity Ratio
- Equalized Odds
- Disparate Impact Score
- Calibration by Group

**Use When**: Evaluating models making decisions about people (hiring, lending, insurance)

## 2. Hallucination Engine

**Purpose**: Detect factual inaccuracies and unsupported claims

**Metrics**:
- Factuality Score
- Groundedness
- Claim Verification Rate
- Citation Accuracy

**Use When**: Evaluating LLMs for factual reliability

## 3. Toxicity Engine

**Purpose**: Detect harmful, offensive, or inappropriate content

**Metrics**:
- Toxicity Score
- Hate Speech Detection Rate
- Harmful Content Percentage
- Jailbreak Resistance

**Use When**: Ensuring outputs are safe for end users

## 4. Privacy Engine

**Purpose**: Detect data leakage and privacy risks

**Metrics**:
- PII Detection Rate
- Data Leakage Score
- Membership Inference Risk
- Model Memorization Rate

**Use When**: Protecting sensitive information

## 5. Explainability Engine

**Purpose**: Assess reasoning quality and decision transparency

**Metrics**:
- Reasoning Quality Score
- Explanation Completeness
- Confidence Calibration
- Decision Transparency

**Use When**: Ensuring model decisions are interpretable

## Running Evaluations

1. Navigate to desired engine (e.g., /engine/fairness)
2. Select a registered model
3. Click **Run Evaluation**
4. View detailed K2 reasoning chain with evidence
5. Export scorecard for compliance documentation

## Custom Prompt Testing

Each engine includes a **Custom Prompt Test** feature to validate engine behavior on specific inputs.
    `,
  },
  {
    id: 'hitl',
    title: 'Human-in-the-Loop',
    icon: Users,
    content: `
# Human-in-the-Loop (HITL) Console

## Purpose

The HITL Console manages escalations, reviews, and approvals requiring human judgment before AI systems can proceed.

## Review Types

1. **Safety Reviews** — Flagged for harmful outputs
2. **Fairness Reviews** — Bias concerns
3. **Privacy Reviews** — Data leakage issues
4. **Deployment Approvals** — Pre-production sign-off
5. **Incident Reviews** — Post-incident analysis
6. **Policy Violations** — Guardrail breaches

## Review Workflow

\`\`\`
1. Issue Detected → Auto-escalated to Queue
2. Assigned to Reviewer (or self-assign)
3. Reviewer Analyzes Evidence Package
4. Decision: Approve / Reject / Escalate
5. Rationale Documented with Conditions
6. Action Executed (deploy, block, remediate)
7. Knowledge Graph updated with decision edge
\`\`\`

## SLA Management

| Severity | Response Time |
|----------|---------------|
| Critical | 4 hours |
| High | 24 hours |
| Medium | 72 hours |
| Low | 1 week |

Items approaching SLA deadline show countdown timers. Overdue items trigger notifications.

## Roles

- **Reviewer** — Can review and make decisions
- **Admin** — Can assign items and configure rules
- **Analyst** — Can view queue but not decide

## Decisions Create Audit Trail

Every decision creates:
- Decision record with rationale
- KG edge linking system → decision
- Audit log entry for compliance
    `,
  },
  {
    id: 'observability',
    title: 'Real-Time Observability',
    icon: Activity,
    content: `
# Real-Time AI Observability

## Overview

Live monitoring of all AI systems with drift detection, performance metrics, and safety alerts fed from request logs.

## Key Metrics

### Performance
- **Request Count** — Total API calls
- **Latency (P50, P95, P99)** — Response times
- **Error Rate** — Failed request percentage
- **Throughput** — Requests per second

### Safety
- **Block Rate** — Blocked by guardrails
- **Warn Rate** — Warnings triggered
- **Toxicity Detections** — Harmful content catches
- **PII Detections** — Privacy violation catches

### Drift Detection
- **Feature Drift (PSI)** — Input distribution changes
- **Concept Drift** — Performance degradation
- **Data Quality** — Missing/invalid input rates

## Alert Configuration

Configure thresholds for:
- Drift alerts when PSI > threshold
- Error rate spike detection
- Latency degradation warnings
- Safety metric breaches

## Incident Auto-Creation

When critical thresholds are exceeded:
1. Incident automatically created
2. Added to HITL review queue
3. Notifications sent to configured channels
4. System can be auto-suspended on repeated violations

## Traffic Generator

For testing, use the Traffic Generator to:
1. Simulate production load
2. Test safety guardrails
3. Populate metrics dashboards
4. Validate alerting rules
    `,
  },
  {
    id: 'knowledge-graph',
    title: 'Knowledge Graph',
    icon: GitBranch,
    content: `
# Knowledge Graph & Lineage

## What is the Knowledge Graph?

The KG provides complete traceability from data sources through models to production deployments. It enables impact analysis and compliance auditing.

## Entity Types

- **Dataset** — Training/evaluation data sources
- **Feature** — Engineered features
- **Model** — AI/ML models
- **Evaluation** — Evaluation run results
- **Control** — Compliance controls (NIST, EU AI Act)
- **Risk** — Risk assessments
- **Incident** — Safety/compliance incidents
- **Decision** — Human review decisions
- **Deployment** — Production deployments

## Relationship Types

- **feeds_into** — Data → Feature → Model
- **trains** — Feature → Model
- **evaluated_by** — Model → Evaluation
- **governed_by** — Model → Control
- **monitored_by** — System → Risk
- **triggers** — Incident → Model
- **approved_by** — System → Decision
- **deployed_to** — Model → Deployment

## Key Features

### Blast Radius Analysis
Click any node → "Blast Radius" to see all downstream dependencies and affected deployments.

### Natural Language Queries
Ask questions via Copilot:
- "Why is this model non-compliant?"
- "What data sources feed into this model?"
- "Which deployments are affected by this incident?"

### Immutable Hash Chains
Every node and edge has a SHA-256 hash for tamper-proof audit trails.

## Visualization

- Zoom/pan controls for exploration
- Entity type filters
- 350px minimum node spacing (no overlaps)
- Real-time sync with platform data
    `,
  },
  {
    id: 'governance',
    title: 'Governance & Approvals',
    icon: Shield,
    content: `
# Governance & Approvals

## Deployment Workflow States

\`\`\`
Draft → Ready for Review → Pending Approval → Approved → Deployed
                                   ↓
                               Blocked (if rejected)
\`\`\`

## Risk-Based Gating

Systems automatically require approval when:
- **Risk Tier** = High or Critical
- **Impact Score** > 60
- **Data Sensitivity** = High or Critical
- **Compliance Framework** mandates it

## Approval Process

1. System owner marks "Ready for Review"
2. Auto-transition to "Pending Approval"
3. Approval record created in queue
4. Required approvers notified
5. Evidence package reviewed
6. Decision recorded with rationale
7. System transitions to Approved or Blocked

## Required Approvers

For High/Critical systems:
- **Product Owner** — Business sign-off
- **Compliance Lead** or **CISO** — Risk sign-off

## Runtime Enforcement

The AI Gateway enforces governance:
- Blocks requests to unapproved systems
- Auto-suspends on repeated violations (5+ in 1 hour)
- Logs all decisions for audit trail

## Attestations

Generate legal-grade attestations documenting:
- Model evaluation results
- EU AI Act control mappings
- Cryptographic integrity proof
- Digital signature placeholder
    `,
  },
  {
    id: 'policy',
    title: 'Policy & Red Team',
    icon: FileText,
    content: `
# Policy Studio & Red Team

## Policy DSL

Define runtime policies using YAML-based DSL:

\`\`\`yaml
policy:
  name: "Enterprise Safety Policy"
  version: "1.0"
  rules:
    - name: "Block Toxic Content"
      condition: toxicity_score > 0.7
      action: block
      severity: high
    - name: "Flag PII"
      condition: pii_detected = true
      action: redact
      fields: [email, phone, ssn]
  exemptions:
    - model_id: "internal-test-model"
\`\`\`

## Policy Actions

- **block** — Reject the request entirely
- **warn** — Allow but flag for review
- **redact** — Remove sensitive content
- **throttle** — Rate limit the request

## Red Team Campaigns

### Attack Types Tested
- **Jailbreak** — Bypass safety instructions
- **Prompt Injection** — Hidden commands
- **PII Extraction** — Reveal training data
- **Toxicity Probes** — Generate harmful content
- **Hallucination Induction** — Cause factual errors
- **Policy Bypass** — Circumvent restrictions

### Running a Campaign
1. Navigate to **Policy Studio**
2. Click **Run Sample Red-Team Campaign**
3. 30 adversarial prompts executed
4. Coverage percentage calculated
5. Findings added to review queue
6. Policy violations logged

### Campaign Results
- Attack success rate per category
- Severity heatmap visualization
- Specific prompts that bypassed guardrails
- Recommendations for hardening
    `,
  },
  {
    id: 'golden-demo',
    title: 'Golden Demo',
    icon: PlayCircle,
    content: `
# Golden Demo — End-to-End Proof

## What is Golden Demo?

The Golden Demo (/golden route) is a 90-second automated walkthrough that proves Fractal RAI OS closes every gap identified in the 2024-2025 RAI market analysis.

## The 7 Demo Steps

1. **Generate Traffic** — Create 250+ real request logs with drift alerts
2. **View Incidents** — Watch incidents auto-created from traffic
3. **HITL Review** — Approve an item from the review queue
4. **Run Red Team** — Execute adversarial campaign with real findings
5. **EU AI Act Assessment** — One-click 42 control assessment
6. **Sign Attestation** — Generate cryptographic attestation
7. **Export Scorecard** — Download regulator-grade PDF

## What It Proves

Each step demonstrates a closed gap:
- ✅ Real-time data flows (not fake/static)
- ✅ Automated incident creation
- ✅ Human oversight with audit trail
- ✅ Adversarial testing coverage
- ✅ Regulatory compliance mapping
- ✅ Cryptographic integrity proof
- ✅ Legal-grade documentation

## Running Golden Demo

1. Navigate to **/golden**
2. Click **Start Demo**
3. Watch automated execution
4. Progress overlay shows current step
5. All database operations are real and persist

## Silent Mode

Add \`?real=1\` parameter for auto-run without user interaction — perfect for investor demos.
    `,
  },
  {
    id: 'test-suite',
    title: 'Test Suite',
    icon: TestTube,
    content: `
# Automated Test Suite — 42 Tests

## Purpose

The test suite guarantees zero regressions and validates all platform functionality. Tests run on-demand and verify real database operations.

## Accessing Tests

Navigate to **/run-tests** and click **Run All Tests**

## Test Categories

### Data Integrity Tests
- Request logs ≥ 100
- Drift alerts created
- Incidents auto-generated
- Review queue populated
- Red team campaigns exist
- Policy violations logged
- Control assessments complete
- Attestations signed

### UI/Button Tests
- Run Campaign creates real data
- EU AI Act Assessment generates 42 controls
- Attestation signing works
- HITL Approve creates decision record

### Scorecard Tests
- Contains EU AI Act table
- SHA-256 hash present
- December 2025 timestamp
- PDF format correct

### Golden Demo Tests
- All 7 steps complete error-free
- Database state verified after each step

## Auto-Heal Feature

If tests fail, enable **Auto-Heal** to automatically:
1. Generate missing data
2. Retry failed operations
3. Log healing actions

## Success Output

\`\`\`
FRACTAL RAI-OS: 100% FUNCTIONAL
ALL 42 TESTS PASSED
THE GAP DOCUMENT IS DEAD
\`\`\`
    `,
  },
  {
    id: 'scorecard',
    title: 'Scorecard Export',
    icon: Download,
    content: `
# Regulator-Grade Scorecard Export

## What is the Scorecard?

A 6-page PDF document that provides legal-grade evidence of AI governance compliance, suitable for regulatory submission.

## PDF Structure

### Page 1 — Cover
- Fractal RAI-OS branding
- Attestation ID
- Model name and risk tier
- Overall compliance percentage
- Issue date (December 2025)

### Page 2-3 — EU AI Act Requirements
- All 42 high-risk controls
- Article | Title | Status | Evidence
- Color-coded: Green (Compliant), Yellow (Partial), Red (Non-Compliant)

### Page 4 — Technical RAI Summary
- Fairness score with metrics
- Privacy score with PII rates
- Toxicity score with jailbreak resistance
- Robustness score with factuality
- Red Team coverage and findings

### Page 5 — Knowledge Graph Lineage
- Visual lineage path
- Data → Model → Eval → Policy → Decision → Attestation

### Page 6 — Cryptographic Integrity
- Document Hash (SHA-256)
- Minisign Signature
- Timestamp
- Final attestation statement

## Generating a Scorecard

1. Go to **Governance** page
2. Click **Export Scorecard (PDF)**
3. Select model
4. Click **Generate 6-Page PDF Scorecard**
5. Print dialog opens for PDF save

## Filename Format

\`fractal-rai-os-scorecard-dec2025.pdf\`
    `,
  },
  {
    id: 'roles',
    title: 'User Roles & Access',
    icon: Users,
    content: `
# User Roles & Permissions

## Role Hierarchy

### Admin
- Full access to all features
- Manage users and settings
- Configure integrations
- View all projects and models
- Approve/reject in HITL queue

### Reviewer
- Approve/reject in HITL queue
- Review risk assessments
- Cannot modify settings
- Cannot manage users

### Analyst
- Run evaluations
- View detailed analytics
- Cannot approve deployments
- Cannot access settings

### Viewer
- Read-only dashboard access
- View reports and scorecards
- Cannot run evaluations
- Cannot make any changes

## Feature Access Matrix

| Feature | Admin | Reviewer | Analyst | Viewer |
|---------|-------|----------|---------|--------|
| Dashboard | ✅ | ✅ | ✅ | ✅ |
| Run Evaluations | ✅ | ❌ | ✅ | ❌ |
| HITL Decisions | ✅ | ✅ | ❌ | ❌ |
| Settings | ✅ | ❌ | ❌ | ❌ |
| User Management | ✅ | ❌ | ❌ | ❌ |
| Export Scorecards | ✅ | ✅ | ✅ | ✅ |
| Create Projects | ✅ | ❌ | ✅ | ❌ |
| Delete Models | ✅ | ❌ | ❌ | ❌ |

## Managing Users

1. Go to **Settings** → **Users & Teams**
2. Click **Add User**
3. Enter email address
4. Select role
5. Send invitation
    `,
  },
  {
    id: 'api',
    title: 'API Reference',
    icon: Zap,
    content: `
# API Reference

## Authentication

All API requests require a Bearer token:

\`\`\`bash
curl -H "Authorization: Bearer YOUR_API_KEY" \\
     https://api.fractal-rai.com/v1/models
\`\`\`

## Core Endpoints

### Models
\`\`\`
GET    /v1/models              - List all models
POST   /v1/models              - Register new model
GET    /v1/models/:id          - Get model details
DELETE /v1/models/:id          - Delete model
\`\`\`

### Evaluations
\`\`\`
POST   /v1/eval/run            - Start evaluation
GET    /v1/eval/runs/:id       - Get evaluation results
GET    /v1/eval/report/:id     - Get scorecard (PDF/JSON)
\`\`\`

### AI Gateway
\`\`\`
POST   /v1/gateway/invoke      - Proxy request with guardrails
GET    /v1/gateway/logs        - Get request logs
\`\`\`

### Knowledge Graph
\`\`\`
GET    /v1/kg/lineage/:id      - Get entity lineage
POST   /v1/kg/query            - Query graph (Cypher-like DSL)
POST   /v1/kg/explain          - Natural language query
\`\`\`

### Red Team
\`\`\`
POST   /v1/redteam/campaign    - Start campaign
GET    /v1/redteam/results/:id - Get campaign results
\`\`\`

## Webhooks

Configure webhooks for real-time notifications:
- Evaluation completed
- Approval required
- Alert triggered
- Incident created
- Attestation signed
    `,
  },
  {
    id: 'glossary',
    title: 'Glossary',
    icon: BookOpen,
    content: `
# Glossary

## Key Terms

**Blast Radius** — The set of downstream entities affected by changes to an upstream entity

**Concept Drift** — Changes in the model's input-output relationship over time

**Data Leakage** — Training data information inadvertently influencing predictions

**Demographic Parity** — Fairness metric requiring similar prediction rates across groups

**Disparate Impact** — When neutral practices disproportionately affect protected groups

**Feature Drift** — Changes in input feature distributions compared to training

**Guardrail** — Runtime safety mechanism blocking harmful outputs

**Jailbreak** — Adversarial prompts bypassing safety instructions

**K2 Reasoning** — Chain-of-thought approach explaining evaluation scores

**Knowledge Graph** — Network connecting entities through typed relationships

**Lineage** — Complete provenance chain from data to outputs

**Membership Inference** — Attack determining if data was in training set

**PII** — Personally Identifiable Information (names, emails, SSNs)

**RLS** — Row Level Security for database access control

**Scorecard** — Compliance document with evaluation results and evidence

**URI Score** — Unified Risk Index combining static and runtime factors

**HITL** — Human-in-the-Loop decision making

**PSI** — Population Stability Index for drift detection

**SLA** — Service Level Agreement for review response times

**Attestation** — Formal compliance declaration with cryptographic proof
    `,
  },
];

export default function Documentation() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSection, setActiveSection] = useState('overview');

  const filteredSections = docSections.filter(s =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentSection = docSections.find(s => s.id === activeSection);

  return (
    <MainLayout title="Documentation" subtitle="Complete guide to Fractal RAI OS">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-200px)]">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search docs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-secondary border-border"
            />
          </div>

          <ScrollArea className="h-[calc(100vh-300px)]">
            <nav className="space-y-1 pr-2">
              {filteredSections.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all text-sm",
                      activeSection === section.id
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{section.title}</span>
                    {activeSection === section.id && (
                      <ChevronRight className="w-4 h-4 ml-auto" />
                    )}
                  </button>
                );
              })}
            </nav>
          </ScrollArea>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          <div className="bg-card border border-border rounded-xl p-6 h-full overflow-hidden">
            <ScrollArea className="h-full pr-4">
              {currentSection && (
                <article className="prose prose-invert max-w-none">
                  <div 
                    className="markdown-content"
                    dangerouslySetInnerHTML={{ 
                      __html: formatMarkdown(currentSection.content) 
                    }}
                  />
                </article>
              )}
            </ScrollArea>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

// Simple markdown formatter
function formatMarkdown(content: string): string {
  return content
    .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold text-foreground mb-4 mt-0">$1</h1>')
    .replace(/^## (.*$)/gm, '<h2 class="text-xl font-semibold text-foreground mb-3 mt-6">$1</h2>')
    .replace(/^### (.*$)/gm, '<h3 class="text-lg font-medium text-foreground mb-2 mt-4">$1</h3>')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
    .replace(/`([^`]+)`/g, '<code class="bg-secondary px-1.5 py-0.5 rounded text-primary text-sm font-mono">$1</code>')
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="bg-secondary p-4 rounded-lg overflow-x-auto my-4"><code class="text-sm font-mono text-foreground">$2</code></pre>')
    .replace(/^- (.*$)/gm, '<li class="text-muted-foreground ml-4">$1</li>')
    .replace(/^(\d+)\. (.*$)/gm, '<li class="text-muted-foreground ml-4">$2</li>')
    .replace(/\n\n/g, '</p><p class="text-muted-foreground mb-4">')
    .replace(/\|(.+)\|/g, (match) => {
      const cells = match.split('|').filter(c => c.trim());
      if (cells.some(c => c.includes('---'))) return '';
      const isHeader = cells.every(c => !c.includes('✅') && !c.includes('❌'));
      const tag = isHeader ? 'th' : 'td';
      const cellClass = isHeader ? 'px-3 py-2 text-left font-medium text-foreground bg-secondary' : 'px-3 py-2 text-muted-foreground border-t border-border';
      return `<tr>${cells.map(c => `<${tag} class="${cellClass}">${c.trim()}</${tag}>`).join('')}</tr>`;
    });
}
