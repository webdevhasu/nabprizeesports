import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, increment, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { AlertTriangle, CheckCircle2, XCircle, Shield, Clock, Search, Ban, Eye } from 'lucide-react';
import AdminLayout from './AdminLayout';
import LoadingSpinner from '../components/LoadingSpinner';

const statusColors = {
  pending: { bg: '#FFF8E1', text: '#E88B00', icon: Clock },
  reviewed: { bg: '#E8F5E9', text: '#2E7D32', icon: CheckCircle2 },
  dismissed: { bg: '#F5F5F5', text: '#8A8078', icon: XCircle },
  actionTaken: { bg: '#FFEBEE', text: '#D9503F', icon: Ban },
};

export default function AdminReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setReports(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, []);

  const filteredReports = reports.filter(r => {
    if (filter !== 'all' && r.status !== filter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        r.suspectName?.toLowerCase().includes(q) ||
        r.suspectUid?.includes(q) ||
        r.reporterName?.toLowerCase().includes(q) ||
        r.reason?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const updateStatus = async (reportId, newStatus) => {
    try {
      await updateDoc(doc(db, 'reports', reportId), { status: newStatus });

      if (newStatus === 'actionTaken' && selectedReport) {
        // Find the suspect user by game UID and increment their reports count
        const usersSnap = await getDocs(collection(db, 'users'));
        for (const userDoc of usersSnap.docs) {
          const userData = userDoc.data();
          if (userData.gameUid === selectedReport.suspectUid || userData.ign === selectedReport.suspectName) {
            await updateDoc(doc(db, 'users', userDoc.id), {
              reportsCount: increment(1),
            });
            break;
          }
        }
      }

      setSelectedReport(null);
    } catch (e) {
      console.error('Report update error:', e);
      alert('Failed to update report status');
    }
  };

  const counts = {
    pending: reports.filter(r => r.status === 'pending').length,
    reviewed: reports.filter(r => r.status === 'reviewed').length,
    actionTaken: reports.filter(r => r.status === 'actionTaken').length,
    dismissed: reports.filter(r => r.status === 'dismissed').length,
  };

  return (
    <AdminLayout title="Player Reports" subtitle="Review and manage player reports">
      <div style={{ padding: '24px', maxWidth: '1200px' }}>

        {/* Status Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '20px' }}>
          {[
            { key: 'pending', label: 'Pending', count: counts.pending, color: '#E88B00', bg: '#FFF8E1' },
            { key: 'actionTaken', label: 'Action Taken', count: counts.actionTaken, color: '#D9503F', bg: '#FFEBEE' },
            { key: 'reviewed', label: 'Reviewed', count: counts.reviewed, color: '#2E7D32', bg: '#E8F5E9' },
            { key: 'dismissed', label: 'Dismissed', count: counts.dismissed, color: '#8A8078', bg: '#F5F5F5' },
          ].map(s => (
            <button
              key={s.key}
              onClick={() => setFilter(s.key)}
              style={{
                background: filter === s.key ? s.bg : '#FFFFFF',
                border: `1px solid ${filter === s.key ? s.color + '40' : '#EBE4DA'}`,
                borderRadius: '10px', padding: '14px',
                cursor: 'pointer', textAlign: 'left',
              }}
            >
              <div style={{ fontSize: '22px', fontWeight: 800, color: s.color }}>{s.count}</div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: s.color }}>{s.label}</div>
            </button>
          ))}
        </div>

        {/* Filter tabs + Search */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          {['pending', 'actionTaken', 'reviewed', 'dismissed', 'all'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '6px 14px', borderRadius: '8px', border: '1px solid',
                borderColor: filter === f ? '#FF6B4A' : '#EBE4DA',
                background: filter === f ? '#FFF3EC' : '#FFFFFF',
                color: filter === f ? '#FF6B4A' : '#5E5851',
                fontSize: '12px', fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize',
              }}
            >
              {f}
            </button>
          ))}
          <div style={{ flex: 1, minWidth: '180px', position: 'relative' }}>
            <Search size={14} color="#A69E94" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search reports..."
              style={{
                width: '100%', padding: '7px 10px 7px 32px', borderRadius: '8px',
                border: '1px solid #D9D3CC', fontSize: '12px', boxSizing: 'border-box', outline: 'none',
              }}
            />
          </div>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : filteredReports.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#8A8078' }}>
            <Shield size={36} color="#C4BCB2" style={{ margin: '0 auto 12px' }} />
            <p style={{ fontSize: '14px', fontWeight: 600 }}>No reports found</p>
            <p style={{ fontSize: '12px' }}>No {filter !== 'all' ? filter : ''} reports at the moment</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredReports.map(r => {
              const statusInfo = statusColors[r.status] || statusColors.pending;
              const StatusIcon = statusInfo.icon;
              return (
                <div
                  key={r.id}
                  onClick={() => setSelectedReport(r)}
                  style={{
                    background: '#FFFFFF', borderRadius: '12px', padding: '16px',
                    border: '1px solid #EBE4DA', cursor: 'pointer',
                    transition: 'all 0.15s', display: 'flex', gap: '14px', alignItems: 'flex-start',
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#FF6B4A'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#EBE4DA'}
                >
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '10px',
                    background: statusInfo.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <StatusIcon size={18} color={statusInfo.text} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 700, fontSize: '14px', color: '#2E2A26' }}>
                        {r.suspectName}
                      </span>
                      <span style={{
                        fontSize: '11px', padding: '2px 8px', borderRadius: '6px',
                        background: statusInfo.bg, color: statusInfo.text, fontWeight: 600,
                        textTransform: 'capitalize',
                      }}>
                        {r.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#8A8078', marginBottom: '2px' }}>
                      UID: {r.suspectUid} · Reason: {r.reason}
                    </div>
                    <div style={{ fontSize: '11px', color: '#C4BCB2' }}>
                      Reported by {r.reporterName} · {r.createdAt?.toDate ? timeAgo(r.createdAt.toDate()) : 'Just now'}
                    </div>
                  </div>
                  <Eye size={16} color="#C4BCB2" style={{ flexShrink: 0, marginTop: '4px' }} />
                </div>
              );
            })}
          </div>
        )}

        {/* Report Detail Modal */}
        {selectedReport && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', zIndex: 1000,
            display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px',
          }} onClick={() => setSelectedReport(null)}>
            <div style={{
              background: '#FFFFFF', borderRadius: '16px', width: '100%', maxWidth: '440px',
              maxHeight: '85vh', overflow: 'auto',
            }} onClick={e => e.stopPropagation()}>
              <div style={{
                padding: '18px 20px', borderBottom: '1px solid #F0E6D8',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <h3 style={{ fontWeight: 700, fontSize: '16px', color: '#2E2A26', margin: 0 }}>
                  Report Details
                </h3>
                <button onClick={() => setSelectedReport(null)} style={{
                  background: 'none', border: 'none', cursor: 'pointer', color: '#8A8078',
                }}>
                  <XCircle size={20} />
                </button>
              </div>
              <div style={{ padding: '20px' }}>
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ fontSize: '11px', color: '#8A8078', fontWeight: 600 }}>SUSPECT</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#2E2A26' }}>{selectedReport.suspectName}</div>
                  <div style={{ fontSize: '13px', color: '#5E5851' }}>UID: {selectedReport.suspectUid}</div>
                </div>
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ fontSize: '11px', color: '#8A8078', fontWeight: 600 }}>REASON</div>
                  <div style={{ fontSize: '13px', color: '#2E2A26', fontWeight: 600 }}>{selectedReport.reason}</div>
                </div>
                {selectedReport.details && (
                  <div style={{ marginBottom: '14px' }}>
                    <div style={{ fontSize: '11px', color: '#8A8078', fontWeight: 600 }}>ADDITIONAL DETAILS</div>
                    <div style={{ fontSize: '13px', color: '#5E5851', lineHeight: 1.5 }}>{selectedReport.details}</div>
                  </div>
                )}
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ fontSize: '11px', color: '#8A8078', fontWeight: 600 }}>TOURNAMENT</div>
                  <div style={{ fontSize: '13px', color: '#2E2A26', fontWeight: 600 }}>{selectedReport.tournamentName || 'N/A'}</div>
                </div>
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ fontSize: '11px', color: '#8A8078', fontWeight: 600 }}>REPORTED BY</div>
                  <div style={{ fontSize: '13px', color: '#2E2A26', fontWeight: 600 }}>{selectedReport.reporterName}</div>
                  {selectedReport.reporterEmail && (
                    <div style={{ fontSize: '12px', color: '#5E5851' }}>{selectedReport.reporterEmail}</div>
                  )}
                  <div style={{ fontSize: '11px', color: '#C4BCB2', marginTop: '2px' }}>
                    {selectedReport.createdAt?.toDate ? selectedReport.createdAt.toDate().toLocaleString() : 'Just now'}
                  </div>
                </div>

                {selectedReport.status === 'pending' && (
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => updateStatus(selectedReport.id, 'dismissed')}
                      style={{
                        flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #EBE4DA',
                        background: '#FAF8F5', cursor: 'pointer', fontWeight: 600, fontSize: '12px',
                        color: '#5E5851', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                      }}
                    >
                      <XCircle size={14} /> Dismiss
                    </button>
                    <button
                      onClick={() => updateStatus(selectedReport.id, 'actionTaken')}
                      style={{
                        flex: 1, padding: '10px', borderRadius: '8px', border: 'none',
                        background: '#D9503F', color: '#FFF', cursor: 'pointer', fontWeight: 600, fontSize: '12px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                      }}
                    >
                      <Ban size={14} /> Action Taken
                    </button>
                  </div>
                )}
                {selectedReport.status !== 'pending' && (
                  <div style={{
                    padding: '10px', borderRadius: '8px',
                    background: statusColors[selectedReport.status]?.bg || '#F5F5F5',
                    textAlign: 'center', fontSize: '12px', fontWeight: 600,
                    color: statusColors[selectedReport.status]?.text || '#8A8078',
                    textTransform: 'capitalize',
                  }}>
                    Already {selectedReport.status}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function timeAgo(date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
