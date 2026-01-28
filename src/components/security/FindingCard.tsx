import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  AlertTriangle, 
  ShieldAlert, 
  ShieldCheck, 
  Info, 
  ChevronDown,
  ChevronUp,
  ExternalLink 
} from 'lucide-react';
import { useState } from 'react';
import { SecurityFinding } from '@/hooks/useSecurityFindings';

interface FindingCardProps {
  finding: SecurityFinding;
  onStatusChange?: (id: string, status: string) => void;
}

const severityConfig = {
  critical: { color: 'bg-red-500', icon: ShieldAlert, label: 'Critical' },
  high: { color: 'bg-orange-500', icon: AlertTriangle, label: 'High' },
  medium: { color: 'bg-yellow-500', icon: AlertTriangle, label: 'Medium' },
  low: { color: 'bg-blue-500', icon: Info, label: 'Low' },
  info: { color: 'bg-gray-500', icon: Info, label: 'Info' },
};

const statusConfig = {
  open: { color: 'bg-red-100 text-red-800', label: 'Open' },
  acknowledged: { color: 'bg-yellow-100 text-yellow-800', label: 'Acknowledged' },
  mitigated: { color: 'bg-green-100 text-green-800', label: 'Mitigated' },
  false_positive: { color: 'bg-gray-100 text-gray-800', label: 'False Positive' },
};

export function FindingCard({ finding, onStatusChange }: FindingCardProps) {
  const [expanded, setExpanded] = useState(false);
  const severity = severityConfig[finding.severity];
  const status = statusConfig[finding.status];
  const SeverityIcon = severity.icon;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${severity.color} text-white`}>
              <SeverityIcon className="h-4 w-4" />
            </div>
            <div className="space-y-1">
              <h4 className="font-medium text-sm leading-tight">{finding.title}</h4>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {finding.vulnerability_id}
                </Badge>
                {finding.owasp_category && (
                  <Badge variant="secondary" className="text-xs">
                    {finding.owasp_category}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={status.color}>{status.label}</Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {expanded && (
        <CardContent className="pt-0">
          <div className="space-y-4 border-t pt-4">
            {finding.description && (
              <div>
                <h5 className="text-xs font-medium text-muted-foreground mb-1">Description</h5>
                <p className="text-sm">{finding.description}</p>
              </div>
            )}
            
            <div className="grid grid-cols-3 gap-4">
              {finding.exploitability_score != null && (
                <div>
                  <h5 className="text-xs font-medium text-muted-foreground mb-1">Exploitability</h5>
                  <p className="text-sm font-medium">{finding.exploitability_score}/10</p>
                </div>
              )}
              {finding.business_impact_score != null && (
                <div>
                  <h5 className="text-xs font-medium text-muted-foreground mb-1">Business Impact</h5>
                  <p className="text-sm font-medium">{finding.business_impact_score}/10</p>
                </div>
              )}
              {finding.fractal_risk_index != null && (
                <div>
                  <h5 className="text-xs font-medium text-muted-foreground mb-1">Risk Index</h5>
                  <p className="text-sm font-medium">{(finding.fractal_risk_index * 100).toFixed(1)}%</p>
                </div>
              )}
            </div>

            {finding.mitigation && (
              <div>
                <h5 className="text-xs font-medium text-muted-foreground mb-1">Mitigation</h5>
                <p className="text-sm">{finding.mitigation}</p>
              </div>
            )}

            {onStatusChange && finding.status === 'open' && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onStatusChange(finding.id, 'acknowledged')}
                >
                  Acknowledge
                </Button>
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => onStatusChange(finding.id, 'mitigated')}
                >
                  <ShieldCheck className="h-4 w-4 mr-1" />
                  Mark Mitigated
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
