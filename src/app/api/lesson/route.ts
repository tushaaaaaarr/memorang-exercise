import { NextRequest, NextResponse } from 'next/server';
import pdfParse from 'pdf-parse';
import { prisma } from '@/lib/prisma';
import { generateLessonPlan } from '@/lib/mcq-generator';

export const runtime = 'nodejs';

async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    const data = await pdfParse(buffer);
    const text = data.text.replace(/\s+/g, ' ').trim();

    if (!text || text.length < 50) {
      throw new Error('Could not extract sufficient text from PDF');
    }

    return text.slice(0, 8000);
  } catch (error) {
    console.error('PDF extraction error:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || typeof file === 'string' || !file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'Please upload a PDF file.' }, { status: 400 });
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Extract text from PDF
    const pdfContent = await extractTextFromPDF(buffer);
    
    if (!pdfContent || pdfContent.length === 0) {
      return NextResponse.json({ error: 'Could not extract text from PDF' }, { status: 400 });
    }

    // Truncate for token limits
    const truncatedContent = pdfContent.slice(0, 8000);

    // Generate lesson plan
    const lessonPlan = await generateLessonPlan(truncatedContent);

    // Create session and lesson in database
    const session = await prisma.session.create({
      data: {},
    });

    const lesson = await prisma.lesson.create({
      data: {
        sessionId: session.id,
        fileName: file.name,
        pdfContent: truncatedContent,
        objectives: lessonPlan.objectives,
        difficulty: lessonPlan.difficulty,
        summary: lessonPlan.summary,
        approved: false,
      },
    });

    return NextResponse.json({
      sessionId: session.id,
      lessonId: lesson.id,
      lessonPlan: {
        objectives: lesson.objectives,
        difficulty: lesson.difficulty,
        summary: lesson.summary,
      },
    });
  } catch (error) {
    console.error('PDF processing error:', error);
    const message = error instanceof Error ? error.message : 'Failed to process the PDF.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

