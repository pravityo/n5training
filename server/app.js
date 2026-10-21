import express from 'express';
import { grammar } from './content/grammar.js';
import { vocab } from './content/vocab.js';
import { kanji } from './content/kanji.js';
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

  // Practice sessions return answers so feedback is instant; exams never do.
  app.get('/api/practice', (req, res) => {
    const { kind = 'grammar', topic, n = '10' } = req.query;
    const count = Math.min(Math.max(parseInt(n, 10) || 10, 1), 50);
    let qs;
    if (kind === 'grammar') qs = shuffle(grammarQuestions(Math.random, topic || undefined)).slice(0, count);
    else if (kind === 'vocab') qs = vocabQuestions(count, Math.random, topic || undefined);
    else if (kind === 'kanji') qs = kanjiQuestions(count);
    else if (kind === 'reading') qs = readingQuestions(count);
    else if (kind === 'listening') qs = listeningQuestions(count);
    else return res.status(400).json({ error: 'kind must be grammar, vocab, kanji, reading or listening' });
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

  return app;
}
