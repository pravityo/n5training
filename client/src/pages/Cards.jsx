import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { speak } from '../tts.js';

const localDay = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const GRADES = [['again', 'Again', '1'], ['hard', 'Hard', '2'], ['good', 'Good', '3'], ['easy', 'Easy', '4']];
const SOURCES = [['all', 'Vocabulary and kanji'], ['vocab', 'Vocabulary'], ['kanji', 'Kanji']];

function Session({ source, newLimit, onExit }) {
  const [queue, setQueue] = useState(null);
  const [shown, setShown] = useState(false);
  const [stats, setStats] = useState({ reviewed: 0, again: 0 });
  const [last, setLast] = useState(null);
  const today = localDay();

  useEffect(() => {
    api.srsSession(source, today, newLimit).then((s) => setQueue(s.cards));
  }, [source, newLimit, today]);

  const grade = useCallback(async (g) => {
    if (!queue?.length) return;
    const [card, ...rest] = queue;
    setShown(false);
    setStats((s) => ({ reviewed: s.reviewed + 1, again: s.again + (g === 'again' ? 1 : 0) }));
    // A failed card goes back a few cards later, so it is seen again in this session.
    setQueue(g === 'again' ? [...rest.slice(0, 3), card, ...rest.slice(3)] : rest);
    try {
      const r = await api.srsGrade(card.key, g, today);
      setLast(g === 'again' ? 'Again: coming back this session' : `Next review in ${r.interval} day${r.interval === 1 ? '' : 's'}`);
    } catch { setLast('Could not save that answer. Check the server.'); }
  }, [queue, today]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setShown(true); }
      else if (shown) { const g = GRADES.find((x) => x[2] === e.key); if (g) grade(g[0]); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [shown, grade]);

  if (!queue) return <p>Loading…</p>;
  if (queue.length === 0) {
    return (
      <div className="card center">
        <h2>{stats.reviewed ? 'Session complete' : 'Nothing due right now'}</h2>
        {stats.reviewed > 0 && <p>{stats.reviewed} answers, {stats.again} marked Again.</p>}
        <button className="btn primary" onClick={onExit}>Back</button>
      </div>
    );
  }
  const c = queue[0];
  return (
    <>
      <p className="muted">{queue.length} left {c.isNew && <span className="tag">new</span>} {last && <>| {last}</>}</p>
      <div className="card center flash">
        <div className={c.type === 'kanji' ? 'flash-kanji' : 'flash-word'}>{c.front}</div>
        {shown ? (
          <>
            {c.reading && c.reading !== c.front && <div className="ja">{c.reading}</div>}
            <h2>{c.back}</h2>
            {c.detail && <div className="muted">{c.detail}</div>}
            {c.words?.map((w) => <div key={w}>{w}</div>)}
            {c.speak && <button className="btn" onClick={() => speak(c.speak)}>🔊 Play</button>}
          </>
        ) : (
          <button className="btn primary" onClick={() => setShown(true)}>Show answer (space)</button>
        )}
      </div>
      {shown && (
        <div className="row">
          {GRADES.map(([g, label, k]) => <button key={g} className={`btn${g === 'good' ? ' primary' : ''}`} onClick={() => grade(g)}>{label} ({k})</button>)}
        </div>
      )}
    </>
  );
}

export default function Cards() {
  const [source, setSource] = useState('all');
  const [newLimit, setNewLimit] = useState(10);
  const [active, setActive] = useState(false);
  const [stats, setStats] = useState(null);
  useEffect(() => { if (!active) api.srsStats(localDay()).then(setStats).catch(() => {}); }, [active]);

  if (active) return <Session source={source} newLimit={newLimit} onExit={() => setActive(false)} />;
  return (
    <>
      <h1>Flashcards</h1>
      {stats && (
        <div className="grid">
          <div className="card"><div className="big">{stats.due}</div><div className="muted">due today</div></div>
          <div className="card"><div className="big">{stats.total}</div><div className="muted">cards started of {stats.available}</div></div>
          <div className="card"><div className="big">{stats.mature}</div><div className="muted">mature (21+ day interval)</div></div>
        </div>
      )}
      <div className="card">
        <p>See the Japanese, recall the meaning, then rate yourself. Cards you know come back later and later; cards you miss come back sooner.</p>
        <label>Deck <select value={source} onChange={(e) => setSource(e.target.value)}>{SOURCES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
        <label> New cards today <input type="number" min="0" max="50" value={newLimit} onChange={(e) => setNewLimit(Number(e.target.value))} /></label>
        <p><button className="btn primary" onClick={() => setActive(true)}>Start session</button></p>
        <p className="muted">Shortcuts: space shows the answer, then 1 to 4 rates it. New cards follow the same order as the study plan.</p>
      </div>
    </>
  );
}
