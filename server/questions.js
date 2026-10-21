import { grammar } from './content/grammar.js';
import { vocab } from './content/vocab.js';
import { listening } from './content/listening.js';
import { reading } from './content/reading.js';

export function shuffle(arr, rng = Math.random) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const pick = (arr, n, rng) => shuffle(arr, rng).slice(0, n);

// Re-orders choices so the correct one is not always first, and returns the new answer index.
function withShuffledChoices(q, rng) {
  const order = shuffle(q.choices.map((_, i) => i), rng);
  return { ...q, choices: order.map((i) => q.choices[i]), answer: order.indexOf(q.answer) };
}

export function grammarQuestions(rng = Math.random, onlyId) {
  const out = [];
  for (const g of grammar) {
    if (onlyId && g.id !== onlyId) continue;
    g.drills.forEach((d, n) => out.push(withShuffledChoices({
      key: `g:${g.id}:${n}`, section: 'grammar', tag: g.id,
      prompt: d.prompt, choices: d.choices, answer: d.answer, explain: d.explain,
    }, rng)));
  }
  return out;
}

const KINDS = ['reading', 'meaning', 'word'];

export function vocabQuestion(entry, kind, rng = Math.random) {
  const pool = vocab.filter((v) => v.id !== entry.id);
  const sameCat = pool.filter((v) => v.cat === entry.cat);
  const distract = (field) => {
    const seen = new Set([entry[field]]);
    const picks = [];
    for (const v of [...shuffle(sameCat, rng), ...shuffle(pool, rng)]) {
      if (seen.has(v[field])) continue;
      seen.add(v[field]);
      picks.push(v[field]);
      if (picks.length === 3) break;
    }
    return picks;
  };
  let prompt, correct, field;
  if (kind === 'reading') { prompt = `How is 「${entry.ja}」 read?`; field = 'kana'; correct = entry.kana; }
  else if (kind === 'meaning') { prompt = `What does 「${entry.hasKanji ? entry.ja : entry.kana}」 mean?`; field = 'en'; correct = entry.en; }
  else { prompt = `Which word means "${entry.en}"?`; field = 'ja'; correct = entry.ja; }
  const choices = [correct, ...distract(field)];
  return withShuffledChoices({
    key: `v:${entry.id}:${kind}`, section: 'vocab', tag: entry.cat,
    prompt, choices, answer: 0,
    explain: `${entry.ja}${entry.hasKanji ? `（${entry.kana}）` : ''} = ${entry.en}`,
  }, rng);
}

export function vocabQuestions(n, rng = Math.random, category) {
  const pool = category ? vocab.filter((v) => v.cat === category) : vocab;
  return pick(pool, n, rng).map((e) => {
    const kinds = e.hasKanji ? KINDS : KINDS.slice(1);
    return vocabQuestion(e, kinds[Math.floor(rng() * kinds.length)], rng);
  });
}

export function readingQuestions(n, rng = Math.random) {
  const out = [];
  for (const p of reading) {
    p.questions.forEach((q, i) => out.push(withShuffledChoices({
      key: `r:${p.id}:${i}`, section: 'reading', passage: p.passage, tag: q.tag,
      prompt: q.prompt, choices: q.choices, answer: q.answer, explain: q.explain,
    }, rng)));
  }
  return pick(out, n, rng);
}

export function listeningQuestions(n, rng = Math.random) {
  return pick(listening, n, rng).map((l) => withShuffledChoices({
    key: `l:${l.id}`, section: 'listening', tag: l.tag, title: l.title,
    lines: l.lines, prompt: l.question, choices: l.choices, answer: l.answer,
    explain: l.lines.map(([, t]) => t).join(' '),
  }, rng));
}

export const EXAM_PLAN = { vocab: 20, grammar: 20, reading: 6, listening: 6 };

export function buildExam(rng = Math.random, plan = EXAM_PLAN) {
  return [
    ...vocabQuestions(plan.vocab, rng),
    ...pick(grammarQuestions(rng), plan.grammar, rng),
    ...readingQuestions(plan.reading, rng),
    ...listeningQuestions(plan.listening, rng),
  ];
}

// Strips the answer and explanation before sending to the client.
export const publicQuestion = ({ answer, explain, ...rest }) => rest;

// JLPT N5 pass rule of thumb: >= 80/180 overall and >= 19/60 in each scored area.
// We approximate with percentages per area: language knowledge (vocab+grammar), reading, listening.
export function gradeExam(questions, given) {
  const sections = {};
  questions.forEach((q, i) => {
    const s = (sections[q.section] ??= { correct: 0, total: 0 });
    s.total++;
    if (given[i] === q.answer) s.correct++;
  });
  const pct = (s) => (s && s.total ? s.correct / s.total : 0);
  const lang = {
    correct: (sections.vocab?.correct ?? 0) + (sections.grammar?.correct ?? 0),
    total: (sections.vocab?.total ?? 0) + (sections.grammar?.total ?? 0),
  };
  const overall = Object.values(sections).reduce((a, s) => ({ correct: a.correct + s.correct, total: a.total + s.total }), { correct: 0, total: 0 });
  const scaled = Math.round((overall.correct / overall.total) * 180);
  const floors = [pct(lang), pct(sections.reading), pct(sections.listening)];
  const passed = scaled >= 80 && floors.every((p) => p >= 19 / 60);
  return { sections, overall, scaled, passed };
}
