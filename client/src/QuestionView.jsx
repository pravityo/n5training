import { useEffect, useRef, useState } from 'react';
import { speakDialogue, stopSpeaking, ttsSupported, hasJapaneseVoice } from './tts.js';

export function ListenButton({ lines }) {
  const [playing, setPlaying] = useState(false);
  const ctl = useRef(null);
  useEffect(() => () => { ctl.current?.abort(); stopSpeaking(); }, []);
  if (!ttsSupported()) return <p className="muted">Speech synthesis is not supported in this browser.</p>;
  const play = async () => {
    ctl.current?.abort();
    ctl.current = new AbortController();
    setPlaying(true);
    await speakDialogue(lines, ctl.current.signal);
    setPlaying(false);
  };
  return (
    <div>
      <button className="btn" onClick={play}>{playing ? 'Playing…' : '▶ Play audio'}</button>
      {!hasJapaneseVoice() && <p className="muted">No Japanese voice detected. Install one in your OS speech settings.</p>}
    </div>
  );
}

// Renders one question. When `reveal` is set, shows correctness and the explanation.
export default function QuestionView({ q, selected, onSelect, reveal }) {
  return (
    <div className="card">
      <span className="tag">{q.section}</span>
      {q.passage && <p className="passage">{q.passage}</p>}
      {q.section === 'listening' && (
        <>
          <ListenButton lines={q.lines} />
          {reveal && q.lines && <ul className="transcript">{q.lines.map(([w, t], i) => <li key={i}><b>{w}:</b> {t}</li>)}</ul>}
        </>
      )}
      <h2 className="prompt">{q.prompt}</h2>
      <div className="choices">
        {q.choices.map((c, i) => {
          let cls = 'choice';
          if (selected === i) cls += ' selected';
          if (reveal) {
            if (i === q.answer) cls += ' correct';
            else if (selected === i) cls += ' wrong';
          }
          return <button key={i} className={cls} disabled={reveal} onClick={() => onSelect(i)}>{c}</button>;
        })}
      </div>
      {reveal && q.explain && <p className="explain">{q.explain}</p>}
    </div>
  );
}
