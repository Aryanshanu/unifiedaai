import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  AlertCircle, ArrowRight, Database, RefreshCw, 
  CheckCircle, TrendingUp, Shield, Clock
} from "lucide-react";

interface FeedbackEvent {
  id: string;
  type: "drift" | "violation" | "incident" | "quality";
  issue: string;
  stage_affected: string;
  action_taken: string;
  result: string;
  timestamp: string;
  improvement?: number;
}

interface FeedbackLoopDiagramProps {
  events?: FeedbackEvent[];
}

const sampleEvents: FeedbackEvent[] = [
  {
    id: "1",
    type: "drift",
    issue: "Distribution drift detected in age column",
    stage_affected: "Data Quality",
    action_taken: "Re-profiled dataset and updated rules",
    result: "Quality score improved 8%",
    timestamp: new Date().toISOString(),
    improvement: 8
  },
  {
    id: "2",
    type: "violation",
    issue: "Policy threshold exceeded for response latency",
    stage_affected: "RAI Controls",
    action_taken: "Auto-escalated to HITL review",
    result: "Model configuration adjusted",
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    improvement: 15
  },
  {
    id: "3",
    type: "quality",
    issue: "Completeness score dropped below 95%",
    stage_affected: "Data Ingestion",
    action_taken: "Source validation rules strengthened",
    result: "Completeness restored to 99%",
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    improvement: 4
  }
];

const typeConfig = {
  drift: { icon: TrendingUp, color: "text-warning", bg: "bg-warning/10" },
  violation: { icon: Shield, color: "text-destructive", bg: "bg-destructive/10" },
  incident: { icon: AlertCircle, color: "text-destructive", bg: "bg-destructive/10" },
  quality: { icon: Database, color: "text-primary", bg: "bg-primary/10" }
};

export function FeedbackLoopDiagram({ events = sampleEvents }: FeedbackLoopDiagramProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5 text-primary" />
          Feedback Loop Activity
        </CardTitle>
        <CardDescription>
          Issues detected, actions taken, and improvements achieved
        </CardDescription>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <div className="text-center py-8">
            <RefreshCw className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">No feedback events yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Events will appear as issues are detected and resolved
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((event) => {
              const config = typeConfig[event.type];
              const Icon = config.icon;
              
              return (
                <div key={event.id} className="relative">
                  {/* Timeline connector */}
                  <div className="absolute left-5 top-10 bottom-0 w-px bg-border" />
                  
                  <div className="flex gap-4">
                    {/* Icon */}
                    <div className={`p-2.5 rounded-full ${config.bg} shrink-0 z-10`}>
                      <Icon className={`h-5 w-5 ${config.color}`} />
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 pb-6">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-medium">{event.issue}</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                            <Clock className="h-3 w-3" />
                            {new Date(event.timestamp).toLocaleString()}
                          </p>
                        </div>
                        {event.improvement && (
                          <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                            +{event.improvement}% improvement
                          </Badge>
                        )}
                      </div>
                      
                      {/* Flow diagram */}
                      <div className="flex items-center gap-2 mt-4 p-3 rounded-lg bg-muted/30">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{event.stage_affected}</Badge>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 text-sm text-muted-foreground">
                          {event.action_taken}
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        <div className="flex items-center gap-1.5">
                          <CheckCircle className="h-4 w-4 text-success" />
                          <span className="text-sm font-medium">{event.result}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
