import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ReviewItem, useCreateDecision } from "@/hooks/useReviewQueue";
import { toast } from "sonner";
import { CheckCircle, XCircle, ArrowUpCircle, Loader2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { SLACountdown } from "./SLACountdown";

interface ReviewDecisionDialogProps {
  review: ReviewItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReviewDecisionDialog({ review, open, onOpenChange }: ReviewDecisionDialogProps) {
  const [rationale, setRationale] = useState("");
  const [conditions, setConditions] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const createDecision = useCreateDecision();

  if (!review) return null;

  const handleDecision = async (decision: 'approve' | 'reject' | 'escalate') => {
    if (!rationale.trim()) {
      toast.error("Please provide a rationale for your decision");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Create decision record
      await createDecision.mutateAsync({
        review_id: review.id,
        decision,
        rationale,
        conditions: conditions || undefined,
      });
      
      // If there's a linked incident, resolve it on approval
      const linkedIncidentId = review.incident_id || (review.context as any)?.incident_id;
      if (decision === 'approve' && linkedIncidentId) {
        await supabase
          .from('incidents')
          .update({ 
            status: 'resolved',
            resolved_at: new Date().toISOString()
          })
          .eq('id', linkedIncidentId);
      }
      
      // Add KG edge for decision
      try {
        await supabase.functions.invoke('kg-upsert', {
          body: {
            nodes: [{
              entity_type: 'decision',
              entity_id: review.id,
              label: `${decision.toUpperCase()}: ${review.title}`,
              properties: { decision, rationale }
            }],
            edges: review.model_id ? [{
              source_entity: { type: 'decision', id: review.id },
              target_entity: { type: 'model', id: review.model_id },
              relationship_type: 'approved_by'
            }] : []
          }
        });
      } catch (kgError) {
        console.error('KG update failed:', kgError);
      }
      
      toast.success(`Review ${decision}ed successfully`, {
        description: decision === 'escalate' 
          ? "Escalated to senior reviewers"
          : `Decision recorded with rationale`
      });
      
      onOpenChange(false);
      setRationale("");
      setConditions("");
    } catch (error: any) {
      toast.error("Failed to record decision", {
        description: error.message
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const severityColors = {
    critical: "bg-danger/10 text-danger border-danger/30",
    high: "bg-warning/10 text-warning border-warning/30",
    medium: "bg-primary/10 text-primary border-primary/30",
    low: "bg-muted text-muted-foreground border-border",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            Review Decision
            <Badge className={cn("text-xs", severityColors[review.severity as keyof typeof severityColors])}>
              {review.severity}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Make a decision on this review item
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Review Summary */}
          <div className="bg-secondary/30 rounded-xl p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-foreground">{review.title}</p>
                <p className="text-sm text-muted-foreground mt-1">{review.description}</p>
              </div>
              {review.sla_deadline && (
                <SLACountdown deadline={review.sla_deadline} />
              )}
            </div>
            
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="capitalize">{review.review_type}</span>
              <span>•</span>
              <span>Created {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}</span>
              <span>•</span>
              <span className="font-mono">{review.id.slice(0, 8)}</span>
            </div>
          </div>

          {/* Rationale */}
          <div className="space-y-2">
            <Label htmlFor="rationale">Decision Rationale *</Label>
            <Textarea
              id="rationale"
              placeholder="Explain your decision..."
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              className="min-h-[100px]"
            />
          </div>

          {/* Conditions (optional) */}
          <div className="space-y-2">
            <Label htmlFor="conditions">Conditions (optional)</Label>
            <Input
              id="conditions"
              placeholder="e.g., Subject to quarterly review..."
              value={conditions}
              onChange={(e) => setConditions(e.target.value)}
            />
          </div>

          {/* Decision Buttons */}
          <div className="flex items-center gap-3 pt-4 border-t border-border">
            <Button
              variant="outline"
              className="flex-1 border-success text-success hover:bg-success/10"
              onClick={() => handleDecision('approve')}
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
              Approve
            </Button>
            
            <Button
              variant="outline"
              className="flex-1 border-danger text-danger hover:bg-danger/10"
              onClick={() => handleDecision('reject')}
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
              Reject
            </Button>
            
            <Button
              variant="outline"
              className="flex-1 border-warning text-warning hover:bg-warning/10"
              onClick={() => handleDecision('escalate')}
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ArrowUpCircle className="w-4 h-4 mr-2" />}
              Escalate
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
