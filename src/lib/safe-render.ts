import { logComponentError } from './error-logger';

/**
 * Safely access nested object properties with optional chaining
 * Returns defaultValue if any part of the path is undefined/null
 */
export function safeGet<T>(
  obj: unknown,
  path: string,
  defaultValue: T
): T {
  try {
    const keys = path.split('.');
    let result: unknown = obj;
    
    for (const key of keys) {
      if (result === null || result === undefined) {
        return defaultValue;
      }
      result = (result as Record<string, unknown>)[key];
    }
    
    return (result ?? defaultValue) as T;
  } catch {
    return defaultValue;
  }
}

/**
 * Safely render a value, returning fallback if undefined/null
 */
export function safeRender<T>(
  value: T | undefined | null,
  fallback: T
): T {
  return value ?? fallback;
}

/**
 * Safely render a number with formatting
 */
export function safeNumber(
  value: number | undefined | null,
  fallback: number = 0,
  options?: { decimals?: number; suffix?: string; prefix?: string }
): string {
  const num = value ?? fallback;
  const formatted = options?.decimals !== undefined 
    ? num.toFixed(options.decimals) 
    : String(num);
  
  return `${options?.prefix || ''}${formatted}${options?.suffix || ''}`;
}

/**
 * Safely render a percentage
 */
export function safePercent(
  value: number | undefined | null,
  fallback: number = 0
): string {
  const num = value ?? fallback;
  return `${Math.round(num * 100) / 100}%`;
}

/**
 * Safely map over an array
 */
export function safeMap<T, R>(
  arr: T[] | undefined | null,
  mapper: (item: T, index: number) => R,
  fallback: R[] = []
): R[] {
  if (!Array.isArray(arr)) return fallback;
  
  try {
    return arr.map(mapper);
  } catch (err) {
    logComponentError('safeMap', err);
    return fallback;
  }
}

/**
 * Safely access array element
 */
export function safeArrayGet<T>(
  arr: T[] | undefined | null,
  index: number,
  fallback: T
): T {
  if (!Array.isArray(arr) || index < 0 || index >= arr.length) {
    return fallback;
  }
  return arr[index] ?? fallback;
}

/**
 * Safely parse JSON
 */
export function safeJsonParse<T>(
  json: string | undefined | null,
  fallback: T
): T {
  if (!json) return fallback;
  
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

/**
 * Safely format a date
 */
export function safeDate(
  date: string | Date | undefined | null,
  fallback: string = 'N/A'
): string {
  if (!date) return fallback;
  
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return fallback;
    return d.toLocaleDateString();
  } catch {
    return fallback;
  }
}

/**
 * Safely format a datetime
 */
export function safeDateTime(
  date: string | Date | undefined | null,
  fallback: string = 'N/A'
): string {
  if (!date) return fallback;
  
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return fallback;
    return d.toLocaleString();
  } catch {
    return fallback;
  }
}

/**
 * Check if a value is empty (null, undefined, empty string, empty array)
 */
export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  if (Array.isArray(value) && value.length === 0) return true;
  if (typeof value === 'object' && Object.keys(value).length === 0) return true;
  return false;
}

/**
 * Safely truncate a string
 */
export function safeTruncate(
  str: string | undefined | null,
  maxLength: number,
  suffix: string = '...'
): string {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - suffix.length) + suffix;
}
