import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useDemoSeeder, DemoSeedResult } from "@/hooks/useDemoSeeder";
import { 
  Play, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Database,
  FileText,
  Shield,
  Brain,
  AlertTriangle,
  Scale,
  BarChart3,
  GitBranch,
  Users,
  RefreshCw
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

interface VerificationItem {
  label: string;
  icon: React.ReactNode;
  expected: string;
  check: (result: DemoSeedResult | null) => boolean;
}

const verificationItems: VerificationItem[] = [
  {
    label: "Demo Project",
    icon: <Database className="h-4 w-4" />,
    expected: "Fractal Demo Sandbox created",
    check: (r) => !!r?.projectId
  },
  {
    label: "Dataset",
    icon: <FileText className="h-4 w-4" />,
    expected: "Loan_Applications_Demo with PII",
    check: (r) => !!r?.datasetId
  },
  {
    label: "Data Contract",
    icon: <Shield className="h-4 w-4" />,
    expected: "Quality thresholds defined",
    check: (r) => !!r?.contractId
  },
  {
    label: "AI System",
    icon: <Brain className="h-4 w-4" />,
    expected: "Loan Approval AI registered",
    check: (r) => !!r?.systemId
  },
  {
    label: "Model",
    icon: <GitBranch className="h-4 w-4" />,
    expected: "LoanApprovalModel_v1 active",
    check: (r) => !!r?.modelId
  },
  {
    label: "Decisions",
    icon: <Scale className="h-4 w-4" />,
    expected: "3+ decisions with hash chain",
    check: (r) => (r?.decisionIds?.length || 0) >= 3
  },
  {
    label: "Appeals",
    icon: <Users className="h-4 w-4" />,
    expected: "Pending appeal with SLA",
    check: (r) => !!r?.appealId
  },
  {
    label: "Outcomes",
    icon: <AlertTriangle className="h-4 w-4" />,
    expected: "Harmful outcome tracked",
    check: (r) => !!r?.outcomeId
  }
];

export default function DemoSeed() {
  const {
    isSeeding,
    isClearing,
    progress,
    seedResult,
    seedAllDemoData,
    clearDemoData,
    checkDemoDataExists,
    DEMO_PROJECT_NAME
  } = useDemoSeeder();

  const [demoExists, setDemoExists] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const check = async () => {
      setIsChecking(true);
      const exists = await checkDemoDataExists();
      setDemoExists(exists);
      setIsChecking(false);
    };
    check();
  }, [checkDemoDataExists, seedResult]);

  const handleSeed = async () => {
    await seedAllDemoData();
    setDemoExists(true);
  };

  const handleClear = async () => {
    await clearDemoData();
    setDemoExists(false);
  };

  const progressPercent = (progress.completed / progress.total) * 100;

  return (
    <MainLayout title="Demo Data Seeder" subtitle="Initialize end-to-end governance test data">
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Warning Banner */}
        <Alert className="border-amber-500/50 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <AlertTitle className="text-amber-600 dark:text-amber-400">Sandbox Environment</AlertTitle>
          <AlertDescription className="text-amber-700 dark:text-amber-300">
            This creates synthetic test data in a dedicated "{DEMO_PROJECT_NAME}" project. 
            All demo data includes intentional FAIL cases and imperfect metrics for realistic governance testing.
          </AlertDescription>
        </Alert>

        {/* Main Action Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              Demo Data Management
            </CardTitle>
            <CardDescription>
              Seed all 9 governance domains with realistic test data including PASS and FAIL cases
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Status */}
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">Current Status:</span>
              {isChecking ? (
                <Badge variant="outline" className="gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Checking...
                </Badge>
              ) : demoExists ? (
                <Badge className="gap-1 bg-emerald-500/20 text-emerald-600 border-emerald-500/30">
                  <CheckCircle2 className="h-3 w-3" />
                  Demo Data Exists
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1">
                  <XCircle className="h-3 w-3" />
                  No Demo Data
                </Badge>
              )}
            </div>

            {/* Progress */}
            {isSeeding && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{progress.step}</span>
                  <span className="text-muted-foreground">{progress.completed}/{progress.total}</span>
                </div>
                <Progress value={progressPercent} className="h-2" />
                <p className="text-xs text-muted-foreground">{progress.currentAction}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                onClick={handleSeed}
                disabled={isSeeding || isClearing}
                className="flex-1"
              >
                {isSeeding ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Seeding...
                  </>
                ) : demoExists ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Re-seed Demo Data
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Initialize Demo Sandbox
                  </>
                )}
              </Button>
              
              <Button
                variant="destructive"
                onClick={handleClear}
                disabled={isSeeding || isClearing || !demoExists}
              >
                {isClearing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Clearing...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear Demo Data
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Verification Checklist */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Governance Domains Verification
            </CardTitle>
            <CardDescription>
              After seeding, these governance domains should have test data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {verificationItems.map((item, index) => {
                const passed = item.check(seedResult);
                return (
                  <div
                    key={index}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      seedResult
                        ? passed
                          ? "border-emerald-500/30 bg-emerald-500/5"
                          : "border-destructive/30 bg-destructive/5"
                        : "border-border bg-muted/20"
                    }`}
                  >
                    <div className={`p-2 rounded-md ${
                      seedResult
                        ? passed
                          ? "bg-emerald-500/20 text-emerald-600"
                          : "bg-destructive/20 text-destructive"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{item.label}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.expected}</p>
                    </div>
                    {seedResult && (
                      passed ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                      )
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Expected Command Center Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Expected Command Center Metrics</CardTitle>
            <CardDescription>
              After seeding, the main dashboard should display these values
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: "Total Decisions", expected: "> 0", value: seedResult?.decisionIds?.length || 0 },
                { label: "Explanation Rate", expected: "< 100%", value: "33%" },
                { label: "Appeals Pending", expected: "> 0", value: seedResult?.appealId ? 1 : 0 },
                { label: "Harmful Outcomes", expected: "≥ 1", value: seedResult?.outcomeId ? 1 : 0 },
                { label: "Contract Violations", expected: "≥ 1", value: seedResult ? 2 : 0 },
                { label: "Blocked Deployments", expected: "≥ 1", value: seedResult ? 1 : 0 }
              ].map((metric, index) => (
                <div key={index} className="p-3 rounded-lg bg-muted/50 border">
                  <p className="text-xs text-muted-foreground">{metric.label}</p>
                  <p className="text-lg font-bold">{metric.value}</p>
                  <p className="text-xs text-primary">Expected: {metric.expected}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Info */}
        <div className="text-sm text-muted-foreground space-y-2">
          <p><strong>What gets created:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>1 Demo Project (Fractal Demo Sandbox)</li>
            <li>1 Dataset with synthetic loan application data</li>
            <li>1 Data Contract with quality thresholds</li>
            <li>2+ Contract Violations (completeness, balance)</li>
            <li>2 Quality Runs (1 PASS, 1 FAIL)</li>
            <li>1 AI System (Loan Approval AI)</li>
            <li>1 Model (LoanApprovalModel_v1)</li>
            <li>3 Decision Ledger entries with hash chain</li>
            <li>1 SHAP Explanation (33% explanation rate)</li>
            <li>1 Pending Appeal with 72h SLA</li>
            <li>1 Harmful Outcome (financial impact)</li>
            <li>2 Deployment Attestations (1 PASS, 1 BLOCKED)</li>
            <li>1 Pending System Approval</li>
          </ul>
        </div>
      </div>
    </MainLayout>
  );
}
