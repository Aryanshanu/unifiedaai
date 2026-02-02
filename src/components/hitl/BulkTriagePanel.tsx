import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle, XCircle, ArrowUpCircle, Loader2, Sparkles, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AutoAssistResult {
  review_id: string;
  summary: string;
  suggested_decision: 'approve' | 'reject' | 'escalate';
  confidence: number;
  risk_score: number;
  evidence_refs: string[];
  reasoning: string;
  sla_recommendation: string;
}

interface BulkTriagePanelProps {
  onComplete?: () => void;
  autoAnalyze?: boolean;
}

export function BulkTriagePanel({ onComplete, autoAnalyze = true }: BulkTriagePanelProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<AutoAssistResult[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterDecision, setFilterDecision] = useState<string>("all");
  const [bulkRationale, setBulkRationale] = useState("");
  const [hasAutoAnalyzed, setHasAutoAnalyzed] = useState(false);

  const analyzeQueue = async () => {
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("hitl-auto-assist", {
        body: { batch_mode: true, max_items: 100 },
      });

      if (error) throw error;

      setResults(data.results || []);
      if (data.results?.length > 0) {
        toast.success(`Analyzed ${data.results?.length || 0} items`);
      }
    } catch (error) {
      console.error("Analysis error:", error);
      toast.error("Failed to analyze queue");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Auto-analyze on mount if autoAnalyze is true
  useEffect(() => {
    if (autoAnalyze && !hasAutoAnalyzed) {
      setHasAutoAnalyzed(true);
      analyzeQueue();
    }
  }, [autoAnalyze, hasAutoAnalyzed]);

  const filteredResults = results.filter((r) => {
    if (filterDecision === "all") return true;
    return r.suggested_decision === filterDecision;
  });

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    if (selectedIds.size === filteredResults.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredResults.map((r) => r.review_id)));
    }
  };

  const selectByDecision = (decision: 'approve' | 'reject' | 'escalate') => {
    const ids = results
      .filter((r) => r.suggested_decision === decision)
      .map((r) => r.review_id);
    setSelectedIds(new Set(ids));
  };

  const applyBulkDecision = async (decision: 'approved' | 'rejected') => {
    if (selectedIds.size === 0) {
      toast.warning("No items selected");
      return;
    }

    setIsLoading(true);
    try {
      const now = new Date().toISOString();
      const updates = Array.from(selectedIds).map(async (reviewId) => {
        // Update review queue status
        await supabase
          .from("review_queue")
          .update({ status: decision, updated_at: now })
          .eq("id", reviewId);

        // Create decision record
        const result = results.find((r) => r.review_id === reviewId);
        await supabase.from("decisions").insert({
          review_id: reviewId,
          decision: decision === 'approved' ? 'approve' : 'reject',
          rationale: bulkRationale || result?.reasoning || 'Bulk triage decision',
          reviewer_id: (await supabase.auth.getUser()).data.user?.id,
        });
      });

      await Promise.all(updates);
      
      toast.success(`${selectedIds.size} items ${decision}`);
      setSelectedIds(new Set());
      setBulkRationale("");
      
      // Remove processed items from results
      setResults((prev) => prev.filter((r) => !selectedIds.has(r.review_id)));
      
      onComplete?.();
    } catch (error) {
      console.error("Bulk decision error:", error);
      toast.error("Failed to apply bulk decision");
    } finally {
      setIsLoading(false);
    }
  };

  const getDecisionIcon = (decision: string) => {
    switch (decision) {
      case 'approve':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'reject':
        return <XCircle className="w-4 h-4 text-risk-critical" />;
      case 'escalate':
        return <ArrowUpCircle className="w-4 h-4 text-risk-high" />;
      default:
        return null;
    }
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            AI-Assisted Bulk Triage
          </CardTitle>
          <Button onClick={analyzeQueue} disabled={isAnalyzing} size="sm">
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Analyze Queue
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {results.length > 0 && (
          <>
            {/* Filters and Selection */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedIds.size === filteredResults.length && filteredResults.length > 0}
                  onCheckedChange={() => selectAll()}
                />
                <span className="text-sm text-muted-foreground">
                  {selectedIds.size} of {filteredResults.length} selected
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <Select value={filterDecision} onValueChange={setFilterDecision}>
                  <SelectTrigger className="w-[140px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="approve">Approve</SelectItem>
                    <SelectItem value="reject">Reject</SelectItem>
                    <SelectItem value="escalate">Escalate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Quick Selection Buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => selectByDecision('approve')}
              >
                Select Approve ({results.filter((r) => r.suggested_decision === 'approve').length})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => selectByDecision('reject')}
              >
                Select Reject ({results.filter((r) => r.suggested_decision === 'reject').length})
              </Button>
            </div>

            {/* Results List */}
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {filteredResults.map((result) => (
                  <div
                    key={result.review_id}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border border-border transition-colors",
                      selectedIds.has(result.review_id) && "bg-primary/5 border-primary/30"
                    )}
                  >
                    <Checkbox
                      checked={selectedIds.has(result.review_id)}
                      onCheckedChange={() => toggleSelect(result.review_id)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {getDecisionIcon(result.suggested_decision)}
                        <span className="text-sm font-medium capitalize">
                          {result.suggested_decision}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {Math.round(result.confidence * 100)}% confidence
                        </Badge>
                        <Badge
                          variant={result.risk_score >= 70 ? "destructive" : result.risk_score >= 40 ? "secondary" : "outline"}
                          className="text-xs"
                        >
                          Risk: {result.risk_score}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {result.summary}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 italic">
                        {result.reasoning}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Bulk Actions */}
            {selectedIds.size > 0 && (
              <div className="space-y-3 pt-3 border-t border-border">
                <Textarea
                  placeholder="Common rationale for bulk decision (optional)"
                  value={bulkRationale}
                  onChange={(e) => setBulkRationale(e.target.value)}
                  className="h-20"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={() => applyBulkDecision('approved')}
                    disabled={isLoading}
                    className="flex-1"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4 mr-2" />
                    )}
                    Approve Selected ({selectedIds.size})
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => applyBulkDecision('rejected')}
                    disabled={isLoading}
                    className="flex-1"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <XCircle className="w-4 h-4 mr-2" />
                    )}
                    Reject Selected ({selectedIds.size})
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {results.length === 0 && !isAnalyzing && (
          <div className="text-center py-8 text-muted-foreground">
            <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p>Click "Analyze Queue" to get AI-assisted triage suggestions</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
