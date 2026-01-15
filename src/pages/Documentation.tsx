import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Input } from "@/components/ui/input";
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
  FileText,
  Zap,
  Target,
  Layers,
  PlayCircle,
  Download,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

const docSections = [
  {
    id: 'getting-started',
    title: "Beginner's Guide",
    icon: Sparkles,
    content: `
# Beginner's Guide to Fractal RAI-OS

## Welcome!

Fractal RAI-OS is the world's first end-to-end Responsible AI Operating System. This guide will help you get started in under 10 minutes.

## Quick Start Checklist

### Step 1: Understand the Dashboard
When you log in, you'll see the **main dashboard** showing:
- Overall compliance score across all your AI systems
- Active alerts requiring attention
- Recent evaluation results
- System health indicators

### Step 2: Register Your First Model
1. Go to **Models** in the sidebar
2. Click **Add Model**
3. Choose between:
   - **Import from Hugging Face** — Easiest option
   - **Manual Registration** — For custom models
4. Enter your API endpoint and credentials

### Step 3: Run Your First Evaluation
1. Navigate to any **Evaluate Engine** (Fairness, Toxicity, Privacy, etc.)
2. Select your registered model
3. Click **Run Evaluation**
4. Review the score and recommendations

### Step 4: Check Decision Ledger
After running evaluations, visit **Decision Ledger** to see:
- Immutable audit trail of all AI decisions
- Hash-chain verification for tamper-proofing
- Demographic context for fairness analysis

### Step 5: Generate a Report
Go to **Regulatory Reports** to:
- Generate EU AI Act compliance reports
- Create Model Cards for transparency
- Export for regulator submission

## Key Concepts

| Term | Meaning |
|------|---------|
| System | A deployed AI component with governance |
| Model | AI/ML model metadata for evaluation |
| Evaluation | Assessment of model on RAI dimensions |
| Decision | An AI-made decision logged for audit |
| Appeal | Human challenge of an AI decision |

## Navigation Tips

- **Sidebar**: Main navigation to all features
- **Search**: Use Ctrl+K to quickly find pages
- **Breadcrumbs**: See where you are in the hierarchy
- **Quick Actions**: Top-right buttons for common tasks

## Need Help?

- Check the **Glossary** section for term definitions
- Review specific feature documentation in the sidebar
- Use the **Copilot** for natural language questions
    `,
  },
  {
    id: 'overview',
    title: 'Platform Overview',
    icon: BookOpen,
    content: `
# Fractal RAI OS — The World's First Responsible AI Operating System

## Mission Statement

Fractal RAI OS provides comprehensive governance, evaluation, and monitoring capabilities for AI/ML systems at enterprise scale. It enables organizations to deploy AI systems that are **safe**, **fair**, **transparent**, and **compliant** with regulatory requirements like the EU AI Act.

## The 6 Core Pillars

### 1. RAI Evaluation Engines
Five independent engines (Fairness, Toxicity, Privacy, Hallucination, Explainability) that perform systematic checks on AI models using chain-of-thought reasoning for full transparency.

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
    id: 'decision-ledger',
    title: 'Decision Ledger',
    icon: FileText,
    content: `
# Decision Ledger — Immutable Audit Trail

## What is the Decision Ledger?

The Decision Ledger is a **tamper-proof, hash-chained record** of every AI decision made by your systems. It provides complete auditability required by EU AI Act Article 12 (Record-Keeping).

## Why It Matters

- **Regulatory Compliance**: Provides evidence trail for regulators
- **Accountability**: Know exactly what decisions were made, when, and why
- **Fairness Analysis**: Track demographic context for bias detection
- **Appeal Support**: Enable affected individuals to challenge decisions

## Key Features

### Hash-Chain Integrity
Every decision record contains:
- record_hash: SHA-256 hash of the current record
- previous_hash: Link to the previous record
- Chain validation ensures no tampering

### Demographic Context
Each decision can include:
- Age group
- Gender
- Region/jurisdiction
- Custom protected attributes

### Decision Attributes

| Field | Description |
|-------|-------------|
| Decision Ref | Unique identifier (e.g., DEC-2025-001) |
| Decision Value | APPROVED, DENIED, PENDING, etc. |
| Confidence | Model's confidence score (0-1) |
| Model ID | Which model made the decision |
| Model Version | Version at decision time |
| Timestamp | Exact time of decision |
| Input Hash | Hash of input data |
| Output Hash | Hash of model output |

## Using the Decision Ledger

### Viewing Decisions
1. Navigate to **Decision Ledger** in the sidebar
2. Browse the chronological list of decisions
3. Use search to find specific decision refs

### Verifying Chain Integrity
- Each card shows a **Chain Valid** indicator
- Green checkmark = chain is intact
- Red warning = potential tampering detected

### Filtering
- Search by decision reference or value
- Filter by date range
- Filter by model or system

## Integration with Impact Dashboard

Decision Ledger data feeds into:
- **Population Impact Metrics**: Group-level fairness analysis
- **Appeal Processing**: Link appeals to specific decisions
- **Harm Tracking**: Connect outcomes to original decisions

## Best Practices

1. **Always include demographic context** when logging decisions about people
2. **Log confidence scores** to enable calibration analysis
3. **Use meaningful decision refs** for easy lookup
4. **Never delete records** — use status flags instead
    `,
  },
  {
    id: 'impact-dashboard',
    title: 'Impact Dashboard',
    icon: Target,
    content: `
# Impact Dashboard — Population-Level Fairness

## What is the Impact Dashboard?

The Impact Dashboard monitors **real-world outcomes** of AI decisions at the population level, detecting systemic bias and tracking harm across demographic groups.

## EU AI Act Compliance

This dashboard supports compliance with:
- **Article 9**: Risk Management (ongoing monitoring)
- **Article 10**: Data Governance (demographic coverage)
- **Article 14**: Human Oversight (appeal tracking)

## Key Metrics

### Overview Statistics

| Metric | Description |
|--------|-------------|
| Total Decisions | Count of all AI decisions in period |
| Harmful Outcomes | Decisions with verified harm |
| Appeals Filed | Challenges from affected individuals |
| SLA Compliance | % of appeals resolved within deadline |

### Group-Level Metrics

For each demographic group, we calculate:
- **Positive Rate**: % receiving favorable outcomes
- **Harm Rate**: % experiencing harmful outcomes
- **Appeal Rate**: % who challenged decisions
- **Disparate Impact Ratio**: Comparison to privileged group

### Disparate Impact Analysis

Uses the **EEOC Four-Fifths (80%) Rule**:

DIR = Rate(unprivileged_group) / Rate(privileged_group)

If DIR < 0.8, potential discrimination exists

## Using the Dashboard

### Selecting Scope
1. Choose **System** from dropdown (or "All Systems")
2. Select **Time Window** (7d, 30d, 90d)

### Computing Metrics
1. Click **Compute Metrics** button
2. System analyzes decision_ledger + outcomes
3. Results populate the dashboard

### Interpreting Results

**Harm Categories Chart**: Shows breakdown of harm types
- Discrimination
- Privacy violation
- Financial harm
- Reputational harm

**Longitudinal Fairness**: Trend over time for each group

**Appeal Performance**:
- Pending: Awaiting review
- Resolved: Decision made
- Overturned: Original decision reversed
- SLA Breaches: Missed response deadlines

## Alerts

The dashboard generates alerts when:
- Disparate Impact Ratio < 80%
- Harm rate elevated for specific groups
- Demographic coverage < 80%

## Best Practices

1. **Run weekly** to catch emerging bias patterns
2. **Investigate all critical alerts** immediately
3. **Document remediation actions** for audit trail
4. **Compare across time periods** to track improvement
    `,
  },
  {
    id: 'regulatory-reports',
    title: 'Regulatory Reports',
    icon: Shield,
    content: `
# Regulatory Reports — Compliance Documentation

## What are Regulatory Reports?

Regulatory Reports are **formal compliance documents** generated for submission to regulators, auditors, or internal governance boards.

## Report Types

### EU AI Act Conformity Assessment
- Maps to all 42 high-risk AI requirements
- Article-by-article compliance status
- Evidence references for each control
- Required for high-risk AI systems in EU

### Model Card
- Standardized model documentation
- Training data description
- Intended use cases
- Known limitations
- Fairness/performance metrics

### Data Card
- Dataset documentation
- Data collection methodology
- Consent status
- Privacy considerations
- Distribution characteristics

### Impact Assessment
- Population impact analysis
- Harm potential evaluation
- Mitigation measures
- Human oversight provisions

### Bias Audit
- Fairness evaluation results
- Disparate impact analysis
- Group-level metrics
- Remediation recommendations

### Transparency Report
- Decision statistics
- Appeal outcomes
- Incident summary
- Governance actions

## Report Workflow

Draft → Pending Review → Approved → Published → Archived

### Status Meanings

| Status | Description |
|--------|-------------|
| Draft | Initial generation, not reviewed |
| Pending Review | Awaiting compliance officer sign-off |
| Approved | Reviewed and approved for use |
| Published | Made available to stakeholders |
| Archived | Superseded by newer version |

## Generating Reports

### Step 1: Click "New Report"
Opens the report generator dialog

### Step 2: Select Parameters
- Choose target **System**
- Select **Report Type**
- Set **Time Period** if applicable

### Step 3: Generate
- System compiles data from relevant sources
- Calculates metrics and statistics
- Generates document hash for integrity

### Step 4: Review
- Preview report content
- Verify accuracy of metrics
- Check evidence references

### Step 5: Approve
- Click **Approve** button
- Records approval timestamp
- Enables download/export

## Document Integrity

Each report includes:
- **Document Hash**: SHA-256 of content
- **Generated At**: Timestamp of creation
- **Approved By**: Who approved (if applicable)
- **Version**: Increments with updates

## Export Options

- **JSON**: Machine-readable format
- **PDF**: Print-ready document (via scorecard)
- **API**: Programmatic access

## Best Practices

1. **Generate quarterly** for ongoing compliance
2. **Archive old versions** instead of deleting
3. **Include in governance packages** for board review
4. **Reference from attestations** for legal backing
    `,
  },
  {
    id: 'projects',
    title: 'Projects & Systems',
    icon: FolderOpen,
    content: `
# Projects & Systems

## Hierarchy Structure

Project (Top-level container)
├── System (AI deployment unit with governance)
│   ├── Model (AI model metadata)
│   ├── Risk Assessment (Static + Runtime)
│   ├── Impact Assessment
│   └── Approval Workflow
└── Multiple Systems per Project

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
2. Enter the Hugging Face Model ID
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
    title: 'Evaluate Engines',
    icon: Scale,
    content: `
# Evaluate Engines — RAI Assessment

## Overview

Six independent engines evaluate different dimensions of responsible AI. Each provides transparent scoring with detailed breakdowns.

## Available Engines

### 1. Fairness Engine (/engine/fairness)
**Purpose**: Detect and measure bias across demographic groups
**Metrics**: Demographic Parity, Equalized Odds, Disparate Impact
**Use When**: Evaluating models making decisions about people

### 2. Toxicity Engine (/engine/toxicity)
**Purpose**: Detect harmful, offensive, or inappropriate content
**Metrics**: Toxicity Score, Hate Speech Rate, Jailbreak Resistance
**Use When**: Ensuring outputs are safe for end users

### 3. Privacy Engine (/engine/privacy)
**Purpose**: Detect data leakage and privacy risks
**Metrics**: PII Detection, Data Leakage Score, Memorization Rate
**Use When**: Protecting sensitive information

### 4. Hallucination Engine (/engine/hallucination)
**Purpose**: Detect factual inaccuracies and unsupported claims
**Metrics**: Factuality Score, Groundedness, Citation Accuracy
**Use When**: Evaluating LLMs for factual reliability

### 5. Explainability Engine (/engine/explainability)
**Purpose**: Assess reasoning quality and decision transparency
**Metrics**: Reasoning Quality, Explanation Completeness
**Use When**: Ensuring model decisions are interpretable

### 6. Data Quality Engine (/engine/data-quality)
**Purpose**: Assess data quality for AI training/inference
**Metrics**: Completeness, Validity, Uniqueness, Freshness
**Use When**: Validating datasets before use

## Running Evaluations

1. Navigate to desired engine
2. Select a registered model from dropdown
3. Click **Run Evaluation**
4. Wait for processing (usually 5-30 seconds)
5. View score in toast notification

## Custom Prompt Testing

Each engine includes a **Custom Prompt Test** section:
1. Enter a custom prompt
2. Click **Test Prompt**
3. See how the model responds
4. Useful for edge case testing
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

1. Issue Detected → Auto-escalated to Queue
2. Assigned to Reviewer (or self-assign)
3. Reviewer Analyzes Evidence Package
4. Decision: Approve / Reject / Escalate
5. Rationale Documented with Conditions
6. Action Executed (deploy, block, remediate)
7. Knowledge Graph updated with decision edge

## SLA Management

| Severity | Response Time |
|----------|---------------|
| Critical | 4 hours |
| High | 24 hours |
| Medium | 72 hours |
| Low | 1 week |

Items approaching SLA deadline show countdown timers.

## Roles

- **Reviewer** — Can review and make decisions
- **Admin** — Can assign items and configure rules
- **Analyst** — Can view queue but not decide
    `,
  },
  {
    id: 'observability',
    title: 'Real-Time Observability',
    icon: Activity,
    content: `
# Real-Time AI Observability

## Overview

Live monitoring of all AI systems with drift detection, performance metrics, and safety alerts.

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
    `,
  },
  {
    id: 'knowledge-graph',
    title: 'Knowledge Graph',
    icon: GitBranch,
    content: `
# Knowledge Graph & Lineage

## What is the Knowledge Graph?

The KG provides complete traceability from data sources through models to production deployments.

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
Click any node → "Blast Radius" to see all downstream dependencies.

### Natural Language Queries
Ask questions via Copilot:
- "Why is this model non-compliant?"
- "What data sources feed into this model?"
- "Which deployments are affected by this incident?"

### Immutable Hash Chains
Every node and edge has a SHA-256 hash for tamper-proof audit trails.
    `,
  },
  {
    id: 'governance',
    title: 'Governance & Approvals',
    icon: Lock,
    content: `
# Governance & Approvals

## Deployment Workflow States

Draft → Ready for Review → Pending Approval → Approved → Deployed
                                   ↓
                               Blocked (if rejected)

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
- Auto-suspends on repeated violations
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
    icon: AlertCircle,
    content: `
# Policy Studio & Red Team

## Policy DSL

Define runtime policies using YAML-based DSL:

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
    `,
  },
  {
    id: 'data-contracts',
    title: 'Data Contracts',
    icon: Layers,
    content: `
# Data Contracts

## What are Data Contracts?

Data Contracts define **expectations and guarantees** for datasets used in AI systems.

## Contract Components

### Schema Expectations
- Column names and types
- Nullable fields
- Primary keys
- Unique constraints

### Quality Thresholds
- Minimum completeness (e.g., 95%)
- Maximum null rate per column
- Valid value ranges
- Pattern matching rules

### Freshness SLA
- Maximum age of data (hours)
- Update frequency requirements
- Staleness alerts

### PII Guarantees
- Which columns may contain PII
- Required anonymization methods
- Consent requirements

## Enforcement Modes

| Mode | Behavior |
|------|----------|
| Monitor | Log violations, don't block |
| Warn | Alert on violations, continue |
| Enforce | Block data that violates contract |

## Best Practices

1. **Define contracts before using data** in AI systems
2. **Start with Monitor mode** to baseline violations
3. **Gradually tighten thresholds** over time
4. **Connect to evaluation engines** for automated checks
    `,
  },
  {
    id: 'golden-demo',
    title: 'Golden Demo',
    icon: PlayCircle,
    content: `
# Golden Demo — End-to-End Proof

## What is Golden Demo?

The Golden Demo (/golden route) is a 90-second automated walkthrough proving Fractal RAI OS closes every gap identified in the RAI market analysis.

## The 7 Demo Steps

1. **Generate Traffic** — Create 250+ real request logs
2. **View Incidents** — Watch incidents auto-created
3. **HITL Review** — Approve an item from the queue
4. **Run Red Team** — Execute adversarial campaign
5. **EU AI Act Assessment** — One-click 42 control assessment
6. **Sign Attestation** — Generate cryptographic attestation
7. **Export Scorecard** — Download regulator-grade PDF

## What It Proves

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
    `,
  },
  {
    id: 'scorecard',
    title: 'Scorecard Export',
    icon: Download,
    content: `
# Regulator-Grade Scorecard Export

## What is the Scorecard?

A 6-page PDF document providing legal-grade evidence of AI governance compliance.

## PDF Structure

### Page 1 — Cover
- Fractal RAI-OS branding
- Attestation ID
- Model name and risk tier
- Overall compliance percentage

### Page 2-3 — EU AI Act Requirements
- All 42 high-risk controls
- Article | Title | Status | Evidence
- Color-coded compliance status

### Page 4 — Technical RAI Summary
- Fairness score with metrics
- Privacy score with PII rates
- Toxicity score with jailbreak resistance
- Robustness score with factuality

### Page 5 — Knowledge Graph Lineage
- Visual lineage path
- Data → Model → Eval → Policy → Decision

### Page 6 — Cryptographic Integrity
- Document Hash (SHA-256)
- Timestamp
- Final attestation statement

## Generating a Scorecard

1. Go to **Governance** page
2. Click **Export Scorecard (PDF)**
3. Select model
4. Click **Generate 6-Page PDF Scorecard**
5. Print dialog opens for PDF save
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
- Approve/reject in HITL queue

### Reviewer
- Approve/reject in HITL queue
- Review risk assessments
- Cannot modify settings

### Analyst
- Run evaluations
- View detailed analytics
- Cannot approve deployments

### Viewer
- Read-only dashboard access
- View reports and scorecards
- Cannot run evaluations

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

curl -H "Authorization: Bearer YOUR_API_KEY" \\
     https://api.fractal-rai.com/v1/models

## Core Endpoints

### Models
GET    /v1/models              - List all models
POST   /v1/models              - Register new model
GET    /v1/models/:id          - Get model details
DELETE /v1/models/:id          - Delete model

### Evaluations
POST   /v1/eval/run            - Start evaluation
GET    /v1/eval/runs/:id       - Get evaluation results
GET    /v1/eval/report/:id     - Get scorecard

### AI Gateway
POST   /v1/gateway/invoke      - Proxy request with guardrails
GET    /v1/gateway/logs        - Get request logs

### Decision Ledger
POST   /v1/decisions/log       - Log a new decision
GET    /v1/decisions           - List decisions
GET    /v1/decisions/:id       - Get decision details

### Knowledge Graph
GET    /v1/kg/lineage/:id      - Get entity lineage
POST   /v1/kg/query            - Query graph
POST   /v1/kg/explain          - Natural language query

### Red Team
POST   /v1/redteam/campaign    - Start campaign
GET    /v1/redteam/results/:id - Get campaign results

## Webhooks

Configure webhooks for:
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

**Attestation** — Formal compliance declaration with cryptographic proof

**Blast Radius** — The set of downstream entities affected by changes

**Concept Drift** — Changes in the model's input-output relationship over time

**Data Leakage** — Training data information inadvertently influencing predictions

**Decision Ledger** — Immutable, hash-chained record of all AI decisions

**Demographic Parity** — Fairness metric requiring similar prediction rates across groups

**Disparate Impact** — When neutral practices disproportionately affect protected groups

**Feature Drift** — Changes in input feature distributions compared to training

**Guardrail** — Runtime safety mechanism blocking harmful outputs

**HITL** — Human-in-the-Loop decision making

**Impact Dashboard** — Population-level monitoring of AI decision outcomes

**Jailbreak** — Adversarial prompts bypassing safety instructions

**Knowledge Graph** — Network connecting entities through typed relationships

**Lineage** — Complete provenance chain from data to outputs

**Membership Inference** — Attack determining if data was in training set

**PII** — Personally Identifiable Information (names, emails, SSNs)

**PSI** — Population Stability Index for drift detection

**Regulatory Report** — Formal compliance document for regulators

**RLS** — Row Level Security for database access control

**Scorecard** — Compliance document with evaluation results and evidence

**SLA** — Service Level Agreement for review response times

**URI Score** — Unified Risk Index combining static and runtime factors
    `,
  },
];

export default function Documentation() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSection, setActiveSection] = useState('getting-started');

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
