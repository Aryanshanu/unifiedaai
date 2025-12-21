// ============================================
// FRACTAL RAI-OS: SHARED AUTH HELPER
// Secure authentication & authorization utilities
// ============================================

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export type AppRole = 'admin' | 'reviewer' | 'analyst' | 'viewer';

export interface AuthenticatedUser {
  id: string;
  email?: string;
  roles: AppRole[];
}

export interface AuthResult {
  user: AuthenticatedUser | null;
  error: string | null;
  supabase: SupabaseClient | null;
}

/**
 * Validates the user session from the Authorization header
 * Returns the authenticated user with their roles
 */
export async function validateSession(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get("Authorization");
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { 
      user: null, 
      error: "Missing or invalid Authorization header", 
      supabase: null 
    };
  }

  const token = authHeader.replace("Bearer ", "");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  // Create client with user's JWT - this respects RLS
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } }
  });

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return { 
        user: null, 
        error: authError?.message || "Invalid authentication token", 
        supabase: null 
      };
    }

    // Fetch user roles using service role (roles may not be accessible via anon key)
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey);
    
    const { data: userRoles } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const roles = (userRoles || []).map(r => r.role as AppRole);

    return {
      user: {
        id: user.id,
        email: user.email,
        roles,
      },
      error: null,
      supabase,
    };
  } catch (err) {
    return {
      user: null,
      error: err instanceof Error ? err.message : "Authentication failed",
      supabase: null,
    };
  }
}

/**
 * Check if user has at least one of the required roles
 */
export function hasAnyRole(user: AuthenticatedUser, requiredRoles: AppRole[]): boolean {
  return requiredRoles.some(role => user.roles.includes(role));
}

/**
 * Check if user has a specific role
 */
export function hasRole(user: AuthenticatedUser, role: AppRole): boolean {
  return user.roles.includes(role);
}

/**
 * Require authentication - returns error response if not authenticated
 */
export function requireAuth(authResult: AuthResult): Response | null {
  if (!authResult.user) {
    return new Response(
      JSON.stringify({ 
        error: "UNAUTHORIZED", 
        message: authResult.error || "Authentication required" 
      }),
      { 
        status: 401, 
        headers: { "Content-Type": "application/json" } 
      }
    );
  }
  return null;
}

/**
 * Require specific roles - returns error response if user doesn't have required role
 */
export function requireRoles(user: AuthenticatedUser, requiredRoles: AppRole[]): Response | null {
  if (!hasAnyRole(user, requiredRoles)) {
    return new Response(
      JSON.stringify({ 
        error: "FORBIDDEN", 
        message: `Required roles: ${requiredRoles.join(', ')}`,
        user_roles: user.roles,
      }),
      { 
        status: 403, 
        headers: { "Content-Type": "application/json" } 
      }
    );
  }
  return null;
}

/**
 * Check if user owns a system or has admin/analyst role
 */
export async function canAccessSystem(
  user: AuthenticatedUser,
  systemId: string
): Promise<{ allowed: boolean; system: any | null; error: string | null }> {
  if (hasAnyRole(user, ['admin', 'analyst'])) {
    // Admin/analyst can access any system - fetch it
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const adminClient = createClient(supabaseUrl, serviceKey);
    
    const { data: system, error } = await adminClient
      .from("systems")
      .select("*, projects(*)")
      .eq("id", systemId)
      .single();
    
    if (error || !system) {
      return { allowed: false, system: null, error: "System not found" };
    }
    
    return { allowed: true, system, error: null };
  }

  // For non-admin users, check ownership via RLS
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` } }
  });

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const adminClient = createClient(supabaseUrl, serviceKey);
  
  const { data: system, error } = await adminClient
    .from("systems")
    .select("*, projects(*)")
    .eq("id", systemId)
    .single();

  if (error || !system) {
    return { allowed: false, system: null, error: "System not found" };
  }

  // Check ownership
  if (system.owner_id === user.id) {
    return { allowed: true, system, error: null };
  }

  return { allowed: false, system: null, error: "Access denied to this system" };
}

/**
 * Check if user owns a model or has admin/analyst role
 */
export async function canAccessModel(
  user: AuthenticatedUser,
  modelId: string
): Promise<{ allowed: boolean; model: any | null; error: string | null }> {
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const adminClient = createClient(supabaseUrl, serviceKey);

  const { data: model, error } = await adminClient
    .from("models")
    .select("*, systems(*)")
    .eq("id", modelId)
    .single();

  if (error || !model) {
    return { allowed: false, model: null, error: "Model not found" };
  }

  // Admin/analyst can access any model
  if (hasAnyRole(user, ['admin', 'analyst'])) {
    return { allowed: true, model, error: null };
  }

  // Check ownership
  if (model.owner_id === user.id) {
    return { allowed: true, model, error: null };
  }

  return { allowed: false, model: null, error: "Access denied to this model" };
}

/**
 * Rate limiting helper (in-memory, per-function instance)
 */
const rateLimits = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  identifier: string, 
  limit: number = 100, 
  windowMs: number = 60000
): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const record = rateLimits.get(identifier);

  if (!record || now > record.resetAt) {
    rateLimits.set(identifier, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetIn: windowMs };
  }

  if (record.count >= limit) {
    return { 
      allowed: false, 
      remaining: 0, 
      resetIn: record.resetAt - now 
    };
  }

  record.count++;
  return { 
    allowed: true, 
    remaining: limit - record.count, 
    resetIn: record.resetAt - now 
  };
}

/**
 * Get service role client for operations that need full access
 * USE SPARINGLY - only for system operations, not user-facing requests
 */
export function getServiceClient(): SupabaseClient {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(supabaseUrl, serviceKey);
}

/**
 * Standard CORS headers
 */
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-rate-limit-bypass",
};

/**
 * Create error response with CORS headers
 */
export function errorResponse(
  message: string, 
  status: number = 400, 
  details?: Record<string, unknown>
): Response {
  return new Response(
    JSON.stringify({ error: message, ...details }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

/**
 * Create success response with CORS headers
 */
export function successResponse(data: unknown, status: number = 200): Response {
  return new Response(
    JSON.stringify(data),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
