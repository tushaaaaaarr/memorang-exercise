import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateStudyTips } from '@/lib/agent';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const lessonId = searchParams.get('lessonId');

    if (!sessionId || !lessonId) {
      return NextResponse.json({ error: 'Missing sessionId or lessonId' }, { status: 400 });
    }

    // Get all attempts for this session
    const attempts = await prisma.userAttempt.findMany({
      where: { sessionId },
      include: { question: true },
    });

    if (attempts.length === 0) {
      return NextResponse.json({ error: 'No attempts found' }, { status: 404 });
    }

    // Get lesson details
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { questions: true },
    });

    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    // Calculate statistics
    const totalQuestions = lesson.questions.length;
    const correctAttempts = attempts.filter((a) => a.isCorrect);
    const correctCount = new Set(correctAttempts.map((a) => a.questionId)).size;
    const percentage = totalQuestions > 0 ? ((correctCount / totalQuestions) * 100).toFixed(1) : '0';

    // Identify topics with mistakes (questions with incorrect first attempts)
    const mistakeQuestions = attempts
      .filter((a) => !a.isCorrect && a.attemptNumber === 1)
      .map((a) => a.question?.prompt.slice(0, 50) || 'Unknown');

    const studyTips = await generateStudyTips(correctCount, totalQuestions, mistakeQuestions);

    return NextResponse.json({
      summary: {
        totalQuestions,
        correctCount,
        percentage,
        totalAttempts: attempts.length,
      },
      studyTips,
      performance: {
        byQuestion: lesson.questions.map((q) => {
          const questionAttempts = attempts.filter((a) => a.questionId === q.id);
          const correct = questionAttempts.some((a) => a.isCorrect);
          return {
            questionId: q.id,
            prompt: q.prompt,
            correct,
            attempts: questionAttempts.length,
          };
        }),
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to get summary' }, { status: 500 });
  }
}
