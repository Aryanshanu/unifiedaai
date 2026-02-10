import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle, Shield } from 'lucide-react';

interface ThreatVectorCardProps {
  title: string;
  description: string;
  likelihood: number;
  impact: number;
  riskScore: number;
  category: string;
  framework?: string;
  mitigations: string[];
}

function getRiskColor(score: number): string {
  if (score > 0.6) return 'text-destructive';
  if (score > 0.3) return 'text-warning';
  return 'text-success';
}

function getLevelBadge(value: number, label: string) {
  const variant = value >= 4 ? 'destructive' : value >= 3 ? 'default' : 'secondary';
  return (
    <Badge variant={variant as any} className="text-xs">
      {label}: {value}/5
    </Badge>
  );
}

export function ThreatVectorCard({
  title,
  description,
  likelihood,
  impact,
  riskScore,
  category,
  framework,
  mitigations,
}: ThreatVectorCardProps) {
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className={`w-5 h-5 mt-0.5 shrink-0 ${getRiskColor(riskScore)}`} />
            <div>
              <CardTitle className="text-sm">{title}</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            </div>
          </div>
          <span className={`text-lg font-bold ${getRiskColor(riskScore)}`}>
            {(riskScore * 100).toFixed(0)}%
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {getLevelBadge(likelihood, 'Likelihood')}
          {getLevelBadge(impact, 'Impact')}
          <Badge variant="outline" className="text-xs">{category}</Badge>
          {framework && (
            <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20">
              <Shield className="w-3 h-3 mr-1" />
              {framework}
            </Badge>
          )}
        </div>
        
        {mitigations.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground">Mitigations</p>
            {mitigations.map((m, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <Checkbox id={`mit-${idx}`} className="mt-0.5" />
                <label htmlFor={`mit-${idx}`} className="text-xs text-muted-foreground cursor-pointer">
                  {m}
                </label>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
