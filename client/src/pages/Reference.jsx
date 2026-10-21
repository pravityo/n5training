import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { speak } from '../tts.js';

function VocabTab() {
  const [rows, setRows] = useState(null);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  useEffect(() => { api.vocab().then(setRows); }, []);
  const cats = useMemo(() => [...new Set((rows ?? []).map((r) => r.cat))].sort(), [rows]);
  if (!rows) return <p>Loading…</p>;
  const needle = q.trim().toLowerCase();
  const shown = rows.filter((r) => (!cat || r.cat === cat)
    && (!needle || r.ja.includes(needle) || r.kana.includes(needle) || r.en.toLowerCase().includes(needle)));
  return (
    <>
      <div className="row">
        <input placeholder="Search Japanese or English" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">All categories</option>
          {cats.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>
      <p className="muted">{shown.length} of {rows.length} words</p>
      <table>
        <thead><tr><th>Word</th><th>Reading</th><th>Meaning</th><th /></tr></thead>
        <tbody>{shown.map((r) => (
          <tr key={r.id}>
            <td className="ja">{r.ja}</td><td>{r.hasKanji ? r.kana : ''}</td><td>{r.en}</td>
            <td><button className="btn" onClick={() => speak(r.kana)} aria-label={`Play ${r.kana}`}>🔊</button></td>
          </tr>
        ))}</tbody>
      </table>
    </>
  );
}

function KanjiTab() {
  const [rows, setRows] = useState(null);
  const [q, setQ] = useState('');
  useEffect(() => { api.kanji().then(setRows); }, []);
  if (!rows) return <p>Loading…</p>;
  const needle = q.trim().toLowerCase();
  const shown = rows.filter((k) => !needle || k.char.includes(needle) || k.meaning.toLowerCase().includes(needle)
    || k.on.includes(needle) || k.kun.includes(needle));
  return (
    <>
      <input placeholder="Search kanji, meaning or reading" value={q} onChange={(e) => setQ(e.target.value)} />
      <p className="muted">{shown.length} of {rows.length} kanji</p>
      <div className="list">
        {shown.map((k) => (
          <div className="card kanji" key={k.id}>
            <div className="glyph">{k.char}</div>
            <div>
              <strong>{k.meaning}</strong>
              <div className="muted">on: {k.on} | kun: {k.kun || '-'}</div>
              <div>{k.words.map((w) => `${w.ja} (${w.kana}) ${w.en}`).join(' / ')}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export default function Reference() {
  const [tab, setTab] = useState('vocab');
  return (
    <>
      <h1>Vocabulary and kanji</h1>
      <div className="row">
        <button className={`btn${tab === 'vocab' ? ' primary' : ''}`} onClick={() => setTab('vocab')}>Vocabulary</button>
        <button className={`btn${tab === 'kanji' ? ' primary' : ''}`} onClick={() => setTab('kanji')}>Kanji</button>
      </div>
      {tab === 'vocab' ? <VocabTab /> : <KanjiTab />}
    </>
  );
}
