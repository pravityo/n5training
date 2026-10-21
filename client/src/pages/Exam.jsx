import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import QuestionView from '../QuestionView.jsx';

const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export default function Exam() {
  const [exam, setExam] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [i, setI] = useState(0);
  const [left, setLeft] = useState(0);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);

  const start = async () => {
    const e = await api.newExam();
    setExam(e); setAnswers(e.questions.map(() => null)); setI(0); setLeft(e.limitSec); setResult(null);
    submitting.current = false;
  };

  const submit = async (current = answers) => {
    if (submitting.current || !exam) return;
    submitting.current = true; setBusy(true);
    try { setResult(await api.submitExam(exam.id, current)); } finally { setBusy(false); }
  };

  useEffect(() => {
    if (!exam || result) return;
    const t = setInterval(() => setLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [exam, result]);
  useEffect(() => { if (exam && !result && left <= 0) submit(); }, [left]);

  if (!exam) {
    return (
      <>
        <h1>Mock exam</h1>
        <div className="card">
          <p>66 questions: 25 vocabulary and kanji, 25 grammar, 8 reading, 8 listening. Time limit 50 minutes. The timer starts immediately and the exam submits itself at zero. Answers are only revealed after you submit.</p>
          <button className="btn primary" onClick={start}>Start exam</button>
        </div>
      </>
    );
  }

  if (result) {
    const sec = Object.entries(result.sections);
    return (
      <>
        <h1>{result.passed ? 'Pass (estimated)' : 'Not passing yet'}</h1>
        <div className="grid">
          <div className="card"><div className="big">{result.scaled}/180</div><div className="muted">scaled score, pass line 80</div></div>
          {sec.map(([name, s]) => (
            <div className="card" key={name}><div className="big">{s.correct}/{s.total}</div><div className="muted">{name}</div></div>
          ))}
        </div>
        <button className="btn primary" onClick={() => setExam(null)}>Back</button>
        <h2>Review</h2>
        {result.review.map((q, n) => (
          <div key={n}>
            <p className="muted">#{n + 1} {q.given === q.answer ? 'correct' : q.given === null ? 'unanswered' : 'incorrect'}</p>
            <QuestionView q={q} selected={q.given} reveal onSelect={() => {}} />
          </div>
        ))}
      </>
    );
  }

  const q = exam.questions[i];
  const unanswered = answers.filter((a) => a === null).length;
  const select = (idx) => setAnswers((a) => a.map((x, n) => (n === i ? idx : x)));
  return (
    <>
      <div className="exam-bar">
        <span className={left < 300 ? 'error' : ''}>⏱ {fmt(Math.max(left, 0))}</span>
        <span>{i + 1} / {exam.questions.length}</span>
        <span className="muted">{unanswered} unanswered</span>
      </div>
      <QuestionView q={q} selected={answers[i]} onSelect={select} />
      <div className="row">
        <button className="btn" disabled={i === 0} onClick={() => setI(i - 1)}>Previous</button>
        <button className="btn" disabled={i === exam.questions.length - 1} onClick={() => setI(i + 1)}>Next</button>
        <button className="btn primary" disabled={busy} onClick={() => { if (!unanswered || confirm(`${unanswered} unanswered. Submit anyway?`)) submit(); }}>Submit</button>
      </div>
      <div className="palette">
        {answers.map((a, n) => (
          <button key={n} className={`dot${a !== null ? ' done' : ''}${n === i ? ' current' : ''}`} onClick={() => setI(n)}>{n + 1}</button>
        ))}
      </div>
    </>
  );
}
