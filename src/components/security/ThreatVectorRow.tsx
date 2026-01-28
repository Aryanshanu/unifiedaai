import { TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  AlertTriangle, 
  CheckCircle, 
  ChevronDown, 
  ChevronUp,
  Target
} from 'lucide-react';
import { useState } from 'react';
import { ThreatVector } from '@/hooks/useThreatModels';

interface ThreatVectorRowProps {
  vector: ThreatVector;
  onAccept?: (id: string, accepted: boolean) => void;
}

const confidenceConfig = {
  high: { color: 'bg-green-100 text-green-800', label: 'High' },
  medium: { color: 'bg-yellow-100 text-yellow-800', label: 'Medium' },
  low: { color: 'bg-red-100 text-red-800', label: 'Low' },
};

export function ThreatVectorRow({ vector, onAccept }: ThreatVectorRowProps) {
  const [expanded, setExpanded] = useState(false);
  const riskScore = (vector.likelihood || 1) * (vector.impact || 1);
  const confidence = confidenceConfig[vector.confidence_level];

  const getRiskColor = (score: number) => {
    if (score >= 20) return 'text-red-500';
    if (score >= 12) return 'text-orange-500';
    if (score >= 6) return 'text-yellow-500';
    return 'text-green-500';
  };

  return (
    <>
      <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => setExpanded(!expanded)}>
        <TableCell>
          <div className="flex items-center gap-2">
            {vector.is_accepted ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            )}
            <span className="font-medium">{vector.title}</span>
          </div>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1">
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
        <TableCell className="text-center">
          <span className="font-medium">{vector.likelihood || '-'}</span>
        </TableCell>
        <TableCell className="text-center">
          <span className="font-medium">{vector.impact || '-'}</span>
        </TableCell>
        <TableCell className="text-center">
          <span className={`font-bold ${getRiskColor(riskScore)}`}>
            {riskScore}
          </span>
        </TableCell>
        <TableCell>
          <Badge className={confidence.color}>{confidence.label}</Badge>
        </TableCell>
        <TableCell>
          <Button variant="ghost" size="sm">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </TableCell>
      </TableRow>
      
      {expanded && (
        <TableRow>
          <TableCell colSpan={7} className="bg-muted/30">
            <div className="p-4 space-y-4">
              {vector.description && (
                <div>
                  <h5 className="text-xs font-medium text-muted-foreground mb-1">Description</h5>
                  <p className="text-sm">{vector.description}</p>
                </div>
              )}
              
              {vector.mitigation_checklist && Array.isArray(vector.mitigation_checklist) && vector.mitigation_checklist.length > 0 && (
                <div>
                  <h5 className="text-xs font-medium text-muted-foreground mb-2">Mitigation Checklist</h5>
                  <div className="space-y-2">
                    {vector.mitigation_checklist.map((item: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Checkbox checked={item.completed} disabled />
                        <span className="text-sm">{item.task || item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
      )}
    </>
  );
}
