/**
 * Shared Claude API helper for all Supabase edge functions.
 *
 * Usage:
 *   import { callClaude, CLAUDE_DEFAULT, CLAUDE_FAST } from "../_shared/claude.ts";
 *   const text = await callClaude(messages, { maxTokens: 1024 });
 *
 * The ANTHROPIC_API_KEY must be set as a Supabase secret:
 *   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
 */

export const CLAUDE_DEFAULT = "claude-opus-4-6";       // Most capable – complex reasoning, governance
export const CLAUDE_FAST    = "claude-haiku-4-5-20251001"; // Fastest / cheapest – classification, simple Q&A

// ─── Error types ──────────────────────────────────────────────────────────────

export class ClaudeError extends Error {
  constructor(
    message: string,
    public readonly code: "RATE_LIMITED" | "AUTH_ERROR" | "MODEL_ERROR" | "NETWORK_ERROR" | "INVALID_KEY",
    public readonly status?: number
  ) {
    super(message);
    this.name = "ClaudeError";
  }
}

// ─── Core call ────────────────────────────────────────────────────────────────

/**
 * Call Claude API.
 *
 * Accepts standard OpenAI-style messages (system / user / assistant roles).
 * System messages are automatically extracted and sent as the Anthropic `system` parameter.
 *
 * Returns the text content of Claude's reply, or throws ClaudeError on failure.
 */
export async function callClaude(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  options: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
    systemOverride?: string; // Prepend to any extracted system messages
  } = {}
): Promise<string> {
  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
  if (!ANTHROPIC_API_KEY) {
    throw new ClaudeError(
      "ANTHROPIC_API_KEY is not configured. Add it via: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...",
      "INVALID_KEY"
    );
  }

  const model       = options.model      ?? CLAUDE_DEFAULT;
  const maxTokens   = options.maxTokens  ?? 2048;
  const temperature = options.temperature ?? 0.3;

  // Extract system messages — Anthropic requires them as a top-level `system` field
  const systemParts: string[] = [];
  if (options.systemOverride) systemParts.push(options.systemOverride);

  const filteredMessages: Array<{ role: "user" | "assistant"; content: string }> = [];
  for (const msg of messages) {
    if (msg.role === "system") {
      systemParts.push(msg.content);
    } else {
      filteredMessages.push({ role: msg.role as "user" | "assistant", content: msg.content });
    }
  }

  // Anthropic requires at least one user message
  if (filteredMessages.length === 0) {
    filteredMessages.push({ role: "user", content: "Begin." });
  }

  const body: Record<string, unknown> = {
    model,
    max_tokens: maxTokens,
    messages: filteredMessages,
    temperature,
  };
  if (systemParts.length > 0) {
    body.system = systemParts.join("\n\n");
  }

  let response: Response;
  try {
    response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });
  } catch (networkErr) {
    throw new ClaudeError(`Network error reaching Anthropic: ${networkErr}`, "NETWORK_ERROR");
  }

  if (response.status === 401 || response.status === 403) {
    throw new ClaudeError("Invalid or expired ANTHROPIC_API_KEY.", "AUTH_ERROR", response.status);
  }
  if (response.status === 429) {
    throw new ClaudeError("Claude API rate limit exceeded. Retry after a moment.", "RATE_LIMITED", 429);
  }
  if (!response.ok) {
    const errText = await response.text().catch(() => "(unreadable)");
    throw new ClaudeError(`Claude API error ${response.status}: ${errText}`, "MODEL_ERROR", response.status);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text;
  if (!text) {
    throw new ClaudeError("Claude returned an empty response.", "MODEL_ERROR");
  }

  return text;
}

// ─── Convenience helpers ──────────────────────────────────────────────────────

/** Build a standard error response JSON for functions that need to surface errors. */
export function claudeErrorResponse(err: unknown): {
  status: "error";
  error_code: string;
  error_message: string;
} {
  if (err instanceof ClaudeError) {
    return { status: "error", error_code: err.code, error_message: err.message };
  }
  return {
    status: "error",
    error_code: "UNKNOWN_ERROR",
    error_message: err instanceof Error ? err.message : "An unexpected error occurred.",
  };
}
