# N5 Trainer

Personal JLPT N5 study platform. Express + node:sqlite backend, React (Vite) frontend. Requires Node 22.13+.

```
npm install
npm run dev      # API on :3001, client on :5173
npm run build && npm start   # single server on :3001
npm test
```

Progress is stored in `server/n5.db` (single user, no auth).

## Adding content
- `server/content/grammar.js`: lessons and drills
- `server/content/vocab.js`: vocabulary and kanji words
- `server/content/listening.js`, `reading.js`: exam passages

Mock exam: 20 vocab, 20 grammar, 6 reading, 6 listening, 40 minutes, graded server-side.
Listening uses browser speech synthesis, so a Japanese voice must be installed on your OS.
