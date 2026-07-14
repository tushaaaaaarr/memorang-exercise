import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * CopilotKit endpoint for AI-powered sidebar assistant
 * Proxies requests to Groq API
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'GROQ_API_KEY not configured' },
        { status: 500 }
      );
    }

    // Proxy to Groq API with system instruction for learning assistance
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
        temperature: body.temperature || 0.7,
        max_tokens: body.max_tokens || 1000,
        messages: [
          {
            role: 'system',
            content: `You are a helpful AI tutor for the Memorang learning platform. Your role is to:
- Answer questions about the lesson material
- Provide hints for questions WITHOUT giving away answers
- Explain concepts in an encouraging way
- Suggest study strategies
- Help users understand why answers are correct or incorrect

Always be supportive and guide users toward learning, not just giving answers.`,
          },
          ...body.messages,
        ],
      }),
    });

    if (!groqResponse.ok) {
      const error = await groqResponse.text();
      console.error('Groq API error:', error);
      return NextResponse.json(
        { error: 'Failed to get AI response' },
        { status: groqResponse.status }
      );
    }

    const data = await groqResponse.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('CopilotKit endpoint error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
