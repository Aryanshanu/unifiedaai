import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, TrendingDown, TrendingUp, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface CohortSelectorProps {
  onCohortChange?: (cohort: string, value: string) => void;
}

interface DisparityMetric {
  group: string;
  rate: number;
  disparity: number;
  direction: 'higher' | 'lower';
}

const COHORT_DATA: Record<string, Record<string, DisparityMetric[]>> = {
  gender: {
    all: [],
    male: [
      { group: 'Male', rate: 78, disparity: 0, direction: 'higher' },
    ],
    female: [
      { group: 'Female', rate: 66, disparity: -12, direction: 'lower' },
    ],
    other: [
      { group: 'Non-binary', rate: 71, disparity: -7, direction: 'lower' },
    ],
  },
  age: {
    all: [],
    '18-25': [
      { group: '18-25', rate: 82, disparity: 4, direction: 'higher' },
    ],
    '26-40': [
      { group: '26-40', rate: 79, disparity: 1, direction: 'higher' },
    ],
    '41-55': [
      { group: '41-55', rate: 74, disparity: -4, direction: 'lower' },
    ],
    '55+': [
      { group: '55+', rate: 60, disparity: -18, direction: 'lower' },
    ],
  },
  region: {
    all: [],
    north_america: [
      { group: 'North America', rate: 81, disparity: 3, direction: 'higher' },
    ],
    europe: [
      { group: 'Europe', rate: 77, disparity: -1, direction: 'lower' },
    ],
    asia: [
      { group: 'Asia', rate: 72, disparity: -6, direction: 'lower' },
    ],
    other: [
      { group: 'Other Regions', rate: 68, disparity: -10, direction: 'lower' },
    ],
  },
  income: {
    all: [],
    high: [
      { group: 'High Income', rate: 85, disparity: 7, direction: 'higher' },
    ],
    medium: [
      { group: 'Medium Income', rate: 76, disparity: -2, direction: 'lower' },
    ],
    low: [
      { group: 'Low Income', rate: 62, disparity: -16, direction: 'lower' },
    ],
  },
};

export function CohortSelector({ onCohortChange }: CohortSelectorProps) {
  const [selectedCohort, setSelectedCohort] = useState<string>('gender');
  const [selectedValue, setSelectedValue] = useState<string>('all');

  const handleCohortChange = (cohort: string) => {
    setSelectedCohort(cohort);
    setSelectedValue('all');
    onCohortChange?.(cohort, 'all');
  };

  const handleValueChange = (value: string) => {
    setSelectedValue(value);
    onCohortChange?.(selectedCohort, value);
  };

  const cohortOptions: Record<string, { label: string; values: { value: string; label: string }[] }> = {
    gender: {
      label: 'Gender',
      values: [
        { value: 'all', label: 'All Groups' },
        { value: 'male', label: 'Male' },
        { value: 'female', label: 'Female' },
        { value: 'other', label: 'Non-binary' },
      ],
    },
    age: {
      label: 'Age',
      values: [
        { value: 'all', label: 'All Ages' },
        { value: '18-25', label: '18-25' },
        { value: '26-40', label: '26-40' },
        { value: '41-55', label: '41-55' },
        { value: '55+', label: '55+' },
      ],
    },
    region: {
      label: 'Region',
      values: [
        { value: 'all', label: 'All Regions' },
        { value: 'north_america', label: 'North America' },
        { value: 'europe', label: 'Europe' },
        { value: 'asia', label: 'Asia' },
        { value: 'other', label: 'Other' },
      ],
    },
    income: {
      label: 'Income',
      values: [
        { value: 'all', label: 'All Levels' },
        { value: 'high', label: 'High' },
        { value: 'medium', label: 'Medium' },
        { value: 'low', label: 'Low' },
      ],
    },
  };

  // Get all disparity data for current cohort
  const getAllDisparities = () => {
    const cohortData = COHORT_DATA[selectedCohort];
    if (!cohortData) return [];
    
    return Object.entries(cohortData)
      .filter(([key]) => key !== 'all')
      .flatMap(([_, metrics]) => metrics);
  };

  const disparities = selectedValue === 'all' 
    ? getAllDisparities() 
    : COHORT_DATA[selectedCohort]?.[selectedValue] || [];

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="w-4 h-4" />
          Cohort Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1 block">Cohort Type</label>
            <Select value={selectedCohort} onValueChange={handleCohortChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(cohortOptions).map(([key, opt]) => (
                  <SelectItem key={key} value={key}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1 block">Group</label>
            <Select value={selectedValue} onValueChange={handleValueChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {cohortOptions[selectedCohort]?.values.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Disparity Results */}
        {disparities.length > 0 ? (
          <div className="space-y-3">
            {disparities.map((metric, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{metric.group}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono">{metric.rate}%</span>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-xs gap-1",
                        metric.disparity > 0 
                          ? "border-success text-success" 
                          : metric.disparity < -10 
                            ? "border-danger text-danger"
                            : "border-warning text-warning"
                      )}
                    >
                      {metric.direction === 'higher' ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      {metric.disparity > 0 ? '+' : ''}{metric.disparity}%
                    </Badge>
                  </div>
                </div>
                <Progress 
                  value={metric.rate} 
                  className={cn(
                    "h-2",
                    metric.disparity < -10 && "[&>div]:bg-danger",
                    metric.disparity >= -10 && metric.disparity < 0 && "[&>div]:bg-warning"
                  )}
                />
              </div>
            ))}
            
            {/* Summary insight */}
            {disparities.some(d => d.disparity < -10) && (
              <div className="flex items-start gap-2 p-3 bg-danger/10 rounded-lg text-sm">
                <AlertTriangle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
                <span className="text-danger">
                  Significant disparity detected. Groups with {'>'}10% lower rates may indicate bias.
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground text-sm">
            Select a specific group to view disparity metrics
          </div>
        )}
      </CardContent>
    </Card>
  );
}
