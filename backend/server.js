// Express backend for the LernCasino project.
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import db from './db.js';

// Load environment variables from .env file (if present)
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_dev_key';

// Middleware setup
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

/**
 * Create a signed JWT for the given user object. Embeds the user id and username
 * as the payload, and signs it with a secret key defined in the environment.
 * @param {Object} user - user object with id and username
 * @returns {string} signed JWT
 */
function createToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

/**
 * Express middleware to check the Authorization header for a valid bearer token.
 * If valid, attaches the decoded user information to req.user and calls next().
 * Otherwise responds with 401 Unauthorized.
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

/**
 * Route for registering a new user. Accepts a username and password in the
 * request body. If the username is not already taken, stores the hashed
 * password and creates an entry in the user_stats table. Returns a signed
 * token and the new user's stats.
 */
app.post('/api/auth/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password || password.length < 4) {
    return res.status(400).json({ error: 'Username and password (min. 4 chars) required' });
  }
  // Check if username already exists
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    return res.status(409).json({ error: 'Username already taken' });
  }
  const hash = bcrypt.hashSync(password, 10);
  const now = new Date().toISOString();
  const avatarColor = '#7F5AF0';
  const insertUser = db.prepare(
    'INSERT INTO users (username, password_hash, created_at, avatar_color) VALUES (?,?,?,?)'
  );
  const result = insertUser.run(username, hash, now, avatarColor);
  const userId = result.lastInsertRowid;
  db.prepare(
    'INSERT INTO user_stats (user_id, level, xp, coins, hearts, streak, best_streak, last_login) VALUES (?, 1, 0, 0, 3, 0, 0, ?)' 
  ).run(userId, now);
  const user = { id: userId, username };
  const token = createToken(user);
  const stats = db.prepare(
    'SELECT level, xp, coins, hearts, streak, best_streak FROM user_stats WHERE user_id = ?'
  ).get(userId);
  return res.json({ token, user: { ...user, ...stats } });
});

/**
 * Route for logging in an existing user. Accepts username and password. If
 * credentials are valid, returns a signed token and the user stats.
 */
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const stats = db.prepare(
    'SELECT level, xp, coins, hearts, streak, best_streak FROM user_stats WHERE user_id = ?'
  ).get(user.id);
  db.prepare('UPDATE user_stats SET last_login = ? WHERE user_id = ?').run(new Date().toISOString(), user.id);
  const token = createToken(user);
  return res.json({ token, user: { id: user.id, username: user.username, ...stats } });
});

/**
 * Get the profile of the currently authenticated user along with their stats.
 */
app.get('/api/me', authMiddleware, (req, res) => {
  const user = db
    .prepare('SELECT id, username, avatar_color FROM users WHERE id = ?')
    .get(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  const stats = db
    .prepare('SELECT level, xp, coins, hearts, streak, best_streak FROM user_stats WHERE user_id = ?')
    .get(user.id);
  return res.json({ ...user, ...stats });
});

/**
 * Update the profile of the current user. Allows changing username and password
 * (if provided). Ensures username uniqueness when updated. Returns updated user.
 */
app.put('/api/me', authMiddleware, (req, res) => {
  const { username, password } = req.body;
  const userId = req.user.id;
  if (username) {
    const existing = db
      .prepare('SELECT id FROM users WHERE username = ? AND id != ?')
      .get(username, userId);
    if (existing) {
      return res.status(409).json({ error: 'Username already taken' });
    }
    db.prepare('UPDATE users SET username = ? WHERE id = ?').run(username, userId);
  }
  if (password && password.length >= 4) {
    const hash = bcrypt.hashSync(password, 10);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, userId);
  }
  const user = db
    .prepare('SELECT id, username, avatar_color FROM users WHERE id = ?')
    .get(userId);
  const stats = db
    .prepare('SELECT level, xp, coins, hearts, streak, best_streak FROM user_stats WHERE user_id = ?')
    .get(userId);
  return res.json({ ...user, ...stats });
});

/**
 * Update the gameplay progress of the current user. Accepts a JSON body
 * containing the new values for level, xp, coins, hearts, streak and bestStreak.
 */
app.post('/api/progress', authMiddleware, (req, res) => {
  const { level, xp, coins, hearts, streak, bestStreak } = req.body;
  const userId = req.user.id;
  const current = db
    .prepare('SELECT * FROM user_stats WHERE user_id = ?')
    .get(userId);
  if (!current) {
    return res.status(404).json({ error: 'Stats not found' });
  }
  const newLevel = level ?? current.level;
  const newXp = xp ?? current.xp;
  const newCoins = coins ?? current.coins;
  const newHearts = hearts ?? current.hearts;
  const newStreak = streak ?? current.streak;
  const newBestStreak = Math.max(bestStreak ?? current.best_streak, current.best_streak);
  db.prepare(
    'UPDATE user_stats SET level = ?, xp = ?, coins = ?, hearts = ?, streak = ?, best_streak = ? WHERE user_id = ?'
  ).run(newLevel, newXp, newCoins, newHearts, newStreak, newBestStreak, userId);
  return res.json({ ok: true });
});

/**
 * Retrieve all questions for a specific level. Requires authentication. Returns
 * an array of questions with their answers and the index of the correct answer.
 */
app.get('/api/questions', authMiddleware, (req, res) => {
  const level = parseInt(req.query.level || '1', 10);
  const rows = db.prepare('SELECT * FROM questions WHERE level = ? ORDER BY id ASC').all(level);
  const mapped = rows.map((r) => ({
    id: r.id,
    level: r.level,
    q: r.question,
    answers: [r.answer_a, r.answer_b, r.answer_c, r.answer_d],
    correctIndex: r.correct_index,
  }));
  return res.json(mapped);
});

/**
 * Return the leaderboard. Lists users sorted by XP. Does not require auth to
 * support a public leaderboard display. Limits results to 50 entries.
 */
app.get('/api/leaderboard', (req, res) => {
  const rows = db
    .prepare(
      'SELECT u.username, s.level, s.xp, s.streak, s.best_streak FROM users u JOIN user_stats s ON s.user_id = u.id ORDER BY s.xp DESC LIMIT 50'
    )
    .all();
  return res.json(rows);
});

// Start the server
app.listen(PORT, () => {
  console.log(`LernCasino backend is running on http://localhost:${PORT}`);
});