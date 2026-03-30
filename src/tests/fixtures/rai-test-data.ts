// Reusable test fixtures for RAI formula tests

// Fairness
export const EQUAL_GROUP_RATES = { GroupA: 0.8, GroupB: 0.8 };
export const BIASED_GROUP_RATES = { GroupA: 0.9, GroupB: 0.5 };
export const THREE_GROUP_RATES = { GroupA: 0.8, GroupB: 0.75, GroupC: 0.72 };
export const SINGLE_GROUP = { GroupA: 0.8 };

// Hallucination
export const ZERO_HALLUCINATION = { hallucinatoryResponses: 0, totalResponses: 100 };
export const HIGH_HALLUCINATION = { hallucinatoryResponses: 50, totalResponses: 100 };

// Toxicity
export const ZERO_TOXIC = { toxicOutputs: 0, totalOutputs: 100 };
export const HIGH_TOXIC = { toxicOutputs: 20, totalOutputs: 100 };
export const TOPIC_TOX_LOW = { religion: 0.02, politics: 0.03, gender: 0.01 };
export const TOPIC_TOX_HIGH = { religion: 0.02, politics: 0.35, gender: 0.01 };

// Privacy
export const ZERO_PII = { outputsWithPII: 0, totalOutputs: 100 };
export const HIGH_PII = { outputsWithPII: 15, totalOutputs: 100 };

// Explainability
export const PERFECT_CLARITY = { avgClarityRating: 5, maxRating: 5 };
export const LOW_CLARITY = { avgClarityRating: 2, maxRating: 5 };

// Composite scores (all perfect)
export const PERFECT_FAIRNESS_METRICS = { dp: 1, eo: 1, eodds: 1, glr: 1, bias: 1 };
export const ZERO_FAIRNESS_METRICS = { dp: 0, eo: 0, eodds: 0, glr: 0, bias: 0 };
export const PERFECT_HALLUCINATION_METRICS = { resp: 1, claim: 1, faith: 1, span: 1, abstain: 1 };
export const PERFECT_TOXICITY_METRICS = { overall: 1, severe: 1, diff: 1, topic: 1, guard: 1 };
export const PERFECT_PRIVACY_METRICS = { pii: 1, phi: 1, redact: 1, secrets: 1, min: 1 };
export const PERFECT_EXPLAINABILITY_METRICS = { clarity: 1, faith: 1, coverage: 1, action: 1, simple: 1 };
