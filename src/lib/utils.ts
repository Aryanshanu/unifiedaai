import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a raw model identifier (e.g. "openai/gpt-oss-120b:free") into a
 * human-readable display name (e.g. "GPT OSS 120B").
 */
export function formatModelName(name: string): string {
  if (!name) return name;
  // Strip variant suffixes like :free, :pro, :beta, :preview
  let clean = name.replace(/:(free|pro|beta|preview|latest)$/i, '').trim();
  // If it has a provider prefix (e.g. "openai/gpt-4o"), take only the model part
  if (clean.includes('/')) {
    clean = clean.split('/').slice(1).join('/');
  }
  // Replace hyphens/underscores with spaces
  clean = clean.replace(/[-_]/g, ' ');
  // Title-case every word
  clean = clean.replace(/\b\w/g, c => c.toUpperCase());
  // Make size tokens uppercase: 7b → 7B, 70b → 70B, 3.3 stays
  clean = clean.replace(/\b(\d+(\.\d+)?[Bb])\b/g, m => m.toUpperCase());
  return clean;
}

/**
 * Returns a short provider label from a raw model name like "openai/gpt-4o".
 * Returns null if no provider prefix is present.
 */
export function getModelProvider(name: string): string | null {
  if (!name || !name.includes('/')) return null;
  const prefix = name.split('/')[0].toLowerCase();
  const map: Record<string, string> = {
    'openai': 'OpenAI',
    'meta-llama': 'Meta',
    'meta': 'Meta',
    'qwen': 'Qwen',
    'nvidia': 'NVIDIA',
    'google': 'Google',
    'anthropic': 'Anthropic',
    'mistralai': 'Mistral',
    'cohere': 'Cohere',
    'deepseek': 'DeepSeek',
    'microsoft': 'Microsoft',
  };
  return map[prefix] ?? prefix.charAt(0).toUpperCase() + prefix.slice(1);
}
