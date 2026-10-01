import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import * as xlsxModule from 'xlsx';
const xlsx = xlsxModule.default || xlsxModule;
import Papa from 'papaparse';

import { config } from './config.js';
import { db } from './db.js';
import { testConnection, sendEmail } from './emailEngine.js';
import { renderTemplate } from './templateEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middlewares
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static uploads serving
app.use('/uploads', express.static(config.uploadsDir));

// Multer storage setup for resume and sheet uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, config.uploadsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E6);
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_\-]/g, '_');
    cb(null, `${base}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB max
});

// 1. Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// 2. Verify Credentials (Gmail SMTP or Brevo API)
app.post('/api/verify', async (req, res) => {
  try {
    const { provider = 'gmail', email, appPassword, apiKey, senderName } = req.body;
    const credentials = {
      provider,
      email: (email || '').trim(),
      password: (appPassword || apiKey || '').replace(/\s+/g, ''),
      apiKey: (apiKey || appPassword || '').trim(),
      name: senderName || ''
    };

    const result = await testConnection(credentials);
    if (result.success) {
      return res.json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message || 'Verification failed' });
  }
});

// 3. Upload Resume PDF
app.post('/api/upload-resume', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No resume file uploaded' });
  }

  res.json({
    id: 'att-' + Date.now(),
    originalname: req.file.originalname,
    filename: req.file.filename,
    mimetype: req.file.mimetype || 'application/pdf',
    size: req.file.size,
    path: req.file.path
  });
});

// 4. Parse HR Spreadsheet (.xlsx, .xls, .csv)
app.post('/api/parse-sheet', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No spreadsheet file uploaded' });
  }

  const ext = path.extname(req.file.originalname).toLowerCase();
  const filePath = req.file.path;

  try {
    let rows = [];

    if (ext === '.csv' || ext === '.txt') {
      const content = fs.readFileSync(filePath, 'utf8');
      const parsed = Papa.parse(content, {
        header: true,
        skipEmptyLines: true,
        transformHeader: h => h.trim()
      });
      rows = parsed.data;
    } else if (ext === '.xlsx' || ext === '.xls') {
      const workbook = xlsx.readFile(filePath);
      const firstSheet = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheet];
      rows = xlsx.utils.sheet_to_json(worksheet, { defval: '' });
    } else {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return res.status(400).json({ error: 'Please upload a .csv, .xlsx, or .xls file.' });
    }

    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    if (!rows || rows.length === 0) {
      return res.status(400).json({ error: 'The uploaded sheet contains no rows.' });
    }

    const headers = Object.keys(rows[0]);
    const emailHeader = headers.find(h => /^(email|hr_email|recruiter_email|e_mail|mail|email_id|email_address)$/i.test(h.trim()))
      || headers.find(h => /email|mail/i.test(h))
      || headers[0];

    const nameHeader = headers.find(h => /^(name|hr_name|recruiter_name|contact_name|full_name|fullname|recruiter|hr)$/i.test(h.trim()))
      || headers.find(h => /name|contact/i.test(h));

    const companyHeader = headers.find(h => /^(company|company_name|organization|organisation|firm|org)$/i.test(h.trim()))
      || headers.find(h => /company|org/i.test(h));

    const roleHeader = headers.find(h => /^(role|job_title|position|target_role|designation|job)$/i.test(h.trim()))
      || headers.find(h => /role|job|title/i.test(h));

    const recipients = rows
      .map((row, idx) => {
        const email = String(row[emailHeader] || '').trim();
        const name = nameHeader ? String(row[nameHeader] || '').trim() : '';
        const company = companyHeader ? String(row[companyHeader] || '').trim() : '';
        const role = roleHeader ? String(row[roleHeader] || '').trim() : '';

        return {
          id: `rec-${idx + 1}-${Date.now()}`,
          email,
          name,
          company,
          role,
          ...row
        };
      })
      .filter(r => r.email && r.email.includes('@'));

    res.json({
      success: true,
      filename: req.file.originalname,
      totalCount: recipients.length,
      emailColumn: emailHeader,
      nameColumn: nameHeader || '',
      companyColumn: companyHeader || '',
      roleColumn: roleHeader || '',
      recipients
    });
  } catch (err) {
    console.error('Parse sheet error:', err);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.status(500).json({ error: `Failed to parse sheet: ${err.message}` });
  }
});

// 5. Dynamic Preview
app.post('/api/preview', (req, res) => {
  const { subject = '', body = '', recipient = {}, senderName = '', senderEmail = '' } = req.body;
  const globalVars = {
    sender_name: senderName || 'Your Name',
    sender_email: senderEmail || 'your-email@gmail.com'
  };

  const renderedSubject = renderTemplate(subject, recipient, globalVars);
  const renderedBody = renderTemplate(body, recipient, globalVars);

  res.json({
    renderedSubject,
    renderedBody
  });
});

// 6. Send Personalized Email Batch (With Live Results)
app.post('/api/send-batch', async (req, res) => {
  try {
    const {
      provider = 'gmail',
      senderEmail,
      appPassword,
      apiKey,
      senderName,
      recipients = [],
      subject,
      body,
      attachments = [],
      skipDuplicates = false
    } = req.body;

    const currentSenderEmail = (senderEmail || '').toLowerCase().trim();

    if (provider === 'gmail' && (!currentSenderEmail || !appPassword)) {
      return res.status(400).json({ error: 'Sender Gmail and 16-character Google App Password are required.' });
    }

    if ((provider === 'brevo' || provider === 'resend') && !apiKey && !appPassword) {
      return res.status(400).json({ error: `Please enter your ${provider === 'brevo' ? 'Brevo' : 'Resend'} API key.` });
    }

    if (!recipients || recipients.length === 0) {
      return res.status(400).json({ error: 'Please provide at least one HR contact.' });
    }

    if (!subject || !body) {
      return res.status(400).json({ error: 'Email subject and body are required.' });
    }

    const credentials = {
      provider,
      email: currentSenderEmail,
      password: (appPassword || apiKey || '').replace(/\s+/g, ''),
      apiKey: (apiKey || appPassword || '').trim(),
      name: senderName || (currentSenderEmail ? currentSenderEmail.split('@')[0] : 'Applicant')
    };

    // Test connection first
    const testRes = await testConnection(credentials);
    if (!testRes.success) {
      return res.status(400).json({ error: `Authentication failed: ${testRes.error}` });
    }

    // Deduplication check
    const previousCampaigns = db.getCampaigns() || [];
    const previouslySentSet = new Set();
    if (skipDuplicates) {
      previousCampaigns.forEach(c => {
        const campSender = (c.senderEmail || '').toLowerCase().trim();
        if (campSender && campSender === currentSenderEmail) {
          (c.recipients || []).forEach(r => {
            if (r.status === 'sent' && r.email) {
              previouslySentSet.add(r.email.toLowerCase().trim());
            }
          });
        }
      });
    }

    const results = [];
    let sentCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < recipients.length; i++) {
      const rawRecipient = recipients[i];
      const email = (typeof rawRecipient === 'string' ? rawRecipient.trim() : (rawRecipient.email || '').trim()).toLowerCase();
      const name = typeof rawRecipient === 'string' ? '' : (rawRecipient.name || rawRecipient.hr_name || '');
      const company = typeof rawRecipient === 'string' ? '' : (rawRecipient.company || rawRecipient.company_name || '');
      const role = typeof rawRecipient === 'string' ? '' : (rawRecipient.role || rawRecipient.job_title || '');

      if (!email || !email.includes('@')) {
        results.push({ email: email || `Invalid #${i + 1}`, name, company, status: 'failed', error: 'Invalid email syntax' });
        failedCount++;
        continue;
      }

      if (skipDuplicates && previouslySentSet.has(email)) {
        results.push({
          email,
          name,
          company,
          status: 'skipped',
          error: `Previously contacted from ${currentSenderEmail} (Duplicate prevented)`
        });
        skippedCount++;
        continue;
      }

      const context = typeof rawRecipient === 'object' ? { ...rawRecipient, email, name, company, role } : { email, name, company, role };
      const globalVars = {
        sender_name: credentials.name,
        sender_email: credentials.email
      };

      const renderedSubject = renderTemplate(subject, context, globalVars);
      const renderedBody = renderTemplate(body, context, globalVars);

      try {
        const dispatchResult = await sendEmail({
          to: email,
          subject: renderedSubject,
          body: renderedBody,
          attachments,
          senderName: credentials.name,
          senderEmail: credentials.email,
          credentials
        });

        results.push({
          email,
          name,
          company,
          status: 'sent',
          messageId: dispatchResult.messageId,
          sentAt: new Date().toISOString()
        });
        previouslySentSet.add(email);
        sentCount++;
      } catch (err) {
        results.push({
          email,
          name,
          company,
          status: 'failed',
          error: err.message || 'Send error'
        });
        failedCount++;
      }

      // Anti-spam jitter delay (1.2s - 2.0s) between successive sends
      if (i < recipients.length - 1) {
        const delay = 1200 + Math.floor(Math.random() * 800);
        await new Promise(r => setTimeout(r, delay));
      }
    }

    // Save campaign record
    db.saveCampaign({
      id: 'camp-' + Date.now(),
      name: `HR Outreach - ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      subject,
      body,
      senderName: credentials.name,
      senderEmail: currentSenderEmail,
      recipients: results,
      stats: {
        total: recipients.length,
        sent: sentCount,
        skipped: skippedCount,
        failed: failedCount
      },
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      status: 'completed'
    });

    res.json({
      success: true,
      total: recipients.length,
      sent: sentCount,
      skipped: skippedCount,
      failed: failedCount,
      results
    });
  } catch (error) {
    console.error('Batch dispatch error:', error);
    res.status(500).json({ error: error.message || 'Batch dispatch failed' });
  }
});

// 7. Get Past Campaigns
app.get('/api/campaigns', (req, res) => {
  res.json(db.getCampaigns());
});

// 8. Delete Campaign
app.delete('/api/campaigns/:id', (req, res) => {
  db.deleteCampaign(req.params.id);
  res.json({ success: true, message: 'Campaign deleted.' });
});

// 9. Get Templates
app.get('/api/templates', (req, res) => {
  res.json(db.getTemplates());
});

// Production client serving
const clientDistPath = path.join(__dirname, '../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
}

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
    return next();
  }
  const indexPath = path.join(clientDistPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

app.listen(config.port, () => {
  console.log(`\x1b[32m✔ HR Email Automation Server running at http://localhost:${config.port}\x1b[0m`);
});
