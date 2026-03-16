

# Plan: Remove Auth, Role-Only Login

## Problem
Currently the login page requires email/password. User wants visitors to simply pick one of 4 role cards and enter immediately -- no credentials.

## Critical Challenge
All database tables have RLS policies using `auth.uid()` and `has_role()`. Without a real session, every Supabase query returns empty. We must preserve a real session behind the scenes.

## Solution: Anonymous Sign-In + Role Assignment

When a user clicks a role card, we silently create an anonymous session (no email/password visible to the user) and assign the selected role via a secure database function. All existing RLS policies continue working unchanged.

### Step-by-step flow:
1. User visits `/auth` → sees 4 persona cards (no email/password fields)
2. User clicks e.g. "Chief Data & AI Officer"
3. Behind the scenes: `signInAnonymously()` creates a session
4. A SECURITY DEFINER function `assign_own_role(role)` sets their role (bypasses RLS safely)
5. User is redirected to their role's default dashboard
6. "Switch Role" in header → signs out and returns to role picker

---

## Changes

### 1. Database Migration
- Create `assign_own_role(app_role)` SECURITY DEFINER function that deletes existing roles for the calling user and inserts the new one
- Enable anonymous auth via configure_auth tool

### 2. `src/pages/Auth.tsx` — Rewrite
- Remove all email/password UI (SignInForm, SignUpForm, Tabs)
- Show only the 4 RoleSelector cards
- On role click: call `signInAnonymously()`, then invoke `assign_own_role` RPC, then navigate

### 3. `src/hooks/useAuth.tsx` — Simplify
- Remove `signUp` and `signIn` methods
- Add `signInAsRole(role)` method that handles anonymous sign-in + role assignment
- Keep `signOut`, `persona`, `roles`, `hasRole` unchanged
- Keep `fetchUserRoles` unchanged (reads from `user_roles` table as before)

### 4. `src/components/auth/RoleSelector.tsx` — Minor update
- Remove the "Continue" button pattern; clicking a card directly triggers login
- Add loading state per card

### 5. `src/components/layout/Header.tsx` — Update
- Change "Sign Out" label to "Switch Role"
- Remove email display (anonymous users have no email)
- Keep persona name and icon display

### 6. `src/components/auth/ProtectedRoute.tsx` — No changes needed
- Already checks `user` from Supabase session (anonymous users have a valid session)

## What is NOT Disrupted
- All 340+ RLS policies remain untouched (anonymous users get real `auth.uid()`)
- All edge functions remain untouched
- All sidebar filtering by role remains untouched
- All 4 role-specific dashboards remain untouched
- All existing pages and components remain untouched

## Files Summary
| File | Action |
|------|--------|
| Database migration | CREATE — `assign_own_role` function |
| Auth config | UPDATE — enable anonymous sign-in |
| `src/pages/Auth.tsx` | REWRITE — role cards only |
| `src/hooks/useAuth.tsx` | EDIT — add `signInAsRole`, remove `signUp`/`signIn` |
| `src/components/auth/RoleSelector.tsx` | EDIT — direct click login |
| `src/components/layout/Header.tsx` | EDIT — "Switch Role", remove email |
| `src/components/auth/SignInForm.tsx` | DELETE (unused) |
| `src/components/auth/SignUpForm.tsx` | DELETE (unused) |

