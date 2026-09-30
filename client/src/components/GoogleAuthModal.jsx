import React, { useState } from 'react';
import { 
  X, 
  Key, 
  ShieldCheck, 
  ExternalLink, 
  Mail, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  Lock, 
  Globe, 
  HelpCircle,
  LogOut,
  RefreshCw
} from 'lucide-react';
import { api } from '../utils/api';

export default function GoogleAuthModal({ 
  isOpen, 
  onClose, 
  authStatus, 
  onAuthUpdated, 
  addToast 
}) {
  const [activeMode, setActiveMode] = useState('app_password'); // 'app_password' | 'oauth'
  const [appEmail, setAppEmail] = useState(authStatus.email || '');
  const [appPassword, setAppPassword] = useState('');
  const [senderName, setSenderName] = useState(authStatus.name || '');
  const [clientId, setClientId] = useState(authStatus.googleClientId || '');
  const [clientSecret, setClientSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  if (!isOpen) return null;

  const handleAppPasswordConnect = async (e) => {
    e.preventDefault();
    if (!appEmail || !appPassword) {
      addToast('error', 'Please enter your Gmail address and 16-character App Password');
      return;
    }

    setLoading(true);
    try {
      const res = await api.saveAppPassword(appEmail, appPassword, senderName);
      addToast('success', res.message || 'Google account connected successfully!');
      onAuthUpdated();
      onClose();
    } catch (err) {
      addToast('error', err.message || 'Failed to authenticate Google App Password');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthConnect = async () => {
    setLoading(true);
    try {
      if (clientId && clientSecret) {
        await api.saveGoogleConfig(clientId, clientSecret);
      }
      const res = await api.getGoogleAuthUrl(clientId, clientSecret);
      if (res.url) {
        window.location.href = res.url;
      }
    } catch (err) {
      addToast('error', err.message || 'Failed to initiate Google OAuth login');
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    try {
      const res = await api.testConnection();
      addToast('success', res.message || 'Google mail server responded OK!');
      onAuthUpdated();
    } catch (err) {
      addToast('error', `Connection test failed: ${err.message}`);
    } finally {
      setTestingConnection(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect this Google account?')) return;
    try {
      await api.disconnectAuth();
      addToast('info', 'Google account disconnected.');
      onAuthUpdated();
    } catch (err) {
      addToast('error', err.message);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '640px' }}>
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
              <Mail size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0 }}>Connect Google Account</h3>
              <p style={{ margin: 0, fontSize: '0.8rem' }}>Authorize your Gmail to dispatch personalized emails</p>
            </div>
          </div>
          <button className="btn-close" onClick={onClose}><X size={20} /></button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* Active Connection Banner */}
          {authStatus.isConnected && (
            <div style={{
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <CheckCircle2 size={24} color="#10b981" />
                <div>
                  <div style={{ fontWeight: 600, color: '#34d399', fontSize: '0.9rem' }}>
                    Active Sender Connected ({authStatus.type === 'oauth' ? 'OAuth 2.0' : 'Google App Password'})
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    {authStatus.email} {authStatus.name ? `(${authStatus.name})` : ''}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  className="btn btn-secondary btn-sm"
                  onClick={handleTestConnection}
                  disabled={testingConnection}
                  title="Test sending connection"
                >
                  {testingConnection ? <Loader2 size={14} className="pulse-animation" /> : <RefreshCw size={14} />}
                  <span>Test Ping</span>
                </button>
                <button 
                  className="btn btn-danger btn-sm"
                  onClick={handleDisconnect}
                  title="Disconnect sender"
                >
                  <LogOut size={14} />
                  <span>Disconnect</span>
                </button>
              </div>
            </div>
          )}

          {/* Mode Selector Tabs */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '10px',
            marginBottom: '20px'
          }}>
            <button
              type="button"
              onClick={() => setActiveMode('app_password')}
              style={{
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                background: activeMode === 'app_password' ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-input)',
                border: activeMode === 'app_password' ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                color: activeMode === 'app_password' ? '#ffffff' : 'var(--text-muted)',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                transition: 'var(--transition)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '0.9rem' }}>
                <Key size={16} color="#6366f1" />
                <span>Google App Password</span>
                <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>Instant</span>
              </div>
              <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Direct Gmail connection in 30 seconds. No GCP setup needed.</div>
            </button>

            <button
              type="button"
              onClick={() => setActiveMode('oauth')}
              style={{
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                background: activeMode === 'oauth' ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-input)',
                border: activeMode === 'oauth' ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                color: activeMode === 'oauth' ? '#ffffff' : 'var(--text-muted)',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                transition: 'var(--transition)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '0.9rem' }}>
                <Globe size={16} color="#06b6d4" />
                <span>Google OAuth 2.0</span>
              </div>
              <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>One-click Google Sign-in with GCP Client ID & Secret.</div>
            </button>
          </div>

          {/* Form: App Password */}
          {activeMode === 'app_password' && (
            <form onSubmit={handleAppPasswordConnect}>
              <div className="form-group">
                <label className="form-label">
                  <span>Gmail Address</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Your Google email</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="yourname@gmail.com"
                    value={appEmail}
                    onChange={e => setAppEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  <span>Sender Display Name (Optional)</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>e.g. John from TechCorp</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="John Doe"
                  value={senderName}
                  onChange={e => setSenderName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  <span>Google App Password (16 Letters)</span>
                  <button
                    type="button"
                    onClick={() => setShowGuide(!showGuide)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--primary)',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <HelpCircle size={13} />
                    {showGuide ? 'Hide Guide' : 'How to generate? (30 sec)'}
                  </button>
                </label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="xxxx xxxx xxxx xxxx"
                  value={appPassword}
                  onChange={e => setAppPassword(e.target.value)}
                  required
                />
              </div>

              {/* Guide Accordion */}
              {showGuide && (
                <div style={{
                  background: 'rgba(99, 102, 241, 0.08)',
                  border: '1px solid rgba(99, 102, 241, 0.2)',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px 18px',
                  marginBottom: '16px',
                  fontSize: '0.83rem',
                  lineHeight: '1.5'
                }}>
                  <div style={{ fontWeight: 600, color: '#818cf8', marginBottom: '6px' }}>
                    How to create a Google App Password:
                  </div>
                  <ol style={{ paddingLeft: '18px', color: 'var(--text-muted)' }}>
                    <li>Go to <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" style={{ color: '#06b6d4', textDecoration: 'underline' }}>myaccount.google.com/apppasswords <ExternalLink size={11} style={{ display: 'inline' }} /></a></li>
                    <li>Ensure <strong>2-Step Verification</strong> is enabled on your Google account.</li>
                    <li>Enter an app name like <code>PostMaster</code> and click <strong>Create</strong>.</li>
                    <li>Copy the 16-character generated code and paste it in the field above!</li>
                  </ol>
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '8px' }}
                disabled={loading}
              >
                {loading ? <Loader2 size={18} className="pulse-animation" /> : <ShieldCheck size={18} />}
                <span>{loading ? 'Verifying with Gmail...' : 'Connect & Save Gmail Account'}</span>
              </button>
            </form>
          )}

          {/* Form: OAuth 2.0 */}
          {activeMode === 'oauth' && (
            <div>
              <p style={{ fontSize: '0.85rem', marginBottom: '16px' }}>
                Enter your Google Cloud Console OAuth 2.0 Client ID and Secret to enable one-click browser authentication with official Google permissions.
              </p>

              <div className="form-group">
                <label className="form-label">OAuth Client ID</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="xxxxx.apps.googleusercontent.com"
                  value={clientId}
                  onChange={e => setClientId(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">OAuth Client Secret</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="GOCSPX-xxxx"
                  value={clientSecret}
                  onChange={e => setClientSecret(e.target.value)}
                />
              </div>

              <div style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '12px',
                marginBottom: '16px',
                fontSize: '0.8rem'
              }}>
                <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>Authorized Redirect URI:</div>
                <code style={{ color: '#38bdf8', wordBreak: 'break-all', fontFamily: 'var(--font-mono)' }}>
                  http://localhost:5000/api/auth/google/callback
                </code>
              </div>

              <button
                type="button"
                onClick={handleOAuthConnect}
                className="btn btn-primary"
                style={{ width: '100%' }}
                disabled={loading}
              >
                {loading ? <Loader2 size={18} className="pulse-animation" /> : <Globe size={18} />}
                <span>Sign in with Google OAuth</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
