import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';

const localDay = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const pct = (x) => `${Math.round(x * 100)}%`;

export default function Dashboard() {
  const [s, setS] = useState(null);
  const [cards, setCards] = useState(null);
  const [grammarIds, setGrammarIds] = useState(new Set());
  useEffect(() => { api.srsStats(localDay()).then(setCards).catch(() => {}); }, []);
  useEffect(() => { api.stats().then(setS).catch(() => setS({ byTag: [], weak: [], exams: [], days: [] })); }, []);
  useEffect(() => { api.grammarList().then((l) => setGrammarIds(new Set(l.map((g) => g.id)))).catch(() => {}); }, []);
  if (!s) return <p>Loading…</p>;
  const total = s.byTag.reduce((a, t) => a + t.total, 0);
  const correct = s.byTag.reduce((a, t) => a + t.correct, 0);
  return (
    <>
      <h1>Your progress</h1>
      <div className="grid">
        <div className="card"><div className="big">{total}</div><div className="muted">questions answered</div></div>
        <div className="card"><div className="big">{total ? pct(correct / total) : '-'}</div><div className="muted">overall accuracy</div></div>
        <div className="card"><div className="big">{s.exams.length}</div><div className="muted">mock exams taken</div></div>
      </div>

      {cards && (
        <Link to="/cards" className="card link">
          <strong>Flashcards</strong>: {cards.due} due today, {cards.total} of {cards.available} cards started, {cards.mature} mature.
        </Link>
      )}

      <h2>Weak spots</h2>
      {s.weak.length === 0 ? <p className="muted">Answer a few questions and weak topics will show up here.</p> : (
        <div className="card">
          {s.weak.map((t) => (
            <div key={t.tag} className="bar-row">
              {grammarIds.has(t.tag) ? <Link to={`/grammar/${t.tag}`} className="bar-label">{t.tag}</Link> : <span className="bar-label">{t.tag}</span>}
              <div className="bar"><div style={{ width: pct(t.accuracy) }} /></div>
              <span className="muted">{pct(t.accuracy)} of {t.total}</span>
            </div>
          ))}
        </div>
      )}

      <h2>Mock exam history</h2>
      {s.exams.length === 0 ? <p className="muted">No exams yet. <Link to="/exam">Take one</Link>.</p> : (
        <table>
          <thead><tr><th>Date</th><th>Score (of 180)</th><th>Result</th></tr></thead>
          <tbody>{s.exams.map((e) => (
            <tr key={e.id}><td>{new Date(e.finished).toLocaleString()}</td><td>{e.scaled}</td><td>{e.passed ? 'Pass' : 'Not yet'}</td></tr>
          ))}</tbody>
        </table>
      )}
      <p className="muted">Scores are an approximation. The real JLPT scales results per section, so treat the pass line as a guide.</p>
    </>
  );
}
