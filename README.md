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
- `server/content/grammar-core.js`, `grammar-extra.js`: 46 lessons with drills
- `server/content/vocab.js`, `vocab-extra.js`: vocabulary (694 words)
- `server/content/kanji.js`: 117 kanji with readings and example words
- `server/content/listening.js`, `reading.js`: exam passages

Mock exam: 15 vocab, 10 kanji, 25 grammar, 8 reading, 8 listening (66 questions, 50 minutes), graded server-side.
Listening uses browser speech synthesis, so a Japanese voice must be installed on your OS.
