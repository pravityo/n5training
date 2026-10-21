import { grammar } from './content/grammar.js';
import { vocab } from './content/vocab.js';
import { kanji } from './content/kanji.js';

const DAY_MS = 86_400_000;
export const parseDay = (s) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s ?? '')) return NaN;
  return Date.parse(`${s}T00:00:00Z`);
};
export const fmtDay = (ms) => new Date(ms).toISOString().slice(0, 10);
export const daysBetween = (a, b) => Math.round((parseDay(b) - parseDay(a)) / DAY_MS);

// Splits ids [1..total] into `parts` contiguous, near-equal ranges. Empty ranges come back as null.
function split(total, parts) {
  const out = [];
  for (let i = 0; i < parts; i++) {
    const from = Math.floor((i * total) / parts) + 1;
    const to = Math.floor(((i + 1) * total) / parts);
    out.push(to >= from ? [from, to] : null);
  }
  return out;
}

const task = (id, type, label, minutes, href) => ({ id, type, label, minutes, href });
const rangeStr = (r) => `${r[0]}-${r[1]}`;

/**
 * Builds a day-by-day schedule from `startDay` to `examDay` inclusive.
 *
 * - First ~65% of days: learning. Each day introduces a slice of grammar, vocabulary and N5 kanji,
 *   with a quiz on the new material, a short review, and listening/reading on a rotation.
 * - Remaining days: review. Weak-spot drills and mixed practice, with a mock exam every 7th day
 *   and again two days before the exam. Optional N4 kanji slices are spread across these days.
 * - The day before the exam is light; exam day is a short warm-up only.
 */
export function buildPlan({ startDay, examDay, includeN4 = false }) {
  const total = daysBetween(startDay, examDay) + 1;
  if (!(total >= 1)) throw new Error('examDay must be on or after startDay');

  const gl = grammar.map((g) => g.id);
  // kanji.js orders N5 first, so each level is a contiguous id range.
  const n5Count = kanji.filter((k) => k.level === 5).length;
  const n4Count = kanji.length - n5Count;

  // Short runways: skip the learning/review split guarantees and just cram sensibly.
  const learnDays = total <= 3 ? 0 : Math.max(1, Math.min(total - 3, Math.round(total * 0.65)));
  const gSlices = split(gl.length, learnDays);
  const vSlices = split(vocab.length, learnDays);
  const kSlices = split(n5Count, learnDays);
  const reviewDays = total - learnDays;
  const n4Slices = includeN4 ? split(n4Count, Math.max(1, reviewDays - 2)).map((r) => r && [r[0] + n5Count, r[1] + n5Count]) : [];

  const days = [];
  let reviewIndex = 0;
  for (let i = 0; i < total; i++) {
    const date = fmtDay(parseDay(startDay) + i * DAY_MS);
    const daysLeft = total - 1 - i;
    const tasks = [];
    let phase;

    if (i < learnDays) {
      phase = 'learn';
      const gr = gSlices[i];
      if (gr) {
        const ids = gl.slice(gr[0] - 1, gr[1]);
        ids.forEach((id, n) => {
          const g = grammar.find((x) => x.id === id);
          tasks.push(task(`grammar-${n}`, 'grammar', `Learn: ${g.title}`, 15, `/grammar/${id}`));
        });
        tasks.push(task('grammar-drill', 'practice', `Drill today's grammar (${ids.length} point${ids.length > 1 ? 's' : ''})`, 8, `/practice?kind=grammar&topic=${ids[0]}&n=${Math.min(10, ids.length * 3)}`));
      }
      const vr = vSlices[i];
      if (vr) {
        tasks.push(task('vocab-study', 'study', `Study vocabulary #${vr[0]} to #${vr[1]}`, 15, `/reference?tab=vocab&from=${vr[0]}&to=${vr[1]}`));
        tasks.push(task('vocab-quiz', 'practice', 'Quiz on today\'s vocabulary', 7, `/practice?kind=vocab&range=${rangeStr(vr)}&n=${Math.min(15, vr[1] - vr[0] + 1)}`));
      }
      const kr = kSlices[i];
      if (kr) {
        tasks.push(task('kanji-study', 'study', `Study kanji #${kr[0]} to #${kr[1]}`, 10, `/reference?tab=kanji&from=${kr[0]}&to=${kr[1]}`));
        tasks.push(task('kanji-quiz', 'practice', "Quiz on today's kanji", 5, `/practice?kind=kanji&range=${rangeStr(kr)}&n=8`));
      }
      if (i > 0 && gSlices[i - 1]) {
        const prev = gl[gSlices[i - 1][0] - 1];
        tasks.push(task('review-yesterday', 'practice', "Review yesterday's grammar", 5, `/practice?kind=grammar&topic=${prev}&n=5`));
      }
      if (i % 3 === 2) tasks.push(task('listening', 'practice', 'Listening practice (5 clips)', 10, '/practice?kind=listening&n=5'));
      if (i % 3 === 0 && i > 0) tasks.push(task('reading', 'practice', 'Reading practice (4 questions)', 10, '/practice?kind=reading&n=4'));
      if (i % 7 === 6) {
        const weekStart = vSlices[Math.max(0, i - 6)];
        const weekEnd = vSlices[i];
        if (weekStart && weekEnd) tasks.push(task('weekly-vocab', 'practice', 'Weekly vocabulary review', 10, `/practice?kind=vocab&range=${weekStart[0]}-${weekEnd[1]}&n=20`));
      }
    } else if (daysLeft === 0) {
      phase = 'exam';
      tasks.push(task('warmup', 'practice', 'Exam day warm-up: weak spots (10 questions)', 5, '/practice?kind=weak&n=10'));
      tasks.push(task('rest', 'rest', 'Eat, bring ID and pencils, arrive early. No new material.', 0, null));
    } else if (daysLeft === 1) {
      phase = 'light';
      tasks.push(task('weak', 'practice', 'Weak-spot drill (10 questions)', 8, '/practice?kind=weak&n=10'));
      tasks.push(task('listening', 'practice', 'Listening practice (5 clips)', 10, '/practice?kind=listening&n=5'));
      tasks.push(task('rest', 'rest', 'Stop early and rest. Nothing new today.', 0, null));
    } else {
      phase = 'review';
      const mock = reviewIndex % 7 === 6 || daysLeft === 2;
      if (mock) {
        tasks.push(task('mock', 'mock', 'Full mock exam (50 min), then review every mistake', 80, '/exam'));
      } else {
        tasks.push(task('weak', 'practice', 'Weak-spot drill (15 questions)', 10, '/practice?kind=weak&n=15'));
        tasks.push(task('grammar-mixed', 'practice', 'Mixed grammar (15 questions)', 10, '/practice?kind=grammar&n=15'));
        tasks.push(task('vocab-mixed', 'practice', 'Mixed vocabulary (20 questions)', 10, '/practice?kind=vocab&n=20'));
        tasks.push(task('kanji-mixed', 'practice', 'Mixed N5 kanji (10 questions)', 6, '/practice?kind=kanji&level=5&n=10'));
        tasks.push(reviewIndex % 2 === 0
          ? task('listening', 'practice', 'Listening practice (6 clips)', 12, '/practice?kind=listening&n=6')
          : task('reading', 'practice', 'Reading practice (6 questions)', 12, '/practice?kind=reading&n=6'));
        const n4 = n4Slices[reviewIndex];
        if (n4) {
          tasks.push(task('n4-kanji', 'stretch', `Stretch: N4 kanji #${n4[0]} to #${n4[1]}`, 12, `/reference?tab=kanji&from=${n4[0]}&to=${n4[1]}`));
        }
      }
      reviewIndex++;
    }
    days.push({ date, phase, tasks, minutes: tasks.reduce((a, t) => a + t.minutes, 0) });
  }
  return days;
}
