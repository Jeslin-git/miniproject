import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db.js';
import authenticate from '../middleware/auth.js';
import crypto from 'crypto';
import { sendVerificationEmail } from '../utils/email.js';

const router = express.Router();

// Helper to sign a JWT for a user
function signToken(user) {
    return jwt.sign(
        { id: user.id, email: user.email, full_name: user.full_name },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
    const { email, password, full_name = '' } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }

    try {
        // Check if user already exists
        const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existing.rows.length > 0) {
            return res.status(409).json({ message: 'An account with this email already exists' });
        }

        const verification_token = crypto.randomBytes(32).toString('hex');
        const expires = new Date();
        expires.setHours(expires.getHours() + 24); // 24 hours

        const password_hash = await bcrypt.hash(password, 12);
        const result = await pool.query(
            'INSERT INTO users (email, password_hash, full_name, verification_token, verification_token_expires) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, full_name, created_at',
            [email, password_hash, full_name, verification_token, expires]
        );

        const user = result.rows[0];
        await sendVerificationEmail(email, verification_token);
        res.status(201).json({ message: 'Registration successful. Please check your email to verify your account.' });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ message: 'Registration failed', error: err.message });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }

    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'No account found with that email address.' });
        }

        const user = result.rows[0];
        if (!user.email_verified) {
            return res.status(403).json({ message: 'Please verify your email before logging in. Check your inbox.' });
        }
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const token = signToken(user);
        res.json({
            token,
            user: { id: user.id, email: user.email, full_name: user.full_name, created_at: user.created_at }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ message: 'Login failed', error: err.message });
    }
});

// GET /api/auth/me — return current user from token
router.get('/me', authenticate, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, email, full_name, created_at FROM users WHERE id = $1',
            [req.user.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({ user: result.rows[0] });
    } catch (err) {
        console.error('Me error:', err);
        res.status(500).json({ message: 'Failed to fetch user' });
    }
});

// PUT /api/auth/me — update display name
router.put('/me', authenticate, async (req, res) => {
    const { full_name } = req.body;
    if (!full_name) {
        return res.status(400).json({ message: 'full_name is required' });
    }

    try {
        const result = await pool.query(
            'UPDATE users SET full_name = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email, full_name',
            [full_name, req.user.id]
        );
        res.json({ user: result.rows[0] });
    } catch (err) {
        console.error('Update user error:', err);
        res.status(500).json({ message: 'Failed to update profile' });
    }
});

// GET /api/auth/verify-email
router.get('/verify-email', async (req, res) => {
    const { token } = req.query;
    if (!token) return res.status(400).json({ message: 'Verification token is required' });

    try {
        const result = await pool.query('SELECT * FROM users WHERE verification_token = $1', [token]);
        if (result.rows.length === 0) {
            return res.status(400).json({ message: 'Invalid or expired verification token' });
        }

        const user = result.rows[0];
        if (new Date() > new Date(user.verification_token_expires)) {
            return res.status(400).json({ message: 'Verification token has expired. Please register again.' });
        }

        const updateResult = await pool.query(
            'UPDATE users SET email_verified = TRUE, verification_token = NULL, verification_token_expires = NULL WHERE id = $1 RETURNING id, email, full_name, created_at',
            [user.id]
        );

        const verifiedUser = updateResult.rows[0];
        const jwtToken = signToken(verifiedUser);

        res.json({
            message: 'Email successfully verified',
            token: jwtToken,
            user: { id: verifiedUser.id, email: verifiedUser.email, full_name: verifiedUser.full_name, created_at: verifiedUser.created_at }
        });
    } catch (err) {
        console.error('Verify email error:', err);
        res.status(500).json({ message: 'Failed to verify email' });
    }
});

export default router;
