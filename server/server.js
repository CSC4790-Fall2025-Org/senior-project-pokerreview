const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcrypt');
const pool = require('./db');

const app = express();

app.use(cors({
  origin: 'http://localhost:3000', // React frontend
  credentials: true
}));
app.use(bodyParser.json());

/**
 * SIGN UP
 */
app.post('/signup', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ success: false, error: 'All fields are required' });
  }

  try {
    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT * FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'Username or email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert into DB
    const result = await pool.query(
      'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id, username, email, created_at',
      [username, email, hashedPassword]
    );

    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * LOGIN
 */
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password are required' });
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    // Compare password hashes
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        created_at: user.created_at
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// UPDATE PROFILE
app.put('/users/:id', async (req, res) => {
  const { id } = req.params;
  const username = req.body.username ?? null; // normalize undefined -> null
  const email    = req.body.email ?? null;

  if (username === null && email === null) {
    return res.status(400).json({ success: false, error: 'Nothing to update' });
  }

  try {
    const result = await pool.query(
      `UPDATE users
         SET username = COALESCE($1, username),
             email    = COALESCE($2, email)
       WHERE id = $3
       RETURNING id, username, email, created_at`,
      [username, email, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    return res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    // Unique violation
    if (err?.code === '23505') {
      return res.status(400).json({ success: false, error: 'Username or email already exists' });
    }
    console.error('PUT /users/:id error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Server error' });
  }
});





/**
 * START SERVER
 */
app.listen(3001, () => console.log('Server running on port 3001'));
