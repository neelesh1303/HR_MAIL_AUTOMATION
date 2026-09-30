import React, { useState, useEffect } from 'react';
import { 
  X, 
  Settings, 
  Clock, 
  ShieldCheck, 
  Save, 
  Sliders, 
  User, 
  Mail, 
  Key,
  HelpCircle
} from 'lucide-react';
import { api } from '../utils/api';

export default function SettingsModal({ isOpen, onClose, addToast }) {
  const [settings, setSettings] = useState({
    defaultSenderName: '',
    defaultReplyTo: '',
    sendDelayMs: 2000,
    randomDelayJitterMs: 1000,
    batchSize: 50,
    maxRetries: 2
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const loadSettings = async () => {
      setLoading(true);
      try {
        const data = await api.getSettings();
        setSettings(prev => ({ ...prev, ...data }));
      } catch (err) {
        console.error('Settings load error:', err);
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateSettings(settings);
      addToast('success', 'Application settings saved successfully!');
      onClose();
    } catch (err) {
      addToast('error', err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
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
              <Sliders size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0 }}>Application & Throttle Settings</h3>
              <p style={{ margin: 0, fontSize: '0.8rem' }}>Configure anti-spam dispatch limits and defaults</p>
            </div>
          </div>
          <button className="btn-close" onClick={onClose}><X size={20} /></button>
        </div>

        <form onSubmit={handleSave}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Anti-Spam Throttling Section */}
            <div style={{
              background: 'rgba(99, 102, 241, 0.05)',
              border: '1px solid rgba(99, 102, 241, 0.15)',
              borderRadius: 'var(--radius-md)',
              padding: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Clock size={16} color="#818cf8" />
                <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>Anti-Spam Dispatch Delays</strong>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.78rem' }}>Base Delay (ms)</label>
                  <input
                    type="number"
                    min="500"
                    step="100"
                    className="form-input"
                    value={settings.sendDelayMs}
                    onChange={(e) => setSettings({ ...settings, sendDelayMs: parseInt(e.target.value) || 2000 })}
                  />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Default: 2000ms (2 seconds)</span>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.78rem' }}>Random Jitter (ms)</label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    className="form-input"
                    value={settings.randomDelayJitterMs}
                    onChange={(e) => setSettings({ ...settings, randomDelayJitterMs: parseInt(e.target.value) || 1000 })}
                  />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Simulates human behavior</span>
                </div>
              </div>
            </div>

            {/* Default Sender Settings */}
            <div className="form-group">
              <label className="form-label">Default From Display Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Alex from TechCorp"
                value={settings.defaultSenderName}
                onChange={(e) => setSettings({ ...settings, defaultSenderName: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Default Reply-To Address</label>
              <input
                type="email"
                className="form-input"
                placeholder="e.g. inquiries@techcorp.io"
                value={settings.defaultReplyTo}
                onChange={(e) => setSettings({ ...settings, defaultReplyTo: e.target.value })}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Max Retries on Error</label>
                <input
                  type="number"
                  min="0"
                  max="5"
                  className="form-input"
                  value={settings.maxRetries}
                  onChange={(e) => setSettings({ ...settings, maxRetries: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Batch Size</label>
                <input
                  type="number"
                  min="1"
                  max="200"
                  className="form-input"
                  value={settings.batchSize}
                  onChange={(e) => setSettings({ ...settings, batchSize: parseInt(e.target.value) || 50 })}
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <Save size={15} />
              <span>{saving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
