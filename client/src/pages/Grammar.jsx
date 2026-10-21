import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import Quiz from '../Quiz.jsx';

export function GrammarList() {
  const [list, setList] = useState(null);
  useEffect(() => { api.grammarList().then(setList); }, []);
  if (!list) return <p>Loading…</p>;
  return (
    <>
      <h1>N5 grammar</h1>
      <div className="list">
        {list.map((g) => (
          <Link key={g.id} to={`/grammar/${g.id}`} className="card link">
            <strong>{g.title}</strong>
            <div className="muted">{g.pattern}</div>
            <div>{g.meaning}</div>
          </Link>
        ))}
      </div>
    </>
  );
}

export function GrammarLesson() {
  const { id } = useParams();
  const [g, setG] = useState(null);
  const [drilling, setDrilling] = useState(false);
  useEffect(() => { setG(null); setDrilling(false); api.grammar(id).then(setG).catch(() => setG(false)); }, [id]);
  if (g === false) return <p className="error">Lesson not found.</p>;
  if (!g) return <p>Loading…</p>;
  return (
    <>
      <Link to="/grammar">← All grammar</Link>
      <h1>{g.title}</h1>
      <div className="card">
        <div className="pattern">{g.pattern}</div>
        <p><b>Meaning:</b> {g.meaning}</p>
        <p>{g.notes}</p>
      </div>
      <h2>Examples</h2>
      {g.examples.map((e, i) => (
        <div className="card" key={i}>
          <div className="ja">{e.ja}</div>
          <div className="muted">{e.kana}</div>
          <div>{e.en}</div>
        </div>
      ))}
      <h2>Drill</h2>
      {drilling ? <Quiz kind="grammar" topic={g.id} n={5} onDone={() => setDrilling(false)} />
        : <button className="btn primary" onClick={() => setDrilling(true)}>Start drill</button>}
    </>
  );
}
