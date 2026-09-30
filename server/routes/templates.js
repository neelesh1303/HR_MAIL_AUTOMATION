import express from 'express';
import { db } from '../db.js';

const router = express.Router();

router.get('/', (req, res) => {
  res.json(db.getTemplates());
});

router.post('/', (req, res) => {
  const { name, category, subject, body } = req.body;
  if (!name || !subject || !body) {
    return res.status(400).json({ error: 'Name, subject, and body are required' });
  }

  const saved = db.saveTemplate({
    name,
    category: category || 'General',
    subject,
    body
  });

  res.json(saved);
});

router.put('/:id', (req, res) => {
  const { name, category, subject, body } = req.body;
  const existing = db.getTemplateById(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Template not found' });
  }

  const updated = db.saveTemplate({
    ...existing,
    name: name || existing.name,
    category: category || existing.category,
    subject: subject !== undefined ? subject : existing.subject,
    body: body !== undefined ? body : existing.body
  });

  res.json(updated);
});

router.delete('/:id', (req, res) => {
  db.deleteTemplate(req.params.id);
  res.json({ success: true, message: 'Template removed.' });
});

export default router;
