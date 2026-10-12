import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { gstApi } from '../api/client';
import Gstr3bNavHeader from '../components/Gstr3bNavHeader';

function inr(paise) {
  const amt = (paise ?? 0) / 100;
  return '₹' + amt.toLocaleString('en-IN', { minimumFractionDigits: 2 });
}

const ELIGIBILITY_OPTIONS = ['ELIGIBLE', 'INELIGIBLE', 'REVERSED'];
const ELIGIBILITY_COLORS  = { ELIGIBLE: '#4ade80', INELIGIBLE: '#f87171', REVERSED: '#fbbf24' };

export default function Gstr3bItcReview() {
  const [sp] = useSearchParams();
  const [returnId, setReturnId] = useState(sp.get('returnId') || '');
  const [upload, setUpload] = useState(null);
  const [computing, setComputing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [table4, setTable4] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [jsonText, setJsonText] = useState('');
  const [filterMp, setFilterMp] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const id = sp.get('returnId');
    if (id) { setReturnId(id); loadGstr2b(id); }
  }, [sp]);

  async function loadGstr2b(id) {
    try {
      const res = await gstApi.gstr3bGetGstr2b(id || returnId);
      setUpload(res.upload);
    } catch (e) {
      if (e.status !== 404) setError(e.message);
    }
  }

  async function handleUploadGstr2b() {
    if (!returnId || !jsonText) return;
    setError(''); setUploading(true);
    try {
      const parsed = JSON.parse(jsonText);
      await gstApi.gstr3bUploadGstr2b(returnId, parsed, 'GSTR2B.json');
      setSuccess('GSTR-2B uploaded and parsed successfully.');
      loadGstr2b(returnId);
    } catch (e) {
      setError(e.message || 'Invalid JSON or upload failed');
    } finally { setUploading(false); }
  }

  async function handleComputeItc() {
    if (!returnId) return;
    setError(''); setSuccess(''); setComputing(true);
    try {
      const res = await gstApi.gstr3bComputeItc(returnId);
      setTable4(res.table4);
      setSuccess('Table 4 ITC computed successfully.');
    } catch (e) {
      setError(e.message);
    } finally { setComputing(false); }
  }

  async function handleEligibilityChange(idx, val) {
    try {
      await gstApi.gstr3bUpdateItcEligibility(returnId, idx, val, '');
      // Update local state
      setUpload(prev => {
        const copy = { ...prev, invoices: [...prev.invoices] };
        copy.invoices[idx] = { ...copy.invoices[idx], eligibility: val };
        return copy;
      });
    } catch (e) {
      setError(e.message);
    }
  }

  const invoices = (upload?.invoices || [])
    .filter(inv => {
      if (filterMp && !inv.isMarketplaceFee) return false;
      if (search && !inv.supplierGstin.includes(search.toUpperCase()) && !inv.supplierName.toLowerCase().includes(search.toLowerCase()) && !inv.invoiceNumber.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });

  const t4 = table4;

  return (
    <div style={{ padding: '28px 32px', color: '#e5e7eb', minHeight: '100vh', background: '#0f172a' }}>
      <Gstr3bNavHeader
        returnId={returnId}
        title="GSTR-2B Upload & ITC Review"
        subtitle="Upload your GSTR-2B JSON to review Input Tax Credit. Mark marketplace fee invoices and set eligibility."
      />

      {/* Return ID */}
      <div style={{ background: '#1e293b', borderRadius: 12, padding: '20px 24px', marginBottom: 20, border: '1px solid #334155' }}>
        <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Return ID (from 3B Dashboard)</label>
        <div style={{ display: 'flex', gap: 10 }}>
          <input value={returnId} onChange={e => setReturnId(e.target.value)} placeholder="Paste GSTR-3B Return ID"
            style={{ flex: 1, background: '#0f172a', border: '1px solid #334155', color: '#f1f5f9', borderRadius: 8, padding: '9px 14px', fontSize: 13 }} />
          <button onClick={() => loadGstr2b(returnId)} disabled={!returnId}
            style={{ background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
            Load
          </button>
        </div>
      </div>

      {/* Upload GSTR-2B */}
      {!upload && (
        <div style={{ background: '#1e293b', borderRadius: 12, padding: '20px 24px', marginBottom: 20, border: '1px solid #334155' }}>
          <h3 style={{ color: '#cbd5e1', fontSize: 14, margin: '0 0 12px', fontWeight: 700 }}>Upload GSTR-2B JSON</h3>
          <p style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>
            Download from GST Portal: GSTR-2B → View → Download JSON
          </p>
          <textarea value={jsonText} onChange={e => setJsonText(e.target.value)} rows={6}
            placeholder='{"data":{"docdata":{"b2b":[...]}}}'
            style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', color: '#f1f5f9',
              borderRadius: 8, padding: 10, fontSize: 12, fontFamily: 'monospace', resize: 'vertical', boxSizing: 'border-box' }} />
          <button onClick={handleUploadGstr2b} disabled={uploading || !jsonText || !returnId}
            style={{ marginTop: 12, background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 24px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            {uploading ? 'Uploading...' : '📂 Upload & Parse'}
          </button>
        </div>
      )}

      {/* Stats Bar */}
      {upload && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Suppliers', val: upload.supplierCount },
            { label: 'Invoices', val: upload.invoiceCount },
            { label: 'Total IGST Credit', val: inr(upload.totalItcPaise?.igstPaise) },
            { label: 'Marketplace Fee ITC', val: inr(upload.marketplaceFeeItcPaise?.igstPaise) },
          ].map(s => (
            <div key={s.label} style={{ background: '#1e293b', borderRadius: 10, padding: '14px 16px', border: '1px solid #334155' }}>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#60a5fa' }}>{s.val}</div>
            </div>
          ))}
        </div>
      )}

      {/* Table 4 Summary (after compute) */}
      {t4 && (
        <div style={{ background: '#1e293b', borderRadius: 12, padding: '20px 24px', marginBottom: 20, border: '1px solid #1e3a5f' }}>
          <h3 style={{ color: '#60a5fa', fontSize: 14, margin: '0 0 14px', fontWeight: 700 }}>Table 4 — ITC Summary</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {['igst','cgst','sgst','cess'].map(type => (
              <div key={type} style={{ background: '#0f172a', borderRadius: 8, padding: '12px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4, textTransform: 'uppercase' }}>{type} Net ITC</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#4ade80', fontFamily: 'monospace' }}>
                  {inr(t4.net_itc?.[`${type}Paise`])}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      {upload && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <button onClick={handleComputeItc} disabled={computing}
            style={{ background: computing ? '#1e3a5f' : 'linear-gradient(135deg, #3b82f6, #1d4ed8)', color: '#fff',
              border: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            {computing ? 'Computing...' : '⚡ Compute Table 4 ITC'}
          </button>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: '#94a3b8', fontSize: 13 }}>
            <input type="checkbox" checked={filterMp} onChange={e => setFilterMp(e.target.checked)} />
            Show marketplace fee invoices only
          </label>
        </div>
      )}

      {error   && <p style={{ color: '#f87171', marginBottom: 16, fontSize: 13 }}>❌ {error}</p>}
      {success && <p style={{ color: '#4ade80', marginBottom: 16, fontSize: 13 }}>✅ {success}</p>}

      {/* Search */}
      {upload && (
        <div style={{ marginBottom: 14 }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search supplier GSTIN, name or invoice..."
            style={{ width: '100%', maxWidth: 400, background: '#1e293b', border: '1px solid #334155', color: '#f1f5f9',
              borderRadius: 8, padding: '8px 14px', fontSize: 13, boxSizing: 'border-box' }} />
        </div>
      )}

      {/* Invoice Table */}
      {upload && (
        <div style={{ background: '#1e293b', borderRadius: 12, border: '1px solid #334155', overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 900 }}>
            <thead>
              <tr style={{ background: '#0f172a' }}>
                {['Supplier GSTIN', 'Supplier Name', 'Invoice No.', 'Taxable (₹)', 'IGST (₹)', 'CGST (₹)', 'SGST (₹)', 'Marketplace', 'Eligibility'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: h.includes('₹') ? 'right' : 'left', color: '#64748b', fontWeight: 600, fontSize: 11, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr><td colSpan={9} style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>No invoices found.</td></tr>
              ) : invoices.map((inv, i) => {
                const originalIdx = upload.invoices.indexOf(inv);
                return (
                  <tr key={i} style={{ borderTop: '1px solid #334155', background: inv.isMarketplaceFee ? 'rgba(59,130,246,0.04)' : 'transparent' }}>
                    <td style={{ padding: '9px 12px', color: '#94a3b8', fontFamily: 'monospace', fontSize: 11 }}>{inv.supplierGstin}</td>
                    <td style={{ padding: '9px 12px', color: '#cbd5e1' }}>{inv.supplierName || '—'}</td>
                    <td style={{ padding: '9px 12px', color: '#94a3b8', fontFamily: 'monospace', fontSize: 11 }}>{inv.invoiceNumber}</td>
                    <td style={{ padding: '9px 12px', textAlign: 'right', color: '#f1f5f9', fontFamily: 'monospace' }}>{inr(inv.taxableValuePaise)}</td>
                    <td style={{ padding: '9px 12px', textAlign: 'right', color: '#f1f5f9', fontFamily: 'monospace' }}>{inr(inv.igstPaise)}</td>
                    <td style={{ padding: '9px 12px', textAlign: 'right', color: '#f1f5f9', fontFamily: 'monospace' }}>{inr(inv.cgstPaise)}</td>
                    <td style={{ padding: '9px 12px', textAlign: 'right', color: '#f1f5f9', fontFamily: 'monospace' }}>{inr(inv.sgstPaise)}</td>
                    <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                      {inv.isMarketplaceFee ? <span style={{ fontSize: 11, background: '#1e3a5f', color: '#60a5fa', padding: '2px 8px', borderRadius: 8 }}>{inv.marketplace}</span> : '—'}
                    </td>
                    <td style={{ padding: '9px 12px' }}>
                      <select value={inv.eligibility || 'ELIGIBLE'}
                        onChange={e => handleEligibilityChange(originalIdx, e.target.value)}
                        style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 6, padding: '4px 8px', fontSize: 11,
                          color: ELIGIBILITY_COLORS[inv.eligibility || 'ELIGIBLE'], fontWeight: 700 }}>
                        {ELIGIBILITY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
