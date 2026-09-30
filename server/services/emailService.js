import nodemailer from 'nodemailer';
import { google } from 'googleapis';
import { db } from '../db.js';
import { config } from '../config.js';
import { getOAuth2Client } from './googleOAuthService.js';
import path from 'path';
import fs from 'fs';

// Helper: Read attachment into base64 content
function getAttachmentBase64(att) {
  if (att.content) {
    return att.content;
  }
  let filePath = att.path;
  if (!filePath || !fs.existsSync(filePath)) {
    if (att.filename) {
      const fallback = path.join(config.uploadsDir, att.filename);
      if (fs.existsSync(fallback)) {
        filePath = fallback;
      }
    }
  }
  if (filePath && fs.existsSync(filePath)) {
    return fs.readFileSync(filePath).toString('base64');
  }
  return null;
}

export async function createTransporter(explicitCredentials = null) {
  if (explicitCredentials && explicitCredentials.email && explicitCredentials.password) {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // TLS via STARTTLS
      requireTLS: true,
      auth: {
        user: explicitCredentials.email.trim(),
        pass: explicitCredentials.password.replace(/\s+/g, '')
      },
      tls: {
        rejectUnauthorized: false
      },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000
    });
    return { 
      transporter, 
      senderEmail: explicitCredentials.email.trim(), 
      senderName: explicitCredentials.name || explicitCredentials.email.split('@')[0] 
    };
  }

  const auth = db.getAuth();

  if (auth.type === 'oauth' && auth.tokens) {
    const oauth2Client = getOAuth2Client();
    if (!oauth2Client) {
      throw new Error('OAuth2 client configuration not found.');
    }
    oauth2Client.setCredentials(auth.tokens);

    const accessTokenResponse = await oauth2Client.getAccessToken();
    const accessToken = typeof accessTokenResponse === 'string' ? accessTokenResponse : accessTokenResponse?.token;

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: auth.email,
        clientId: auth.googleClientId,
        clientSecret: auth.googleClientSecret,
        refreshToken: auth.tokens.refresh_token,
        accessToken: accessToken
      }
    });

    return { transporter, senderEmail: auth.email, senderName: auth.name };
  } else if (auth.type === 'app_password' && auth.smtpUser && auth.smtpPassword) {
    const transporter = nodemailer.createTransport({
      host: auth.smtpHost || 'smtp.gmail.com',
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: auth.smtpUser,
        pass: auth.smtpPassword.replace(/\s+/g, '')
      },
      tls: {
        rejectUnauthorized: false
      },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000
    });

    return { transporter, senderEmail: auth.smtpUser, senderName: auth.name || auth.smtpUser.split('@')[0] };
  } else {
    throw new Error('Please provide your Gmail and 16-character Google App Password.');
  }
}

// Test credentials / connection for Gmail SMTP, Resend HTTPS API, or Brevo HTTPS API
export async function testConnection(credentials = null) {
  if (!credentials) {
    return { success: false, error: 'No credentials provided' };
  }

  const provider = credentials.provider || 'gmail';

  if (provider === 'resend') {
    const apiKey = (credentials.apiKey || credentials.password || '').trim();
    if (!apiKey) {
      return { success: false, error: 'Resend API Key is required (e.g. re_123...)' };
    }
    try {
      const res = await fetch('https://api.resend.com/api_keys', {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return { success: false, error: err.message || `Resend validation failed (HTTP ${res.status})` };
      }
      return { success: true, email: credentials.email || 'Resend Verified', message: 'Resend API Key verified successfully!' };
    } catch (e) {
      return { success: false, error: `Resend connection failed: ${e.message}` };
    }
  }

  if (provider === 'brevo') {
    const apiKey = (credentials.apiKey || credentials.password || '').trim();
    if (!apiKey) {
      return { success: false, error: 'Brevo API Key is required' };
    }
    try {
      const res = await fetch('https://api.brevo.com/v3/account', {
        headers: { 'api-key': apiKey }
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return { success: false, error: err.message || `Brevo validation failed (HTTP ${res.status})` };
      }
      const acc = await res.json();
      return { success: true, email: acc.email || credentials.email, message: 'Brevo account verified successfully!' };
    } catch (e) {
      return { success: false, error: `Brevo connection failed: ${e.message}` };
    }
  }

  // Gmail SMTP
  try {
    const { transporter, senderEmail } = await createTransporter(credentials);
    await transporter.verify();
    return { success: true, email: senderEmail, message: 'Gmail SMTP connection verified successfully.' };
  } catch (error) {
    let msg = error.message || 'Connection test failed.';
    if (msg.includes('Connection timeout') || msg.includes('ETIMEDOUT')) {
      msg = 'Connection timeout: Your cloud host (e.g. Render/Railway) is blocking outbound SMTP ports. Please switch provider to Resend API or Brevo API (100% Free over HTTPS).';
    }
    return { success: false, error: msg };
  }
}

// Universal Send Email: Supports Resend (HTTPS), Brevo (HTTPS), and Gmail (SMTP)
export async function sendSingleEmail({ to, subject, htmlContent, textContent, attachments = [], senderName = '', replyTo = '', credentials = null }) {
  const provider = credentials?.provider || 'gmail';

  // --- 1. RESEND HTTPS API (Cloud Safe - No Port Blocks) ---
  if (provider === 'resend') {
    const apiKey = (credentials.apiKey || credentials.password || '').trim();
    const fromEmail = (credentials.email || '').trim();
    const fromDisplayName = senderName || credentials.name || 'HR Applicant';
    
    // Resend from address: if user has no custom domain, they can use 'onboarding@resend.dev' with reply-to
    const fromHeader = fromEmail.endsWith('@resend.dev') || fromEmail.includes('@') 
      ? `"${fromDisplayName}" <${fromEmail}>`
      : `"${fromDisplayName}" <onboarding@resend.dev>`;

    const resendAttachments = (attachments || []).map(att => {
      const b64 = getAttachmentBase64(att);
      if (!b64) return null;
      return {
        filename: att.originalname || att.filename || 'attachment.pdf',
        content: b64
      };
    }).filter(Boolean);

    const payload = {
      from: fromHeader,
      to: [to],
      subject: subject,
      html: htmlContent,
      text: textContent || htmlContent.replace(/<[^>]+>/g, ''),
      reply_to: fromEmail || replyTo || undefined,
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

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error || 'Resend dispatch failed');
    }

    return {
      success: true,
      messageId: data.id,
      to: to
    };
  }

  // --- 2. BREVO HTTPS API (Cloud Safe - No Port Blocks) ---
  if (provider === 'brevo') {
    const apiKey = (credentials.apiKey || credentials.password || '').trim();
    const fromEmail = (credentials.email || '').trim();
    const fromDisplayName = senderName || credentials.name || 'HR Applicant';

    const brevoAttachments = (attachments || []).map(att => {
      const b64 = getAttachmentBase64(att);
      if (!b64) return null;
      return {
        name: att.originalname || att.filename || 'attachment.pdf',
        content: b64
      };
    }).filter(Boolean);

    const payload = {
      sender: { name: fromDisplayName, email: fromEmail },
      to: [{ email: to }],
      subject: subject,
      htmlContent: htmlContent,
      textContent: textContent || htmlContent.replace(/<[^>]+>/g, ''),
      replyTo: replyTo ? { email: replyTo } : (fromEmail ? { email: fromEmail } : undefined),
      attachment: brevoAttachments.length > 0 ? brevoAttachments : undefined
    };

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Brevo dispatch failed');
    }

    return {
      success: true,
      messageId: data.messageId,
      to: to
    };
  }

  // --- 3. GMAIL SMTP (Standard Local / Unblocked) ---
  const { transporter, senderEmail, senderName: defaultName } = await createTransporter(credentials);

  const formattedAttachments = (attachments || [])
    .map(att => {
      if (!att) return null;
      if (att.path && fs.existsSync(att.path)) {
        return {
          filename: att.originalname || att.filename || path.basename(att.path),
          path: att.path,
          contentType: att.mimetype
        };
      }
      if (att.filename) {
        const fallbackPath = path.join(config.uploadsDir, att.filename);
        if (fs.existsSync(fallbackPath)) {
          return {
            filename: att.originalname || att.filename,
            path: fallbackPath,
            contentType: att.mimetype
          };
        }
      }
      if (att.content) {
        return {
          filename: att.filename || att.originalname || 'attachment',
          content: att.content,
          encoding: att.encoding || 'base64',
          contentType: att.mimetype
        };
      }
      return null;
    })
    .filter(Boolean);

  const fromDisplayName = senderName || defaultName || senderEmail;
  const mailOptions = {
    from: `"${fromDisplayName}" <${senderEmail}>`,
    to: to,
    subject: subject,
    html: htmlContent,
    text: textContent || htmlContent.replace(/<[^>]+>/g, ''),
    attachments: formattedAttachments
  };

  if (replyTo) {
    mailOptions.replyTo = replyTo;
  }

  const result = await transporter.sendMail(mailOptions);
  return {
    success: true,
    messageId: result.messageId,
    response: result.response,
    to: to
  };
}
