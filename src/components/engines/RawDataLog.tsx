import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, ChevronDown, ChevronUp, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface LogEntry {
  id: string;
  timestamp: string;
  type: "input" | "output" | "computation";
  data: any;
  metadata?: Record<string, any>;
}

interface RawDataLogProps {
  logs: LogEntry[];
}

export function RawDataLog({ logs }: RawDataLogProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(logs, null, 2));
    setCopied(true);
    toast.success("Logs copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "input":
        return "bg-blue-500/10 text-blue-600";
      case "output":
        return "bg-green-500/10 text-green-600";
      case "computation":
        return "bg-yellow-500/10 text-yellow-600";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="w-5 h-5 text-primary" />
            Raw Data Log
            <Badge variant="outline">{logs.length} entries</Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={copyToClipboard}
              className="gap-1"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="gap-1"
            >
              {expanded ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  Collapse
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  Expand
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className={expanded ? "h-96" : "h-48"}>
          <div className="space-y-2">
            {logs.map((log) => (
              <div
                key={log.id}
                className="p-3 bg-muted/50 rounded-lg border border-border"
              >
                <div className="flex items-center justify-between mb-2">
                  <Badge className={getTypeColor(log.type)}>{log.type}</Badge>
                  <span className="text-xs text-muted-foreground font-mono">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <pre className="text-xs font-mono overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(log.data, null, 2)}
                </pre>
                {log.metadata && (
                  <div className="mt-2 pt-2 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      {Object.entries(log.metadata).map(([k, v]) => `${k}: ${v}`).join(" | ")}
                    </p>
                  </div>
                )}
              </div>
            ))}
            {logs.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No logs available yet. Run an evaluation to see raw data.
              </p>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
