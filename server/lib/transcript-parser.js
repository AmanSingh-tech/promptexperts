const USER_LABELS = ['user', 'you', 'me', 'human', 'prompt', 'question', 'q'];
const ASSISTANT_LABELS = [
  'assistant', 'ai', 'claude', 'chatgpt', 'gpt', 'gpt-4', 'gpt-4o', 'gemini', 'copilot',
  'bard', 'bot', 'model', 'response', 'answer', 'a', 'cursor', 'deepseek', 'llama', 'mistral'
];

const MARKER = /^\s*(?:#{1,6}\s*)?(?:\*\*|__)?\s*([A-Za-z][\w .-]{0,20}?)\s*(?:\*\*|__)?\s*:(?:\*\*|__)?\s*(.*)$/;
const HEADING = /^\s*#{1,6}\s*([A-Za-z][\w .-]{0,20}?)\s*$/;

function roleFor(label) {
  const l = label.trim().toLowerCase();
  if (USER_LABELS.includes(l)) return 'USER';
  if (ASSISTANT_LABELS.includes(l)) return 'ASSISTANT';
  return null;
}

function normalizeRole(role) {
  const r = String(role || '').toLowerCase();
  if (['user', 'human'].includes(r)) return 'USER';
  if (['assistant', 'ai', 'model', 'bot'].includes(r)) return 'ASSISTANT';
  return null;
}

function contentToText(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((c) => (typeof c === 'string' ? c : c?.text ?? ''))
      .filter(Boolean)
      .join('\n');
  }
  if (content && Array.isArray(content.parts)) return content.parts.filter((p) => typeof p === 'string').join('\n');
  return '';
}

function parseJson(raw) {
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  const list = Array.isArray(data) ? data : Array.isArray(data?.messages) ? data.messages : null;
  if (list) {
    return list
      .map((m) => ({ role: normalizeRole(m.role ?? m.author?.role ?? m.sender), content: contentToText(m.content ?? m.text).trim() }))
      .filter((m) => m.role && m.content);
  }
  if (data && typeof data.mapping === 'object') {
    // ChatGPT export: nodes keyed by id; order by create_time.
    return Object.values(data.mapping)
      .map((n) => n.message)
      .filter(Boolean)
      .sort((a, b) => (a.create_time ?? 0) - (b.create_time ?? 0))
      .map((m) => ({ role: normalizeRole(m.author?.role), content: contentToText(m.content).trim() }))
      .filter((m) => m.role && m.content);
  }
  return [];
}

function parseText(raw) {
  const messages = [];
  let current = null;
  let inFence = false;
  for (const line of raw.replace(/\r\n/g, '\n').split('\n')) {
    if (/^\s*```/.test(line)) inFence = !inFence;
    if (!inFence) {
      const heading = line.match(HEADING);
      const marker = heading ? null : line.match(MARKER);
      const role = heading ? roleFor(heading[1]) : marker ? roleFor(marker[1]) : null;
      if (role) {
        if (current) messages.push(current);
        current = { role, lines: marker && marker[2] ? [marker[2]] : [] };
        continue;
      }
    }
    if (current) current.lines.push(line);
  }
  if (current) messages.push(current);
  return messages
    .map((m) => ({ role: m.role, content: m.lines.join('\n').trim() }))
    .filter((m) => m.content);
}

export function parseTranscript(raw) {
  const text = String(raw || '').trim();
  if (!text) return [];
  if (text.startsWith('[') || text.startsWith('{')) {
    const fromJson = parseJson(text);
    if (fromJson) return mergeAdjacent(fromJson);
  }
  return mergeAdjacent(parseText(text));
}

function mergeAdjacent(messages) {
  const out = [];
  for (const m of messages) {
    const last = out[out.length - 1];
    if (last && last.role === m.role) last.content += `\n\n${m.content}`;
    else out.push({ ...m });
  }
  return out;
}
