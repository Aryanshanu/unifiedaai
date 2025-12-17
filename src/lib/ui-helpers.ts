export function sanitizeErrorMessage(message: string): string {
  const raw = (message || '').trim();
  const lower = raw.toLowerCase();

  if (
    lower.includes('edge function returned a non-2xx status code') ||
    lower.includes('non-2xx status code')
  ) {
    return 'Temporary service issue. Please retry in a moment.';
  }

  if (lower.includes('not a valid model id')) {
    return 'Model endpoint configuration issue (invalid model identifier). Update the endpoint settings and retry.';
  }

  if (lower.includes('failed to fetch') || lower.includes('networkerror')) {
    return 'Network issue connecting to the service. Please retry.';
  }

  if (lower.includes('jwt') || lower.includes('unauthorized')) {
    return 'Session expired. Please sign in again and retry.';
  }

  return raw || 'Temporary issue. Please retry.';
}

export function downloadJsonFile(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
