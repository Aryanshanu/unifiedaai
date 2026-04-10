import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ModelComparisonTable } from "@/components/dashboard/ModelComparisonTable";
import { useModelRAIScores, useDashboardTrends } from "@/hooks/useRAIDashboard";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { 
  BarChart3, 
  Layers, 
  ShieldCheck, 
  Zap, 
  Plus, 
  ArrowRight,
  TrendingUp,
  History,
  Play
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function Benchmarks() {
  const navigate = useNavigate();
  const { data: raiData, isLoading } = useModelRAIScores();
  const { data: trendsData, isLoading: isTrendsLoading } = useDashboardTrends(30);
  const [isRunningEval, setIsRunningEval] = useState(false);

  // Compute real average composite score from RAI data
  const avgCompositeScore = raiData && raiData.length > 0
    ? Math.round(raiData.reduce((sum, m) => sum + (m.compositeScore || 0), 0) / raiData.length * 10) / 10
    : null;

  const runRealEvaluation = async (modelId: string, pillar: string) => {
    setIsRunningEval(true);
    toast.info(`Starting real-time ${pillar} evaluation...`);
    
    // Map pillar names to actual edge function names
    const fnMap: Record<string, string> = {
      fairness: 'eval-fairness',
      hallucination: 'eval-hallucination-hf',
      toxicity: 'eval-toxicity-hf',
      privacy: 'eval-privacy-hf',
      explainability: 'eval-explainability-hf',
    };
    const fnName = fnMap[pillar] || `eval-${pillar}`;

    try {
      const { data, error } = await supabase.functions.invoke(fnName, {
        body: { modelId, includeRawLogs: true }
      });
      
      if (error) throw error;
      
      toast.success(`${pillar} evaluation completed successfully for model ${modelId}`);
    } catch (e: any) {
      toast.error(`Evaluation failed: ${e.message}`);
    } finally {
      setIsRunningEval(false);
    }
  };

  return (
    <MainLayout 
      title="Engine Catalogue & Benchmarks" 
      subtitle="Unitary performance comparative analysis and infrastructure validation."
    >
      <div className="space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
                  <Layers className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-100">{raiData?.length || 0}</p>
                  <p className="text-xs text-slate-500">Engines in Catalogue</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-success/10 border border-success/20">
                  <ShieldCheck className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-success">{raiData?.filter(m => m.isCompliant).length || 0}</p>
                  <p className="text-xs text-slate-500">Compliant Variants</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <TrendingUp className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-500">{avgCompositeScore !== null ? `${avgCompositeScore}%` : '—'}</p>
                  <p className="text-xs text-slate-500">Avg Composite Score</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800 border-dashed hover:border-primary/50 cursor-pointer transition-all" onClick={() => navigate('/engines')}>
            <CardContent className="pt-6 h-full flex items-center justify-center">
              <div className="flex flex-col items-center gap-1 group">
                <Plus className="h-5 w-5 text-slate-500 group-hover:text-primary transition-colors" />
                <p className="text-xs font-semibold text-slate-500 group-hover:text-primary transition-colors">Add New Engine</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="comparison" className="space-y-4">
          <TabsList className="bg-slate-950 border border-slate-800 p-1">
            <TabsTrigger value="comparison" className="data-[state=active]:bg-slate-900"><BarChart3 className="w-4 h-4 mr-2" /> Unitary Comparison</TabsTrigger>
            <TabsTrigger value="active" className="data-[state=active]:bg-slate-900"><Zap className="w-4 h-4 mr-2" /> Live Validation Trigger</TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-slate-900"><History className="w-4 h-4 mr-2" /> Validation History</TabsTrigger>
          </TabsList>

          <TabsContent value="comparison">
            <ModelComparisonTable models={raiData || []} isLoading={isLoading} />
          </TabsContent>

          <TabsContent value="active">
            <Card className="bg-slate-900 border-slate-800 overflow-hidden">
              <CardHeader className="bg-slate-950/50 border-b border-slate-800">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  Trigger Real-time Evaluation
                </CardTitle>
                <p className="text-xs text-muted-foreground">Select a registered engine and a governance pillar to start a live assessment.</p>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid gap-4">
                  {raiData?.map((model) => (
                    <div key={model.modelId} className="flex items-center justify-between p-4 rounded-xl bg-slate-950/40 border border-slate-800/50 group hover:border-primary/30 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-lg bg-slate-900 flex items-center justify-center font-bold text-primary border border-slate-800">
                          {model.modelName[0]}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-100">{model.modelName}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {['fairness', 'hallucination', 'toxicity', 'privacy'].map((pillar) => (
                          <Button 
                            key={pillar}
                            variant="outline" 
                            size="sm" 
                            className="h-8 text-[10px] uppercase border-slate-800 hover:bg-primary/10 hover:text-primary"
                            onClick={() => runRealEvaluation(model.modelId, pillar)}
                            disabled={isRunningEval}
                          >
                            <Play className="w-3 h-3 mr-1" /> {pillar}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ))}
                  {(!raiData || raiData.length === 0) && (
                    <div className="py-12 text-center text-muted-foreground opacity-50">
                      No engines available for benchmarking.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="bg-slate-950/50 border-b border-slate-800">
                <CardTitle className="text-base flex items-center gap-2">
                  <History className="h-4 w-4 text-primary" />
                  Validation Run History (30 Days)
                </CardTitle>
                <p className="text-xs text-muted-foreground">Historical engine validation performance across geographic and logical clusters.</p>
              </CardHeader>
              <CardContent className="pt-6">
                {isTrendsLoading ? (
                  <div className="h-80 flex items-center justify-center opacity-50">
                    <p className="text-sm">Loading telemetry...</p>
                  </div>
                ) : trendsData && trendsData.length > 0 ? (
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trendsData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis 
                          dataKey="date" 
                          stroke="#64748b" 
                          fontSize={12} 
                          tickFormatter={(val) => {
                            const date = new Date(val);
                            return `${date.getMonth() + 1}/${date.getDate()}`;
                          }}
                        />
                        <YAxis stroke="#64748b" fontSize={12} domain={[0, 100]} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                          itemStyle={{ fontSize: '12px' }}
                          labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                        />
                        <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                        <Line type="monotone" dataKey="composite" name="Overall Readiness" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                        <Line type="monotone" dataKey="fairness" name="Fairness" stroke="#22c55e" strokeDasharray="4 4" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="toxicity" name="Safety" stroke="#ef4444" strokeDasharray="4 4" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="privacy" name="Privacy" stroke="#eab308" strokeDasharray="4 4" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 flex flex-col items-center justify-center opacity-30">
                    <History className="h-12 w-12 mb-3" />
                    <p className="text-sm font-medium">No Historical Data Available</p>
                    <p className="text-xs mt-1">Run continuous validations to populate real-time trajectory metrics.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
