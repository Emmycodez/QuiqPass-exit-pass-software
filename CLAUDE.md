# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**QuiqPass** is an exit pass management system for private universities, built with React Router v7. It provides role-based dashboards for students, DSA (Dean of Student Affairs), CSO (Chief Security Officer), and admin staff to manage pass requests digitally.

- **Framework:** React Router v7 (full-stack SSR)
- **Language:** TypeScript
- **Styling:** TailwindCSS + ShadcnUI
- **Auth & Database:** Supabase
- **Deployment:** Vercel
- **Package Managers:** npm, pnpm, or bun

## Development Commands

```bash
# Development server (with HMR)
npm run dev

# Production build
npm run build

# Type checking (includes TypeScript compilation)
npm run typecheck

# Start production server
npm start
```

**Notes:**
- Dev server runs on `http://localhost:5173`
- Always run `npm run typecheck` before committing to catch TypeScript errors
- No test suite is currently configured

## Architecture & Key Concepts

### Routing Structure

The app uses **file-based routing** with React Router v7. Routes are defined in `app/routes.ts` and organized into feature-based layout groups:

- **`/auth`** - Login, register, onboarding, staff login, OAuth callback
- **`/student-dashboard`** - Student dashboard, apply for pass, view requests, profile, notifications
- **`/dsa-dashboard`** - DSA view (dean management), analytics, pass requests
- **`/cso-dashboard`** - CSO dashboard (security chief)
- **`/admin`** - Admin panel
- **`/`** (home) - Public landing page

Each dashboard has a dedicated layout file (`layout.tsx`) that wraps route-specific pages. Layouts handle navigation, common UI, and auth checks.

**Key Layout Files:**
- `app/root.tsx` - Root HTML layout, error boundary, loader
- `app/routes/home/layout.tsx` - Public home layout
- `app/routes/student_dashboard/layout.tsx` - Student auth layout
- `app/routes/dsa_dashboard/layout.tsx` - DSA auth layout
- `app/routes/cso_dashboard/layout.tsx` - CSO auth layout

### Server-Side Rendering & Prerendering

- **SSR is enabled** by default (`ssr: true` in `react-router.config.ts`)
- **Prerendered routes:** `/`, `/register`, `/login`
- Uses `@vercel/react-router` preset for Vercel deployment
- Server-side code can use `.server` file extensions; client-only code uses `.client`

### Authentication & Session Management

- **Provider:** `AuthProvider` in `app/providers/auth-provider.tsx` wraps the app
- **Session Data:** Retrieved via Supabase SSR client
- **Storage:** Uses `@supabase/ssr` for proper auth state handling across SSR
- **User Session:** Typically accessed via `getUserSessionData()` utility in `app/lib/getUserSessionData.ts`

### Component Organization

- **`app/components/`** - Reusable UI components (likely includes ShadcnUI + custom components)
- **`app/hooks/`** - Custom React hooks (currently has `use-mobile` for responsive logic)
- **`app/lib/`** - Utility functions:
  - `generateInitials.ts` - Generate user initials from names
  - `getUserSessionData.ts` - Fetch current user session
  - `utils.ts` - General utilities
- **`app/providers/`** - Context providers (auth)
- **`app/contexts/`** - React contexts (currently minimal; `auth-context.ts` is empty)
- **`app/services/`** - Service layer (e.g., `getPassStatusService.tsx`)

### Key Code Patterns

1. **Action Functions:** Located in route files (e.g., `student_dashboard/actions.ts`). Handle form submissions and mutations server-side.
2. **Data Loading:** Use React Router's `loader` pattern for fetching data before rendering
3. **Type Safety:** All routes have corresponding types in `.react-router/types/` auto-generated directory
4. **Environment Variables:** Prefixed with `VITE_` for client-side access:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_BASE_URL`

### Role-Based Dashboard Flows

- **Student:** Register → Onboarding → Apply for Pass → View Requests → Track Status
- **DSA:** View applications, approve/forward to CSO, view analytics
- **CSO:** Final approval of pass requests
- **Admin:** System-wide management

## File Path Conventions

- Use `~/*` import alias for app files (maps to `app/*` in `tsconfig.json`)
- Route files: `app/routes/[feature]/[page].tsx`
- Shared components: `app/components/[ComponentName].tsx`
- Utilities: `app/lib/[functionName].ts`

## Deployment Notes

- **Vercel Preset:** Configured in `react-router.config.ts`
- Runs on Node.js runtime with server-side rendering
- `.env.local` (not checked in) can override `.env` for local development

## Tailwind & Styling

- Configured in `tailwind.config.ts`
- Uses ShadcnUI component library (installed via `components.json`)
- Global styles: `app/app.css`
- Theme support via `next-themes`

## Known TODOs

From the codebase:
- Implement proper meta tags and favicon for SEO (in `root.tsx`)
- Host fonts locally instead of loading from Google Fonts
