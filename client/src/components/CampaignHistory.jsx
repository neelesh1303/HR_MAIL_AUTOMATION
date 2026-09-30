import React, { useState, useEffect } from 'react';
import { 
  History, 
  Download, 
  Trash2, 
  Eye, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Calendar, 
  RefreshCw, 
  Search,
  ExternalLink,
  X,
  FileSpreadsheet
} from 'lucide-react';
import { api } from '../utils/api';

export default function CampaignHistory({ onSelectCampaignToClone, addToast }) {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [detailsLoading, setDetailsLoading] = useState(false);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const data = await api.getCampaigns();
      setCampaigns(data);
    } catch (err) {
      addToast('error', 'Failed to fetch campaign history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleViewDetails = async (id) => {
    setDetailsLoading(true);
    try {
      const details = await api.getCampaignDetails(id);
      setSelectedCampaign(details);
    } catch (err) {
      addToast('error', 'Failed to load campaign audit details');
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this campaign history log?')) return;
    try {
      await api.deleteCampaign(id);
      setCampaigns(prev => prev.filter(c => c.id !== id));
      if (selectedCampaign?.id === id) setSelectedCampaign(null);
      addToast('info', 'Campaign deleted.');
    } catch (err) {
      addToast('error', err.message || 'Delete failed');
    }
  };

  const handleExportCsv = (id) => {
    window.open(`/api/campaigns/${id}/export-csv`, '_blank');
  };

  const filteredCampaigns = campaigns.filter(c => 
    (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.subject || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header Card */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(16, 185, 129, 0.2))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#818cf8',
              border: '1px solid rgba(99, 102, 241, 0.3)'
            }}>
              <History size={20} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.3rem' }}>Campaign Dispatch History</h2>
              <p style={{ margin: 0, fontSize: '0.84rem' }}>Review delivery performance, logs, and export reports</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-secondary btn-sm" onClick={fetchCampaigns} disabled={loading}>
              <RefreshCw size={14} className={loading ? 'pulse-animation' : ''} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div style={{ marginTop: '16px', position: 'relative', maxWidth: '360px' }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Search past campaigns..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '34px', fontSize: '0.85rem' }}
          />
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
        {filteredCampaigns.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-dim)' }}>
            {loading ? 'Loading campaign records...' : 'No past campaigns found. Launch a campaign from the Studio to view performance logs here!'}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-dim)', fontSize: '0.78rem' }}>
                  <th style={{ padding: '12px 18px' }}>Campaign Name & Subject</th>
                  <th style={{ padding: '12px 18px' }}>Date Dispatched</th>
                  <th style={{ padding: '12px 18px' }}>Delivered / Total</th>
                  <th style={{ padding: '12px 18px' }}>Success Rate</th>
                  <th style={{ padding: '12px 18px' }}>Status</th>
                  <th style={{ padding: '12px 18px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCampaigns.map((c) => {
                  const sent = c.stats?.sent || 0;
                  const total = c.stats?.total || c.recipientCount || 0;
                  const percent = total > 0 ? Math.round((sent / total) * 100) : 0;
                  const dateFormatted = new Date(c.createdAt).toLocaleDateString() + ' ' + new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                  return (
                    <tr
                      key={c.id}
                      onClick={() => handleViewDetails(c.id)}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        cursor: 'pointer',
                        transition: 'var(--transition)'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.92rem' }}>{c.name}</div>
                        <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem', marginTop: '2px' }}>{c.subject}</div>
                      </td>
                      <td style={{ padding: '14px 18px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                        {dateFormatted}
                      </td>
                      <td style={{ padding: '14px 18px', color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
                        <span style={{ color: '#10b981', fontWeight: 600 }}>{sent}</span> / {total}
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <span className={`badge ${percent >= 90 ? 'badge-success' : percent > 50 ? 'badge-warning' : 'badge-danger'}`}>
                          {percent}%
                        </span>
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <span className={`badge ${c.status === 'completed' ? 'badge-success' : c.status === 'running' ? 'badge-primary' : 'badge-warning'}`}>
                          {c.status}
                        </span>
                      </td>
                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleExportCsv(c.id);
                            }}
                            title="Export CSV Report"
                          >
                            <Download size={13} />
                            <span>CSV</span>
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={(e) => handleDelete(c.id, e)}
                            title="Delete campaign"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Campaign Details Drilldown Modal */}
      {selectedCampaign && (
        <div className="modal-overlay" onClick={() => setSelectedCampaign(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '880px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <History size={20} color="#818cf8" />
                <div>
                  <h3 style={{ margin: 0 }}>{selectedCampaign.name}</h3>
                  <p style={{ margin: 0, fontSize: '0.8rem' }}>Subject: "{selectedCampaign.subject}"</p>
                </div>
              </div>
              <button className="btn-close" onClick={() => setSelectedCampaign(null)}><X size={20} /></button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Stat Summary */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '12px',
                background: 'var(--bg-input)',
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)'
              }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>TOTAL RECIPIENTS</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    {selectedCampaign.stats?.total || selectedCampaign.recipients?.length || 0}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#34d399' }}>DELIVERED</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#10b981' }}>
                    {selectedCampaign.stats?.sent || 0}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#fb7185' }}>FAILED</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f43f5e' }}>
                    {selectedCampaign.stats?.failed || 0}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>ATTACHMENTS</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    {selectedCampaign.attachments?.length || 0}
                  </div>
                </div>
              </div>

              {/* Recipient breakdown list */}
              <div>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.95rem' }}>Recipient Delivery Audit Log</h4>
                <div style={{
                  maxHeight: '300px',
                  overflowY: 'auto',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-input)'
                }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-dim)' }}>
                        <th style={{ padding: '8px 12px' }}>Email Address</th>
                        <th style={{ padding: '8px 12px' }}>Recipient Name</th>
                        <th style={{ padding: '8px 12px' }}>Status</th>
                        <th style={{ padding: '8px 12px' }}>Message ID / Error</th>
                        <th style={{ padding: '8px 12px' }}>Sent Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedCampaign.recipients || []).map((r, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
                          <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)' }}>{r.email}</td>
                          <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>{r.name || '—'}</td>
                          <td style={{ padding: '8px 12px' }}>
                            <span className={`badge ${r.status === 'sent' ? 'badge-success' : r.status === 'failed' ? 'badge-danger' : 'badge-warning'}`} style={{ fontSize: '0.68rem' }}>
                              {r.status}
                            </span>
                          </td>
                          <td style={{ padding: '8px 12px', color: r.error ? '#f87171' : 'var(--text-dim)', fontSize: '0.78rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {r.error ? r.error : r.messageId ? `ID: ${r.messageId}` : '—'}
                          </td>
                          <td style={{ padding: '8px 12px', color: 'var(--text-dim)', fontSize: '0.75rem' }}>
                            {r.sentAt ? new Date(r.sentAt).toLocaleTimeString() : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-outline"
                onClick={() => handleExportCsv(selectedCampaign.id)}
              >
                <Download size={15} />
                <span>Export Report (.CSV)</span>
              </button>
              {onSelectCampaignToClone && (
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    onSelectCampaignToClone(selectedCampaign);
                    setSelectedCampaign(null);
                  }}
                >
                  <span>Re-use Content in Studio</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
