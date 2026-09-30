/**
 * PostMaster Dynamic Template Personalization Engine
 * Handles interpolation of variables like {{name}}, {{first_name}}, {{company}}, etc.
 * Supports fallback default expressions: {{company || "your company"}} or {{name | "Friend"}}
 */

export function extractVariables(templateText) {
  if (!templateText) return [];
  const regex = /\{\{\s*([a-zA-Z0-9_\-]+)(?:\s*(?:\|\||\|)\s*(?:"|'|)(.*?)(?:"|'|))?\s*\}\}/g;
  const vars = new Set();
  let match;
  while ((match = regex.exec(templateText)) !== null) {
    if (match[1]) {
      vars.add(match[1].toLowerCase().trim());
    }
  }
  return Array.from(vars);
}

export function inferRecipientName(email, providedName) {
  if (providedName && providedName.trim().length > 0) {
    const full = providedName.trim();
    const parts = full.split(/\s+/);
    return {
      name: full,
      first_name: parts[0] || full,
      last_name: parts.slice(1).join(' ') || ''
    };
  }

  if (!email || !email.includes('@')) {
    return { name: 'Recipient', first_name: 'Recipient', last_name: '' };
  }

  // Extract from user part of email, e.g. john.doe@company.com -> John Doe
  const userPart = email.split('@')[0];
  const cleaned = userPart.replace(/[0-9_\-\.]+/g, ' ').trim();
  const words = cleaned.split(/\s+/).filter(w => w.length > 0);
  
  if (words.length === 0) {
    return { name: 'Valued Contact', first_name: 'there', last_name: '' };
  }

  const capitalized = words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  return {
    name: capitalized.join(' '),
    first_name: capitalized[0] || 'there',
    last_name: capitalized.slice(1).join(' ') || ''
  };
}

export function renderTemplate(templateString, recipientData = {}, globalVars = {}) {
  if (!templateString) return '';

  const email = (recipientData.email || recipientData.Email || '').trim();
  const inferred = inferRecipientName(email, recipientData.name || recipientData.Name || recipientData.full_name);

  // Merge recipient fields (case-insensitive lookup map)
  const context = {
    email: email,
    name: inferred.name,
    first_name: inferred.first_name,
    last_name: inferred.last_name,
    ...globalVars
  };

  // Add all raw recipient columns
  for (const [key, value] of Object.entries(recipientData)) {
    if (value !== undefined && value !== null) {
      context[key.toLowerCase().trim()] = String(value);
      // Also keep original key if needed
      context[key] = String(value);
    }
  }

  // Handle placeholders like {{first_name || "there"}} or {{company | "your team"}} or {{role}}
  return templateString.replace(/\{\{\s*([a-zA-Z0-9_\-]+)(?:\s*(?:\|\||\|)\s*(?:"|'|)(.*?)(?:"|'|))?\s*\}\}/g, (match, varName, fallback) => {
    const key = varName.toLowerCase().trim();
    let val = context[key] !== undefined ? context[key] : context[varName];

    if (val !== undefined && val !== null && String(val).trim() !== '') {
      return String(val);
    }

    if (fallback !== undefined && fallback !== null && fallback.trim() !== '') {
      return fallback.replace(/^["']|["']$/g, '');
    }

    return ''; // Replace with empty string if no fallback provided
  });
}
