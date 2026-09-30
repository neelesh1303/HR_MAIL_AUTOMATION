import React, { useState, useRef } from 'react';
import { 
  PenTool, 
  Sparkles, 
  Eye, 
  Send, 
  Mail, 
  Bold, 
  Italic, 
  Underline, 
  List, 
  ListOrdered, 
  Quote, 
  Code, 
  Link as LinkIcon, 
  Heading2, 
  Heading3, 
  RotateCcw, 
  FileCheck,
  CheckCircle,
  Tag,
  Zap
} from 'lucide-react';

export default function EmailComposer({
  campaignName,
  setCampaignName,
  senderName,
  setSenderName,
  replyTo,
  setReplyTo,
  subject,
  setSubject,
  bodyHtml,
  setBodyHtml,
  detectedVariables,
  onOpenPreview,
  onLaunchCampaign,
  onSendTest,
  templates,
  onSelectTemplate,
  isReadyToLaunch,
  authStatus,
  onOpenAuth
}) {
  const [editorMode, setEditorMode] = useState('rich'); // 'rich' | 'code'
  const editorRef = useRef(null);
  const subjectInputRef = useRef(null);
  const [activeFocusField, setActiveFocusField] = useState('body'); // 'subject' | 'body'

  // Execute formatting command in WYSIWYG editor
  const formatDoc = (cmd, value = null) => {
    if (editorMode !== 'rich') return;
    document.execCommand(cmd, false, value);
    if (editorRef.current) {
      setBodyHtml(editorRef.current.innerHTML);
    }
  };

  // Insert link
  const insertLink = () => {
    const url = prompt('Enter the link destination URL (https://...):', 'https://');
    if (url) {
      formatDoc('createLink', url);
    }
  };

  // Insert variable tag at active cursor
  const insertVariable = (varName) => {
    const tag = `{{${varName}}}`;

    if (activeFocusField === 'subject') {
      const input = subjectInputRef.current;
      if (input) {
        const start = input.selectionStart || 0;
        const end = input.selectionEnd || 0;
        const newSubject = subject.slice(0, start) + tag + subject.slice(end);
        setSubject(newSubject);
        setTimeout(() => {
          input.focus();
          input.setSelectionRange(start + tag.length, start + tag.length);
        }, 50);
      } else {
        setSubject(prev => prev + ' ' + tag);
      }
    } else {
      if (editorMode === 'rich') {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          range.deleteContents();
          const node = document.createTextNode(tag);
          range.insertNode(node);
          range.setStartAfter(node);
          range.setEndAfter(node);
          selection.removeAllRanges();
          selection.addRange(range);
          if (editorRef.current) setBodyHtml(editorRef.current.innerHTML);
        } else {
          setBodyHtml(prev => prev + ' ' + tag);
        }
      } else {
        setBodyHtml(prev => prev + ' ' + tag);
      }
    }
  };

  return (
    <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(6, 182, 212, 0.2))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#818cf8',
            border: '1px solid rgba(99, 102, 241, 0.3)'
          }}>
            <PenTool size={20} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Email Studio & Personalization</h3>
            <p style={{ margin: 0, fontSize: '0.82rem' }}>Craft your dynamic template with personalized tags</p>
          </div>
        </div>

        {/* Templates Quick Selector */}
        {templates && templates.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Template:</span>
            <select
              className="form-select"
              style={{ width: 'auto', padding: '6px 12px', fontSize: '0.84rem' }}
              onChange={(e) => {
                const found = templates.find(t => t.id === e.target.value);
                if (found) onSelectTemplate(found);
              }}
              defaultValue=""
            >
              <option value="" disabled>Load from Library...</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.category})</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Campaign Details Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '12px' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" style={{ fontSize: '0.78rem' }}>Campaign Title</label>
          <input
            type="text"
            className="form-input"
            placeholder="e.g. Q4 Executive Outreach"
            value={campaignName}
            onChange={(e) => setCampaignName(e.target.value)}
          />
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" style={{ fontSize: '0.78rem' }}>From Name (Display)</label>
          <input
            type="text"
            className="form-input"
            placeholder="e.g. Alex Morgan"
            value={senderName}
            onChange={(e) => setSenderName(e.target.value)}
          />
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" style={{ fontSize: '0.78rem' }}>Reply-To Email</label>
          <input
            type="email"
            className="form-input"
            placeholder="e.g. replies@yourdomain.com"
            value={replyTo}
            onChange={(e) => setReplyTo(e.target.value)}
          />
        </div>
      </div>

      {/* Subject Line */}
      <div className="form-group" style={{ margin: 0 }}>
        <label className="form-label" style={{ fontSize: '0.85rem' }}>
          <span>Subject Line</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Supports dynamic tags like <code>{`{{company}}`}</code></span>
        </label>
        <input
          ref={subjectInputRef}
          type="text"
          className="form-input"
          placeholder="Special invitation for {{name || 'Valued Partner'}} & {{company}}"
          value={subject}
          onFocus={() => setActiveFocusField('subject')}
          onChange={(e) => setSubject(e.target.value)}
          style={{ fontSize: '0.98rem', fontWeight: 500 }}
        />
      </div>

      {/* Dynamic Placeholder Pill Ribbon */}
      <div style={{
        background: 'rgba(99, 102, 241, 0.05)',
        border: '1px solid rgba(99, 102, 241, 0.15)',
        borderRadius: 'var(--radius-md)',
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 600, color: '#818cf8' }}>
          <Tag size={14} />
          <span>Click to Insert Variable:</span>
        </div>
        
        {detectedVariables.map(v => (
          <button
            key={v}
            type="button"
            className="var-pill"
            onClick={() => insertVariable(v)}
            title={`Insert {{${v}}} into active field`}
          >
            +{`{{${v}}}`}
          </button>
        ))}

        <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginLeft: 'auto' }}>
          Target: <strong>{activeFocusField === 'subject' ? 'Subject Line' : 'Email Body'}</strong>
        </span>
      </div>

      {/* Body Composer Toolbar */}
      <div style={{
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        background: 'var(--bg-input)',
        overflow: 'hidden'
      }}>
        {/* Editor Toolbar Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          background: 'rgba(255, 255, 255, 0.03)',
          borderBottom: '1px solid var(--border-subtle)',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          {/* Formatting buttons (WYSIWYG Mode) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
            <button type="button" className="btn-close" onClick={() => formatDoc('bold')} title="Bold">
              <Bold size={15} />
            </button>
            <button type="button" className="btn-close" onClick={() => formatDoc('italic')} title="Italic">
              <Italic size={15} />
            </button>
            <button type="button" className="btn-close" onClick={() => formatDoc('underline')} title="Underline">
              <Underline size={15} />
            </button>
            <div style={{ width: '1px', height: '18px', background: 'var(--border-subtle)', margin: '0 4px' }} />
            <button type="button" className="btn-close" onClick={() => formatDoc('formatBlock', '<h2>')} title="Heading 2">
              <Heading2 size={15} />
            </button>
            <button type="button" className="btn-close" onClick={() => formatDoc('formatBlock', '<h3>')} title="Heading 3">
              <Heading3 size={15} />
            </button>
            <button type="button" className="btn-close" onClick={() => formatDoc('formatBlock', '<p>')} title="Normal Paragraph">
              <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>P</span>
            </button>
            <div style={{ width: '1px', height: '18px', background: 'var(--border-subtle)', margin: '0 4px' }} />
            <button type="button" className="btn-close" onClick={() => formatDoc('insertUnorderedList')} title="Bullet List">
              <List size={15} />
            </button>
            <button type="button" className="btn-close" onClick={() => formatDoc('insertOrderedList')} title="Numbered List">
              <ListOrdered size={15} />
            </button>
            <button type="button" className="btn-close" onClick={() => formatDoc('formatBlock', '<blockquote>')} title="Quote">
              <Quote size={15} />
            </button>
            <button type="button" className="btn-close" onClick={insertLink} title="Insert Link">
              <LinkIcon size={15} />
            </button>
            <button type="button" className="btn-close" onClick={() => formatDoc('removeFormat')} title="Clear Formatting">
              <RotateCcw size={15} />
            </button>
          </div>

          {/* Mode Switcher */}
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              type="button"
              className={`btn btn-sm ${editorMode === 'rich' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setEditorMode('rich')}
              style={{ padding: '4px 10px', fontSize: '0.75rem' }}
            >
              Visual WYSIWYG
            </button>
            <button
              type="button"
              className={`btn btn-sm ${editorMode === 'code' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setEditorMode('code')}
              style={{ padding: '4px 10px', fontSize: '0.75rem' }}
            >
              <Code size={13} />
              <span>HTML Source</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        {editorMode === 'rich' ? (
          <div
            ref={editorRef}
            contentEditable
            onFocus={() => setActiveFocusField('body')}
            onInput={(e) => setBodyHtml(e.currentTarget.innerHTML)}
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
            style={{
              minHeight: '220px',
              padding: '16px',
              color: 'var(--text-main)',
              outline: 'none',
              fontFamily: 'var(--font-main)',
              fontSize: '0.95rem',
              lineHeight: '1.6',
              overflowY: 'auto',
              maxHeight: '380px'
            }}
          />
        ) : (
          <textarea
            value={bodyHtml}
            onFocus={() => setActiveFocusField('body')}
            onChange={(e) => setBodyHtml(e.target.value)}
            className="form-textarea"
            style={{
              minHeight: '220px',
              maxHeight: '380px',
              border: 'none',
              background: 'transparent',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.85rem'
            }}
          />
        )}
      </div>

      {/* Footer Action Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        paddingTop: '6px'
      }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onOpenPreview}
            title="Inspect recipient-by-recipient dynamic personalization in real time"
          >
            <Eye size={16} />
            <span>Live Per-Recipient Preview</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={onSendTest}
            title="Send sample test preview to your own inbox"
          >
            <Mail size={16} />
            <span>Send Test Preview</span>
          </button>
        </div>

        <div>
          {!authStatus.isConnected ? (
            <button
              type="button"
              className="btn btn-primary btn-lg"
              onClick={onOpenAuth}
              style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
            >
              <Zap size={18} />
              <span>Connect Google to Send</span>
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-success btn-lg"
              onClick={onLaunchCampaign}
              disabled={!isReadyToLaunch}
              style={{ boxShadow: '0 4px 20px rgba(16, 185, 129, 0.4)' }}
            >
              <Send size={18} />
              <span>Launch Campaign Dispatch</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
