import express from 'express';
import { db } from '../db.js';
import { config } from '../config.js';
import { generateAuthUrl, exchangeCodeForTokens } from '../services/googleOAuthService.js';
import { testConnection } from '../services/emailService.js';

const router = express.Router();

// Get current Google / SMTP Auth status
router.get('/status', (req, res) => {
  const auth = db.getAuth();
  res.json({
    isConnected: !!auth.isConnected,
    type: auth.type,
    email: auth.email || auth.smtpUser || '',
    name: auth.name || '',
    avatar: auth.avatar || '',
    hasOAuthTokens: !!(auth.tokens && auth.tokens.access_token),
    googleClientId: auth.googleClientId || config.google.clientId || '',
    hasClientSecret: !!(auth.googleClientSecret || config.google.clientSecret),
    lastChecked: auth.lastChecked
  });
});

// Save Google OAuth credentials (Client ID and Secret)
router.post('/google/config', (req, res) => {
  const { clientId, clientSecret } = req.body;
  if (!clientId || !clientSecret) {
    return res.status(400).json({ error: 'Client ID and Client Secret are required' });
  }

  db.setAuth({
    googleClientId: clientId.trim(),
    googleClientSecret: clientSecret.trim()
  });

  res.json({ success: true, message: 'Google OAuth configuration saved.' });
});

// Get Google OAuth consent URL
router.get('/google/url', (req, res) => {
  try {
    const auth = db.getAuth();
    const clientId = req.query.clientId || auth.googleClientId || config.google.clientId;
    const clientSecret = req.query.clientSecret || auth.googleClientSecret || config.google.clientSecret;

    if (!clientId || !clientSecret) {
      return res.status(400).json({
        error: 'Google Client ID and Client Secret are not configured yet. Please configure them in Google Settings.'
      });
    }

    const url = generateAuthUrl(clientId, clientSecret);
    res.json({ url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// OAuth Callback handler from Google
router.get('/google/callback', async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    return res.redirect(`${config.clientUrl}?auth_error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return res.redirect(`${config.clientUrl}?auth_error=No_code_provided`);
  }

  try {
    const auth = db.getAuth();
    const result = await exchangeCodeForTokens(
      code,
      auth.googleClientId || config.google.clientId,
      auth.googleClientSecret || config.google.clientSecret
    );

    res.redirect(`${config.clientUrl}?auth_success=true&email=${encodeURIComponent(result.email)}`);
  } catch (err) {
    console.error('OAuth Callback Error:', err);
    res.redirect(`${config.clientUrl}?auth_error=${encodeURIComponent(err.message)}`);
  }
});

// Connect with Google App Password (Instant & No GCP console required)
router.post('/app-password', async (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and 16-character App Password are required' });
  }

  // Clean app password (remove spaces)
  const cleanPassword = password.replace(/\s+/g, '');

  db.setAuth({
    type: 'app_password',
    email: email.trim(),
    smtpUser: email.trim(),
    smtpPassword: cleanPassword,
    name: name?.trim() || email.split('@')[0],
    isConnected: true,
    lastChecked: new Date().toISOString()
  });

  // Verify connection
  const testResult = await testConnection();

  if (testResult.success) {
    res.json({
      success: true,
      message: 'Connected to Google Account successfully via App Password!',
      email: email.trim()
    });
  } else {
    res.status(400).json({
      success: false,
      error: `Failed to authenticate with Gmail: ${testResult.error}. Please ensure 2-Step Verification is ON and you generated a 16-letter App Password in your Google Account.`
    });
  }
});

// Test connection endpoint
router.post('/test-connection', async (req, res) => {
  const result = await testConnection();
  if (result.success) {
    res.json(result);
  } else {
    res.status(400).json(result);
  }
});

// Disconnect Google / SMTP
router.post('/disconnect', (req, res) => {
  db.setAuth({
    type: null,
    email: '',
    name: '',
    avatar: '',
    tokens: null,
    smtpUser: '',
    smtpPassword: '',
    isConnected: false,
    lastChecked: new Date().toISOString()
  });

  res.json({ success: true, message: 'Google account disconnected.' });
});

export default router;
