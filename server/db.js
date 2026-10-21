import { DatabaseSync } from 'node:sqlite';

export function openDb(file = process.env.DB_FILE || 'n5.db') {
  const db = new DatabaseSync(file);
  db.exec(`
    CREATE TABLE IF NOT EXISTS attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts INTEGER NOT NULL,
      mode TEXT NOT NULL,
      qkey TEXT NOT NULL,
      tag TEXT NOT NULL,
      correct INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS attempts_tag ON attempts(tag);
    CREATE TABLE IF NOT EXISTS exams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      started INTEGER NOT NULL,
      finished INTEGER,
      limit_sec INTEGER NOT NULL,
      questions TEXT NOT NULL,
      result TEXT
    );
  `);
  return db;
}
