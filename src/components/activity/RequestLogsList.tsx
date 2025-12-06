import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, CheckCircle, XCircle, AlertTriangle, Clock } from "lucide-react";
import { format } from "date-fns";
import type { RequestLog } from "@/hooks/useRequestLogs";

interface RequestLogsListProps {
  logs: RequestLog[] | undefined;
  isLoading?: boolean;
}

export function RequestLogsList({ logs, isLoading }: RequestLogsListProps) {
  const getDecisionConfig = (decision: string | null) => {
    switch (decision) {
      case "BLOCK":
        return { 
          icon: XCircle, 
          color: "bg-red-500/10 text-red-500 border-red-500/20",
          label: "Blocked"
        };
      case "WARN":
        return { 
          icon: AlertTriangle, 
          color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
          label: "Warning"
        };
      default:
        return { 
          icon: CheckCircle, 
          color: "bg-green-500/10 text-green-500 border-green-500/20",
          label: "Allowed"
        };
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Recent Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Recent Requests
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <FileText className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-muted-foreground text-sm">No requests logged yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Recent Requests ({logs.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <div className="space-y-2">
            {logs.map((log) => {
              const config = getDecisionConfig(log.decision);
              const Icon = config.icon;

              return (
                <div 
                  key={log.id} 
                  className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <Icon className={`h-5 w-5 mt-0.5 ${config.color.split(" ")[1]}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className={config.color}>
                            {config.label}
                          </Badge>
                          {log.status_code && (
                            <Badge variant="outline" className="bg-muted">
                              {log.status_code}
                            </Badge>
                          )}
                          {log.latency_ms && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {log.latency_ms}ms
                            </span>
                          )}
                        </div>
                        {log.error_message && (
                          <p className="text-xs text-red-500 mt-1 truncate">
                            {log.error_message}
                          </p>
                        )}
                        {log.trace_id && (
                          <p className="text-xs text-muted-foreground mt-1 font-mono">
                            Trace: {log.trace_id.slice(0, 12)}...
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(log.created_at), "HH:mm:ss")}
                      <br />
                      {format(new Date(log.created_at), "MMM d")}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
