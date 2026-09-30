import nodemailer from 'nodemailer';
import { google } from 'googleapis';
import { db } from '../db.js';
import { getOAuth2Client } from './googleOAuthService.js';
import path from 'path';
import fs from 'fs';

export async function createTransporter(explicitCredentials = null) {
  if (explicitCredentials && explicitCredentials.email && explicitCredentials.password) {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: explicitCredentials.email.trim(),
        pass: explicitCredentials.password.replace(/\s+/g, '')
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000
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
      port: auth.smtpPort || 465,
      secure: auth.smtpPort === 465,
      auth: {
        user: auth.smtpUser,
        pass: auth.smtpPassword.replace(/\s+/g, '') // remove spaces from Google app password
      }
    });

    return { transporter, senderEmail: auth.smtpUser, senderName: auth.name || auth.smtpUser.split('@')[0] };
  } else {
    throw new Error('Please provide your Gmail and 16-character Google App Password.');
  }
}

export async function testConnection(credentials = null) {
  try {
    const { transporter, senderEmail } = await createTransporter(credentials);
    await transporter.verify();
    if (!credentials) {
      db.setAuth({ isConnected: true, lastChecked: new Date().toISOString() });
    }
    return { success: true, email: senderEmail, message: 'Google connection verified successfully.' };
  } catch (error) {
    if (!credentials) {
      db.setAuth({ isConnected: false, lastChecked: new Date().toISOString() });
    }
    return { success: false, error: error.message || 'Connection test failed.' };
  }
}

export async function sendSingleEmail({ to, subject, htmlContent, textContent, attachments = [], senderName = '', replyTo = '', credentials = null }) {
  const { transporter, senderEmail, senderName: defaultName } = await createTransporter(credentials);

  const formattedAttachments = attachments.map(att => {
    if (att.path && fs.existsSync(att.path)) {
      return {
        filename: att.filename || att.originalname || path.basename(att.path),
        path: att.path,
        contentType: att.mimetype
      };
    } else if (att.content) {
      return {
        filename: att.filename || 'attachment',
        content: att.content,
        encoding: att.encoding || 'base64',
        contentType: att.mimetype
      };
    }
    return att;
  });

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
