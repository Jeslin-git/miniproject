import express from 'express';
import pool from '../db.js';
import authenticate from '../middleware/auth.js';

const router = express.Router();

// All project routes are protected — user must be logged in
router.use(authenticate);

// GET /api/projects — list all projects for current user
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM projects WHERE user_id = $1 ORDER BY updated_at DESC',
            [req.user.id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Fetch projects error:', err);
        res.status(500).json({ message: 'Failed to fetch projects' });
    }
});

// POST /api/projects — create a new project
router.post('/', async (req, res) => {
    const { name } = req.body;
    if (!name) {
        return res.status(400).json({ message: 'Project name is required' });
    }

    try {
        const result = await pool.query(
            'INSERT INTO projects (name, user_id, data) VALUES ($1, $2, $3) RETURNING *',
            [name, req.user.id, JSON.stringify({ objects: [] })]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Create project error:', err);
        res.status(500).json({ message: 'Failed to create project' });
    }
});

// GET /api/projects/:id — get a single project (for workspace load)
router.get('/:id', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM projects WHERE id = $1 AND user_id = $2',
            [req.params.id, req.user.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Project not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Get project error:', err);
        res.status(500).json({ message: 'Failed to fetch project' });
    }
});

// PUT /api/projects/:id — update project name or scene data (auto-save)
router.put('/:id', async (req, res) => {
    const { name, data } = req.body;

    if (name === undefined && data === undefined) {
        return res.status(400).json({ message: 'Nothing to update: provide name or data' });
    }

    try {
        const fields = [];
        const values = [];

        if (name !== undefined) { fields.push(`name = $${values.push(name)}`); }
        if (data !== undefined) { fields.push(`data = $${values.push(JSON.stringify(data))}`); }
        fields.push(`updated_at = $${values.push(new Date().toISOString())}`);

        // WHERE clause uses the next two positional params
        const idIdx = values.push(req.params.id);
        const userIdx = values.push(req.user.id);

        const result = await pool.query(
            `UPDATE projects SET ${fields.join(', ')} WHERE id = $${idIdx} AND user_id = $${userIdx} RETURNING *`,
            values
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Project not found or access denied' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Update project error:', err);
        res.status(500).json({ message: 'Failed to update project' });
    }
});


// DELETE /api/projects/:id — delete a project
router.delete('/:id', async (req, res) => {
    try {
        const result = await pool.query(
            'DELETE FROM projects WHERE id = $1 AND user_id = $2 RETURNING id',
            [req.params.id, req.user.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Project not found or access denied' });
        }
        res.json({ message: 'Project deleted', id: req.params.id });
    } catch (err) {
        console.error('Delete project error:', err);
        res.status(500).json({ message: 'Failed to delete project' });
    }
});

export default router;
