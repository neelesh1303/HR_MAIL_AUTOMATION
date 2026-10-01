/**
 * Dynamic Template Engine for Cold Email Personalization
 */

export function inferRecipientName(email, providedName) {
  if (providedName && String(providedName).trim().length > 0) {
    const full = String(providedName).trim();
    const parts = full.split(/\s+/);
    return {
      name: full,
      first_name: parts[0] || full,
      last_name: parts.slice(1).join(' ') || ''
    };
  }

  if (!email || !email.includes('@')) {
    return { name: 'Hiring Team', first_name: 'there', last_name: '' };
  }

  const userPart = email.split('@')[0];
  const cleaned = userPart.replace(/[0-9_\-\.]+/g, ' ').trim();
  const words = cleaned.split(/\s+/).filter(w => w.length > 0);

  if (words.length === 0) {
    return { name: 'Hiring Team', first_name: 'there', last_name: '' };
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
  const inferred = inferRecipientName(email, recipientData.name || recipientData.Name || recipientData.hr_name);

  // Build key-value context map
  const context = {
    email,
    name: inferred.name,
    first_name: inferred.first_name,
    last_name: inferred.last_name,
    company: recipientData.company || recipientData.Company || recipientData.company_name || '',
    role: recipientData.role || recipientData.Role || recipientData.job_title || 'Software Engineer',
    ...globalVars
  };

  // Add any extra custom fields from the spreadsheet
  for (const [key, value] of Object.entries(recipientData)) {
    if (value !== undefined && value !== null) {
      context[key.toLowerCase().trim()] = String(value);
      context[key] = String(value);
    }
  }

  // Interpolate {{key || "fallback"}} or {{key | "fallback"}} or {{key}}
  let rendered = templateString.replace(/\{\{\s*([a-zA-Z0-9_\-]+)(?:\s*(?:\|\||\|)\s*(?:"|'|)(.*?)(?:"|'|))?\s*\}\}/g, (match, varName, fallback) => {
    const key = varName.toLowerCase().trim();
    let val = context[key] !== undefined ? context[key] : context[varName];

    if (val !== undefined && val !== null && String(val).trim() !== '') {
      return String(val);
    }

    if (fallback !== undefined && fallback !== null && fallback.trim() !== '') {
      return fallback.replace(/^["']|["']$/g, '');
    }

    return '';
  });

  // Clean any raw HTML bullet entities in subject/text
  rendered = rendered.replace(/&bull;/gi, '•').replace(/&amp;/gi, '&');

  return rendered;
}

export function textToHtml(text) {
  if (!text) return '';
  // Convert newlines to standard Gmail-style HTML breaks
  const htmlFormatted = text.replace(/\n/g, '<br>');
  return `<div dir="ltr" style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.5; color: #222222;">${htmlFormatted}</div>`;
}

export function htmlToText(html) {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .trim();
}
