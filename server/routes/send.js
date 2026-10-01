import express from 'express';
import { campaignQueue } from '../services/campaignQueue.js';
import { sendSingleEmail, testConnection, textToHtml } from '../services/emailService.js';
import { renderTemplate } from '../services/templateEngine.js';
import { db } from '../db.js';

const router = express.Router();

// SSE Stream for Real-time Progress & Logs
router.get('/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  campaignQueue.addSSEClient(res);

  req.on('close', () => {
    campaignQueue.removeSSEClient(res);
  });
});

// Get current dispatch status
router.get('/status', (req, res) => {
  res.json(campaignQueue.getStatus());
});

// Render dynamic preview for a recipient
router.post('/preview', (req, res) => {
  const { subject, body, recipient, senderName, senderEmail } = req.body;
  if (!subject && !body) {
    return res.status(400).json({ error: 'Subject and body are required' });
  }

  const globalVars = {
    sender_name: senderName || 'Your Name',
    sender_email: senderEmail || 'your-email@gmail.com'
  };

  const renderedSubject = renderTemplate(subject || '', recipient || {}, globalVars);
  const renderedBody = renderTemplate(body || '', recipient || {}, globalVars);

  res.json({
    renderedSubject,
    renderedBody
  });
});

// Send single test email
router.post('/test', async (req, res) => {
  const { testEmail, subject, body, attachments = [], senderName = '', senderEmail = '', sampleRecipient = {}, credentials } = req.body;

  if (!testEmail) {
    return res.status(400).json({ error: 'Test recipient email is required' });
  }

  try {
    const context = {
      ...sampleRecipient,
      email: testEmail,
      name: sampleRecipient.name || 'Sample Recipient',
      company: sampleRecipient.company || 'Sample Company',
      role: sampleRecipient.role || 'Software Engineer'
    };

    const globalVars = {
      sender_name: senderName || credentials?.name || 'Your Name',
      sender_email: senderEmail || credentials?.email || 'your-email@gmail.com'
    };

    const renderedSubject = renderTemplate(subject, context, globalVars);
    const renderedBody = renderTemplate(body, context, globalVars);

    const result = await sendSingleEmail({
      to: testEmail,
      subject: `[TEST] ${renderedSubject}`,
      htmlContent: renderedBody,
      attachments,
      senderName: senderName || credentials?.name,
      credentials
    });

    res.json({
      success: true,
      message: `Test email successfully dispatched to ${testEmail}!`,
      messageId: result.messageId
    });
  } catch (error) {
    console.error('Test email failed:', error);
    res.status(500).json({ error: error.message || 'Failed to send test email' });
  }
});

// Launch full background campaign
router.post('/campaign', async (req, res) => {
  const { name, subject, body, recipients, attachments = [], senderName = '', replyTo = '', delayMs, jitterMs, credentials } = req.body;

  if (!subject || !body) {
    return res.status(400).json({ error: 'Email subject and body are required' });
  }

  if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
    return res.status(400).json({ error: 'At least one recipient is required' });
  }

  try {
    const campaign = await campaignQueue.startCampaign({
      name,
      subjectTemplate: subject,
      bodyTemplate: body,
      recipients,
      attachments,
      senderName,
      replyTo,
      delayMs: delayMs || 2000,
      jitterMs: jitterMs || 1000,
      credentials
    });

    res.json({
      success: true,
      message: 'Campaign launched successfully!',
      campaignId: campaign.id,
      totalRecipients: recipients.length
    });
  } catch (error) {
    console.error('Campaign start failed:', error);
    res.status(500).json({ error: error.message || 'Failed to start campaign' });
  }
});

// Pause / Resume / Stop endpoints
router.post('/pause', (req, res) => {
  const paused = campaignQueue.pause();
  res.json({ success: paused, state: campaignQueue.state });
});

router.post('/resume', (req, res) => {
  const resumed = campaignQueue.resume();
  res.json({ success: resumed, state: campaignQueue.state });
});

router.post('/stop', (req, res) => {
  const stopped = campaignQueue.stop();
  res.json({ success: stopped, state: campaignQueue.state });
});

// Direct Simplified Dispatch Endpoint (With Per-Sender Duplicate Prevention & Detailed Audit Log)
router.post('/direct', async (req, res) => {
  try {
    const { 
      provider = 'gmail', // 'gmail' | 'resend' | 'brevo'
      apiKey,
      senderEmail, 
      appPassword, 
      senderName, 
      recipients, 
      subject, 
      body, 
      attachments = [],
      skipDuplicates = true
    } = req.body;

    if (provider === 'gmail' && (!senderEmail || !appPassword)) {
      return res.status(400).json({ error: 'Sender Gmail and Google App Password are required' });
    }

    if ((provider === 'resend' || provider === 'brevo') && !apiKey && !appPassword) {
      return res.status(400).json({ error: `Please enter your ${provider === 'resend' ? 'Resend' : 'Brevo'} API key` });
    }

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ error: 'Please provide at least one HR contact email address' });
    }

    if (!subject || !body) {
      return res.status(400).json({ error: 'Email subject and message body are required' });
    }

    const currentSenderEmail = (senderEmail || '').toLowerCase().trim();
    const credentials = {
      provider,
      apiKey: (apiKey || appPassword || '').trim(),
      email: currentSenderEmail,
      password: (appPassword || apiKey || '').replace(/\s+/g, ''),
      name: senderName || (currentSenderEmail ? currentSenderEmail.split('@')[0] : 'Applicant')
    };

    // Test credentials first
    const testConn = await testConnection(credentials);
    if (!testConn.success) {
      return res.status(400).json({ 
        error: `Authentication failed: ${testConn.error}` 
      });
    }

    // Load previously sent emails ONLY for THIS sender account
    const previousCampaigns = db.getCampaigns() || [];
    const previouslySentSet = new Set();
    
    previousCampaigns.forEach(c => {
      const campSender = (c.senderEmail || '').toLowerCase().trim();
      // Only deduct duplicates if this same sender account previously emailed them
      if (campSender && campSender === currentSenderEmail) {
        (c.recipients || []).forEach(r => {
          if (r.status === 'sent' && r.email) {
            previouslySentSet.add(r.email.toLowerCase().trim());
          }
        });
      }
    });

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

      // Check per-sender duplicate
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
        const dispatchResult = await sendSingleEmail({
          to: email,
          subject: renderedSubject,
          htmlContent: renderedBody,
          attachments,
          senderName: credentials.name,
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

      // Anti-spam jitter delay (1.5s - 2.5s)
      if (i < recipients.length - 1) {
        const delay = 1500 + Math.floor(Math.random() * 1000);
        await new Promise(r => setTimeout(r, delay));
      }
    }

    // Save this campaign attempt to persistent store / audit log
    db.saveCampaign({
      id: 'camp-' + Date.now(),
      name: `HR Campaign - ${new Date().toLocaleDateString()}`,
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
    console.error('Direct dispatch error:', error);
    res.status(500).json({ error: error.message || 'Direct dispatch failed' });
  }
});

export default router;
