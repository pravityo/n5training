async function req(path, opts) {
  const res = await fetch(path, opts);
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
  return res.json();
}
const post = (path, body) => req(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

export const api = {
  grammarList: () => req('/api/grammar'),
  grammar: (id) => req(`/api/grammar/${id}`),
  practice: (kind, topic, n = 10) => req(`/api/practice?kind=${kind}&n=${n}${topic ? `&topic=${topic}` : ''}`),
  attempt: (a) => post('/api/attempts', a),
  vocab: () => req('/api/vocab'),
  newExam: () => post('/api/exams', {}),
  submitExam: (id, answers) => post(`/api/exams/${id}/submit`, { answers }),
  stats: () => req('/api/stats'),
};
