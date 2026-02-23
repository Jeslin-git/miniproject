import express from 'express';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Middleware to verify token
const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token, authorization denied' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ message: 'Token is not valid' });
    }
};

router.get('/stats', authenticate, (req, res) => {
    // Mock dashboard data
    res.json({
        activeSessions: 12,
        serverUptime: '99.9%',
        lastLogin: new Date().toISOString()
    });
});

export default router;
