# Memorang AI — Full-Stack AI Learning Agent

> **Transforms any PDF into a structured, interactive lesson** — powered by an AI agent with Human-in-the-Loop approval, dynamic MCQ generation, visual feedback, and personalized study tips.

---

## Table of Contents

1. [Overview](#overview)
2. [Live Demo Flow](#live-demo-flow)
3. [Architecture](#architecture)
4. [Tech Stack](#tech-stack)
5. [Project Structure](#project-structure)
6. [Prerequisites](#prerequisites)
7. [Setup & Installation](#setup--installation)
8. [Environment Variables](#environment-variables)
9. [Database Schema](#database-schema)
10. [API Reference](#api-reference)
11. [Acceptance Criteria Verification](#acceptance-criteria-verification)
12. [Running in Production](#running-in-production)
13. [Troubleshooting](#troubleshooting)

---

## Overview

Memorang AI solves the problem of unstructured, non-persistent learning on generic AI platforms. It gives users a **guided pedagogical flow**:

1. Upload a PDF → AI extracts and analyses the content
2. AI proposes a lesson plan → User approves it (Human-in-the-Loop)
3. AI generates MCQ questions per objective → User answers in a widget
4. Visual green/red feedback with explanations and hints
5. Unlimited retries without score penalty
6. AI concludes with a personalised performance summary and study tips

---

## Live Demo Flow

```
┌─────────────────────────────────────────────────────────┐
│  1. User uploads PDF                                    │
│     └─> Backend extracts text with pdf-parse (≤8000c)  │
│                                                         │
│  2. AI generates lesson plan (Groq llama-3.3-70b)      │
│     └─> 3–5 objectives + difficulty + summary           │
│                                                         │
│  3. HITL: User reviews plan and clicks "Approve"        │
│     └─> Lesson marked approved in DB                   │
│                                                         │
│  4. AI generates MCQs (3 per objective)                 │
│     └─> Stored in DB with options/answer/hint           │
│                                                         │
│  5. Interactive quiz widget                             │
│     ✅ Correct  → green highlight + explanation         │
│     ❌ Incorrect → red highlight + hint + retry         │
│                                                         │
│  6. After all questions → summary + study tips          │
└─────────────────────────────────────────────────────────┘
```

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        Next.js App                           │
│                                                              │
│  ┌──────────────────┐          ┌────────────────────────┐   │
│  │   Frontend        │  fetch   │   API Routes           │   │
│  │   (page.tsx)      │ ──────── │                        │   │
│  │                   │          │  POST /api/lesson      │   │
│  │  • Upload widget  │          │  POST /api/lesson/     │   │
│  │  • Lesson plan    │          │        approve         │   │
│  │  • MCQ widget     │          │  POST /api/lesson/quiz │   │
│  │  • Feedback UI    │          │  POST /api/lesson/     │   │
│  │  • Summary view   │          │        submit          │   │
│  └──────────────────┘          │  GET  /api/lesson/     │   │
│                                 │        summary         │   │
│                                 │  POST /api/copilotkit  │   │
│                                 └──────────┬─────────────┘   │
└────────────────────────────────────────────│─────────────────┘
                                             │
                   ┌─────────────────────────┼────────────────┐
                   │                         │                │
            ┌──────▼──────┐         ┌────────▼──────┐        │
            │  Groq API   │         │  PostgreSQL   │        │
            │  (LLM)      │         │  (Prisma ORM) │        │
            │             │         │               │        │
            │ llama-3.3-  │         │  Session      │        │
            │ 70b-        │         │  Lesson       │        │
            │ versatile   │         │  Question     │        │
            └─────────────┘         │  UserAttempt  │        │
                                    └───────────────┘        │
```

### Key design decisions

| Decision | Rationale |
|---|---|
| Groq API over OpenAI | Free tier, fast inference, OpenAI-compatible API surface |
| LangChain `ChatGroq` | Satisfies the LangChain requirement; provides streaming chain for the AI tutor |
| Custom `AbstractAgent` (AG-UI) | CopilotKit v1 requires a registered agent; extending `AbstractAgent` avoids a full LangGraph Platform deployment |
| CopilotKit `CopilotPopup` + `useCopilotReadable` | Provides the chat UI and injects live quiz context (question, objective, difficulty) into the AI tutor |
| pdf-parse v1 | Lightweight, Node.js native, no browser worker required |
| Prisma ORM | Type-safe DB queries, schema migrations, connection pooling |
| Next.js API Routes | Collocated backend, no separate server process |
| Tailwind CSS v4 | Utility-first, minimal bundle, native CSS variables |

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Language | TypeScript | 5 |
| Framework | Next.js | 16.2.10 |
| UI Library | React | 19.2.4 |
| Styling | Tailwind CSS | 4 |
| AI / LLM | Groq API (`llama-3.3-70b-versatile`) | — |
| AI Agent Framework | LangChain (`@langchain/groq`, `@langchain/core`) | — |
| Agent Graph | LangGraph (`@langchain/langgraph`) | — |
| Agent Protocol | AG-UI (`@ag-ui/client`) | — |
| AI Tutor UI | CopilotKit (`@copilotkit/react-core`, `@copilotkit/react-ui`, `@copilotkit/runtime`) | 1.62.3 |
| PDF Parsing | pdf-parse | 1.1.4 |
| ORM | Prisma | 5.7.1 |
| Database | PostgreSQL | 14+ |
| Validation | Zod | 3.22.4 |
| Icons | Lucide React | 1.24.0 |

---

## Project Structure

```
memorang-exercise/
├── prisma/
│   ├── schema.prisma           # DB schema: Session, Lesson, Question, UserAttempt
│   └── migrations/             # SQL migration history
│
├── src/
│   ├── app/
│   │   ├── page.tsx            # Main UI — upload, lesson plan, quiz widget, summary
│   │   ├── layout.tsx          # Root HTML layout + metadata
│   │   ├── providers.tsx       # Client-side CopilotKit provider (keeps layout.tsx a server component)
│   │   ├── globals.css         # Tailwind config + CSS custom properties
│   │   └── api/
│   │       ├── copilotkit/
│   │       │   └── route.ts    # CopilotKit runtime — TutorAgent (AbstractAgent + LangChain/Groq)
│   │       └── lesson/
│   │           ├── route.ts        # PDF upload → text extract → lesson plan
│   │           ├── approve/
│   │           │   └── route.ts    # HITL approval endpoint
│   │           ├── quiz/
│   │           │   └── route.ts    # MCQ generation per objective
│   │           ├── submit/
│   │           │   └── route.ts    # Answer submission + correctness check
│   │           └── summary/
│   │               └── route.ts    # Score calculation + study tips
│   │
│   └── lib/
│       ├── agent.ts            # Study tips + dynamic hint generation (Groq)
│       ├── mcq-generator.ts    # Lesson plan + MCQ generation (Groq + Zod)
│       └── prisma.ts           # Prisma singleton (prevents connection leaks)
│
├── .env                        # Local environment variables (not committed)
├── next.config.ts              # Next.js + Turbopack config
├── tsconfig.json               # TypeScript strict mode config
└── package.json
```

---

## Prerequisites

- **Node.js** 18 or higher
- **PostgreSQL** 14 or higher (local or cloud)
- **Groq API key** — free at [https://console.groq.com](https://console.groq.com)

---

## Setup & Installation

### 1. Clone the repository

```bash
git clone <repo-url>
cd memorang-exercise
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up PostgreSQL

**Option A — Local install (Windows)**

1. Download the installer from [postgresql.org/download/windows](https://www.postgresql.org/download/windows/)
2. Run the installer, set a superuser password, keep port `5432`
3. Open **pgAdmin** or **psql** and create the database:

```sql
CREATE DATABASE memorang_ai;
```

**Option B — Local install (macOS / Linux)**

```bash
# macOS
brew install postgresql@14
brew services start postgresql@14
createdb memorang_ai

# Ubuntu / Debian
sudo apt install postgresql postgresql-contrib
sudo -u postgres psql -c "CREATE DATABASE memorang_ai;"
```

**Option C — Cloud database (Railway / Supabase / Neon)**

1. Create a new PostgreSQL project on your provider
2. Copy the connection string — it will be your `DATABASE_URL`

---

### 4. Configure environment variables

Create a `.env` file in the project root:

```env
# Groq API — get your key at https://console.groq.com
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile

# PostgreSQL connection string
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/memorang_ai
```

---

### 5. Apply database migrations

For a fresh database:

```bash
npx prisma migrate dev --name init
```

If the database already has tables (e.g., from a previous schema):

```bash
npx prisma db push
```

To view and manage data in a GUI:

```bash
npx prisma studio
```

---

### 6. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GROQ_API_KEY` | ✅ Yes | API key from console.groq.com |
| `GROQ_MODEL` | No | Model name (default: `llama-3.3-70b-versatile`) |
| `DATABASE_URL` | ✅ Yes | PostgreSQL connection string |

---

## Database Schema

```prisma
model Session {
  id        String        @id @default(cuid())
  createdAt DateTime      @default(now())
  updatedAt DateTime      @updatedAt
  lesson    Lesson?
  attempts  UserAttempt[]
}

model Lesson {
  id         String     @id @default(cuid())
  sessionId  String     @unique
  session    Session    @relation(...)
  fileName   String
  pdfContent String     @db.Text
  objectives String[]
  difficulty String
  summary    String     @db.Text
  approved   Boolean    @default(false)
  questions  Question[]
  createdAt  DateTime   @default(now())
  updatedAt  DateTime   @updatedAt
}

model Question {
  id          String        @id @default(cuid())
  lessonId    String
  lesson      Lesson        @relation(...)
  prompt      String        @db.Text
  options     String[]
  answer      String
  explanation String        @db.Text
  hint        String        @db.Text
  orderIndex  Int           @default(0)
  attempts    UserAttempt[]
}

model UserAttempt {
  id             String   @id @default(cuid())
  sessionId      String
  questionId     String
  selectedAnswer String
  isCorrect      Boolean
  attemptNumber  Int      @default(1)
  createdAt      DateTime @default(now())
}
```

### Data flow per session

```
Session (1)
  └── Lesson (1)          ← created on PDF upload
        └── Questions (N) ← created on quiz generation (3 per objective)
              └── UserAttempt (N) ← created on each answer submission
```

---

## API Reference

### `POST /api/lesson`

Upload a PDF file and generate a lesson plan.

**Request:** `multipart/form-data`
| Field | Type | Description |
|---|---|---|
| `file` | File | A `.pdf` file |

**Response:**
```json
{
  "sessionId": "clxxx...",
  "lessonId": "clyyy...",
  "lessonPlan": {
    "objectives": ["Understand X", "Apply Y", "Analyse Z"],
    "difficulty": "Intermediate",
    "summary": "This lesson covers..."
  }
}
```

**Error responses:** `400` if file is missing or not a PDF, `500` if extraction or AI call fails.

---

### `POST /api/lesson/approve`

Approve the lesson plan (HITL step). Marks the lesson as approved in the database.

**Request body:**
```json
{ "lessonId": "clyyy..." }
```

**Response:**
```json
{ "success": true, "lesson": { ... } }
```

---

### `POST /api/lesson/quiz`

Generate MCQ questions for an approved lesson. Creates 3 questions per objective and stores them in the database.

**Request body:**
```json
{ "lessonId": "clyyy...", "sessionId": "clxxx..." }
```

**Response:**
```json
{
  "questions": [
    {
      "id": "clzzz...",
      "prompt": "What is X?",
      "options": ["A", "B", "C", "D"],
      "answer": "A",
      "explanation": "Because...",
      "hint": "Think about..."
    }
  ]
}
```

---

### `POST /api/lesson/submit`

Submit an answer for a question. Records the attempt and returns feedback.

**Request body:**
```json
{
  "questionId": "clzzz...",
  "sessionId": "clxxx...",
  "selectedAnswer": "A"
}
```

**Response (correct):**
```json
{
  "isCorrect": true,
  "feedback": {
    "type": "success",
    "message": "✅ Correct! [explanation text]"
  }
}
```

**Response (incorrect):**
```json
{
  "isCorrect": false,
  "feedback": {
    "type": "error",
    "message": "Not quite. Hint: [hint text]",
    "canRetry": true
  }
}
```

---

### `GET /api/lesson/summary`

Retrieve the final performance summary and AI-generated study tips.

**Query parameters:** `sessionId`, `lessonId`

**Response:**
```json
{
  "summary": {
    "totalQuestions": 9,
    "correctCount": 7,
    "percentage": "77.8",
    "totalAttempts": 11
  },
  "studyTips": "Great work! To improve on topic X, try..."
}
```

---

### `POST /api/copilotkit`

CopilotKit runtime endpoint. Hosts a `TutorAgent` — a custom in-process agent that extends `AbstractAgent` from `@ag-ui/client` and streams responses using a LangChain `ChatGroq` chain. The agent is registered as `'default'` in `CopilotRuntime`, which satisfies CopilotKit v1's agent discovery requirement.

**Protocol:** AG-UI event stream (`RUN_STARTED` → `TEXT_MESSAGE_CONTENT` chunks → `RUN_FINISHED`)  
**System prompt:** Injected at runtime — instructs the AI to provide hints without revealing answers  
**Context:** `useCopilotReadable` in `page.tsx` feeds the current question, active objective, and difficulty level into the agent on every render

---

## Acceptance Criteria Verification

| Requirement | Status | Implementation |
|---|---|---|
| Agent accepts a PDF upload and parses relevant content | ✅ | `pdf-parse` extracts text in `/api/lesson` |
| Agent presents a plan (todo list) for generation | ✅ | Objectives rendered as checklist in UI |
| HITL interrupt allows user to review plan before proceeding | ✅ | "Approve & Start Quiz" button gates quiz start; DB `approved` flag |
| MCQs are generated directly from the PDF content | ✅ | PDF text passed verbatim to Groq prompt in `/api/lesson/quiz` |
| MCQ genUI widget renders with radio button selection | ✅ | Custom widget in `page.tsx` with `<input type="radio">`; objectives progress panel tracks completion per objective |
| On correct answer, an explanation is displayed | ✅ | Green feedback box with full explanation from DB |
| On incorrect answer, a hint is displayed and user can retry without penalty | ✅ | Red feedback + "Try Again" resets selection; score only counts first correct |
| Users can proceed through all generated MCQs until completion | ✅ | "Next Question" advances `activeIndex`; last question triggers summary |
| Agent provides summary of results and study tips at the end | ✅ | Score + AI-generated tips from `/api/lesson/summary` |

---

## Running in Production

### Build

```bash
npm run build
npm start
```

### Deploy on Vercel (recommended)

1. Push the repo to GitHub
2. Import the project at [vercel.com](https://vercel.com)
3. Add environment variables (`GROQ_API_KEY`, `DATABASE_URL`) in the Vercel dashboard
4. Set up a cloud PostgreSQL provider (Railway, Supabase, or Neon)
5. Run migrations on the production database:

```bash
DATABASE_URL=your_prod_url npx prisma migrate deploy
```

### Deploy on Railway

Railway can host both the Next.js app and a PostgreSQL database in one project:

1. Create a new project on [railway.app](https://railway.app)
2. Add a PostgreSQL service — Railway provides the `DATABASE_URL` automatically
3. Deploy the GitHub repo as a service
4. Set `GROQ_API_KEY` and `GROQ_MODEL` in Railway's environment variables
5. Add a start command: `npm run build && npm start`

---

## Troubleshooting

### `The table 'public.Session' does not exist`

The database schema hasn't been applied. Run:

```bash
npx prisma db push
# or for migration history
npx prisma migrate dev --name init
```

### `GROQ_API_KEY is not set`

Add the key to your `.env` file and restart the dev server. Get a free key at [console.groq.com](https://console.groq.com).

### `Could not extract sufficient text from PDF`

The PDF may be scanned (image-based) or heavily encrypted. `pdf-parse` requires text-layer PDFs. Try a different PDF that was digitally created (not scanned).

### `P3005 — The database schema is not empty`

If `prisma migrate dev` fails because tables already exist from a previous setup:

```bash
npx prisma db push
```

### Database connection refused

Verify PostgreSQL is running and the `DATABASE_URL` is correct:

```bash
# Windows
Get-Service -Name postgresql*

# macOS
brew services list | grep postgresql

# Linux
sudo systemctl status postgresql
```

### Port 3000 already in use

```bash
# Kill the process using port 3000
npx kill-port 3000
npm run dev
```
```bash
# Verify GROQ_API_KEY is set
echo $GROQ_API_KEY
# Get a free key at https://console.groq.com
```

### Prisma errors
```bash
# Reset database (development only)
npx prisma migrate reset
# Regenerate Prisma client
npx prisma generate
```

## Next Steps & Enhancements

- [ ] User authentication (NextAuth.js)
- [ ] Lesson history and analytics
- [ ] Customizable quiz difficulty
- [ ] Real-time progress synchronization
- [ ] Mobile app version
- [ ] Advanced study statistics
- [ ] Spaced repetition for retention
- [ ] Collaboration features

## Submission

This project meets all assignment criteria:
- ✅ PDF upload and parsing
- ✅ AI lesson plan with HITL approval
- ✅ Dynamic MCQ generation from content
- ✅ Custom UI with radio buttons
- ✅ Visual feedback (green/red)
- ✅ Hints and explanations
- ✅ Retry without penalty
- ✅ Quiz loop completion
- ✅ Progress summary with study tips
- ✅ Persistent state (PostgreSQL)
- ✅ Groq API integration
- ✅ LangChain agent orchestration (`ChatGroq` chain inside a custom `AbstractAgent`)
- ✅ CopilotKit integration (`CopilotRuntime`, `CopilotPopup`, `useCopilotReadable`, `Providers` wrapper)
- ✅ Objectives progress panel (live tracking per objective during quiz)

## License

MIT

