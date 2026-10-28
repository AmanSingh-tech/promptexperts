const SOLUTION_REQUEST = /\b(give|write|send|provide|show|generate|paste|code)\b[^.?!\n]{0,40}\b(full|complete|entire|whole|final|working)?\s*(code|solution|answer|implementation|program)\b|\bsolve (it|this|the problem) for me\b|\bjust (give|write|send)\b/i;
const CONCEPTUAL = /\b(why|how (does|do|would|can)|explain|what is|what's the (difference|intuition)|difference between|intuition|complexity|big-?o|trade-?offs?|understand|concept|prove|correctness)\b/i;
const DEBUGGING = /\b(error|bug|wrong answer|fails?|failing|exception|segfault|tle|time limit|doesn'?t work|not working|debug|stack trace|crash)/i;
const OWN_REASONING = /\b(i think|my (idea|approach|plan|solution|code)|i tried|i'm (thinking|planning)|i was thinking|my understanding|i believe|so far i|i wrote|here'?s what i)\b/i;
const EXPLORATION = {
  testing: /\b(test cases?|edge cases?|corner cases?|unit tests?|test (it|this|my))\b/i,
  optimization: /\b(optimi[sz]e|faster|improve|reduce (time|memory|complexity)|better approach|more efficient)\b/i,
  alternatives: /\b(alternative|another (way|approach)|other approaches|compare|versus|vs\.?)\b/i,
  review: /\b(review|critique|feedback on|is this (correct|right|good)|check my)\b/i,
  learning: /\b(resources?|learn more|similar problems|practice|pattern)\b/i
};

const words = (s) => (s.match(/\S+/g) || []).length;
const hasCode = (s) => /```|;\s*$|\bdef \w+\(|\bfunction\b|#include|\bint main\b|=>/m.test(s);

function codeBlocks(text) {
  const blocks = [];
  const re = /```[^\n]*\n([\s\S]*?)```/g;
  let m;
  while ((m = re.exec(text))) blocks.push(m[1]);
  return blocks;
}

const normalizeLine = (l) => l.replace(/\s+/g, ' ').trim();
const significant = (l) => l.length > 3 && !/^[{}()[\];,]+$/.test(l) && !/^(\/\/|#(?!include)|\*|\/\*)/.test(l);

export function copyOverlap(finalCode, assistantTexts) {
  const aiLines = new Set();
  for (const t of assistantTexts) {
    for (const block of codeBlocks(t)) {
      for (const line of block.split('\n')) {
        const n = normalizeLine(line);
        if (significant(n)) aiLines.add(n);
      }
    }
  }
  const codeLines = String(finalCode || '').split('\n').map(normalizeLine).filter(significant);
  if (!codeLines.length || !aiLines.size) return 0;
  const copied = codeLines.filter((l) => aiLines.has(l)).length;
  return copied / codeLines.length;
}

const clamp = (n) => Math.max(1, Math.min(5, Math.round(n)));

const LARGE_PASTE_LINES = 8;

function lineOverlap(a, b) {
  const target = String(b || '').split('\n').map(normalizeLine).filter(significant);
  if (!target.length) return 0;
  const have = new Set(String(a || '').split('\n').map(normalizeLine).filter(significant));
  return target.filter((l) => have.has(l)).length / target.length;
}

export function analyzeProcess({ events = [], finalCode, problemType }) {
  const runs = events.filter((e) => e.type === 'RUN');
  const pastes = events.filter((e) => e.type === 'PASTE');
  const largePastes = pastes.filter((p) => (p.lines ?? 0) >= LARGE_PASTE_LINES);
  const firstSnapshot = events.find((e) => (e.type === 'RUN' || e.type === 'SUBMIT') && e.code);
  const firstRunCompleteness = problemType === 'CODE' && firstSnapshot ? lineOverlap(firstSnapshot.code, finalCode) : null;

  const metrics = {
    runs: runs.length,
    pastes: pastes.length,
    largePastes: largePastes.length,
    largestPasteLines: pastes.reduce((m, p) => Math.max(m, p.lines ?? 0), 0),
    firstRunCompletenessPct: firstRunCompleteness == null ? null : Math.round(firstRunCompleteness * 100)
  };

  const strengths = [];
  const concerns = [];
  if (largePastes.length) {
    concerns.push(`Pasted ${largePastes.length} large block(s) into the editor (largest ${metrics.largestPasteLines} lines).`);
  }
  if (problemType === 'CODE' && runs.length >= 3 && (firstRunCompleteness ?? 1) < 0.6) {
    strengths.push(`Built the solution up over ${runs.length} runs.`);
  }
  if (problemType === 'CODE' && firstRunCompleteness != null && firstRunCompleteness >= 0.9 && runs.length <= 1) {
    concerns.push('The first snapshot already matched the final code almost completely.');
  }
  return { metrics, strengths, concerns };
}

export function analyzeSession({ logs, events = [], finalCode, problemType }) {
  const process = analyzeProcess({ events, finalCode, problemType });
  const prompts = logs.filter((l) => l.role === 'USER');
  const replies = logs.filter((l) => l.role === 'ASSISTANT');
  const imported = logs.some((l) => l.source === 'IMPORTED');

  if (!prompts.length) {
    return {
      metrics: { promptCount: 0, importedLogs: imported, process: process.metrics },
      suggested: { aiEfficiency: 1, aiLearning: 1, aiTransparency: 1, aiInnovation: 1 },
      strengths: process.strengths,
      concerns: ['No AI interaction recorded for this submission.', ...process.concerns]
    };
  }

  const count = (re) => prompts.filter((p) => re.test(p.content)).length;
  const promptWords = prompts.map((p) => words(p.content));
  const avgPromptWords = promptWords.reduce((a, b) => a + b, 0) / prompts.length;
  const shortPrompts = promptWords.filter((w) => w < 5).length;
  const solutionRequests = count(SOLUTION_REQUEST);
  const conceptual = count(CONCEPTUAL);
  const debugging = count(DEBUGGING);
  const ownReasoning = count(OWN_REASONING);
  const sharedCode = prompts.filter((p) => hasCode(p.content)).length;
  const exploration = Object.entries(EXPLORATION)
    .filter(([, re]) => prompts.some((p) => re.test(p.content)))
    .map(([k]) => k);
  const overlap = problemType === 'CODE' ? copyOverlap(finalCode, replies.map((r) => r.content)) : 0;

  const times = logs.map((l) => new Date(l.timestamp).getTime()).filter(Number.isFinite);
  const durationMinutes = times.length > 1 ? Math.round((Math.max(...times) - Math.min(...times)) / 60000) : 0;

  const n = prompts.length;
  const solutionRatio = solutionRequests / n;
  const conceptualRatio = conceptual / n;

  const efficiency = clamp(
    3 +
      (avgPromptWords >= 15 ? 1 : avgPromptWords < 6 ? -1 : 0) +
      (sharedCode > 0 || ownReasoning > 0 ? 0.5 : 0) -
      (shortPrompts / n > 0.5 ? 1 : 0) -
      (n > 25 ? 0.5 : 0) -
      (solutionRatio > 0.5 ? 1 : 0)
  );
  const learning = clamp(
    3 + conceptualRatio * 3 - solutionRatio * 2 - (overlap > 0.7 ? 1.5 : overlap > 0.4 ? 0.75 : 0) + (overlap < 0.15 && n > 1 ? 0.5 : 0)
  );
  const transparency = clamp(1.5 + Math.min(ownReasoning, 3) * 0.75 + (sharedCode > 0 ? 0.5 : 0) + (n >= 3 ? 0.5 : 0) + (imported ? 0.25 : 0));
  const innovation = clamp(1.5 + exploration.length * 0.75 + (debugging > 0 ? 0.25 : 0) - (solutionRatio > 0.6 ? 0.75 : 0));

  const concerns = [];
  if (solutionRequests) concerns.push(`Asked the AI for a full solution ${solutionRequests} time(s).`);
  if (overlap > 0.4) concerns.push(`${Math.round(overlap * 100)}% of the submitted code matches AI-generated code line-for-line.`);
  if (shortPrompts / n > 0.5) concerns.push('Most prompts are very short (under 5 words).');
  if (!conceptual) concerns.push('No conceptual or "why" questions were asked.');

  const strengths = [];
  if (ownReasoning) strengths.push(`Explained their own reasoning in ${ownReasoning} prompt(s).`);
  if (conceptual) strengths.push(`Asked ${conceptual} conceptual "why/how" question(s).`);
  if (exploration.length) strengths.push(`Used AI for: ${exploration.join(', ')}.`);
  if (sharedCode) strengths.push(`Shared their own code for feedback in ${sharedCode} prompt(s).`);

  return {
    metrics: {
      promptCount: n,
      avgPromptWords: Math.round(avgPromptWords),
      solutionRequests,
      conceptualQuestions: conceptual,
      debuggingPrompts: debugging,
      ownReasoningPrompts: ownReasoning,
      promptsWithCode: sharedCode,
      explorationAreas: exploration,
      copyOverlapPct: Math.round(overlap * 100),
      durationMinutes,
      importedLogs: imported,
      process: process.metrics
    },
    suggested: { aiEfficiency: efficiency, aiLearning: learning, aiTransparency: transparency, aiInnovation: innovation },
    strengths: [...strengths, ...process.strengths],
    concerns: [...concerns, ...process.concerns]
  };
}
