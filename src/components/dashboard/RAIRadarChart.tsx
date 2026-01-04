import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Target, AlertTriangle } from "lucide-react";
import type { ModelRAIScores } from "@/hooks/useRAIDashboard";

interface RAIRadarChartProps {
  models: ModelRAIScores[];
  selectedModels?: string[];
  showThreshold?: boolean;
}

const PILLAR_LABELS: Record<string, string> = {
  fairness: 'Fairness',
  toxicity: 'Toxicity',
  privacy: 'Privacy',
  hallucination: 'Hallucination',
  explainability: 'Explainability',
};

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--success))',
  'hsl(var(--warning))',
  'hsl(var(--accent))',
  'hsl(var(--danger))',
];

export function RAIRadarChart({
  models,
  selectedModels,
  showThreshold = true,
}: RAIRadarChartProps) {
  // Filter to selected models or take first 3
  const displayModels = selectedModels
    ? models.filter(m => selectedModels.includes(m.modelId))
    : models.slice(0, 3);

  if (displayModels.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            RAI Pillar Radar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            <p>No models with evaluation data</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Build radar data
  const pillars = ['fairness', 'toxicity', 'privacy', 'hallucination', 'explainability'];
  const radarData = pillars.map(pillar => {
    const dataPoint: Record<string, any> = {
      pillar: PILLAR_LABELS[pillar],
      threshold: 70,
    };
    
    displayModels.forEach((model, idx) => {
      const pillarScore = model.pillarScores.find(ps => ps.pillar === pillar);
      dataPoint[`model_${idx}`] = pillarScore?.score ?? 0;
      dataPoint[`name_${idx}`] = model.modelName;
    });
    
    return dataPoint;
  });

  // Check for any non-compliant scores
  const hasNonCompliant = displayModels.some(m =>
    m.pillarScores.some(ps => ps.score !== null && ps.score < 70)
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            RAI Pillar Radar
          </CardTitle>
          {hasNonCompliant && (
            <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Below threshold
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Compare model performance across all 5 RAI pillars
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <PolarAngleAxis
                dataKey="pillar"
                tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                tickCount={5}
              />
              
              {/* Threshold line */}
              {showThreshold && (
                <Radar
                  name="Compliance Threshold (70%)"
                  dataKey="threshold"
                  stroke="hsl(var(--danger))"
                  fill="transparent"
                  strokeDasharray="5 5"
                  strokeWidth={2}
                />
              )}
              
              {/* Model radars */}
              {displayModels.map((model, idx) => (
                <Radar
                  key={model.modelId}
                  name={model.modelName}
                  dataKey={`model_${idx}`}
                  stroke={COLORS[idx % COLORS.length]}
                  fill={COLORS[idx % COLORS.length]}
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              ))}
              
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const data = payload[0].payload;
                  return (
                    <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                      <p className="font-medium text-sm mb-2">{data.pillar}</p>
                      {displayModels.map((model, idx) => (
                        <p key={model.modelId} className="text-sm flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                          />
                          <span className="text-muted-foreground">{model.modelName}:</span>
                          <span className={data[`model_${idx}`] >= 70 ? 'text-success' : 'text-danger'}>
                            {data[`model_${idx}`]}%
                          </span>
                        </p>
                      ))}
                      <p className="text-xs text-muted-foreground mt-2 border-t border-border pt-2">
                        Threshold: 70%
                      </p>
                    </div>
                  );
                }}
              />
              
              <Legend
                wrapperStyle={{ paddingTop: '20px' }}
                formatter={(value) => (
                  <span className="text-xs text-muted-foreground">{value}</span>
                )}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
