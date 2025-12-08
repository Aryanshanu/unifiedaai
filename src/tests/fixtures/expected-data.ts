// Minimum required data counts for Fractal RAI-OS - December 2025
// These are the absolute minimum counts that must exist for the platform to be considered functional

export const MINIMUM_COUNTS = {
  request_logs: 250,
  drift_alerts: 30,
  incidents: 15,
  review_queue: 40,
  red_team_campaigns: 5,
  policy_violations: 12,
  control_assessments: 50,
  attestations: 3,
  decisions: 8,
  projects: 1,
  systems: 1,
  models: 1,
} as const;

export const EU_AI_ACT_CONTROL_COUNT = 42;

export const REQUIRED_SCORECARD_ELEMENTS = [
  'EU AI Act',
  'SHA-256',
  'December 2025',
  'Fractal RAI-OS',
] as const;

export const GOLDEN_DEMO_STEPS = 7;

export const TEST_CATEGORIES = {
  DATA_POPULATION: 'Data Population',
  BUTTON_FUNCTIONALITY: 'Button Functionality',
  UI_COMPONENTS: 'UI Components',
  REALTIME: 'Realtime Updates',
  WORKFLOWS: 'Complete Workflows',
  PAGE_LOADS: 'Page Loads',
} as const;

export type TestCategory = typeof TEST_CATEGORIES[keyof typeof TEST_CATEGORIES];

export interface TestResult {
  id: number;
  name: string;
  category: TestCategory;
  passed: boolean;
  error?: string;
  healingAttempted?: boolean;
  healingSucceeded?: boolean;
  duration?: number;
}

export interface TestSuiteResult {
  totalTests: number;
  passed: number;
  failed: number;
  healed: number;
  duration: number;
  results: TestResult[];
  verdict: 'PASS' | 'FAIL';
  timestamp: string;
}
