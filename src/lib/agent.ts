/**
 * Learning Agent - Orchestrates the learning flow
 * Uses Groq API for AI interactions
 */

export async function generateStudyTips(
  correctCount: number,
  totalCount: number,
  incorrectTopics: string[]
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return `You scored ${correctCount}/${totalCount}. Focus on: ${incorrectTopics.join(', ')}`;
  }

  const percentage = ((correctCount / totalCount) * 100).toFixed(1);

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: `You are a supportive tutor. The student scored ${percentage}% on a lesson (${correctCount}/${totalCount} questions correct).
Topics they struggled with: ${incorrectTopics.join(', ')}

Provide 2-3 specific, actionable study tips to help them improve. Be encouraging and supportive.
Keep it to 2-3 sentences max.`,
        },
      ],
    }),
  });

  if (!response.ok) {
    return `You scored ${correctCount}/${totalCount}. Keep practicing on: ${incorrectTopics.join(', ')}`;
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

export async function getHint(question: string, topic: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return 'Read through the material again and think about the key concepts.';
  }

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      temperature: 0.5,
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: `Help a student with this question without giving away the answer:
Topic: ${topic}
Question: ${question}

Provide a brief hint (1-2 sentences) that guides them toward the right thinking.`,
        },
      ],
    }),
  });

  if (!response.ok) {
    return 'Think about what you learned about this topic and review the material.';
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

