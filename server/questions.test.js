import test from 'node:test';
import assert from 'node:assert/strict';
import { buildExam, gradeExam, grammarQuestions, vocabQuestions, kanjiQuestions, EXAM_PLAN } from './questions.js';
import { grammar } from './content/grammar.js';
import { openDb } from './db.js';
import { createApp } from './app.js';

test('every grammar drill has 4 unique choices and a valid answer', () => {
  for (const g of grammar) for (const d of g.drills) {
    assert.equal(d.choices.length, 4, g.id);
    assert.equal(new Set(d.choices).size, 4, `${g.id}: duplicate choices`);
    assert.ok(d.answer >= 0 && d.answer < 4, g.id);
  }
});

test('shuffled questions keep the correct answer', () => {
  for (const q of grammarQuestions()) assert.ok(q.choices[q.answer] !== undefined);
  for (const q of vocabQuestions(50)) {
    assert.equal(q.choices.length, 4);
    assert.equal(new Set(q.choices).size, 4, q.prompt);
  }
});

test('kanji questions have 4 unique choices and a correct answer', () => {
  for (let i = 0; i < 20; i++) for (const q of kanjiQuestions(30)) {
    assert.equal(q.choices.length, 4, q.prompt);
    assert.equal(new Set(q.choices).size, 4, q.prompt);
    assert.ok(q.choices[q.answer]);
  }
});

test('content ids are unique', async () => {
  const { vocab } = await import('./content/vocab.js');
  const { listening } = await import('./content/listening.js');
  const { reading } = await import('./content/reading.js');
  for (const list of [vocab.map((v) => v.id), grammar.map((g) => g.id), listening.map((l) => l.id), reading.map((r) => r.id)]) {
    assert.equal(new Set(list).size, list.length);
  }
  for (const l of listening) assert.ok(l.answer >= 0 && l.answer < l.choices.length, l.id);
});

test('exam has the planned size and grades correctly', () => {
  const qs = buildExam();
  assert.equal(qs.length, Object.values(EXAM_PLAN).reduce((a, b) => a + b, 0));
  const perfect = gradeExam(qs, qs.map((q) => q.answer));
  assert.equal(perfect.scaled, 180);
  assert.ok(perfect.passed);
  const none = gradeExam(qs, qs.map((q) => (q.answer + 1) % 4));
  assert.equal(none.scaled, 0);
  assert.ok(!none.passed);
});

test('exam API hides answers, grades server-side, and records stats', async () => {
  const app = createApp(openDb(':memory:'));
  const server = app.listen(0);
  const base = `http://localhost:${server.address().port}`;
  try {
    const exam = await (await fetch(`${base}/api/exams`, { method: 'POST' })).json();
    assert.ok(exam.questions.every((q) => !('answer' in q) && !('explain' in q)));
    const res = await (await fetch(`${base}/api/exams/${exam.id}/submit`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ answers: exam.questions.map(() => 0) }),
    })).json();
    assert.ok(res.review.length === exam.questions.length);
    const again = await fetch(`${base}/api/exams/${exam.id}/submit`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ answers: [] }),
    });
    assert.equal(again.status, 409);
    const stats = await (await fetch(`${base}/api/stats`)).json();
    assert.equal(stats.exams.length, 1);
    assert.ok(stats.byTag.length > 0);
  } finally { server.close(); }
});
