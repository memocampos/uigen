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
- **Path alias**: `@/` → `src/` (tsconfig paths).
- **Tests**: Live in `__tests__/` directories beside source files.
- **Components**: shadcn/ui primitives in `src/components/ui/`; domain components in feature subdirectories.
