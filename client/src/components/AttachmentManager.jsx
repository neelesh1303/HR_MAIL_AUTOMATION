import React, { useState, useRef } from 'react';
import { 
  Paperclip, 
  Upload, 
  FileText, 
  File, 
  Image as ImageIcon, 
  Trash2, 
  AlertCircle, 
  CheckCircle,
  Loader2
} from 'lucide-react';
import { api } from '../utils/api';

export default function AttachmentManager({ attachments, setAttachments, addToast }) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const totalBytes = attachments.reduce((sum, a) => sum + (a.size || 0), 0);
  const totalMB = (totalBytes / (1024 * 1024)).toFixed(2);
  const isOverLimit = totalBytes > 25 * 1024 * 1024; // 25MB Gmail Limit

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimetype = '') => {
    if (mimetype.includes('image')) return <ImageIcon size={18} color="#06b6d4" />;
    if (mimetype.includes('pdf')) return <FileText size={18} color="#f43f5e" />;
    return <File size={18} color="#818cf8" />;
  };

  const handleUploadFiles = async (files) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);

    try {
      const uploadedList = [];
      for (const file of Array.from(files)) {
        if (file.size > 25 * 1024 * 1024) {
          addToast('error', `File "${file.name}" exceeds the 25MB limit.`);
          continue;
        }
        const res = await api.uploadAttachment(file);
        uploadedList.push(res);
      }

      if (uploadedList.length > 0) {
        setAttachments(prev => [...prev, ...uploadedList]);
        addToast('success', `Attached ${uploadedList.length} file(s)!`);
      }
    } catch (err) {
      addToast('error', err.message || 'Failed to upload attachment');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = async (att) => {
    try {
      if (att.filename) {
        await api.deleteAttachment(att.filename).catch(() => {});
      }
      setAttachments(prev => prev.filter(a => a.id !== att.id && a.filename !== att.filename));
    } catch (err) {
      setAttachments(prev => prev.filter(a => a.id !== att.id));
    }
  };

  return (
    <div className="glass-card" style={{ padding: '20px', marginTop: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Paperclip size={18} color="#818cf8" />
          <h4 style={{ margin: 0, fontSize: '0.98rem' }}>Documents & Attachments</h4>
          <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>
            {attachments.length} Attached
          </span>
        </div>

        <div style={{ fontSize: '0.8rem', color: isOverLimit ? 'var(--accent-rose)' : 'var(--text-dim)' }}>
          Total: <strong>{totalMB} MB</strong> / 25 MB Max
        </div>
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files) handleUploadFiles(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current && fileInputRef.current.click()}
        style={{
          border: `1.5px dashed ${isDragging ? 'var(--primary)' : 'var(--border-subtle)'}`,
          borderRadius: 'var(--radius-md)',
          padding: '16px',
          textAlign: 'center',
          cursor: 'pointer',
          background: isDragging ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-input)',
          transition: 'var(--transition)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px'
        }}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => e.target.files && handleUploadFiles(e.target.files)}
          multiple
          style={{ display: 'none' }}
        />

        {isUploading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
            <Loader2 size={18} className="pulse-animation" />
            <span style={{ fontSize: '0.85rem' }}>Uploading attachment...</span>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
            <Upload size={18} color="#818cf8" />
            <span style={{ fontSize: '0.85rem' }}>
              Click or drag documents here (PDF, DOCX, XLSX, Images, Presentations)
            </span>
          </div>
        )}
      </div>

      {/* Attachment List */}
      {attachments.length > 0 && (
        <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {attachments.map((att, idx) => (
            <div
              key={att.id || idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 14px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.85rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                {getFileIcon(att.mimetype)}
                <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {att.originalname || att.filename}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', flexShrink: 0 }}>
                  ({formatFileSize(att.size)})
                </span>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove(att);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-dim)',
                  cursor: 'pointer',
                  padding: '4px'
                }}
                title="Remove attachment"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
