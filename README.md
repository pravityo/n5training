# N5 Trainer

Personal JLPT N5 study platform. Express + node:sqlite backend, React (Vite) frontend. Requires Node 22.13+.

```
npm install
npm run local   # build and serve everything at http://localhost:3001
npm run dev      # API on :3001, client on :5173
npm run build && npm start   # single server on :3001
npm test
```

Progress is stored in `server/n5.db` (single user, no auth).

## Adding content
- `server/content/grammar-core.js`, `grammar-extra.js`: 46 lessons with drills
- `server/content/vocab.js`, `vocab-extra.js`: vocabulary (694 words)
- `server/content/kanji.js`, `kanji-n4.js`: 320 kanji (108 N5, 212 N4 and related) with readings and example words. Levels are approximate; the JLPT publishes no official list.
- `server/content/listening.js`, `reading.js`: exam passages

Mock exam: 15 vocab, 10 kanji, 25 grammar, 8 reading, 8 listening (66 questions, 50 minutes), graded server-side.
Listening uses browser speech synthesis, so a Japanese voice must be installed on your OS.

## Study plan
`/plan` builds a day-by-day schedule from your exam date (`server/plan.js`). About 65% of the days introduce grammar, vocabulary and N5 kanji with quizzes; the rest are weak-spot drills and mixed practice, with a mock exam every 7th day and two days before the exam. The day before is light. Tick tasks off, and unfinished ones show up under "Catch up". Optional N4 kanji appear as stretch tasks.

## Flashcards
`/cards` is a spaced-repetition deck over all vocabulary and kanji (SM-2 style, `server/srs.js`). New cards follow study-plan order, cards you miss come back later in the same session, and the plan schedules a daily review task.
