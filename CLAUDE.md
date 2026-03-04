# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install        # Install dependencies
npm run dev        # Start dev server (requires API_KEY env var)
npm run build      # Production build to dist/
npm run preview    # Preview production build
```

There are no tests or linting configured in this project.

## Environment

The app requires two runtime credentials:

- **`API_KEY`** — Gemini API key, injected by Vite at build time via `vite.config.ts` `define`. Set as `API_KEY` or `VITE_API_KEY` in `.env.local`.
- **Supabase** — URL and anon key are hardcoded in `services/supabase.ts`. No `.env` needed for Supabase.

## Architecture

This is a React 18 + TypeScript SPA using HashRouter (no server-side routing). The stack is Vite + Tailwind (via CDN in `index.html`) + Supabase (backend/auth) + Gemini AI (chat assistant).

### Data Flow

All app state lives in two React Contexts:

- **`AuthContext`** (`context/AuthContext.tsx`) — Supabase Auth session, login/logout, password update.
- **`DataContext`** (`context/DataContext.tsx`) — All clinical data: patients, consultations, budgets, and procedure prices. Fetches everything from Supabase on mount and exposes CRUD methods. Local state is updated optimistically after each DB operation.

### Pages & Routing

Routes are protected via `ProtectedRoute` in `App.tsx` — unauthenticated users see `Login` directly (no redirect). All routes are nested under the `Layout` component which renders `BottomNav`.

| Route | Page | Purpose |
|---|---|---|
| `/` | `Dashboard` | KPIs, revenue charts |
| `/chat` | `ChatPage` | AI assistant (Gemini) |
| `/reports` | `Reports` | Financial report + Excel export |
| `/patients` / `/patients/:id` | `Patients` / `PatientDetails` | Patient management |
| `/new-consultation` | `NewConsultation` | Register a consultation |
| `/consultations` | `Consultations` | List/edit consultations |
| `/budgets` / `/budgets/new` / `/budgets/:id` | `Budgets` / `BudgetEditor` | Budget management |
| `/update-password` | `UpdatePassword` | Set new password from magic link |

### Supabase Schema (tables used)

- `precos` — procedure price catalogue (`id`, `categoria`, `descricao`, `valor_sem_iva`, `valor_com_iva`, `ativo`)
- `pacientes` — patients (`id`, `nome`, `telefone`, `notas_gerais`, `criado_em`)
- `consultas` — consultations; `procedimentos` is a JSONB array `[{codigo, descricao, tem_lab, valor}]`; commission is stored in `valor_final_dra`
- `orcamentos` — budgets; `fases` is a JSONB array of `BudgetPhase` objects

### Commission Calculation

Centralized in `constants.ts`:
- Formula per procedure: `((value - labCost) / 1.05) * rate`
- Rate: **65%** for Ortodontia (codes starting with `K`), **40%** for everything else
- Monthly revenue goal: **200,000 MT**

### AI Chat

`services/geminiService.ts` maintains a singleton `Chat` instance using `gemini-2.5-flash`. Each message optionally receives a `[DATABASE_CONTEXT]` JSON block with current data. The system prompt (`SYSTEM_INSTRUCTION` in `constants.ts`) defines the assistant persona, business rules, and response format — always in European Portuguese (PT-PT).

### Print / Export

- `components/FinancialReportTemplate.tsx` — React component rendered via `react-to-print` for PDF export
- `components/BudgetPDF.tsx` / `components/DentalQuoteTemplate.tsx` — Budget print templates
- `pages/Reports.tsx` — Also exports Excel via the `xlsx` library
