import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { lessonId } = await request.json();

    if (!lessonId) {
      return NextResponse.json({ error: 'Missing lessonId' }, { status: 400 });
    }

    const lesson = await prisma.lesson.update({
      where: { id: lessonId },
      data: { approved: true },
    });

    return NextResponse.json({
      message: 'Lesson approved',
      lesson: {
        id: lesson.id,
        objectives: lesson.objectives,
        difficulty: lesson.difficulty,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to approve lesson' }, { status: 500 });
  }
}
