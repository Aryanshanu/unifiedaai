import { Key, Info, CheckCircle2, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface ColumnProfile {
  column_name: string;
  dtype: string;
  null_count: number;
  distinct_count: number;
  uniqueness: number;
}

interface PrimaryKeyExplanationProps {
  columnProfiles: ColumnProfile[];
  rowCount: number;
  showCompact?: boolean;
}

interface PrimaryKeyCandidate {
  column: ColumnProfile;
  score: number;
  reasons: string[];
  isStrong: boolean;
}

/**
 * Transparent Primary Key Detection Explanation Component
 * 
 * DETECTION FORMULA:
 * A column is considered a primary key candidate if:
 * 1. Uniqueness ≥ 99% (distinct_count / row_count ≥ 0.99)
 * 2. Null count = 0 (no missing values allowed)
 * 
 * SCORING:
 * - Base score = uniqueness percentage
 * - Bonus: +5 if column name contains 'id', 'key', 'pk'
 * - Penalty: -10 if data type is not ideal (float vs integer)
 */
export function PrimaryKeyExplanation({ 
  columnProfiles, 
  rowCount,
  showCompact = false 
}: PrimaryKeyExplanationProps) {
  // Apply detection formula
  const candidates: PrimaryKeyCandidate[] = columnProfiles
    .map(col => {
      const reasons: string[] = [];
      let score = col.uniqueness;
      
      // Check uniqueness requirement
      const uniquenessPass = col.uniqueness >= 99;
      if (uniquenessPass) {
        reasons.push(`✓ Uniqueness: ${col.uniqueness.toFixed(2)}% (≥99% required)`);
      } else {
        reasons.push(`✗ Uniqueness: ${col.uniqueness.toFixed(2)}% (below 99% threshold)`);
      }
      
      // Check null requirement
      const nullPass = col.null_count === 0;
      if (nullPass) {
        reasons.push(`✓ Null count: 0 (no nulls allowed)`);
      } else {
        reasons.push(`✗ Null count: ${col.null_count.toLocaleString()} (nulls not allowed)`);
        score -= 20; // Penalty for nulls
      }
      
      // Bonus for naming convention
      const nameHint = /id|key|pk|_id$/i.test(col.column_name);
      if (nameHint) {
        reasons.push(`+ Name pattern matches common PK convention`);
        score += 5;
      }
      
      // Data type consideration
      const idealType = ['integer', 'uuid', 'string', 'text'].includes(col.dtype?.toLowerCase());
      if (!idealType && col.dtype) {
        reasons.push(`⚠ Type '${col.dtype}' is less ideal for primary keys`);
        score -= 5;
      } else if (col.dtype) {
        reasons.push(`✓ Type '${col.dtype}' is suitable for primary keys`);
      }
      
      // Cardinality info
      reasons.push(`${col.distinct_count.toLocaleString()} distinct values across ${rowCount.toLocaleString()} rows`);
      
      return {
        column: col,
        score: Math.min(100, Math.max(0, score)),
        reasons,
        isStrong: uniquenessPass && nullPass
      };
    })
    .filter(c => c.isStrong || c.score >= 85)
    .sort((a, b) => b.score - a.score);

  const strongCandidates = candidates.filter(c => c.isStrong);
  const weakCandidates = candidates.filter(c => !c.isStrong);

  if (showCompact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="inline-flex items-center gap-1.5 cursor-help">
              <Key className="h-3.5 w-3.5 text-primary" />
              <span className="text-sm font-medium">
                {strongCandidates.length} PK candidate{strongCandidates.length !== 1 ? 's' : ''}
              </span>
              <Info className="h-3 w-3 text-muted-foreground" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-sm">
            <div className="space-y-2">
              <p className="font-semibold text-xs">Primary Key Detection Formula:</p>
              <ul className="text-xs space-y-1">
                <li>• Uniqueness ≥ 99%</li>
                <li>• Null count = 0</li>
              </ul>
              {strongCandidates.length > 0 && (
                <div className="pt-2 border-t">
                  <p className="font-medium text-xs">Detected:</p>
                  {strongCandidates.map(c => (
                    <p key={c.column.column_name} className="text-xs font-mono">
                      {c.column.column_name}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="space-y-4">
      {/* Detection Formula Explanation */}
      <div className="p-3 bg-muted/50 rounded-lg border border-muted">
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="text-sm font-semibold">Primary Key Detection Formula</p>
            <p className="text-xs text-muted-foreground">
              A column qualifies as a primary key candidate when:
            </p>
            <ul className="text-xs text-muted-foreground space-y-0.5 ml-2">
              <li>• <strong>Uniqueness ≥ 99%</strong> — Nearly all values are distinct</li>
              <li>• <strong>Null count = 0</strong> — No missing values (mandatory for keys)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Strong Candidates */}
      {strongCandidates.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm font-medium flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-success" />
            Detected Primary Key Candidates ({strongCandidates.length})
          </p>
          <div className="space-y-2">
            {strongCandidates.map(candidate => (
              <div 
                key={candidate.column.column_name}
                className="p-3 border rounded-lg bg-success/5 border-success/20"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Key className="h-4 w-4 text-success" />
                    <span className="font-mono font-semibold">{candidate.column.column_name}</span>
                  </div>
                  <Badge className="bg-success/10 text-success border-success/30">
                    {candidate.score.toFixed(0)}% confidence
                  </Badge>
                </div>
                <ul className="text-xs text-muted-foreground space-y-0.5">
                  {candidate.reasons.map((reason, idx) => (
                    <li key={idx}>{reason}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-3 border rounded-lg border-dashed">
          <div className="flex items-center gap-2 text-muted-foreground">
            <XCircle className="h-4 w-4" />
            <span className="text-sm">No columns meet primary key criteria</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1 ml-6">
            All columns either have nulls or uniqueness below 99%
          </p>
        </div>
      )}

      {/* Weak Candidates (for transparency) */}
      {weakCandidates.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            Near-Candidates ({weakCandidates.length})
          </p>
          <div className="space-y-2">
            {weakCandidates.slice(0, 3).map(candidate => (
              <div 
                key={candidate.column.column_name}
                className="p-2 border rounded-lg border-dashed opacity-70"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm">{candidate.column.column_name}</span>
                  <Badge variant="outline" className="text-xs">
                    {candidate.score.toFixed(0)}% score
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {candidate.reasons.slice(0, 2).join(' | ')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
