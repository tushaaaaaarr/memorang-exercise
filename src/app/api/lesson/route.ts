import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateLessonPlan } from '@/lib/mcq-generator';

export const runtime = 'nodejs';

// Robust PDF text extraction using regex patterns
async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    const content = buffer.toString('binary');
    let extractedText = '';

    // Method 1: Extract text from PDF text objects (Tj/TJ commands)
    // PDF text can be in format: (text) Tj or [(text) spacing (text)] TJ
    const textObjectRegex = /\(([^)\\]*(?:\\.[^)\\]*)*)\)/g;
    const matches = content.match(textObjectRegex) || [];

    matches.forEach((match) => {
      let text = match.slice(1, -1); // Remove parentheses

      // Decode PDF escape sequences
      text = text
        .replace(/\\n/g, ' ')
        .replace(/\\r/g, ' ')
        .replace(/\\t/g, ' ')
        .replace(/\\\(/g, '(')
        .replace(/\\\)/g, ')')
        .replace(/\\\\/g, '\\');

      // Remove control characters but keep printable ASCII
      text = text.replace(/[\x00-\x1F\x7F]/g, ' ');

      if (text.length > 1) {
        extractedText += text + ' ';
      }
    });

    // Method 2: If not enough text extracted, try to find readable ASCII sequences
    if (extractedText.trim().length < 100) {
      const asciiRegex = /[\x20-\x7E]{4,}/g;
      const asciiMatches = content.match(asciiRegex) || [];
      
      // Filter out PDF technical terms
      const technicalTerms = [
        'stream',
        'endstream',
        'FlateDecode',
        'ASCII85Decode',
        'null',
        'obj',
        'endobj',
        'trailer',
        'xref',
      ];

      asciiMatches.forEach((match) => {
        if (
          !technicalTerms.some((term) => match.toLowerCase().includes(term.toLowerCase())) &&
          match.length > 3
        ) {
          extractedText += match + ' ';
        }
      });
    }

    // Clean up: remove extra whitespace and limit
    extractedText = extractedText.replace(/\s+/g, ' ').trim();

    if (!extractedText || extractedText.length < 50) {
      throw new Error('Could not extract sufficient text from PDF');
    }

    return extractedText.slice(0, 8000);
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

