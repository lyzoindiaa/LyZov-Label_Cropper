import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { gstApi } from '../api/client';
import Gstr3bNavHeader from '../components/Gstr3bNavHeader';

function inr(paise) {
  const amt = (paise ?? 0) / 100;
  return '₹' + amt.toLocaleString('en-IN', { minimumFractionDigits: 2 });
}

function SetOffRow({ label, igst, cgst, sgst, cess, highlight }) {
  const color = highlight ? '#4ade80' : '#cbd5e1';
  const fw = highlight ? 700 : 400;
  return (
    <tr style={{ borderTop: '1px solid #334155', fontWeight: fw }}>
      <td style={{ padding: '10px 16px', color: '#94a3b8', fontSize: 13 }}>{label}</td>
      {[igst, cgst, sgst, cess].map((v, i) => (
        <td key={i} style={{ padding: '10px 16px', textAlign: 'right', color, fontSize: 13, fontFamily: 'monospace' }}>
          {(v ?? 0) !== 0 ? inr(v) : '—'}
        </td>
      ))}
    </tr>
  );
}

export default function Gstr3bOffsetPayable() {
  const [sp] = useSearchParams();
  const [returnId, setReturnId] = useState(sp.get('returnId') || '');
  const [summary, setSummary] = useState(null);
  const [table6, setTable6] = useState(null);
  const [loading, setLoading] = useState(false);
  const [computing, setComputing] = useState(false);
  const [savingLedger, setSavingLedger] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Cash ledger inputs (in rupees, converted to paise on save)
  const [tcs, setTcs] = useState({ igst: '', cgst: '', sgst: '' });
  const [cash, setCash] = useState({ igst: '', cgst: '', sgst: '', cess: '' });
  const [interestFee, setInterestFee] = useState({ igst: '', cgst: '', sgst: '', cgstLateFee: '', sgstLateFee: '' });

  useEffect(() => {
    const id = sp.get('returnId');
    if (id) { setReturnId(id); loadSummary(id); }
  }, [sp]);

  async function loadSummary(id) {
    setLoading(true);
    try {
      const res = await gstApi.gstr3bSummary(id || returnId);
      setSummary(res);
      if (res.return3b?.table6?.tax_payable) setTable6(res.return3b.table6);
      if (res.cashLedger) {
        const cl = res.cashLedger;
        const toR = p => p ? String(p / 100) : '';
        setTcs({ igst: toR(cl.tcsCredits?.igstPaise), cgst: toR(cl.tcsCredits?.cgstPaise), sgst: toR(cl.tcsCredits?.sgstPaise) });
        setCash({ igst: toR(cl.cashBalance?.igstPaise), cgst: toR(cl.cashBalance?.cgstPaise), sgst: toR(cl.cashBalance?.sgstPaise), cess: toR(cl.cashBalance?.cessPaise) });
      }
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function handleSaveLedger() {
    setError(''); setSavingLedger(true);
    try {
      const toP = v => Math.round(parseFloat(v || 0) * 100);
      await gstApi.gstr3bSaveCashLedger(returnId, {
        tcsCredits:  { igstPaise: toP(tcs.igst), cgstPaise: toP(tcs.cgst), sgstPaise: toP(tcs.sgst) },
        cashBalance: { igstPaise: toP(cash.igst), cgstPaise: toP(cash.cgst), sgstPaise: toP(cash.sgst), cessPaise: toP(cash.cess) },
      });
      setSuccess('Cash ledger saved.');
    } catch (e) { setError(e.message); }
    finally { setSavingLedger(false); }
  }

  async function handleSaveInterestAndCompute() {
    setError(''); setSuccess(''); setComputing(true);
    try {
      const toP = v => Math.round(parseFloat(v || 0) * 100);

      // Save interest/late fee into the return's table51 via compute-offset
      // First save ledger
      await handleSaveLedger();
      // Then compute
      const res = await gstApi.gstr3bComputeOffset(returnId);
      setTable6(res.table6);
      setSuccess('Set-off computed. Review the net cash payable below.');
    } catch (e) { setError(e.message); }
    finally { setComputing(false); }
  }

  const t6 = table6;
  const so = t6?.paid_through_itc || {};
  const t31 = summary?.return3b?.table31;
  const t4n  = summary?.return3b?.table4?.net_itc;

  return (
    <div style={{ padding: '28px 32px', color: '#e5e7eb', minHeight: '100vh', background: '#0f172a' }}>
      <Gstr3bNavHeader
        returnId={returnId}
        title="Tax Set-Off & Net Cash Payable"
        subtitle="Applies the statutory GST credit utilization order (IGST → CGST → SGST), deducts TCS and cash ledger, and shows the exact cash to deposit."
      />

      {/* Return ID */}
      <div style={{ background: '#1e293b', borderRadius: 12, padding: '18px 24px', marginBottom: 20, border: '1px solid #334155' }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <input value={returnId} onChange={e => setReturnId(e.target.value)} placeholder="Paste GSTR-3B Return ID"
            style={{ flex: 1, background: '#0f172a', border: '1px solid #334155', color: '#f1f5f9', borderRadius: 8, padding: '9px 14px', fontSize: 13 }} />
          <button onClick={() => loadSummary(returnId)} disabled={loading || !returnId}
            style={{ background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
            {loading ? 'Loading...' : 'Load'}
          </button>
        </div>
      </div>

      {/* Liability & ITC overview */}
      {t31 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'IGST Liability', val: t31.outward_taxable?.igstPaise, color: '#f87171' },
            { label: 'CGST Liability', val: t31.outward_taxable?.cgstPaise, color: '#f87171' },
            { label: 'SGST Liability', val: t31.outward_taxable?.sgstPaise, color: '#f87171' },
            { label: 'Net IGST ITC',   val: t4n?.igstPaise, color: '#4ade80' },
            { label: 'Net CGST ITC',   val: t4n?.cgstPaise, color: '#4ade80' },
            { label: 'Net SGST ITC',   val: t4n?.sgstPaise, color: '#4ade80' },
          ].map(item => (
            <div key={item.label} style={{ background: '#1e293b', borderRadius: 10, padding: '14px 16px', border: '1px solid #334155' }}>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>{item.label}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: item.color, fontFamily: 'monospace' }}>{inr(item.val)}</div>
            </div>
          ))}
        </div>
      )}

      {/* TCS & Cash Ledger inputs */}
      {returnId && (
        <div style={{ background: '#1e293b', borderRadius: 12, padding: '20px 24px', marginBottom: 20, border: '1px solid #334155' }}>
          <h3 style={{ color: '#cbd5e1', fontSize: 14, margin: '0 0 4px', fontWeight: 700 }}>TCS (Section 52) & Cash Ledger Balance (₹)</h3>
          <p style={{ fontSize: 12, color: '#64748b', marginBottom: 14 }}>
            Enter TCS credits received from Amazon/Flipkart and your electronic cash ledger balance for this period.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 14 }}>
            {[
              { label: 'TCS IGST Credit', state: tcs, key: 'igst', setter: setTcs },
              { label: 'TCS CGST Credit', state: tcs, key: 'cgst', setter: setTcs },
              { label: 'TCS SGST Credit', state: tcs, key: 'sgst', setter: setTcs },
              { label: 'Cash Ledger IGST', state: cash, key: 'igst', setter: setCash },
              { label: 'Cash Ledger CGST', state: cash, key: 'cgst', setter: setCash },
              { label: 'Cash Ledger SGST', state: cash, key: 'sgst', setter: setCash },
              { label: 'Cash Ledger Cess', state: cash, key: 'cess', setter: setCash },
            ].map(f => (
              <div key={f.label}>
                <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 3 }}>{f.label}</label>
                <input type="number" step="0.01" value={f.state[f.key]}
                  onChange={e => f.setter(prev => ({ ...prev, [f.key]: e.target.value }))}
                  style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', color: '#f1f5f9',
                    borderRadius: 8, padding: '8px 12px', fontSize: 13, boxSizing: 'border-box' }} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button onClick={handleSaveInterestAndCompute} disabled={computing || !returnId}
              style={{ background: computing ? '#1e3a5f' : 'linear-gradient(135deg, #3b82f6, #1d4ed8)', color: '#fff',
                border: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              {computing ? 'Computing...' : '🧮 Save & Compute Net Payable'}
            </button>
          </div>
          {error   && <p style={{ color: '#f87171', marginTop: 10, fontSize: 13 }}>❌ {error}</p>}
          {success && <p style={{ color: '#4ade80', marginTop: 10, fontSize: 13 }}>✅ {success}</p>}
        </div>
      )}

      {/* Set-Off Matrix */}
      {t6 && (
        <>
          <div style={{ background: '#1e293b', borderRadius: 12, border: '1px solid #334155', overflow: 'hidden', marginBottom: 20 }}>
            <div style={{ padding: '14px 24px', borderBottom: '1px solid #334155' }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#cbd5e1' }}>Statutory Set-Off Matrix</h3>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#0f172a' }}>
                  {['Credit Utilization', 'IGST (₹)', 'CGST (₹)', 'SGST (₹)', 'Cess (₹)'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: h === 'Credit Utilization' ? 'left' : 'right',
                      color: '#64748b', fontWeight: 600, fontSize: 11 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <SetOffRow label="(A) Tax Payable" igst={t6.tax_payable?.igstPaise} cgst={t6.tax_payable?.cgstPaise} sgst={t6.tax_payable?.sgstPaise} cess={t6.tax_payable?.cessPaise} />
                <SetOffRow label="IGST credit → IGST liability" igst={so.igst_used_for_igst} cgst={null} sgst={null} cess={null} />
                <SetOffRow label="IGST credit → CGST liability" igst={null} cgst={so.igst_used_for_cgst} sgst={null} cess={null} />
                <SetOffRow label="IGST credit → SGST liability" igst={null} cgst={null} sgst={so.igst_used_for_sgst} cess={null} />
                <SetOffRow label="CGST credit → CGST liability" igst={null} cgst={so.cgst_used_for_cgst} sgst={null} cess={null} />
                <SetOffRow label="CGST credit → IGST liability" igst={so.cgst_used_for_igst} cgst={null} sgst={null} cess={null} />
                <SetOffRow label="SGST credit → SGST liability" igst={null} cgst={null} sgst={so.sgst_used_for_sgst} cess={null} />
                <SetOffRow label="SGST credit → IGST liability" igst={so.sgst_used_for_igst} cgst={null} sgst={null} cess={null} />
                <SetOffRow label="Cess credit → Cess" igst={null} cgst={null} sgst={null} cess={so.cess_used_for_cess} />
                <SetOffRow label="(B) Cash Ledger / TCS Used" igst={t6.cash_ledger_used?.igstPaise} cgst={t6.cash_ledger_used?.cgstPaise} sgst={t6.cash_ledger_used?.sgstPaise} cess={t6.cash_ledger_used?.cessPaise} />
              </tbody>
            </table>
          </div>

          {/* Net Payable highlight box */}
          <div style={{ background: 'linear-gradient(135deg, #1e3a5f, #1e293b)', borderRadius: 14, padding: '24px 28px', border: '2px solid #3b82f6' }}>
            <h3 style={{ margin: '0 0 16px', color: '#60a5fa', fontSize: 16, fontWeight: 800 }}>💰 Net Cash to Deposit</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              {['igst','cgst','sgst','cess'].map(type => (
                <div key={type} style={{ background: '#0f172a', borderRadius: 10, padding: '16px', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', fontWeight: 700 }}>{type}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#f8fafc', fontFamily: 'monospace' }}>
                    {inr(t6.net_cash_payable?.[`${type}Paise`])}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 18, padding: '12px 16px', background: 'rgba(245,158,11,0.1)', borderRadius: 8, border: '1px solid rgba(245,158,11,0.3)' }}>
              <p style={{ margin: 0, color: '#fbbf24', fontSize: 12 }}>
                ⚠ This is an estimate. The actual liability, set-off and cash ledger balance must be verified and confirmed on the GST Portal before filing. Have your CA review these numbers.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
