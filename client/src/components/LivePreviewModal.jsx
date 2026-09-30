import React, { useState, useEffect } from 'react';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  Send, 
  Mail, 
  User, 
  Paperclip, 
  Sparkles,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { api } from '../utils/api';

export default function LivePreviewModal({
  isOpen,
  onClose,
  recipients,
  subjectTemplate,
  bodyTemplate,
  senderName,
  attachments = [],
  onSendTestEmail,
  authStatus
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [renderedSubject, setRenderedSubject] = useState('');
  const [renderedBody, setRenderedBody] = useState('');
  const [testEmailInput, setTestEmailInput] = useState(authStatus.email || '');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [viewMode, setViewMode] = useState('html'); // 'html' | 'text'

  const currentRecipient = recipients && recipients.length > 0 ? recipients[currentIndex] : null;

  useEffect(() => {
    if (!isOpen || !currentRecipient) return;

    const fetchPreview = async () => {
      try {
        const res = await api.renderPreview(subjectTemplate, bodyTemplate, currentRecipient, senderName);
        setRenderedSubject(res.renderedSubject);
        setRenderedBody(res.renderedBody);
      } catch (err) {
        console.error('Preview error:', err);
      }
    };

    fetchPreview();
  }, [isOpen, currentIndex, recipients, subjectTemplate, bodyTemplate, senderName]);

  if (!isOpen) return null;

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  const handleNext = () => {
    if (currentIndex < recipients.length - 1) setCurrentIndex(currentIndex + 1);
  };

  const handleDispatchTest = async () => {
    if (!testEmailInput) return;
    setIsSendingTest(true);
    try {
      await onSendTestEmail(testEmailInput, currentRecipient);
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '840px' }}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'rgba(99, 102, 241, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#818cf8'
            }}>
              <Eye size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0 }}>Per-Recipient Live Preview</h3>
              <p style={{ margin: 0, fontSize: '0.8rem' }}>Inspect how your placeholders translate for each contact</p>
            </div>
          </div>
          <button className="btn-close" onClick={onClose}><X size={20} /></button>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Recipient Carousel Navigation */}
          {recipients.length > 0 ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 16px',
              gap: '12px'
            }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={handlePrev}
                disabled={currentIndex === 0}
              >
                <ChevronLeft size={16} />
                <span>Prev</span>
              </button>

              <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--text-main)' }}>
                  Recipient #{currentIndex + 1} of {recipients.length} &bull; <span style={{ color: '#818cf8', fontFamily: 'var(--font-mono)' }}>{currentRecipient.email}</span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                  {currentRecipient.name ? `Name: ${currentRecipient.name}` : 'Name: (auto-inferred)'}
                  {currentRecipient.company ? ` | Company: ${currentRecipient.company}` : ''}
                </div>
              </div>

              <button
                className="btn btn-secondary btn-sm"
                onClick={handleNext}
                disabled={currentIndex === recipients.length - 1}
              >
                <span>Next</span>
                <ChevronRight size={16} />
              </button>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '20px' }}>
              No recipients loaded. Add recipients in the audience tab to view live preview.
            </div>
          )}

          {/* Rendered Email Card */}
          <div style={{
            background: '#ffffff',
            color: '#1e293b',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(0, 0, 0, 0.1)',
            overflow: 'hidden',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.25)'
          }}>
            {/* Email Meta Bar */}
            <div style={{
              background: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              padding: '14px 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              fontSize: '0.86rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <strong style={{ color: '#64748b', width: '60px' }}>From:</strong>
                <span>{senderName || authStatus.name || 'PostMaster'} &lt;{authStatus.email || 'your-google-account@gmail.com'}&gt;</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <strong style={{ color: '#64748b', width: '60px' }}>To:</strong>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>
                  {currentRecipient?.name ? `${currentRecipient.name} ` : ''}&lt;{currentRecipient?.email || 'recipient@domain.com'}&gt;
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', paddingTop: '4px', borderTop: '1px solid #e2e8f0' }}>
                <strong style={{ color: '#64748b', width: '60px' }}>Subject:</strong>
                <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.95rem' }}>
                  {renderedSubject || '(No Subject)'}
                </span>
              </div>
            </div>

            {/* Rendered Email Body */}
            <div style={{ padding: '24px', minHeight: '200px', maxHeight: '350px', overflowY: 'auto' }}>
              <div
                dangerouslySetInnerHTML={{ __html: renderedBody || '<p style="color:#94a3b8">Empty email body</p>' }}
                style={{
                  lineHeight: '1.6',
                  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  fontSize: '0.95rem',
                  color: '#334155'
                }}
              />
            </div>

            {/* Attachments Footer */}
            {attachments.length > 0 && (
              <div style={{
                background: '#f1f5f9',
                borderTop: '1px solid #e2e8f0',
                padding: '10px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                flexWrap: 'wrap',
                fontSize: '0.8rem'
              }}>
                <Paperclip size={14} color="#64748b" />
                <span style={{ fontWeight: 600, color: '#475569' }}>{attachments.length} Attachment(s):</span>
                {attachments.map((att, i) => (
                  <span key={i} style={{ background: '#e2e8f0', padding: '2px 8px', borderRadius: '4px', color: '#1e293b' }}>
                    {att.originalname || att.filename}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Test Email Dispatch Strip */}
          <div style={{
            background: 'var(--bg-input)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Mail size={18} color="#818cf8" />
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Send Test Preview to Inbox</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Dispatches a sample of this customized email</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', flex: '1', maxWidth: '380px' }}>
              <input
                type="email"
                className="form-input"
                placeholder="your-email@gmail.com"
                value={testEmailInput}
                onChange={(e) => setTestEmailInput(e.target.value)}
                style={{ padding: '8px 12px', fontSize: '0.85rem' }}
              />
              <button
                className="btn btn-primary btn-sm"
                onClick={handleDispatchTest}
                disabled={isSendingTest || !testEmailInput}
                style={{ flexShrink: 0 }}
              >
                {isSendingTest ? <Loader2 size={14} className="pulse-animation" /> : <Send size={14} />}
                <span>{isSendingTest ? 'Sending...' : 'Send Test'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Close Preview</button>
        </div>
      </div>
    </div>
  );
}
