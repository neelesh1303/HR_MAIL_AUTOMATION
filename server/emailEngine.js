import nodemailer from 'nodemailer';
import path from 'path';
import fs from 'fs';
import { config } from './config.js';
import { textToHtml, htmlToText } from './templateEngine.js';

// Helper: Convert attachment into base64 content
function getAttachmentBase64(att) {
  if (att.content) return att.content;
  let filePath = att.path;
  if (!filePath || !fs.existsSync(filePath)) {
    if (att.filename) {
      const fallback = path.join(config.uploadsDir, att.filename);
      if (fs.existsSync(fallback)) filePath = fallback;
    }
  }
  if (filePath && fs.existsSync(filePath)) {
    return fs.readFileSync(filePath).toString('base64');
  }
  return null;
}

// Create verified Nodemailer Gmail transporter with clean EHLO hostname
export function createGmailTransporter(email, password) {
  const cleanEmail = (email || '').trim();
  const cleanPassword = (password || '').replace(/\s+/g, '');

  if (!cleanEmail || !cleanPassword) {
    throw new Error('Gmail address and 16-character App Password are required.');
  }

  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // SSL
    name: 'gmail.com', // Sends clean EHLO gmail.com greeting instead of localhost
    auth: {
      user: cleanEmail,
      pass: cleanPassword
    }
  });
}

// Test credentials connection
export async function testConnection(credentials) {
  const provider = credentials?.provider || 'gmail';

  if (provider === 'resend') {
    const apiKey = (credentials?.apiKey || credentials?.password || '').trim();
    if (!apiKey) return { success: false, error: 'Resend API key is required (starts with re_...)' };
    if (!apiKey.startsWith('re_')) return { success: false, error: 'Invalid Resend API Key format (must start with re_)' };
    return { success: true, message: 'Resend API Key ready.' };
  }

  if (provider === 'brevo') {
    const apiKey = (credentials?.apiKey || credentials?.password || '').trim();
    if (!apiKey) return { success: false, error: 'Brevo API key is required (starts with xkeysib-...)' };
    return { success: true, message: 'Brevo API Key ready.' };
  }

  // Gmail SMTP
  try {
    const transporter = createGmailTransporter(credentials.email, credentials.password);
    await transporter.verify();
    return { success: true, message: `Connected to Gmail (${credentials.email}) successfully!` };
  } catch (err) {
    let msg = err.message || 'Gmail authentication failed.';
    if (msg.includes('535') || msg.includes('Username and Password not accepted') || msg.includes('Invalid login')) {
      msg = 'Invalid Gmail App Password. Ensure 2-Step Verification is ON and generate a 16-letter App Password at myaccount.google.com/apppasswords.';
    } else if (msg.includes('ETIMEDOUT') || msg.includes('Connection timeout')) {
      msg = 'Connection timeout. Cloud host blocks SMTP ports. Run locally or switch to the Brevo API tab.';
    }
    return { success: false, error: msg };
  }
}

// Universal Send Single Email
export async function sendEmail({ to, subject, body, attachments = [], senderName = '', senderEmail = '', credentials = {} }) {
  const provider = credentials?.provider || 'gmail';
  const cleanTo = (to || '').trim();

  if (!cleanTo || !cleanTo.includes('@')) {
    throw new Error(`Invalid recipient email: "${to}"`);
  }

  const htmlContent = textToHtml(body);
  const plainText = htmlToText(body);
  const fromName = senderName || credentials.name || (senderEmail || credentials.email || '').split('@')[0] || 'Applicant';
  const fromEmail = (senderEmail || credentials.email || '').trim();

  // 1. BREVO HTTPS REST API
  if (provider === 'brevo') {
    const apiKey = (credentials.apiKey || credentials.password || '').trim();
    const brevoAttachments = (attachments || []).map(att => {
      const b64 = getAttachmentBase64(att);
      if (!b64) return null;
      return {
        name: att.originalname || att.filename || 'resume.pdf',
        content: b64
      };
    }).filter(Boolean);

    const payload = {
      sender: { name: fromName, email: fromEmail },
      to: [{ email: cleanTo }],
      subject: subject,
      htmlContent: htmlContent,
      textContent: plainText,
      replyTo: fromEmail ? { email: fromEmail } : undefined,
      attachment: brevoAttachments.length > 0 ? brevoAttachments : undefined
    };

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || (data.errors ? JSON.stringify(data.errors) : `Brevo error (HTTP ${res.status})`));
    }

    return {
      success: true,
      messageId: data.messageId,
      to: cleanTo
    };
  }

  // 2. RESEND HTTPS REST API
  if (provider === 'resend') {
    const apiKey = (credentials.apiKey || credentials.password || '').trim();
    let fromHeader = `"${fromName}" <onboarding@resend.dev>`;
    if (fromEmail && !fromEmail.endsWith('@gmail.com') && !fromEmail.endsWith('@yahoo.com') && !fromEmail.endsWith('@outlook.com') && !fromEmail.endsWith('@hotmail.com')) {
      fromHeader = `"${fromName}" <${fromEmail}>`;
    }

    const resendAttachments = (attachments || []).map(att => {
      const b64 = getAttachmentBase64(att);
      if (!b64) return null;
      return {
        filename: att.originalname || att.filename || 'resume.pdf',
        content: b64
      };
    }).filter(Boolean);

    const payload = {
      from: fromHeader,
      to: [cleanTo],
      subject: subject,
      html: htmlContent,
      text: plainText,
      reply_to: fromEmail || undefined,
      attachments: resendAttachments.length > 0 ? resendAttachments : undefined
    };

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || data.error || `Resend error (HTTP ${res.status})`);
    }

    return {
      success: true,
      messageId: data.id,
      to: cleanTo
    };
  }

  // 3. GMAIL SMTP (Standard & Most Reliable on Localhost)
  const transporter = createGmailTransporter(fromEmail || credentials.email, credentials.password || credentials.appPassword);

  const formattedAttachments = (attachments || []).map(att => {
    if (!att) return null;
    if (att.path && fs.existsSync(att.path)) {
      return {
        filename: att.originalname || att.filename || path.basename(att.path),
        path: att.path,
        contentType: att.mimetype || 'application/pdf',
        contentDisposition: 'attachment'
      };
    }
    if (att.filename) {
      const fallback = path.join(config.uploadsDir, att.filename);
      if (fs.existsSync(fallback)) {
        return {
          filename: att.originalname || att.filename,
          path: fallback,
          contentType: att.mimetype || 'application/pdf',
          contentDisposition: 'attachment'
        };
      }
    }
    if (att.content) {
      return {
        filename: att.filename || att.originalname || 'resume.pdf',
        content: att.content,
        encoding: 'base64',
        contentType: att.mimetype || 'application/pdf',
        contentDisposition: 'attachment'
      };
    }
    return null;
  }).filter(Boolean);

  const mailOptions = {
    from: `"${fromName}" <${fromEmail}>`,
    to: cleanTo,
    replyTo: fromEmail,
    subject: subject,
    text: plainText,
    html: htmlContent,
    attachments: formattedAttachments,
    headers: {
      'X-Mailer': 'Gmail Web UI',
      'X-Entity-Ref-ID': `${Date.now()}`
    }
  };

  const result = await transporter.sendMail(mailOptions);

  return {
    success: true,
    messageId: result.messageId,
    to: cleanTo
  };
}
