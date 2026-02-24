import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSemanticDefinitions, useSemanticQueryLog, useSemanticDriftAlerts } from '@/hooks/useSemanticDefinitions';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Activity, AlertTriangle, Database, Search, TrendingUp } from 'lucide-react';

const CONSUMER_COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--destructive))', 'hsl(var(--muted))'];

export function SemanticHealthDashboard() {
  const { data: definitions } = useSemanticDefinitions();
  const { data: queryLog } = useSemanticQueryLog();
  const { data: driftAlerts } = useSemanticDriftAlerts();

  const activeCount = definitions?.filter(d => d.status === 'active').length ?? 0;
  const draftCount = definitions?.filter(d => d.status === 'draft').length ?? 0;
  const deprecatedCount = definitions?.filter(d => d.status === 'deprecated').length ?? 0;
  const openAlerts = driftAlerts?.filter(a => a.status === 'open').length ?? 0;

  // Consumer breakdown
  const consumerBreakdown = (() => {
    if (!queryLog?.length) return [];
    const counts: Record<string, number> = {};
    queryLog.forEach(q => {
      counts[q.consumer_type] = (counts[q.consumer_type] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  })();

  // Top queried metrics
  const topMetrics = (() => {
    if (!queryLog?.length) return [];
    const counts: Record<string, number> = {};
    queryLog.forEach(q => {
      counts[q.metric_name] = (counts[q.metric_name] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, queries]) => ({ name, queries }));
  })();

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border">
          <CardContent className="pt-4 text-center">
            <Database className="w-5 h-5 mx-auto text-primary mb-1" />
            <p className="text-2xl font-bold text-foreground">{definitions?.length ?? 0}</p>
            <p className="text-xs text-muted-foreground">Total Definitions</p>
            <div className="flex justify-center gap-1 mt-2">
              <Badge variant="default" className="text-[10px]">{activeCount} active</Badge>
              <Badge variant="secondary" className="text-[10px]">{draftCount} draft</Badge>
              {deprecatedCount > 0 && <Badge variant="outline" className="text-[10px]">{deprecatedCount} deprecated</Badge>}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="pt-4 text-center">
            <Search className="w-5 h-5 mx-auto text-primary mb-1" />
            <p className="text-2xl font-bold text-foreground">{queryLog?.length ?? 0}</p>
            <p className="text-xs text-muted-foreground">Total Queries</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="pt-4 text-center">
            <TrendingUp className="w-5 h-5 mx-auto text-primary mb-1" />
            <p className="text-2xl font-bold text-foreground">{consumerBreakdown.length}</p>
            <p className="text-xs text-muted-foreground">Consumer Types</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="pt-4 text-center">
            <AlertTriangle className={`w-5 h-5 mx-auto mb-1 ${openAlerts > 0 ? 'text-destructive' : 'text-success'}`} />
            <p className="text-2xl font-bold text-foreground">{openAlerts}</p>
            <p className="text-xs text-muted-foreground">Open Drift Alerts</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Queried Metrics */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="w-4 h-4" /> Most Queried Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topMetrics.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">No queries logged yet. Use the Semantic Proxy to query metrics.</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={topMetrics} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="queries" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Consumer Breakdown */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Search className="w-4 h-4" /> Consumer Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            {consumerBreakdown.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">No consumer data yet.</p>
            ) : (
              <div className="flex items-center gap-6">
                <ResponsiveContainer width="50%" height={200}>
                  <PieChart>
                    <Pie data={consumerBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={false}>
                      {consumerBreakdown.map((_, i) => (
                        <Cell key={i} fill={CONSUMER_COLORS[i % CONSUMER_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {consumerBreakdown.map((item, i) => (
                    <div key={item.name} className="flex items-center gap-2 text-xs">
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: CONSUMER_COLORS[i % CONSUMER_COLORS.length] }} />
                      <span className="text-muted-foreground">{item.name}</span>
                      <span className="font-medium text-foreground">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
