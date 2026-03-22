import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import projectRoutes from './routes/projects.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors({ origin: '*' }));
app.use(express.json());

// Request logger
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);

// Expose minimal runtime config (reads from .env)
app.get('/api/config', (req, res) => {
    try {
        const rawGemini = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
        const rawPoly = process.env.VITE_POLY_PIZZA_API_KEY || process.env.POLY_PIZZA_API_KEY || '';

        const geminiMatch = rawGemini.match(/AIzaSy[0-9a-zA-Z_-]{33}/);
        const polyMatch = rawPoly.match(/[a-f0-9]{32}/i);

        const geminiKey = geminiMatch ? geminiMatch[0] : null;
        const polyPizzaKey = polyMatch ? polyMatch[0] : null;

        res.json({ geminiKey, polyPizzaKey });
    } catch (err) {
        console.error('Failed to read config', err);
        res.status(500).json({ geminiKey: null, polyPizzaKey: null, error: err.message });
    }
});

// Health check
app.get('/', (req, res) => {
    res.json({ message: 'PyScape API is running', version: '2.0.0' });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('SERVER ERROR:', err);
    res.status(500).json({ message: 'Internal Server Error', error: err.message });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`PyScape server running on port ${PORT}`);
});
