import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  Trash2, 
  Plus, 
  Download, 
  Eye, 
  RefreshCw, 
  Sparkles, 
  ShieldCheck, 
  KeyRound, 
  HelpCircle,
  X,
  Clock,
  History,
  Mail
} from 'lucide-react';
import confetti from 'canvas-confetti';
import * as xlsx from 'xlsx';

const DEFAULT_TEMPLATES = [
  {
    id: 't1',
    name: 'Standard Cold Job Outreach',
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

export default function App() {
  // 1. Sender Credentials
  const [provider, setProvider] = useState(localStorage.getItem('pm_provider') || 'gmail');
  const [senderEmail, setSenderEmail] = useState(localStorage.getItem('pm_email') || '');
  const [appPassword, setAppPassword] = useState(localStorage.getItem('pm_pass') || '');
  const [brevoApiKey, setBrevoApiKey] = useState(localStorage.getItem('pm_brevo_key') || '');
  const [senderName, setSenderName] = useState(localStorage.getItem('pm_name') || '');
  const [showPasswordGuide, setShowPasswordGuide] = useState(false);
  
  // Verification State
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState(null); // { success: boolean, message: string }

  // 2. HR Contact List
  const [hrList, setHrList] = useState([
    { id: '1', name: 'Sarah Jenkins', email: 'sarah.recruiter@google.com', company: 'Google', role: 'Software Engineer' },
    { id: '2', name: 'David Wilson', email: 'david.talent@microsoft.com', company: 'Microsoft', role: 'Backend Engineer' },
    { id: '3', name: 'Elena Rostova', email: 'elena.hr@amazon.com', company: 'Amazon', role: 'Full Stack Developer' }
  ]);
  const [isUploadingSheet, setIsUploadingSheet] = useState(false);
  const [sheetFileName, setSheetFileName] = useState('');
  const [skipDuplicates, setSkipDuplicates] = useState(false);

  // Manual Contact Input Form
  const [newContact, setNewContact] = useState({ name: '', email: '', company: '', role: '' });
  const [showAddContact, setShowAddContact] = useState(false);

  // 3. Email Template & Resume
  const [selectedTemplateId, setSelectedTemplateId] = useState('t1');
  const [subject, setSubject] = useState(DEFAULT_TEMPLATES[0].subject);
  const [body, setBody] = useState(DEFAULT_TEMPLATES[0].body);
  const [resumeFile, setResumeFile] = useState(null);
  const [isUploadingResume, setIsUploadingResume] = useState(false);

  // 4. Live Preview Modal
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);

  // 5. History Modal
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyCampaigns, setHistoryCampaigns] = useState([]);

  // 6. Sending & Results State
  const [isSending, setIsSending] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [results, setResults] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  const resumeInputRef = useRef(null);
  const sheetInputRef = useRef(null);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  const handleEmailChange = (val) => {
    setSenderEmail(val);
    localStorage.setItem('pm_email', val);
  };

  const handlePasswordChange = (val) => {
    setAppPassword(val);
    localStorage.setItem('pm_pass', val);
  };

  const handleNameChange = (val) => {
    setSenderName(val);
    localStorage.setItem('pm_name', val);
  };

  // Test credentials connection
  const handleTestCredentials = async () => {
    setIsVerifying(true);
    setVerifyStatus(null);
    setErrorMsg('');

    try {
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          email: senderEmail.trim(),
          appPassword: appPassword.replace(/\s+/g, ''),
          apiKey: provider === 'brevo' ? brevoApiKey.trim() : '',
          senderName: senderName.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');

      setVerifyStatus({ success: true, message: data.message || 'Credentials verified successfully!' });
      showToast('Credentials verified successfully!');
    } catch (err) {
      setVerifyStatus({ success: false, message: err.message });
      setErrorMsg(`Verification failed: ${err.message}`);
    } finally {
      setIsVerifying(false);
    }
  };

  // Handle Sheet Upload (.xlsx, .xls, .csv)
  const handleSheetUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingSheet(true);
    setErrorMsg('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/parse-sheet', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to parse file');

      if (data.recipients && data.recipients.length > 0) {
        setHrList(data.recipients);
        setSheetFileName(file.name);
        showToast(`Loaded ${data.recipients.length} HR contacts from ${file.name}!`);
      } else {
        throw new Error('No valid email addresses found in the uploaded file.');
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsUploadingSheet(false);
      if (sheetInputRef.current) sheetInputRef.current.value = '';
    }
  };

  // Handle Resume Upload
  const handleResumeUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingResume(true);
    setErrorMsg('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload-resume', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      setResumeFile(data);
      showToast(`Resume attached: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
    } catch (err) {
      setErrorMsg(`Resume upload failed: ${err.message}`);
    } finally {
      setIsUploadingResume(false);
      if (resumeInputRef.current) resumeInputRef.current.value = '';
    }
  };

  // Download Sample Spreadsheet
  const handleDownloadSample = () => {
    const sampleData = [
      { 'HR Name': 'Sundar Pichai', 'Company': 'Google', 'HR Email': 'recruiter@google.com', 'Target Role': 'Software Engineer' },
      { 'HR Name': 'Satya Nadella', 'Company': 'Microsoft', 'HR Email': 'talent@microsoft.com', 'Target Role': 'Frontend Engineer' },
      { 'HR Name': 'Andy Jassy', 'Company': 'Amazon', 'HR Email': 'hiring@amazon.com', 'Target Role': 'Full Stack Developer' },
      { 'HR Name': 'Tim Cook', 'Company': 'Apple', 'HR Email': 'jobs@apple.com', 'Target Role': 'Backend Developer' }
    ];
    const ws = xlsx.utils.json_to_sheet(sampleData);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'HR_Contacts');
    xlsx.writeFile(wb, 'sample_hr_contacts.xlsx');
  };

  // Add Manual Contact
  const handleAddManualContact = (e) => {
    e.preventDefault();
    if (!newContact.email || !newContact.email.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    setHrList([
      ...hrList,
      {
        id: `manual-${Date.now()}`,
        name: newContact.name.trim() || 'Hiring Manager',
        email: newContact.email.trim(),
        company: newContact.company.trim() || 'Company',
        role: newContact.role.trim() || 'Software Engineer'
      }
    ]);

    setNewContact({ name: '', email: '', company: '', role: '' });
    setShowAddContact(false);
    showToast('Contact added!');
  };

  // Remove single contact
  const handleRemoveContact = (id) => {
    setHrList(hrList.filter(c => c.id !== id));
  };

  // Select Built-in Template
  const handleSelectTemplate = (tpl) => {
    setSelectedTemplateId(tpl.id);
    setSubject(tpl.subject);
    setBody(tpl.body);
  };

  // Fetch History
  const handleOpenHistory = async () => {
    setShowHistoryModal(true);
    try {
      const res = await fetch('/api/campaigns');
      const data = await res.json();
      setHistoryCampaigns(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  // Delete History Item
  const handleDeleteHistory = async (id) => {
    try {
      await fetch(`/api/campaigns/${id}`, { method: 'DELETE' });
      setHistoryCampaigns(historyCampaigns.filter(c => c.id !== id));
      showToast('Campaign record removed.');
    } catch (e) {
      console.error(e);
    }
  };

  // Dispatch Campaign
  const handleStartDispatch = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setResults(null);

    if (provider === 'gmail' && (!senderEmail.trim() || !appPassword.trim())) {
      setErrorMsg('Please enter your Gmail and 16-character Google App Password.');
      return;
    }

    if (provider === 'brevo' && !brevoApiKey.trim()) {
      setErrorMsg('Please enter your Brevo API Key.');
      return;
    }

    if (hrList.length === 0) {
      setErrorMsg('Please provide at least one HR contact email address.');
      return;
    }

    if (!resumeFile) {
      if (!confirm('You have not attached a resume PDF. Do you wish to continue sending without an attachment?')) {
        return;
      }
    }

    setIsSending(true);
    setProgressMsg(`Authenticating and dispatching personalized emails to ${hrList.length} contacts...`);

    try {
      const response = await fetch('/api/send-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          senderEmail: senderEmail.trim(),
          appPassword: appPassword.replace(/\s+/g, ''),
          apiKey: provider === 'brevo' ? brevoApiKey.trim() : '',
          senderName: senderName.trim(),
          recipients: hrList,
          subject: subject.trim(),
          body: body.trim(),
          attachments: resumeFile ? [resumeFile] : [],
          skipDuplicates: skipDuplicates
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Dispatch failed');
      }

      setResults(data);

      if (data.sent > 0) {
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
        showToast(`🎉 Campaign Complete! Sent: ${data.sent}, Skipped: ${data.skipped || 0}, Failed: ${data.failed || 0}`);
      } else {
        showToast(`Finished: ${data.sent} sent, ${data.skipped} skipped, ${data.failed} failed.`);
        if (data.failed > 0) {
          const firstErr = data.results?.find(r => r.status === 'failed')?.error;
          setErrorMsg(`Failed: ${firstErr || 'Check results below'}`);
        }
      }
    } catch (err) {
      setErrorMsg(err.message || 'Dispatch failed.');
    } finally {
      setIsSending(false);
      setProgressMsg('');
    }
  };

  const currentPreviewContact = hrList[previewIndex] || {};

  return (
    <div style={{ minHeight: '100vh', background: '#0a0d14', color: '#f8fafc', padding: '28px 16px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>

        {/* Top Navigation Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(99, 102, 241, 0.4)'
            }}>
              <Send size={20} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', background: 'linear-gradient(90deg, #fff, #cbd5e1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                HR Email & Resume Automation
              </h1>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>
                High-deliverability cold email studio for internships & full-time roles
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenHistory}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '8px 14px',
              color: '#cbd5e1',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <History size={15} /> Campaign Logs
          </button>
        </div>

        {/* Global Toast Alert */}
        {toastMsg && (
          <div style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid #6366f1',
            borderRadius: '10px',
            padding: '12px 18px',
            color: '#fff',
            fontSize: '0.9rem',
            fontWeight: 600,
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Sparkles size={16} color="#818cf8" />
            {toastMsg}
          </div>
        )}

        {/* Error Banner */}
        {errorMsg && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            borderRadius: '10px',
            padding: '12px 16px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '12px',
            color: '#fca5a5',
            fontSize: '0.88rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <div>{errorMsg}</div>
            </div>
            <button
              onClick={() => setErrorMsg('')}
              style={{ background: 'transparent', border: 'none', color: '#fca5a5', cursor: 'pointer', padding: 0 }}
            >
              <X size={16} />
            </button>
          </div>
        )}

        <form onSubmit={handleStartDispatch} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* STEP 1: Sender Credentials & Provider */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.65)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            padding: '22px',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: '#6366f1',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.85rem'
                }}>1</div>
                <span style={{ fontWeight: 700, fontSize: '1rem', color: '#f8fafc' }}>
                  Select Dispatch Method & Sender Credentials
                </span>
              </div>

              {/* Provider Selection Tabs */}
              <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', padding: '4px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <button
                  type="button"
                  onClick={() => { setProvider('gmail'); localStorage.setItem('pm_provider', 'gmail'); }}
                  style={{
                    background: provider === 'gmail' ? '#6366f1' : 'transparent',
                    color: provider === 'gmail' ? '#fff' : '#94a3b8',
                    border: 'none',
                    borderRadius: '7px',
                    padding: '6px 14px',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Mail size={14} /> Gmail App Password (Localhost)
                </button>
                <button
                  type="button"
                  onClick={() => { setProvider('brevo'); localStorage.setItem('pm_provider', 'brevo'); }}
                  style={{
                    background: provider === 'brevo' ? '#6366f1' : 'transparent',
                    color: provider === 'brevo' ? '#fff' : '#94a3b8',
                    border: 'none',
                    borderRadius: '7px',
                    padding: '6px 14px',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  🚀 Brevo API (Cloud / Free Tier)
                </button>
              </div>
            </div>

            {/* Provider 1: GMAIL APP PASSWORD */}
            {provider === 'gmail' && (
              <div>
                <div style={{
                  background: 'rgba(99, 102, 241, 0.08)',
                  border: '1px solid rgba(99, 102, 241, 0.2)',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  marginBottom: '16px',
                  fontSize: '0.82rem',
                  color: '#cbd5e1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}>
                  <div>
                    <strong style={{ color: '#818cf8' }}>✉️ Gmail SMTP Transporter:</strong> Highest deliverability for cold email applications. Dispatches directly from your personal Gmail address.
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPasswordGuide(!showPasswordGuide)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#38bdf8',
                      cursor: 'pointer',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: 0
                    }}
                  >
                    <HelpCircle size={14} /> How to get 16-letter App Password?
                  </button>
                </div>

                {/* Password Guide Box */}
                {showPasswordGuide && (
                  <div style={{
                    background: 'rgba(15, 23, 42, 0.9)',
                    border: '1px solid #38bdf8',
                    borderRadius: '10px',
                    padding: '14px 18px',
                    marginBottom: '16px',
                    fontSize: '0.83rem',
                    lineHeight: 1.6,
                    color: '#e2e8f0'
                  }}>
                    <div style={{ fontWeight: 700, color: '#38bdf8', marginBottom: '8px' }}>
                      3-Step Setup for Google App Password:
                    </div>
                    <ol style={{ margin: 0, paddingLeft: '20px' }}>
                      <li>Ensure <strong>2-Step Verification</strong> is ON in your Google Account.</li>
                      <li>
                        Go to <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" style={{ color: '#38bdf8', textDecoration: 'underline' }}>myaccount.google.com/apppasswords</a>.
                      </li>
                      <li>Type <code>HR Email App</code> and click <strong>Create</strong>. Copy the 16-letter code and paste it below.</li>
                    </ol>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                      Your Gmail Address
                    </label>
                    <input
                      type="email"
                      placeholder="your.email@gmail.com"
                      value={senderEmail}
                      onChange={(e) => handleEmailChange(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        background: 'rgba(0, 0, 0, 0.35)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '0.88rem',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                      16-Letter App Password
                    </label>
                    <input
                      type="password"
                      placeholder="xxxx xxxx xxxx xxxx"
                      value={appPassword}
                      onChange={(e) => handlePasswordChange(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        background: 'rgba(0, 0, 0, 0.35)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '0.88rem',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                      Your Full Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Neelesh Tripathi"
                      value={senderName}
                      onChange={(e) => handleNameChange(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        background: 'rgba(0, 0, 0, 0.35)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '0.88rem',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Provider 2: BREVO API */}
            {provider === 'brevo' && (
              <div>
                <div style={{
                  background: 'rgba(99, 102, 241, 0.08)',
                  border: '1px solid rgba(99, 102, 241, 0.2)',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  marginBottom: '16px',
                  fontSize: '0.82rem',
                  color: '#cbd5e1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}>
                  <div>
                    <strong style={{ color: '#818cf8' }}>🚀 Brevo HTTPS REST API:</strong> 300 free emails/day. Dispatches over Port 443 HTTPS without port blocks on cloud hosts.
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
                    Get Free Brevo Key <ExternalLink size={12} />
                  </a>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                      Brevo API Key (starts with <code>xkeysib-...</code>)
                    </label>
                    <input
                      type="password"
                      placeholder="xkeysib-xxxxxxxxxxxxxxxx"
                      value={brevoApiKey}
                      onChange={(e) => { setBrevoApiKey(e.target.value); localStorage.setItem('pm_brevo_key', e.target.value); }}
                      required
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        background: 'rgba(0, 0, 0, 0.35)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '0.88rem',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                      Verified Brevo Sender Email
                    </label>
                    <input
                      type="email"
                      placeholder="your.email@gmail.com"
                      value={senderEmail}
                      onChange={(e) => handleEmailChange(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        background: 'rgba(0, 0, 0, 0.35)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '0.88rem',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                      Your Full Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Neelesh Tripathi"
                      value={senderName}
                      onChange={(e) => handleNameChange(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        background: 'rgba(0, 0, 0, 0.35)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '0.88rem',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Test Connection Button & Indicator */}
            <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <button
                type="button"
                onClick={handleTestCredentials}
                disabled={isVerifying || !senderEmail || (provider === 'gmail' ? !appPassword : !brevoApiKey)}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '8px',
                  padding: '7px 14px',
                  color: '#e2e8f0',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: isVerifying ? 'wait' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {isVerifying ? <RefreshCw size={14} className="spin" /> : <ShieldCheck size={14} color="#818cf8" />}
                {isVerifying ? 'Verifying...' : 'Test Connection'}
              </button>

              {verifyStatus && (
                <div style={{
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: verifyStatus.success ? '#4ade80' : '#f87171',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  {verifyStatus.success ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                  {verifyStatus.message}
                </div>
              )}
            </div>
          </div>

          {/* STEP 2: HR Contacts Spreadsheet */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.65)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            padding: '22px',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: '#6366f1',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.85rem'
                }}>2</div>
                <span style={{ fontWeight: 700, fontSize: '1rem', color: '#f8fafc' }}>
                  HR Contacts List (.xlsx / .csv)
                </span>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '20px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#34d399',
                  border: '1px solid rgba(16, 185, 129, 0.3)'
                }}>
                  {hrList.length} CONTACTS
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handleDownloadSample}
                  style={{
                    background: 'none',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    color: '#94a3b8',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Download size={13} /> Sample Excel/CSV
                </button>

                <input
                  type="file"
                  ref={sheetInputRef}
                  onChange={handleSheetUpload}
                  accept=".xlsx, .xls, .csv"
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  onClick={() => sheetInputRef.current?.click()}
                  disabled={isUploadingSheet}
                  style={{
                    background: 'rgba(99, 102, 241, 0.15)',
                    border: '1px solid rgba(99, 102, 241, 0.35)',
                    borderRadius: '8px',
                    padding: '6px 14px',
                    color: '#818cf8',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Upload size={14} /> {isUploadingSheet ? 'Parsing...' : 'Upload HR Sheet'}
                </button>
              </div>
            </div>

            {sheetFileName && (
              <div style={{
                background: 'rgba(99, 102, 241, 0.08)',
                border: '1px dashed rgba(99, 102, 241, 0.3)',
                borderRadius: '8px',
                padding: '8px 12px',
                marginBottom: '12px',
                fontSize: '0.82rem',
                color: '#cbd5e1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <span>Loaded Spreadsheet: <strong>{sheetFileName}</strong> ({hrList.length} contacts)</span>
                <button
                  type="button"
                  onClick={() => { setSheetFileName(''); setHrList([]); }}
                  style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '0.75rem' }}
                >
                  Clear Sheet
                </button>
              </div>
            )}

            {/* Contacts Table */}
            <div style={{
              maxHeight: '220px',
              overflowY: 'auto',
              background: 'rgba(0, 0, 0, 0.25)',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.06)'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'rgba(255, 255, 255, 0.03)', color: '#94a3b8', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <th style={{ padding: '8px 12px' }}>HR Name</th>
                    <th style={{ padding: '8px 12px' }}>Company</th>
                    <th style={{ padding: '8px 12px' }}>HR Email</th>
                    <th style={{ padding: '8px 12px' }}>Target Role</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', width: '40px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {hrList.map((contact, idx) => (
                    <tr key={contact.id || idx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 600, color: '#f1f5f9' }}>{contact.name || '—'}</td>
                      <td style={{ padding: '8px 12px', color: '#cbd5e1' }}>{contact.company || '—'}</td>
                      <td style={{ padding: '8px 12px', color: '#818cf8', fontFamily: 'monospace' }}>{contact.email}</td>
                      <td style={{ padding: '8px 12px', color: '#94a3b8' }}>{contact.role || 'Software Engineer'}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleRemoveContact(contact.id)}
                          style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0 }}
                          title="Remove contact"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom Controls of Step 2 */}
            <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  id="skipDuplicates"
                  checked={skipDuplicates}
                  onChange={(e) => setSkipDuplicates(e.target.checked)}
                  style={{ cursor: 'pointer', accentColor: '#6366f1' }}
                />
                <label htmlFor="skipDuplicates" style={{ fontSize: '0.82rem', color: '#94a3b8', cursor: 'pointer' }}>
                  <span style={{ color: '#10b981' }}>🛡️ Duplicate Protection:</span> Skip contacts already emailed in past campaigns
                </label>
              </div>

              <button
                type="button"
                onClick={() => setShowAddContact(!showAddContact)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#38bdf8',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: 0
                }}
              >
                <Plus size={14} /> Add Individual Contact
              </button>
            </div>

            {/* Add Individual Contact Sub-form */}
            {showAddContact && (
              <div style={{
                marginTop: '12px',
                padding: '12px',
                background: 'rgba(0, 0, 0, 0.4)',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1.2fr 1fr auto',
                gap: '8px',
                alignItems: 'center'
              }}>
                <input
                  type="text"
                  placeholder="HR Name"
                  value={newContact.name}
                  onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                  style={{ padding: '6px 10px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '0.8rem' }}
                />
                <input
                  type="text"
                  placeholder="Company"
                  value={newContact.company}
                  onChange={(e) => setNewContact({ ...newContact, company: e.target.value })}
                  style={{ padding: '6px 10px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '0.8rem' }}
                />
                <input
                  type="email"
                  placeholder="hr.email@company.com"
                  value={newContact.email}
                  onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                  style={{ padding: '6px 10px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '0.8rem' }}
                />
                <input
                  type="text"
                  placeholder="Target Role"
                  value={newContact.role}
                  onChange={(e) => setNewContact({ ...newContact, role: e.target.value })}
                  style={{ padding: '6px 10px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '0.8rem' }}
                />
                <button
                  type="button"
                  onClick={handleAddManualContact}
                  style={{
                    padding: '7px 14px',
                    background: '#6366f1',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                >
                  Add
                </button>
              </div>
            )}
          </div>

          {/* STEP 3: Resume Attachment & Cold Email Template */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.65)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            padding: '22px',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: '#6366f1',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.85rem'
                }}>3</div>
                <span style={{ fontWeight: 700, fontSize: '1rem', color: '#f8fafc' }}>
                  Resume Attachment & Email Template
                </span>
              </div>

              {/* Template Quick Select Tabs */}
              <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', padding: '3px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                {DEFAULT_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => handleSelectTemplate(tpl)}
                    style={{
                      background: selectedTemplateId === tpl.id ? '#6366f1' : 'transparent',
                      color: selectedTemplateId === tpl.id ? '#fff' : '#94a3b8',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '5px 10px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {tpl.name.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* Resume Upload Pill */}
            <div style={{ marginBottom: '16px' }}>
              <input
                type="file"
                ref={resumeInputRef}
                onChange={handleResumeUpload}
                accept=".pdf, .docx"
                style={{ display: 'none' }}
              />

              {resumeFile ? (
                <div style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <FileText size={18} color="#34d399" />
                    <div>
                      <span style={{ fontWeight: 600, color: '#34d399', fontSize: '0.88rem' }}>
                        {resumeFile.originalname || resumeFile.filename}
                      </span>
                      <span style={{ fontSize: '0.78rem', color: '#94a3b8', marginLeft: '8px' }}>
                        ({(resumeFile.size / 1024).toFixed(1)} KB) • Attached to every HR email
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setResumeFile(null)}
                    style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer' }}
                    title="Remove attached resume"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => resumeInputRef.current?.click()}
                  disabled={isUploadingResume}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'rgba(99, 102, 241, 0.08)',
                    border: '1px dashed rgba(99, 102, 241, 0.35)',
                    borderRadius: '10px',
                    color: '#818cf8',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <Upload size={16} /> {isUploadingResume ? 'Uploading Resume...' : 'Attach Resume (PDF / DOCX)'}
                </button>
              )}
            </div>

            {/* Dynamic Tags Helper & Live Preview Trigger */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'flex', gap: '6px', alignItems: 'center' }}>
                <span>Dynamic Tags:</span>
                <code style={{ background: 'rgba(99, 102, 241, 0.2)', color: '#818cf8', padding: '2px 6px', borderRadius: '4px' }}>{`{{company}}`}</code>
                <code style={{ background: 'rgba(99, 102, 241, 0.2)', color: '#818cf8', padding: '2px 6px', borderRadius: '4px' }}>{`{{name}}`}</code>
                <code style={{ background: 'rgba(99, 102, 241, 0.2)', color: '#818cf8', padding: '2px 6px', borderRadius: '4px' }}>{`{{role}}`}</code>
              </div>

              <button
                type="button"
                onClick={() => setShowPreviewModal(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#38bdf8',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: 0
                }}
              >
                <Eye size={14} /> Live Per-Company Preview
              </button>
            </div>

            {/* Subject Line */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
                Subject Line
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'rgba(0, 0, 0, 0.35)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '0.88rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Email Body */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
                Email Body Message
              </label>
              <textarea
                rows={9}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'rgba(0, 0, 0, 0.35)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '0.88rem',
                  lineHeight: 1.6,
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                  resize: 'vertical'
                }}
              />
            </div>
          </div>

          {/* STEP 4: Launch Campaign Button */}
          <div style={{ textAlign: 'center', marginTop: '6px' }}>
            <button
              type="submit"
              disabled={isSending || hrList.length === 0}
              style={{
                width: '100%',
                padding: '16px',
                background: isSending ? '#475569' : 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '14px',
                fontSize: '1.05rem',
                fontWeight: 700,
                cursor: isSending ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                boxShadow: isSending ? 'none' : '0 8px 30px rgba(99, 102, 241, 0.35)',
                transition: 'all 0.2s ease'
              }}
            >
              <Send size={20} />
              {isSending ? (progressMsg || 'Dispatching Personalized Emails...') : `Send Resume to ${hrList.length} HR Recruiters`}
            </button>
          </div>
        </form>

        {/* Real-time Dispatch Results Audit Log */}
        {results && (
          <div style={{
            marginTop: '28px',
            background: 'rgba(15, 23, 42, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '22px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '1rem', color: '#f8fafc' }}>
                <CheckCircle2 size={18} color="#34d399" />
                Campaign Delivery Audit Log
              </div>
              <div style={{ display: 'flex', gap: '8px', fontSize: '0.78rem', fontWeight: 700 }}>
                <span style={{ padding: '3px 8px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399' }}>
                  SENT: {results.sent}
                </span>
                <span style={{ padding: '3px 8px', borderRadius: '6px', background: 'rgba(234, 179, 8, 0.2)', color: '#facc15' }}>
                  SKIPPED: {results.skipped}
                </span>
                <span style={{ padding: '3px 8px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.2)', color: '#f87171' }}>
                  FAILED: {results.failed}
                </span>
              </div>
            </div>

            <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ color: '#94a3b8', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <th style={{ padding: '8px 10px' }}>Company</th>
                    <th style={{ padding: '8px 10px' }}>HR Contact</th>
                    <th style={{ padding: '8px 10px' }}>Email</th>
                    <th style={{ padding: '8px 10px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {results.results?.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                      <td style={{ padding: '8px 10px', color: '#cbd5e1' }}>{item.company || '—'}</td>
                      <td style={{ padding: '8px 10px', fontWeight: 600, color: '#f1f5f9' }}>{item.name || '—'}</td>
                      <td style={{ padding: '8px 10px', color: '#818cf8', fontFamily: 'monospace' }}>{item.email}</td>
                      <td style={{ padding: '8px 10px' }}>
                        {item.status === 'sent' && (
                          <span style={{ color: '#34d399', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle2 size={13} /> Delivered
                          </span>
                        )}
                        {item.status === 'skipped' && (
                          <span style={{ color: '#facc15', fontWeight: 600 }}>
                            ⏭ Skipped (Duplicate)
                          </span>
                        )}
                        {item.status === 'failed' && (
                          <span style={{ color: '#f87171', fontWeight: 600 }} title={item.error}>
                            ✗ {item.error || 'Failed'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* LIVE PREVIEW MODAL */}
        {showPreviewModal && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(8px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}>
            <div style={{
              background: '#0f172a',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '16px',
              maxWidth: '650px',
              width: '100%',
              padding: '24px',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#fff' }}>
                  Live Personalized Preview ({previewIndex + 1} of {hrList.length})
                </div>
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(false)}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Slider between contacts */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.3)', padding: '8px 12px', borderRadius: '8px', marginBottom: '14px' }}>
                <button
                  type="button"
                  disabled={previewIndex === 0}
                  onClick={() => setPreviewIndex(Math.max(0, previewIndex - 1))}
                  style={{ background: 'none', border: 'none', color: previewIndex === 0 ? '#475569' : '#38bdf8', cursor: previewIndex === 0 ? 'default' : 'pointer', fontWeight: 600 }}
                >
                  &larr; Previous Recruiter
                </button>
                <span style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
                  <strong>{currentPreviewContact.name || 'HR Contact'}</strong> at <strong>{currentPreviewContact.company || 'Company'}</strong>
                </span>
                <button
                  type="button"
                  disabled={previewIndex >= hrList.length - 1}
                  onClick={() => setPreviewIndex(Math.min(hrList.length - 1, previewIndex + 1))}
                  style={{ background: 'none', border: 'none', color: previewIndex >= hrList.length - 1 ? '#475569' : '#38bdf8', cursor: previewIndex >= hrList.length - 1 ? 'default' : 'pointer', fontWeight: 600 }}
                >
                  Next Recruiter &rarr;
                </button>
              </div>

              {/* Rendered Box */}
              <div style={{ background: '#fff', color: '#1e293b', borderRadius: '10px', padding: '18px', fontSize: '0.9rem' }}>
                <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '12px' }}>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>To: {currentPreviewContact.email}</div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', marginTop: '4px' }}>
                    {subject
                      .replace(/\{\{\s*role.*\}\}/gi, currentPreviewContact.role || 'Software Engineer')
                      .replace(/\{\{\s*name.*\}\}/gi, currentPreviewContact.name || 'Hiring Team')
                      .replace(/\{\{\s*company.*\}\}/gi, currentPreviewContact.company || 'your company')}
                  </div>
                </div>

                <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, fontSize: '0.88rem' }}>
                  {body
                    .replace(/\{\{\s*name.*\}\}/gi, currentPreviewContact.name || 'Hiring Team')
                    .replace(/\{\{\s*company.*\}\}/gi, currentPreviewContact.company || 'your company')
                    .replace(/\{\{\s*role.*\}\}/gi, currentPreviewContact.role || 'Software Engineer')
                    .replace(/\{\{\s*sender_name.*\}\}/gi, senderName || 'Your Name')
                    .replace(/\{\{\s*sender_email.*\}\}/gi, senderEmail || 'your-email@gmail.com')}
                </div>

                {resumeFile && (
                  <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px dashed #cbd5e1', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: '#059669' }}>
                    <FileText size={16} /> Attached: <strong>{resumeFile.originalname || resumeFile.filename}</strong>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* CAMPAIGN HISTORY MODAL */}
        {showHistoryModal && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(8px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}>
            <div style={{
              background: '#0f172a',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '16px',
              maxWidth: '700px',
              width: '100%',
              padding: '24px',
              maxHeight: '85vh',
              overflowY: 'auto'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
                <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <History size={18} color="#818cf8" /> Past Campaign Logs
                </div>
                <button
                  type="button"
                  onClick={() => setShowHistoryModal(false)}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                >
                  <X size={20} />
                </button>
              </div>

              {historyCampaigns.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                  No past campaigns found.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {historyCampaigns.map((camp) => (
                    <div key={camp.id} style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '10px',
                      padding: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <div>
                        <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '0.9rem' }}>
                          {camp.name}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '4px' }}>
                          Sender: <strong>{camp.senderEmail || camp.senderName}</strong> • {new Date(camp.createdAt).toLocaleString()}
                        </div>
                        <div style={{ display: 'flex', gap: '6px', marginTop: '8px', fontSize: '0.75rem' }}>
                          <span style={{ color: '#34d399', fontWeight: 600 }}>Sent: {camp.stats?.sent || 0}</span> •
                          <span style={{ color: '#facc15', fontWeight: 600 }}>Skipped: {camp.stats?.skipped || 0}</span> •
                          <span style={{ color: '#f87171', fontWeight: 600 }}>Failed: {camp.stats?.failed || 0}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteHistory(camp.id)}
                        style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
                        title="Delete log"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
