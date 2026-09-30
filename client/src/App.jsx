import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Paperclip, 
  FileText, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  HelpCircle, 
  Sparkles, 
  Key, 
  Mail, 
  Users, 
  Check, 
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  FileSpreadsheet,
  Upload,
  Eye,
  ChevronLeft,
  ChevronRight,
  Download,
  Building2,
  RefreshCw,
  Shield
} from 'lucide-react';
import { api } from './utils/api';
import confetti from 'canvas-confetti';
import Papa from 'papaparse';

const DEFAULT_TEMPLATES = [
  {
    id: 't1',
    name: 'Standard Cold Job Outreach (Role & Company targeted)',
    subject: 'Application for Software Engineer &bull; {{name || "Hiring Team"}} at {{company || "your team"}}',
    body: `Dear {{name || "Hiring Team"}},

I hope you are doing well.

I am writing to express my interest in software engineering opportunities at {{company || "your company"}}. Having followed {{company}}'s recent work and technical vision, I am excited about the opportunity to bring my development skills and problem-solving background to your engineering team.

I have attached my updated resume for your review. I would welcome the opportunity to discuss how my skill set aligns with current or upcoming openings at {{company}}.

Thank you for your time and consideration!

Best regards,
{{sender_name || "Your Name"}}
{{sender_email || "your-email@gmail.com"}}`
  },
  {
    id: 't2',
    name: 'Data & Analytics Role Focused',
    subject: 'Data Analyst / Engineer Application &bull; {{company || "Company"}}',
    body: `Hi {{name || "there"}},

I hope this email finds you well.

I am reaching out regarding analytics and engineering roles at {{company || "your organization"}}. I have extensive experience building scalable pipelines, data models, and analytical dashboards that drive tangible business insights.

Please find my resume attached for your reference. I would love to connect for a quick 10-minute chat regarding how I can contribute to {{company}}'s data initiatives.

Warm regards,
{{sender_name || "Your Name"}}`
  },
  {
    id: 't3',
    name: 'Brief & Direct Recruiter Pitch',
    subject: 'Software Engineer &bull; Resume for {{company || "Hiring Team"}}',
    body: `Hello {{name || "Recruiter"}},

I am reaching out to explore potential software engineering opportunities with {{company || "your team"}}.

With a strong foundation in full-stack architecture, clean code practices, and rapid feature delivery, I am confident in my ability to make an immediate impact at {{company}}.

My resume is attached for your review. I would appreciate the chance to discuss any relevant openings.

Thank you,
{{sender_name || "Your Name"}}`
  }
];

export default function App() {
  // 1. Sender Credentials & Provider
  const [provider, setProvider] = useState(localStorage.getItem('pm_provider') || 'resend'); // 'resend' | 'gmail' | 'brevo'
  const [resendApiKey, setResendApiKey] = useState(localStorage.getItem('pm_resend_key') || '');
  const [brevoApiKey, setBrevoApiKey] = useState(localStorage.getItem('pm_brevo_key') || '');
  const [senderEmail, setSenderEmail] = useState(localStorage.getItem('pm_sender_email') || '');
  const [appPassword, setAppPassword] = useState(localStorage.getItem('pm_app_pwd') || '');
  const [senderName, setSenderName] = useState(localStorage.getItem('pm_sender_name') || '');
  const [showPasswordGuide, setShowPasswordGuide] = useState(false);

  // 2. HR Contact List / Sheet
  const [hrList, setHrList] = useState([
    { id: '1', name: 'Sarah Jenkins', email: 'sarah.recruiter@google.com', company: 'Google', role: 'Software Engineer' },
    { id: '2', name: 'David Wilson', email: 'david.talent@microsoft.com', company: 'Microsoft', role: 'Backend Engineer' },
    { id: '3', name: 'Elena Rostova', email: 'elena.hr@amazon.com', company: 'Amazon', role: 'Full Stack Developer' }
  ]);
  const [isUploadingSheet, setIsUploadingSheet] = useState(false);
  const [sheetFileName, setSheetFileName] = useState('');
  const [skipDuplicates, setSkipDuplicates] = useState(true);

  // 3. Email Template & Personalization
  const [selectedTemplateId, setSelectedTemplateId] = useState('t1');
  const [subject, setSubject] = useState(DEFAULT_TEMPLATES[0].subject);
  const [body, setBody] = useState(DEFAULT_TEMPLATES[0].body);

  // 4. Resume Attachment
  const [resumeFile, setResumeFile] = useState(null);
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const resumeInputRef = useRef(null);
  const sheetInputRef = useRef(null);

  // 5. Preview Modal / Slider State
  const [previewIndex, setPreviewIndex] = useState(0);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // 6. Sending Status & Audit Log
  const [isSending, setIsSending] = useState(false);
  const [results, setResults] = useState(null);
  const [progressText, setProgressText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [toastMsg, setToastMsg] = useState(null);

  // Sync sender info to localStorage
  const handleEmailChange = (v) => { setSenderEmail(v); localStorage.setItem('pm_sender_email', v); };
  const handlePwdChange = (v) => { setAppPassword(v); localStorage.setItem('pm_app_pwd', v); };
  const handleNameChange = (v) => { setSenderName(v); localStorage.setItem('pm_sender_name', v); };

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Switch template
  const handleSelectTemplate = (id) => {
    setSelectedTemplateId(id);
    const t = DEFAULT_TEMPLATES.find(x => x.id === id);
    if (t) {
      setSubject(t.subject);
      setBody(t.body);
      showToast(`Loaded "${t.name}"`);
    }
  };

  // Upload HR Excel / CSV sheet
  const handleSheetUpload = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    setIsUploadingSheet(true);
    setErrorMsg('');
    try {
      const res = await api.uploadRecipientsFile(file);
      if (res.recipients && res.recipients.length > 0) {
        setHrList(res.recipients);
        setSheetFileName(file.name);
        showToast(`Imported ${res.recipients.length} HR contacts from ${file.name}!`);
      } else {
        setErrorMsg('No valid email rows found in the uploaded file.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to parse HR contacts file.');
    } finally {
      setIsUploadingSheet(false);
    }
  };

  // Upload Resume PDF
  const handleResumeUpload = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      setErrorMsg('Resume file size exceeds 25MB limit.');
      return;
    }

    setIsUploadingResume(true);
    setErrorMsg('');
    try {
      const res = await api.uploadAttachment(file);
      setResumeFile(res);
      showToast(`Resume attached: ${file.name}`);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to upload resume file.');
    } finally {
      setIsUploadingResume(false);
    }
  };

  // Download sample HR spreadsheet
  const handleDownloadSampleSheet = () => {
    const sample = [
      { 'HR Name': 'Sarah Jenkins', 'HR Email': 'sarah@google.com', 'Company Name': 'Google', 'Role': 'Software Engineer' },
      { 'HR Name': 'David Wilson', 'HR Email': 'david@microsoft.com', 'Company Name': 'Microsoft', 'Role': 'Backend Developer' },
      { 'HR Name': 'Elena Rostova', 'HR Email': 'elena@amazon.com', 'Company Name': 'Amazon', 'Role': 'Full Stack Engineer' }
    ];
    const csv = Papa.unparse(sample);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_hr_contacts.csv';
    a.click();
    showToast('Downloaded sample HR spreadsheet!');
  };

  // Helper: Render preview for a given contact
  const renderPersonalized = (templateText, contact) => {
    if (!templateText) return '';
    return templateText
      .replace(/\{\{\s*company\s*(?:\|\||\|)\s*(?:"|'|)(.*?)(?:"|'|)\s*\}\}/gi, contact?.company || '$1')
      .replace(/\{\{\s*company\s*\}\}/gi, contact?.company || 'your company')
      .replace(/\{\{\s*name\s*(?:\|\||\|)\s*(?:"|'|)(.*?)(?:"|'|)\s*\}\}/gi, contact?.name || '$1')
      .replace(/\{\{\s*name\s*\}\}/gi, contact?.name || 'Hiring Team')
      .replace(/\{\{\s*role\s*\}\}/gi, contact?.role || 'Software Engineer')
      .replace(/\{\{\s*sender_name\s*(?:\|\||\|)\s*(?:"|'|)(.*?)(?:"|'|)\s*\}\}/gi, senderName || '$1')
      .replace(/\{\{\s*sender_name\s*\}\}/gi, senderName || 'Your Name')
      .replace(/\{\{\s*sender_email\s*(?:\|\||\|)\s*(?:"|'|)(.*?)(?:"|'|)\s*\}\}/gi, senderEmail || '$1')
      .replace(/\{\{\s*sender_email\s*\}\}/gi, senderEmail || 'your-email@gmail.com');
  };

  // Execute Dispatch
  const handleStartDispatch = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setResults(null);

    if (provider === 'gmail' && (!senderEmail.trim() || !appPassword.trim())) {
      setErrorMsg('Please enter your Gmail address and 16-character Google App Password.');
      return;
    }

    if (provider === 'resend' && !resendApiKey.trim()) {
      setErrorMsg('Please enter your Resend API Key (get one free at resend.com).');
      return;
    }

    if (provider === 'brevo' && !brevoApiKey.trim()) {
      setErrorMsg('Please enter your Brevo API Key (get one free at brevo.com).');
      return;
    }

    if (hrList.length === 0) {
      setErrorMsg('Please upload or provide HR contacts.');
      return;
    }

    if (!resumeFile) {
      if (!confirm('You have not attached a resume PDF. Do you want to continue sending without an attachment?')) {
        return;
      }
    }

    setIsSending(true);
    setProgressText(`Authenticating and dispatching personalized emails to ${hrList.length} HR contacts...`);

    try {
      const response = await fetch('/api/send/direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          apiKey: provider === 'resend' ? resendApiKey.trim() : (provider === 'brevo' ? brevoApiKey.trim() : ''),
          senderEmail: senderEmail.trim(),
          appPassword: appPassword.replace(/\s+/g, ''),
          senderName: senderName.trim(),
          recipients: hrList,
          subject: subject.trim(),
          body: body.trim().replace(/\n/g, '<br>'),
          attachments: resumeFile ? [resumeFile] : [],
          skipDuplicates: skipDuplicates
        })
      });

      let data;
      try {
        data = await response.json();
      } catch (e) {
        data = { error: 'Server returned an unparseable response' };
      }

      if (!response.ok) {
        throw new Error(data.error || 'Dispatch failed');
      }

      setResults(data);
      if (data.sent > 0) {
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
        showToast(`Campaign Complete! Sent: ${data.sent}, Skipped: ${data.skipped || 0}, Failed: ${data.failed || 0}`);
      } else {
        showToast(`Dispatch finished: ${data.sent || 0} sent, ${data.skipped || 0} skipped, ${data.failed || 0} failed.`);
        if (data.failed > 0) {
          const firstErr = data.results?.find(r => r.status === 'failed')?.error;
          setErrorMsg(`Failed: ${firstErr || 'Check results below'}`);
        } else if (data.skipped > 0 && data.sent === 0) {
          setErrorMsg('All contacts were skipped because duplicate protection is enabled and they were contacted in a previous session.');
        }
      }
    } catch (err) {
      setErrorMsg(err.message || 'Dispatch failed. Check your Gmail credentials.');
    } finally {
      setIsSending(false);
      setProgressText('');
    }
  };

  const currentPreviewContact = hrList[previewIndex] || {};

  return (
    <div style={{ minHeight: '100vh', background: '#0a0d14', color: '#f8fafc', padding: '28px 16px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: '880px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
            boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)',
            marginBottom: '12px'
          }}>
            <Send size={24} color="#fff" style={{ transform: 'rotate(-20deg)' }} />
          </div>
          <h1 style={{ fontSize: '1.9rem', fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
            HR Email & Resume Automation
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.92rem', margin: 0 }}>
            Upload your HR spreadsheet &bull; Auto-alters company and recruiter names &bull; Attaches your resume &bull; Dispatches safely
          </p>
        </div>

        {/* Toast Alert */}
        {toastMsg && (
          <div style={{
            background: '#10b981',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 16px rgba(16, 185, 129, 0.4)',
            animation: 'scaleUp 0.2s'
          }}>
            <CheckCircle2 size={18} />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Error Notification */}
        {errorMsg && (
          <div style={{
            background: 'rgba(244, 63, 94, 0.15)',
            border: '1px solid rgba(244, 63, 94, 0.4)',
            color: '#fb7185',
            padding: '14px 18px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '0.9rem',
            lineHeight: '1.5',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>{errorMsg}</div>
            </div>
            <button
              type="button"
              onClick={() => setErrorMsg('')}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fb7185',
                cursor: 'pointer',
                fontSize: '1.1rem',
                fontWeight: 700,
                padding: '0 4px',
                lineHeight: 1
              }}
              title="Dismiss"
            >
              ✕
            </button>
          </div>
        )}

        <form onSubmit={handleStartDispatch} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* STEP 1: Your Email Dispatch Provider */}
          <div style={{
            background: '#111622',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{
                  background: '#6366f1',
                  color: '#fff',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.8rem',
                  fontWeight: 700
                }}>1</span>
                <h3 style={{ margin: 0, fontSize: '1.05rem' }}>Select Dispatch Method & Sender Credentials</h3>
              </div>

              {/* Provider Selection Tabs */}
              <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.05)', padding: '3px', borderRadius: '8px', gap: '4px' }}>
                <button
                  type="button"
                  onClick={() => { setProvider('resend'); localStorage.setItem('pm_provider', 'resend'); }}
                  style={{
                    background: provider === 'resend' ? '#6366f1' : 'transparent',
                    color: provider === 'resend' ? '#fff' : '#94a3b8',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  ⚡ Resend API (Cloud / Free Tier)
                </button>
                <button
                  type="button"
                  onClick={() => { setProvider('gmail'); localStorage.setItem('pm_provider', 'gmail'); }}
                  style={{
                    background: provider === 'gmail' ? '#6366f1' : 'transparent',
                    color: provider === 'gmail' ? '#fff' : '#94a3b8',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  ✉️ Gmail App Password (Localhost)
                </button>
                <button
                  type="button"
                  onClick={() => { setProvider('brevo'); localStorage.setItem('pm_provider', 'brevo'); }}
                  style={{
                    background: provider === 'brevo' ? '#6366f1' : 'transparent',
                    color: provider === 'brevo' ? '#fff' : '#94a3b8',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  🚀 Brevo API
                </button>
              </div>
            </div>

            {/* Provider 1: RESEND (Cloud HTTPS) */}
            {provider === 'resend' && (
              <div>
                <div style={{
                  background: 'rgba(99, 102, 241, 0.08)',
                  border: '1px solid rgba(99, 102, 241, 0.25)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  marginBottom: '14px',
                  fontSize: '0.82rem',
                  color: '#cbd5e1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}>
                  <div>
                    <strong style={{ color: '#818cf8' }}>⚡ Cloud-Compatible (HTTPS):</strong> 3,000 free emails/month. Works on Render, Railway, and localhost with zero port blocks.
                  </div>
                  <a
                    href="https://resend.com/signup"
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      color: '#38bdf8',
                      textDecoration: 'none',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    Get Free Resend API Key <ExternalLink size={12} />
                  </a>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
                      Resend API Key (starts with <code>re_...</code>)
                    </label>
                    <input
                      type="password"
                      className="form-input"
                      placeholder="re_xxxxxxxxxxxxxxxx"
                      value={resendApiKey}
                      onChange={(e) => { setResendApiKey(e.target.value); localStorage.setItem('pm_resend_key', e.target.value); }}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
                      Your Contact / Reply-To Email
                    </label>
                    <input
                      type="email"
                      className="form-input"
                      placeholder="your.email@gmail.com"
                      value={senderEmail}
                      onChange={(e) => handleEmailChange(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
                      Your Full Name
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Neelesh Tripathi"
                      value={senderName}
                      onChange={(e) => handleNameChange(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Provider 2: GMAIL APP PASSWORD (SMTP) */}
            {provider === 'gmail' && (
              <div>
                <div style={{
                  background: 'rgba(234, 179, 8, 0.08)',
                  border: '1px solid rgba(234, 179, 8, 0.25)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  marginBottom: '14px',
                  fontSize: '0.82rem',
                  color: '#cbd5e1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}>
                  <div>
                    <strong style={{ color: '#facc15' }}>⚠️ Note for Cloud Hosts:</strong> Gmail SMTP (port 587) works on localhost, but free cloud hosts (Render/Railway trial) block raw SMTP sockets.
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPasswordGuide(!showPasswordGuide)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#38bdf8',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <HelpCircle size={13} />
                    <span>{showPasswordGuide ? 'Close Guide' : 'How to get App Password?'}</span>
                  </button>
                </div>

                {/* Guide Accordion */}
                {showPasswordGuide && (
                  <div style={{
                    background: 'rgba(99, 102, 241, 0.08)',
                    border: '1px solid rgba(99, 102, 241, 0.25)',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    marginBottom: '14px',
                    fontSize: '0.82rem',
                    lineHeight: '1.5',
                    color: '#cbd5e1'
                  }}>
                    <strong>How to generate 16-letter App Password in 30 seconds:</strong>
                    <ol style={{ paddingLeft: '18px', marginTop: '6px' }}>
                      <li>Go to <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" style={{ color: '#38bdf8', textDecoration: 'underline' }}>myaccount.google.com/apppasswords <ExternalLink size={11} style={{ display: 'inline' }} /></a></li>
                      <li>Ensure <strong>2-Step Verification</strong> is enabled.</li>
                      <li>Type name <code>HREmailBot</code> and click <strong>Create</strong>.</li>
                      <li>Paste the 16-character code below.</li>
                    </ol>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
                      Your Gmail Address
                    </label>
                    <input
                      type="email"
                      className="form-input"
                      placeholder="your.email@gmail.com"
                      value={senderEmail}
                      onChange={(e) => handleEmailChange(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
                      Google App Password
                    </label>
                    <input
                      type="password"
                      className="form-input"
                      placeholder="xxxx xxxx xxxx xxxx"
                      value={appPassword}
                      onChange={(e) => handlePwdChange(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
                      Your Full Name
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Neelesh Tripathi"
                      value={senderName}
                      onChange={(e) => handleNameChange(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Provider 3: BREVO (Cloud HTTPS) */}
            {provider === 'brevo' && (
              <div>
                <div style={{
                  background: 'rgba(99, 102, 241, 0.08)',
                  border: '1px solid rgba(99, 102, 241, 0.25)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  marginBottom: '14px',
                  fontSize: '0.82rem',
                  color: '#cbd5e1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}>
                  <div>
                    <strong style={{ color: '#818cf8' }}>🚀 Brevo HTTPS REST API:</strong> 300 free emails/day. Bypasses cloud port blocks over HTTPS.
                  </div>
                  <a
                    href="https://app.brevo.com/settings/keys/api"
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      color: '#38bdf8',
                      textDecoration: 'none',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    Get Brevo API Key <ExternalLink size={12} />
                  </a>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
                      Brevo API Key (starts with <code>xkeysib-...</code>)
                    </label>
                    <input
                      type="password"
                      className="form-input"
                      placeholder="xkeysib-xxxxxxxxxxxxxxxx"
                      value={brevoApiKey}
                      onChange={(e) => { setBrevoApiKey(e.target.value); localStorage.setItem('pm_brevo_key', e.target.value); }}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
                      Verified Brevo Sender Email
                    </label>
                    <input
                      type="email"
                      className="form-input"
                      placeholder="your.email@domain.com"
                      value={senderEmail}
                      onChange={(e) => handleEmailChange(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
                      Your Full Name
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Neelesh Tripathi"
                      value={senderName}
                      onChange={(e) => handleNameChange(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* STEP 2: HR Contacts Sheet Upload & Grid */}
          <div style={{
            background: '#111622',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{
                  background: '#6366f1',
                  color: '#fff',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.8rem',
                  fontWeight: 700
                }}>2</span>
                <h3 style={{ margin: 0, fontSize: '1.05rem' }}>HR Contacts List (.xlsx / .csv)</h3>
                <span className="badge badge-success" style={{ fontSize: '0.72rem' }}>
                  {hrList.length} Contacts
                </span>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={handleDownloadSampleSheet}
                  title="Download sample HR contacts format"
                >
                  <Download size={13} />
                  <span>Sample Excel/CSV</span>
                </button>
              </div>
            </div>

            {/* Upload Box */}
            <input
              type="file"
              ref={sheetInputRef}
              onChange={handleSheetUpload}
              accept=".xlsx,.xls,.csv"
              style={{ display: 'none' }}
            />

            <div
              onClick={() => sheetInputRef.current && sheetInputRef.current.click()}
              style={{
                border: '1.5px dashed rgba(99, 102, 241, 0.3)',
                borderRadius: '8px',
                padding: '16px',
                textAlign: 'center',
                cursor: 'pointer',
                background: '#0e131d',
                marginBottom: '14px',
                transition: 'all 0.2s'
              }}
            >
              {isUploadingSheet ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#94a3b8' }}>
                  <Loader2 size={16} className="pulse-animation" />
                  <span>Reading and mapping HR spreadsheet...</span>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', color: '#94a3b8', fontSize: '0.86rem' }}>
                  <FileSpreadsheet size={20} color="#818cf8" />
                  <span>{sheetFileName ? `Loaded: ${sheetFileName} (${hrList.length} contacts)` : 'Click or drop your HR Excel (.xlsx) or CSV file here'}</span>
                </div>
              )}
            </div>

            {/* Contacts Table */}
            {hrList.length > 0 && (
              <div style={{
                maxHeight: '160px',
                overflowY: 'auto',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '8px',
                background: '#0a0d14'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: '#94a3b8', textAlign: 'left', background: 'rgba(255,255,255,0.02)' }}>
                      <th style={{ padding: '8px 12px' }}>HR Name</th>
                      <th style={{ padding: '8px 12px' }}>Company</th>
                      <th style={{ padding: '8px 12px' }}>HR Email</th>
                      <th style={{ padding: '8px 12px' }}>Target Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hrList.map((c, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
                        <td style={{ padding: '7px 12px', fontWeight: 600 }}>{c.name || '—'}</td>
                        <td style={{ padding: '7px 12px', color: '#818cf8', fontWeight: 600 }}>{c.company || '—'}</td>
                        <td style={{ padding: '7px 12px', fontFamily: 'monospace', color: '#cbd5e1' }}>{c.email}</td>
                        <td style={{ padding: '7px 12px', color: '#94a3b8' }}>{c.role || 'Software Engineer'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Duplicate Protection Checkbox */}
            <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: '#94a3b8' }}>
              <input
                type="checkbox"
                id="skipDup"
                checked={skipDuplicates}
                onChange={(e) => setSkipDuplicates(e.target.checked)}
                style={{ accentColor: '#6366f1', cursor: 'pointer' }}
              />
              <label htmlFor="skipDup" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Shield size={14} color="#10b981" />
                <span><strong>Duplicate Protection:</strong> Automatically skip any HR contact already emailed in past campaigns</span>
              </label>
            </div>
          </div>

          {/* STEP 3: Resume PDF & Email Template */}
          <div style={{
            background: '#111622',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{
                  background: '#6366f1',
                  color: '#fff',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.8rem',
                  fontWeight: 700
                }}>3</span>
                <h3 style={{ margin: 0, fontSize: '1.05rem' }}>Resume Attachment & Email Template</h3>
              </div>

              {/* Template selection buttons */}
              <div style={{ display: 'flex', gap: '6px' }}>
                {DEFAULT_TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`btn btn-sm ${selectedTemplateId === t.id ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => handleSelectTemplate(t.id)}
                    style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                  >
                    {t.name.split(' ')[0]} {t.name.split(' ')[1]}
                  </button>
                ))}
              </div>
            </div>

            {/* Resume Upload Box */}
            <div style={{ marginBottom: '16px' }}>
              <input
                type="file"
                ref={resumeInputRef}
                onChange={handleResumeUpload}
                accept=".pdf,.doc,.docx"
                style={{ display: 'none' }}
              />

              {resumeFile ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  padding: '10px 16px',
                  borderRadius: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileText size={18} color="#10b981" />
                    <div>
                      <span style={{ fontWeight: 600, color: '#34d399', fontSize: '0.88rem' }}>
                        {resumeFile.originalname || resumeFile.filename}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginLeft: '8px' }}>
                        ({(resumeFile.size / 1024).toFixed(1)} KB) &bull; Attached to every HR email
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setResumeFile(null)}
                    style={{ background: 'transparent', border: 'none', color: '#f43f5e', cursor: 'pointer', padding: '4px' }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => resumeInputRef.current && resumeInputRef.current.click()}
                  style={{
                    border: '1.5px dashed rgba(255, 255, 255, 0.15)',
                    borderRadius: '8px',
                    padding: '14px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: '#0e131d'
                  }}
                >
                  {isUploadingResume ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#94a3b8' }}>
                      <Loader2 size={16} className="pulse-animation" />
                      <span>Uploading Resume PDF...</span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#f8fafc', fontSize: '0.86rem' }}>
                      <Paperclip size={18} color="#818cf8" />
                      <span><strong>Click to attach your Resume (PDF / Word)</strong></span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Dynamic Tags Notice */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '10px',
              fontSize: '0.78rem',
              color: '#94a3b8'
            }}>
              <span>Dynamic Tags: <code style={{ color: '#818cf8' }}>{`{{company}}`}</code> &bull; <code style={{ color: '#818cf8' }}>{`{{name}}`}</code> &bull; <code style={{ color: '#818cf8' }}>{`{{role}}`}</code></span>
              
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowPreviewModal(true)}
                style={{ fontSize: '0.75rem', padding: '3px 8px' }}
              >
                <Eye size={12} />
                <span>Live Per-Company Preview</span>
              </button>
            </div>

            {/* Subject Input */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
                Subject Line
              </label>
              <input
                type="text"
                className="form-input"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
            </div>

            {/* Body Input */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
                Email Body Message
              </label>
              <textarea
                className="form-textarea"
                rows={8}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                required
                style={{ fontSize: '0.88rem' }}
              />
            </div>
          </div>

          {/* STEP 4: Send Button */}
          <div>
            <button
              type="submit"
              disabled={isSending || hrList.length === 0}
              className="btn btn-primary btn-lg"
              style={{
                width: '100%',
                padding: '16px',
                fontSize: '1.05rem',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                boxShadow: '0 8px 25px rgba(99, 102, 241, 0.4)',
                cursor: isSending ? 'not-allowed' : 'pointer'
              }}
            >
              {isSending ? (
                <>
                  <Loader2 size={20} className="pulse-animation" />
                  <span>{progressText || 'Sending Emails...'}</span>
                </>
              ) : (
                <>
                  <Send size={20} />
                  <span>Send Resume to {hrList.length} HR Recruiter{hrList.length === 1 ? '' : 's'}</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Results & Audit Log Table */}
        {results && (
          <div style={{
            marginTop: '28px',
            background: '#111622',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={18} color="#10b981" />
                <span>Campaign Delivery Audit Log</span>
              </h3>

              <div style={{ display: 'flex', gap: '10px' }}>
                <span className="badge badge-success">Sent: {results.sent}</span>
                {results.skipped > 0 && <span className="badge badge-warning">Skipped Duplicates: {results.skipped}</span>}
                {results.failed > 0 && <span className="badge badge-danger">Failed: {results.failed}</span>}
              </div>
            </div>

            <div style={{ maxHeight: '220px', overflowY: 'auto', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: '#94a3b8', textAlign: 'left', background: 'rgba(255,255,255,0.02)' }}>
                    <th style={{ padding: '8px 12px' }}>Company</th>
                    <th style={{ padding: '8px 12px' }}>HR Contact</th>
                    <th style={{ padding: '8px 12px' }}>Email</th>
                    <th style={{ padding: '8px 12px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {results.results?.map((r, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
                      <td style={{ padding: '7px 12px', fontWeight: 600, color: '#818cf8' }}>{r.company || '—'}</td>
                      <td style={{ padding: '7px 12px' }}>{r.name || '—'}</td>
                      <td style={{ padding: '7px 12px', fontFamily: 'monospace', color: '#cbd5e1' }}>{r.email}</td>
                      <td style={{ padding: '7px 12px' }}>
                        {r.status === 'sent' && <span style={{ color: '#10b981', fontWeight: 600 }}>✔ Sent</span>}
                        {r.status === 'skipped' && <span style={{ color: '#fbbf24', fontWeight: 600 }}>⏭ Skipped (Duplicate)</span>}
                        {r.status === 'failed' && <span style={{ color: '#f43f5e', fontWeight: 600 }}>✗ {r.error}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Live Preview Modal */}
        {showPreviewModal && (
          <div className="modal-overlay" onClick={() => setShowPreviewModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '680px' }}>
              <div className="modal-header">
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Per-Company Dynamic Preview</h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>
                    See how your email dynamically changes for each company in your list
                  </p>
                </div>
                <button className="btn-close" onClick={() => setShowPreviewModal(false)}>✕</button>
              </div>

              <div className="modal-body">
                {/* Carousel Bar */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#0e131d',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  marginBottom: '16px'
                }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={previewIndex === 0}
                    onClick={() => setPreviewIndex(prev => prev - 1)}
                  >
                    <ChevronLeft size={14} />
                    <span>Prev Company</span>
                  </button>

                  <div style={{ textAlign: 'center' }}>
                    <strong style={{ color: '#818cf8', fontSize: '0.92rem' }}>
                      {currentPreviewContact.company || 'Company'} &bull; {currentPreviewContact.name || 'HR Recruiter'}
                    </strong>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      Contact #{previewIndex + 1} of {hrList.length} ({currentPreviewContact.email})
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={previewIndex === hrList.length - 1}
                    onClick={() => setPreviewIndex(prev => prev + 1)}
                  >
                    <span>Next Company</span>
                    <ChevronRight size={14} />
                  </button>
                </div>

                {/* Rendered Email Box */}
                <div style={{
                  background: '#ffffff',
                  color: '#1e293b',
                  borderRadius: '8px',
                  padding: '18px',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
                }}>
                  <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', marginBottom: '12px', fontSize: '0.84rem' }}>
                    <div style={{ color: '#64748b' }}><strong>To:</strong> {currentPreviewContact.email}</div>
                    <div style={{ color: '#1e293b', marginTop: '4px' }}>
                      <strong>Subject:</strong> {renderPersonalized(subject, currentPreviewContact)}
                    </div>
                  </div>

                  <div style={{ fontSize: '0.88rem', lineHeight: '1.6', whiteSpace: 'pre-line' }}>
                    {renderPersonalized(body, currentPreviewContact)}
                  </div>

                  {resumeFile && (
                    <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid #e2e8f0', fontSize: '0.78rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Paperclip size={13} color="#10b981" />
                      <span>Attachment: <strong>{resumeFile.originalname || resumeFile.filename}</strong></span>
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowPreviewModal(false)}>Close Preview</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
