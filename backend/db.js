// SQLite setup using better-sqlite3
import Database from 'better-sqlite3';

// Initialize or open the database file. If it doesn't exist it will be created.
const db = new Database('database.sqlite');

// Create necessary tables if they don't already exist. This includes the users table
// (for storing credentials), a stats table for storing gameplay progress, and a
// questions table which will hold all quiz questions by level.
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  avatar_color TEXT
);

CREATE TABLE IF NOT EXISTS user_stats (
  user_id INTEGER PRIMARY KEY,
  level INTEGER NOT NULL DEFAULT 1,
  xp INTEGER NOT NULL DEFAULT 0,
  coins INTEGER NOT NULL DEFAULT 0,
  hearts INTEGER NOT NULL DEFAULT 3,
  streak INTEGER NOT NULL DEFAULT 0,
  best_streak INTEGER NOT NULL DEFAULT 0,
  last_login TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  level INTEGER NOT NULL,
  question TEXT NOT NULL,
  answer_a TEXT NOT NULL,
  answer_b TEXT NOT NULL,
  answer_c TEXT NOT NULL,
  answer_d TEXT NOT NULL,
  correct_index INTEGER NOT NULL
);
`);

// Seed example questions when the database is empty. This ensures the app has a
// minimal dataset to work with out of the box. In a production deployment you
// would likely replace this with a script to import questions from an external
// source or admin interface.
const seedCount = db.prepare('SELECT COUNT(*) AS c FROM questions').get().c;
if (seedCount === 0) {
  const insertQuestion = db.prepare(
    'INSERT INTO questions (level, question, answer_a, answer_b, answer_c, answer_d, correct_index) VALUES (?,?,?,?,?,?,?)'
  );
  const seedQuestions = [
    {
      level: 1,
      question: "Was ist 'Bilanzierung' im engeren Sinne?",
      a: 'Die Betrachtung von Bilanz, GuV und Anhang',
      b: 'Nur die Betrachtung der Bilanzpositionen',
      c: 'Nur die Betrachtung der GuV',
      d: 'Nur der Anhang',
      correct: 1,
    },
    {
      level: 1,
      question:
        'Welche Bestandteile hat der Jahresabschluss einer typischen Kapitalgesellschaft?',
      a: 'Nur Bilanz',
      b: 'Bilanz und Anhang',
      c: 'Bilanz, GuV und ggf. Anhang',
      d: 'Nur GuV',
      correct: 2,
    },
    {
      level: 2,
      question: "Was bedeutet 'Bilanzierung dem Grunde nach'?",
      a: 'Bewertungshöhe eines Vermögensgegenstandes',
      b: 'Ob etwas überhaupt in die Bilanz gehört',
      c: 'Nur die zeitliche Erfassung von Aufwendungen',
      d: 'Die Methode der Abschreibung',
      correct: 1,
    },
  ];
  const insertMany = db.transaction((rows) => {
    for (const q of rows) {
      insertQuestion.run(q.level, q.question, q.a, q.b, q.c, q.d, q.correct);
    }
  });
  insertMany(seedQuestions);
  console.log('Seed questions inserted into database.');
}

export default db;