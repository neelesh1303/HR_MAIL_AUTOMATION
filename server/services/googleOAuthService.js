import { google } from 'googleapis';
import { db } from '../db.js';
import { config } from '../config.js';

export function getOAuth2Client(customClientId, customClientSecret, customRedirectUri) {
  const auth = db.getAuth();
  const clientId = customClientId || auth.googleClientId || config.google.clientId;
  const clientSecret = customClientSecret || auth.googleClientSecret || config.google.clientSecret;
  const redirectUri = customRedirectUri || config.google.redirectUri;

  if (!clientId || !clientSecret) {
    return null;
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function generateAuthUrl(clientId, clientSecret) {
  const oauth2Client = getOAuth2Client(clientId, clientSecret);
  if (!oauth2Client) {
    throw new Error('Google OAuth Client ID and Client Secret are required.');
  }

  const scopes = [
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
  ];

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: scopes
  });
}

export async function exchangeCodeForTokens(code, clientId, clientSecret) {
  const oauth2Client = getOAuth2Client(clientId, clientSecret);
  if (!oauth2Client) {
    throw new Error('Google OAuth credentials not configured.');
  }

  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  // Get user profile info
  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
  const userInfo = await oauth2.userinfo.get();

  const userEmail = userInfo.data.email;
  const userName = userInfo.data.name || userEmail.split('@')[0];
  const userPicture = userInfo.data.picture || '';

  // Save auth in DB
  const updatedAuth = db.setAuth({
    type: 'oauth',
    email: userEmail,
    name: userName,
    avatar: userPicture,
    tokens: tokens,
    isConnected: true,
    lastChecked: new Date().toISOString()
  });

  return {
    email: userEmail,
    name: userName,
    avatar: userPicture,
    auth: updatedAuth
  };
}

export async function getAuthorizedGmailClient() {
  const auth = db.getAuth();
  if (auth.type !== 'oauth' || !auth.tokens) {
    throw new Error('Google OAuth is not connected.');
  }

  const oauth2Client = getOAuth2Client();
  if (!oauth2Client) {
    throw new Error('OAuth2 client configuration missing.');
  }

  oauth2Client.setCredentials(auth.tokens);

  // Listen for refresh tokens if rotated
  oauth2Client.on('tokens', (newTokens) => {
    const currentTokens = db.getAuth().tokens || {};
    db.setAuth({
      tokens: { ...currentTokens, ...newTokens }
    });
  });

  return { oauth2Client, userEmail: auth.email };
}
