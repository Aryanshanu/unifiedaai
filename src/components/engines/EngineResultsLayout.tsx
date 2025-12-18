import { ReactNode, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  BarChart3, 
  Database, 
  Package,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Lightbulb
} from "lucide-react";
import { EngineSummaryCard } from "./EngineSummaryCard";
import { cn } from "@/lib/utils";

interface SummaryBullet {
  type: 'success' | 'warning' | 'error' | 'info';
  text: string;
}

interface EngineResultsLayoutProps {
  score: number;
  threshold?: number;
  engineName: string;
  keyInsight: string;
  summaryBullets: SummaryBullet[];
  recommendations?: string[];
  metricsContent: ReactNode;
  rawDataContent: ReactNode;
  evidenceContent: ReactNode;
  className?: string;
}

export function EngineResultsLayout({
  score,
  threshold = 70,
  engineName,
  keyInsight,
  summaryBullets,
  recommendations,
  metricsContent,
  rawDataContent,
  evidenceContent,
  className,
}: EngineResultsLayoutProps) {
  const [activeTab, setActiveTab] = useState("summary");

  const getBulletIcon = (type: SummaryBullet['type']) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-4 h-4 text-success shrink-0" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-warning shrink-0" />;
      case 'error': return <XCircle className="w-4 h-4 text-destructive shrink-0" />;
      default: return <Lightbulb className="w-4 h-4 text-primary shrink-0" />;
    }
  };

  const getBulletBg = (type: SummaryBullet['type']) => {
    switch (type) {
      case 'success': return 'bg-success/10';
      case 'warning': return 'bg-warning/10';
      case 'error': return 'bg-destructive/10';
      default: return 'bg-primary/10';
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Summary Card - Always Visible */}
      <EngineSummaryCard
        score={score}
        threshold={threshold}
        engineName={engineName}
        keyInsight={keyInsight}
      />

      {/* Tabbed Content */}
      <Card>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <CardHeader className="pb-0">
            <TabsList className="w-full justify-start bg-muted/50 p-1">
              <TabsTrigger value="summary" className="gap-2">
                <FileText className="w-4 h-4" />
                Summary
              </TabsTrigger>
              <TabsTrigger value="metrics" className="gap-2">
                <BarChart3 className="w-4 h-4" />
                Detailed Metrics
              </TabsTrigger>
              <TabsTrigger value="raw" className="gap-2">
                <Database className="w-4 h-4" />
                Raw Data
              </TabsTrigger>
              <TabsTrigger value="evidence" className="gap-2">
                <Package className="w-4 h-4" />
                Evidence
              </TabsTrigger>
            </TabsList>
          </CardHeader>

          <CardContent className="pt-6">
            {/* Summary Tab */}
            <TabsContent value="summary" className="mt-0 space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3">Key Findings</h4>
                {summaryBullets.length > 0 ? (
                  <div className="space-y-2">
                    {summaryBullets.map((bullet, idx) => (
                      <div 
                        key={idx} 
                        className={cn(
                          "flex items-start gap-3 p-3 rounded-lg",
                          getBulletBg(bullet.type)
                        )}
                      >
                        {getBulletIcon(bullet.type)}
                        <span className="text-sm text-foreground">{bullet.text}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground bg-muted/20 rounded-lg">
                    <p className="text-sm">See "Detailed Metrics" tab for evaluation breakdown</p>
                  </div>
                )}
              </div>

              {recommendations && recommendations.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-3">Recommendations</h4>
                  <div className="space-y-2">
                    {recommendations.map((rec, idx) => (
                      <div 
                        key={idx} 
                        className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20"
                      >
                        <Lightbulb className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <span className="text-sm text-foreground">{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  For detailed mathematical breakdown, see the "Detailed Metrics" tab.
                  Raw model outputs are available in the "Raw Data" tab.
                </p>
              </div>
            </TabsContent>

            {/* Metrics Tab */}
            <TabsContent value="metrics" className="mt-0">
              {metricsContent}
            </TabsContent>

            {/* Raw Data Tab */}
            <TabsContent value="raw" className="mt-0">
              {rawDataContent}
            </TabsContent>

            {/* Evidence Tab */}
            <TabsContent value="evidence" className="mt-0">
              {evidenceContent}
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}
