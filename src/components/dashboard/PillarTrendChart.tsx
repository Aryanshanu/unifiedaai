import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from "recharts";
import { TrendingUp, Calendar } from "lucide-react";
import type { DashboardTrend } from "@/hooks/useRAIDashboard";
import { format, parseISO } from "date-fns";

interface PillarTrendChartProps {
  trends: DashboardTrend[];
  isLoading?: boolean;
}

const PILLAR_COLORS: Record<string, string> = {
  fairness: 'hsl(var(--primary))',
  toxicity: 'hsl(var(--danger))',
  privacy: 'hsl(var(--success))',
  hallucination: 'hsl(var(--warning))',
  explainability: 'hsl(var(--accent))',
  composite: 'hsl(var(--foreground))',
};

const PILLAR_LABELS: Record<string, string> = {
  fairness: 'Fairness',
  toxicity: 'Toxicity',
  privacy: 'Privacy',
  hallucination: 'Hallucination',
  explainability: 'Explainability',
  composite: 'Composite',
};

export function PillarTrendChart({ trends, isLoading = false }: PillarTrendChartProps) {
  const [visiblePillars, setVisiblePillars] = useState<Set<string>>(
    new Set(['fairness', 'toxicity', 'privacy', 'hallucination', 'explainability', 'composite'])
  );

  const togglePillar = (pillar: string) => {
    const newSet = new Set(visiblePillars);
    if (newSet.has(pillar)) {
      newSet.delete(pillar);
    } else {
      newSet.add(pillar);
    }
    setVisiblePillars(newSet);
  };

  // Format data for chart
  const chartData = trends.map(t => ({
    ...t,
    dateLabel: format(parseISO(t.date), 'MMM d'),
  }));

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Score Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-secondary/30 rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Score Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No trend data available yet</p>
              <p className="text-sm">Run evaluations to see trends over time</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Score Trends
          </CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          Track RAI scores over time
        </p>
      </CardHeader>
      <CardContent>
        {/* Pillar toggles */}
        <div className="flex flex-wrap gap-2 mb-4">
          {Object.keys(PILLAR_LABELS).map(pillar => (
            <Button
              key={pillar}
              variant={visiblePillars.has(pillar) ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => togglePillar(pillar)}
              style={{
                backgroundColor: visiblePillars.has(pillar) ? PILLAR_COLORS[pillar] : undefined,
                borderColor: PILLAR_COLORS[pillar],
                color: visiblePillars.has(pillar) ? 'white' : undefined,
              }}
            >
              {PILLAR_LABELS[pillar]}
            </Button>
          ))}
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ left: 0, right: 10, top: 10, bottom: 0 }}>
              <XAxis
                dataKey="dateLabel"
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickCount={5}
              />
              <ReferenceLine
                y={70}
                stroke="hsl(var(--danger))"
                strokeDasharray="5 5"
                label={{ value: '70%', position: 'right', fontSize: 10, fill: 'hsl(var(--danger))' }}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                      <p className="font-medium text-sm mb-2">{label}</p>
                      {payload.map((entry: any) => (
                        <p key={entry.dataKey} className="text-sm flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: entry.color }}
                          />
                          <span className="text-muted-foreground">
                            {PILLAR_LABELS[entry.dataKey]}:
                          </span>
                          <span className={entry.value >= 70 ? 'text-success' : 'text-danger'}>
                            {entry.value?.toFixed(0)}%
                          </span>
                        </p>
                      ))}
                    </div>
                  );
                }}
              />
              
              {Object.keys(PILLAR_COLORS).map(pillar => (
                visiblePillars.has(pillar) && (
                  <Line
                    key={pillar}
                    type="monotone"
                    dataKey={pillar}
                    stroke={PILLAR_COLORS[pillar]}
                    strokeWidth={pillar === 'composite' ? 3 : 2}
                    dot={{ r: 3, fill: PILLAR_COLORS[pillar] }}
                    activeDot={{ r: 5 }}
                    connectNulls
                  />
                )
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
