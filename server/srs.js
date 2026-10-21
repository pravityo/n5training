import { vocab } from './content/vocab.js';
import { kanji } from './content/kanji.js';
import { parseDay, fmtDay } from './plan.js';

export const GRADES = ['again', 'hard', 'good', 'easy'];
const MIN_EASE = 1.3;
const addDays = (day, n) => fmtDay(parseDay(day) + n * 86_400_000);

/**
 * SM-2 style scheduling without learning steps. `card` is { ease, interval, reps, lapses } or null for a new card.
 * A failed card comes back the same day (interval 0); the client re-queues it until it is answered "good".
 */
export function schedule(card, grade, today) {
  const c = { ease: 2.5, interval: 0, reps: 0, lapses: 0, ...card };
  if (grade === 'again') {
    return { ease: Math.max(MIN_EASE, c.ease - 0.2), interval: 0, reps: 0, lapses: c.lapses + 1, due: today };
  }
  let interval;
  let ease = c.ease;
  if (grade === 'hard') {
    interval = Math.max(1, Math.round(c.interval * 1.2));
    ease = Math.max(MIN_EASE, ease - 0.15);
  } else if (c.reps === 0) {
    interval = grade === 'easy' ? 4 : 1;
  } else if (c.reps === 1) {
    interval = grade === 'easy' ? 7 : 3;
  } else {
    interval = Math.round(c.interval * ease * (grade === 'easy' ? 1.3 : 1));
    if (grade === 'easy') ease += 0.15;
  }
  interval = Math.max(1, interval);
  return { ease, interval, reps: c.reps + 1, lapses: c.lapses, due: addDays(today, interval) };
}

export function cardFor(key) {
  const [type, idStr] = key.split(':');
  const id = Number(idStr);
  if (type === 'v') {
    const v = vocab.find((x) => x.id === id);
    if (!v) return null;
    return { key, type: 'vocab', front: v.hasKanji ? v.ja : v.kana, reading: v.kana, back: v.en, speak: v.kana, hint: v.cat };
  }
  if (type === 'k') {
    const k = kanji.find((x) => x.id === id);
    if (!k) return null;
    return {
      key, type: 'kanji', front: k.char, back: k.meaning, speak: k.words[0]?.kana, hint: `N${k.level}`,
      detail: `on: ${k.on} | kun: ${k.kun || '-'}`, words: k.words.map((w) => `${w.ja} (${w.kana}) ${w.en}`),
    };
  }
  return null;
}

// New cards are introduced in id order: vocab ids follow the study-plan order, N5 kanji come before N4.
export function allKeys(source) {
  const v = vocab.map((x) => `v:${x.id}`);
  const k = kanji.map((x) => `k:${x.id}`);
  if (source === 'vocab') return v;
  if (source === 'kanji') return k;
  // Interleave so a mixed session alternates between vocabulary and kanji.
  const out = [];
  for (let i = 0; i < Math.max(v.length, k.length); i++) {
    if (i < v.length) out.push(v[i]);
    if (i < k.length) out.push(k[i]);
  }
  return out;
}
