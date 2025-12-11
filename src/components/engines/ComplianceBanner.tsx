/**
 * ComplianceBanner - NON-COMPLIANT warning with regulatory references
 * Shows red banner when score < 70% per EU AI Act requirements
 */

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { XCircle, AlertTriangle, CheckCircle, ExternalLink, FileWarning } from "lucide-react";
import { cn } from "@/lib/utils";

interface ComplianceBannerProps {
  score: number;
  threshold?: number;
  engineName: string;
  regulatoryReferences?: string[];
  onEscalate?: () => void;
}

export function ComplianceBanner({
  score,
  threshold = 70,
  engineName,
  regulatoryReferences = [],
  onEscalate,
}: ComplianceBannerProps) {
  const isCompliant = score >= 80;
  const isPartial = score >= threshold && score < 80;
  const isNonCompliant = score < threshold;

  if (isCompliant) {
    return (
      <Alert className="bg-success/5 border-success/30">
        <CheckCircle className="h-5 w-5 text-success" />
        <AlertTitle className="text-success font-semibold">
          COMPLIANT — {engineName} Assessment Passed
        </AlertTitle>
        <AlertDescription className="text-muted-foreground">
          Score of {score.toFixed(0)}% meets EU AI Act Article 9 requirements for high-risk AI systems.
        </AlertDescription>
      </Alert>
    );
  }

  if (isPartial) {
    return (
      <Alert className="bg-warning/5 border-warning/30">
        <AlertTriangle className="h-5 w-5 text-warning" />
        <AlertTitle className="text-warning font-semibold">
          PARTIAL COMPLIANCE — Remediation Recommended
        </AlertTitle>
        <AlertDescription className="text-muted-foreground">
          <p className="mb-2">
            Score of {score.toFixed(0)}% is above minimum threshold but below optimal. 
            Consider improvements before production deployment.
          </p>
          {regulatoryReferences.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {regulatoryReferences.slice(0, 2).map((ref, i) => (
                <Badge key={i} variant="outline" className="text-xs text-warning border-warning/30">
                  {ref}
                </Badge>
              ))}
            </div>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  // NON-COMPLIANT - Critical warning
  return (
    <Alert className="bg-danger/10 border-danger/40 border-2">
      <FileWarning className="h-6 w-6 text-danger" />
      <AlertTitle className="text-danger font-bold text-lg flex items-center gap-2">
        <XCircle className="w-5 h-5" />
        NON-COMPLIANT — DEPLOYMENT BLOCKED
      </AlertTitle>
      <AlertDescription className="text-foreground">
        <div className="space-y-3 mt-2">
          <p className="font-medium">
            {engineName} score of <span className="text-danger font-bold">{score.toFixed(0)}%</span> is 
            below the required <span className="font-bold">{threshold}%</span> threshold.
          </p>
          
          <div className="p-3 bg-danger/5 rounded-lg border border-danger/20">
            <p className="text-sm font-semibold text-danger mb-2">Required Actions:</p>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• Immediate remediation before deployment</li>
              <li>• Human-in-the-loop review required</li>
              <li>• Document mitigation steps for audit trail</li>
            </ul>
          </div>

          {regulatoryReferences.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-muted-foreground">Regulatory References:</p>
              <div className="flex flex-wrap gap-1">
                {regulatoryReferences.map((ref, i) => (
                  <Badge 
                    key={i} 
                    variant="outline" 
                    className="text-xs text-danger border-danger/30 bg-danger/5"
                  >
                    {ref}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {onEscalate && (
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={onEscalate}
              className="mt-2 gap-2"
            >
              <AlertTriangle className="w-4 h-4" />
              Escalate to HITL Review
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}
