import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateMCQsFromContent } from '@/lib/mcq-generator';
import type { Question as PrismaQuestion } from '@prisma/client';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { lessonId, sessionId } = await request.json();

    if (!lessonId || !sessionId) {
      return NextResponse.json({ error: 'Missing lessonId or sessionId' }, { status: 400 });
    }

    // Fetch lesson
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { questions: true },
    });

    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    if (!lesson.approved) {
      return NextResponse.json({ error: 'Lesson not approved yet' }, { status: 400 });
    }

    // If questions already exist, return them
    if (lesson.questions.length > 0) {
      return NextResponse.json({ questions: lesson.questions });
    }

    // Generate MCQs for each objective
    const generatedQuestions: PrismaQuestion[] = [];

    for (let i = 0; i < lesson.objectives.length; i++) {
      const objective = lesson.objectives[i];
      try {
        const mcqs = await generateMCQsFromContent(
          lesson.pdfContent,
          objective,
          lesson.difficulty
        );

        // Store in database
        for (let j = 0; j < mcqs.length; j++) {
          const mcq = mcqs[j];
          const savedQuestion: PrismaQuestion = await prisma.question.create({
            data: {
              lessonId,
              prompt: mcq.prompt,
              options: mcq.options,
              answer: mcq.answer,
              explanation: mcq.explanation,
              hint: mcq.hint,
              orderIndex: generatedQuestions.length + j,
            },
          });
          generatedQuestions.push(savedQuestion);
        }
      } catch (error) {
        console.error(`Failed to generate MCQs for objective ${i}:`, error);
      }
    }

    return NextResponse.json({
      questions: generatedQuestions,
      total: generatedQuestions.length,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to generate quiz' }, { status: 500 });
  }
}
