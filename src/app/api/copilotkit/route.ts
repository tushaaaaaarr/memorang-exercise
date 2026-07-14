import {
  CopilotRuntime,
  GroqAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from '@copilotkit/runtime';
import { AbstractAgent, EventType, RunAgentInput, BaseEvent } from '@ag-ui/client';
import { Observable } from 'rxjs';
import { ChatGroq } from '@langchain/groq';
import { SystemMessage, HumanMessage, AIMessage } from '@langchain/core/messages';
import { NextRequest } from 'next/server';
import { v4 as uuid } from 'uuid';

export const runtime = 'nodejs';

const TUTOR_SYSTEM_PROMPT = `You are an encouraging AI tutor for Memorang AI.
- Help the student understand lesson material
- Provide hints that guide thinking WITHOUT revealing answers directly
- If asked for the direct answer, say "I can't give that away, but here's a hint: ..."
- Reference the current objective and question when relevant
- Keep responses brief and supportive
- When the quiz is complete, celebrate the student's achievement`;

const groqModel = new ChatGroq({
  model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
  apiKey: process.env.GROQ_API_KEY,
  streaming: true,
});

// Minimal in-process AG-UI agent backed by LangChain + Groq
class TutorAgent extends AbstractAgent {
  run(input: RunAgentInput): Observable<BaseEvent> {
    return new Observable((subscriber) => {
      const msgId = uuid();
      const runId = uuid();
      (async () => {
        try {
          subscriber.next({ type: EventType.RUN_STARTED, threadId: this.threadId, runId });
          subscriber.next({ type: EventType.TEXT_MESSAGE_START, messageId: msgId, role: 'assistant' });

          const langchainMessages = [
            new SystemMessage(TUTOR_SYSTEM_PROMPT),
            ...(input.messages ?? []).map((m) =>
              m.role === 'user'
                ? new HumanMessage(m.content ?? '')
                : new AIMessage(m.content ?? '')
            ),
          ];

          const stream = await groqModel.stream(langchainMessages);
          for await (const chunk of stream) {
            const text = typeof chunk.content === 'string' ? chunk.content : '';
            if (text) {
              subscriber.next({ type: EventType.TEXT_MESSAGE_CONTENT, messageId: msgId, delta: text });
            }
          }

          subscriber.next({ type: EventType.TEXT_MESSAGE_END, messageId: msgId });
          subscriber.next({ type: EventType.RUN_FINISHED, threadId: this.threadId, runId });
          subscriber.complete();
        } catch (err) {
          subscriber.error(err);
        }
      })();
    });
  }
}

const copilotRuntime = new CopilotRuntime({
  agents: {
    default: new TutorAgent({ description: 'AI Tutor for Memorang lessons' }),
  },
});

export async function POST(req: NextRequest) {
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime: copilotRuntime,
    serviceAdapter: new GroqAdapter({
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    }),
    endpoint: '/api/copilotkit',
  });
  return handleRequest(req);
}

