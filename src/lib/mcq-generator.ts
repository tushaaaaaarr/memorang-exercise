import { z } from 'zod';

const questionSchema = z.object({
  prompt: z.string().describe('The MCQ question'),
  options: z.array(z.string()).describe('Array of 4 multiple choice options'),
  answer: z.string().describe('The correct answer (must be one of the options)'),
  explanation: z.string().describe('Detailed explanation of why the answer is correct'),
  hint: z.string().describe('A helpful hint for incorrect attempts'),
});

const questionsSchema = z.object({
  questions: z.array(questionSchema).describe('Array of generated MCQ questions'),
});

type Question = z.infer<typeof questionSchema>;

export async function generateMCQsFromContent(
  pdfContent: string,
  objective: string,
  difficulty: string
): Promise<Question[]> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not set');
  }

  const prompt = `You are an expert educational content creator. Generate 3 multiple-choice questions based on the PDF content and the given objective.

PDF Content:
${pdfContent.slice(0, 3000)}

Learning Objective:
${objective}

Difficulty Level: ${difficulty}

Requirements:
- Each question should test understanding of the objective
- Provide 4 distinct options per question
- One option must be the correct answer
- Provide a clear explanation for the correct answer
- Provide a helpful hint that guides without giving away the answer

Return ONLY a valid JSON object (no markdown, no extra text) with this structure:
{
  "questions": [
    {
      "prompt": "question text",
      "options": ["option1", "option2", "option3", "option4"],
      "answer": "correct option text",
      "explanation": "why this is correct",
      "hint": "helpful hint"
    }
  ]
}`;

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Groq API error: ${response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content ?? '{}';

  try {
    const parsed = JSON.parse(content);
    return parsed.questions || [];
  } catch (e) {
    console.error('Failed to parse MCQ response:', content);
    return [];
  }
}

export async function generateLessonPlan(pdfContent: string): Promise<{
  objectives: string[];
  difficulty: string;
  summary: string;
}> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return {
      objectives: [
        'Understand the core concept presented in the document',
        'Identify the main arguments or steps in the material',
        'Apply the ideas to a practical example',
      ],
      difficulty: 'Intermediate',
      summary: pdfContent.slice(0, 500),
    };
  }

  const prompt = `You are an educational planner. Analyze the PDF content and create a structured lesson plan.

PDF Content:
${pdfContent.slice(0, 3000)}

Return ONLY a valid JSON object (no markdown, no extra text) with exactly these keys:
- objectives: array of 3-5 specific, measurable learning objectives (strings)
- difficulty: one of "Beginner", "Intermediate", or "Advanced"
- summary: a concise 1-2 sentence summary (string)

{
  "objectives": ["obj1", "obj2", "obj3"],
  "difficulty": "Intermediate",
  "summary": "Brief summary"
}`;

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      temperature: 0.2,
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Groq API error: ${response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content ?? '{}';

  try {
    const parsed = JSON.parse(content);
    return {
      objectives: Array.isArray(parsed.objectives) ? parsed.objectives : [],
      difficulty: parsed.difficulty || 'Intermediate',
      summary: parsed.summary || pdfContent.slice(0, 200),
    };
  } catch (e) {
    console.error('Failed to parse lesson plan response:', content);
    return {
      objectives: [
        'Understand the core concept presented in the document',
        'Identify the main arguments or steps in the material',
        'Apply the ideas to a practical example',
      ],
      difficulty: 'Intermediate',
      summary: pdfContent.slice(0, 200),
    };
  }
}
