import { describe, it, expect } from 'vitest';
import {
  // Fairness
  demographicParityScore,
  equalOpportunityScore,
  equalizedOddsScore,
  groupLossRatioScore,
  biasTagRateScore,
  calculateFairnessScore,
  // Hallucination
  responseHallucinationScore,
  claimHallucinationScore,
  faithfulnessScore,
  unsupportedSpanScore,
  abstentionQualityScore,
  calculateHallucinationScore,
  // Toxicity
  overallToxicityScore,
  severeToxicityScore,
  toxicityDifferentialScore,
  topicToxicityScore,
  guardrailCatchScore,
  calculateToxicityScore,
  // Privacy
  piiLeakageScore,
  phiLeakageScore,
  redactionCoverageScore,
  secretsExposureScore,
  minimizationScore,
  calculatePrivacyScore,
  // Explainability
  clarityScore,
  explanationFaithfulnessScore,
  coverageScore,
  actionabilityScore,
  simplicityScore,
  calculateExplainabilityScore,
  // Overall
  calculateOverallRAIScore,
} from './rai-formulas';

import {
  EQUAL_GROUP_RATES, BIASED_GROUP_RATES, THREE_GROUP_RATES,
  PERFECT_GROUP_TPRS, UNEQUAL_GROUP_TPRS,
  EQUAL_GROUP_FPRS, UNEQUAL_GROUP_FPRS,
  EQUAL_GROUP_LOSSES, UNEQUAL_GROUP_LOSSES,
  EQUAL_BIAS_RATES, UNEQUAL_BIAS_RATES,
  TOPIC_TOX_LOW, TOPIC_TOX_HIGH,
} from '../tests/fixtures/rai-test-data';

// ─── Shared helper ────────────────────────────────────────────────────────────
function expectMetricShape(result: unknown) {
  expect(result).toHaveProperty('value');
  expect(result).toHaveProperty('score');
  expect(result).toHaveProperty('status');
  expect(result).toHaveProperty('threshold');
  expect(result).toHaveProperty('formula');
  expect(result).toHaveProperty('whyExplanation');
}

// ════════════════════════════════════════════════════════════════════════════════
// FAIRNESS (5 metrics)
// ════════════════════════════════════════════════════════════════════════════════

describe('demographicParityScore', () => {
  it('passes when groups are within delta threshold', () => {
    const r = demographicParityScore(EQUAL_GROUP_RATES, 0.1);
    expect(r.status).toBe('pass');
    expect(r.value).toBeCloseTo(0, 3);
  });
  it('fails when gap exceeds threshold', () => {
    const r = demographicParityScore(BIASED_GROUP_RATES, 0.1);
    expect(r.status).toBe('fail');
    expect(r.score).toBe(0);
  });
  it('handles three groups correctly', () => {
    const r = demographicParityScore(THREE_GROUP_RATES, 0.1);
    expect(r.value).toBeCloseTo(0.08, 2);
    expectMetricShape(r);
  });
  it('handles single group (no difference)', () => {
    const r = demographicParityScore({ A: 0.8 }, 0.1);
    expect(r.status).toBe('pass');
    expect(r.value).toBe(0);
  });
});

describe('equalOpportunityScore', () => {
  it('passes when TPRs are equal', () => {
    const r = equalOpportunityScore(PERFECT_GROUP_TPRS, 0.1);
    expect(r.status).toBe('pass');
  });
  it('fails when TPR gap is too large', () => {
    const r = equalOpportunityScore(UNEQUAL_GROUP_TPRS, 0.1);
    expect(r.status).toBe('fail');
    expect(r.score).toBe(0);
  });
  it('returns correct MetricResult shape', () => {
    expectMetricShape(equalOpportunityScore({ A: 0.8, B: 0.75 }, 0.1));
  });
});

describe('equalizedOddsScore', () => {
  it('passes when both TPR and FPR differences are small', () => {
    const r = equalizedOddsScore(PERFECT_GROUP_TPRS, EQUAL_GROUP_FPRS, 0.9, 0.1, 0.5);
    expect(r.status).toBe('pass');
  });
  it('fails when combined deviation exceeds delta', () => {
    const r = equalizedOddsScore(UNEQUAL_GROUP_TPRS, UNEQUAL_GROUP_FPRS, 0.9, 0.1, 0.1);
    expect(r.status).toBe('fail');
  });
  it('returns correct MetricResult shape', () => {
    expectMetricShape(equalizedOddsScore({ A: 0.8 }, { A: 0.1 }, 0.8, 0.1, 0.2));
  });
});

describe('groupLossRatioScore', () => {
  it('passes when losses are roughly equal', () => {
    const r = groupLossRatioScore(EQUAL_GROUP_LOSSES);
    expect(r.status).toBe('pass');
  });
  it('fails when one group has 5x higher loss', () => {
    const r = groupLossRatioScore(UNEQUAL_GROUP_LOSSES);
    expect(r.status).toBe('fail');
  });
  it('handles single group with N/A result', () => {
    const r = groupLossRatioScore({ A: 0.2 });
    expect(r.status).toBe('pass');
    expect(r.formula).toContain('N/A');
  });
});

describe('biasTagRateScore', () => {
  it('passes when bias rates are similar', () => {
    const r = biasTagRateScore(EQUAL_BIAS_RATES, 0.1);
    expect(r.status).toBe('pass');
  });
  it('fails when bias rate gap exceeds threshold', () => {
    const r = biasTagRateScore(UNEQUAL_BIAS_RATES, 0.1);
    expect(r.status).toBe('fail');
  });
  it('returns correct MetricResult shape', () => {
    expectMetricShape(biasTagRateScore({ A: 0.05, B: 0.06 }, 0.1));
  });
});

describe('calculateFairnessScore', () => {
  it('produces weighted sum between 0 and 1', () => {
    const { score } = calculateFairnessScore({ dp: 0.9, eo: 0.8, eodds: 0.85, glr: 0.7, bias: 0.95 });
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(1);
  });
  it('returns formula string and breakdown', () => {
    const r = calculateFairnessScore({ dp: 1, eo: 1, eodds: 1, glr: 1, bias: 1 });
    expect(r.formula).toContain('=');
    expect(r.breakdown).toHaveProperty('demographic_parity');
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// HALLUCINATION (5 metrics)
// ════════════════════════════════════════════════════════════════════════════════

describe('responseHallucinationScore', () => {
  it('passes with low hallucination rate', () => {
    const r = responseHallucinationScore(5, 100);
    expect(r.status).toBe('pass');
    expect(r.value).toBeCloseTo(0.05, 2);
  });
  it('fails with high hallucination rate', () => {
    const r = responseHallucinationScore(50, 100);
    expect(r.status).toBe('fail');
  });
  it('handles zero total responses', () => {
    const r = responseHallucinationScore(0, 0);
    expect(r.value).toBe(0);
    expect(r.score).toBe(1);
  });
});

describe('claimHallucinationScore', () => {
  it('passes when claim hallucination is below threshold', () => {
    const r = claimHallucinationScore(5, 100);
    expect(r.status).toBe('pass');
  });
  it('fails when too many claims are unsupported', () => {
    const r = claimHallucinationScore(40, 100);
    expect(r.status).toBe('fail');
  });
  it('returns correct shape', () => {
    expectMetricShape(claimHallucinationScore(10, 100));
  });
});

describe('faithfulnessScore', () => {
  it('passes with high judge score', () => {
    const r = faithfulnessScore(4.5, 5);
    expect(r.status).toBe('pass');
    expect(r.score).toBeCloseTo(0.9, 1);
  });
  it('fails with low judge score', () => {
    const r = faithfulnessScore(2, 5);
    expect(r.status).toBe('fail');
  });
  it('returns correct shape', () => {
    expectMetricShape(faithfulnessScore(3.5, 5));
  });
});

describe('unsupportedSpanScore', () => {
  it('passes when very few tokens are unsupported', () => {
    const r = unsupportedSpanScore(10, 200);
    expect(r.status).toBe('pass');
  });
  it('fails when many tokens are unsupported', () => {
    const r = unsupportedSpanScore(100, 200);
    expect(r.status).toBe('fail');
  });
  it('handles zero tokens', () => {
    const r = unsupportedSpanScore(0, 0);
    expect(r.value).toBe(0);
  });
});

describe('abstentionQualityScore', () => {
  it('passes when model abstains appropriately', () => {
    const r = abstentionQualityScore(90, 100);
    expect(r.status).toBe('pass');
  });
  it('fails when model rarely abstains on risky queries', () => {
    const r = abstentionQualityScore(20, 100);
    expect(r.status).toBe('fail');
  });
  it('returns 1 when no risky queries', () => {
    const r = abstentionQualityScore(0, 0);
    expect(r.score).toBe(1);
  });
});

describe('calculateHallucinationScore', () => {
  it('produces score between 0 and 1', () => {
    const { score } = calculateHallucinationScore({ resp: 0.9, claim: 0.85, faith: 0.8, span: 0.95, abstain: 0.7 });
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(1);
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// TOXICITY (5 metrics)
// ════════════════════════════════════════════════════════════════════════════════

describe('overallToxicityScore', () => {
  it('passes with very low toxicity', () => {
    const r = overallToxicityScore(2, 100);
    expect(r.status).toBe('pass');
  });
  it('fails with high toxicity rate', () => {
    const r = overallToxicityScore(30, 100);
    expect(r.status).toBe('fail');
  });
  it('returns correct shape', () => {
    expectMetricShape(overallToxicityScore(0, 100));
  });
});

describe('severeToxicityScore', () => {
  it('passes with near-zero severe toxicity', () => {
    const r = severeToxicityScore(0, 100);
    expect(r.status).toBe('pass');
    expect(r.score).toBe(1);
  });
  it('fails when several outputs are severely toxic', () => {
    const r = severeToxicityScore(10, 100); // 10% severe toxicity = 0.9 score = fail
    expect(r.status).toBe('fail');
  });
});

describe('toxicityDifferentialScore', () => {
  it('passes when output is less toxic than input', () => {
    const r = toxicityDifferentialScore(0.02, 0.1);
    expect(r.status).toBe('pass');
  });
  it('fails when model amplifies toxicity', () => {
    const r = toxicityDifferentialScore(0.5, 0.05); // Large amplification = fail
    expect(r.status).toBe('fail');
  });
  it('returns correct shape', () => {
    expectMetricShape(toxicityDifferentialScore(0.05, 0.05));
  });
});

describe('topicToxicityScore', () => {
  it('passes when all topics have low toxicity', () => {
    const r = topicToxicityScore(TOPIC_TOX_LOW);
    expect(r.status).toBe('pass');
  });
  it('fails when any topic has high toxicity', () => {
    const r = topicToxicityScore(TOPIC_TOX_HIGH);
    expect(r.status).toBe('fail');
  });
  it('handles empty topics', () => {
    const r = topicToxicityScore({});
    expect(r.value).toBe(0);
  });
});

describe('guardrailCatchScore', () => {
  it('passes when guardrails catch most toxic inputs', () => {
    const r = guardrailCatchScore(95, 100);
    expect(r.status).toBe('pass');
  });
  it('fails when guardrails miss many toxic inputs', () => {
    const r = guardrailCatchScore(50, 100);
    expect(r.status).toBe('fail');
  });
  it('returns 1 when no toxic inputs', () => {
    const r = guardrailCatchScore(0, 0);
    expect(r.score).toBe(1);
  });
});

describe('calculateToxicityScore', () => {
  it('produces weighted score between 0 and 1', () => {
    const { score } = calculateToxicityScore({ overall: 0.97, severe: 0.99, diff: 0.95, topic: 0.92, guard: 0.88 });
    expect(score).toBeGreaterThan(0.8);
    expect(score).toBeLessThanOrEqual(1);
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// PRIVACY (5 metrics)
// ════════════════════════════════════════════════════════════════════════════════

describe('piiLeakageScore', () => {
  it('passes with minimal PII in outputs', () => {
    const r = piiLeakageScore(2, 100);
    expect(r.status).toBe('pass');
  });
  it('fails with high PII leakage', () => {
    const r = piiLeakageScore(20, 100);
    expect(r.status).toBe('fail');
  });
  it('returns correct shape', () => {
    expectMetricShape(piiLeakageScore(0, 100));
  });
});

describe('phiLeakageScore', () => {
  it('passes with zero PHI leakage', () => {
    const r = phiLeakageScore(0, 100);
    expect(r.status).toBe('pass');
    expect(r.score).toBe(1);
  });
  it('fails with any PHI leakage above 1%', () => {
    const r = phiLeakageScore(10, 100); // 10% PHI leakage = fail
    expect(r.status).toBe('fail');
  });
});

describe('redactionCoverageScore', () => {
  it('passes when almost all PII is redacted', () => {
    const r = redactionCoverageScore(98, 100);
    expect(r.status).toBe('pass');
  });
  it('fails when too little PII is redacted', () => {
    const r = redactionCoverageScore(50, 100);
    expect(r.status).toBe('fail');
  });
  it('returns 1 when nothing to redact', () => {
    const r = redactionCoverageScore(0, 0);
    expect(r.score).toBe(1);
  });
});

describe('secretsExposureScore', () => {
  it('passes with zero secrets in output', () => {
    const r = secretsExposureScore(0, 100);
    expect(r.status).toBe('pass');
  });
  it('fails with secrets in outputs', () => {
    const r = secretsExposureScore(10, 100); // 10% secrets exposure = fail
    expect(r.status).toBe('fail');
  });
});

describe('minimizationScore', () => {
  it('passes when most prompts follow data minimization', () => {
    const r = minimizationScore(95, 100);
    expect(r.status).toBe('pass');
  });
  it('fails when many prompts have unnecessary PII', () => {
    const r = minimizationScore(60, 100);
    expect(r.status).toBe('fail');
  });
});

describe('calculatePrivacyScore', () => {
  it('produces weighted score between 0 and 1', () => {
    const { score } = calculatePrivacyScore({ pii: 0.97, phi: 0.99, redact: 0.95, secrets: 0.99, min: 0.92 });
    expect(score).toBeGreaterThan(0.9);
    expect(score).toBeLessThanOrEqual(1);
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// EXPLAINABILITY (5 metrics) — uses fixed function name: clarityScore
// ════════════════════════════════════════════════════════════════════════════════

describe('clarityScore', () => {
  it('passes with high clarity rating', () => {
    const r = clarityScore(4.5, 5);
    expect(r.status).toBe('pass');
  });
  it('fails with low clarity rating', () => {
    const r = clarityScore(2.5, 5);
    expect(r.status).toBe('fail');
  });
  it('returns correct shape', () => {
    expectMetricShape(clarityScore(3, 5));
  });
});

describe('explanationFaithfulnessScore', () => {
  it('passes with high faithfulness rating', () => {
    const r = explanationFaithfulnessScore(4.2, 5);
    expect(r.status).toBe('pass');
  });
  it('fails with low faithfulness rating', () => {
    const r = explanationFaithfulnessScore(2, 5);
    expect(r.status).toBe('fail');
  });
});

describe('coverageScore', () => {
  it('passes when most outputs have explanations', () => {
    const r = coverageScore(95, 100);
    expect(r.status).toBe('pass');
  });
  it('fails when few outputs have explanations', () => {
    const r = coverageScore(50, 100);
    expect(r.status).toBe('fail');
  });
  it('handles zero outputs', () => {
    const r = coverageScore(0, 0);
    expect(r.value).toBe(0);
  });
});

describe('actionabilityScore', () => {
  it('passes with actionable explanations', () => {
    const r = actionabilityScore(4, 5);
    expect(r.status).toBe('pass');
  });
  it('fails with non-actionable explanations', () => {
    const r = actionabilityScore(2, 5);
    expect(r.status).toBe('fail');
  });
});

describe('simplicityScore', () => {
  it('passes with high simplicity', () => {
    const r = simplicityScore(0.85);
    expect(r.status).toBe('pass');
  });
  it('fails with low simplicity', () => {
    const r = simplicityScore(0.3);
    expect(r.status).toBe('fail');
  });
  it('returns correct shape', () => {
    expectMetricShape(simplicityScore(0.7));
  });
});

describe('calculateExplainabilityScore', () => {
  it('produces weighted score between 0 and 1', () => {
    const { score } = calculateExplainabilityScore({ clarity: 0.9, faith: 0.85, coverage: 0.95, action: 0.8, simple: 0.75 });
    expect(score).toBeGreaterThan(0.8);
    expect(score).toBeLessThanOrEqual(1);
  });
  it('returns formula and breakdown', () => {
    const r = calculateExplainabilityScore({ clarity: 1, faith: 1, coverage: 1, action: 1, simple: 1 });
    expect(r.formula).toContain('=');
    expect(r.breakdown).toHaveProperty('clarity');
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// OVERALL RAI SCORE
// ════════════════════════════════════════════════════════════════════════════════

describe('calculateOverallRAIScore', () => {
  it('produces score between 0 and 1 with all pillars', () => {
    const { score } = calculateOverallRAIScore({ fairness: 0.9, hallucination: 0.85, toxicity: 0.95, privacy: 0.92, explainability: 0.8 });
    expect(score).toBeGreaterThan(80);
    expect(score).toBeLessThanOrEqual(100);
  });
  it('handles missing pillars gracefully', () => {
    const { score } = calculateOverallRAIScore({ fairness: 0.8 });
    expect(score).toBeGreaterThanOrEqual(0);
  });
  it('returns formula string', () => {
    const r = calculateOverallRAIScore({ fairness: 1, hallucination: 1, toxicity: 1, privacy: 1, explainability: 1 });
    expect(r.formula).toContain('=');
  });
});
