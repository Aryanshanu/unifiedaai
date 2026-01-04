import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts";
import { TrendingUp, TrendingDown, Minus, Info } from "lucide-react";
import type { ShapleyValue, FeatureImportance } from "@/lib/shap-formulas";

interface SHAPVisualizationProps {
  shapValues: ShapleyValue[];
  featureImportance: FeatureImportance[];
  baseValue?: number;
  prediction?: number;
  isLoading?: boolean;
}

export function SHAPVisualization({
  shapValues,
  featureImportance,
  baseValue = 50,
  prediction,
  isLoading = false,
}: SHAPVisualizationProps) {
  // Prepare bar chart data
  const barData = shapValues.slice(0, 10).map(sv => ({
    name: sv.feature.length > 15 ? sv.feature.slice(0, 15) + '...' : sv.feature,
    fullName: sv.feature,
    value: sv.contribution,
    direction: sv.direction,
  }));

  // Prepare importance chart data
  const importanceData = featureImportance.slice(0, 10).map(fi => ({
    name: fi.feature.length > 15 ? fi.feature.slice(0, 15) + '...' : fi.feature,
    fullName: fi.feature,
    importance: fi.percentageContribution,
    rank: fi.rank,
  }));

  // Waterfall data for cumulative view
  const waterfallData = (() => {
    let cumulative = baseValue;
    const data = [{ name: 'Base', value: baseValue, cumulative: baseValue, isBase: true }];
    
    for (const sv of shapValues.slice(0, 6)) {
      data.push({
        name: sv.feature.length > 12 ? sv.feature.slice(0, 12) + '...' : sv.feature,
        value: sv.contribution,
        cumulative: cumulative + sv.contribution,
        isBase: false,
      });
      cumulative += sv.contribution;
    }
    
    data.push({ name: 'Final', value: cumulative, cumulative, isBase: true });
    return data;
  })();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-primary/20 animate-pulse" />
            Loading SHAP Analysis...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-secondary/30 rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  if (shapValues.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-4 h-4 text-muted-foreground" />
            SHAP Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>Run an evaluation to generate SHAP feature importance values</p>
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
            SHAP Feature Importance
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            Shapley Additive Explanations
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Shows how each feature contributes to the model's prediction
        </p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="contribution" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="contribution">Contribution</TabsTrigger>
            <TabsTrigger value="importance">Importance</TabsTrigger>
            <TabsTrigger value="waterfall">Waterfall</TabsTrigger>
          </TabsList>

          <TabsContent value="contribution" className="mt-4">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <XAxis type="number" domain={['auto', 'auto']} />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const data = payload[0].payload;
                      return (
                        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                          <p className="font-medium text-sm">{data.fullName}</p>
                          <p className="text-sm text-muted-foreground">
                            Contribution: <span className={data.value > 0 ? 'text-success' : 'text-danger'}>
                              {data.value > 0 ? '+' : ''}{data.value.toFixed(2)}%
                            </span>
                          </p>
                        </div>
                      );
                    }}
                  />
                  <ReferenceLine x={0} stroke="hsl(var(--border))" />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {barData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.direction === 'positive' ? 'hsl(var(--success))' :
                              entry.direction === 'negative' ? 'hsl(var(--danger))' :
                              'hsl(var(--muted))'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="flex items-center justify-center gap-6 mt-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-success" />
                <span>Positive impact</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-danger" />
                <span>Negative impact</span>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="importance" className="mt-4">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={importanceData} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <XAxis type="number" unit="%" domain={[0, 'auto']} />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const data = payload[0].payload;
                      return (
                        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                          <p className="font-medium text-sm">{data.fullName}</p>
                          <p className="text-sm text-muted-foreground">
                            Importance: {data.importance.toFixed(1)}%
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Rank: #{data.rank}
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="importance" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="waterfall" className="mt-4">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={waterfallData} margin={{ left: 20, right: 20 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis domain={['auto', 'auto']} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const data = payload[0].payload;
                      return (
                        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                          <p className="font-medium text-sm">{data.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {data.isBase ? 'Value' : 'Change'}: {data.isBase ? data.value.toFixed(1) : (data.value > 0 ? '+' : '') + data.value.toFixed(2)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Cumulative: {data.cumulative.toFixed(1)}
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="cumulative" radius={[4, 4, 0, 0]}>
                    {waterfallData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.isBase ? 'hsl(var(--primary))' :
                              entry.value > 0 ? 'hsl(var(--success))' :
                              'hsl(var(--danger))'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>

        {/* Feature summary cards */}
        <div className="grid grid-cols-3 gap-3 mt-6">
          {shapValues.slice(0, 3).map((sv, idx) => (
            <div
              key={sv.feature}
              className="p-3 rounded-lg bg-secondary/50 border border-border"
            >
              <div className="flex items-center gap-2 mb-1">
                {sv.direction === 'positive' ? (
                  <TrendingUp className="w-4 h-4 text-success" />
                ) : sv.direction === 'negative' ? (
                  <TrendingDown className="w-4 h-4 text-danger" />
                ) : (
                  <Minus className="w-4 h-4 text-muted-foreground" />
                )}
                <span className="text-xs font-medium text-muted-foreground">
                  #{idx + 1}
                </span>
              </div>
              <p className="font-medium text-sm truncate" title={sv.feature}>
                {sv.feature}
              </p>
              <p className={`text-lg font-bold ${
                sv.direction === 'positive' ? 'text-success' :
                sv.direction === 'negative' ? 'text-danger' :
                'text-foreground'
              }`}>
                {sv.contribution > 0 ? '+' : ''}{sv.contribution.toFixed(1)}%
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
