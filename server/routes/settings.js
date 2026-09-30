import express from 'express';
import { db } from '../db.js';

const router = express.Router();

router.get('/', (req, res) => {
  res.json(db.getSettings());
});

router.post('/', (req, res) => {
  const updated = db.setSettings(req.body);
  res.json({ success: true, settings: updated });
});

export default router;
