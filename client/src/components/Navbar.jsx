import React from 'react';
import { 
  Send, 
  Layers, 
  Activity, 
  History, 
  BookOpen, 
  Settings, 
  Mail, 
  Sun, 
  Moon,
  Sparkles,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  authStatus, 
  openAuthModal, 
  openSettingsModal,
  dispatchState,
  theme,
  toggleTheme
}) {
  const isRunning = dispatchState === 'running';

  return (
    <header className="navbar">
      <div className="navbar-container">
        {/* Brand */}
        <div className="nav-brand" onClick={() => setActiveTab('studio')}>
          <div className="brand-icon">
            <Send size={22} style={{ transform: 'rotate(-20deg)' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span className="brand-title">PostMaster</span>
            <span className="brand-badge">STUDIO</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="nav-tabs">
          <button
            className={`nav-tab-btn ${activeTab === 'studio' ? 'active' : ''}`}
            onClick={() => setActiveTab('studio')}
          >
            <Layers size={17} />
            <span>Campaign Studio</span>
          </button>

          <button
            className={`nav-tab-btn ${activeTab === 'dispatcher' ? 'active' : ''}`}
            onClick={() => setActiveTab('dispatcher')}
          >
            <Activity size={17} />
            <span>Live Monitor</span>
            {isRunning && (
              <span className="pulse-animation" style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#10b981',
                display: 'inline-block'
              }} />
            )}
          </button>

          <button
            className={`nav-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <History size={17} />
            <span>Campaign History</span>
          </button>

          <button
            className={`nav-tab-btn ${activeTab === 'templates' ? 'active' : ''}`}
            onClick={() => setActiveTab('templates')}
          >
            <BookOpen size={17} />
            <span>Templates</span>
          </button>
        </nav>

        {/* Right Section: Auth Pill + Theme + Settings */}
        <div className="nav-right">
          {/* Auth Status Pill */}
          <button 
            className="auth-status-pill"
            onClick={openAuthModal}
            title={authStatus.isConnected ? `Connected as ${authStatus.email}` : 'Click to connect your Google Account'}
          >
            <span className={`status-dot ${authStatus.isConnected ? 'connected' : 'disconnected'}`} />
            
            {authStatus.isConnected ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {authStatus.avatar ? (
                  <img 
                    src={authStatus.avatar} 
                    alt="avatar" 
                    style={{ width: '22px', height: '22px', borderRadius: '50%' }} 
                  />
                ) : (
                  <Mail size={15} color="#10b981" />
                )}
                <span style={{ fontWeight: 600, fontSize: '0.82rem', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {authStatus.email || 'Connected'}
                </span>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-amber)' }}>
                <AlertCircle size={15} />
                <span style={{ fontWeight: 600, fontSize: '0.82rem' }}>Connect Google</span>
              </div>
            )}
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="btn-close"
            style={{ padding: '8px' }}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
          >
            {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
          </button>

          {/* Settings Button */}
          <button
            onClick={openSettingsModal}
            className="btn-close"
            style={{ padding: '8px' }}
            title="Application Settings"
          >
            <Settings size={19} />
          </button>
        </div>
      </div>
    </header>
  );
}
