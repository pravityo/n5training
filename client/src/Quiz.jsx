import { useEffect, useState } from 'react';
import { api } from './api.js';
import QuestionView from './QuestionView.jsx';

// Loads a practice set with instant feedback and records every attempt.
export default function Quiz({ kind, topic, range, level, n = 10, onDone }) {
  const [qs, setQs] = useState(null);
  const [i, setI] = useState(0);
  const [sel, setSel] = useState(null);
  const [score, setScore] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.practice({ kind, topic, n, range, level }).then(setQs).catch((e) => setError(e.message));
  }, [kind, topic, n, range, level]);

  if (error) return <p className="error">{error}</p>;
  if (!qs) return <p>Loading…</p>;
  if (i >= qs.length) {
    return (
      <div className="card center">
        <h2>{score} / {qs.length} correct</h2>
        <button className="btn primary" onClick={() => { setQs(null); setI(0); setScore(0); setSel(null); api.practice({ kind, topic, n, range, level }).then(setQs); }}>Another round</button>
        {onDone && <button className="btn" onClick={onDone}>Back</button>}
      </div>
    );
  }
  const q = qs[i];
  const answered = sel !== null;
  const choose = (idx) => {
    setSel(idx);
    const correct = idx === q.answer;
    if (correct) setScore((s) => s + 1);
    api.attempt({ mode: 'practice', key: q.key, tag: q.tag, correct }).catch(() => {});
  };
  return (
    <>
      <p className="muted">Question {i + 1} of {qs.length}</p>
      <QuestionView q={q} selected={sel} onSelect={choose} reveal={answered} />
      {answered && <button className="btn primary" onClick={() => { setI(i + 1); setSel(null); }}>{i + 1 === qs.length ? 'Finish' : 'Next'}</button>}
    </>
  );
}
