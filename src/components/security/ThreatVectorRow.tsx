import { TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  AlertTriangle, 
  CheckCircle, 
  ChevronDown, 
  ChevronUp,
  Play,
  Loader2
} from 'lucide-react';
import { useState } from 'react';
import { ThreatVector } from '@/hooks/useThreatModels';
import { toast } from 'sonner';
import { ConfidenceIndicator, SeverityBadge, DecisionTracePanel } from '@/components/security/ScoreTooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface ThreatVectorRowProps {
  vector: ThreatVector;
  onAccept?: (id: string, accepted: boolean) => void;
  onValidate?: (id: string) => void;
  isValidating?: boolean;
}

// Map confidence level to numeric value for ConfidenceIndicator
const confidenceToNumber = (level: 'high' | 'medium' | 'low'): number => {
  switch (level) {
    case 'high': return 0.85;
    case 'medium': return 0.55;
    case 'low': return 0.25;
    default: return 0.5;
  }
};

// Map risk score (1-25) to severity score (0-1)
const riskToSeverity = (riskScore: number): number => {
  return Math.min(1, Math.max(0, (riskScore - 1) / 24));
};

export function ThreatVectorRow({ vector, onAccept, onValidate, isValidating }: ThreatVectorRowProps) {
  const [expanded, setExpanded] = useState(false);
  const riskScore = (vector.likelihood || 1) * (vector.impact || 1);
  const confidenceValue = confidenceToNumber(vector.confidence_level);
  const severityValue = riskToSeverity(riskScore);

  const getRiskColor = (score: number) => {
    if (score >= 20) return 'text-destructive';
    if (score >= 12) return 'text-orange-500';
    if (score >= 6) return 'text-yellow-500';
    return 'text-green-600';
  };

  // Build decision trace for explainability
  const decisionTrace = {
    signals: [
      { signal: 'Likelihood Score', triggered: true, details: `${vector.likelihood || 1}/5` },
      { signal: 'Impact Score', triggered: true, details: `${vector.impact || 1}/5` },
      { signal: 'Risk Calculation', triggered: true, details: `${vector.likelihood || 1} × ${vector.impact || 1} = ${riskScore}` },
    ],
    rulesFired: [
      ...(vector.atlas_tactic ? [`ATLAS Tactic: ${vector.atlas_tactic}`] : []),
      ...(vector.owasp_category ? [`OWASP: ${vector.owasp_category}`] : []),
      ...(vector.maestro_layer ? [`MAESTRO Layer: ${vector.maestro_layer}`] : []),
    ],
    rawResponse: vector.description || 'No detailed description available',
    confidenceBreakdown: {
      parseSuccess: true,
      signalConsistency: vector.confidence_level === 'high' ? 0.3 : vector.confidence_level === 'medium' ? 0.2 : 0.1,
      explanationQuality: vector.description ? 0.2 : 0.1,
      noErrors: 0.1,
    },
  };

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <TableRow className="cursor-pointer hover:bg-muted/50">
        <TableCell onClick={() => setExpanded(!expanded)}>
          <div className="flex items-center gap-2">
            {vector.is_accepted ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            )}
            <span className="font-medium">{vector.title}</span>
          </div>
        </TableCell>
        <TableCell onClick={() => setExpanded(!expanded)}>
          <div className="flex items-center gap-1 flex-wrap">
            {vector.atlas_tactic && (
              <Badge variant="outline" className="text-xs">ATLAS: {vector.atlas_tactic}</Badge>
            )}
            {vector.owasp_category && (
              <Badge variant="secondary" className="text-xs">{vector.owasp_category}</Badge>
            )}
            {vector.maestro_layer && (
              <Badge variant="outline" className="text-xs">MAESTRO: {vector.maestro_layer}</Badge>
            )}
          </div>
        </TableCell>
        <TableCell className="text-center" onClick={() => setExpanded(!expanded)}>
          <span className="font-medium">{vector.likelihood || '-'}</span>
        </TableCell>
        <TableCell className="text-center" onClick={() => setExpanded(!expanded)}>
          <span className="font-medium">{vector.impact || '-'}</span>
        </TableCell>
        <TableCell className="text-center" onClick={() => setExpanded(!expanded)}>
          <div className="flex items-center justify-center gap-2">
            <span className={`font-bold ${getRiskColor(riskScore)}`}>
              {riskScore}
            </span>
            <SeverityBadge score={severityValue} />
          </div>
        </TableCell>
        <TableCell onClick={() => setExpanded(!expanded)}>
          <ConfidenceIndicator confidence={confidenceValue} showLabel />
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1">
            {onValidate && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onValidate(vector.id);
                }}
                disabled={isValidating}
                title="Validate against target system"
              >
                {isValidating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>
            )}
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
          </div>
        </TableCell>
      </TableRow>
      
      <CollapsibleContent asChild>
        <TableRow>
          <TableCell colSpan={7} className="bg-muted/30 p-0">
            <div className="p-4 space-y-4">
              {/* Decision Trace Panel */}
              <DecisionTracePanel
                signals={decisionTrace.signals}
                rulesFired={decisionTrace.rulesFired}
                rawResponse={decisionTrace.rawResponse}
                confidenceBreakdown={decisionTrace.confidenceBreakdown}
              />
              
              {/* Mitigation Checklist */}
              {Array.isArray(vector.mitigation_checklist) && vector.mitigation_checklist.length > 0 && (
                <div className="border-t pt-4">
                  <h5 className="text-xs font-medium text-muted-foreground mb-2">Mitigation Checklist</h5>
                  <div className="space-y-2">
                    {vector.mitigation_checklist.map((item, idx) => {
                      const isCompleted = typeof item === 'object' ? item.completed : false;
                      const taskText = typeof item === 'object' ? item.task : item;
                      return (
                        <div key={idx} className="flex items-center gap-2">
                          <Checkbox 
                            checked={isCompleted} 
                            onCheckedChange={() => {
                              toast.info('Mitigation tracking: Feature coming soon');
                            }}
                          />
                          <span className={`text-sm ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                            {taskText}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Accept Risk Toggle */}
              {onAccept && (
                <div className="flex items-center gap-4 pt-2 border-t">
                  <Checkbox
                    id={`accept-${vector.id}`}
                    checked={vector.is_accepted}
                    onCheckedChange={(checked) => onAccept(vector.id, !!checked)}
                  />
                  <label htmlFor={`accept-${vector.id}`} className="text-sm">
                    Accept this risk (documented exception)
                  </label>
                </div>
              )}
            </div>
          </TableCell>
        </TableRow>
      </CollapsibleContent>
    </Collapsible>
  );
}
