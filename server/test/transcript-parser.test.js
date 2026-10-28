import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseTranscript } from '../lib/transcript-parser.js';

test('parses labelled plain-text transcripts', () => {
  const msgs = parseTranscript(`User: How do I solve two sum?
Maybe with a hash map?
ChatGPT: Yes, store each value's index.

\`\`\`python
User: this line is inside code and must not split
\`\`\`
You: thanks`);
  assert.equal(msgs.length, 3);
  assert.deepEqual(msgs.map((m) => m.role), ['USER', 'ASSISTANT', 'USER']);
  assert.match(msgs[0].content, /hash map/);
  assert.match(msgs[1].content, /must not split/);
});

test('parses markdown headings and bold labels', () => {
  const msgs = parseTranscript('## User\nhello\n## Claude\nhi there\n**Me:** bye');
  assert.deepEqual(msgs, [
    { role: 'USER', content: 'hello' },
    { role: 'ASSISTANT', content: 'hi there' },
    { role: 'USER', content: 'bye' }
  ]);
});

test('parses JSON message arrays and merges consecutive turns', () => {
  const msgs = parseTranscript(JSON.stringify([
    { role: 'user', content: 'a' },
    { role: 'user', content: [{ type: 'text', text: 'b' }] },
    { role: 'assistant', content: 'c' },
    { role: 'system', content: 'ignored' }
  ]));
  assert.deepEqual(msgs, [
    { role: 'USER', content: 'a\n\nb' },
    { role: 'ASSISTANT', content: 'c' }
  ]);
});

test('parses ChatGPT export mapping format in time order', () => {
  const msgs = parseTranscript(JSON.stringify({
    mapping: {
      b: { message: { create_time: 2, author: { role: 'assistant' }, content: { parts: ['answer'] } } },
      a: { message: { create_time: 1, author: { role: 'user' }, content: { parts: ['question'] } } },
      root: { message: null }
    }
  }));
  assert.deepEqual(msgs.map((m) => m.content), ['question', 'answer']);
});

test('returns nothing for unlabelled text', () => {
  assert.deepEqual(parseTranscript('just some notes without speakers'), []);
});
