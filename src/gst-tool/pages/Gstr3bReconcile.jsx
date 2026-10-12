import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { gstApi } from '../api/client';
import Gstr3bNavHeader from '../components/Gstr3bNavHeader';

function inr(paise) {
  const amt = (paise ?? 0) / 100;
  return '₹' + amt.toLocaleString('en-IN', { minimumFractionDigits: 2 });
}

function DiffRow({ diff }) {
  const isMatch = diff.isMatch;
  return (
    <tr style={{ borderTop: '1px solid #334155', background: isMatch ? 'transparent' : 'rgba(239,68,68,0.06)' }}>
      <td style={{ padding: '10px 16px', color: '#94a3b8', fontSize: 12, fontWeight: 700 }}>{diff.table}</td>
      <td style={{ padding: '10px 16px', color: '#cbd5e1', fontSize: 13 }}>{diff.label}</td>
      <td style={{ padding: '10px 16px', color: '#60a5fa', fontSize: 13, textAlign: 'right', fontFamily: 'monospace' }}>{inr(diff.toolValuePaise)}</td>
      <td style={{ padding: '10px 16px', color: '#a78bfa', fontSize: 13, textAlign: 'right', fontFamily: 'monospace' }}>{inr(diff.portalValuePaise)}</td>
      <td style={{ padding: '10px 16px', textAlign: 'right', fontSize: 13, fontFamily: 'monospace',
        color: isMatch ? '#4ade80' : '#f87171', fontWeight: isMatch ? 400 : 700 }}>
        {isMatch ? '—' : inr(diff.diffPaise)}
      </td>
      <td style={{ padding: '10px 16px', textAlign: 'center' }}>
        <span style={{ fontSize: 16 }}>{isMatch ? '✅' : '❌'}</span>
      </td>
    </tr>
  );
}

export default function Gstr3bReconcile() {
  const [sp] = useSearchParams();
  const [returnId, setReturnId] = useState(sp.get('returnId') || '');
  const [returnData, setReturnData] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [portalJsonText, setPortalJsonText] = useState('');
  const [loading, setLoading] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('json'); // 'json' | 'manual'
  const [manualFields, setManualFields] = useState({
    txval31a: '', igst31a: '', cgst31a: '', sgst31a: '', cess31a: '',
    txval31c: '',
  });

  useEffect(() => {
    const id = sp.get('returnId');
    if (id) { setReturnId(id); fetchSummary(id); }
  }, [sp]);

  async function fetchSummary(id) {
    try {
      const data = await gstApi.gstr3bSummary(id);
      setReturnData(data.return3b);
      if (data.return3b?.comparison?.diffs?.length) {
        setComparison(data.return3b.comparison);
      }
    } catch (e) { setError(e.message); }
  }

  async function handleCompareJson() {
    setError(''); setComparing(true);
    try {
      const parsed = JSON.parse(portalJsonText);
      const res = await gstApi.gstr3bCompare(returnId, parsed);
      setComparison(res.comparison);
    } catch (e) {
      setError(e.message || 'Invalid JSON or comparison failed');
    } finally { setComparing(false); }
  }

  async function handleCompareManual() {
    setError(''); setComparing(true);
    try {
      const toP = v => Math.round(parseFloat(v || '0') * 100);
      const manualPortalData = {
        table31: {
          outward_taxable: {
            taxableValuePaise: toP(manualFields.txval31a),
            igstPaise: toP(manualFields.igst31a),
            cgstPaise: toP(manualFields.cgst31a),
            sgstPaise: toP(manualFields.sgst31a),
            cessPaise: toP(manualFields.cess31a),
          },
          outward_nil_exempt: { taxableValuePaise: toP(manualFields.txval31c) },
        },
        table32: { supplies_unregistered: [] },
      };
      const res = await gstApi.gstr3bCompareManual(returnId, manualPortalData);
      setComparison(res.comparison);
    } catch (e) {
      setError(e.message);
    } finally { setComparing(false); }
  }

  const t31 = returnData?.table31;

  return (
    <div style={{ padding: '28px 32px', color: '#e5e7eb', minHeight: '100vh', background: '#0f172a' }}>
      <Gstr3bNavHeader
        returnId={returnId}
        title="GSTR-1 vs Portal 3B Reconciliation"
        subtitle="Compare our computed GSTR-3B values against the auto-filled figures on the GST Portal to spot discrepancies before filing."
      />

      {/* Return ID input */}
      <div style={{ background: '#1e293b', borderRadius: 12, padding: '20px 24px', marginBottom: 24, border: '1px solid #334155' }}>
        <label style={{ fontSize: 13, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Return ID</label>
        <div style={{ display: 'flex', gap: 10 }}>
          <input value={returnId} onChange={e => setReturnId(e.target.value)} placeholder="Paste GSTR-3B Return ID"
            style={{ flex: 1, background: '#0f172a', border: '1px solid #334155', color: '#f1f5f9', borderRadius: 8, padding: '9px 14px', fontSize: 13 }} />
          <button onClick={() => fetchSummary(returnId)} disabled={!returnId}
            style={{ background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
            Load
          </button>
        </div>
      </div>

      {/* Our computed values summary */}
      {t31 && (
        <div style={{ background: '#1e293b', borderRadius: 12, padding: '20px 24px', marginBottom: 24, border: '1px solid #334155' }}>
          <h3 style={{ color: '#60a5fa', fontSize: 14, margin: '0 0 14px', fontWeight: 700 }}>Our Tool's Computed Values</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            {[
              { label: '3.1(a) Taxable Value', val: t31.outward_taxable?.taxableValuePaise },
              { label: '3.1(a) IGST', val: t31.outward_taxable?.igstPaise },
              { label: '3.1(a) CGST', val: t31.outward_taxable?.cgstPaise },
              { label: '3.1(a) SGST', val: t31.outward_taxable?.sgstPaise },
              { label: '3.1(c) Nil/Exempt', val: t31.outward_nil_exempt?.taxableValuePaise },
            ].map(item => (
              <div key={item.label} style={{ background: '#0f172a', borderRadius: 8, padding: '12px 14px', border: '1px solid #1e3a5f' }}>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>{item.label}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#60a5fa', fontFamily: 'monospace' }}>{inr(item.val)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Portal data input */}
      {returnId && (
        <div style={{ background: '#1e293b', borderRadius: 12, padding: '20px 24px', marginBottom: 24, border: '1px solid #334155' }}>
          <h3 style={{ color: '#cbd5e1', fontSize: 14, margin: '0 0 14px', fontWeight: 700 }}>Portal 3B Data</h3>

          {/* Tab switcher */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {['json', 'manual'].map(t => (
              <button key={t} onClick={() => setTab(t)}
                style={{ background: tab === t ? '#1d4ed8' : '#0f172a', color: '#f1f5f9', border: '1px solid #334155',
                  borderRadius: 8, padding: '6px 18px', fontSize: 12, cursor: 'pointer', fontWeight: tab === t ? 700 : 400 }}>
                {t === 'json' ? '📁 Upload Portal JSON' : '✏️ Manual Entry'}
              </button>
            ))}
          </div>

          {tab === 'json' ? (
            <>
              <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>
                Paste portal GSTR-3B JSON (download from Portal → View Returns → 3B → Save JSON)
              </label>
              <textarea value={portalJsonText} onChange={e => setPortalJsonText(e.target.value)}
                rows={6} placeholder='{"gstin":"...","ret_period":"092026","sup_details":{...}}'
                style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', color: '#f1f5f9',
                  borderRadius: 8, padding: '10px', fontSize: 12, fontFamily: 'monospace', resize: 'vertical', boxSizing: 'border-box' }} />
              <button onClick={handleCompareJson} disabled={comparing || !portalJsonText}
                style={{ marginTop: 12, background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 24px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                {comparing ? 'Comparing...' : '🔍 Run Comparison'}
              </button>
            </>
          ) : (
            <>
              <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 10 }}>Enter the portal's auto-filled values in ₹ (Rupees)</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 14 }}>
                {[
                  { key: 'txval31a', label: '3.1(a) Taxable Value' },
                  { key: 'igst31a',  label: '3.1(a) IGST' },
                  { key: 'cgst31a',  label: '3.1(a) CGST' },
                  { key: 'sgst31a',  label: '3.1(a) SGST' },
                  { key: 'cess31a',  label: '3.1(a) Cess' },
                  { key: 'txval31c', label: '3.1(c) Nil/Exempt Value' },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 3 }}>{f.label} (₹)</label>
                    <input type="number" step="0.01" value={manualFields[f.key]}
                      onChange={e => setManualFields(prev => ({ ...prev, [f.key]: e.target.value }))}
                      style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', color: '#f1f5f9',
                        borderRadius: 8, padding: '8px 12px', fontSize: 13, boxSizing: 'border-box' }} />
                  </div>
                ))}
              </div>
              <button onClick={handleCompareManual} disabled={comparing}
                style={{ background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 24px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                {comparing ? 'Comparing...' : '🔍 Compare'}
              </button>
            </>
          )}

          {error && <p style={{ color: '#f87171', marginTop: 10, fontSize: 13 }}>❌ {error}</p>}
        </div>
      )}

      {/* Comparison results */}
      {comparison && (
        <div style={{ background: '#1e293b', borderRadius: 12, border: '1px solid #334155', overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#cbd5e1' }}>Comparison Result</h3>
            <span style={{ fontSize: 13, color: comparison.allMatched ? '#4ade80' : '#f87171', fontWeight: 700 }}>
              {comparison.allMatched ? '✅ All values matched' : `❌ ${comparison.diffs?.filter(d => !d.isMatch).length} mismatch(es) found`}
            </span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#0f172a' }}>
                {['Table', 'Field', 'Our Tool (₹)', 'Portal (₹)', 'Difference (₹)', 'Status'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: h.includes('₹') ? 'right' : 'left',
                    color: '#64748b', fontWeight: 600, fontSize: 11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(comparison.diffs || []).map((diff, i) => <DiffRow key={i} diff={diff} />)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
