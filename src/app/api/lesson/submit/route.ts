import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { questionId, sessionId, selectedAnswer } = await request.json();

    if (!questionId || !sessionId || !selectedAnswer) {
      return NextResponse.json(
        { error: 'Missing questionId, sessionId, or selectedAnswer' },
        { status: 400 }
      );
    }

    // Get question
    const question = await prisma.question.findUnique({
      where: { id: questionId },
    });

    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    // Check if answer is correct
    const isCorrect = selectedAnswer === question.answer;

    // Count previous attempts for this question in this session
    const previousAttempts = await prisma.userAttempt.count({
      where: { questionId, sessionId },
    });

    // Record the attempt
    const attempt = await prisma.userAttempt.create({
      data: {
        questionId,
        sessionId,
        selectedAnswer,
        isCorrect,
        attemptNumber: previousAttempts + 1,
      },
    });

    return NextResponse.json({
      isCorrect,
      feedback: isCorrect
        ? {
            type: 'success',
            message: question.explanation,
          }
        : {
            type: 'error',
            message: `Hint: ${question.hint}`,
            canRetry: true,
          },
      question: {
        id: question.id,
        prompt: question.prompt,
        answer: question.answer,
        explanation: question.explanation,
        selectedAnswer,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to submit answer' }, { status: 500 });
  }
}
