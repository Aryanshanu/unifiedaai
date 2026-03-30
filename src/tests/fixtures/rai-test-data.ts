// Reusable test fixtures for RAI formula unit tests
export const EQUAL_GROUP_RATES = { GroupA: 0.8, GroupB: 0.8 };
export const BIASED_GROUP_RATES = { GroupA: 0.9, GroupB: 0.5 };
export const THREE_GROUP_RATES = { GroupA: 0.8, GroupB: 0.75, GroupC: 0.72 };

export const PERFECT_GROUP_TPRS = { GroupA: 0.9, GroupB: 0.9 };
export const UNEQUAL_GROUP_TPRS = { GroupA: 0.95, GroupB: 0.6 };

export const EQUAL_GROUP_FPRS = { GroupA: 0.1, GroupB: 0.1 };
export const UNEQUAL_GROUP_FPRS = { GroupA: 0.05, GroupB: 0.3 };

export const EQUAL_GROUP_LOSSES = { GroupA: 0.2, GroupB: 0.21 };
export const UNEQUAL_GROUP_LOSSES = { GroupA: 0.1, GroupB: 0.5 };

export const EQUAL_BIAS_RATES = { GroupA: 0.05, GroupB: 0.06 };
export const UNEQUAL_BIAS_RATES = { GroupA: 0.02, GroupB: 0.25 };

export const TOPIC_TOX_LOW = { politics: 0.03, religion: 0.04, race: 0.02 };
export const TOPIC_TOX_HIGH = { politics: 0.25, religion: 0.18, race: 0.3 };
