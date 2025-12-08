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
  CheckCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

const docSections = [
  {
    id: 'overview',
    title: 'Platform Overview',
    icon: BookOpen,
    content: `
# Fractal RAI OS - Responsible AI Operating System

## What is Fractal RAI OS?

Fractal RAI OS is an enterprise-grade Responsible AI platform that provides comprehensive governance, evaluation, and monitoring capabilities for AI/ML models. It enables organizations to deploy AI systems safely, fairly, and in compliance with regulatory requirements.

## Core Capabilities

1. **Model Registry & Governance** - Centralized catalog of all AI models with full lifecycle management
2. **RAI Evaluation Engines** - Automated assessment of fairness, safety, privacy, robustness, and explainability
3. **Real-Time Observability** - Live monitoring, drift detection, and alerting
4. **Human-in-the-Loop** - Structured review workflows for high-risk decisions
5. **Knowledge Graph** - Full lineage tracking from data to deployment
6. **Policy Enforcement** - Runtime guardrails and red team orchestration

## Getting Started

1. Create a **Project** to organize your AI initiatives
2. Register **Models** (directly or via Hugging Face import)
3. Run **Evaluations** using the Core RAI Engines
4. Set up **Approvals** for production deployment
5. Monitor in **Observability** dashboard
    `,
  },
  {
    id: 'projects',
    title: 'Projects',
    icon: FolderOpen,
    content: `
# Projects

## What is a Project?

A Project is the top-level organizational unit in Fractal RAI. It represents a business initiative, application, or use case that involves one or more AI models.

## Project Properties

- **Name** - Descriptive name for the project
- **Description** - Detailed description of the project's purpose
- **Environment** - Development, Staging, or Production
- **Data Sensitivity** - Low, Medium, High, or Critical
- **Business Sensitivity** - Low, Medium, High, or Critical
- **Criticality** - 1-10 scale indicating business importance
- **Compliance Frameworks** - NIST AI RMF, EU AI Act, ISO/IEC, etc.
- **Data Residency** - Geographic location requirements
- **Primary Owner Email** - Main point of contact

## Creating a Project

1. Navigate to **Projects** in the sidebar
2. Click **Create Project**
3. Fill in required fields
4. Select applicable compliance frameworks
5. Click **Create**

## Project Hierarchy

\`\`\`
Project
├── System (AI deployment unit)
│   ├── Model (AI model metadata)
│   ├── Risk Assessment
│   ├── Impact Assessment
│   └── Approvals
└── Models (multiple per project)
\`\`\`
    `,
  },
  {
    id: 'models',
    title: 'Model Registry',
    icon: Database,
    content: `
# Model Registry

## What is a Model?

A Model in Fractal RAI represents an AI/ML model registered for governance. Models are linked to Systems which handle deployment and runtime governance.

## Model Types

- **LLM** - Large Language Models (GPT, Claude, Llama, etc.)
- **Classification** - Binary/multi-class classifiers
- **Regression** - Numerical prediction models
- **NER** - Named Entity Recognition
- **Embedding** - Vector embedding models
- **Custom** - Other model types

## Registering a Model

### Via Hugging Face Import
1. Click **Add Model** → **Import from Hugging Face**
2. Enter the Hugging Face Model ID (e.g., \`meta-llama/Llama-2-7b-chat-hf\`)
3. Configure the Inference Endpoint URL
4. Add your API Token (securely stored)
5. Review and submit

### Manual Registration
1. Click **Add Model** → **Manual Registration**
2. Enter model name, type, and description
3. Configure API endpoint if applicable
4. Add metadata (version, license, etc.)

## Model Scores

After evaluation, models receive scores for:
- **Fairness** - Demographic parity, equalized odds
- **Toxicity** - Harmful content detection
- **Privacy** - PII detection, data leakage risk
- **Robustness** - Adversarial resistance
- **Explainability** - Reasoning quality
- **Overall** - Weighted composite score
    `,
  },
  {
    id: 'engines',
    title: 'Core RAI Engines',
    icon: Scale,
    content: `
# Core RAI Evaluation Engines

## Overview

Fractal RAI includes 5 independent evaluation engines, each focused on a specific dimension of responsible AI:

## 1. Fairness Engine

**Purpose**: Detect and measure bias across demographic groups

**Metrics**:
- Demographic Parity Ratio
- Equalized Odds
- Disparate Impact Score
- Calibration by Group

**Use When**: Evaluating models that make decisions affecting people (hiring, lending, etc.)

## 2. Hallucination Engine

**Purpose**: Detect factual inaccuracies and unsupported claims

**Metrics**:
- Factuality Score
- Groundedness
- Claim Verification Rate
- Citation Accuracy

**Use When**: Evaluating LLMs for factual accuracy

## 3. Toxicity Engine

**Purpose**: Detect harmful, offensive, or inappropriate content

**Metrics**:
- Toxicity Score
- Hate Speech Detection
- Harmful Content Percentage
- Jailbreak Resistance

**Use When**: Ensuring model outputs are safe for users

## 4. Privacy Engine

**Purpose**: Detect data leakage and privacy risks

**Metrics**:
- PII Detection Rate
- Data Leakage Score
- Membership Inference Risk
- Model Memorization

**Use When**: Protecting sensitive information

## 5. Explainability Engine

**Purpose**: Assess reasoning quality and decision transparency

**Metrics**:
- Reasoning Quality
- Explanation Completeness
- Confidence Calibration
- Decision Transparency

**Use When**: Ensuring model decisions are interpretable

## Running Evaluations

1. Navigate to the desired engine
2. Select a registered model
3. Click **Run Evaluation**
4. View detailed results with K2 chain-of-thought reasoning
5. Export scorecard for compliance documentation
    `,
  },
  {
    id: 'hitl',
    title: 'Human-in-the-Loop',
    icon: Users,
    content: `
# Human-in-the-Loop (HITL) Console

## What is HITL?

The HITL Console manages escalations, reviews, and approvals that require human judgment before AI systems can proceed.

## Review Types

1. **Safety Reviews** - Flagged for potential harmful outputs
2. **Fairness Reviews** - Bias concerns requiring human assessment
3. **Privacy Reviews** - Potential data leakage issues
4. **Deployment Approvals** - Pre-production sign-off
5. **Incident Reviews** - Post-incident analysis

## Review Workflow

\`\`\`
1. Issue Detected → Auto-escalated to Queue
2. Assigned to Reviewer (or self-assign)
3. Reviewer Analyzes Evidence
4. Decision: Approve / Reject / Escalate
5. Rationale Documented
6. Action Taken (deploy, block, remediate)
\`\`\`

## SLA Management

- **Critical**: 4-hour response
- **High**: 24-hour response
- **Medium**: 72-hour response
- **Low**: 1-week response

Overdue items are highlighted and can trigger notifications.

## Roles & Permissions

- **Reviewer**: Can review and decide on items
- **Admin**: Can assign items and configure rules
- **Analyst**: Can view queue but not decide
    `,
  },
  {
    id: 'observability',
    title: 'Real-Time Observability',
    icon: Activity,
    content: `
# Real-Time AI Observability

## Overview

The Observability dashboard provides live monitoring of all AI systems with drift detection, performance metrics, and safety alerts.

## Key Metrics

### Performance
- **Request Count** - Total API calls
- **Latency (P50, P95, P99)** - Response time percentiles
- **Error Rate** - Failed request percentage
- **Throughput** - Requests per second

### Safety
- **Block Rate** - Percentage blocked by guardrails
- **Warn Rate** - Percentage triggering warnings
- **Toxicity Detections** - Harmful content catches
- **PII Detections** - Privacy violation catches

### Drift
- **Feature Drift (PSI)** - Input distribution changes
- **Concept Drift** - Model performance degradation
- **Data Quality** - Missing/invalid input rates

## Alerts & Notifications

Configure alerts for:
- Drift thresholds exceeded
- Error rate spikes
- Latency degradation
- Safety metric breaches

Route to: Email, Slack, Teams, PagerDuty

## Traffic Generation (Testing)

Use the Traffic Generator to:
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

The Knowledge Graph provides complete traceability from data sources through models to production deployments. It enables impact analysis and compliance auditing.

## Entity Types

- **Dataset** - Training/evaluation data sources
- **Feature** - Engineered features from data
- **Model** - AI/ML models
- **Evaluation** - Evaluation run results
- **Control** - Compliance controls (NIST, EU AI Act)
- **Risk** - Risk assessments
- **Incident** - Safety/compliance incidents
- **Decision** - Human review decisions
- **Deployment** - Production deployments

## Relationship Types

- **feeds_into** - Data → Feature → Model
- **trains** - Feature → Model
- **evaluated_by** - Model → Evaluation
- **governed_by** - Model → Control
- **monitored_by** - System → Risk
- **triggers** - Incident → Model
- **approved_by** - System → Decision
- **deployed_to** - Model → Deployment

## Blast Radius Analysis

Click any node → "Blast Radius" to see:
- All downstream dependencies
- Affected deployments
- Impact on production systems

## Natural Language Queries

Ask questions like:
- "Why is this model non-compliant?"
- "What data sources feed into this model?"
- "Which deployments are affected by this incident?"
    `,
  },
  {
    id: 'governance',
    title: 'Governance & Approvals',
    icon: Shield,
    content: `
# Governance & Approvals

## Deployment Workflow

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
- **Compliance Framework** requires it

## Approval Process

1. System owner marks "Ready for Review"
2. System auto-transitions to "Pending Approval"
3. Approval record created in queue
4. Required approvers notified
5. Approvers review evidence package
6. Decision recorded with rationale
7. System transitions to Approved or Blocked

## Required Approvers

For High/Critical systems:
- **Product Owner** - Business sign-off
- **Compliance Lead** or **CISO** - Risk sign-off

## Runtime Enforcement

The AI Gateway enforces governance by:
- Blocking unapproved system requests
- Auto-suspending on repeated violations
- Logging all decisions for audit
    `,
  },
  {
    id: 'policy',
    title: 'Policy & Red Team',
    icon: FileText,
    content: `
# Policy Studio & Red Team

## Policy DSL

Define runtime policies using our domain-specific language:

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
      action: warn
      severity: medium
  exemptions:
    - model_id: "internal-test-model"
\`\`\`

## Red Team Campaigns

### Attack Types
- **Jailbreak Attempts** - Bypass safety instructions
- **PII Extraction** - Trick model into revealing data
- **Harmful Content** - Generate dangerous outputs
- **Hallucination Probes** - Induce factual errors
- **Bias Exploitation** - Trigger discriminatory outputs

### Running a Campaign
1. Go to **Policy Studio** → **Red Team**
2. Click **New Campaign**
3. Select target model
4. Choose attack types
5. Set number of probes
6. Run campaign
7. Review findings and coverage

### Campaign Results
- Attack success rate per category
- Specific prompts that bypassed guardrails
- Recommendations for hardening
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

## Managing Users

1. Go to **Settings** → **Users & Teams**
2. Click **Add User**
3. Enter email address
4. Select role
5. Send invitation

## Role-Based Access

| Feature | Admin | Reviewer | Analyst | Viewer |
|---------|-------|----------|---------|--------|
| Dashboard | ✅ | ✅ | ✅ | ✅ |
| Run Evaluations | ✅ | ❌ | ✅ | ❌ |
| HITL Decisions | ✅ | ✅ | ❌ | ❌ |
| Settings | ✅ | ❌ | ❌ | ❌ |
| User Management | ✅ | ❌ | ❌ | ❌ |
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
POST   /v1/gateway/invoke      - Proxy model request with guardrails
GET    /v1/gateway/logs        - Get request logs
\`\`\`

### Knowledge Graph
\`\`\`
GET    /v1/kg/lineage/:id      - Get entity lineage
POST   /v1/kg/query            - Query graph
POST   /v1/kg/explain          - Natural language query
\`\`\`

## Webhooks

Configure webhooks for:
- Evaluation completed
- Approval required
- Alert triggered
- Incident created
    `,
  },
  {
    id: 'glossary',
    title: 'Glossary',
    icon: BookOpen,
    content: `
# Glossary

## Key Terms

**Blast Radius** - The set of downstream entities affected by a change to an upstream entity (e.g., what deployments are impacted if a model is updated)

**Concept Drift** - When the statistical relationship between model inputs and outputs changes over time, causing performance degradation

**Data Leakage** - When training data information inadvertently influences model predictions in ways that won't generalize

**Demographic Parity** - A fairness metric requiring similar positive prediction rates across demographic groups

**Disparate Impact** - When a seemingly neutral practice disproportionately affects a protected group

**Feature Drift** - Changes in the statistical distribution of input features compared to training data

**Guardrail** - Runtime safety mechanisms that block or flag potentially harmful model outputs

**Jailbreak** - Adversarial prompts designed to bypass safety instructions in LLMs

**K2 Reasoning** - Chain-of-thought reasoning approach that explains how evaluation scores were calculated

**Knowledge Graph** - A network representation connecting entities (models, data, risks) through typed relationships

**Lineage** - The complete provenance chain from data sources through transformations to model outputs

**Membership Inference** - An attack that determines if a specific data point was used in model training

**PII (Personally Identifiable Information)** - Data that can identify an individual (names, emails, SSNs, etc.)

**RLS (Row Level Security)** - Database-level access control that restricts which rows users can access

**Scorecard** - A compliance document summarizing model evaluation results with evidence

**URI Score (Unified Risk Index)** - Composite risk score combining static and runtime risk factors
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
