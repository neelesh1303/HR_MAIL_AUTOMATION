import { sendSingleEmail } from './emailService.js';
import { renderTemplate } from './templateEngine.js';
import { db } from '../db.js';
import { v4 as uuidv4 } from 'uuid';

class CampaignQueueManager {
  constructor() {
    this.activeCampaign = null;
    this.state = 'idle'; // 'idle' | 'running' | 'paused' | 'stopped' | 'completed'
    this.sseClients = new Set();
    this.abortController = null;
    this.queue = [];
    this.currentIndex = 0;
    this.stats = {
      total: 0,
      sent: 0,
      failed: 0,
      pending: 0,
      progressPercent: 0
    };
    this.logs = [];
  }

  addSSEClient(res) {
    this.sseClients.add(res);
    // Send immediate initial state
    this.sendToClient(res, 'init', {
      state: this.state,
      campaign: this.activeCampaign,
      stats: this.stats,
      logs: this.logs.slice(-50)
    });
  }

  removeSSEClient(res) {
    this.sseClients.delete(res);
  }

  sendToClient(res, event, data) {
    try {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    } catch (e) {
      this.sseClients.delete(res);
    }
  }

  broadcast(event, data) {
    for (const client of this.sseClients) {
      this.sendToClient(client, event, data);
    }
  }

  addLog(type, message, details = null) {
    const logItem = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      type, // 'info' | 'success' | 'warning' | 'error'
      message,
      details
    };
    this.logs.push(logItem);
    this.broadcast('log', logItem);
    return logItem;
  }

  getStatus() {
    return {
      state: this.state,
      campaign: this.activeCampaign ? {
        id: this.activeCampaign.id,
        name: this.activeCampaign.name,
        subject: this.activeCampaign.subject,
        createdAt: this.activeCampaign.createdAt
      } : null,
      stats: this.stats,
      logs: this.logs.slice(-50),
      currentIndex: this.currentIndex
    };
  }

  async startCampaign({ name, subjectTemplate, bodyTemplate, recipients, attachments = [], senderName = '', replyTo = '', delayMs = 2000, jitterMs = 1000 }) {
    if (this.state === 'running') {
      throw new Error('Another campaign is currently running.');
    }

    const campaignId = 'camp-' + Date.now();
    const campaign = {
      id: campaignId,
      name: name || `Campaign ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
      subject: subjectTemplate,
      body: bodyTemplate,
      senderName,
      replyTo,
      delayMs,
      jitterMs,
      attachments: attachments.map(a => ({ filename: a.originalname || a.filename, size: a.size, mimetype: a.mimetype, path: a.path })),
      recipients: recipients.map((r, i) => ({
        id: r.id || `rec-${i}-${Date.now()}`,
        email: (r.email || r.Email || '').trim(),
        name: r.name || r.Name || '',
        data: r,
        status: 'pending', // 'pending' | 'sent' | 'failed'
        sentAt: null,
        error: null,
        messageId: null
      })),
      stats: {
        total: recipients.length,
        sent: 0,
        failed: 0,
        pending: recipients.length
      },
      createdAt: new Date().toISOString(),
      completedAt: null,
      status: 'running'
    };

    this.activeCampaign = campaign;
    this.queue = campaign.recipients;
    this.currentIndex = 0;
    this.state = 'running';
    this.stats = {
      total: campaign.recipients.length,
      sent: 0,
      failed: 0,
      pending: campaign.recipients.length,
      progressPercent: 0
    };
    this.logs = [];

    db.saveCampaign(campaign);

    this.addLog('info', `🚀 Campaign "${campaign.name}" initialized with ${campaign.recipients.length} recipients.`);
    this.broadcast('campaign_start', { campaign, stats: this.stats });

    // Run in background without blocking response
    this.processQueue(attachments, senderName, replyTo, delayMs, jitterMs);

    return campaign;
  }

  async processQueue(attachments, senderName, replyTo, delayMs, jitterMs) {
    while (this.currentIndex < this.queue.length) {
      if (this.state === 'stopped') {
        this.addLog('warning', '⏹ Campaign dispatch was stopped by user.');
        break;
      }

      if (this.state === 'paused') {
        this.addLog('info', '⏸ Campaign dispatch paused. Waiting to resume...');
        await new Promise(resolve => {
          this.resumeCallback = resolve;
        });
        if (this.state === 'stopped') break;
        this.addLog('info', '▶ Campaign dispatch resumed.');
      }

      const item = this.queue[this.currentIndex];
      const recipientNumber = this.currentIndex + 1;
      const totalRecipients = this.queue.length;

      try {
        // Compile personalized subject and body
        const renderedSubject = renderTemplate(this.activeCampaign.subject, item.data);
        const renderedBody = renderTemplate(this.activeCampaign.body, item.data);

        this.addLog('info', `📨 Sending #${recipientNumber}/${totalRecipients} to ${item.email}...`);

        const result = await sendSingleEmail({
          to: item.email,
          subject: renderedSubject,
          htmlContent: renderedBody,
          attachments,
          senderName,
          replyTo
        });

        item.status = 'sent';
        item.sentAt = new Date().toISOString();
        item.messageId = result.messageId;
        this.stats.sent++;
        this.stats.pending--;

        this.addLog('success', `✓ Successfully delivered to ${item.email} (ID: ${result.messageId || 'OK'})`);
      } catch (err) {
        item.status = 'failed';
        item.error = err.message || 'Send error';
        this.stats.failed++;
        this.stats.pending--;

        this.addLog('error', `✗ Failed sending to ${item.email}: ${item.error}`);
      }

      this.stats.progressPercent = Math.round(((this.stats.sent + this.stats.failed) / this.stats.total) * 100);

      this.broadcast('progress', {
        stats: this.stats,
        currentIndex: this.currentIndex,
        recipient: item
      });

      this.currentIndex++;

      // Update in db periodically
      if (this.currentIndex % 5 === 0 || this.currentIndex === this.queue.length) {
        this.activeCampaign.recipients = this.queue;
        this.activeCampaign.stats = this.stats;
        db.saveCampaign(this.activeCampaign);
      }

      // If there are more items, delay with jitter
      if (this.currentIndex < this.queue.length && this.state === 'running') {
        const baseDelay = parseInt(delayMs, 10) || 2000;
        const jitter = Math.floor(Math.random() * (parseInt(jitterMs, 10) || 1000));
        const totalDelay = baseDelay + jitter;
        await new Promise(r => setTimeout(r, totalDelay));
      }
    }

    // Finished or terminated
    if (this.state === 'stopped') {
      this.activeCampaign.status = 'stopped';
    } else {
      this.state = 'completed';
      this.activeCampaign.status = 'completed';
      this.addLog('success', `🎉 Campaign completed! ${this.stats.sent} sent, ${this.stats.failed} failed out of ${this.stats.total}.`);
    }

    this.activeCampaign.completedAt = new Date().toISOString();
    this.activeCampaign.recipients = this.queue;
    this.activeCampaign.stats = this.stats;
    db.saveCampaign(this.activeCampaign);

    this.broadcast('campaign_finished', {
      campaign: this.activeCampaign,
      stats: this.stats
    });
  }

  pause() {
    if (this.state === 'running') {
      this.state = 'paused';
      this.broadcast('state_change', { state: 'paused' });
      return true;
    }
    return false;
  }

  resume() {
    if (this.state === 'paused') {
      this.state = 'running';
      if (this.resumeCallback) {
        this.resumeCallback();
        this.resumeCallback = null;
      }
      this.broadcast('state_change', { state: 'running' });
      return true;
    }
    return false;
  }

  stop() {
    if (this.state === 'running' || this.state === 'paused') {
      this.state = 'stopped';
      if (this.resumeCallback) {
        this.resumeCallback();
        this.resumeCallback = null;
      }
      this.broadcast('state_change', { state: 'stopped' });
      return true;
    }
    return false;
  }
}

export const campaignQueue = new CampaignQueueManager();
