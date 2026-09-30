import express from 'express';
import { db } from '../db.js';
import Papa from 'papaparse';

const router = express.Router();

// Get all campaigns summary
router.get('/', (req, res) => {
  const campaigns = db.getCampaigns().map(c => ({
    id: c.id,
    name: c.name,
    subject: c.subject,
    status: c.status,
    stats: c.stats,
    createdAt: c.createdAt,
    completedAt: c.completedAt,
    attachmentsCount: c.attachments ? c.attachments.length : 0,
    recipientCount: c.recipients ? c.recipients.length : 0
  }));

  res.json(campaigns);
});

// Get single campaign with full recipient records
router.get('/:id', (req, res) => {
  const campaign = db.getCampaignById(req.params.id);
  if (!campaign) {
    return res.status(404).json({ error: 'Campaign not found' });
  }
  res.json(campaign);
});

// Export campaign report as CSV
router.get('/:id/export-csv', (req, res) => {
  const campaign = db.getCampaignById(req.params.id);
  if (!campaign) {
    return res.status(404).json({ error: 'Campaign not found' });
  }

  const flatRows = (campaign.recipients || []).map(r => ({
    Email: r.email,
    Name: r.name,
    Status: r.status,
    SentAt: r.sentAt || '',
    MessageId: r.messageId || '',
    Error: r.error || ''
  }));

  const csv = Papa.unparse(flatRows);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="campaign-${campaign.id}-report.csv"`);
  res.send(csv);
});

// Delete campaign
router.delete('/:id', (req, res) => {
  db.deleteCampaign(req.params.id);
  res.json({ success: true, message: 'Campaign deleted.' });
});

export default router;
