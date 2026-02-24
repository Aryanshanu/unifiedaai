/**
 * JSON-Schema-based YAML validator for semantic metric definitions.
 * Enforces the OSI v1.0 structure with strict rules.
 */

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ParsedMetric {
  name?: string;
  display_name?: string;
  description?: string;
  owner?: string;
  grain?: string;
  sql?: string;
  synonyms?: string[];
  ai_context?: string;
  governance?: {
    sensitivity?: string;
    eu_ai_act_article?: string;
    refresh_cadence?: string;
  };
}

const VALID_GRAINS = ['customer', 'transaction', 'daily', 'monthly', 'entity'];
const VALID_SENSITIVITIES = ['public', 'internal', 'confidential', 'business-critical'];
const SNAKE_CASE_REGEX = /^[a-z0-9_]+$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Parses a simple YAML metric definition into a structured object.
 * Handles the metric block with nested fields, multiline SQL, and synonym lists.
 */
export function parseMetricYaml(yaml: string): ParsedMetric {
  const parsed: ParsedMetric = {};
  const lines = yaml.split('\n');
  let inSql = false;
  let sqlLines: string[] = [];
  let inSynonyms = false;
  const synonyms: string[] = [];
  let inGovernance = false;
  const governance: ParsedMetric['governance'] = {};

  for (const line of lines) {
    const trimmed = line.trim();

    if (inSql) {
      if (line.startsWith('    ') || line.startsWith('\t\t') || (trimmed && !trimmed.includes(':') && !trimmed.startsWith('-'))) {
        if (line.startsWith('    ') || line.startsWith('\t\t')) {
          sqlLines.push(trimmed);
          continue;
        }
      }
      inSql = false;
      parsed.sql = sqlLines.join('\n');
    }

    if (inSynonyms) {
      if (trimmed.startsWith('- ')) {
        synonyms.push(trimmed.slice(2).trim().replace(/^["']|["']$/g, ''));
        continue;
      }
      inSynonyms = false;
      parsed.synonyms = synonyms;
    }

    if (inGovernance) {
      if (line.startsWith('    ') || line.startsWith('\t\t')) {
        if (trimmed.startsWith('sensitivity:')) governance.sensitivity = trimmed.split(':').slice(1).join(':').trim().replace(/^["']|["']$/g, '');
        else if (trimmed.startsWith('eu_ai_act_article:')) governance.eu_ai_act_article = trimmed.split(':').slice(1).join(':').trim().replace(/^["']|["']$/g, '');
        else if (trimmed.startsWith('refresh_cadence:')) governance.refresh_cadence = trimmed.split(':').slice(1).join(':').trim().replace(/^["']|["']$/g, '');
        continue;
      }
      inGovernance = false;
      parsed.governance = governance;
    }

    if (trimmed.startsWith('name:')) parsed.name = trimmed.split(':').slice(1).join(':').trim().replace(/^["']|["']$/g, '');
    else if (trimmed.startsWith('display_name:')) parsed.display_name = trimmed.split(':').slice(1).join(':').trim().replace(/^["']|["']$/g, '');
    else if (trimmed.startsWith('description:')) parsed.description = trimmed.split(':').slice(1).join(':').trim().replace(/^["']|["']$/g, '');
    else if (trimmed.startsWith('owner:')) parsed.owner = trimmed.split(':').slice(1).join(':').trim();
    else if (trimmed.startsWith('grain:')) parsed.grain = trimmed.split(':').slice(1).join(':').trim();
    else if (trimmed.startsWith('ai_context:')) parsed.ai_context = trimmed.split(':').slice(1).join(':').trim().replace(/^["']|["']$/g, '');
    else if (trimmed === 'sql: |') { inSql = true; sqlLines = []; }
    else if (trimmed === 'synonyms:') { inSynonyms = true; }
    else if (trimmed === 'governance:') { inGovernance = true; }
  }

  if (inSql && sqlLines.length > 0) parsed.sql = sqlLines.join('\n');
  if (inSynonyms && synonyms.length > 0) parsed.synonyms = synonyms;
  if (inGovernance && Object.keys(governance).length > 0) parsed.governance = governance;

  return parsed;
}

/**
 * Validates a parsed metric against the JSON Schema rules.
 * Returns an array of validation errors/warnings.
 */
export function validateMetric(parsed: ParsedMetric): ValidationError[] {
  const errors: ValidationError[] = [];

  // Required: name
  if (!parsed.name) {
    errors.push({ field: 'name', message: 'Required field: name', severity: 'error' });
  } else if (!SNAKE_CASE_REGEX.test(parsed.name)) {
    errors.push({ field: 'name', message: 'Name must be snake_case (a-z, 0-9, underscore only)', severity: 'error' });
  }

  // Required: display_name
  if (!parsed.display_name) {
    errors.push({ field: 'display_name', message: 'Required field: display_name', severity: 'error' });
  }

  // Required: sql
  if (!parsed.sql) {
    errors.push({ field: 'sql', message: 'Required field: sql (use sql: | for multiline)', severity: 'error' });
  } else if (parsed.sql.length < 10) {
    errors.push({ field: 'sql', message: 'SQL logic must be at least 10 characters', severity: 'error' });
  }

  // Required: grain
  if (!parsed.grain) {
    errors.push({ field: 'grain', message: 'Required field: grain', severity: 'error' });
  } else if (!VALID_GRAINS.includes(parsed.grain)) {
    errors.push({ field: 'grain', message: `Grain must be one of: ${VALID_GRAINS.join(', ')}`, severity: 'error' });
  }

  // Required: owner (email)
  if (!parsed.owner) {
    errors.push({ field: 'owner', message: 'Required field: owner (email)', severity: 'error' });
  } else if (!EMAIL_REGEX.test(parsed.owner)) {
    errors.push({ field: 'owner', message: 'Owner must be a valid email address', severity: 'error' });
  }

  // Optional: synonyms uniqueness
  if (parsed.synonyms) {
    const unique = new Set(parsed.synonyms.map(s => s.toLowerCase()));
    if (unique.size !== parsed.synonyms.length) {
      errors.push({ field: 'synonyms', message: 'Synonyms must be unique', severity: 'warning' });
    }
  }

  // Optional: governance.sensitivity
  if (parsed.governance?.sensitivity && !VALID_SENSITIVITIES.includes(parsed.governance.sensitivity)) {
    errors.push({ field: 'governance.sensitivity', message: `Sensitivity must be one of: ${VALID_SENSITIVITIES.join(', ')}`, severity: 'warning' });
  }

  return errors;
}

/**
 * Full validation pipeline: parse YAML then validate.
 */
export function validateMetricYaml(yaml: string): { parsed: ParsedMetric; errors: ValidationError[] } {
  try {
    const parsed = parseMetricYaml(yaml);
    const errors = validateMetric(parsed);
    return { parsed, errors };
  } catch {
    return {
      parsed: {},
      errors: [{ field: 'yaml', message: 'Failed to parse YAML structure', severity: 'error' }],
    };
  }
}
