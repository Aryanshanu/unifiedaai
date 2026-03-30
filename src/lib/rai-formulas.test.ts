import { describe, it, expect } from 'vitest';
import {
  demographicParityScore,
  equalOpportunityScore,
  equalizedOddsScore,
  groupLossRatioScore,
  biasTagRateScore,
  calculateFairnessScore,
  responseHallucinationScore,
  claimHallucinationScore,
  faithfulnessScore,
  unsupportedSpanScore,
  abstentionQualityScore,
  calculateHallucinationScore,
  overallToxicityScore,
  severeToxicityScore,
  toxicityDifferentialScore,
  topicToxicityScore,
  guardrailCatchScore,
  calculateToxicityScore,
  piiLeakageScore,
  phiLeakageScore,
  redactionCoverageScore,
  secretsExposureScore,
  minimizationScore,
  calculatePrivacyScore,
  clarityScore,
  explanationFaithfulnessScore,
  coverageScore,
  actionabilityScore,
  simplicityScore,
  calculateExplainabilityScore,
  calculateOverallRAIScore,
} from './rai-formulas';

// ============== HELPERS ==============
function expectMetricShape(result: any) {
  expect(result).toHaveProperty('value');
  expect(result).toHaveProperty('score');
  expect(result).toHaveProperty('status');
  expect(result).toHaveProperty('threshold');
  expect(result).toHaveProperty('formula');
  expect(result).toHaveProperty('whyExplanation');
}

// ============== FAIRNESS ==============
describe('Fairness Metrics', () => {
  describe('demographicParityScore', () => {
    it('passes when groups are within delta', () => {
      const r = demographicParityScore({ A: 0.8, B: 0.78 }, 0.1);
      expect(r.status).toBe('pass');
      expect(r.score).toBeGreaterThanOrEqual(0.5);
    });
    it('fails when gap exceeds threshold', () => {
      const r = demographicParityScore({ A: 0.9, B: 0.5 }, 0.1);
      expect(r.status).toBe('fail');
      expect(r.score).toBe(0);
    });
    it('handles single group', () => {
      const r = demographicParityScore({ A: 0.8 }, 0.1);
      expect(r.status).toBe('pass');
      expect(r.value).toBe(0);
    });
    it('returns MetricResult shape', () => expectMetricShape(demographicParityScore({ A: 0.7 }, 0.1)));
  });

  describe('equalOpportunityScore', () => {
    it('passes with balanced TPRs', () => {
      const r = equalOpportunityScore({ A: 0.85, B: 0.83 }, 0.1);
      expect(r.status).toBe('pass');
    });
    it('fails with large TPR gap', () => {
      const r = equalOpportunityScore({ A: 0.95, B: 0.4 }, 0.1);
      expect(r.status).toBe('fail');
    });
    it('returns MetricResult shape', () => expectMetricShape(equalOpportunityScore({ A: 0.8 }, 0.1)));
  });

  describe('equalizedOddsScore', () => {
    it('passes when diffs are small', () => {
      const r = equalizedOddsScore({ A: 0.85 }, { A: 0.1 }, 0.85, 0.1, 0.1);
      expect(r.status).toBe('pass');
    });
    it('fails when combined diff is large', () => {
      const r = equalizedOddsScore({ A: 0.9 }, { A: 0.3 }, 0.7, 0.1, 0.1);
      expect(r.status).toBe('fail');
    });
    it('returns MetricResult shape', () => expectMetricShape(equalizedOddsScore({ A: 0.8 }, { A: 0.1 }, 0.8, 0.1)));
  });

  describe('groupLossRatioScore', () => {
    it('passes with equal losses', () => {
      const r = groupLossRatioScore({ A: 0.5, B: 0.5 });
      expect(r.status).toBe('pass');
      expect(r.score).toBe(1);
    });
    it('fails with unequal losses', () => {
      const r = groupLossRatioScore({ A: 1.0, B: 0.1 });
      expect(r.status).toBe('fail');
    });
    it('handles single group', () => {
      const r = groupLossRatioScore({ A: 0.5 });
      expect(r.status).toBe('pass');
    });
    it('returns MetricResult shape', () => expectMetricShape(groupLossRatioScore({ A: 0.5, B: 0.5 })));
  });

  describe('biasTagRateScore', () => {
    it('passes with equal bias rates', () => {
      const r = biasTagRateScore({ A: 0.05, B: 0.06 }, 0.1);
      expect(r.status).toBe('pass');
    });
    it('fails with large bias gap', () => {
      const r = biasTagRateScore({ A: 0.5, B: 0.05 }, 0.1);
      expect(r.status).toBe('fail');
    });
    it('returns MetricResult shape', () => expectMetricShape(biasTagRateScore({ A: 0.1 }, 0.1)));
  });

  describe('calculateFairnessScore', () => {
    it('returns 1.0 for perfect metrics', () => {
      const r = calculateFairnessScore({ dp: 1, eo: 1, eodds: 1, glr: 1, bias: 1 });
      expect(r.score).toBeCloseTo(1.0);
    });
    it('returns 0.0 for zero metrics', () => {
      const r = calculateFairnessScore({ dp: 0, eo: 0, eodds: 0, glr: 0, bias: 0 });
      expect(r.score).toBeCloseTo(0.0);
    });
    it('has formula and breakdown', () => {
      const r = calculateFairnessScore({ dp: 0.8, eo: 0.7, eodds: 0.6, glr: 0.9, bias: 0.5 });
      expect(r.formula).toBeTruthy();
      expect(r.breakdown).toHaveProperty('demographic_parity');
    });
  });
});

// ============== HALLUCINATION ==============
describe('Hallucination Metrics', () => {
  describe('responseHallucinationScore', () => {
    it('passes with zero hallucinations', () => {
      const r = responseHallucinationScore(0, 100);
      expect(r.status).toBe('pass');
      expect(r.score).toBe(1);
    });
    it('fails with high hallucination', () => {
      const r = responseHallucinationScore(50, 100);
      expect(r.status).toBe('fail');
    });
    it('handles zero total', () => {
      const r = responseHallucinationScore(0, 0);
      expect(r.score).toBe(1);
    });
    it('returns MetricResult shape', () => expectMetricShape(responseHallucinationScore(5, 100)));
  });

  describe('claimHallucinationScore', () => {
    it('passes with few unsupported claims', () => {
      const r = claimHallucinationScore(5, 100);
      expect(r.status).toBe('pass');
    });
    it('fails with many unsupported claims', () => {
      const r = claimHallucinationScore(50, 100);
      expect(r.status).toBe('fail');
    });
    it('returns MetricResult shape', () => expectMetricShape(claimHallucinationScore(0, 0)));
  });

  describe('faithfulnessScore', () => {
    it('passes with high rating', () => {
      const r = faithfulnessScore(4.5, 5);
      expect(r.status).toBe('pass');
    });
    it('fails with low rating', () => {
      const r = faithfulnessScore(2, 5);
      expect(r.status).toBe('fail');
    });
    it('returns MetricResult shape', () => expectMetricShape(faithfulnessScore(3, 5)));
  });

  describe('unsupportedSpanScore', () => {
    it('passes with few unsupported tokens', () => {
      const r = unsupportedSpanScore(5, 100);
      expect(r.status).toBe('pass');
    });
    it('fails with many unsupported tokens', () => {
      const r = unsupportedSpanScore(50, 100);
      expect(r.status).toBe('fail');
    });
    it('returns MetricResult shape', () => expectMetricShape(unsupportedSpanScore(0, 0)));
  });

  describe('abstentionQualityScore', () => {
    it('passes with high abstention rate', () => {
      const r = abstentionQualityScore(80, 100);
      expect(r.status).toBe('pass');
    });
    it('fails with low abstention', () => {
      const r = abstentionQualityScore(20, 100);
      expect(r.status).toBe('fail');
    });
    it('handles zero risky queries', () => {
      const r = abstentionQualityScore(0, 0);
      expect(r.score).toBe(1);
    });
    it('returns MetricResult shape', () => expectMetricShape(abstentionQualityScore(5, 10)));
  });

  describe('calculateHallucinationScore', () => {
    it('returns 1.0 for perfect metrics', () => {
      const r = calculateHallucinationScore({ resp: 1, claim: 1, faith: 1, span: 1, abstain: 1 });
      expect(r.score).toBeCloseTo(1.0);
    });
    it('returns 0.0 for zero metrics', () => {
      const r = calculateHallucinationScore({ resp: 0, claim: 0, faith: 0, span: 0, abstain: 0 });
      expect(r.score).toBeCloseTo(0.0);
    });
  });
});

// ============== TOXICITY ==============
describe('Toxicity Metrics', () => {
  describe('overallToxicityScore', () => {
    it('passes with zero toxic outputs', () => {
      const r = overallToxicityScore(0, 100);
      expect(r.status).toBe('pass');
      expect(r.score).toBe(1);
    });
    it('fails with high toxicity', () => {
      const r = overallToxicityScore(20, 100);
      expect(r.status).toBe('fail');
    });
    it('handles zero total', () => {
      const r = overallToxicityScore(0, 0);
      expect(r.score).toBe(1);
    });
    it('returns MetricResult shape', () => expectMetricShape(overallToxicityScore(1, 100)));
  });

  describe('severeToxicityScore', () => {
    it('passes with zero severe', () => {
      const r = severeToxicityScore(0, 100);
      expect(r.status).toBe('pass');
    });
    it('fails with severe content', () => {
      const r = severeToxicityScore(10, 100);
      expect(r.status).toBe('fail');
    });
    it('returns MetricResult shape', () => expectMetricShape(severeToxicityScore(0, 100)));
  });

  describe('toxicityDifferentialScore', () => {
    it('passes when output is less toxic than input', () => {
      const r = toxicityDifferentialScore(0.05, 0.1);
      expect(r.status).toBe('pass');
      expect(r.score).toBe(1);
    });
    it('fails when output amplifies toxicity', () => {
      const r = toxicityDifferentialScore(0.5, 0.1);
      expect(r.status).toBe('fail');
    });
    it('returns MetricResult shape', () => expectMetricShape(toxicityDifferentialScore(0.1, 0.1)));
  });

  describe('topicToxicityScore', () => {
    it('passes with low topic rates', () => {
      const r = topicToxicityScore({ religion: 0.02, politics: 0.03 });
      expect(r.status).toBe('pass');
    });
    it('fails with high topic rate', () => {
      const r = topicToxicityScore({ religion: 0.02, politics: 0.35 });
      expect(r.status).toBe('fail');
    });
    it('handles empty topics', () => {
      const r = topicToxicityScore({});
      expect(r.score).toBe(1);
    });
    it('returns MetricResult shape', () => expectMetricShape(topicToxicityScore({ a: 0.1 })));
  });

  describe('guardrailCatchScore', () => {
    it('passes with high catch rate', () => {
      const r = guardrailCatchScore(95, 100);
      expect(r.status).toBe('pass');
    });
    it('fails with low catch rate', () => {
      const r = guardrailCatchScore(50, 100);
      expect(r.status).toBe('fail');
    });
    it('handles zero toxic inputs', () => {
      const r = guardrailCatchScore(0, 0);
      expect(r.score).toBe(1);
    });
    it('returns MetricResult shape', () => expectMetricShape(guardrailCatchScore(5, 10)));
  });

  describe('calculateToxicityScore', () => {
    it('returns 1.0 for perfect', () => {
      const r = calculateToxicityScore({ overall: 1, severe: 1, diff: 1, topic: 1, guard: 1 });
      expect(r.score).toBeCloseTo(1.0);
    });
  });
});

// ============== PRIVACY ==============
describe('Privacy Metrics', () => {
  describe('piiLeakageScore', () => {
    it('passes with zero PII', () => {
      const r = piiLeakageScore(0, 100);
      expect(r.status).toBe('pass');
    });
    it('fails with high PII', () => {
      const r = piiLeakageScore(30, 100);
      expect(r.status).toBe('fail');
    });
    it('returns MetricResult shape', () => expectMetricShape(piiLeakageScore(0, 100)));
  });

  describe('phiLeakageScore', () => {
    it('passes with zero PHI', () => {
      const r = phiLeakageScore(0, 100);
      expect(r.status).toBe('pass');
    });
    it('fails with PHI leakage', () => {
      const r = phiLeakageScore(10, 100);
      expect(r.status).toBe('fail');
    });
    it('returns MetricResult shape', () => expectMetricShape(phiLeakageScore(0, 100)));
  });

  describe('redactionCoverageScore', () => {
    it('passes with full redaction', () => {
      const r = redactionCoverageScore(100, 100);
      expect(r.status).toBe('pass');
    });
    it('fails with low redaction', () => {
      const r = redactionCoverageScore(50, 100);
      expect(r.status).toBe('fail');
    });
    it('handles zero detected', () => {
      const r = redactionCoverageScore(0, 0);
      expect(r.score).toBe(1);
    });
    it('returns MetricResult shape', () => expectMetricShape(redactionCoverageScore(5, 10)));
  });

  describe('secretsExposureScore', () => {
    it('passes with zero secrets', () => {
      const r = secretsExposureScore(0, 100);
      expect(r.status).toBe('pass');
    });
    it('fails with secrets leak', () => {
      const r = secretsExposureScore(10, 100);
      expect(r.status).toBe('fail');
    });
    it('returns MetricResult shape', () => expectMetricShape(secretsExposureScore(0, 100)));
  });

  describe('minimizationScore', () => {
    it('passes with high minimization', () => {
      const r = minimizationScore(95, 100);
      expect(r.status).toBe('pass');
    });
    it('fails with low minimization', () => {
      const r = minimizationScore(50, 100);
      expect(r.status).toBe('fail');
    });
    it('handles zero prompts', () => {
      const r = minimizationScore(0, 0);
      expect(r.score).toBe(1);
    });
    it('returns MetricResult shape', () => expectMetricShape(minimizationScore(5, 10)));
  });

  describe('calculatePrivacyScore', () => {
    it('returns 1.0 for perfect', () => {
      const r = calculatePrivacyScore({ pii: 1, phi: 1, redact: 1, secrets: 1, min: 1 });
      expect(r.score).toBeCloseTo(1.0);
    });
  });
});

// ============== EXPLAINABILITY ==============
describe('Explainability Metrics', () => {
  describe('clarityScore', () => {
    it('passes with high clarity', () => {
      const r = clarityScore(4.5, 5);
      expect(r.status).toBe('pass');
    });
    it('fails with low clarity', () => {
      const r = clarityScore(2, 5);
      expect(r.status).toBe('fail');
    });
    it('returns MetricResult shape', () => expectMetricShape(clarityScore(3, 5)));
  });

  describe('explanationFaithfulnessScore', () => {
    it('passes with high faithfulness', () => {
      const r = explanationFaithfulnessScore(4.5, 5);
      expect(r.status).toBe('pass');
    });
    it('fails with low faithfulness', () => {
      const r = explanationFaithfulnessScore(2, 5);
      expect(r.status).toBe('fail');
    });
    it('returns MetricResult shape', () => expectMetricShape(explanationFaithfulnessScore(3, 5)));
  });

  describe('coverageScore', () => {
    it('passes with high coverage', () => {
      const r = coverageScore(95, 100);
      expect(r.status).toBe('pass');
    });
    it('fails with low coverage', () => {
      const r = coverageScore(50, 100);
      expect(r.status).toBe('fail');
    });
    it('handles zero outputs', () => {
      const r = coverageScore(0, 0);
      expect(r.score).toBe(0);
    });
    it('returns MetricResult shape', () => expectMetricShape(coverageScore(50, 100)));
  });

  describe('actionabilityScore', () => {
    it('passes with high actionability', () => {
      const r = actionabilityScore(4, 5);
      expect(r.status).toBe('pass');
    });
    it('fails with low actionability', () => {
      const r = actionabilityScore(1.5, 5);
      expect(r.status).toBe('fail');
    });
    it('returns MetricResult shape', () => expectMetricShape(actionabilityScore(3, 5)));
  });

  describe('simplicityScore', () => {
    it('passes with high simplicity', () => {
      const r = simplicityScore(0.8);
      expect(r.status).toBe('pass');
    });
    it('fails with low simplicity', () => {
      const r = simplicityScore(0.3);
      expect(r.status).toBe('fail');
    });
    it('returns MetricResult shape', () => expectMetricShape(simplicityScore(0.5)));
  });

  describe('calculateExplainabilityScore', () => {
    it('returns 1.0 for perfect', () => {
      const r = calculateExplainabilityScore({ clarity: 1, faith: 1, coverage: 1, action: 1, simple: 1 });
      expect(r.score).toBeCloseTo(1.0);
    });
  });
});

// ============== OVERALL RAI ==============
describe('Overall RAI Score', () => {
  describe('calculateOverallRAIScore', () => {
    it('returns COMPLIANT for all-perfect scores', () => {
      const r = calculateOverallRAIScore({
        fairness: 1, hallucination: 1, toxicity: 1, privacy: 1, explainability: 1,
      });
      expect(r.status).toBe('COMPLIANT');
      expect(r.score).toBe(100);
    });
    it('returns NON_COMPLIANT for all-zero scores', () => {
      const r = calculateOverallRAIScore({
        fairness: 0, hallucination: 0, toxicity: 0, privacy: 0, explainability: 0,
      });
      expect(r.status).toBe('NON_COMPLIANT');
      expect(r.score).toBe(0);
    });
    it('handles partial scores', () => {
      const r = calculateOverallRAIScore({ fairness: 0.8, toxicity: 0.9 });
      expect(r.score).toBeGreaterThan(0);
      expect(r.formula).toBeTruthy();
      expect(r.breakdown).toBeTruthy();
    });
    it('handles empty scores', () => {
      const r = calculateOverallRAIScore({});
      expect(r.score).toBe(0);
    });
  });
});
