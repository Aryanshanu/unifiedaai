import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowUpDown, CheckCircle, XCircle, AlertTriangle, Minus, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import type { ModelRAIScores } from "@/hooks/useRAIDashboard";
import { getPillarScore } from "@/hooks/useRAIDashboard";
import { formatDistanceToNow, parseISO } from "date-fns";

interface ModelComparisonTableProps {
  models: ModelRAIScores[];
  isLoading?: boolean;
}

type SortField = 'name' | 'composite' | 'fairness' | 'toxicity' | 'privacy' | 'hallucination' | 'explainability';
type SortDirection = 'asc' | 'desc';

export function ModelComparisonTable({ models, isLoading = false }: ModelComparisonTableProps) {
  const [sortField, setSortField] = useState<SortField>('composite');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedModels = [...models].sort((a, b) => {
    let aVal: number | string = 0;
    let bVal: number | string = 0;

    if (sortField === 'name') {
      aVal = a.modelName.toLowerCase();
      bVal = b.modelName.toLowerCase();
      return sortDirection === 'asc'
        ? aVal.localeCompare(bVal as string)
        : (bVal as string).localeCompare(aVal);
    }

    if (sortField === 'composite') {
      aVal = a.compositeScore;
      bVal = b.compositeScore;
    } else {
      aVal = getPillarScore(a, sortField) ?? -1;
      bVal = getPillarScore(b, sortField) ?? -1;
    }

    return sortDirection === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
  });

  const renderScore = (score: number | null) => {
    if (score === null) {
      return <span className="text-muted-foreground flex items-center gap-1"><Minus className="w-3 h-3" /> N/A</span>;
    }
    
    const color = score >= 70 ? 'text-green-500' : score >= 50 ? 'text-yellow-500' : 'text-destructive';
    return <span className={`font-mono font-bold ${color}`}>{score}%</span>;
  };

  const renderComplianceStatus = (model: ModelRAIScores) => {
    const hasEvaluations = model.pillarScores.some(ps => ps.score !== null);
    
    if (!hasEvaluations) {
      return (
        <Badge variant="outline" className="text-muted-foreground">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Pending
        </Badge>
      );
    }
    
    if (model.isCompliant) {
      return (
        <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
          <CheckCircle className="w-3 h-3 mr-1" />
          Compliant
        </Badge>
      );
    }
    
    return (
      <Badge variant="destructive">
        <XCircle className="w-3 h-3 mr-1" />
        Non-Compliant
      </Badge>
    );
  };

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 px-2 hover:bg-secondary/50"
      onClick={() => handleSort(field)}
    >
      {children}
      <ArrowUpDown className="ml-1 h-3 w-3" />
    </Button>
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Model Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-secondary/30 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (models.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Model Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>No models registered yet</p>
            <Link to="/models">
              <Button variant="outline" className="mt-4">
                Register a Model
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  const pillars = ['fairness', 'toxicity', 'privacy', 'hallucination', 'explainability'] as const;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Model Comparison</CardTitle>
        <p className="text-sm text-muted-foreground">
          Compare all models across RAI pillars
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-48">
                  <SortButton field="name">Model</SortButton>
                </TableHead>
                <TableHead className="text-center">
                  <SortButton field="composite">Composite</SortButton>
                </TableHead>
                <TableHead className="text-center">
                  <SortButton field="fairness">Fairness</SortButton>
                </TableHead>
                <TableHead className="text-center">
                  <SortButton field="toxicity">Toxicity</SortButton>
                </TableHead>
                <TableHead className="text-center">
                  <SortButton field="privacy">Privacy</SortButton>
                </TableHead>
                <TableHead className="text-center">
                  <SortButton field="hallucination">Halluc.</SortButton>
                </TableHead>
                <TableHead className="text-center">
                  <SortButton field="explainability">Explain.</SortButton>
                </TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Last Eval</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedModels.map(model => (
                <TableRow key={model.modelId}>
                  <TableCell className="font-medium">
                    <Link
                      to={`/models/${model.modelId}`}
                      className="hover:text-primary flex items-center gap-1"
                    >
                      {model.modelName}
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="font-mono font-bold text-lg">
                      {model.compositeScore}%
                    </span>
                  </TableCell>
                  {pillars.map(pillar => (
                    <TableCell key={pillar} className="text-center">
                      {renderScore(getPillarScore(model, pillar))}
                    </TableCell>
                  ))}
                  <TableCell className="text-center">
                    {renderComplianceStatus(model)}
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {model.lastEvaluated
                      ? formatDistanceToNow(parseISO(model.lastEvaluated), { addSuffix: true })
                      : 'Never'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
