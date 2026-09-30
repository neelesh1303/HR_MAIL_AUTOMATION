import fs from 'fs';
import path from 'path';
import { config } from './config.js';

const DB_FILE = path.join(config.dataDir, 'store.json');

const defaultTemplates = [
  {
    id: 'tpl-1',
    name: 'Professional Partnership / B2B Outreach',
    category: 'Sales & BD',
    subject: 'Partnership opportunity with {{company || "your team"}} & PostMaster',
    body: `<p>Hi {{first_name || "there"}},</p>
<p>I hope this email finds you well!</p>
<p>I have been following the incredible growth at <strong>{{company || "your organization"}}</strong> and wanted to reach out directly regarding our shared work in digital acceleration.</p>
<p>We recently helped similar teams streamline their workflows and increase client engagement by over <strong>35%</strong> within 30 days.</p>
<p>I've attached our brief overview document for your review. Would you be open to a 10-minute introductory call next Tuesday or Wednesday?</p>
<p>Best regards,<br><strong>{{sender_name || "Alex Morgan"}}</strong><br>PostMaster Studio</p>`,
    createdAt: new Date().toISOString()
  },
  {
    id: 'tpl-2',
    name: 'Job Application & Portfolio Follow-up',
    category: 'Career',
    subject: 'Application for {{role || "Open Role"}} &bull; {{first_name}} {{last_name}}',
    body: `<p>Dear {{name || "Hiring Team"}},</p>
<p>I am writing to express my strong interest in the <strong>{{role || "Software Specialist"}}</strong> position at <strong>{{company || "your esteemed company"}}</strong>.</p>
<p>With a proven track record of delivering high-impact projects and scalable architectures, I am excited about the prospect of contributing to your team's upcoming milestones.</p>
<p>Please find my updated resume and portfolio presentation attached. I would welcome the opportunity to discuss how my skill set aligns with your current priorities.</p>
<p>Thank you for your time and consideration.</p>
<p>Sincerely,<br><strong>{{sender_name || "Your Name"}}</strong></p>`,
    createdAt: new Date().toISOString()
  },
  {
    id: 'tpl-3',
    name: 'Exclusive Event & Product Launch Invitation',
    category: 'Marketing',
    subject: 'VIP Invitation: Exclusive Access for {{name || "You"}}',
    body: `<p>Hello {{first_name || "Valued Guest"}},</p>
<p>We are delighted to extend a special invitation to you for our exclusive upcoming launch event.</p>
<p>As a key leader in the industry, we want to provide you with early access to our newest capabilities before public release.</p>
<ul>
  <li><strong>Date:</strong> October 15th, 2026</li>
  <li><strong>Format:</strong> Live Interactive Stream & Private Q&A</li>
  <li><strong>Access Code:</strong> VIP-{{custom_code || "POSTMASTER"}}</li>
</ul>
<p>Please check the attached agenda document for complete session details and speaker line-up. Looking forward to hosting you!</p>
<p>Warmly,<br><strong>The Events Team</strong></p>`,
    createdAt: new Date().toISOString()
  },
  {
    id: 'tpl-4',
    name: 'Client Invoice & Documentation Dispatch',
    category: 'Finance',
    subject: 'Invoice #{{invoice_no || "2026-09"}} for {{company || "Services Rendered"}}',
    body: `<p>Hi {{first_name || "Client"}},</p>
<p>Thank you for your ongoing partnership with us. Attached please find invoice <strong>#{{invoice_no || "INV-001"}}</strong> for the recent milestones completed.</p>
<p><strong>Summary:</strong></p>
<ul>
  <li><strong>Service:</strong> {{service_name || "Digital Consulting & Delivery"}}</li>
  <li><strong>Total Due:</strong> {{amount || "$1,500.00"}}</li>
  <li><strong>Due Date:</strong> {{due_date || "Within 14 days"}}</li>
</ul>
<p>If you have any questions regarding the breakdown or payment options, please feel free to reply directly to this email.</p>
<p>Kind regards,<br><strong>Accounts & Finance Team</strong></p>`,
    createdAt: new Date().toISOString()
  }
];

const defaultData = {
  auth: {
    type: null, // 'oauth' | 'app_password' | null
    email: '',
    name: '',
    avatar: '',
    googleClientId: '',
    googleClientSecret: '',
    tokens: null, // { access_token, refresh_token, expiry_date, token_type }
    smtpUser: '',
    smtpPassword: '',
    smtpHost: 'smtp.gmail.com',
    smtpPort: 465,
    smtpSecure: true,
    isConnected: false,
    lastChecked: null
  },
  settings: {
    defaultSenderName: '',
    defaultReplyTo: '',
    sendDelayMs: 2000,
    randomDelayJitterMs: 1000,
    batchSize: 50,
    maxRetries: 2,
    enableTrackingPixel: false
  },
  templates: defaultTemplates,
  campaigns: []
};

// Simple Thread-safe File Store
class Database {
  constructor() {
    this.data = this.load();
  }

  load() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        return {
          ...defaultData,
          ...parsed,
          auth: { ...defaultData.auth, ...(parsed.auth || {}) },
          settings: { ...defaultData.settings, ...(parsed.settings || {}) },
          templates: parsed.templates && parsed.templates.length > 0 ? parsed.templates : defaultTemplates,
          campaigns: parsed.campaigns || []
        };
      }
    } catch (err) {
      console.error('Error loading DB file, initializing default:', err);
    }
    this.save(defaultData);
    return JSON.parse(JSON.stringify(defaultData));
  }

  save(dataToSave = this.data) {
    try {
      this.data = dataToSave;
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (err) {
      console.error('Failed to save DB file:', err);
    }
  }

  getAuth() {
    return this.data.auth;
  }

  setAuth(authUpdate) {
    this.data.auth = { ...this.data.auth, ...authUpdate };
    this.save();
    return this.data.auth;
  }

  getSettings() {
    return this.data.settings;
  }

  setSettings(settingsUpdate) {
    this.data.settings = { ...this.data.settings, ...settingsUpdate };
    this.save();
    return this.data.settings;
  }

  getTemplates() {
    return this.data.templates;
  }

  getTemplateById(id) {
    return this.data.templates.find(t => t.id === id);
  }

  saveTemplate(template) {
    if (template.id) {
      const idx = this.data.templates.findIndex(t => t.id === template.id);
      if (idx >= 0) {
        this.data.templates[idx] = { ...this.data.templates[idx], ...template, updatedAt: new Date().toISOString() };
      } else {
        this.data.templates.push(template);
      }
    } else {
      template.id = 'tpl-' + Date.now();
      template.createdAt = new Date().toISOString();
      this.data.templates.push(template);
    }
    this.save();
    return template;
  }

  deleteTemplate(id) {
    this.data.templates = this.data.templates.filter(t => t.id !== id);
    this.save();
  }

  getCampaigns() {
    return this.data.campaigns.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  getCampaignById(id) {
    return this.data.campaigns.find(c => c.id === id);
  }

  saveCampaign(campaign) {
    const idx = this.data.campaigns.findIndex(c => c.id === campaign.id);
    if (idx >= 0) {
      this.data.campaigns[idx] = campaign;
    } else {
      this.data.campaigns.push(campaign);
    }
    this.save();
    return campaign;
  }

  deleteCampaign(id) {
    this.data.campaigns = this.data.campaigns.filter(c => c.id !== id);
    this.save();
  }
}

export const db = new Database();
