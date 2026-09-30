import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, 
  Play, 
  Pause, 
  Square, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Zap, 
  Terminal, 
  Copy, 
  Trash2, 
  Sparkles,
  Layers,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { api } from '../utils/api';
import confetti from 'canvas-confetti';

export default function DispatchMonitor({ 
  dispatchState, 
  stats, 
  logs, 
  activeCampaign, 
  onPause, 
  onResume, 
  onStop, 
  onSwitchToStudio,
  addToast 
}) {
  const [logFilter, setLogFilter] = useState('all'); // 'all' | 'success' | 'error'
  const [autoScroll, setAutoScroll] = useState(true);
  const logTerminalRef = useRef(null);
  const prevCompletedRef = useRef(false);

  // Auto-scroll log terminal when new log arrives
  useEffect(() => {
    if (autoScroll && logTerminalRef.current) {
      logTerminalRef.current.scrollTop = logTerminalRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  // Trigger celebration confetti on campaign completion
  useEffect(() => {
    if (dispatchState === 'completed' && !prevCompletedRef.current) {
      prevCompletedRef.current = true;
      try {
        confetti({
          particleCount: 120,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (e) {}
    } else if (dispatchState !== 'completed') {
      prevCompletedRef.current = false;
    }
  }, [dispatchState]);

  const filteredLogs = logs.filter(log => {
    if (logFilter === 'success') return log.type === 'success';
    if (logFilter === 'error') return log.type === 'error';
    return true;
  });

  const isRunning = dispatchState === 'running';
  const isPaused = dispatchState === 'paused';
  const isCompleted = dispatchState === 'completed';
  const isStopped = dispatchState === 'stopped';
  const isIdle = dispatchState === 'idle';

  const formatTimestamp = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleTimeString();
  };

  const copyLogs = () => {
    const text = logs.map(l => `[${formatTimestamp(l.timestamp)}] [${l.type.toUpperCase()}] ${l.message}`).join('\n');
    navigator.clipboard.writeText(text);
    addToast('info', 'Console logs copied to clipboard!');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner Card */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: isRunning 
                ? 'linear-gradient(135deg, #10b981, #059669)' 
                : isPaused 
                ? 'linear-gradient(135deg, #f59e0b, #d97706)' 
                : 'linear-gradient(135deg, #6366f1, #4f46e5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              boxShadow: isRunning ? '0 0 20px rgba(16, 185, 129, 0.4)' : 'none'
            }}>
              <Activity size={24} className={isRunning ? 'pulse-animation' : ''} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 style={{ margin: 0, fontSize: '1.4rem' }}>
                  {activeCampaign ? activeCampaign.name : 'Dispatch Command Center'}
                </h2>
                <span className={`badge ${
                  isRunning ? 'badge-success' : isPaused ? 'badge-warning' : isCompleted ? 'badge-primary' : 'badge-danger'
                }`}>
                  {dispatchState.toUpperCase()}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '0.84rem' }}>
                {activeCampaign?.subject ? `Subject: "${activeCampaign.subject}"` : 'Real-time multi-threaded email campaign dispatcher'}
              </p>
            </div>
          </div>

          {/* Action Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {isRunning && (
              <button className="btn btn-secondary" onClick={onPause}>
                <Pause size={16} />
                <span>Pause Dispatch</span>
              </button>
            )}

            {isPaused && (
              <button className="btn btn-success" onClick={onResume}>
                <Play size={16} />
                <span>Resume Dispatch</span>
              </button>
            )}

            {(isRunning || isPaused) && (
              <button className="btn btn-danger" onClick={onStop}>
                <Square size={16} />
                <span>Stop Campaign</span>
              </button>
            )}

            {(isCompleted || isStopped || isIdle) && (
              <button className="btn btn-primary" onClick={onSwitchToStudio}>
                <Layers size={16} />
                <span>Compose New Campaign</span>
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div style={{ marginTop: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '0.85rem' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
              {isCompleted ? 'Campaign Completed Successfully' : isRunning ? 'Dispatching Emails in Real Time...' : 'Progress Status'}
            </span>
            <span style={{ fontWeight: 700, color: '#818cf8', fontFamily: 'var(--font-mono)' }}>
              {stats.progressPercent || 0}%
            </span>
          </div>

          <div className="progress-track" style={{ height: '14px' }}>
            <div 
              className="progress-fill"
              style={{ width: `${stats.progressPercent || 0}%` }}
            />
          </div>
        </div>

        {/* Anti-Spam Throttling Notice */}
        <div style={{
          marginTop: '16px',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-sm)',
          padding: '8px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.78rem',
          color: 'var(--text-dim)'
        }}>
          <Zap size={14} color="#f59e0b" />
          <span>
            <strong>Smart Throttling Engine:</strong> Introducing random delay jitter (1.5s - 3s) between outgoing emails to protect Google sender reputation & prevent spam filtering.
          </span>
        </div>
      </div>

      {/* 4 Big Metric Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px'
      }}>
        {/* Total Card */}
        <div className="glass-card" style={{ padding: '20px', borderLeft: '4px solid #6366f1' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Total Audience
            </span>
            <Clock size={18} color="#6366f1" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '8px', color: 'var(--text-main)', fontFamily: 'var(--font-heading)' }}>
            {stats.total || 0}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '4px' }}>
            Recipients in campaign
          </div>
        </div>

        {/* Sent Card */}
        <div className="glass-card" style={{ padding: '20px', borderLeft: '4px solid #10b981' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#34d399', textTransform: 'uppercase' }}>
              Successfully Sent
            </span>
            <CheckCircle2 size={18} color="#10b981" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '8px', color: '#10b981', fontFamily: 'var(--font-heading)' }}>
            {stats.sent || 0}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '4px' }}>
            Delivered via Gmail API
          </div>
        </div>

        {/* Failed Card */}
        <div className="glass-card" style={{ padding: '20px', borderLeft: '4px solid #f43f5e' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#fb7185', textTransform: 'uppercase' }}>
              Delivery Failed
            </span>
            <XCircle size={18} color="#f43f5e" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '8px', color: '#f43f5e', fontFamily: 'var(--font-heading)' }}>
            {stats.failed || 0}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '4px' }}>
            Rejected or invalid addresses
          </div>
        </div>

        {/* Pending Card */}
        <div className="glass-card" style={{ padding: '20px', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#fbbf24', textTransform: 'uppercase' }}>
              Pending In Queue
            </span>
            <Activity size={18} color="#f59e0b" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '8px', color: '#fbbf24', fontFamily: 'var(--font-heading)' }}>
            {stats.pending || 0}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '4px' }}>
            Remaining to be processed
          </div>
        </div>
      </div>

      {/* Live Stream Terminal Console */}
      <div className="glass-card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Terminal size={18} color="#818cf8" />
            <h3 style={{ margin: 0, fontSize: '1.05rem' }}>Live Dispatch Stream Console</h3>
            <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>
              {filteredLogs.length} Events
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Filter buttons */}
            <div style={{ display: 'flex', background: 'var(--bg-input)', padding: '2px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              <button
                type="button"
                className={`btn btn-sm ${logFilter === 'all' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setLogFilter('all')}
                style={{ padding: '3px 8px', fontSize: '0.72rem', border: 'none' }}
              >
                All
              </button>
              <button
                type="button"
                className={`btn btn-sm ${logFilter === 'success' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setLogFilter('success')}
                style={{ padding: '3px 8px', fontSize: '0.72rem', border: 'none' }}
              >
                Success
              </button>
              <button
                type="button"
                className={`btn btn-sm ${logFilter === 'error' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setLogFilter('error')}
                style={{ padding: '3px 8px', fontSize: '0.72rem', border: 'none' }}
              >
                Errors
              </button>
            </div>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={copyLogs}
              title="Copy console output"
            >
              <Copy size={13} />
              <span>Copy</span>
            </button>
          </div>
        </div>

        {/* Terminal Log Window */}
        <div ref={logTerminalRef} className="log-terminal">
          {filteredLogs.length === 0 ? (
            <div style={{ color: 'var(--text-dim)', fontStyle: 'italic', padding: '12px' }}>
              Console ready. Logs will stream here live during email dispatch...
            </div>
          ) : (
            filteredLogs.map(item => (
              <div key={item.id} className={`log-line log-${item.type}`}>
                <span className="log-time">[{formatTimestamp(item.timestamp)}]</span>
                <span>{item.message}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
