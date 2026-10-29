import test from 'node:test';
import assert from 'node:assert/strict';
import { askAxel, policy } from './claude-router.mjs';
const good = { stop_reason: 'end_turn', content: [{ type: 'text', text: 'Ready for review.' }], usage: { output_tokens: 10 } };
function mock(results) {
  const calls = [];
  return { calls, messages: { create: async p => { calls.push(p); const r = results.shift(); if (r instanceof Error) throw r; return r; } } };
}
test('image generation blocked without network', async () => {
  const c = mock([]); assert.equal((await askAxel({ prompt: 'create image', intent: 'image_generation' }, c)).status, 'blocked'); assert.equal(c.calls.length, 0);
});
test('Haiku is default, bounded output, no sampling or execution tools', async () => {
  const c = mock([good]); assert.equal((await askAxel({ prompt: 'Update my site', taskClass: 'complex' }, c)).status, 'complete');
  assert.equal(c.calls[0].model, policy.defaultModel); assert.equal(c.calls[0].max_tokens, 16384);
  for (const k of ['temperature', 'top_p', 'top_k', 'tools']) assert.equal(k in c.calls[0], false);
});
test('overload can fall back once', async () => {
  const c = mock([Object.assign(new Error(), { status: 529 }), good]);
  assert.equal((await askAxel({ prompt: 'Check my site' }, c)).model, policy.fallbackModel); assert.equal(c.calls.length, 2);
});
test('authentication errors never trigger expensive fallback', async () => {
  const c = mock([Object.assign(new Error(), { status: 401 })]);
  await assert.rejects(askAxel({ prompt: 'Check my site' }, c)); assert.equal(c.calls.length, 1);
});
test('refusals never bypassed by fallback', async () => {
  const c = mock([{ ...good, stop_reason: 'refusal' }]);
  assert.equal((await askAxel({ prompt: 'Check task' }, c)).status, 'refused'); assert.equal(c.calls.length, 1);
});
test('truncated or invalid output is never presented as success', async () => {
  const c = mock([{ ...good, stop_reason: 'max_tokens' }, good]);
  assert.equal((await askAxel({ prompt: 'Check task', validate: () => false }, c)).status, 'needs_review'); assert.equal(c.calls.length, 2);
});
