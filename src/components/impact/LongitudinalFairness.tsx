import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Legend,
  ReferenceLine 
} from "recharts";

interface GroupData {
  group: string;
  positiveRate: number;
  harmRate: number;
}

interface LongitudinalFairnessProps {
  groups: GroupData[];
  timeWindow: string;
}

export function LongitudinalFairness({ groups, timeWindow }: LongitudinalFairnessProps) {
  // Transform data for chart
  const chartData = groups.map(g => ({
    name: g.group.replace('_', ' '),
    positiveRate: Math.round(g.positiveRate * 100),
    harmRate: Math.round(g.harmRate * 100),
  }));

  // Calculate disparate impact
  const maxPositiveRate = Math.max(...groups.map(g => g.positiveRate), 0.01);
  const minPositiveRate = Math.min(...groups.map(g => g.positiveRate));
  const disparateImpactRatio = maxPositiveRate > 0 ? minPositiveRate / maxPositiveRate : 1;
  const isCompliant = disparateImpactRatio >= 0.8;

  // Determine trend (simulated - in production would compare to previous period)
  const trend = disparateImpactRatio > 0.85 ? 'improving' : disparateImpactRatio < 0.75 ? 'declining' : 'stable';

  const TrendIcon = trend === 'improving' ? TrendingUp : trend === 'declining' ? TrendingDown : Minus;
  const trendColor = trend === 'improving' ? 'text-success' : trend === 'declining' ? 'text-destructive' : 'text-muted-foreground';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Fairness by Group
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={isCompliant ? 'default' : 'destructive'}>
              {isCompliant ? 'Compliant' : 'Non-Compliant'}
            </Badge>
            <div className={`flex items-center gap-1 text-sm ${trendColor}`}>
              <TrendIcon className="h-4 w-4" />
              <span className="capitalize">{trend}</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {groups.length === 0 ? (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            No group data available
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip 
                  formatter={(value: number) => [`${value}%`, '']}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Legend />
                <ReferenceLine y={80} stroke="hsl(var(--warning))" strokeDasharray="3 3" label="80% Threshold" />
                <Bar 
                  dataKey="positiveRate" 
                  name="Positive Rate" 
                  fill="hsl(var(--primary))" 
                  radius={[4, 4, 0, 0]}
                />
                <Bar 
                  dataKey="harmRate" 
                  name="Harm Rate" 
                  fill="hsl(var(--destructive))" 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>

            <div className="mt-4 p-4 rounded-lg bg-muted/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Disparate Impact Ratio</p>
                  <p className="text-xs text-muted-foreground">
                    Minimum positive rate / Maximum positive rate
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-2xl font-bold ${isCompliant ? 'text-success' : 'text-destructive'}`}>
                    {(disparateImpactRatio * 100).toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isCompliant ? '≥ 80% threshold' : '< 80% threshold'}
                  </p>
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground mt-3 text-center">
              Data from the last {timeWindow === '7d' ? '7 days' : timeWindow === '30d' ? '30 days' : '90 days'}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
