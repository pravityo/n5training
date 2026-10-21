import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import Quiz from '../Quiz.jsx';

const MODES = [
  { id: 'vocab', label: 'Vocabulary', desc: 'Readings, meanings, and word recall. Optionally pick a category.', topics: true },
  { id: 'kanji', label: 'Kanji', desc: 'Kanji meanings, matching, and reading words.' },
  { id: 'grammar', label: 'Mixed grammar', desc: 'Random questions across every grammar point.' },
  { id: 'listening', label: 'Listening', desc: 'Dialogues read aloud by your browser. Needs a Japanese voice installed.' },
  { id: 'weak', label: 'Weak spots', desc: 'Questions from your lowest-accuracy topics.' },
  { id: 'reading', label: 'Reading', desc: 'Short passages and notices.' },
];

export default function Practice() {
  const [params] = useSearchParams();
  const [mode, setMode] = useState(null);
  const [cats, setCats] = useState([]);
  const [topic, setTopic] = useState('');
  useEffect(() => { api.vocab().then((v) => setCats([...new Set(v.map((x) => x.cat))].sort())); }, []);
  // Deep links from the study plan, e.g. /practice?kind=vocab&range=1-40&n=15
  if (params.get('kind')) {
    return (
      <>
        <Link to="/plan">← Back to plan</Link>
        <Quiz kind={params.get('kind')} topic={params.get('topic') || undefined} range={params.get('range') || undefined}
          level={params.get('level') || undefined} n={Number(params.get('n')) || 10} />
      </>
    );
  }
  if (mode) {
    return (
      <>
        <button className="btn" onClick={() => setMode(null)}>← Choose another</button>
        <Quiz kind={mode} topic={mode === 'vocab' ? topic : undefined} n={10} onDone={() => setMode(null)} />
      </>
    );
  }
  return (
    <>
      <h1>Practice</h1>
      <div className="list">
        {MODES.map((m) => (
          <div key={m.id}>
            <button className="card link" onClick={() => setMode(m.id)}>
              <strong>{m.label}</strong><div className="muted">{m.desc}</div>
            </button>
            {m.topics && (
              <select value={topic} onChange={(e) => setTopic(e.target.value)} aria-label="Vocabulary category">
                <option value="">All categories</option>
                {cats.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
