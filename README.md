# Memorang AI - Full-Stack Learning Agent

Memorang AI is a full-stack learning experience that transforms an uploaded PDF into a structured, interactive lesson with:

- **AI-Powered Lesson Planning**: Analyzes PDF content and creates learning objectives
- **Human-in-the-Loop Approval**: Users review and approve the generated lesson plan before starting
- **Dynamic MCQ Generation**: AI generates multiple-choice questions directly from PDF content
- **Interactive Learning Widget**: Custom UI for answering questions with real-time feedback
- **Smart Feedback System**: Green highlights for correct answers with explanations; red highlights for incorrect with helpful hints
- **Persistent Progress Tracking**: Database stores all user attempts and performance
- **Personalized Study Tips**: AI generates tailored study recommendations based on performance
- **CopilotKit Integration**: Side panel AI assistant to help users during learning
- **Agent Orchestration**: LangChain-powered agent managing the complete learning flow

## Tech Stack

- **Language**: TypeScript
- **Frontend**: React 19 + Next.js 16 + Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL + Prisma ORM
- **AI/LLM**: Groq API (llama-3.3-70b-versatile)
- **Agents**: LangChain
- **UI Enhancement**: CopilotKit
- **PDF Processing**: pdf-parse

## Prerequisites

- Node.js 18+
- PostgreSQL 14+ (local or remote)
- Groq API key (get one free at https://console.groq.com)

## Setup

1. **Clone and install dependencies**
   ```bash
   npm install
   ```

2. **Set up PostgreSQL**
   
   Option A - Local PostgreSQL:
   ```bash
   # macOS with Homebrew
   brew install postgresql
   brew services start postgresql
   createdb memorang_ai
   
   # Linux
   sudo apt install postgresql postgresql-contrib
   sudo -u postgres createdb memorang_ai
   
   # Windows - Download from https://www.postgresql.org/download/windows/
   ```

   Option B - Use a cloud database (Railway, Supabase, etc.):
   ```
   Get your DATABASE_URL from the provider
   ```

3. **Configure environment variables**
   
   Create or update `.env` with:
   ```env
   # Groq API
   GROQ_API_KEY=your_groq_api_key_here
   GROQ_MODEL=llama-3.3-70b-versatile
   
   # Database
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/memorang_ai
   # Or for cloud: DATABASE_URL=postgresql://user:password@host:port/dbname
   ```

4. **Set up Prisma and database schema**
   ```bash
   npx prisma migrate dev --name init
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open http://localhost:3000** and start using Memorang AI!

## Features in Action

### 1. PDF Upload & Parsing
- Upload any PDF file
- Automatic content extraction and processing
- Handles various PDF formats

### 2. Lesson Plan Generation
- AI analyzes PDF content
- Generates 3-5 specific learning objectives
- Assigns difficulty level (Beginner/Intermediate/Advanced)
- Creates summary of key concepts

### 3. Human-in-the-Loop Approval
- Review generated lesson plan before starting
- Approve or reject via UI
- Ensures alignment with learning goals

### 4. AI-Powered Quiz Generation
- Dynamically generates MCQs from PDF content
- 3 questions per learning objective
- Each question has:
  - Multiple choice options
  - Correct answer
  - Detailed explanation
  - Helpful hint for learning

### 5. Interactive Learning Loop
- **Correct Answers**: Green highlight + explanation shown
- **Incorrect Answers**: Red highlight + hint displayed
- **Retry Support**: Users can retry without penalty
- **Progress Tracking**: Visual progress bar shows completion

### 6. Performance Summary
- Final score calculation (correct/total)
- Personalized study tips based on weak areas
- Recommendations for further study

### 7. CopilotKit Sidebar
- AI assistant available during learning
- Can ask questions about concepts
- Get hints without spoiling answers
- Receive encouragement and study advice

## API Endpoints

### POST `/api/lesson`
Upload PDF and create lesson plan
- **Body**: FormData with `file` (PDF file)
- **Response**: `{ sessionId, lessonId, lessonPlan }`

### POST `/api/lesson/approve`
Approve lesson plan and begin
- **Body**: `{ lessonId }`
- **Response**: Confirmation with lesson details

### POST `/api/lesson/quiz`
Generate MCQs for approved lesson
- **Body**: `{ lessonId, sessionId }`
- **Response**: Array of generated questions

### POST `/api/lesson/submit`
Submit an answer to a question
- **Body**: `{ questionId, sessionId, selectedAnswer }`
- **Response**: Feedback with correctness, explanation/hint

### GET `/api/lesson/summary`
Get learning summary and study tips
- **Query**: `sessionId`, `lessonId`
- **Response**: Performance stats and personalized tips

## Database Schema

- **Session**: User learning session
- **Lesson**: Lesson plan with objectives
- **Question**: MCQ questions with options and answers
- **UserAttempt**: User's answer attempts and correctness

See `prisma/schema.prisma` for full schema details.

## Running in Production

1. **Build the project**
   ```bash
   npm run build
   ```

2. **Set environment variables** on your hosting platform (Vercel, Railway, etc.)

3. **Run migrations** on production database
   ```bash
   npx prisma migrate deploy
   ```

4. **Start the server**
   ```bash
   npm start
   ```

## Development

- **Database changes**: Update `prisma/schema.prisma` and run `npx prisma migrate dev`
- **Add new API features**: Create new files in `src/app/api/`
- **Styling**: Tailwind CSS classes in React components
- **LLM prompts**: Modify templates in `src/lib/mcq-generator.ts` and `src/lib/agent.ts`

## Troubleshooting

### Database connection errors
```bash
# Check if PostgreSQL is running
psql -U postgres
# Check connection string in .env
```

### API key errors
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
- ✅ LangChain agent orchestration
- ✅ CopilotKit integration

## License

MIT

