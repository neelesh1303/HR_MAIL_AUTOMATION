import fs from 'fs';
import path from 'path';
import { config } from './config.js';

const DB_FILE = path.join(config.dataDir, 'store.json');

const defaultTemplates = [
  {
    id: 't1',
    name: 'Casual & Direct Outreach',
    subject: '{{role || "Software Engineer"}} inquiry - {{name}}',
    body: `Hi {{name || "there"}},

Hope you're having a good week.

I've been following the engineering work at {{company || "your team"}} and wanted to reach out directly. I'm a developer specializing in full-stack web applications, React, and Node.js.

Are there any current or upcoming openings on the engineering team for {{role || "software developers"}}?

I'd be glad to share my background and projects if you have a few minutes to chat.

Best,
{{sender_name || "Your Name"}}`
  },
  {
    id: 't2',
    name: 'Short & Conversational Inquiry',
    subject: 'Quick question from {{sender_name || "Neelesh"}}',
    body: `Hi {{name || "there"}},

I came across {{company || "your company"}} and really liked what the team is building.

I'm currently exploring new {{role || "Software Engineering"}} opportunities. I have hands-on experience building web apps and scalable backend services.

Would love to know if you're looking for developers to join the team.

Thanks!
{{sender_name || "Your Name"}}`
  },
  {
    id: 't3',
    name: 'Skill & Projects Focused',
    subject: '{{name}} - {{role || "Full Stack Developer"}}',
    body: `Hi {{name || "there"}},

Reaching out to see if {{company || "your team"}} has any open roles for {{role || "software developers"}}.

My core background is in modern JavaScript/TypeScript, React, and Node.js APIs. I've built several full-stack projects focusing on clean code and user performance.

Happy to send over a link to my projects and GitHub if you're interested.

Best regards,
{{sender_name || "Your Name"}}`
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
