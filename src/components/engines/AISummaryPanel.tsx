import { 
  Brain, 
  AlertCircle, 
  AlertTriangle, 
  CheckCircle2, 
  Lightbulb,
  Copy,
  Sparkles,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { useState } from 'react';

export interface AISummary {
  brief_summary: string;
  priority_categories: {
    high: { issues: string[]; count: number; action: string };
    medium: { issues: string[]; count: number; action: string };
    low: { issues: string[]; count: number; action: string };
  };
  recommendations: string[];
  data_quality_verdict: 'Ready for Production' | 'Needs Review' | 'Critical Issues Found';
  confidence_score: number;
  generated_at: string;
  model_used: string;
}

interface AISummaryPanelProps {
  summary: AISummary;
}

function PrioritySection({ 
  priority, 
  data, 
  icon: Icon,
  colorClass 
}: { 
  priority: string;
  data: { issues: string[]; count: number; action: string };
  icon: React.ElementType;
  colorClass: string;
}) {
  const [isOpen, setIsOpen] = useState(data.count > 0);

  if (data.count === 0) {
    return null;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className={`border rounded-lg ${colorClass}`}>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2">
              <Icon className="h-5 w-5" />
              <span className="font-medium">{priority} Priority</span>
              <Badge variant="secondary" className="ml-2">{data.count} issue{data.count !== 1 ? 's' : ''}</Badge>
            </div>
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-2">
            <ul className="space-y-1 text-sm">
              {data.issues.map((issue, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-muted-foreground">•</span>
                  <span>{issue}</span>
                </li>
              ))}
            </ul>
            {data.action && (
              <div className="flex items-start gap-2 mt-3 p-2 bg-muted/50 rounded text-sm">
                <Lightbulb className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                <span><strong>Action:</strong> {data.action}</span>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function VerdictBadge({ verdict }: { verdict: string }) {
  switch (verdict) {
    case 'Ready for Production':
      return (
        <Badge className="bg-success/10 text-success border-success/20 text-sm px-3 py-1">
          <CheckCircle2 className="h-4 w-4 mr-1" />
          Ready for Production
        </Badge>
      );
    case 'Needs Review':
      return (
        <Badge className="bg-warning/10 text-warning border-warning/20 text-sm px-3 py-1">
          <AlertCircle className="h-4 w-4 mr-1" />
          Needs Review
        </Badge>
      );
    case 'Critical Issues Found':
      return (
        <Badge variant="destructive" className="text-sm px-3 py-1">
          <AlertTriangle className="h-4 w-4 mr-1" />
          Critical Issues Found
        </Badge>
      );
    default:
      return <Badge variant="secondary">{verdict}</Badge>;
  }
}

export function AISummaryPanel({ summary }: AISummaryPanelProps) {
  const handleCopySummary = () => {
    const text = `
AI Quality Summary
==================
${summary.brief_summary}

Priority Issues:
- High: ${summary.priority_categories.high.count} issues
- Medium: ${summary.priority_categories.medium.count} issues  
- Low: ${summary.priority_categories.low.count} issues

Recommendations:
${summary.recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}

Verdict: ${summary.data_quality_verdict}
Confidence: ${summary.confidence_score}%
Model: ${summary.model_used}
    `.trim();

    navigator.clipboard.writeText(text);
    toast.success('Summary copied to clipboard');
  };

  const totalIssues = 
    summary.priority_categories.high.count + 
    summary.priority_categories.medium.count + 
    summary.priority_categories.low.count;

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            AI Quality Summary
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              <Sparkles className="h-3 w-3 mr-1" />
              {summary.model_used}
            </Badge>
            <Button variant="ghost" size="sm" onClick={handleCopySummary}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Brief Summary */}
        <div className="p-4 bg-muted/50 rounded-lg border">
          <p className="text-sm leading-relaxed italic">"{summary.brief_summary}"</p>
        </div>

        {/* Priority Categories */}
        {totalIssues > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground">Priority Categories</h4>
            
            <PrioritySection
              priority="🔴 HIGH"
              data={summary.priority_categories.high}
              icon={AlertTriangle}
              colorClass="border-danger/30 bg-danger/5"
            />
            
            <PrioritySection
              priority="🟡 MEDIUM"
              data={summary.priority_categories.medium}
              icon={AlertCircle}
              colorClass="border-warning/30 bg-warning/5"
            />
            
            <PrioritySection
              priority="🟢 LOW"
              data={summary.priority_categories.low}
              icon={CheckCircle2}
              colorClass="border-success/30 bg-success/5"
            />
          </div>
        )}

        {totalIssues === 0 && (
          <div className="text-center py-4 text-muted-foreground">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-success" />
            <p>No issues detected - data quality is excellent!</p>
          </div>
        )}

        {/* Recommendations */}
        {summary.recommendations.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground">📋 Recommendations</h4>
            <div className="space-y-2">
              {summary.recommendations.map((rec, idx) => (
                <div 
                  key={idx} 
                  className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg text-sm"
                >
                  <div className="flex items-center justify-center h-5 w-5 rounded-full bg-primary/10 text-primary text-xs font-medium shrink-0">
                    {idx + 1}
                  </div>
                  <span>{rec}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Verdict & Confidence */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Verdict</p>
              <VerdictBadge verdict={summary.data_quality_verdict} />
            </div>
          </div>
          
          <div className="text-right">
            <p className="text-xs text-muted-foreground mb-1">AI Confidence</p>
            <div className="flex items-center gap-2">
              <Progress value={summary.confidence_score} className="w-24 h-2" />
              <span className="text-sm font-medium">{summary.confidence_score}%</span>
            </div>
          </div>
        </div>

        {/* Timestamp */}
        <p className="text-xs text-muted-foreground text-center">
          Generated at {new Date(summary.generated_at).toLocaleString()}
        </p>
      </CardContent>
    </Card>
  );
}
