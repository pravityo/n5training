import { useState } from 'react';
import Quiz from '../Quiz.jsx';

const MODES = [
  { id: 'vocab', label: 'Vocabulary and kanji', desc: 'Readings, meanings, and word recall.' },
  { id: 'grammar', label: 'Mixed grammar', desc: 'Random questions across every grammar point.' },
  { id: 'listening', label: 'Listening', desc: 'Dialogues read aloud by your browser. Needs a Japanese voice installed.' },
  { id: 'reading', label: 'Reading', desc: 'Short passages and notices.' },
];

export default function Practice() {
  const [mode, setMode] = useState(null);
  if (mode) {
    return (
      <>
        <button className="btn" onClick={() => setMode(null)}>← Choose another</button>
        <Quiz kind={mode} n={10} onDone={() => setMode(null)} />
      </>
    );
  }
  return (
    <>
      <h1>Practice</h1>
      <div className="list">
        {MODES.map((m) => (
          <button key={m.id} className="card link" onClick={() => setMode(m.id)}>
            <strong>{m.label}</strong><div className="muted">{m.desc}</div>
          </button>
        ))}
      </div>
    </>
  );
}
