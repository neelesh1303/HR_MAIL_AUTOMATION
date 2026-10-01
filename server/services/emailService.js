import nodemailer from 'nodemailer';
import { google } from 'googleapis';
import { db } from '../db.js';
import { config } from '../config.js';
import { getOAuth2Client } from './googleOAuthService.js';
import path from 'path';
import fs from 'fs';

// Helper: Convert attachment into base64 string
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

// Helper: Convert multiline text into clean HTML paragraphs
export function textToHtml(text) {
  if (!text) return '';
  // If already full HTML document
  if (text.includes('<p>') || text.includes('<div>') || text.includes('<br>')) {
    return text;
  }
  const paragraphs = text
    .split(/\n\s*\n/)
    .map(p => `<p style="margin: 0 0 14px 0;">${p.replace(/\n/g, '<br>')}</p>`)
    .join('\n');
  return `<!DOCTYPE html><html><body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; line-height: 1.6; color: #1e293b; margin: 0; padding: 10px 0;">${paragraphs}</body></html>`;
}

// Helper: Convert HTML to plain text
export function htmlToText(html) {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .trim();
}

export async function createTransporter(explicitCredentials = null) {
  if (explicitCredentials && explicitCredentials.email && explicitCredentials.password) {
    const userEmail = explicitCredentials.email.trim();
    const cleanPassword = explicitCredentials.password.replace(/\s+/g, '');

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: userEmail,
        pass: cleanPassword
      }
    });

    return { 
      transporter, 
      senderEmail: userEmail, 
      senderName: explicitCredentials.name || userEmail.split('@')[0] 
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
      service: 'gmail',
      auth: {
        user: auth.smtpUser.trim(),
        pass: auth.smtpPassword.replace(/\s+/g, '')
      }
    });

    return { transporter, senderEmail: auth.smtpUser.trim(), senderName: auth.name || auth.smtpUser.split('@')[0] };
  } else {
    throw new Error('Please provide your Gmail and 16-character Google App Password.');
  }
}

// Test credentials / connection
export async function testConnection(credentials = null) {
  if (!credentials) {
    const auth = db.getAuth();
    if (auth.smtpUser && auth.smtpPassword) {
      credentials = {
        provider: 'gmail',
        email: auth.smtpUser,
        password: auth.smtpPassword,
        name: auth.name
      };
    } else if (auth.type === 'oauth' && auth.tokens) {
      credentials = { provider: 'gmail' };
    } else {
      return { success: false, error: 'No credentials configured' };
    }
  }

  const provider = credentials.provider || 'gmail';

  if (provider === 'resend') {
    const apiKey = (credentials.apiKey || credentials.password || '').trim();
    if (!apiKey) {
      return { success: false, error: 'Resend API Key is required (starts with re_...)' };
    }
    if (!apiKey.startsWith('re_')) {
      return { success: false, error: 'Invalid Resend API Key format. It should start with "re_"' };
    }
    return { success: true, email: credentials.email || 'Resend Key Ready', message: 'Resend API Key verified!' };
  }

  if (provider === 'brevo') {
    const apiKey = (credentials.apiKey || credentials.password || '').trim();
    if (!apiKey) {
      return { success: false, error: 'Brevo API Key is required (starts with xkeysib-...)' };
    }
    return { success: true, email: credentials.email || 'Brevo Key Ready', message: 'Brevo API Key verified!' };
  }

  // Gmail SMTP / OAuth
  try {
    const { transporter, senderEmail } = await createTransporter(credentials);
    await transporter.verify();
    return { success: true, email: senderEmail, message: 'Gmail SMTP connection verified successfully.' };
  } catch (error) {
    let msg = error.message || 'Connection test failed.';
    if (msg.includes('Connection timeout') || msg.includes('ETIMEDOUT')) {
      msg = 'Connection timeout: Cloud hosts (Render/Railway) block SMTP sockets. Run locally with npm run dev or switch to Brevo HTTPS API.';
    } else if (msg.includes('Invalid login') || msg.includes('535-5.7.8') || msg.includes('Username and Password not accepted')) {
      msg = 'Invalid Gmail credentials. Ensure 2-Step Verification is ON and you generated a 16-character App Password at myaccount.google.com/apppasswords.';
    }
    return { success: false, error: msg };
  }
}

// Universal Send Email Function: Supports Gmail SMTP, Brevo HTTPS, and Resend HTTPS
export async function sendSingleEmail({ to, subject, htmlContent, textContent, attachments = [], senderName = '', replyTo = '', credentials = null }) {
  const provider = credentials?.provider || 'gmail';
  const cleanRecipient = (to || '').trim();

  if (!cleanRecipient || !cleanRecipient.includes('@')) {
    throw new Error(`Invalid recipient email: "${to}"`);
  }

  const finalHtml = textToHtml(htmlContent);
  const finalPlainText = textContent || htmlToText(htmlContent);

  // --- 1. RESEND HTTPS API ---
  if (provider === 'resend') {
    const apiKey = (credentials.apiKey || credentials.password || '').trim();
    const fromEmail = (credentials.email || '').trim();
    const fromDisplayName = senderName || credentials.name || 'HR Applicant';
    
    let fromHeader = `"${fromDisplayName}" <onboarding@resend.dev>`;
    if (fromEmail.includes('@') && !fromEmail.endsWith('@gmail.com') && !fromEmail.endsWith('@yahoo.com') && !fromEmail.endsWith('@outlook.com') && !fromEmail.endsWith('@hotmail.com') && !fromEmail.endsWith('@icloud.com')) {
      fromHeader = `"${fromDisplayName}" <${fromEmail}>`;
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
      to: [cleanRecipient],
      subject: subject,
      html: finalHtml,
      text: finalPlainText,
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

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      let errMsg = data.message || data.error || `Resend dispatch failed (HTTP ${res.status})`;
      if (typeof errMsg === 'object' && errMsg !== null) {
        errMsg = JSON.stringify(errMsg);
      }
      if (typeof errMsg === 'string' && (errMsg.includes('only send testing emails to your own email address') || errMsg.includes('resend.com/domains'))) {
        errMsg = `${errMsg} (Tip: On Resend Free Tier without a verified custom domain, you can only send to your own registered email. To send to arbitrary HR emails, use 'Gmail App Password' on localhost or 'Brevo API'!)`;
      }
      throw new Error(errMsg);
    }

    return {
      success: true,
      messageId: data.id,
      to: cleanRecipient
    };
  }

  // --- 2. BREVO HTTPS API ---
  if (provider === 'brevo') {
    const apiKey = (credentials.apiKey || credentials.password || '').trim();
    const fromEmail = (credentials.email || '').trim();
    const fromDisplayName = senderName || credentials.name || 'HR Applicant';

    const brevoAttachments = (attachments || []).map(att => {
      const b64 = getAttachmentBase64(att);
      if (!b64) return null;
      return {
        name: att.originalname || att.filename || 'resume.pdf',
        content: b64
      };
    }).filter(Boolean);

    const payload = {
      sender: { name: fromDisplayName, email: fromEmail },
      to: [{ email: cleanRecipient }],
      subject: subject,
      htmlContent: finalHtml,
      textContent: finalPlainText,
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

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      let errMsg = data.message || (data.errors ? JSON.stringify(data.errors) : `Brevo dispatch failed (HTTP ${res.status})`);
      throw new Error(errMsg);
    }

    return {
      success: true,
      messageId: data.messageId,
      to: cleanRecipient
    };
  }

  // --- 3. GMAIL SMTP (Standard Localhost Transporter) ---
  const { transporter, senderEmail, senderName: defaultName } = await createTransporter(credentials);

  const formattedAttachments = (attachments || [])
    .map(att => {
      if (!att) return null;
      if (att.path && fs.existsSync(att.path)) {
        return {
          filename: att.originalname || att.filename || path.basename(att.path),
          path: att.path,
          contentType: att.mimetype || 'application/pdf'
        };
      }
      if (att.filename) {
        const fallbackPath = path.join(config.uploadsDir, att.filename);
        if (fs.existsSync(fallbackPath)) {
          return {
            filename: att.originalname || att.filename,
            path: fallbackPath,
            contentType: att.mimetype || 'application/pdf'
          };
        }
      }
      if (att.content) {
        return {
          filename: att.filename || att.originalname || 'resume.pdf',
          content: att.content,
          encoding: att.encoding || 'base64',
          contentType: att.mimetype || 'application/pdf'
        };
      }
      return null;
    })
    .filter(Boolean);

  const fromDisplayName = senderName || defaultName || senderEmail;
  const mailOptions = {
    from: `"${fromDisplayName}" <${senderEmail}>`,
    to: cleanRecipient,
    subject: subject,
    text: finalPlainText,
    html: finalHtml,
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
    to: cleanRecipient
  };
}
