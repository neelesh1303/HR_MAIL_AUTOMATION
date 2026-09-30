import React, { useState, useRef } from 'react';
import { 
  Users, 
  Upload, 
  FileSpreadsheet, 
  Plus, 
  Trash2, 
  Search, 
  Download, 
  Check, 
  AlertCircle, 
  Copy, 
  Sparkles,
  FileText,
  UserCheck,
  Edit2
} from 'lucide-react';
import { api } from '../utils/api';
import Papa from 'papaparse';

export default function RecipientManager({ 
  recipients, 
  setRecipients, 
  detectedVariables, 
  setDetectedVariables,
  addToast 
}) {
  const [activeInputTab, setActiveInputTab] = useState('upload'); // 'upload' | 'paste' | 'manual'
  const [pastedText, setPastedText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  
  // New manual row state
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newCompany, setNewCompany] = useState('');

  const fileInputRef = useRef(null);

  // Extract variables from recipients
  const updateAvailableVariables = (list) => {
    const vars = new Set(['name', 'first_name', 'last_name', 'email']);
    if (list.length > 0) {
      list.forEach(item => {
        Object.keys(item).forEach(key => {
          if (!['id', 'status', 'sentAt', 'error', 'messageId', 'data'].includes(key)) {
            vars.add(key.toLowerCase().trim());
          }
        });
      });
    }
    setDetectedVariables(Array.from(vars));
  };

  // Handle file upload
  const handleFileUpload = async (file) => {
    if (!file) return;
    setIsParsing(true);
    try {
      const res = await api.uploadRecipientsFile(file);
      if (res.recipients && res.recipients.length > 0) {
        setRecipients(res.recipients);
        updateAvailableVariables(res.recipients);
        addToast('success', `Imported ${res.recipients.length} recipients from "${file.name}"!`);
      } else {
        addToast('warning', 'No valid email addresses found in the file.');
      }
    } catch (err) {
      addToast('error', err.message || 'Failed to parse file');
    } finally {
      setIsParsing(false);
    }
  };

  // Handle Drag and Drop
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Parse pasted text
  const handleParsePastedText = () => {
    if (!pastedText.trim()) {
      addToast('warning', 'Please enter or paste email addresses.');
      return;
    }

    const lines = pastedText.split(/\r?\n/).filter(line => line.trim().length > 0);
    const parsedList = [];

    lines.forEach((line, idx) => {
      // Check if CSV formatted
      if (line.includes(',') || line.includes('\t') || line.includes(';')) {
        const parts = line.split(/[,;\t]+/).map(p => p.trim());
        const emailIndex = parts.findIndex(p => p.includes('@'));
        if (emailIndex >= 0) {
          const email = parts[emailIndex];
          const name = parts[0] !== email ? parts[0] : (parts[1] || '');
          const company = parts[2] || '';
          parsedList.push({
            id: `rec-${idx + 1}-${Date.now()}`,
            email,
            name,
            company
          });
          return;
        }
      }

      // Check format: John Doe <john@domain.com>
      const angleMatch = line.match(/(.*?)\s*<([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>/);
      if (angleMatch) {
        parsedList.push({
          id: `rec-${idx + 1}-${Date.now()}`,
          name: angleMatch[1].trim(),
          email: angleMatch[2].trim()
        });
        return;
      }

      // Plain email format
      const emailMatch = line.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      if (emailMatch) {
        parsedList.push({
          id: `rec-${idx + 1}-${Date.now()}`,
          email: emailMatch[0].trim(),
          name: ''
        });
      }
    });

    if (parsedList.length === 0) {
      addToast('error', 'No valid email addresses could be extracted from pasted text.');
      return;
    }

    // Merge or replace
    const combined = [...recipients, ...parsedList];
    setRecipients(combined);
    updateAvailableVariables(combined);
    setPastedText('');
    setActiveInputTab('upload');
    addToast('success', `Added ${parsedList.length} recipients!`);
  };

  // Add single manual recipient
  const handleAddManual = (e) => {
    e.preventDefault();
    if (!newEmail || !newEmail.includes('@')) {
      addToast('error', 'Please provide a valid email address.');
      return;
    }

    const newRec = {
      id: `rec-${Date.now()}`,
      email: newEmail.trim(),
      name: newName.trim(),
      company: newCompany.trim()
    };

    const updated = [newRec, ...recipients];
    setRecipients(updated);
    updateAvailableVariables(updated);
    setNewEmail('');
    setNewName('');
    setNewCompany('');
    addToast('success', `Added ${newRec.email}`);
  };

  // Remove recipient
  const handleRemove = (id) => {
    const updated = recipients.filter(r => r.id !== id);
    setRecipients(updated);
    updateAvailableVariables(updated);
  };

  // Remove duplicates
  const handleRemoveDuplicates = () => {
    const seen = new Set();
    const unique = [];
    recipients.forEach(r => {
      const emailLower = (r.email || '').toLowerCase().trim();
      if (emailLower && !seen.has(emailLower)) {
        seen.add(emailLower);
        unique.push(r);
      }
    });

    const removedCount = recipients.length - unique.length;
    setRecipients(unique);
    updateAvailableVariables(unique);
    addToast('info', removedCount > 0 ? `Removed ${removedCount} duplicate email(s).` : 'No duplicates found.');
  };

  // Download Sample Template CSV
  const handleDownloadSample = () => {
    const sampleData = [
      { email: 'alex.smith@example.com', name: 'Alex Smith', company: 'Acme Corp', role: 'CTO' },
      { email: 'sarah.j@innovate.org', name: 'Sarah Jenkins', company: 'Innovate Labs', role: 'Product Lead' },
      { email: 'david.wilson@apex.io', name: 'David Wilson', company: 'Apex Digital', role: 'Head of Growth' },
      { email: 'elena.rostova@techflow.ai', name: 'Elena Rostova', company: 'TechFlow AI', role: 'Founder' }
    ];
    const csv = Papa.unparse(sampleData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'postmaster_sample_recipients.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('info', 'Sample CSV template downloaded!');
  };

  // Load sample demo data
  const handleLoadDemoRecipients = () => {
    const demo = [
      { id: 'd1', email: 'jordan.rivers@apexcloud.io', name: 'Jordan Rivers', company: 'ApexCloud', role: 'VP of Engineering', city: 'San Francisco' },
      { id: 'd2', email: 'clara.oswald@starlabs.tech', name: 'Clara Oswald', company: 'StarLabs', role: 'Director of Marketing', city: 'London' },
      { id: 'd3', email: 'marcus.vance@quantumleap.co', name: 'Marcus Vance', company: 'QuantumLeap', role: 'Chief Executive', city: 'New York' },
      { id: 'd4', email: 'priya.sharma@hyperloop.in', name: 'Priya Sharma', company: 'HyperScale', role: 'Operations Lead', city: 'Bangalore' },
      { id: 'd5', email: 'lucas.muller@nordicpeak.de', name: 'Lucas Müller', company: 'NordicPeak', role: 'Head of Product', city: 'Berlin' }
    ];
    setRecipients(demo);
    updateAvailableVariables(demo);
    addToast('success', 'Loaded 5 sample recipients with custom fields!');
  };

  // Filtered recipients
  const filteredRecipients = recipients.filter(r => {
    const term = searchTerm.toLowerCase();
    return (r.email || '').toLowerCase().includes(term) || (r.name || '').toLowerCase().includes(term) || (r.company || '').toLowerCase().includes(term);
  });

  return (
    <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.2))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#818cf8',
            border: '1px solid rgba(99, 102, 241, 0.3)'
          }}>
            <Users size={20} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Recipients & Audience</h3>
            <p style={{ margin: 0, fontSize: '0.82rem' }}>
              {recipients.length} contact{recipients.length === 1 ? '' : 's'} loaded &bull; Dynamic tags auto-mapped
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button 
            type="button" 
            className="btn btn-outline btn-sm"
            onClick={handleDownloadSample}
            title="Download formatted CSV spreadsheet example"
          >
            <Download size={14} />
            <span>Sample CSV</span>
          </button>

          {recipients.length === 0 && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleLoadDemoRecipients}
            >
              <Sparkles size={14} color="#818cf8" />
              <span>Load Demo Contacts</span>
            </button>
          )}

          {recipients.length > 0 && (
            <>
              <button 
                type="button" 
                className="btn btn-secondary btn-sm"
                onClick={handleRemoveDuplicates}
                title="Deduplicate list by email"
              >
                <UserCheck size={14} />
                <span>Deduplicate</span>
              </button>
              <button 
                type="button" 
                className="btn btn-danger btn-sm"
                onClick={() => {
                  if (confirm('Clear all recipients from current list?')) {
                    setRecipients([]);
                    setDetectedVariables(['name', 'first_name', 'last_name', 'email']);
                  }
                }}
              >
                <Trash2 size={14} />
                <span>Clear</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Input Mode Selector */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border-subtle)',
        gap: '4px'
      }}>
        <button
          className={`nav-tab-btn ${activeInputTab === 'upload' ? 'active' : ''}`}
          onClick={() => setActiveInputTab('upload')}
          style={{ padding: '6px 14px', fontSize: '0.84rem' }}
        >
          <Upload size={14} />
          <span>Upload CSV / Excel</span>
        </button>

        <button
          className={`nav-tab-btn ${activeInputTab === 'paste' ? 'active' : ''}`}
          onClick={() => setActiveInputTab('paste')}
          style={{ padding: '6px 14px', fontSize: '0.84rem' }}
        >
          <Copy size={14} />
          <span>Paste List</span>
        </button>

        <button
          className={`nav-tab-btn ${activeInputTab === 'manual' ? 'active' : ''}`}
          onClick={() => setActiveInputTab('manual')}
          style={{ padding: '6px 14px', fontSize: '0.84rem' }}
        >
          <Plus size={14} />
          <span>Add Single</span>
        </button>
      </div>

      {/* Mode 1: File Drag & Drop Upload */}
      {activeInputTab === 'upload' && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current && fileInputRef.current.click()}
          style={{
            border: `2px dashed ${isDragging ? 'var(--primary)' : 'var(--border-subtle)'}`,
            borderRadius: 'var(--radius-md)',
            padding: '28px 20px',
            textAlign: 'center',
            cursor: 'pointer',
            background: isDragging ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-input)',
            transition: 'var(--transition)'
          }}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => e.target.files && handleFileUpload(e.target.files[0])}
            accept=".csv,.xlsx,.xls,.txt"
            style={{ display: 'none' }}
          />

          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'rgba(99, 102, 241, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px',
            color: '#818cf8'
          }}>
            <FileSpreadsheet size={24} />
          </div>

          <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '4px' }}>
            {isParsing ? 'Processing and parsing spreadsheet...' : 'Drop your CSV, Excel (.xlsx, .xls) or text file here'}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
            Supports custom columns (Name, Email, Company, Role, Custom Note) for dynamic placeholders
          </div>
        </div>
      )}

      {/* Mode 2: Paste List */}
      {activeInputTab === 'paste' && (
        <div>
          <textarea
            className="form-textarea"
            placeholder="Paste emails here (one per line or CSV):&#10;john@example.com&#10;Sarah Jenkins <sarah@acme.com>&#10;alex@tech.io, Alex Morgan, TechCorp"
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            style={{ minHeight: '110px', fontSize: '0.88rem', fontFamily: 'var(--font-mono)' }}
          />
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleParsePastedText}
            style={{ marginTop: '10px' }}
          >
            <Check size={14} />
            <span>Process & Add Recipients</span>
          </button>
        </div>
      )}

      {/* Mode 3: Manual Add Single */}
      {activeInputTab === 'manual' && (
        <form onSubmit={handleAddManual} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr auto', gap: '10px', alignItems: 'center' }}>
          <input
            type="email"
            className="form-input"
            placeholder="email@domain.com *"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            required
          />
          <input
            type="text"
            className="form-input"
            placeholder="Recipient Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <input
            type="text"
            className="form-input"
            placeholder="Company (optional)"
            value={newCompany}
            onChange={(e) => setNewCompany(e.target.value)}
          />
          <button type="submit" className="btn btn-primary" style={{ padding: '11px 16px' }}>
            <Plus size={16} />
            <span>Add</span>
          </button>
        </form>
      )}

      {/* Available Dynamic Variables Bar */}
      {detectedVariables.length > 0 && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          flexWrap: 'wrap'
        }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
            Available Variables:
          </span>
          {detectedVariables.map(v => (
            <span key={v} className="var-pill" title={`Use {{${v}}} in subject or email body`}>
              {`{{${v}}}`}
            </span>
          ))}
        </div>
      )}

      {/* Recipients Table / Grid */}
      {recipients.length > 0 && (
        <div>
          {/* Search bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', gap: '12px' }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: '280px' }}>
              <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input
                type="text"
                className="form-input"
                placeholder="Search recipients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '34px', paddingBottom: '7px', paddingTop: '7px', fontSize: '0.85rem' }}
              />
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Showing {filteredRecipients.length} of {recipients.length}
            </div>
          </div>

          {/* Table Container */}
          <div style={{
            maxHeight: '260px',
            overflowY: 'auto',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-input)'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-dim)', fontSize: '0.75rem' }}>
                  <th style={{ padding: '10px 14px', width: '36px' }}>#</th>
                  <th style={{ padding: '10px 14px' }}>Email Address</th>
                  <th style={{ padding: '10px 14px' }}>Name</th>
                  <th style={{ padding: '10px 14px' }}>Extra Fields</th>
                  <th style={{ padding: '10px 14px', width: '50px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecipients.map((r, i) => {
                  const extraKeys = Object.keys(r).filter(k => !['id', 'email', 'name', 'status', 'sentAt', 'error', 'messageId', 'data'].includes(k));
                  return (
                    <tr 
                      key={r.id || i} 
                      style={{ 
                        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                        transition: 'var(--transition)'
                      }}
                    >
                      <td style={{ padding: '10px 14px', color: 'var(--text-dim)', fontSize: '0.78rem' }}>{i + 1}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 500, color: 'var(--text-main)', fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
                        {r.email}
                      </td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>
                        {r.name || <span style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>Auto-inferred</span>}
                      </td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
                        {extraKeys.length > 0 ? (
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {extraKeys.slice(0, 2).map(k => (
                              <span key={k} style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '2px 6px', borderRadius: '4px' }}>
                                {k}: {String(r[k])}
                              </span>
                            ))}
                            {extraKeys.length > 2 && <span>+{extraKeys.length - 2} more</span>}
                          </div>
                        ) : '—'}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleRemove(r.id)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-dim)',
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: '4px'
                          }}
                          title="Remove recipient"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
