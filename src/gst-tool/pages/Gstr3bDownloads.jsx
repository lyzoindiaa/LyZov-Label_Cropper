import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { gstApi } from '../api/client';
import Gstr3bNavHeader from '../components/Gstr3bNavHeader';

function inr(paise) {
  const amt = (paise ?? 0) / 100;
  return '₹' + amt.toLocaleString('en-IN', { minimumFractionDigits: 2 });
}

const MONTH_NAMES = {
  '01':'January','02':'February','03':'March','04':'April','05':'May','06':'June',
  '07':'July','08':'August','09':'September','10':'October','11':'November','12':'December',
};

export default function Gstr3bDownloads() {
  const [sp] = useSearchParams();
  const [returnId, setReturnId] = useState(sp.get('returnId') || '');
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const id = sp.get('returnId');
    if (id) { setReturnId(id); loadSummary(id); }
  }, [sp]);

  async function loadSummary(id) {
    setLoading(true); setError('');
    try {
      const res = await gstApi.gstr3bSummary(id || returnId);
      setSummary(res);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  const ret = summary?.return3b;
  const mm = ret?.period?.substring(0, 2);
  const yy = ret?.period?.substring(2);
  const periodLabel = ret ? `${MONTH_NAMES[mm] || mm} ${yy}` : '';

  const hasMismatches = ret?.comparison?.diffs?.some(d => !d.isMatch);
  const hasITC = ret?.table4?.net_itc?.igstPaise > 0 || ret?.table4?.net_itc?.cgstPaise > 0;

  const netPayable = ret?.table6?.net_cash_payable;
  const totalPayable = netPayable
    ? (netPayable.igstPaise + netPayable.cgstPaise + netPayable.sgstPaise + netPayable.cessPaise)
    : null;

  return (
    <div style={{ padding: '28px 32px', color: '#e5e7eb', minHeight: '100vh', background: '#0f172a' }}>
      <Gstr3bNavHeader
        returnId={returnId}
        title="GSTR-3B Downloads & Filing Export"
        subtitle="Download the CA-ready multi-sheet Excel summary or GST Portal compliant JSON for your GSTR-3B return."
      />

      {/* Return ID */}
      <div style={{ background: '#1e293b', borderRadius: 12, padding: '18px 24px', marginBottom: 24, border: '1px solid #334155' }}>
        <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Return ID</label>
        <div style={{ display: 'flex', gap: 10 }}>
          <input value={returnId} onChange={e => setReturnId(e.target.value)} placeholder="Paste GSTR-3B Return ID"
            style={{ flex: 1, background: '#0f172a', border: '1px solid #334155', color: '#f1f5f9', borderRadius: 8, padding: '9px 14px', fontSize: 13 }} />
          <button onClick={() => loadSummary(returnId)} disabled={loading || !returnId}
            style={{ background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
            {loading ? 'Loading...' : 'Load'}
          </button>
        </div>
        {error && <p style={{ color: '#f87171', marginTop: 8, fontSize: 13 }}>❌ {error}</p>}
      </div>

      {/* Return Summary Card */}
      {ret && (
        <div style={{ background: '#1e293b', borderRadius: 14, padding: '22px 26px', marginBottom: 28, border: '1px solid #334155' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#f1f5f9' }}>Return Summary — {periodLabel}</h2>
            <span style={{ background: ret.status === 'RECONCILED' ? '#14532d' : '#1e3a5f',
              color: ret.status === 'RECONCILED' ? '#4ade80' : '#60a5fa',
              padding: '3px 12px', borderRadius: 12, fontSize: 12, fontWeight: 700 }}>{ret.status}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 18 }}>
            {[
              { label: 'Outward Taxable Value', val: ret.table31?.outward_taxable?.taxableValuePaise },
              { label: 'IGST Liability', val: ret.table31?.outward_taxable?.igstPaise },
              { label: 'CGST Liability', val: ret.table31?.outward_taxable?.cgstPaise },
              { label: 'SGST Liability', val: ret.table31?.outward_taxable?.sgstPaise },
              { label: 'Net ITC Available', val: (ret.table4?.net_itc?.igstPaise || 0) + (ret.table4?.net_itc?.cgstPaise || 0) + (ret.table4?.net_itc?.sgstPaise || 0) },
              { label: 'Total Cash to Deposit', val: totalPayable, color: '#f59e0b' },
            ].map(item => (
              <div key={item.label} style={{ background: '#0f172a', borderRadius: 8, padding: '12px 14px', border: '1px solid #1e3a5f' }}>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>{item.label}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: item.color || '#60a5fa', fontFamily: 'monospace' }}>
                  {item.val !== null && item.val !== undefined ? inr(item.val) : '—'}
                </div>
              </div>
            ))}
          </div>

          {/* Warnings */}
          {hasMismatches && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 12 }}>
              <p style={{ margin: 0, color: '#f87171', fontSize: 12 }}>
                ❌ This return has reconciliation mismatches. Review the Reconcile page before downloading.
              </p>
            </div>
          )}
          {!hasITC && (
            <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 12 }}>
              <p style={{ margin: 0, color: '#fbbf24', fontSize: 12 }}>
                ⚠ No GSTR-2B ITC computed. Upload GSTR-2B on the ITC Review page to include Input Tax Credit.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Download Cards */}
      {ret && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
          {/* Excel Download */}
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 16, padding: '28px 26px' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📊</div>
            <h3 style={{ margin: '0 0 8px', color: '#f1f5f9', fontSize: 17, fontWeight: 800 }}>CA Summary Excel</h3>
            <p style={{ color: '#64748b', fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>
              Multi-sheet workbook with Tables 3.1, 3.2, ITC breakdown, statutory set-off matrix, and reconciliation diff report.
            </p>
            <ul style={{ color: '#94a3b8', fontSize: 12, marginBottom: 20, paddingLeft: 16, lineHeight: 1.9 }}>
              <li>Sheet: Cover &amp; Business Info</li>
              <li>Sheet: Table 3.1 Outward Supplies</li>
              <li>Sheet: Table 3.2 Inter-State by State</li>
              <li>Sheet: Table 4 ITC Available &amp; Net</li>
              <li>Sheet: Set-Off Matrix &amp; Net Payable</li>
              <li>Sheet: GSTR-1 vs Portal Comparison</li>
            </ul>
            <button onClick={() => gstApi.gstr3bDownloadExcel(returnId)}
              style={{ width: '100%', background: 'linear-gradient(135deg, #059669, #065f46)', color: '#fff',
                border: 'none', borderRadius: 10, padding: '12px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              ⬇ Download Excel (.xlsx)
            </button>
          </div>

          {/* JSON Download */}
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 16, padding: '28px 26px' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
            <h3 style={{ margin: '0 0 8px', color: '#f1f5f9', fontSize: 17, fontWeight: 800 }}>Portal 3B JSON</h3>
            <p style={{ color: '#64748b', fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>
              GST Portal-compliant GSTR-3B JSON file. Load into the offline GSTR3B_Excel_Utility to validate before uploading to the portal.
            </p>
            <ul style={{ color: '#94a3b8', fontSize: 12, marginBottom: 20, paddingLeft: 16, lineHeight: 1.9 }}>
              <li>Contains: sup_details (Table 3.1)</li>
              <li>Contains: inter_sup (Table 3.2)</li>
              <li>Contains: itc_elg (Table 4)</li>
              <li>Contains: inward_sup (Table 5)</li>
              <li>Contains: intr_ltfee (Table 5.1)</li>
              <li>⚠ Verify in offline utility before portal upload</li>
            </ul>
            <button onClick={() => gstApi.gstr3bDownloadJson(returnId)}
              style={{ width: '100%', background: 'linear-gradient(135deg, #1d4ed8, #1e3a5f)', color: '#fff',
                border: 'none', borderRadius: 10, padding: '12px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              ⬇ Download JSON
            </button>
            <p style={{ color: '#475569', fontSize: 11, marginTop: 10, textAlign: 'center' }}>
              For Offline Tool verification, download from: Portal → Downloads → Offline Tools → GSTR3B_Excel_Utility
            </p>
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div style={{ marginTop: 28, padding: '16px 20px', background: '#1e293b', borderRadius: 10, border: '1px solid #334155' }}>
        <p style={{ margin: 0, color: '#64748b', fontSize: 12, lineHeight: 1.7 }}>
          <strong style={{ color: '#f59e0b' }}>Important:</strong> This tool prepares GSTR-3B data for review and audit purposes only.
          Actual filing, tax payment, and set-off happen on the official GST Portal. The portal auto-fills Table 3.1 and 3.2 from your GSTR-1.
          All values must be verified by your CA before filing. Tax credit claims are subject to GSTN matching and Section 17(5) restrictions.
        </p>
      </div>
    </div>
  );
}
