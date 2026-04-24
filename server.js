require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key';
const DATABASE_PATH = process.env.DATABASE_PATH || './database.sqlite';

// Initialize database
const db = new Database(DATABASE_PATH);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Database initialization
const initDatabase = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      record_type TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (owner_id) REFERENCES users(id)
    );
  `);
};

initDatabase();

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const stmt = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)');
    const result = stmt.run(username, hashedPassword);

    const user = {
      id: result.lastInsertRowid,
      username: username
    };

    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '24h' });

    res.status(201).json({
      message: 'User created successfully',
      token: token,
      user: user
    });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'Username already exists' });
    }
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
  const user = stmt.get(username);

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const validPassword = await bcrypt.compare(password, user.password);

  if (!validPassword) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const userData = {
    id: user.id,
    username: user.username
  };

  const token = jwt.sign(userData, JWT_SECRET, { expiresIn: '24h' });

  res.json({
    message: 'Login successful',
    token: token,
    user: userData
  });
});

// IDOR Vulnerable Endpoint - NO OWNER VALIDATION
app.get('/api/records/:id', authenticateToken, (req, res) => {
  const recordId = req.params.id;

  // VULNERABLE: No owner_id check against req.user.id
  // This is the intentional IDOR vulnerability for educational purposes
  const stmt = db.prepare('SELECT * FROM records WHERE id = ?');
  const record = stmt.get(recordId);

  if (!record) {
    return res.status(404).json({ error: 'Record not found' });
  }

  // Intentionally returning the record without verifying ownership
  res.json({
    id: record.id,
    owner_id: record.owner_id,
    title: record.title,
    content: record.content,
    record_type: record.record_type,
    created_at: record.created_at,
    accessed_by_user_id: req.user.id  // For educational purposes - shows who is accessing
  });
});

// List user's own records (safe endpoint)
app.get('/api/records', authenticateToken, (req, res) => {
  const stmt = db.prepare('SELECT * FROM records WHERE owner_id = ?');
  const records = stmt.all(req.user.id);

  res.json({
    records: records,
    user_id: req.user.id
  });
});

// Create a new record
app.post('/api/records', authenticateToken, (req, res) => {
  const { title, content, record_type } = req.body;

  if (!title || !content || !record_type) {
    return res.status(400).json({ error: 'Title, content, and record_type required' });
  }

  const stmt = db.prepare('INSERT INTO records (owner_id, title, content, record_type) VALUES (?, ?, ?, ?)');
  const result = stmt.run(req.user.id, title, content, record_type);

  res.status(201).json({
    message: 'Record created',
    id: result.lastInsertRowid,
    owner_id: req.user.id,
    title: title,
    content: content,
    record_type: record_type
  });
});

// Catch-all for serving SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`IDOR Laboratory running on http://localhost:${PORT}`);
  console.log('⚠️  WARNING: This application contains intentional security vulnerabilities for educational purposes');
});