import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';

// Local calendar date, not UTC, so "today" matches the learner's wall clock.
const localDay = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const nice = (day) => new Date(`${day}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
const PHASE = { learn: 'Learn new material', review: 'Review and test', light: 'Light day', exam: 'Exam day' };

function Setup({ onSaved, initial }) {
  const [examDay, setExamDay] = useState(initial?.examDay ?? '');
  const [includeN4, setIncludeN4] = useState(initial?.includeN4 ?? false);
  const [error, setError] = useState(null);
  const today = localDay();
  const save = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await api.savePlanSettings({ examDay, includeN4, today });
      onSaved();
    } catch (err) { setError(err.message); }
  };
  return (
    <form className="card" onSubmit={save}>
      <label>Exam date<br /><input type="date" required min={today} value={examDay} onChange={(e) => setExamDay(e.target.value)} /></label>
      <p><label><input type="checkbox" checked={includeN4} onChange={(e) => setIncludeN4(e.target.checked)} /> Add N4 kanji as optional stretch tasks in the review phase</label></p>
      <p className="muted">The plan starts today. Saving replaces any existing plan and clears its checkmarks.</p>
      {error && <p className="error">{error}</p>}
      <button className="btn primary" type="submit">Build my plan</button>
    </form>
  );
}

function TaskRow({ day, t, done, onToggle }) {
  return (
    <li className={`task${done ? ' done' : ''}`}>
      <input type="checkbox" checked={done} onChange={(e) => onToggle(day, t.id, e.target.checked)} aria-label={`Mark done: ${t.label}`} />
      <span>{t.href ? <Link to={t.href}>{t.label}</Link> : t.label}</span>
      {t.minutes > 0 && <span className="muted">{t.minutes} min</span>}
    </li>
  );
}

export default function Plan() {
  const [plan, setPlan] = useState(null);
  const [editing, setEditing] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const load = () => api.plan(localDay()).then((p) => { setPlan(p); setEditing(false); });
  useEffect(() => { load(); }, []);

  const toggle = async (day, taskId, done) => {
    setPlan((p) => {
      const cur = new Set(p.done[day] ?? []);
      if (done) cur.add(taskId); else cur.delete(taskId);
      return { ...p, done: { ...p.done, [day]: [...cur] } };
    });
    await api.markDone(day, taskId, done).catch(load);
  };

  if (!plan) return <p>Loading…</p>;
  if (!plan.configured || editing) {
    return (
      <>
        <h1>Study plan</h1>
        <p>Pick your exam date and I will schedule every grammar point, vocabulary word and kanji, then a review phase with mock exams.</p>
        <Setup initial={plan} onSaved={load} />
      </>
    );
  }

  const { days, today, done, daysToExam } = plan;
  const todayIdx = days.findIndex((d) => d.date === today);
  const isDone = (d, t) => (done[d.date] ?? []).includes(t.id);
  const overdue = days.filter((d) => d.date < today && d.tasks.some((t) => t.type !== 'rest' && !isDone(d, t)));
  const overdueCount = overdue.reduce((n, d) => n + d.tasks.filter((t) => t.type !== 'rest' && !isDone(d, t)).length, 0);
  const todayDay = todayIdx >= 0 ? days[todayIdx] : null;
  const upcoming = days.filter((d) => d.date > today).slice(0, showAll ? undefined : 6);
  const total = days.flatMap((d) => d.tasks).filter((t) => t.type !== 'rest').length;
  const finished = days.reduce((n, d) => n + (done[d.date] ?? []).length, 0);

  return (
    <>
      <h1>Study plan</h1>
      <div className="grid">
        <div className="card"><div className="big">{daysToExam < 0 ? 'Done' : daysToExam}</div><div className="muted">{daysToExam < 0 ? 'exam date has passed' : daysToExam === 0 ? 'exam is today' : 'days until the exam'}</div></div>
        <div className="card"><div className="big">{Math.round((finished / total) * 100)}%</div><div className="muted">of all tasks done</div></div>
        <div className="card"><div className="big">{overdueCount}</div><div className="muted">overdue tasks</div></div>
      </div>

      {todayDay ? (
        <>
          <h2>Today: {nice(todayDay.date)} <span className="tag">{PHASE[todayDay.phase]}</span></h2>
          <div className="card">
            <ul className="tasks">{todayDay.tasks.map((t) => <TaskRow key={t.id} day={todayDay.date} t={t} done={isDone(todayDay, t)} onToggle={toggle} />)}</ul>
            <p className="muted">About {todayDay.minutes} minutes</p>
          </div>
        </>
      ) : (
        <p className="muted">{today < days[0].date ? `Your plan starts on ${nice(days[0].date)}.` : 'The plan has ended.'}</p>
      )}

      {overdue.length > 0 && (
        <>
          <h2>Catch up</h2>
          <p className="muted">Unfinished tasks from earlier days. Do the newest-material ones first; skip the rest if you are short on time.</p>
          {overdue.slice(-3).map((d) => (
            <div className="card" key={d.date}>
              <strong>{nice(d.date)}</strong>
              <ul className="tasks">{d.tasks.filter((t) => t.type !== 'rest').map((t) => <TaskRow key={t.id} day={d.date} t={t} done={isDone(d, t)} onToggle={toggle} />)}</ul>
            </div>
          ))}
          {overdue.length > 3 && <p className="muted">{overdue.length - 3} earlier days also have unfinished tasks.</p>}
        </>
      )}

      <h2>Coming up</h2>
      {upcoming.map((d) => (
        <div className="card" key={d.date}>
          <strong>{nice(d.date)}</strong> <span className="tag">{PHASE[d.phase]}</span> <span className="muted">{d.minutes} min</span>
          <ul className="tasks">{d.tasks.map((t) => <TaskRow key={t.id} day={d.date} t={t} done={isDone(d, t)} onToggle={toggle} />)}</ul>
        </div>
      ))}
      <button className="btn" onClick={() => setShowAll(!showAll)}>{showAll ? 'Show fewer days' : 'Show the whole plan'}</button>
      <button className="btn" onClick={() => setEditing(true)}>Change exam date</button>
    </>
  );
}
