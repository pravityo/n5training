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

import { buildPlan } from './plan.js';
import { kanji } from './content/kanji.js';
import { vocab } from './content/vocab.js';

function linksOf(days, re) {
  return days.flatMap((d) => d.tasks).map((t) => t.href).filter((h) => h && re.test(h));
}

for (const total of [1, 2, 3, 7, 30, 60, 90]) {
  test(`plan covers all content exactly once over ${total} days`, () => {
    const start = '2026-11-01';
    const end = new Date(Date.parse(`${start}T00:00:00Z`) + (total - 1) * 86_400_000).toISOString().slice(0, 10);
    const days = buildPlan({ startDay: start, examDay: end, includeN4: true });
    assert.equal(days.length, total);
    assert.equal(days.at(-1).phase, 'exam');
    if (total >= 4) {
      const grammarLinks = linksOf(days, /^\/grammar\//);
      assert.equal(new Set(grammarLinks).size, grammar.length);
      assert.equal(grammarLinks.length, grammar.length);
      const vocabRanges = days.flatMap((d) => d.tasks).filter((t) => t.id === 'vocab-study').map((t) => t.href.match(/from=(\d+)&to=(\d+)/).slice(1).map(Number));
      assert.equal(vocabRanges[0][0], 1);
      assert.equal(vocabRanges.at(-1)[1], vocab.length);
      for (let i = 1; i < vocabRanges.length; i++) assert.equal(vocabRanges[i][0], vocabRanges[i - 1][1] + 1);
      const n5 = kanji.filter((k) => k.level === 5).length;
      const kr = days.flatMap((d) => d.tasks).filter((t) => t.id === 'kanji-study').map((t) => t.href.match(/from=(\d+)&to=(\d+)/).slice(1).map(Number));
      assert.equal(kr.at(-1)[1], n5);
    }
  });
}

test('plan has a mock exam in the review phase and a light day before the exam', () => {
  const days = buildPlan({ startDay: '2026-11-01', examDay: '2027-01-15' });
  assert.ok(days.some((d) => d.tasks.some((t) => t.id === 'mock')));
  assert.equal(days.at(-2).phase, 'light');
  assert.ok(days.filter((d) => d.phase === 'learn').length > days.length / 2);
});

test('plan API: settings, completion and weak-spot practice', async () => {
  const app = createApp(openDb(':memory:'));
  const server = app.listen(0);
  const base = `http://localhost:${server.address().port}`;
  const json = (m, p, b) => fetch(base + p, { method: m, headers: { 'content-type': 'application/json' }, body: b && JSON.stringify(b) });
  try {
    assert.equal((await (await fetch(`${base}/api/plan`)).json()).configured, false);
    assert.equal((await json('PUT', '/api/plan/settings', { examDay: 'nope' })).status, 400);
    assert.equal((await json('PUT', '/api/plan/settings', { examDay: '2026-12-01', today: '2026-11-01' })).status, 200);
    const plan = await (await fetch(`${base}/api/plan?today=2026-11-01`)).json();
    assert.equal(plan.days.length, 31);
    assert.equal(plan.daysToExam, 30);
    await json('POST', '/api/plan/done', { day: '2026-11-01', taskId: 'vocab-study', done: true });
    const after = await (await fetch(`${base}/api/plan?today=2026-11-01`)).json();
    assert.deepEqual(after.done['2026-11-01'], ['vocab-study']);
    const weak = await (await fetch(`${base}/api/practice?kind=weak&n=6`)).json();
    assert.equal(weak.length, 6);
    const range = await (await fetch(`${base}/api/practice?kind=vocab&range=1-12&n=5`)).json();
    assert.ok(range.every((q) => Number(q.key.split(':')[1]) <= 12));
  } finally { server.close(); }
});

import { schedule, cardFor, allKeys } from './srs.js';

test('srs scheduling grows intervals on good answers and resets on again', () => {
  const t = '2026-11-01';
  let c = schedule(null, 'good', t);
  assert.deepEqual([c.interval, c.due], [1, '2026-11-02']);
  c = schedule(c, 'good', '2026-11-02');
  assert.equal(c.interval, 3);
  c = schedule(c, 'good', '2026-11-05');
  assert.equal(c.interval, Math.round(3 * 2.5));
  const lapsed = schedule(c, 'again', '2026-11-13');
  assert.deepEqual([lapsed.interval, lapsed.reps, lapsed.lapses, lapsed.due], [0, 0, 1, '2026-11-13']);
  assert.ok(lapsed.ease < c.ease && lapsed.ease >= 1.3);
  assert.ok(schedule(c, 'easy', t).interval > schedule(c, 'good', t).interval);
  assert.ok(schedule(c, 'hard', t).interval >= 1);
  let e = { ease: 1.3, interval: 1, reps: 5, lapses: 0 };
  for (let i = 0; i < 10; i++) e = schedule(e, 'again', t);
  assert.equal(e.ease, 1.3);
});

test('every flashcard key resolves to a card', () => {
  for (const k of allKeys('all')) assert.ok(cardFor(k), k);
  assert.equal(allKeys('all').length, allKeys('vocab').length + allKeys('kanji').length);
});

test('srs API: new cards, grading, due logic', async () => {
  const app = createApp(openDb(':memory:'));
  const server = app.listen(0);
  const base = `http://localhost:${server.address().port}`;
  const post = (p, b) => fetch(base + p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) });
  try {
    const s1 = await (await fetch(`${base}/api/srs/session?source=vocab&newLimit=3&today=2026-11-01`)).json();
    assert.equal(s1.cards.length, 3);
    assert.ok(s1.cards.every((c) => c.isNew && c.type === 'vocab'));
    assert.equal((await post('/api/srs/grade', { key: s1.cards[0].key, grade: 'nope', today: '2026-11-01' })).status, 400);
    const g = await (await post('/api/srs/grade', { key: s1.cards[0].key, grade: 'good', today: '2026-11-01' })).json();
    assert.equal(g.due, '2026-11-02');
    await post('/api/srs/grade', { key: s1.cards[1].key, grade: 'again', today: '2026-11-01' });
    const same = await (await fetch(`${base}/api/srs/session?source=vocab&newLimit=0&today=2026-11-01`)).json();
    assert.deepEqual(same.cards.map((c) => c.key), [s1.cards[1].key]);
    const next = await (await fetch(`${base}/api/srs/session?source=vocab&newLimit=0&today=2026-11-02`)).json();
    assert.equal(next.dueCount, 2);
    const st = await (await fetch(`${base}/api/srs/stats?today=2026-11-02`)).json();
    assert.deepEqual([st.total, st.due], [2, 2]);
  } finally { server.close(); }
});
