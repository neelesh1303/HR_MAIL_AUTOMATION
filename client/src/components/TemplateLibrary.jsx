import React, { useState } from 'react';
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  Check, 
  Sparkles, 
  Send, 
  Tag, 
  X,
  FileText,
  Copy
} from 'lucide-react';
import { api } from '../utils/api';

export default function TemplateLibrary({ templates, onSelectTemplate, onTemplateCreated, onDeleteTemplate, addToast }) {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  // New template form
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('Sales & BD');
  const [newSubject, setNewSubject] = useState('');
  const [newBody, setNewBody] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const categories = ['All', 'Sales & BD', 'Career', 'Marketing', 'Finance', 'Custom'];

  const filteredTemplates = templates.filter(t => {
    if (selectedCategory === 'All') return true;
    return t.category === selectedCategory;
  });

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!newName || !newSubject || !newBody) {
      addToast('warning', 'Please fill in template name, subject, and body.');
      return;
    }

    setIsSaving(true);
    try {
      const saved = await api.createTemplate({
        name: newName,
        category: newCategory,
        subject: newSubject,
        body: newBody
      });
      onTemplateCreated(saved);
      setIsCreateModalOpen(false);
      setNewName('');
      setNewSubject('');
      setNewBody('');
      addToast('success', 'Custom template saved to library!');
    } catch (err) {
      addToast('error', err.message || 'Failed to save template');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header Banner */}
      <div className="glass-card" style={{ padding: '24px' }}>
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
              <BookOpen size={20} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.3rem' }}>Email Template Library</h2>
              <p style={{ margin: 0, fontSize: '0.84rem' }}>Pre-built outreach formulas and dynamic templates</p>
            </div>
          </div>

          <button
            className="btn btn-primary btn-sm"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus size={16} />
            <span>New Custom Template</span>
          </button>
        </div>

        {/* Category Pills */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
          {categories.map(cat => (
            <button
              key={cat}
              className={`btn btn-sm ${selectedCategory === cat ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setSelectedCategory(cat)}
              style={{ borderRadius: 'var(--radius-full)' }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Templates Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
        gap: '20px'
      }}>
        {filteredTemplates.map((t) => (
          <div
            key={t.id}
            className="glass-card"
            style={{
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '16px',
              transition: 'var(--transition)'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>
                  {t.category || 'General'}
                </span>
                {t.id.startsWith('tpl-') && parseInt(t.id.replace('tpl-', '')) > 10 ? (
                  <button
                    className="btn-close"
                    onClick={() => onDeleteTemplate(t.id)}
                    title="Delete custom template"
                  >
                    <Trash2 size={14} color="#f43f5e" />
                  </button>
                ) : null}
              </div>

              <h4 style={{ margin: '0 0 6px 0', fontSize: '1.05rem' }}>{t.name}</h4>
              <div style={{
                fontSize: '0.82rem',
                color: '#818cf8',
                background: 'rgba(99, 102, 241, 0.08)',
                padding: '6px 10px',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '12px',
                fontFamily: 'var(--font-mono)'
              }}>
                <strong>Subject:</strong> {t.subject}
              </div>

              <div
                style={{
                  fontSize: '0.82rem',
                  color: 'var(--text-muted)',
                  maxHeight: '110px',
                  overflow: 'hidden',
                  position: 'relative',
                  lineHeight: '1.5'
                }}
                dangerouslySetInnerHTML={{ __html: t.body }}
              />
            </div>

            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '14px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => onSelectTemplate(t)}
                style={{ width: '100%' }}
              >
                <Sparkles size={14} color="#818cf8" />
                <span>Load in Email Composer</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="modal-overlay" onClick={() => setIsCreateModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '640px' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>Create Custom Template</h3>
              <button className="btn-close" onClick={() => setIsCreateModalOpen(false)}><X size={20} /></button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Template Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Follow-up after Product Demo"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    className="form-select"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                  >
                    <option value="Sales & BD">Sales & BD</option>
                    <option value="Career">Career</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Finance">Finance</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Subject Line (Supports dynamic tags)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Following up regarding {{company}}"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email Body (HTML or Text with tags)</label>
                  <textarea
                    className="form-textarea"
                    placeholder="<p>Hi {{first_name || 'there'}},</p><p>...</p>"
                    value={newBody}
                    onChange={(e) => setNewBody(e.target.value)}
                    style={{ minHeight: '160px', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}
                    required
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsCreateModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
