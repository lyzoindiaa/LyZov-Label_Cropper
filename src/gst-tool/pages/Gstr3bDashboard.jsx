import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { gstApi, getActiveBusiness } from '../api/client';
import Gstr3bNavHeader from '../components/Gstr3bNavHeader';

const MONTHS = [
  '01','02','03','04','05','06','07','08','09','10','11','12',
];
const MONTH_NAMES = {
  '01':'January','02':'February','03':'March','04':'April','05':'May','06':'June',
  '07':'July','08':'August','09':'September','10':'October','11':'November','12':'December',
};

const now = new Date();
const defaultPeriod = `${String(now.getMonth() + 1).padStart(2,'0')}${now.getFullYear()}`;

function inr(paise) {
  const amt = (paise ?? 0) / 100;
  return '₹' + amt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function StatusBadge({ status }) {
  const map = {
    COMPUTED:      { bg: '#1e3a5f', color: '#60a5fa', label: 'Computed' },
    RECONCILED:    { bg: '#14532d', color: '#4ade80', label: 'Reconciled' },
    DRAFT:         { bg: '#374151', color: '#9ca3af', label: 'Draft' },
    FILED_ON_PORTAL: { bg: '#1c1917', color: '#fbbf24', label: 'Filed on Portal' },
  };
  const s = map[status] || map.DRAFT;
  return (
    <span style={{ background: s.bg, color: s.color, padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
      {s.label}
    </span>
  );
}

export default function Gstr3bDashboard() {
  const business = getActiveBusiness();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [computing, setComputing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [selMonth, setSelMonth] = useState(String(now.getMonth() + 1).padStart(2,'0'));
  const [selYear, setSelYear] = useState(String(now.getFullYear()));

  const period = `${selMonth}${selYear}`;

  const loadHistory = useCallback(async () => {
    if (!business) return;
    setLoading(true);
    try {
      const data = await gstApi.gstr3bHistory(business._id);
      setHistory(data.returns || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [business]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  async function handleCompute() {
    if (!business) return setError('Select a business first.');
    setError(''); setSuccess(''); setComputing(true);
    try {
      const res = await gstApi.gstr3bCompute(business._id, period);
      setSuccess(`GSTR-3B computed for ${MONTH_NAMES[selMonth]} ${selYear}. Return ID: ${res.returnId}`);
      loadHistory();
    } catch (e) {
      setError(e.message);
    } finally {
      setComputing(false);
    }
  }

  const years = [];
  for (let y = 2024; y <= now.getFullYear() + 1; y++) years.push(String(y));

  return (
    <div style={{ padding: '28px 32px', color: '#e5e7eb', minHeight: '100vh', background: '#0f172a' }}>
      <Gstr3bNavHeader
        title="GSTR-3B Helper"
        subtitle="Compute statutory Tables 3.1 & 3.2, reconcile vs Portal draft, review ITC, and calculate net tax payable."
      />

      {/* Compute Panel */}
      <div style={{ background: '#1e293b', borderRadius: 14, padding: '24px 28px', marginBottom: 28, border: '1px solid #334155' }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#cbd5e1', margin: '0 0 16px' }}>Compute for Period</h2>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Month</label>
            <select value={selMonth} onChange={e => setSelMonth(e.target.value)}
              style={{ background: '#0f172a', border: '1px solid #334155', color: '#f1f5f9', borderRadius: 8, padding: '8px 14px', fontSize: 14 }}>
              {MONTHS.map(m => <option key={m} value={m}>{MONTH_NAMES[m]}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Year</label>
            <select value={selYear} onChange={e => setSelYear(e.target.value)}
              style={{ background: '#0f172a', border: '1px solid #334155', color: '#f1f5f9', borderRadius: 8, padding: '8px 14px', fontSize: 14 }}>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <button onClick={handleCompute} disabled={computing || !business}
            style={{ background: computing ? '#1e3a5f' : 'linear-gradient(135deg, #3b82f6, #1d4ed8)', color: '#fff',
              border: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 700, fontSize: 14, cursor: 'pointer', height: 40 }}>
            {computing ? 'Computing...' : '⚡ Compute 3B'}
          </button>
        </div>
        {error   && <p style={{ color: '#f87171', marginTop: 12, fontSize: 13 }}>❌ {error}</p>}
        {success && <p style={{ color: '#4ade80', marginTop: 12, fontSize: 13 }}>✅ {success}</p>}
        {!business && <p style={{ color: '#f59e0b', marginTop: 10, fontSize: 13 }}>Go to Businesses to select an active business first.</p>}
      </div>

      {/* Quick Links */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14, marginBottom: 28 }}>
        {[
          { to: '/gst-tool/gstr3b/reconcile', emoji: '🔍', label: 'Reconcile', sub: 'Compare vs Portal' },
          { to: '/gst-tool/gstr3b/itc',       emoji: '📂', label: 'ITC Review', sub: 'GSTR-2B Upload' },
          { to: '/gst-tool/gstr3b/offset',    emoji: '🧮', label: 'Net Payable', sub: 'Set-off Calculator' },
          { to: '/gst-tool/gstr3b/downloads', emoji: '⬇', label: 'Downloads', sub: 'Excel & JSON' },
        ].map(item => (
          <Link key={item.to} to={item.to} style={{ textDecoration: 'none' }}>
            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: '18px 20px',
              transition: 'border-color 0.2s', cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#3b82f6'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#334155'}>
              <div style={{ fontSize: 24, marginBottom: 6 }}>{item.emoji}</div>
              <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 14 }}>{item.label}</div>
              <div style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>{item.sub}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* History Table */}
      <div style={{ background: '#1e293b', borderRadius: 14, border: '1px solid #334155', overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #334155' }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#cbd5e1' }}>Previous 3B Returns</h2>
        </div>
        {loading ? (
          <p style={{ padding: 24, color: '#64748b' }}>Loading history...</p>
        ) : history.length === 0 ? (
          <p style={{ padding: 24, color: '#64748b', textAlign: 'center' }}>No GSTR-3B returns computed yet. Use the panel above to get started.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#0f172a' }}>
                {['Period', 'Status', 'Reconciled', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 18px', textAlign: 'left', color: '#64748b', fontWeight: 600, fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.map(ret => {
                const mm = ret.period?.substring(0,2);
                const yy = ret.period?.substring(2);
                return (
                  <tr key={ret._id} style={{ borderTop: '1px solid #334155' }}>
                    <td style={{ padding: '12px 18px', color: '#f1f5f9', fontWeight: 600 }}>{MONTH_NAMES[mm]} {yy}</td>
                    <td style={{ padding: '12px 18px' }}><StatusBadge status={ret.status} /></td>
                    <td style={{ padding: '12px 18px', color: ret.comparison?.allMatched ? '#4ade80' : '#f87171' }}>
                      {ret.status === 'RECONCILED' ? (ret.comparison?.allMatched ? '✅ All Matched' : '❌ Has Mismatches') : '—'}
                    </td>
                    <td style={{ padding: '12px 18px' }}>
                      <Link to={`/gst-tool/gstr3b/reconcile?returnId=${ret._id}`}
                        style={{ color: '#60a5fa', fontSize: 12, textDecoration: 'none', marginRight: 14 }}>View</Link>
                      <Link to={`/gst-tool/gstr3b/downloads?returnId=${ret._id}`}
                        style={{ color: '#4ade80', fontSize: 12, textDecoration: 'none' }}>Download</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
