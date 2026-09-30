import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export default function Toast({ toasts, removeToast }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      maxWidth: '420px',
      pointerEvents: 'none'
    }}>
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';
        const isWarning = toast.type === 'warning';

        const borderColor = isSuccess ? '#10b981' : isError ? '#f43f5e' : isWarning ? '#f59e0b' : '#6366f1';
        const bgColor = isSuccess ? 'rgba(16, 185, 129, 0.12)' : isError ? 'rgba(244, 63, 94, 0.12)' : isWarning ? 'rgba(245, 158, 11, 0.12)' : 'rgba(99, 102, 241, 0.12)';

        return (
          <div
            key={toast.id}
            style={{
              pointerEvents: 'auto',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              padding: '14px 18px',
              background: '#111622',
              backgroundColor: 'var(--bg-surface)',
              border: `1px solid ${borderColor}`,
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
              borderRadius: '10px',
              color: 'var(--text-main)',
              animation: 'scaleUp 0.2s ease-out'
            }}
          >
            <div style={{ flexShrink: 0, marginTop: '2px' }}>
              {isSuccess && <CheckCircle2 size={18} color="#10b981" />}
              {isError && <XCircle size={18} color="#f43f5e" />}
              {isWarning && <AlertTriangle size={18} color="#f59e0b" />}
              {!isSuccess && !isError && !isWarning && <Info size={18} color="#6366f1" />}
            </div>

            <div style={{ flex: 1, fontSize: '0.88rem' }}>
              {toast.title && <div style={{ fontWeight: 600, marginBottom: '2px' }}>{toast.title}</div>}
              <div style={{ color: 'var(--text-muted)', lineHeight: '1.4' }}>{toast.message}</div>
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-dim)',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
