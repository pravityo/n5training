import { useEffect, useState } from 'react';
import { api } from '../api.js';
import Quiz from '../Quiz.jsx';

const MODES = [
  { id: 'vocab', label: 'Vocabulary', desc: 'Readings, meanings, and word recall. Optionally pick a category.', topics: true },
  { id: 'kanji', label: 'Kanji', desc: 'Kanji meanings, matching, and reading words.' },
  { id: 'grammar', label: 'Mixed grammar', desc: 'Random questions across every grammar point.' },
  { id: 'listening', label: 'Listening', desc: 'Dialogues read aloud by your browser. Needs a Japanese voice installed.' },
  { id: 'reading', label: 'Reading', desc: 'Short passages and notices.' },
];

export default function Practice() {
  const [mode, setMode] = useState(null);
  const [cats, setCats] = useState([]);
  const [topic, setTopic] = useState('');
  useEffect(() => { api.vocab().then((v) => setCats([...new Set(v.map((x) => x.cat))].sort())); }, []);
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
