import { test } from 'node:test';
import assert from 'node:assert/strict';
import { outputsMatch } from '../lib/judge.js';

test('output comparison ignores trailing whitespace and line endings', () => {
  assert.ok(outputsMatch('1 2  \r\n3\n\n', '1 2\n3'));
  assert.ok(!outputsMatch('1 2', '1  2'));
  assert.ok(!outputsMatch('12', '1\n2'));
});
