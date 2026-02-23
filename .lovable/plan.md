

# Theme Toggle + Branding Unification

## Two Changes

### 1. Dark/Light Theme Toggle

The app currently only has a dark theme (CSS variables in `:root`). The `next-themes` package is already installed but no `ThemeProvider` wraps the app. The Sonner toaster already imports `useTheme` from `next-themes` but it always falls back to "system" since there's no provider.

**What will change:**

- **`src/index.css`**: Add a full `.light` (or just use `:root` for light, `.dark` for dark) theme block with professional light-mode CSS variables (white/slate backgrounds, same indigo primary, adjusted shadows and glows)
- **`index.html`**: Add `class="dark"` to `<html>` tag so the default remains dark
- **`src/App.tsx`**: Wrap everything in `<ThemeProvider>` from `next-themes` with `attribute="class"`, `defaultTheme="dark"`, `storageKey="fractal-theme"`
- **`src/components/layout/Header.tsx`**: Add a Sun/Moon toggle button next to the notification bell that calls `setTheme()` from `useTheme()`
- **`src/components/layout/Sidebar.tsx`**: Add a small theme toggle icon at the bottom (next to the collapse button)

**Light theme palette:**
- Background: clean white (#fafbfc)
- Card: white with subtle gray borders
- Sidebar: light slate (#f1f5f9)
- Primary: same deep indigo (works on both)
- Text: dark slate
- Risk colors: same hues, slightly adjusted for contrast on light backgrounds

### 2. Branding: "Fractal Unified Autonomous Governance Platform"

Replace ALL instances of "Fractal Unified-OS" and "Autonomous Governance Platform" with the unified name across **9 files**:

| File | Old Text | New Text |
|------|----------|----------|
| `index.html` (title, og:title, twitter:title) | "Fractal Unified-OS -- Autonomous Governance Platform" | "Fractal Unified Autonomous Governance Platform" |
| `src/components/layout/GlobalBanner.tsx` | "Fractal Unified-OS -- Autonomous Governance Platform" | "Fractal Unified Autonomous Governance Platform" |
| `src/components/layout/Footer.tsx` | "Fractal Unified-OS" + "Autonomous Governance Platform" | "Fractal Unified Autonomous Governance Platform" |
| `src/components/layout/Sidebar.tsx` | "Fractal Unified Governance" | "Fractal Unified Autonomous Governance" |
| `src/pages/Auth.tsx` | "Fractal Unified-OS" + "Autonomous Governance Platform" | "Fractal Unified Autonomous Governance Platform" |
| `src/components/error/ErrorBoundary.tsx` | "Fractal Unified-OS . Autonomous Governance Platform" | "Fractal Unified Autonomous Governance Platform" |
| `src/components/governance/AttestationSigner.tsx` | "FRACTAL UNIFIED-OS" | "FRACTAL UNIFIED AUTONOMOUS GOVERNANCE" |
| `supabase/functions/rai-assistant/index.ts` | Multiple "Fractal Unified-OS" references | "Fractal Unified Autonomous Governance Platform" |
| `supabase/functions/send-notification/index.ts` | "Fractal Unified-OS" | "Fractal Unified Autonomous Governance Platform" |
| `supabase/functions/generate-audit-report/index.ts` | "FRACTAL UNIFIED-OS" | "FRACTAL UNIFIED AUTONOMOUS GOVERNANCE" |

---

## Technical Details

### Light Theme CSS Variables (added to `src/index.css`)

```css
:root {
  /* Light theme by default for :root, overridden by .dark */
  --background: 220 20% 97%;
  --foreground: 222 47% 11%;
  --card: 0 0% 100%;
  --card-foreground: 222 47% 11%;
  --popover: 0 0% 100%;
  --popover-foreground: 222 47% 11%;
  --primary: 232 47% 48%;
  --primary-foreground: 210 40% 98%;
  --primary-glow: 232 47% 58%;
  --secondary: 220 14% 92%;
  --secondary-foreground: 222 47% 11%;
  --muted: 220 14% 94%;
  --muted-foreground: 220 8% 46%;
  --accent: 232 40% 92%;
  --accent-foreground: 232 47% 30%;
  --destructive: 0 72% 48%;
  --destructive-foreground: 210 40% 98%;
  --success: 152 55% 42%;
  --warning: 38 80% 48%;
  --danger: 0 65% 48%;
  --risk-critical: 0 72% 48%;
  --risk-high: 38 80% 48%;
  --risk-medium: 45 70% 50%;
  --risk-low: 215 20% 55%;
  --border: 220 13% 87%;
  --input: 220 13% 91%;
  --ring: 232 47% 48%;
  --sidebar-background: 220 14% 96%;
  --sidebar-foreground: 222 47% 20%;
  /* ... remaining sidebar vars */
}

.dark {
  /* Current dark theme values moved here */
  --background: 222 47% 7%;
  --foreground: 210 40% 96%;
  /* ... all existing dark values */
}
```

### ThemeProvider Setup (`src/App.tsx`)

```tsx
import { ThemeProvider } from "next-themes";

const App = () => (
  <ErrorBoundary>
    <ThemeProvider attribute="class" defaultTheme="dark" storageKey="fractal-theme">
      <QueryClientProvider client={queryClient}>
        ...
      </QueryClientProvider>
    </ThemeProvider>
  </ErrorBoundary>
);
```

### Theme Toggle Button (`src/components/layout/Header.tsx`)

Add a Sun/Moon icon button between the notification bell and user menu that toggles between light and dark themes using `useTheme()` from `next-themes`.

### Files Modified (Total: 13)

| # | File | Change |
|---|------|--------|
| 1 | `src/index.css` | Move dark vars to `.dark`, add light vars to `:root` |
| 2 | `index.html` | Add `class="dark"` to html tag, update title/meta branding |
| 3 | `src/App.tsx` | Wrap in `ThemeProvider` |
| 4 | `src/components/layout/Header.tsx` | Add theme toggle button |
| 5 | `src/components/layout/GlobalBanner.tsx` | Update branding text |
| 6 | `src/components/layout/Footer.tsx` | Update branding text |
| 7 | `src/components/layout/Sidebar.tsx` | Update branding text |
| 8 | `src/pages/Auth.tsx` | Update branding text |
| 9 | `src/components/error/ErrorBoundary.tsx` | Update branding text |
| 10 | `src/components/governance/AttestationSigner.tsx` | Update branding text |
| 11 | `supabase/functions/rai-assistant/index.ts` | Update branding text |
| 12 | `supabase/functions/send-notification/index.ts` | Update branding text |
| 13 | `supabase/functions/generate-audit-report/index.ts` | Update branding text |

