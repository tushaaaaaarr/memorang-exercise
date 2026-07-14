'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, Circle, FileText, Sparkles, Trophy, AlertCircle, Loader } from 'lucide-react';
import { useCopilotReadable } from '@copilotkit/react-core';
import { CopilotPopup } from '@copilotkit/react-ui';

interface LessonPlan {
  objectives: string[];
  difficulty: string;
  summary: string;
}

interface Question {
  id: string;
  prompt: string;
  options: string[];
  answer: string;
  explanation: string;
  hint: string;
}

interface QuizFeedback {
  type: 'success' | 'error';
  message: string;
  canRetry?: boolean;
}

interface Summary {
  totalQuestions: number;
  correctCount: number;
  percentage: string;
  totalAttempts: number;
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [plan, setPlan] = useState<LessonPlan | null>(null);
  const [approved, setApproved] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selected, setSelected] = useState<string>('');
  const [feedback, setFeedback] = useState<QuizFeedback | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [studyTips, setStudyTips] = useState<string>('');
  
  const [sessionId, setSessionId] = useState<string>('');
  const [lessonId, setLessonId] = useState<string>('');
  const [error, setError] = useState<string>('');

  const currentQuestion = questions[activeIndex];
  const progress = useMemo(() => {
    if (!questions.length) return 0;
    return ((activeIndex + 1) / questions.length) * 100;
  }, [activeIndex, questions.length]);

  const questionsPerObj = plan?.objectives.length
    ? Math.ceil(questions.length / plan.objectives.length)
    : 3;

  useCopilotReadable({
    description: 'Current lesson and quiz context for the AI tutor',
    value: {
      lessonDifficulty: plan?.difficulty ?? null,
      currentObjective: plan?.objectives[Math.floor(activeIndex / questionsPerObj)] ?? null,
      allObjectives: plan?.objectives ?? [],
      currentQuestion: currentQuestion?.prompt ?? null,
      questionOptions: currentQuestion?.options ?? null,
      quizPhase: completed ? 'completed' : approved ? 'quiz' : plan ? 'review' : 'upload',
    },
  });

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const uploaded = event.target.files?.[0];
    if (!uploaded) return;

    setFile(uploaded);
    setIsLoading(true);
    setPlan(null);
    setApproved(false);
    setQuestions([]);
    setActiveIndex(0);
    setSelected('');
    setFeedback(null);
    setIsCorrect(null);
    setCompleted(false);
    setError('');

    const formData = new FormData();
    formData.append('file', uploaded);

    try {
      const response = await fetch('/api/lesson', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to process PDF');
        setIsLoading(false);
        return;
      }

      setSessionId(data.sessionId);
      setLessonId(data.lessonId);
      setPlan(data.lessonPlan);
    } catch (err) {
      setError('Network error while processing PDF');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleApprove() {
    if (!lessonId) {
      setError('No lesson ID available');
      return;
    }

    setIsLoading(true);

    try {
      // Approve lesson
      const approveResponse = await fetch('/api/lesson/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId }),
      });

      if (!approveResponse.ok) {
        throw new Error('Failed to approve lesson');
      }

      // Generate quiz
      const quizResponse = await fetch('/api/lesson/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId, sessionId }),
      });

      const quizData = await quizResponse.json();

      if (!quizResponse.ok) {
        throw new Error(quizData.error || 'Failed to generate quiz');
      }

      setQuestions(quizData.questions);
      setApproved(true);
      setFeedback({
        type: 'success',
        message: `Quiz ready with ${quizData.questions.length} questions!`,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start quiz');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  async function submitAnswer() {
    if (!currentQuestion || !selected || !sessionId) return;

    setIsLoading(true);

    try {
      const response = await fetch('/api/lesson/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: currentQuestion.id,
          sessionId,
          selectedAnswer: selected,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit answer');
      }

      setIsCorrect(data.isCorrect);
      setFeedback(data.feedback);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Error submitting answer',
      });
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  async function nextQuestion() {
    if (activeIndex >= questions.length - 1) {
      // Fetch summary
      setIsLoading(true);
      try {
        const summaryResponse = await fetch(
          `/api/lesson/summary?sessionId=${sessionId}&lessonId=${lessonId}`
        );

        const summaryData = await summaryResponse.json();

        if (summaryResponse.ok) {
          setSummary(summaryData.summary);
          setStudyTips(summaryData.studyTips);
        }
      } catch (err) {
        console.error('Failed to fetch summary:', err);
      } finally {
        setIsLoading(false);
      }

      setCompleted(true);
      setFeedback({
        type: 'success',
        message: 'Lesson complete! Review your progress below.',
      });
      return;
    }

    setActiveIndex((prev) => prev + 1);
    setSelected('');
    setFeedback(null);
    setIsCorrect(null);
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#f5f7ff,_#f8fafc)] px-4 py-10 text-slate-800">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <section className="rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-xl shadow-slate-200/70 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-indigo-600">Memorang AI</p>
              <h1 className="text-3xl font-semibold">Turn any PDF into an interactive lesson</h1>
            </div>
            <div className="rounded-full border border-indigo-100 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700">
              <Sparkles className="mr-2 inline h-4 w-4" /> HITL + AI Quizzes + Feedback
            </div>
          </div>
          <p className="mt-4 max-w-3xl text-lg text-slate-600">
            Upload a PDF, review the AI-generated lesson plan, then answer AI-powered MCQs with personalized hints and explanations.
          </p>
        </section>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            {error}
          </div>
        )}

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center transition hover:border-indigo-400 hover:bg-indigo-50">
              <FileText className="mb-3 h-10 w-10 text-indigo-500" />
              <span className="text-lg font-semibold">{file ? file.name : 'Upload a PDF to begin'}</span>
              <span className="mt-2 text-sm text-slate-500">The AI analyzes content and creates learning objectives.</span>
              <input type="file" accept="application/pdf" className="hidden" onChange={handleUpload} disabled={isLoading} />
            </label>

            {isLoading && (
              <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
                <Loader className="h-4 w-4 animate-spin" />
                Processing...
              </div>
            )}

            {plan && !approved && (
              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <h2 className="font-semibold">AI-Generated Lesson Plan</h2>
                </div>
                <p className="mt-2 text-sm text-slate-600">Difficulty: {plan.difficulty}</p>
                <p className="mt-2 text-sm text-slate-600">Summary: {plan.summary}</p>
                <ul className="mt-3 space-y-2 text-sm text-slate-700">
                  {plan.objectives.map((objective, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Circle className="mt-0.5 h-4 w-4 text-indigo-500 flex-shrink-0" />
                      <span>{index + 1}. {objective}</span>
                    </li>
                  ))}
                </ul>
                <button
                  className="mt-4 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
                  onClick={handleApprove}
                  disabled={isLoading}
                >
                  Approve & Start Quiz
                </button>
              </div>
            )}

            {plan && approved && (
              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <h2 className="font-semibold">Learning Objectives</h2>
                </div>
                <p className="text-xs text-slate-500 mb-3">Difficulty: {plan.difficulty}</p>
                <ul className="space-y-2 text-sm">
                  {plan.objectives.map((objective, i) => {
                    const isCompleted = completed || activeIndex >= (i + 1) * questionsPerObj;
                    const isCurrent = !completed && Math.floor(activeIndex / questionsPerObj) === i;
                    return (
                      <li
                        key={i}
                        className={`flex items-start gap-2 transition-colors ${
                          isCompleted
                            ? 'text-emerald-600'
                            : isCurrent
                            ? 'text-indigo-700 font-medium'
                            : 'text-slate-400'
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
                        ) : (
                          <Circle className={`mt-0.5 h-4 w-4 flex-shrink-0 ${isCurrent ? 'text-indigo-500' : ''}`} />
                        )}
                        <span>{i + 1}. {objective}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Learning Widget</h2>
              {questions.length > 0 && !completed && (
                <span className="text-sm text-slate-500">
                  {activeIndex + 1}/{questions.length}
                </span>
              )}
            </div>

            {questions.length > 0 && currentQuestion && !completed && (
              <div className="mt-6 space-y-4">
                <div className="h-2 rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-indigo-600 transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <h3 className="text-lg font-semibold">{currentQuestion.prompt}</h3>

                <div className="space-y-2">
                  {currentQuestion.options.map((option) => (
                    <label
                      key={option}
                      className={`flex items-center gap-3 rounded-2xl border p-3 cursor-pointer transition ${
                        selected === option
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-slate-200 hover:border-slate-300'
                      } ${isCorrect === true && option === currentQuestion.answer ? 'border-emerald-500 bg-emerald-50' : ''} ${
                        isCorrect === false && option === selected ? 'border-red-500 bg-red-50' : ''
                      }`}
                    >
                      <input
                        type="radio"
                        name="choice"
                        value={option}
                        checked={selected === option}
                        onChange={() => setSelected(option)}
                        disabled={isCorrect !== null}
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                    onClick={submitAnswer}
                    disabled={!selected || isLoading || isCorrect !== null}
                  >
                    {isLoading ? 'Submitting...' : 'Submit Answer'}
                  </button>
                  {isCorrect === true && (
                    <button
                      className="rounded-full border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
                      onClick={nextQuestion}
                      disabled={isLoading}
                    >
                      Next Question
                    </button>
                  )}
                  {isCorrect === false && (
                    <button
                      className="rounded-full border border-orange-400 bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-700 hover:bg-orange-100"
                      onClick={() => {
                        setSelected('');
                        setFeedback(null);
                        setIsCorrect(null);
                      }}
                      disabled={isLoading}
                    >
                      Try Again
                    </button>
                  )}
                </div>

                {feedback && (
                  <div
                    className={`rounded-2xl border p-4 text-sm ${
                      feedback.type === 'success'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-rose-200 bg-rose-50 text-rose-700'
                    }`}
                  >
                    {feedback.message}
                  </div>
                )}
              </div>
            )}

            {!approved && !isLoading && !plan && (
              <div className="mt-6 rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
                Upload a file to begin the AI-powered learning experience.
              </div>
            )}

            {completed && summary && (
              <div className="mt-6 space-y-4">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-emerald-600" />
                    <span className="font-semibold text-emerald-900">Lesson Complete!</span>
                  </div>
                  <div className="mt-3 space-y-2 text-sm text-emerald-800">
                    <p>
                      <strong>Score:</strong> {summary.correctCount}/{summary.totalQuestions} ({summary.percentage}%)
                    </p>
                    <p>
                      <strong>Total Attempts:</strong> {summary.totalAttempts}
                    </p>
                  </div>
                </div>

                {studyTips && (
                  <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
                    <h3 className="font-semibold text-indigo-900 text-sm">💡 Personalized Study Tips</h3>
                    <p className="mt-2 text-sm text-indigo-800">{studyTips}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
      {sessionId && (
        <CopilotPopup

          labels={{
            title: 'AI Tutor',
            initial: "Hi! I'm your AI tutor \uD83D\uDC4B Ask me anything about the lesson, or for a hint on the current question!",
            placeholder: 'Ask for a hint or explanation...',
          }}
        />
      )}
    </main>
  );
}
