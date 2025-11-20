# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DentalCare Assistant is a React + TypeScript dental practice management application for Dr. Shamila Modan. It manages patient consultations, procedure tracking, commission calculations, and includes an AI chat assistant powered by Google Gemini.

**Tech Stack:**
- React 18 + TypeScript + Vite
- TailwindCSS for styling
- React Router DOM with HashRouter (for static deployment)
- Google Gemini AI (`@google/genai`)
- Recharts for data visualization
- No backend - currently uses in-memory mock data

## Development Commands

```bash
# Start development server on port 3000
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Environment Setup

The app requires a Google Gemini API key:

```bash
# Create .env file in project root
GEMINI_API_KEY=your_api_key_here
```

The Vite config (vite.config.ts:14-15) exposes this as `process.env.API_KEY` and `process.env.GEMINI_API_KEY` in the browser bundle.

## Architecture

### State Management - Context Pattern

The app uses React Context for global state, **NOT Redux or other state libraries**:

1. **AuthContext** (`src/context/AuthContext.tsx`)
   - Manages authentication state with localStorage persistence
   - Hard-coded password: `Sh4mila_Sandra_08*94` (AuthContext.tsx:16)
   - Session duration: 60 days (AuthContext.tsx:20)
   - Optional biometric unlock feature
   - If biometrics enabled: requires unlock on app return even with valid session
   - If biometrics disabled: auto-login with valid session token

2. **DataContext** (`src/context/DataContext.tsx`)
   - Manages patients and consultations (currently mock data)
   - Provides CRUD operations: `addPatient`, `addConsultation`, `getPatientById`, `getConsultationsByPatient`
   - Auto-sorts consultations by date descending

### Routing Structure

Uses **HashRouter** (not BrowserRouter) because this deploys as a static SPA:

```
/ (ProtectedRoute wrapper)
  ├─ / → Dashboard
  ├─ /chat → ChatPage (AI assistant)
  ├─ /reports → Reports
  ├─ /patients → Patients list
  ├─ /patients/:id → PatientDetails
  └─ /new-consultation → NewConsultation
```

All routes are protected and redirect to Login if not authenticated.

### Directory Structure

```
src/
├── components/       # Reusable UI components (BottomNav, ChatMessage, ReferencePanel)
├── context/         # React Context providers (AuthContext, DataContext)
├── data/            # Mock data (mockData.ts)
├── pages/           # Route components (Dashboard, ChatPage, Login, etc.)
├── services/        # External service integrations (geminiService.ts)
├── constants.ts     # App constants (procedure categories, system instruction)
├── types.ts         # TypeScript type definitions
└── App.tsx          # Root component with routing
```

### Commission Calculation Logic

**Critical business logic** defined in constants.ts:23-69:

1. **Standard procedures (40% commission)**: Categories A, B, C, D, E, F, G, H, I, J, L, M
   - Formula: `(Value ÷ 1.05) × 0.40`

2. **Orthodontics (65% commission)**: Category K
   - Formula: `(Value ÷ 1.05) × 0.65`

3. **Procedures with lab costs** (common for category J):
   - Formula: `((Value - LabCost) ÷ 1.05) × 0.40`

**Important**: All prices in the system **already include 5% IVA**. Always divide by 1.05 before calculating commission.

### Clinic Locations

Two clinics defined in constants.ts:7-10:
- **Sommerschield** (default/primary)
- **Baixa**

Each consultation must specify which clinic.

### Monthly Goal

Fixed monthly revenue target: **200,000 MT** (constants.ts:5)

## Gemini AI Integration

**Service**: `src/services/geminiService.ts`

- Model: `gemini-3-pro-preview` (constants.ts:3)
- System instruction: Detailed prompt in constants.ts:23-69
- Streaming API: Uses `sendMessageStream()` for real-time responses
- Chat is stateful: initialized once, maintains conversation history

**The AI assistant's role:**
- Register consultations via natural language
- Calculate commissions automatically
- Track progress toward monthly goal
- Manage patient records
- Always uses Portuguese (PT-PT) with older spelling (Objectivo, not Objetivo)

## Data Model

**Key types** in `src/types.ts`:

```typescript
Patient {
  id: string
  name: string
  phone: string
  notes: string
  createdAt: Date
}

Consultation {
  id: string
  date: string (YYYY-MM-DD)
  patientId: string
  patientName: string
  clinic: 'Sommerschield' | 'Baixa'
  procedures: Procedure[]
  totalValue: number
  doctorCommission: number
  hasPendingLab: boolean
}

Procedure {
  code: string (A-M)
  name: string
  value: number
  labCost?: number
  isLabPending?: boolean
}
```

## Important Implementation Notes

1. **No backend**: All data is currently stored in React state (DataContext). Any "save" operations only persist in memory until page reload.

2. **HashRouter is intentional**: Uses hash-based routing for deployment to static hosting (Vercel). Do NOT change to BrowserRouter without adding server-side redirects.

3. **Authentication is client-side only**: Password check happens in browser. This is acceptable for the current use case but not secure for production with real user data.

4. **Gemini API key exposure**: The API key is bundled into the browser build. For production, move API calls to a backend service.

5. **Language**: All UI text and AI responses should be in Portuguese (Portugal) using older spelling conventions (e.g., "Objectivo" not "Objetivo", "Factura" not "Fatura").

## Adding New Features

**When adding procedure categories:**
- Update PROCEDURE_CATEGORIES in constants.ts:12-21
- Each category needs: code, name, commission (0.40 or 0.65), color

**When adding new pages:**
- Create component in `src/pages/`
- Add route in App.tsx:45-54 under ProtectedRoute
- Add navigation item in `src/components/BottomNav.tsx`

**When modifying data structure:**
- Update types in `src/types.ts`
- Update mock data in `src/data/mockData.ts`
- Update DataContext methods if needed
- Consider data migration if moving to real backend

## Deployment

The app is configured for Vercel deployment:
- Uses Vite for bundling
- Static export (SPA)
- HashRouter for client-side routing
- Environment variables set in Vercel dashboard
