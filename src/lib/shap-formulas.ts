/**
 * SHAP (SHapley Additive exPlanations) Formulas
 * Permutation-based feature importance for LLM explainability
 * 
 * Since we cannot run full SHAP computation in edge functions,
 * we use LLM-based attribution and permutation approximation.
 */

export interface ShapleyValue {
  feature: string;
  value: number;
  contribution: number;
  direction: 'positive' | 'negative' | 'neutral';
  description?: string;
}

export interface CounterfactualExplanation {
  originalPrediction: string;
  counterfactualPrediction: string;
  changes: Array<{
    feature: string;
    originalValue: string;
    newValue: string;
    impact: number;
  }>;
  confidence: number;
}

export interface FeatureImportance {
  feature: string;
  importance: number;
  rank: number;
  percentageContribution: number;
}

/**
 * Calculate permutation-based feature importance
 * Measures how much the prediction changes when a feature is shuffled
 */
export function calculatePermutationImportance(
  features: string[],
  baselineScore: number,
  permutedScores: Record<string, number>
): FeatureImportance[] {
  const importances = features.map(feature => ({
    feature,
    importance: Math.abs(baselineScore - (permutedScores[feature] || baselineScore)),
  }));
  
  // Sort by importance descending
  importances.sort((a, b) => b.importance - a.importance);
  
  // Calculate total importance for percentage
  const totalImportance = importances.reduce((sum, f) => sum + f.importance, 0) || 1;
  
  return importances.map((f, idx) => ({
    ...f,
    rank: idx + 1,
    percentageContribution: (f.importance / totalImportance) * 100,
  }));
}

/**
 * Approximate Shapley values using marginal contribution
 * Simplified version for LLM context
 */
export function approximateShapleyValues(
  features: Record<string, { value: any; contribution: number }>,
  baselinePrediction: number
): ShapleyValue[] {
  const values: ShapleyValue[] = [];
  const totalContribution = Object.values(features).reduce(
    (sum, f) => sum + Math.abs(f.contribution), 0
  ) || 1;
  
  for (const [feature, data] of Object.entries(features)) {
    const normalizedContribution = (data.contribution / totalContribution) * baselinePrediction;
    values.push({
      feature,
      value: typeof data.value === 'number' ? data.value : 0,
      contribution: normalizedContribution,
      direction: data.contribution > 0.1 ? 'positive' : 
                 data.contribution < -0.1 ? 'negative' : 'neutral',
      description: `${feature} contributes ${(Math.abs(normalizedContribution)).toFixed(1)}% to the prediction`,
    });
  }
  
  // Sort by absolute contribution
  return values.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
}

/**
 * Generate counterfactual explanation
 * "What would need to change to get a different outcome?"
 */
export function generateCounterfactual(
  currentPrediction: string,
  desiredPrediction: string,
  features: Array<{ name: string; current: string; suggested: string; impact: number }>
): CounterfactualExplanation {
  // Sort by impact to get the most influential changes
  const sortedFeatures = [...features].sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
  
  // Calculate confidence based on feature impact coverage
  const totalImpact = sortedFeatures.reduce((sum, f) => sum + Math.abs(f.impact), 0);
  const confidence = Math.min(100, totalImpact);
  
  return {
    originalPrediction: currentPrediction,
    counterfactualPrediction: desiredPrediction,
    changes: sortedFeatures.slice(0, 5).map(f => ({
      feature: f.name,
      originalValue: f.current,
      newValue: f.suggested,
      impact: f.impact,
    })),
    confidence,
  };
}

/**
 * Calculate SHAP alignment score
 * Measures how well the LLM's explanation aligns with computed SHAP values
 */
export function calculateShapAlignmentScore(
  llmExplanation: string,
  shapValues: ShapleyValue[]
): number {
  const topFeatures = shapValues.slice(0, 5);
  let alignmentScore = 0;
  let totalWeight = 0;
  
  for (const feature of topFeatures) {
    const weight = Math.abs(feature.contribution);
    totalWeight += weight;
    
    // Check if the LLM mentioned this feature
    const mentioned = llmExplanation.toLowerCase().includes(feature.feature.toLowerCase());
    if (mentioned) {
      alignmentScore += weight;
    }
  }
  
  return totalWeight > 0 ? (alignmentScore / totalWeight) * 100 : 50;
}

/**
 * Convert SHAP values to waterfall chart data
 */
export function shapToWaterfallData(
  shapValues: ShapleyValue[],
  baseValue: number
): Array<{ name: string; value: number; fill: string; cumulative: number }> {
  const data: Array<{ name: string; value: number; fill: string; cumulative: number }> = [];
  let cumulative = baseValue;
  
  // Add base value
  data.push({
    name: 'Base',
    value: baseValue,
    fill: 'hsl(var(--muted))',
    cumulative: baseValue,
  });
  
  // Add each feature contribution
  for (const sv of shapValues.slice(0, 8)) {
    cumulative += sv.contribution;
    data.push({
      name: sv.feature,
      value: sv.contribution,
      fill: sv.direction === 'positive' ? 'hsl(var(--success))' : 
            sv.direction === 'negative' ? 'hsl(var(--danger))' : 'hsl(var(--muted))',
      cumulative,
    });
  }
  
  // Add final prediction
  data.push({
    name: 'Prediction',
    value: cumulative,
    fill: 'hsl(var(--primary))',
    cumulative,
  });
  
  return data;
}

/**
 * Parse LLM explanation to extract feature attributions
 */
export function extractFeaturesFromExplanation(
  explanation: string,
  knownFeatures: string[]
): Record<string, { mentioned: boolean; sentiment: 'positive' | 'negative' | 'neutral' }> {
  const result: Record<string, { mentioned: boolean; sentiment: 'positive' | 'negative' | 'neutral' }> = {};
  const lower = explanation.toLowerCase();
  
  const positiveWords = ['increase', 'improve', 'higher', 'better', 'strong', 'positive', 'good', 'helps'];
  const negativeWords = ['decrease', 'reduce', 'lower', 'worse', 'weak', 'negative', 'bad', 'hurts'];
  
  for (const feature of knownFeatures) {
    const featureLower = feature.toLowerCase();
    const mentioned = lower.includes(featureLower);
    
    if (!mentioned) {
      result[feature] = { mentioned: false, sentiment: 'neutral' };
      continue;
    }
    
    // Find the context around the feature mention
    const idx = lower.indexOf(featureLower);
    const context = lower.slice(Math.max(0, idx - 50), idx + feature.length + 50);
    
    const hasPositive = positiveWords.some(w => context.includes(w));
    const hasNegative = negativeWords.some(w => context.includes(w));
    
    result[feature] = {
      mentioned: true,
      sentiment: hasPositive && !hasNegative ? 'positive' :
                 hasNegative && !hasPositive ? 'negative' : 'neutral',
    };
  }
  
  return result;
}

/**
 * Calculate force plot data for SHAP visualization
 */
export function calculateForcePlotData(
  baseValue: number,
  shapValues: ShapleyValue[]
): { positive: ShapleyValue[]; negative: ShapleyValue[]; prediction: number } {
  const positive = shapValues.filter(sv => sv.contribution > 0);
  const negative = shapValues.filter(sv => sv.contribution < 0);
  const prediction = baseValue + shapValues.reduce((sum, sv) => sum + sv.contribution, 0);
  
  return { positive, negative, prediction };
}
