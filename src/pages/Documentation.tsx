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
  Sparkles,
  Settings,
  Bell,
  BarChart3,
  FileCheck,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  Lightbulb
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

const docSections = [
  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 1: GETTING STARTED
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'welcome',
    title: "Welcome",
    icon: Sparkles,
    category: "Getting Started",
    content: `
# Welcome to Fractal RAI-OS

## What is Fractal RAI-OS?

Fractal RAI-OS is the **world's first end-to-end Responsible AI Operating System**. It provides everything you need to build, deploy, and govern AI systems that are:

- **Safe** — Protected against harmful outputs and adversarial attacks
- **Fair** — Free from discriminatory bias across demographic groups
- **Transparent** — Every decision is explainable and auditable
- **Compliant** — Aligned with EU AI Act, NIST AI RMF, and other regulations

## Who Is This For?

| Role | What You'll Use |
|------|-----------------|
| AI/ML Engineer | Model registration, evaluation engines, observability |
| Data Scientist | Fairness metrics, data quality, explainability |
| Compliance Officer | Regulatory reports, attestations, control frameworks |
| Product Manager | Impact dashboard, decision ledger, governance |
| CISO/Risk Manager | Risk assessments, approvals, incident management |

## How This Documentation Is Organized

This cookbook follows the **natural workflow** of the platform:

1. **Configure** — Set up projects, register models, configure settings
2. **Monitor** — Observe real-time telemetry and drift detection
3. **Govern** — Manage approvals, decisions, and human oversight
4. **Evaluate** — Run RAI assessments across 6 engines
5. **Respond** — Define policies and run adversarial testing
6. **Impact** — Track population-level outcomes and regulatory reports

## Quick Start (5 Minutes)

### Step 1: Create Your First Project
Navigate to **Configure → Projects** and click **Create Project**.

### Step 2: Register a Model
Go to **Configure → Models** and either:
- Import from Hugging Face (easiest)
- Register manually with API endpoint

### Step 3: Run an Evaluation
Visit any **Evaluate** engine (e.g., Fairness) and click **Run Evaluation**.

### Step 4: Review Results
Check the **Decision Ledger** to see your evaluation recorded with full audit trail.

### Step 5: Generate a Report
Go to **Impact → Regulatory Reports** to generate compliance documentation.

---

**Ready to dive deeper?** Continue to the next section for navigation tips.
    `,
  },
  {
    id: 'navigation',
    title: "Navigation Guide",
    icon: BookOpen,
    category: "Getting Started",
    content: `
# Navigation Guide

## Understanding the Sidebar

The sidebar organizes all features into logical groups. Here's what each section contains:

### Monitor
| Page | Purpose |
|------|---------|
| Observability | Real-time telemetry, drift detection, system health |
| Alerts | Active alerts and notification management |

### Govern
| Page | Purpose |
|------|---------|
| Approvals | Deployment approval workflows |
| Decision Ledger | Immutable audit trail of all AI decisions |
| HITL Console | Human-in-the-loop review queue |
| Incidents | Safety and compliance incident management |
| Knowledge Graph | Entity lineage and relationship visualization |

### Evaluate
| Page | Purpose |
|------|---------|
| Fairness | Demographic parity, equalized odds, disparate impact |
| Hallucination | Factuality, groundedness, false claims detection |
| Toxicity | Harmful content, hate speech, jailbreak resistance |
| Privacy | PII detection, data leakage, memorization risks |
| Explainability | Reasoning quality, decision transparency |
| Data Quality | Completeness, validity, freshness, uniqueness |

### Respond
| Page | Purpose |
|------|---------|
| Policy Studio | Runtime guardrails and policy DSL |
| Data Contracts | Dataset quality expectations and enforcement |
| Golden Demo | End-to-end proof of platform capabilities |

### Impact
| Page | Purpose |
|------|---------|
| Impact Dashboard | Population-level fairness and harm tracking |
| Regulatory Reports | EU AI Act, Model Cards, Bias Audits |

### Configure
| Page | Purpose |
|------|---------|
| Projects | Create and manage AI projects |
| Models | Register and configure AI models |
| Settings | System preferences and integrations |
| Documentation | This cookbook! |

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl + K | Open global search |
| Esc | Close dialogs and modals |

## Understanding Status Indicators

Throughout the platform, you'll see colored indicators:

| Color | Meaning |
|-------|---------|
| 🟢 Green | Healthy / Compliant / Passed |
| 🟡 Yellow | Warning / Needs Attention |
| 🔴 Red | Critical / Failed / Non-Compliant |
| 🔵 Blue | Informational / In Progress |

## Real-Time Indicators

Look for the **pulsing green dot** — this means real-time data is active. When you see this, the page will automatically update as new data arrives.
    `,
  },
  {
    id: 'concepts',
    title: "Core Concepts",
    icon: Lightbulb,
    category: "Getting Started",
    content: `
# Core Concepts

Before diving into features, understand these fundamental concepts:

## Hierarchy: Project → System → Model

\`\`\`
Project (e.g., "Loan Approval AI")
├── System (e.g., "Credit Scoring API")
│   ├── Model (e.g., "XGBoost v2.1")
│   ├── Risk Assessment
│   ├── Impact Assessment
│   └── Approval Workflow
└── Another System
    └── Another Model
\`\`\`

### Project
A **Project** is the top-level container for organizing your AI initiative. It includes:
- Metadata (name, description, environment)
- Compliance frameworks
- Data sensitivity classification

### System
A **System** is a deployed AI component with:
- API endpoint
- Runtime governance (approval status)
- Request logging and telemetry
- Policy enforcement

### Model
A **Model** is the AI/ML model metadata, including:
- Type (LLM, classification, regression, etc.)
- Evaluation scores (fairness, toxicity, privacy, etc.)
- Version history

## Evaluation vs. Decision

| Evaluation | Decision |
|------------|----------|
| Assessment of a model's properties | Runtime output from an AI system |
| Run on-demand or scheduled | Logged in real-time |
| Stored in evaluation_runs table | Stored in decision_ledger |
| Used for governance gates | Used for audit and appeal |

## Risk Tiers

Every system is assigned a risk tier based on:
- Data sensitivity (Low → Critical)
- Business criticality (1-10)
- Impact assessment score

| Risk Tier | Approval Required? |
|-----------|-------------------|
| Low | No |
| Medium | No |
| High | Yes |
| Critical | Yes (dual approval) |

## Compliance Score

Compliance score is calculated as:

\`\`\`
Score = (Compliant Controls / Total Controls) × 100
\`\`\`

Scores map to status:
- **≥90%** → Compliant (green)
- **70-89%** → Warning (yellow)
- **<70%** → Non-Compliant (red)

## Hash Chains

Critical audit data uses **hash chains** for tamper-proofing:

\`\`\`
record_hash = SHA256(current_record_data)
previous_hash = hash of prior record
\`\`\`

If anyone modifies a record, the chain breaks — detected automatically.
    `,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 2: CONFIGURE
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'projects',
    title: "Projects",
    icon: FolderOpen,
    category: "Configure",
    content: `
# Projects

## What is a Project?

A **Project** is the top-level container for your AI initiative. It groups related systems and models under unified governance.

## Creating a Project

### Step 1: Navigate to Projects
Click **Configure → Projects** in the sidebar.

### Step 2: Click "Create Project"
Opens the project creation form.

### Step 3: Fill in Required Fields

| Field | Description | Example |
|-------|-------------|---------|
| Name | Descriptive identifier | "Loan Approval System" |
| Description | Purpose and scope | "Automated credit decisioning" |
| Environment | Deployment stage | Development, Staging, Production |
| Data Sensitivity | Privacy classification | Low, Medium, High, Critical |
| Business Criticality | Importance (1-10) | 8 |

### Step 4: Select Compliance Frameworks
Check which regulations apply:
- ☑ EU AI Act
- ☑ NIST AI RMF
- ☐ ISO/IEC 42001

### Step 5: Set Data Residency
Choose geographic location for data storage.

### Step 6: Add Owner Email
Enter the accountable person's email.

### Step 7: Submit
Click **Create Project** — the system auto-creates an initial risk profile.

## Project Properties Explained

### Environment
- **Development** — For testing, minimal governance
- **Staging** — Pre-production, approval recommended
- **Production** — Live traffic, full governance required

### Data Sensitivity
- **Low** — No PII, public data
- **Medium** — Limited PII, internal use
- **High** — Sensitive PII, protected data
- **Critical** — Highly sensitive, regulated data

### Business Criticality
Scale of 1-10:
- **1-3** — Non-critical, informational
- **4-6** — Important for operations
- **7-8** — Critical for revenue
- **9-10** — Mission-critical, safety-related

## Viewing Project Details

Click any project card to see:
- Summary statistics
- Linked systems and models
- Risk assessment results
- Activity log

## Best Practices

1. **One project per use case** — Don't mix unrelated AI systems
2. **Set environment correctly** — This affects governance requirements
3. **Be honest about sensitivity** — Under-classifying creates compliance risk
4. **Keep descriptions updated** — Future auditors will thank you
    `,
  },
  {
    id: 'models',
    title: "Models",
    icon: Database,
    category: "Configure",
    content: `
# Model Registry

## What is a Model?

A **Model** represents AI/ML model metadata registered for governance. Every model is linked to a System which handles runtime governance.

## Model Types Supported

| Type | Description | Example |
|------|-------------|---------|
| LLM | Large Language Models | GPT-4, Claude, Llama |
| Classification | Binary/multi-class | Fraud detection |
| Regression | Numerical prediction | Price estimation |
| NER | Named Entity Recognition | PII detection |
| Embedding | Vector embeddings | Search, recommendations |
| Custom | Other architectures | Reinforcement learning |

## Registering a Model

### Option A: Import from Hugging Face (Recommended)

1. Click **Add Model → Import from Hugging Face**
2. Enter the **Model ID** (e.g., "meta-llama/Llama-2-7b")
3. Configure **Inference Endpoint URL**
4. Add your **API Token** (securely encrypted)
5. Review model card details
6. Click **Register** — System is auto-created

### Option B: Manual Registration

1. Click **Add Model → Manual Registration**
2. Fill in model metadata:
   - Name
   - Type (LLM, classification, etc.)
   - Version
   - Base model (if fine-tuned)
3. Configure API endpoint
4. Add governance fields:
   - License
   - Owner email
   - Use case description
5. Submit

## Model Scores

After running evaluations, models display scores:

| Score | Meaning | Good Range |
|-------|---------|------------|
| Fairness | Demographic parity across groups | ≥80% |
| Privacy | PII detection, data leakage risk | ≥85% |
| Toxicity | Harmful content resistance | ≥90% |
| Robustness | Hallucination resistance, factuality | ≥80% |
| Explainability | Reasoning quality | ≥75% |
| Overall | Weighted composite | ≥80% |

## Model Status Indicators

| Status | Meaning |
|--------|---------|
| 🟢 Healthy | All scores above thresholds |
| 🟡 Warning | Some metrics need attention |
| 🔴 Critical | Urgent remediation required |
| ⚪ Pending | Awaiting first evaluation |

## Connecting to External APIs

When registering models with external endpoints:

1. **Endpoint URL** — Full URL including path
2. **Authentication** — API key or Bearer token
3. **Headers** — Additional headers if required
4. **Timeout** — Request timeout in seconds

## Version Management

When updating a model:
1. Click **Add Version**
2. Enter new version string
3. Add changelog notes
4. Previous versions remain for audit

## Best Practices

1. **Use semantic versioning** — v1.0.0, v1.1.0, v2.0.0
2. **Document changes** — Future you will appreciate it
3. **Run evaluations after updates** — Verify no regression
4. **Set accurate model types** — This affects which evaluations apply
    `,
  },
  {
    id: 'settings',
    title: "Settings",
    icon: Settings,
    category: "Configure",
    content: `
# Settings

## Accessing Settings

Click **Configure → Settings** in the sidebar.

## Settings Sections

### General
Basic configuration for your organization:

| Setting | Description |
|---------|-------------|
| Organization Name | Your company name |
| Default Workspace | Primary workspace for new projects |
| Timezone | Display timezone for dates |
| Data Retention | Days to keep evaluation data |

### Users & Teams
Manage access and permissions:
- Add/remove team members
- Assign roles (Admin, Reviewer, Analyst, Viewer)
- Configure team workspaces

### Security
Authentication and access controls:

| Feature | Status |
|---------|--------|
| Password Auth | ✅ Enforced |
| Multi-Factor Auth | 📋 Planned |
| Single Sign-On | 📋 Enterprise |
| Session Timeout | 📋 Planned |

### Notifications
Alert preferences (backend pending):
- Email alerts
- Slack integration
- Critical alerts only
- Daily digest
- HITL review reminders

### Integrations
Connect external services:

| Integration | Purpose |
|-------------|---------|
| Hugging Face | Model import |
| OpenTelemetry | Metrics export |
| MLflow | Experiment tracking |
| Slack | Notifications |
| PagerDuty | Incident escalation |

### LLM Providers
Configure AI provider API keys:
- OpenAI
- Anthropic
- Google (Gemini)
- Hugging Face
- Custom endpoints

### API Keys
Manage programmatic access:
- Generate new API keys
- Revoke existing keys
- View usage statistics

### Regions & Compliance
Jurisdictional settings:

| Setting | Options |
|---------|---------|
| Data Residency | US, EU, APAC |
| Frameworks | EU AI Act, NIST, ISO |
| GDPR Mode | Enabled/Disabled |
| Audit Retention | Years to keep |

## Saving Changes

Click **Save Changes** after modifying any section. Changes take effect immediately.
    `,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 3: MONITOR
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'observability',
    title: "Observability",
    icon: Activity,
    category: "Monitor",
    content: `
# Observability

## Overview

The Observability page provides **real-time monitoring** of all AI systems with live telemetry, drift detection, and health dashboards.

## Dashboard Tabs

### Main Dashboard
Key performance indicators at a glance:

| Metric | Description |
|--------|-------------|
| Gateway Health | % of successful requests |
| Drift Alerts | Active distribution changes |
| Avg Latency | Response time in milliseconds |
| Open Incidents | Unresolved safety issues |

### AI Assistant
Ask natural language questions about your AI systems:
- "Why did fairness drop for Model X?"
- "Show me recent toxicity violations"
- "What's the approval status for System Y?"

### Real-Time Chat
Live demonstration of AI gateway with guardrails. See how policies block harmful requests in real-time.

### Drift Detection
Configure and monitor feature drift:
- Set PSI (Population Stability Index) thresholds
- View drift trends over time
- Acknowledge or dismiss alerts

## System Health Table

Shows per-system metrics:

| Column | Meaning |
|--------|---------|
| System | System name |
| Status | Healthy / Warning / Critical |
| Requests | Total API calls (24h) |
| Blocked | Requests blocked by guardrails |
| Latency | Average response time |

## Model Health Table

Shows per-model metrics:

| Column | Meaning |
|--------|---------|
| Model | Model name |
| Status | Based on lowest score |
| Fairness | Latest fairness score |
| Robustness | Latest robustness score |
| Updated | Time since last evaluation |

## Drift Alerts

When input distributions shift:

1. **Alert created** with drift type and severity
2. **Notification sent** to configured channels
3. **Review required** — acknowledge or dismiss
4. **Auto-escalate** if threshold exceeded

### Drift Types

| Type | Meaning |
|------|---------|
| Feature Drift | Input distribution changed |
| Concept Drift | Model performance degraded |
| Data Quality | Missing/invalid input increased |

## Real-Time Subscriptions

The observability page uses **Supabase Realtime** to push updates:
- New request logs
- Drift alerts
- Incidents
- Model updates

Look for the **green pulsing dot** to confirm realtime is active.

## Best Practices

1. **Set realistic thresholds** — Too sensitive = alert fatigue
2. **Check daily** — Catch drift before it impacts users
3. **Correlate with incidents** — Drift often precedes issues
4. **Use AI Assistant** — Faster than clicking through dashboards
    `,
  },
  {
    id: 'alerts',
    title: "Alerts",
    icon: Bell,
    category: "Monitor",
    content: `
# Alerts

## What Are Alerts?

Alerts notify you when AI systems need attention. They're generated automatically based on:
- Drift detection thresholds
- Evaluation score drops
- Policy violations
- Incident creation

## Alert Severity Levels

| Severity | Response Time | Examples |
|----------|---------------|----------|
| Critical | Immediate | Safety violation, data breach |
| High | 4 hours | Fairness below 60%, repeated blocks |
| Medium | 24 hours | Drift detected, score degradation |
| Low | 1 week | Minor configuration issues |

## Viewing Alerts

Navigate to **Monitor → Alerts** to see:
- Active alerts requiring action
- Recently resolved alerts
- Alert statistics and trends

## Alert Actions

For each alert, you can:

| Action | Description |
|--------|-------------|
| Acknowledge | Mark as seen, timer starts |
| Investigate | Link to relevant evidence |
| Resolve | Mark as handled, add notes |
| Escalate | Send to higher authority |
| Snooze | Temporarily hide (max 24h) |

## Alert Configuration

Currently, alert thresholds are configured per-engine:

| Engine | Default Threshold |
|--------|-------------------|
| Fairness | Score < 70% |
| Toxicity | Score < 85% |
| Privacy | PII detected |
| Drift | PSI > 0.2 |

## Notification Channels (Planned)

When implemented, alerts will be sent via:
- Email
- Slack
- PagerDuty
- Webhooks

## Best Practices

1. **Don't ignore alerts** — Each represents real risk
2. **Document resolution** — Future auditors need evidence
3. **Review patterns** — Repeated alerts = systemic issue
4. **Set appropriate severity** — Overuse of Critical = desensitization
    `,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 4: GOVERN
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'approvals',
    title: "Approvals",
    icon: Shield,
    category: "Govern",
    content: `
# Approvals

## What Are Approvals?

Approvals are **governance gates** that prevent high-risk AI systems from deploying without human oversight.

## When Is Approval Required?

Systems automatically require approval when:
- **Risk Tier** = High or Critical
- **Impact Score** > 60
- **Data Sensitivity** = High or Critical
- **Compliance Framework** mandates it

## Approval Workflow

\`\`\`
Draft → Ready for Review → Pending Approval → Approved → Deployed
                                    ↓
                                 Blocked
\`\`\`

### Step 1: System Owner Actions
1. Complete risk assessment
2. Run required evaluations
3. Mark system as "Ready for Review"

### Step 2: Auto-Transition
System moves to "Pending Approval" and appears in queue.

### Step 3: Reviewer Actions
1. Receive notification
2. Review evidence package:
   - Evaluation scores
   - Risk assessment
   - Impact assessment
   - Control mappings
3. Make decision: **Approve** or **Block**
4. Add rationale and conditions

### Step 4: Outcome
- **Approved** → System can receive traffic
- **Blocked** → Must remediate and resubmit

## Required Approvers

For High/Critical systems, you need:

| Role | Responsibility |
|------|----------------|
| Product Owner | Business sign-off |
| Compliance Lead | Risk sign-off |
| CISO | Security sign-off (Critical only) |

## Viewing Pending Approvals

Navigate to **Govern → Approvals** to see:
- All pending approval requests
- Your assigned reviews
- Recently completed approvals

## Evidence Package Contents

Each approval request includes:

| Document | Purpose |
|----------|---------|
| Risk Assessment | Static and runtime risk scores |
| Impact Assessment | Population impact evaluation |
| Evaluation Results | All engine scores |
| Control Mapping | Framework alignment |
| Audit Trail | All previous decisions |

## Best Practices

1. **Don't skip reviews** — Even if you're busy
2. **Document rationale** — "Looks good" isn't enough
3. **Add conditions** — "Approved with 30-day re-evaluation"
4. **Escalate uncertainty** — When in doubt, ask for help
    `,
  },
  {
    id: 'decision-ledger',
    title: "Decision Ledger",
    icon: FileText,
    category: "Govern",
    content: `
# Decision Ledger

## What Is the Decision Ledger?

The Decision Ledger is a **tamper-proof, hash-chained record** of every AI decision made by your systems. It provides complete auditability required by EU AI Act Article 12 (Record-Keeping).

## Why It Matters

| Benefit | Description |
|---------|-------------|
| Regulatory Compliance | Evidence trail for regulators |
| Accountability | Know what, when, and why |
| Fairness Analysis | Demographic context tracking |
| Appeal Support | Enable challenges to decisions |

## Decision Record Fields

Each decision contains:

| Field | Description | Example |
|-------|-------------|---------|
| Decision Ref | Unique identifier | DEC-2025-001 |
| Decision Value | Outcome | APPROVED, DENIED |
| Confidence | Model's certainty | 0.87 |
| Model ID | Which model decided | uuid-abc-123 |
| Model Version | Version at decision time | v2.1.0 |
| Timestamp | Exact time | 2025-01-15T10:30:00Z |
| Input Hash | Hash of inputs | sha256:abc... |
| Output Hash | Hash of outputs | sha256:def... |
| Record Hash | Hash of this record | sha256:ghi... |
| Previous Hash | Link to prior record | sha256:xyz... |

## Demographic Context

For decisions about people, include:

| Field | Purpose |
|-------|---------|
| Age Group | Age-based fairness tracking |
| Gender | Gender-based fairness |
| Region | Geographic disparity analysis |
| Custom Attributes | Your protected classes |

## Using the Decision Ledger

### Viewing Decisions
1. Navigate to **Govern → Decision Ledger**
2. Browse chronological list
3. Click any decision for details

### Searching
- Search by decision reference
- Filter by decision value
- Filter by date range
- Filter by model or system

### Verifying Chain Integrity
Each card shows a **Chain Valid** indicator:
- ✅ Green checkmark = Chain intact
- ❌ Red warning = Potential tampering

## Integration with Other Features

Decision Ledger feeds into:

| Feature | How It's Used |
|---------|---------------|
| Impact Dashboard | Group-level fairness analysis |
| Appeal Processing | Link appeals to decisions |
| Harm Tracking | Connect outcomes to decisions |
| Regulatory Reports | Evidence for compliance |

## Logging Decisions Programmatically

\`\`\`javascript
POST /v1/decisions/log
{
  "decision_ref": "DEC-2025-001",
  "decision_value": "APPROVED",
  "confidence": 0.87,
  "model_id": "uuid-abc-123",
  "model_version": "v2.1.0",
  "demographic_context": {
    "age_group": "30-40",
    "gender": "female",
    "region": "EU"
  }
}
\`\`\`

## Best Practices

1. **Always include demographic context** for decisions about people
2. **Log confidence scores** to enable calibration analysis
3. **Use meaningful decision refs** for easy lookup
4. **Never delete records** — use status flags instead
    `,
  },
  {
    id: 'hitl',
    title: "HITL Console",
    icon: Users,
    category: "Govern",
    content: `
# Human-in-the-Loop (HITL) Console

## What Is HITL?

The HITL Console manages **escalations, reviews, and approvals** requiring human judgment before AI systems can proceed.

## Why HITL Matters

EU AI Act Article 14 requires human oversight for high-risk AI. HITL provides:
- Mandatory review for critical decisions
- Override capability for AI outputs
- Complete audit trail of human decisions

## Review Types

| Type | Trigger | Priority |
|------|---------|----------|
| Safety Review | Harmful output flagged | High |
| Fairness Review | Bias concern detected | Medium |
| Privacy Review | Data leakage detected | High |
| Deployment Approval | Pre-production gate | Medium |
| Incident Review | Post-incident analysis | Critical |
| Policy Violation | Guardrail breach | High |

## Review Workflow

\`\`\`
1. Issue Detected
   ↓
2. Auto-escalated to Queue
   ↓
3. Assigned to Reviewer (or self-assign)
   ↓
4. Reviewer Analyzes Evidence Package
   ↓
5. Decision: Approve / Reject / Escalate
   ↓
6. Rationale Documented with Conditions
   ↓
7. Action Executed
   ↓
8. Knowledge Graph Updated
\`\`\`

## SLA Management

Review items have time limits:

| Severity | Response SLA |
|----------|--------------|
| Critical | 4 hours |
| High | 24 hours |
| Medium | 72 hours |
| Low | 1 week |

Items approaching deadline show countdown timers.

## Reviewer Actions

For each item in queue:

| Action | Description |
|--------|-------------|
| Approve | Allow the action to proceed |
| Reject | Block the action |
| Escalate | Send to senior reviewer |
| Request Info | Ask for more context |
| Assign | Delegate to another reviewer |

## Evidence Package

Each review includes:

| Document | Purpose |
|----------|---------|
| Original Request | What triggered the review |
| Model Output | What the AI produced |
| Evaluation Scores | Relevant RAI metrics |
| Similar Cases | Historical precedents |
| Regulatory Mapping | Applicable requirements |

## Roles and Permissions

| Role | Permissions |
|------|-------------|
| Reviewer | View queue, make decisions |
| Admin | Assign items, configure rules |
| Analyst | View queue only, cannot decide |

## Best Practices

1. **Meet SLAs** — Late reviews create compliance risk
2. **Document decisions thoroughly** — "Approved" isn't enough
3. **Use escalation** — When uncertain, ask for help
4. **Review patterns** — Same issue twice = systemic problem
    `,
  },
  {
    id: 'incidents',
    title: "Incidents",
    icon: AlertTriangle,
    category: "Govern",
    content: `
# Incidents

## What Are Incidents?

Incidents are **safety or compliance issues** that require investigation and remediation.

## Incident Types

| Type | Description | Severity |
|------|-------------|----------|
| Safety Violation | Harmful output produced | Critical |
| Fairness Issue | Bias detected in decisions | High |
| Privacy Breach | PII leaked or exposed | Critical |
| Policy Violation | Guardrail bypassed | Medium |
| Performance Degradation | Model quality dropped | Low |

## Incident Lifecycle

\`\`\`
Open → Investigating → Remediation → Resolved → Archived
\`\`\`

### Status Meanings

| Status | Description |
|--------|-------------|
| Open | Just created, needs triage |
| Investigating | Root cause analysis underway |
| Remediation | Fix identified, being implemented |
| Resolved | Fixed and verified |
| Archived | Closed, available for reference |

## Creating an Incident

Incidents are created:
- **Automatically** — When evaluations fail thresholds
- **Automatically** — When guardrails block repeatedly
- **Manually** — By users who observe issues

## Incident Details

Each incident contains:

| Field | Description |
|-------|-------------|
| Title | Brief description |
| Description | Detailed explanation |
| Type | Category of incident |
| Severity | Critical, High, Medium, Low |
| Model | Affected model |
| Assignee | Person responsible |
| Created At | When discovered |
| Resolved At | When fixed |

## Incident Response

### Step 1: Triage
- Assess severity
- Assign to appropriate person
- Set priority

### Step 2: Investigate
- Review logs and evidence
- Identify root cause
- Document findings

### Step 3: Remediate
- Implement fix
- Test thoroughly
- Update documentation

### Step 4: Resolve
- Verify fix works
- Close incident
- Schedule post-mortem if needed

### Step 5: Archive
- Move to historical records
- Available for pattern analysis

## Best Practices

1. **Create incidents early** — Don't wait until it's a crisis
2. **Set accurate severity** — Over-classifying wastes resources
3. **Document thoroughly** — Future incidents may be related
4. **Conduct post-mortems** — Learn from every incident
    `,
  },
  {
    id: 'knowledge-graph',
    title: "Knowledge Graph",
    icon: GitBranch,
    category: "Govern",
    content: `
# Knowledge Graph & Lineage

## What Is the Knowledge Graph?

The Knowledge Graph provides **complete traceability** from data sources through models to production deployments.

## Entity Types

| Entity | Description |
|--------|-------------|
| Dataset | Training/evaluation data sources |
| Feature | Engineered features |
| Model | AI/ML models |
| Evaluation | Evaluation run results |
| Control | Compliance controls |
| Risk | Risk assessments |
| Incident | Safety/compliance incidents |
| Decision | Human review decisions |
| Deployment | Production deployments |

## Relationship Types

| Relationship | Meaning |
|--------------|---------|
| feeds_into | Data → Feature → Model |
| trains | Feature → Model |
| evaluated_by | Model → Evaluation |
| governed_by | Model → Control |
| monitored_by | System → Risk |
| triggers | Incident → Model |
| approved_by | System → Decision |
| deployed_to | Model → Deployment |

## Visualizing Lineage

1. Navigate to **Govern → Knowledge Graph**
2. Select a starting entity
3. View upstream and downstream connections
4. Click nodes for details

## Blast Radius Analysis

To understand impact of changes:

1. Click any node
2. Select **Blast Radius**
3. View all downstream dependencies

Example: If a dataset changes, see which models, evaluations, and deployments are affected.

## Natural Language Queries

Use the Copilot to ask questions:
- "Why is this model non-compliant?"
- "What data sources feed into this model?"
- "Which deployments are affected by this incident?"

## Immutable Hash Chains

Every node and edge has a SHA-256 hash:

\`\`\`
node_hash = SHA256(entity_data)
edge_hash = SHA256(source_id + target_id + relationship)
\`\`\`

Any modification breaks the chain — detected automatically.

## Use Cases

| Use Case | How to Use KG |
|----------|---------------|
| Audit Trail | Trace decisions to data sources |
| Impact Analysis | Understand change effects |
| Root Cause | Track incidents to origins |
| Compliance | Map models to controls |

## Best Practices

1. **Review before changes** — Check blast radius first
2. **Use natural language** — Faster than clicking
3. **Verify integrity** — Check hash chains periodically
4. **Document relationships** — Add metadata to edges
    `,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 5: EVALUATE
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'engines-overview',
    title: "Engines Overview",
    icon: Scale,
    category: "Evaluate",
    content: `
# Evaluation Engines Overview

## What Are Evaluation Engines?

Six independent engines assess different dimensions of responsible AI. Each provides:
- Transparent scoring with detailed breakdowns
- Evidence packages for audit
- Remediation recommendations

## The Six Engines

| Engine | Path | Purpose |
|--------|------|---------|
| Fairness | /engine/fairness | Bias and discrimination detection |
| Toxicity | /engine/toxicity | Harmful content detection |
| Privacy | /engine/privacy | Data leakage and PII risks |
| Hallucination | /engine/hallucination | Factuality and groundedness |
| Explainability | /engine/explainability | Reasoning transparency |
| Data Quality | /engine/data-quality | Dataset health assessment |

## Running Evaluations

### Step 1: Navigate to Engine
Click on any engine in the **Evaluate** section of the sidebar.

### Step 2: Select Model
Choose a registered model from the dropdown.

### Step 3: Run Evaluation
Click **Run Evaluation** button.

### Step 4: Wait for Results
Processing takes 5-30 seconds depending on complexity.

### Step 5: Review Score
Score appears in toast notification and updates model card.

## Transparency Components

Every engine displays:

| Component | Purpose |
|-----------|---------|
| Input/Output Scope | What was tested |
| Computation Breakdown | How score was calculated |
| Raw Data Log | Actual test cases and results |
| Evidence Package | Downloadable proof |

## Custom Prompt Testing

Each engine includes a **Custom Prompt Test** section:

1. Enter a custom prompt
2. Click **Test Prompt**
3. See how the model responds
4. Useful for edge case testing

## Score Thresholds

| Score Range | Status | Action |
|-------------|--------|--------|
| 90-100% | Excellent | No action needed |
| 80-89% | Good | Monitor for changes |
| 70-79% | Warning | Review and plan improvement |
| 60-69% | Poor | Remediate before production |
| <60% | Critical | Block deployment |

## Evidence Packages

Download includes:
- Test case inputs
- Model outputs
- Score calculations
- SHA-256 hash for integrity
- Timestamp

## Best Practices

1. **Run all engines** before production deployment
2. **Test edge cases** with custom prompts
3. **Save evidence packages** for compliance
4. **Re-run after changes** to verify no regression
    `,
  },
  {
    id: 'fairness-engine',
    title: "Fairness Engine",
    icon: Scale,
    category: "Evaluate",
    content: `
# Fairness Engine

## Purpose

Detect and measure **bias across demographic groups** to ensure AI decisions don't discriminate.

## Metrics Calculated

| Metric | Formula | Good Value |
|--------|---------|------------|
| Demographic Parity | P(Y=1\|G=g) = P(Y=1) | >80% |
| Equalized Odds | TPR and FPR equal across groups | >80% |
| Disparate Impact | min(rate_a, rate_b) / max(rate_a, rate_b) | >80% |
| Calibration | Predicted probability matches reality | >85% |

## Protected Attributes

The engine tests across:
- Gender (male, female, non-binary)
- Age groups (18-30, 30-45, 45-60, 60+)
- Ethnicity/race
- Geographic region
- Custom attributes

## Test Cases

The engine uses 55 predefined test cases:
- 60% expected to PASS
- 40% expected to FAIL (to detect true issues)

## How It Works

\`\`\`
1. Load test cases with demographic context
2. Run each through the model
3. Group outcomes by protected attribute
4. Calculate parity metrics
5. Compare to thresholds
6. Generate score and evidence
\`\`\`

## Interpreting Results

### Demographic Parity Gap
\`\`\`
Gap = |Rate_Group_A - Rate_Group_B|
Score = 100 - (Gap × 100)
\`\`\`

If Gap > 20%, there's potential discrimination.

### Disparate Impact Ratio
\`\`\`
DIR = min(rate_a, rate_b) / max(rate_a, rate_b)
\`\`\`

If DIR < 0.8, there's potential disparate impact (EEOC 4/5 rule).

## Remediation Recommendations

If fairness score is low:
1. Review training data for representation
2. Check for proxy variables
3. Apply fairness constraints during training
4. Use post-processing calibration
5. Consider different model architecture

## Regulatory Mapping

| Regulation | Requirement |
|------------|-------------|
| EU AI Act Art. 10 | Data governance and bias prevention |
| EU AI Act Art. 15 | Accuracy across groups |
| ECOA (US) | Non-discrimination in credit |
| Fair Housing Act | Non-discrimination in housing |
    `,
  },
  {
    id: 'toxicity-engine',
    title: "Toxicity Engine",
    icon: AlertCircle,
    category: "Evaluate",
    content: `
# Toxicity Engine

## Purpose

Detect **harmful, offensive, or inappropriate content** in AI outputs to protect users.

## Metrics Calculated

| Metric | Description | Good Value |
|--------|-------------|------------|
| Toxicity Score | Overall harmful content rate | <10% |
| Hate Speech Rate | Discriminatory language | <5% |
| Jailbreak Resistance | Blocks prompt injection | >90% |
| Profanity Rate | Offensive language | <5% |
| Violence Rate | Violent content | <2% |

## Toxicity Categories

| Category | Examples |
|----------|----------|
| Hate Speech | Discrimination, slurs |
| Harassment | Threats, bullying |
| Violence | Gore, harm instructions |
| Sexual Content | Explicit material |
| Self-Harm | Suicide, eating disorders |
| Dangerous Content | Weapons, drugs |

## Test Cases

Includes adversarial prompts:
- Direct toxic requests
- Encoded harmful content
- Jailbreak attempts
- Social engineering
- Roleplay bypass

## Jailbreak Testing

Common jailbreak patterns tested:
- "Ignore previous instructions"
- "You are now DAN (Do Anything Now)"
- Base64/ROT13 encoded prompts
- Fictional framing
- Character roleplay

## Interpreting Results

### Toxicity Score Calculation
\`\`\`
Score = (Non-Toxic Responses / Total Responses) × 100
\`\`\`

### Jailbreak Resistance
\`\`\`
Resistance = (Blocked Jailbreaks / Total Jailbreaks) × 100
\`\`\`

## Remediation Recommendations

If toxicity score is low:
1. Strengthen system prompts
2. Add content filters
3. Implement output moderation
4. Fine-tune with safety data
5. Use constitutional AI techniques

## Regulatory Mapping

| Regulation | Requirement |
|------------|-------------|
| EU AI Act Art. 9 | Risk management for harmful outputs |
| DSA (EU) | Content moderation obligations |
| KOSA (US) | Child safety requirements |
    `,
  },
  {
    id: 'privacy-engine',
    title: "Privacy Engine",
    icon: Lock,
    category: "Evaluate",
    content: `
# Privacy Engine

## Purpose

Detect **data leakage and privacy risks** in AI systems to protect personal information.

## Metrics Calculated

| Metric | Description | Good Value |
|--------|-------------|------------|
| PII Detection Rate | Personal data in outputs | <5% |
| Data Leakage Score | Training data exposure | <10% |
| Memorization Rate | Exact training data recall | <5% |
| Anonymization Check | Proper de-identification | >95% |

## PII Types Detected

| Type | Examples |
|------|----------|
| Names | Full names, usernames |
| Contact | Email, phone, address |
| Financial | Credit card, bank account |
| Identity | SSN, passport, driver's license |
| Health | Medical records, conditions |
| Biometric | Fingerprints, facial data |

## Test Cases

Privacy tests include:
- Direct PII extraction attempts
- Membership inference attacks
- Training data extraction
- Prompt injection for data leaks
- Cross-reference attacks

## How It Works

\`\`\`
1. Send extraction prompts to model
2. Analyze responses for PII patterns
3. Check for training data memorization
4. Test anonymization effectiveness
5. Calculate privacy score
6. Generate evidence package
\`\`\`

## Interpreting Results

### PII Leakage Rate
\`\`\`
Rate = (Responses with PII / Total Responses) × 100
\`\`\`

### Privacy Score
\`\`\`
Score = 100 - (weighted sum of violation rates)
\`\`\`

## Remediation Recommendations

If privacy score is low:
1. Apply differential privacy during training
2. Implement output filtering
3. Use data minimization
4. Add PII redaction to outputs
5. Review training data for sensitive content

## Regulatory Mapping

| Regulation | Requirement |
|------------|-------------|
| GDPR Art. 5 | Data minimization |
| GDPR Art. 25 | Privacy by design |
| CCPA | Consumer data rights |
| HIPAA | Health information protection |
    `,
  },
  {
    id: 'hallucination-engine',
    title: "Hallucination Engine",
    icon: AlertCircle,
    category: "Evaluate",
    content: `
# Hallucination Engine

## Purpose

Detect **factual inaccuracies and unsupported claims** in AI outputs.

## Metrics Calculated

| Metric | Description | Good Value |
|--------|-------------|------------|
| Factuality Score | Verifiable claims accuracy | >85% |
| Groundedness | Claims supported by context | >90% |
| Citation Accuracy | Correct source references | >85% |
| Fabrication Rate | Made-up information | <10% |

## Hallucination Types

| Type | Description |
|------|-------------|
| Factual Error | Incorrect facts |
| Entity Confusion | Wrong names/places/dates |
| Fabrication | Completely made-up content |
| Misattribution | Wrong source cited |
| Overconfidence | Uncertain presented as certain |

## Test Cases

Tests include:
- Fact verification questions
- Knowledge boundary probes
- Citation accuracy checks
- Temporal consistency tests
- Entity relationship verification

## How It Works

\`\`\`
1. Send factual prompts with known answers
2. Compare model responses to ground truth
3. Check citation validity
4. Assess confidence calibration
5. Calculate factuality score
6. Generate evidence package
\`\`\`

## Interpreting Results

### Factuality Score
\`\`\`
Score = (Correct Facts / Total Facts Checked) × 100
\`\`\`

### Groundedness Score
\`\`\`
Score = (Grounded Claims / Total Claims) × 100
\`\`\`

## Remediation Recommendations

If hallucination score is low:
1. Implement RAG (Retrieval Augmented Generation)
2. Add fact-checking layer
3. Train on higher quality data
4. Implement confidence thresholds
5. Add citation requirements

## Regulatory Mapping

| Regulation | Requirement |
|------------|-------------|
| EU AI Act Art. 13 | Transparency about limitations |
| EU AI Act Art. 15 | Accuracy requirements |
    `,
  },
  {
    id: 'explainability-engine',
    title: "Explainability Engine",
    icon: Eye,
    category: "Evaluate",
    content: `
# Explainability Engine

## Purpose

Assess **reasoning quality and decision transparency** to ensure AI decisions are interpretable.

## Metrics Calculated

| Metric | Description | Good Value |
|--------|-------------|------------|
| Reasoning Quality | Logical explanation coherence | >75% |
| Explanation Completeness | All factors addressed | >80% |
| Feature Attribution | Input contribution clarity | >70% |
| Counterfactual Quality | Alternative scenario validity | >70% |

## What Makes AI Explainable?

| Requirement | Description |
|-------------|-------------|
| Transparency | How the decision was made |
| Interpretability | Understandable to humans |
| Traceability | Factors that influenced decision |
| Contestability | Ability to challenge and correct |

## Test Cases

Explainability tests include:
- "Explain your reasoning"
- "What factors influenced this?"
- "What would change the outcome?"
- Feature importance queries
- Counterfactual generation

## How It Works

\`\`\`
1. Request explanations for decisions
2. Analyze reasoning chain quality
3. Check feature attribution accuracy
4. Test counterfactual validity
5. Calculate explainability score
6. Generate evidence package
\`\`\`

## Interpreting Results

### Reasoning Quality Score
Based on:
- Logical coherence
- Step-by-step clarity
- No contradictions
- Relevant factors cited

### Completeness Score
Based on:
- All input features addressed
- No unexplained jumps
- Confidence communicated

## Remediation Recommendations

If explainability score is low:
1. Add chain-of-thought prompting
2. Implement SHAP/LIME for feature attribution
3. Train on explanation data
4. Add counterfactual generation
5. Simplify model architecture

## Regulatory Mapping

| Regulation | Requirement |
|------------|-------------|
| EU AI Act Art. 13 | Transparency obligations |
| EU AI Act Art. 14 | Human oversight capability |
| GDPR Art. 22 | Right to explanation |
    `,
  },
  {
    id: 'data-quality-engine',
    title: "Data Quality Engine",
    icon: Database,
    category: "Evaluate",
    content: `
# Data Quality Engine

## Purpose

Assess **dataset health** for AI training and inference.

## Metrics Calculated

| Metric | Description | Good Value |
|--------|-------------|------------|
| Completeness | Non-null values | >95% |
| Validity | Values match schema | >98% |
| Uniqueness | Non-duplicate records | >99% |
| Freshness | Data currency | <24h stale |
| Consistency | Cross-field coherence | >95% |

## Quality Dimensions

### Completeness
\`\`\`
Score = (Non-Null Values / Total Values) × 100
\`\`\`

Missing data can bias AI training and inference.

### Validity
\`\`\`
Score = (Valid Values / Total Values) × 100
\`\`\`

Invalid data (wrong type, out of range) causes errors.

### Uniqueness
\`\`\`
Score = (Unique Records / Total Records) × 100
\`\`\`

Duplicates can overweight certain patterns.

### Freshness
\`\`\`
Score = 100 - (Age in Hours / SLA Hours) × 100
\`\`\`

Stale data may not reflect current reality.

## Using the Engine

### Step 1: Upload Data
Click **Upload CSV** and select your file.

### Step 2: Automatic Analysis
System analyzes:
- Column types
- Null rates
- Value distributions
- Anomalies

### Step 3: View Results
- Per-column quality scores
- Overall dataset score
- Issue breakdown

### Step 4: Download Evidence
Export quality report for audit.

## Remediation Recommendations

| Issue | Recommendation |
|-------|----------------|
| High nulls | Impute or collect more data |
| Invalid values | Fix source or add validation |
| Duplicates | Deduplicate with matching |
| Stale data | Increase refresh frequency |

## Data Contracts

Link quality checks to **Data Contracts** for enforcement:
- Schema expectations
- Quality thresholds
- Freshness SLAs
- PII guarantees

## Best Practices

1. **Check quality before training** — Garbage in = garbage out
2. **Monitor continuously** — Data quality can degrade
3. **Set realistic thresholds** — 100% is rarely achievable
4. **Document exceptions** — Some nulls may be legitimate
    `,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 6: RESPOND
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'policy-studio',
    title: "Policy Studio",
    icon: FileText,
    category: "Respond",
    content: `
# Policy Studio

## What Is Policy Studio?

Policy Studio lets you define **runtime guardrails** that enforce safety rules on AI outputs.

## Policy DSL

Define policies using YAML-based DSL:

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
      
    - name: "Rate Limit High Risk"
      condition: risk_score > 0.8
      action: throttle
      limit: 10/minute
\`\`\`

## Policy Actions

| Action | Description | Use When |
|--------|-------------|----------|
| block | Reject request entirely | Critical violations |
| warn | Allow but flag for review | Moderate concerns |
| redact | Remove sensitive content | PII detected |
| throttle | Rate limit | Abuse prevention |
| log | Record for audit | All requests |

## Creating a Policy

### Step 1: Navigate to Policy Studio
Click **Respond → Policy Studio** in sidebar.

### Step 2: Start New Policy
Click **Create Policy**.

### Step 3: Define Rules
For each rule:
- Name (descriptive)
- Condition (when to trigger)
- Action (what to do)
- Severity (for alerting)

### Step 4: Test Policy
Use **Test Policy** to verify behavior.

### Step 5: Activate
Set status to **Active** to enforce.

## Policy Status

| Status | Meaning |
|--------|---------|
| Draft | Work in progress |
| Active | Enforced on traffic |
| Disabled | Temporarily off |
| Archived | Historical reference |

## Red Team Testing

### Running a Campaign

1. Navigate to Policy Studio
2. Click **Run Sample Red-Team Campaign**
3. 30 adversarial prompts executed
4. See coverage percentage
5. Review findings

### Attack Types Tested

| Attack | Description |
|--------|-------------|
| Jailbreak | Bypass safety instructions |
| Prompt Injection | Hidden commands |
| PII Extraction | Reveal training data |
| Toxicity Probes | Generate harmful content |
| Hallucination Induction | Cause factual errors |
| Policy Bypass | Circumvent restrictions |

## Best Practices

1. **Start with monitoring** — Don't block everything initially
2. **Test thoroughly** — False positives frustrate users
3. **Layer policies** — Defense in depth
4. **Review regularly** — Attack patterns evolve
    `,
  },
  {
    id: 'data-contracts',
    title: "Data Contracts",
    icon: Layers,
    category: "Respond",
    content: `
# Data Contracts

## What Are Data Contracts?

Data Contracts define **expectations and guarantees** for datasets used in AI systems.

## Contract Components

### Schema Expectations
\`\`\`json
{
  "columns": [
    { "name": "user_id", "type": "uuid", "nullable": false },
    { "name": "age", "type": "integer", "min": 0, "max": 120 },
    { "name": "email", "type": "string", "pattern": "^[^@]+@[^@]+$" }
  ]
}
\`\`\`

### Quality Thresholds
\`\`\`json
{
  "completeness": 0.95,
  "validity": 0.98,
  "uniqueness": 0.99
}
\`\`\`

### Freshness SLA
\`\`\`json
{
  "max_age_hours": 24,
  "update_frequency": "hourly"
}
\`\`\`

### PII Guarantees
\`\`\`json
{
  "pii_columns": ["email", "phone"],
  "anonymization": "required",
  "consent": "explicit"
}
\`\`\`

## Enforcement Modes

| Mode | Behavior |
|------|----------|
| Monitor | Log violations, don't block |
| Warn | Alert on violations, continue |
| Enforce | Block data that violates contract |

## Creating a Contract

### Step 1: Navigate to Data Contracts
Click **Respond → Data Contracts** in sidebar.

### Step 2: Select Dataset
Choose which dataset to govern.

### Step 3: Define Schema
Specify expected columns and types.

### Step 4: Set Thresholds
Configure quality requirements.

### Step 5: Set Enforcement Mode
Choose Monitor, Warn, or Enforce.

### Step 6: Activate
Click **Save & Activate**.

## Violation Handling

When violations occur:

1. Violation logged to database
2. Alert generated (if configured)
3. Based on enforcement mode:
   - Monitor: Continue processing
   - Warn: Continue + alert
   - Enforce: Block processing

## Viewing Violations

Navigate to **Data Contracts → Violations** to see:
- Recent violations
- Severity breakdown
- Affected models
- Resolution status

## Best Practices

1. **Define contracts early** — Before using data in AI
2. **Start with Monitor** — Baseline your violation rate
3. **Tighten gradually** — Don't block everything day one
4. **Connect to evaluations** — Automate quality checks
    `,
  },
  {
    id: 'golden-demo',
    title: "Golden Demo",
    icon: PlayCircle,
    category: "Respond",
    content: `
# Golden Demo

## What Is Golden Demo?

The Golden Demo is a **90-second automated walkthrough** proving Fractal RAI-OS closes every gap in the RAI market.

## The 7 Demo Steps

| Step | Action | Proves |
|------|--------|--------|
| 1 | Generate Traffic | Real-time data flows |
| 2 | View Incidents | Auto-incident creation |
| 3 | HITL Review | Human oversight works |
| 4 | Run Red Team | Adversarial testing |
| 5 | EU AI Act Assessment | Regulatory mapping |
| 6 | Sign Attestation | Cryptographic proof |
| 7 | Export Scorecard | Legal-grade docs |

## Running Golden Demo

### Step 1: Navigate
Go to **Respond → Golden Demo** in sidebar.

### Step 2: Start Demo
Click **Start Demo** button.

### Step 3: Watch Execution
- Progress overlay shows current step
- Each step completes automatically
- All database operations are real

### Step 4: Verify Results
After completion:
- Check Decision Ledger for new entries
- View Incidents for auto-created issues
- Download Scorecard PDF

## What Golden Demo Proves

| Claim | Evidence |
|-------|----------|
| Real data flows | Request logs in database |
| Auto-incident creation | Incidents table populated |
| Human oversight | HITL decision recorded |
| Adversarial testing | Red team results stored |
| Compliance mapping | EU AI Act controls checked |
| Cryptographic proof | SHA-256 hash in attestation |
| Legal documentation | PDF scorecard downloadable |

## Important Notes

- **Data persists** — All operations write to real database
- **Takes ~90 seconds** — Don't interrupt
- **Requires models** — Register at least one model first
- **One at a time** — Don't run concurrent demos

## Use Cases

| Audience | Purpose |
|----------|---------|
| Prospects | Show capabilities quickly |
| Executives | High-level platform proof |
| Auditors | Demonstrate compliance |
| New users | Learn the workflow |
    `,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 7: IMPACT
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'impact-dashboard',
    title: "Impact Dashboard",
    icon: BarChart3,
    category: "Impact",
    content: `
# Impact Dashboard

## What Is the Impact Dashboard?

The Impact Dashboard monitors **real-world outcomes** of AI decisions at the population level, detecting systemic bias and tracking harm.

## Key Metrics

### Overview Statistics

| Metric | Description |
|--------|-------------|
| Total Decisions | Count of all AI decisions in period |
| Harmful Outcomes | Decisions with verified harm |
| Appeals Filed | Challenges from affected individuals |
| SLA Compliance | % of appeals resolved within deadline |

### Group-Level Metrics

For each demographic group:

| Metric | Formula |
|--------|---------|
| Positive Rate | Favorable / Total × 100 |
| Harm Rate | Harmful / Total × 100 |
| Appeal Rate | Appeals / Total × 100 |
| Disparate Impact | Rate_A / Rate_B |

## Disparate Impact Analysis

Uses the **EEOC Four-Fifths (80%) Rule**:

\`\`\`
DIR = Rate(unprivileged_group) / Rate(privileged_group)
If DIR < 0.8, potential discrimination exists
\`\`\`

## Using the Dashboard

### Step 1: Select Scope
- Choose **System** (or "All Systems")
- Select **Time Window** (7d, 30d, 90d)

### Step 2: Compute Metrics
Click **Compute Metrics** button.

### Step 3: Review Results

**Harm Categories Chart**
Shows breakdown by type:
- Discrimination
- Privacy violation
- Financial harm
- Reputational harm

**Longitudinal Fairness**
Trend over time for each group.

**Appeal Performance**
- Pending: Awaiting review
- Resolved: Decision made
- Overturned: Original reversed
- SLA Breaches: Missed deadlines

## Alerts

Dashboard generates alerts when:
- Disparate Impact Ratio < 80%
- Harm rate elevated for specific groups
- Demographic coverage < 80%
- Appeal SLA breach rate > 10%

## EU AI Act Compliance

This dashboard supports:

| Article | Requirement |
|---------|-------------|
| Art. 9 | Risk Management (ongoing monitoring) |
| Art. 10 | Data Governance (demographic coverage) |
| Art. 14 | Human Oversight (appeal tracking) |

## Best Practices

1. **Run weekly** — Catch emerging patterns
2. **Investigate critical alerts** — Immediately
3. **Document remediation** — For audit trail
4. **Compare across time** — Track improvement
    `,
  },
  {
    id: 'regulatory-reports',
    title: "Regulatory Reports",
    icon: FileCheck,
    category: "Impact",
    content: `
# Regulatory Reports

## What Are Regulatory Reports?

Formal compliance documents for submission to regulators, auditors, or governance boards.

## Report Types

| Type | Purpose | Audience |
|------|---------|----------|
| EU AI Act Conformity | Full compliance mapping | Regulators |
| Model Card | Standardized model docs | Public/Users |
| Data Card | Dataset documentation | Data teams |
| Impact Assessment | Population impact analysis | Ethics boards |
| Bias Audit | Fairness evaluation summary | Compliance |
| Transparency Report | Decision statistics | Public |

## EU AI Act Conformity

Maps to all 42 high-risk AI requirements:
- Article-by-article compliance status
- Evidence references for each control
- Required for high-risk AI in EU

## Report Workflow

\`\`\`
Draft → Pending Review → Approved → Published → Archived
\`\`\`

| Status | Description |
|--------|-------------|
| Draft | Initial generation |
| Pending Review | Awaiting sign-off |
| Approved | Reviewed and approved |
| Published | Available to stakeholders |
| Archived | Superseded by newer version |

## Generating Reports

### Step 1: Click "New Report"
Opens the report generator dialog.

### Step 2: Select Parameters
- Choose target **System**
- Select **Report Type**
- Set **Time Period** if applicable

### Step 3: Generate
System compiles data and calculates metrics.

### Step 4: Review
Preview content and verify accuracy.

### Step 5: Approve
Click **Approve** to enable download.

## Document Integrity

Each report includes:

| Field | Purpose |
|-------|---------|
| Document Hash | SHA-256 of content |
| Generated At | Creation timestamp |
| Approved By | Approver identity |
| Version | Increments with updates |

## Export Options

| Format | Use Case |
|--------|----------|
| JSON | Machine-readable |
| PDF | Print-ready |
| API | Programmatic access |

## Best Practices

1. **Generate quarterly** — For ongoing compliance
2. **Archive old versions** — Don't delete
3. **Include in governance packages** — For board review
4. **Reference from attestations** — Legal backing
    `,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 8: REFERENCE
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'api-reference',
    title: "API Reference",
    icon: Zap,
    category: "Reference",
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

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /v1/models | List all models |
| POST | /v1/models | Register new model |
| GET | /v1/models/:id | Get model details |
| DELETE | /v1/models/:id | Delete model |

### Evaluations

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /v1/eval/run | Start evaluation |
| GET | /v1/eval/runs/:id | Get results |
| GET | /v1/eval/report/:id | Get scorecard |

### AI Gateway

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /v1/gateway/invoke | Proxy with guardrails |
| GET | /v1/gateway/logs | Get request logs |

### Decision Ledger

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /v1/decisions/log | Log decision |
| GET | /v1/decisions | List decisions |
| GET | /v1/decisions/:id | Get details |

### Knowledge Graph

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /v1/kg/lineage/:id | Get lineage |
| POST | /v1/kg/query | Query graph |
| POST | /v1/kg/explain | NL query |

### Red Team

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /v1/redteam/campaign | Start campaign |
| GET | /v1/redteam/results/:id | Get results |

## Webhooks

Configure webhooks for events:
- Evaluation completed
- Approval required
- Alert triggered
- Incident created
- Attestation signed

## Rate Limits

| Tier | Requests/Min |
|------|--------------|
| Free | 60 |
| Pro | 600 |
| Enterprise | Unlimited |

## Error Codes

| Code | Meaning |
|------|---------|
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 429 | Rate Limited |
| 500 | Server Error |
    `,
  },
  {
    id: 'glossary',
    title: "Glossary",
    icon: BookOpen,
    category: "Reference",
    content: `
# Glossary

## A-D

**Attestation** — Formal compliance declaration with cryptographic proof

**Blast Radius** — Set of downstream entities affected by changes

**Concept Drift** — Changes in model's input-output relationship over time

**Data Leakage** — Training data inadvertently influencing predictions

**Decision Ledger** — Immutable, hash-chained record of AI decisions

**Demographic Parity** — Fairness metric requiring similar prediction rates across groups

**Disparate Impact** — When neutral practices disproportionately affect protected groups

## E-H

**Equalized Odds** — Fairness metric requiring equal TPR and FPR across groups

**Feature Drift** — Changes in input feature distributions vs. training

**Guardrail** — Runtime safety mechanism blocking harmful outputs

**Hash Chain** — Linked cryptographic hashes for tamper detection

**HITL** — Human-in-the-Loop decision making

## I-L

**Impact Dashboard** — Population-level monitoring of AI outcomes

**Jailbreak** — Adversarial prompts bypassing safety instructions

**Knowledge Graph** — Network connecting entities through relationships

**Lineage** — Complete provenance chain from data to outputs

## M-P

**Membership Inference** — Attack determining if data was in training

**PII** — Personally Identifiable Information

**PSI** — Population Stability Index for drift detection

**Protected Attribute** — Demographic characteristic requiring fairness

## R-Z

**Regulatory Report** — Formal compliance document for regulators

**RLS** — Row Level Security for database access control

**Scorecard** — Compliance document with evaluation results

**SLA** — Service Level Agreement for response times

**URI Score** — Unified Risk Index combining static and runtime factors
    `,
  },
  {
    id: 'troubleshooting',
    title: "Troubleshooting",
    icon: AlertTriangle,
    category: "Reference",
    content: `
# Troubleshooting

## Common Issues

### "No models found"
**Cause**: No models registered yet
**Solution**: Go to Configure → Models → Add Model

### "Evaluation failed"
**Cause**: Model endpoint unreachable
**Solution**: 
1. Check endpoint URL is correct
2. Verify API key is valid
3. Ensure model is running

### "Score shows 0%"
**Cause**: Model returned errors for all test cases
**Solution**: 
1. Check model logs for errors
2. Verify model can handle test inputs
3. Check authentication

### "Real-time not working"
**Cause**: WebSocket connection failed
**Solution**: 
1. Refresh the page
2. Check browser console for errors
3. Verify network allows WebSockets

### "Report generation failed"
**Cause**: Missing required data
**Solution**: 
1. Ensure model has evaluations
2. Check system has risk assessment
3. Verify all required fields populated

### "Approval stuck in pending"
**Cause**: No approver assigned
**Solution**: 
1. Navigate to Approvals page
2. Click the pending item
3. Assign to a reviewer

### "Decision Ledger empty"
**Cause**: No decisions logged yet
**Solution**: 
1. Run evaluations (creates decision records)
2. Or use API to log decisions directly

## Getting Help

If issues persist:
1. Check browser console for errors
2. Review edge function logs
3. Contact support with error details

## Debug Mode

Enable debug logging:
1. Open browser console
2. Run: localStorage.setItem('debug', 'true')
3. Refresh page
4. Reproduce issue
5. Copy console output
    `,
  },
];

// Group sections by category
const categories = [
  "Getting Started",
  "Configure", 
  "Monitor",
  "Govern",
  "Evaluate",
  "Respond",
  "Impact",
  "Reference"
];

export default function Documentation() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSection, setActiveSection] = useState('welcome');

  const filteredSections = docSections.filter(s =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentSection = docSections.find(s => s.id === activeSection);

  // Group filtered sections by category
  const groupedSections = categories.reduce((acc, category) => {
    const sections = filteredSections.filter(s => s.category === category);
    if (sections.length > 0) {
      acc[category] = sections;
    }
    return acc;
  }, {} as Record<string, typeof docSections>);

  return (
    <MainLayout title="Documentation" subtitle="Complete cookbook for Fractal RAI-OS">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-200px)]">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search documentation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-secondary border-border"
            />
          </div>

          <ScrollArea className="h-[calc(100vh-300px)]">
            <nav className="space-y-4 pr-2">
              {Object.entries(groupedSections).map(([category, sections]) => (
                <div key={category}>
                  <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {category}
                  </div>
                  <div className="space-y-0.5">
                    {sections.map((section) => {
                      const Icon = section.icon;
                      return (
                        <button
                          key={section.id}
                          onClick={() => setActiveSection(section.id)}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all text-sm",
                            activeSection === section.id
                              ? "bg-primary/10 text-primary font-medium border border-primary/20"
                              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                          )}
                        >
                          <Icon className="w-4 h-4 shrink-0" />
                          <span className="truncate">{section.title}</span>
                          {activeSection === section.id && (
                            <ChevronRight className="w-4 h-4 ml-auto shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>
          </ScrollArea>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3">
          <div className="bg-card border border-border rounded-xl p-8 h-full overflow-hidden">
            <ScrollArea className="h-full pr-4">
              {currentSection && (
                <article className="prose prose-invert max-w-none">
                  <div 
                    className="documentation-content"
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

// Enhanced markdown formatter
function formatMarkdown(content: string): string {
  let html = content
    // Headers
    .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold text-foreground mb-6 mt-0 pb-3 border-b border-border">$1</h1>')
    .replace(/^## (.*$)/gm, '<h2 class="text-xl font-semibold text-foreground mb-4 mt-8">$1</h2>')
    .replace(/^### (.*$)/gm, '<h3 class="text-lg font-medium text-foreground mb-3 mt-6">$1</h3>')
    
    // Bold and inline code
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
    .replace(/`([^`]+)`/g, '<code class="bg-secondary px-1.5 py-0.5 rounded text-primary text-sm font-mono">$1</code>')
    
    // Code blocks
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="bg-secondary/50 border border-border p-4 rounded-lg overflow-x-auto my-4"><code class="text-sm font-mono text-foreground whitespace-pre">$2</code></pre>')
    
    // Horizontal rules
    .replace(/^---$/gm, '<hr class="my-8 border-border" />')
    
    // Lists
    .replace(/^- (.*$)/gm, '<li class="text-muted-foreground ml-4 mb-1 list-disc">$1</li>')
    .replace(/^(\d+)\. (.*$)/gm, '<li class="text-muted-foreground ml-4 mb-1 list-decimal">$2</li>')
    
    // Checkboxes
    .replace(/☑ (.*)/g, '<span class="inline-flex items-center gap-2"><span class="text-success">✓</span> $1</span>')
    .replace(/☐ (.*)/g, '<span class="inline-flex items-center gap-2"><span class="text-muted-foreground">○</span> $1</span>')
    
    // Paragraphs
    .replace(/\n\n/g, '</p><p class="text-muted-foreground mb-4 leading-relaxed">');

  // Tables - improved formatting
  html = html.replace(/\|(.+)\|/g, (match) => {
    const cells = match.split('|').filter(c => c.trim());
    if (cells.some(c => c.includes('---'))) return '';
    const isHeader = cells.every(c => !c.includes('✅') && !c.includes('❌') && !c.includes('📋') && !c.includes('🟢') && !c.includes('🟡') && !c.includes('🔴'));
    const tag = isHeader ? 'th' : 'td';
    const cellClass = isHeader 
      ? 'px-4 py-3 text-left font-semibold text-foreground bg-secondary/50 text-sm' 
      : 'px-4 py-3 text-muted-foreground border-t border-border text-sm';
    return `<tr>${cells.map(c => `<${tag} class="${cellClass}">${c.trim()}</${tag}>`).join('')}</tr>`;
  });

  // Wrap tables
  html = html.replace(/(<tr>.*?<\/tr>)/gs, (match, table) => {
    if (!match.includes('<table')) {
      return `<div class="overflow-x-auto my-4"><table class="w-full border-collapse border border-border rounded-lg overflow-hidden">${table}</table></div>`;
    }
    return match;
  });

  return html;
}
