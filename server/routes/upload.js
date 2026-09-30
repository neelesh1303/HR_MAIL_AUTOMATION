import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { config } from '../config.js';
import * as xlsxModule from 'xlsx';
const xlsx = xlsxModule.default || xlsxModule;
import Papa from 'papaparse';

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_\-]/g, '_');
    cb(null, `${base}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB max per file (Gmail limit is 25MB)
});

// Upload attachment files (PDF, DOCX, etc.)
router.post('/attachment', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  res.json({
    id: 'att-' + Date.now(),
    originalname: req.file.originalname,
    filename: req.file.filename,
    mimetype: req.file.mimetype,
    size: req.file.size,
    path: req.file.path
  });
});

// Delete attachment
router.delete('/attachment/:filename', (req, res) => {
  const filePath = path.join(config.uploadsDir, req.params.filename);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      return res.json({ success: true, message: 'Attachment deleted.' });
    } catch (e) {
      return res.status(500).json({ error: 'Failed to delete file' });
    }
  }
  res.json({ success: true, message: 'File was already removed.' });
});

// Upload & Parse Recipient Sheet (CSV or Excel)
router.post('/recipients-file', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file provided' });
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
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      rows = xlsx.utils.sheet_to_json(worksheet, { defval: '' });
    } else {
      // Clean up uploaded file
      fs.unlinkSync(filePath);
      return res.status(400).json({ error: 'Unsupported file format. Please upload .csv, .xlsx, or .xls' });
    }

    // Clean up temporary file
    fs.unlinkSync(filePath);

    // Identify email and name column
    if (rows.length === 0) {
      return res.status(400).json({ error: 'Uploaded file contains no rows.' });
    }

    const headers = Object.keys(rows[0]);
    const emailHeader = headers.find(h => /^(email|hr_email|e_mail|mail|recruiter_email|email_id|email_address)$/i.test(h.trim())) 
      || headers.find(h => /email|mail/i.test(h)) 
      || headers[0];
      
    const nameHeader = headers.find(h => /^(name|hr_name|recruiter_name|contact_name|full_name|fullname|recruiter|hr)$/i.test(h.trim()))
      || headers.find(h => /name|contact/i.test(h));

    const companyHeader = headers.find(h => /^(company|company_name|organization|organisation|org|companyname|firm)$/i.test(h.trim()))
      || headers.find(h => /company|org/i.test(h));

    const roleHeader = headers.find(h => /^(role|job_title|position|target_role|designation|job)$/i.test(h.trim()))
      || headers.find(h => /role|job|position|title/i.test(h));

    // Normalize recipients with normalized keys
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
      .filter(r => r.email && r.email.includes('@')); // Filter valid-looking emails

    res.json({
      success: true,
      filename: req.file.originalname,
      totalCount: recipients.length,
      headers: headers,
      emailColumn: emailHeader,
      nameColumn: nameHeader || '',
      companyColumn: companyHeader || '',
      roleColumn: roleHeader || '',
      recipients: recipients
    });
  } catch (err) {
    console.error('File parsing error:', err);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.status(500).json({ error: `Failed to parse file: ${err.message}` });
  }
});

export default router;
