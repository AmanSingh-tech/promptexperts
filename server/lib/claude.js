import Anthropic from '@anthropic-ai/sdk';
import { HttpError } from './http.js';

let client;
function getClient() {
  client ??= new Anthropic();
  return client;
}

export const MODEL = () => process.env.CLAUDE_MODEL || 'claude-opus-5-5';

// Server-side refusal fallback: if the primary model declines, the API retries on a fallback model.
const FALLBACK = { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' };

function textOf(response) {
  return response.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();
}

function toHttpError(err) {
  if (err instanceof Anthropic.AuthenticationError) {
    return new HttpError(503, 'AI assistant is not configured (invalid or missing Anthropic credentials).');
  }
  if (err instanceof Anthropic.RateLimitError) return new HttpError(429, 'AI assistant is busy. Please retry in a moment.');
  if (err instanceof Anthropic.BadRequestError) return new HttpError(502, `AI request rejected: ${err.message}`);
  if (err instanceof Anthropic.APIError) return new HttpError(502, `AI service error (${err.status ?? 'network'}).`);
  if (/api ?key|auth/i.test(String(err?.message))) {
    return new HttpError(503, 'AI assistant is not configured. Set ANTHROPIC_API_KEY on the server.');
  }
  return err;
}

export function tutorSystemPrompt(problem) {
  return `You are the AI assistant built into AILOGRACER, a practice platform where people solve problems with AI help.
Their score depends on the solution AND on how well they use you, so help the way a strong senior engineer would: answer what is asked, explain reasoning, and point out bugs and edge cases.
If the user asks for a complete solution, you may provide it, but briefly mention that reviewers value understanding and their own reasoning over copied code.
Keep answers focused and use fenced code blocks for code.

The problem the user is working on:
Title: ${problem.title}
Type: ${problem.type === 'CODE' ? 'Coding problem (stdin/stdout, judged against hidden tests)' : 'Written answer (graded by a reviewer)'}
Category: ${problem.category}
Difficulty: ${problem.difficulty}

${problem.description}

${problem.constraints ? `Constraints:\n${problem.constraints}` : ''}`.trim();
}

export async function chat({ problem, history, message }) {
  const messages = [
    ...history.map((l) => ({ role: l.role === 'USER' ? 'user' : 'assistant', content: l.content })),
    { role: 'user', content: message }
  ];
  let response;
  try {
    response = await getClient().beta.messages.create({
      model: MODEL(),
      max_tokens: 16000,
      system: [{ type: 'text', text: tutorSystemPrompt(problem), cache_control: { type: 'ephemeral' } }],
      output_config: { effort: 'medium' },
      messages,
      ...FALLBACK
    });
  } catch (err) {
    throw toHttpError(err);
  }
  if (response.stop_reason === 'refusal') {
    throw new HttpError(422, 'The AI assistant declined to answer this message. Try rephrasing it.');
  }
  const text = textOf(response);
  if (!text) throw new HttpError(502, 'The AI assistant returned an empty response.');
  return {
    text,
    inputTokens: response.usage.input_tokens + (response.usage.cache_read_input_tokens ?? 0),
    outputTokens: response.usage.output_tokens
  };
}

const RUBRIC_SCHEMA = {
  type: 'object',
  properties: {
    aiEfficiency: { type: 'integer', enum: [1, 2, 3, 4, 5] },
    aiLearning: { type: 'integer', enum: [1, 2, 3, 4, 5] },
    aiTransparency: { type: 'integer', enum: [1, 2, 3, 4, 5] },
    aiInnovation: { type: 'integer', enum: [1, 2, 3, 4, 5] },
    rationale: { type: 'string' },
    strengths: { type: 'array', items: { type: 'string' } },
    concerns: { type: 'array', items: { type: 'string' } }
  },
  required: ['aiEfficiency', 'aiLearning', 'aiTransparency', 'aiInnovation', 'rationale', 'strengths', 'concerns'],
  additionalProperties: false
};

export async function reviewAiUsage({ problem, solve, logs, metrics }) {
  const transcript = logs
    .map((l) => `[${l.role === 'USER' ? 'PARTICIPANT' : 'AI'}${l.source === 'IMPORTED' ? ` via ${l.tool || 'external tool'}` : ''}]\n${l.content}`)
    .join('\n\n---\n\n');

  const prompt = `You are assisting a human reviewer on AILOGRACER. Participants solve problems with AI help and are graded on how well they used AI. Score this participant's AI usage on four 1-5 rubrics:

- aiEfficiency: quality and specificity of the questions asked (1 = vague or "just give me the answer", 5 = precise, well-scoped prompts with context).
- aiLearning: evidence the participant understood and built on the AI's suggestions rather than copying them (1 = copy-paste, 5 = clear understanding and adaptation).
- aiTransparency: how clearly the participant's own reasoning and process show in the conversation (1 = none, 5 = reasoning explained throughout).
- aiInnovation: creative or high-leverage use of AI, such as testing edge cases, comparing approaches, or reviewing their own code (1 = basic, 5 = inventive).

Judge only the participant's behaviour, not the quality of the AI's answers. The human reviewer makes the final decision; give a short rationale, strengths and concerns they can verify.

<problem title="${problem.title}" type="${problem.type}">
${problem.description}
</problem>

<submission status="${solve.status}" tests_passed="${solve.passedCount}/${solve.totalCount}" language="${solve.language}">
${solve.code}
</submission>

<automatic_metrics>
${JSON.stringify(metrics, null, 2)}
</automatic_metrics>

<transcript>
${transcript || '(no AI interaction recorded)'}
</transcript>`;

  let response;
  try {
    response = await getClient().beta.messages.create({
      model: MODEL(),
      max_tokens: 16000,
      output_config: { effort: 'high', format: { type: 'json_schema', schema: RUBRIC_SCHEMA } },
      messages: [{ role: 'user', content: prompt }],
      ...FALLBACK
    });
  } catch (err) {
    throw toHttpError(err);
  }
  if (response.stop_reason === 'refusal') throw new HttpError(422, 'The AI reviewer declined to review this submission.');
  try {
    return { ...JSON.parse(textOf(response)), model: response.model };
  } catch {
    throw new HttpError(502, 'The AI reviewer returned malformed output.');
  }
}
