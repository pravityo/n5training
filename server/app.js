import express from 'express';
import { grammar } from './content/grammar.js';
import { vocab } from './content/vocab.js';
import { kanji } from './content/kanji.js';
import { schedule, cardFor, allKeys, GRADES } from './srs.js';
import { buildPlan, parseDay, fmtDay, daysBetween } from './plan.js';
import {
  grammarQuestions, vocabQuestions, kanjiQuestions, readingQuestions, listeningQuestions, buildExam, publicQuestion, gradeExam, shuffle, EXAM_PLAN,
} from './questions.js';

const EXAM_SECONDS = 50 * 60;

export function createApp(db) {
  const app = express();
  app.use(express.json());

  const record = db.prepare('INSERT INTO attempts (ts, mode, qkey, tag, correct) VALUES (?, ?, ?, ?, ?)');

  app.get('/api/grammar', (_req, res) => {
    res.json(grammar.map(({ id, title, pattern, meaning }) => ({ id, title, pattern, meaning })));
  });

  app.get('/api/grammar/:id', (req, res) => {
    const g = grammar.find((x) => x.id === req.params.id);
    if (!g) return res.status(404).json({ error: 'not found' });
    const { drills, ...lesson } = g;
    res.json(lesson);
  });

  const weakTags = () => db.prepare('SELECT tag, COUNT(*) AS total, SUM(correct) AS correct FROM attempts GROUP BY tag HAVING total >= 3')
    .all().sort((x, y) => x.correct / x.total - y.correct / y.total).slice(0, 5).map((r) => r.tag);

  function weakQuestions(count) {
    const tags = weakTags();
    const grammarIds = new Set(grammar.map((g) => g.id));
    const cats = new Set(vocab.map((v) => v.cat));
    const pool = [];
    for (const t of tags) {
      if (grammarIds.has(t)) pool.push(...grammarQuestions(Math.random, t));
      else if (t === 'kanji') pool.push(...kanjiQuestions(4));
      else if (cats.has(t)) pool.push(...vocabQuestions(4, Math.random, t));
    }
    // Not enough history yet: fall back to mixed grammar so the task is still useful.
    if (pool.length < count) pool.push(...shuffle(grammarQuestions()).slice(0, count - pool.length));
    return shuffle(pool).slice(0, count);
  }

  // Practice sessions return answers so feedback is instant; exams never do.
  app.get('/api/practice', (req, res) => {
    const { kind = 'grammar', topic, n = '10', range, level } = req.query;
    const count = Math.min(Math.max(parseInt(n, 10) || 10, 1), 50);
    let ids = null;
    if (range) {
      const m = /^(\d+)-(\d+)$/.exec(range);
      if (!m) return res.status(400).json({ error: 'range must look like 1-40' });
      ids = [Number(m[1]), Number(m[2])];
    }
    const lvl = level ? Number(level) : undefined;
    let qs;
    if (kind === 'grammar') qs = shuffle(grammarQuestions(Math.random, topic || undefined)).slice(0, count);
    else if (kind === 'vocab') qs = vocabQuestions(count, Math.random, topic || undefined, ids);
    else if (kind === 'kanji') qs = kanjiQuestions(count, Math.random, { level: lvl, range: ids });
    else if (kind === 'reading') qs = readingQuestions(count);
    else if (kind === 'listening') qs = listeningQuestions(count);
    else if (kind === 'weak') qs = weakQuestions(count);
    else return res.status(400).json({ error: 'kind must be grammar, vocab, kanji, reading, listening or weak' });
    res.json(qs);
  });

  app.post('/api/attempts', (req, res) => {
    const { mode = 'practice', key, tag, correct } = req.body ?? {};
    if (typeof key !== 'string' || typeof tag !== 'string' || typeof correct !== 'boolean') {
      return res.status(400).json({ error: 'key, tag, correct required' });
    }
    record.run(Date.now(), mode, key, tag, correct ? 1 : 0);
    res.status(201).json({ ok: true });
  });

  app.get('/api/vocab', (req, res) => {
    const { cat } = req.query;
    res.json(cat ? vocab.filter((v) => v.cat === cat) : vocab);
  });

  app.get('/api/kanji', (_req, res) => res.json(kanji));

  app.post('/api/exams', (_req, res) => {
    const questions = buildExam();
    const info = db.prepare('INSERT INTO exams (started, limit_sec, questions) VALUES (?, ?, ?)')
      .run(Date.now(), EXAM_SECONDS, JSON.stringify(questions));
    res.status(201).json({
      id: Number(info.lastInsertRowid), limitSec: EXAM_SECONDS, plan: EXAM_PLAN,
      questions: questions.map(publicQuestion),
    });
  });

  app.post('/api/exams/:id/submit', (req, res) => {
    const row = db.prepare('SELECT * FROM exams WHERE id = ?').get(Number(req.params.id));
    if (!row) return res.status(404).json({ error: 'not found' });
    if (row.finished) return res.status(409).json({ error: 'already submitted' });
    const questions = JSON.parse(row.questions);
    const given = req.body?.answers;
    if (!Array.isArray(given) || given.length !== questions.length) {
      return res.status(400).json({ error: `answers must be an array of ${questions.length}` });
    }
    const result = gradeExam(questions, given);
    const now = Date.now();
    db.prepare('UPDATE exams SET finished = ?, result = ? WHERE id = ?').run(now, JSON.stringify(result), row.id);
    db.exec('BEGIN');
    try {
      questions.forEach((q, i) => record.run(now, 'exam', q.key, q.tag, given[i] === q.answer ? 1 : 0));
      db.exec('COMMIT');
    } catch (e) { db.exec('ROLLBACK'); throw e; }
    res.json({
      ...result,
      review: questions.map((q, i) => ({ ...publicQuestion(q), answer: q.answer, explain: q.explain, given: given[i] ?? null })),
    });
  });

  app.get('/api/stats', (_req, res) => {
    const byTag = db.prepare(`
      SELECT tag, COUNT(*) AS total, SUM(correct) AS correct FROM attempts GROUP BY tag
    `).all().map((r) => ({ ...r, accuracy: r.total ? r.correct / r.total : 0 }));
    const exams = db.prepare('SELECT id, started, finished, result FROM exams WHERE finished IS NOT NULL ORDER BY id DESC LIMIT 20')
      .all().map((e) => ({ id: e.id, started: e.started, finished: e.finished, ...JSON.parse(e.result), review: undefined }));
    const days = db.prepare(`
      SELECT date(ts / 1000, 'unixepoch') AS day, COUNT(*) AS n, SUM(correct) AS correct
      FROM attempts GROUP BY day ORDER BY day DESC LIMIT 30
    `).all();
    const weak = byTag.filter((t) => t.total >= 3).sort((a, b) => a.accuracy - b.accuracy).slice(0, 5);
    res.json({ byTag, weak, exams, days });
  });

  // Spaced repetition flashcards for vocabulary and kanji.
  const dayParam = (v) => (Number.isNaN(parseDay(v)) ? fmtDay(Date.now()) : v);
  const srsSources = new Set(['vocab', 'kanji', 'all']);

  app.get('/api/srs/session', (req, res) => {
    const source = srsSources.has(req.query.source) ? req.query.source : 'all';
    const today = dayParam(req.query.today);
    const parsedNew = parseInt(req.query.newLimit, 10);
    const newLimit = Math.min(Math.max(Number.isNaN(parsedNew) ? 10 : parsedNew, 0), 50);
    const keys = allKeys(source);
    const inSource = new Set(keys);
    const rows = db.prepare('SELECT key, due FROM srs').all();
    const known = new Set(rows.map((r) => r.key));
    const due = rows.filter((r) => r.due <= today && inSource.has(r.key)).sort((a, b) => a.due.localeCompare(b.due)).map((r) => r.key);
    const fresh = keys.filter((k) => !known.has(k)).slice(0, newLimit);
    res.json({
      dueCount: due.length, newCount: fresh.length,
      cards: [...due.slice(0, 100).map((k) => ({ ...cardFor(k), isNew: false })), ...fresh.map((k) => ({ ...cardFor(k), isNew: true }))],
    });
  });

  app.post('/api/srs/grade', (req, res) => {
    const { key, grade } = req.body ?? {};
    const today = dayParam(req.body?.today);
    if (!GRADES.includes(grade) || typeof key !== 'string' || !cardFor(key)) return res.status(400).json({ error: 'valid key and grade required' });
    const cur = db.prepare('SELECT * FROM srs WHERE key = ?').get(key);
    const next = schedule(cur, grade, today);
    db.prepare(`INSERT INTO srs (key, ease, interval, reps, lapses, due) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET ease = excluded.ease, interval = excluded.interval, reps = excluded.reps, lapses = excluded.lapses, due = excluded.due`)
      .run(key, next.ease, next.interval, next.reps, next.lapses, next.due);
    record.run(Date.now(), 'srs', key, key.startsWith('k:') ? 'kanji' : cardFor(key).hint, grade === 'again' ? 0 : 1);
    res.json({ interval: next.interval, due: next.due });
  });

  app.get('/api/srs/stats', (req, res) => {
    const today = dayParam(req.query.today);
    const total = db.prepare('SELECT COUNT(*) AS n FROM srs').get().n;
    const due = db.prepare('SELECT COUNT(*) AS n FROM srs WHERE due <= ?').get(today).n;
    const mature = db.prepare('SELECT COUNT(*) AS n FROM srs WHERE interval >= 21').get().n;
    res.json({ total, due, mature, available: allKeys('all').length });
  });

  // Study plan: settings plus per-day task completion. The schedule itself is derived, not stored.
  const getSetting = (k) => db.prepare('SELECT value FROM settings WHERE key = ?').get(k)?.value;
  const setSetting = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');

  app.get('/api/plan', (req, res) => {
    const examDay = getSetting('examDay');
    if (!examDay) return res.json({ configured: false });
    const startDay = getSetting('startDay');
    const includeN4 = getSetting('includeN4') === '1';
    const days = buildPlan({ startDay, examDay, includeN4 });
    const done = {};
    for (const r of db.prepare('SELECT day, task_id FROM plan_done').all()) (done[r.day] ??= []).push(r.task_id);
    const today = parseDay(req.query.today) ? req.query.today : fmtDay(Date.now());
    res.json({ configured: true, startDay, examDay, includeN4, today, daysToExam: daysBetween(today, examDay), days, done });
  });

  app.put('/api/plan/settings', (req, res) => {
    const { examDay, startDay, includeN4 = false } = req.body ?? {};
    const today = parseDay(req.body?.today) ? req.body.today : fmtDay(Date.now());
    if (Number.isNaN(parseDay(examDay))) return res.status(400).json({ error: 'examDay must be YYYY-MM-DD' });
    const start = startDay ?? today;
    if (Number.isNaN(parseDay(start))) return res.status(400).json({ error: 'startDay must be YYYY-MM-DD' });
    if (daysBetween(start, examDay) < 0) return res.status(400).json({ error: 'exam date must not be before the start date' });
    setSetting.run('examDay', examDay);
    setSetting.run('startDay', start);
    setSetting.run('includeN4', includeN4 ? '1' : '0');
    db.exec('DELETE FROM plan_done');
    res.json({ ok: true });
  });

  app.post('/api/plan/done', (req, res) => {
    const { day, taskId, done } = req.body ?? {};
    if (Number.isNaN(parseDay(day)) || typeof taskId !== 'string') return res.status(400).json({ error: 'day and taskId required' });
    if (done) db.prepare('INSERT OR IGNORE INTO plan_done (day, task_id) VALUES (?, ?)').run(day, taskId);
    else db.prepare('DELETE FROM plan_done WHERE day = ? AND task_id = ?').run(day, taskId);
    res.json({ ok: true });
  });

  return app;
}
