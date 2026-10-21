async function req(path, opts) {
  const res = await fetch(path, opts);
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
  return res.json();
}
const post = (path, body) => req(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

export const api = {
  grammarList: () => req('/api/grammar'),
  grammar: (id) => req(`/api/grammar/${id}`),
  practice: ({ kind, topic, n = 10, range, level }) => {
    const p = new URLSearchParams({ kind, n });
    if (topic) p.set('topic', topic);
    if (range) p.set('range', range);
    if (level) p.set('level', level);
    return req(`/api/practice?${p}`);
  },
  srsSession: (source, today, newLimit) => req(`/api/srs/session?source=${source}&today=${today}&newLimit=${newLimit}`),
  srsGrade: (key, grade, today) => post('/api/srs/grade', { key, grade, today }),
  srsStats: (today) => req(`/api/srs/stats?today=${today}`),
  plan: (today) => req(`/api/plan?today=${today}`),
  savePlanSettings: (s) => fetch('/api/plan/settings', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(s) }).then(async (r) => { if (!r.ok) throw new Error((await r.json()).error); }),
  markDone: (day, taskId, done) => post('/api/plan/done', { day, taskId, done }),
  attempt: (a) => post('/api/attempts', a),
  vocab: () => req('/api/vocab'),
  kanji: () => req('/api/kanji'),
  newExam: () => post('/api/exams', {}),
  submitExam: (id, answers) => post(`/api/exams/${id}/submit`, { answers }),
  stats: () => req('/api/stats'),
};
