import fs from 'fs';
import path from 'path';
import { config } from './config.js';

const DB_FILE = path.join(config.dataDir, 'store.json');

const defaultTemplates = [
  {
    id: 't1',
    name: 'Standard Cold Job Outreach (Role & Company targeted)',
    subject: 'Application for {{role || "Software Engineer"}} • {{name || "Hiring Team"}} at {{company || "your team"}}',
    body: `Dear {{name || "Hiring Team"}},

I hope you are doing well.

I am writing to express my strong interest in {{role || "Software Engineer"}} opportunities at {{company || "your company"}}. Having followed {{company}}'s recent work and technical vision, I am excited about the opportunity to bring my development skills, clean coding practices, and problem-solving background to your team.

I have attached my updated resume for your review. I would welcome the opportunity to connect for a brief 10-minute chat regarding upcoming openings at {{company}}.

Thank you for your time and consideration!

Best regards,
{{sender_name || "Your Name"}}
{{sender_email || "your-email@gmail.com"}}`
  },
  {
    id: 't2',
    name: 'Data & Analytics Role Focused',
    subject: 'Data Analyst / Engineer Application • {{company || "Company"}}',
    body: `Hi {{name || "there"}},

I hope this email finds you well.

I am reaching out regarding analytics and engineering roles at {{company || "your organization"}}. I have extensive experience building scalable data pipelines, data models, and analytical dashboards that drive tangible business impact.

Please find my resume attached for your reference. I would love to connect for a quick 10-minute conversation regarding how I can contribute to {{company}}'s data initiatives.

Warm regards,
{{sender_name || "Your Name"}}
{{sender_email || "your-email@gmail.com"}}`
  },
  {
    id: 't3',
    name: 'Brief & Direct Recruiter Pitch',
    subject: 'Software Engineer • Resume for {{company || "Hiring Team"}}',
    body: `Hello {{name || "Recruiter"}},

I am reaching out to explore potential software engineering opportunities with {{company || "your team"}}.

With a strong foundation in full-stack architecture, clean code practices, and rapid feature delivery, I am confident in my ability to make an immediate impact at {{company}}.

My resume is attached for your review. I would appreciate the chance to discuss any relevant openings.

Thank you,
{{sender_name || "Your Name"}}
{{sender_email || "your-email@gmail.com"}}`
  }
];

class SimpleDB {
  constructor() {
    this.data = {
      campaigns: [],
      templates: defaultTemplates
    };
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        this.data.campaigns = parsed.campaigns || [];
        this.data.templates = parsed.templates?.length ? parsed.templates : defaultTemplates;
      } else {
        this.save();
      }
    } catch (e) {
      console.warn('DB load error, initializing default:', e.message);
      this.save();
    }
  }

  save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (e) {
      console.error('DB save error:', e.message);
    }
  }

  getCampaigns() {
    return this.data.campaigns || [];
  }

  saveCampaign(campaign) {
    this.data.campaigns = this.data.campaigns || [];
    const idx = this.data.campaigns.findIndex(c => c.id === campaign.id);
    if (idx >= 0) {
      this.data.campaigns[idx] = campaign;
    } else {
      this.data.campaigns.unshift(campaign);
    }
    // Limit to latest 50 campaigns
    if (this.data.campaigns.length > 50) {
      this.data.campaigns = this.data.campaigns.slice(0, 50);
    }
    this.save();
    return campaign;
  }

  deleteCampaign(id) {
    this.data.campaigns = (this.data.campaigns || []).filter(c => c.id !== id);
    this.save();
  }

  getTemplates() {
    return this.data.templates || defaultTemplates;
  }
}

export const db = new SimpleDB();
