import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts';

interface OWASPCoverageChartProps {
  coverage: Record<string, number>;
}

const owaspLabels: Record<string, string> = {
  LLM01: 'Prompt Injection',
  LLM02: 'Insecure Output',
  LLM03: 'Training Data Poison',
  LLM04: 'Model DoS',
  LLM05: 'Supply Chain',
  LLM06: 'Sensitive Info',
  LLM07: 'Insecure Plugin',
  LLM08: 'Excessive Agency',
  LLM09: 'Overreliance',
  LLM10: 'Model Theft',
};

export function OWASPCoverageChart({ coverage }: OWASPCoverageChartProps) {
  const data = Object.entries(owaspLabels).map(([key, label]) => ({
    category: key,
    label: label,
    coverage: coverage[key] || 0,
    fullMark: 100,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">OWASP LLM Top 10 Coverage</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
              <PolarGrid stroke="hsl(var(--muted-foreground))" strokeOpacity={0.2} />
              <PolarAngleAxis
                dataKey="category"
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tick={{ fontSize: 8, fill: 'hsl(var(--muted-foreground))' }}
              />
              <Radar
                name="Coverage %"
                dataKey="coverage"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary))"
                fillOpacity={0.3}
                strokeWidth={2}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-popover border rounded-lg shadow-lg p-2 text-sm">
                        <p className="font-medium">{data.category}: {data.label}</p>
                        <p className="text-muted-foreground">Coverage: {data.coverage}%</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
