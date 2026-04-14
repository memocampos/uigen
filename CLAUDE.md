# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start Next.js dev server (Turbopack)
npm run build        # Production build
npm run lint         # ESLint
npm run test         # Vitest test suite
npm run setup        # First-time setup: install deps + Prisma generate + migrate
npm run db:reset     # Force-clear and re-run Prisma migrations

# Run a single test file
npx vitest run src/lib/__tests__/file-system.test.ts
```

## Architecture Overview

**UIGen** is an AI-powered React component generator. Users describe a UI in chat; Claude generates/modifies files in a virtual filesystem; a live iframe renders the result.

### Core Data Flow

1. User sends a message → `POST /api/chat` (streams via Vercel AI SDK)
2. Claude calls tools (`str_replace_editor`, `file_manager`) to modify `VirtualFileSystem`
3. Tool call results are handled in `ChatProvider.onToolCall` → updates FileSystem context
4. `PreviewFrame` picks up the new files and re-renders via Babel (JSX in-browser transform)
5. For authenticated users, the serialized filesystem + messages are persisted to SQLite via Prisma

### Key Layers

| Layer | Location | Purpose |
|---|---|---|
| UI / State | `src/app/`, `src/components/`, `src/lib/contexts/` | Split-panel chat + preview/code view |
| API | `src/app/api/chat/route.ts` | Streaming endpoint with tool calling |
| AI Tools | `src/lib/tools/` | `str_replace_editor` (CRUD files), `file_manager` (rename/delete) |
| Virtual FS | `src/lib/file-system.ts` | In-memory file tree; no disk I/O |
| Persistence | `src/actions/`, `prisma/` | Server actions for auth + project CRUD (SQLite) |
| Preview | `src/components/preview/PreviewFrame.tsx` | Iframe sandbox, Babel standalone, import map |

### Virtual Filesystem

All project files live in a `VirtualFileSystem` instance — never on disk. It serializes to JSON for DB storage and deserializes on load. The AI always targets `/App.jsx` as the root component.

### AI Tools

`str_replace_editor` (`src/lib/tools/str-replace.ts`) supports: `view` (read file or line range), `create` (new file, auto-creates parent dirs), `str_replace` (find-and-replace), `insert` (insert at line number). `undo_edit` is explicitly unsupported. `file_manager` handles rename and delete.

Tools run **client-side**: the API route streams tool call requests back to the browser, where `useAIChat()` executes them against the in-memory `VirtualFileSystem`. Results are sent back to the API in the continuing stream.

### Preview / Import Map

`PreviewFrame.tsx` uses `jsx-transformer.ts` to build an ES module import map before rendering:
- Each virtual JS/JSX/TS/TSX file is Babel-transformed and served as a blob URL
- Each file is registered under multiple aliases (`/App.jsx`, `App.jsx`, `@/App.jsx`, `App`) to handle varied import styles
- Third-party packages (no `.`, `/`, or `@/` prefix) are mapped to `https://esm.sh/{package}`
- CSS imports are extracted and injected as a `<style>` tag
- Missing imports produce placeholder modules to avoid hard failures
- Entry point priority: `/App.jsx` → `/App.tsx` → `/index.jsx` → `/index.tsx` → first `.jsx`/`.tsx` found

### Anonymous vs. Authenticated Users

`anon-work-tracker.ts` bridges the two states:
- Anonymous work (chat messages, generated files) is stored in **sessionStorage** only
- On sign-up/sign-in, `useAuth()` calls `getAnonWorkData()`, creates a DB project with that data, then clears sessionStorage — users never lose work by signing up mid-session
- Authenticated users: every AI response triggers a Prisma upsert via `onFinish()` in the API route

### `[projectId]` Page Hydration

`src/app/[projectId]/page.tsx` is a Server Component. It awaits async `params` (Next.js 15 pattern), validates session, and passes the raw project to `<MainContent>`. On the client, `FileSystemProvider` calls `deserializeFromNodes()` and `ChatProvider` loads `initialMessages` — both happen on mount so the preview renders immediately with prior state.

### Prompt Caching

The system prompt in `src/lib/prompts/generation.tsx` uses `providerOptions.anthropic.cacheControl.type: "ephemeral"` to reduce API costs across repeated requests.

### Mock Model Fallback

`src/lib/provider.ts` returns a `MockLanguageModel` when `ANTHROPIC_API_KEY` is not set, enabling UI development without API access.

## Tech Stack

- **Frontend**: React 19, Next.js 15 (App Router), TypeScript 5, Tailwind CSS v4, shadcn/ui
- **AI**: `@ai-sdk/anthropic` + Vercel AI SDK (`ai`) for streaming and tool calling
- **DB**: Prisma 6 + SQLite (`prisma/dev.db`)
- **Auth**: JWT via `jose`, stored in httpOnly cookies (7-day sessions)
- **Preview**: `@babel/standalone` for in-browser JSX transformation
- **Testing**: Vitest + React Testing Library + jsdom

## Environment

`.env` must include `ANTHROPIC_API_KEY`. Without it the app runs in mock mode (no real AI generation).

## Conventions

- **Styling**: Tailwind only — no CSS-in-JS, no inline styles. Neutral color palette (`neutral-*`).
- **Server vs Client**: Server actions under `src/actions/` use `"use server"`. Interactive components use `"use client"`. `server-only` guards prevent server code leaking to the client.
- **Path alias**: `@/` → `src/` (tsconfig paths). Enabled in tests via `vite-tsconfig-paths` plugin.
- **Tests**: Live in `__tests__/` directories beside source files.
- **Components**: shadcn/ui primitives in `src/components/ui/`; domain components in feature subdirectories.

## `node-compat.cjs`

Node 25+ exposes experimental `localStorage`/`sessionStorage` globals that exist but are non-functional without explicit setup. This breaks SSR code that checks `typeof localStorage !== "undefined"`. `node-compat.cjs` deletes these globals on the server (`delete globalThis.localStorage`). It is injected via `NODE_OPTIONS=--require ./node-compat.cjs` in the `build` and `start` scripts.
