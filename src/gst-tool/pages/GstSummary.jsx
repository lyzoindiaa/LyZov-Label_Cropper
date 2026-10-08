import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../gst.css';
import { Download, AlertTriangle, CheckCircle2, Info, FileBarChart2 } from 'lucide-react';
import { gstApi } from '../api/client';

export default function GstSummary() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('b2b');
  const [activeTab, setActiveTab] = useState('summary');
  const [returnData, setReturnData] = useState(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('gst_active_return');
      if (raw) {
        setReturnData(JSON.parse(raw));
      }
    } catch {
      // fallback
    }
  }, []);

  const totals = returnData?.totals || {
    taxableValue: 0,
    igst: 0,
    cgst: 0,
    sgst: 0,
    totalTax: 0,
  };

  const formatINR = val => '₹' + Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

  const b2bList = returnData?.sections?.b2b || [];
  const b2csList = returnData?.sections?.b2cs || [];
  const hsnList = returnData?.sections?.hsn?.data || [];
  const table14List = returnData?.sections?.supeco?.cl14_2 || [];
  const errorsList = returnData?.validation?.errors || [];
  const warningsList = returnData?.validation?.warnings || [];
  const allIssues = [...errorsList, ...warningsList];

  if (!returnData) {
    return (
      <div className="gst-animate-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 4 }}>GSTR-1 Summary</h1>
            <p style={{ color: 'var(--gst-text-sec)', fontSize: '0.88rem' }}>
              Statutory breakdown and validation report for portal upload.
            </p>
          </div>
        </div>

        <div style={{ textAlign: 'center', padding: '60px 20px', border: '1px dashed var(--gst-border)', borderRadius: 'var(--gst-radius)', background: 'var(--gst-surface)' }}>
          <FileBarChart2 size={44} color="var(--gst-text-sec)" style={{ margin: '0 auto 14px', opacity: 0.6 }} />
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: 6 }}>No Active Return Computed</h3>
          <p style={{ color: 'var(--gst-text-sec)', fontSize: '0.88rem', maxWidth: 460, margin: '0 auto 22px' }}>
            To view the statutory table summaries (B2B, B2CS, HSN, Table 14 ECO) and validation results, upload your sales reports and generate a return.
          </p>
          <button className="gst-btn gst-btn-primary" onClick={() => navigate('/gst-tool/upload')}>
            Upload Sales Report
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="gst-animate-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 4 }}>GSTR-1 Summary</h1>
          <p style={{ color: 'var(--gst-text-sec)', fontSize: '0.88rem' }}>
            Live Computed Return · Ready for Portal Upload
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="gst-btn gst-btn-outline" onClick={() => navigate('/gst-tool/upload')}>← Back to Upload</button>
          <button className="gst-btn gst-btn-primary" onClick={() => navigate('/gst-tool/downloads')}>
            <Download size={16} /> Download Files
          </button>
        </div>
      </div>

      {/* Error/Warning notice */}
      {allIssues.length > 0 && (
        <div style={{
          background: 'rgba(255,165,2,0.06)', border: '1px solid rgba(255,165,2,0.2)',
          borderRadius: 'var(--gst-radius)', padding: '12px 18px',
          display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20,
        }}>
          <AlertTriangle size={18} color="var(--gst-warn)" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: '0.87rem', color: 'var(--gst-text-sec)' }}>
            <strong style={{ color: 'var(--gst-warn)' }}>
              {errorsList.length} error(s) and {warningsList.length} warning(s)
            </strong> found.
            Review the <button onClick={() => setActiveTab('errors')}
              style={{ background: 'none', border: 'none', color: 'var(--gst-warn)', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', fontSize: 'inherit' }}>
              Errors tab
            </button> before downloading.
          </span>
        </div>
      )}

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Taxable Value', value: formatINR(totals.taxableValue), color: 'var(--gst-text)' },
          { label: 'IGST',  value: formatINR(totals.igst),  color: 'var(--gst-blue)' },
          { label: 'CGST',  value: formatINR(totals.cgst),  color: 'var(--gst-gold)' },
          { label: 'SGST',  value: formatINR(totals.sgst),  color: 'var(--gst-gold)' },
          { label: 'Total Tax', value: formatINR(totals.totalTax), color: 'var(--gst-emerald)' },
        ].map(s => (
          <div key={s.label} className="gst-stat-card">
            <div className="gst-stat-label">{s.label}</div>
            <div className="gst-stat-value" style={{ fontSize: '1.2rem', color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--gst-border)', paddingBottom: 0, overflowX: 'auto' }}>
        {[
          { id: 'summary', label: 'GSTR-1 Sections' },
          { id: 'errors', label: `Errors & Warnings (${allIssues.length})` },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className="gst-btn gst-btn-ghost"
            style={{
              borderBottom: `2px solid ${activeTab === t.id ? 'var(--gst-emerald)' : 'transparent'}`,
              borderRadius: '0', color: activeTab === t.id ? 'var(--gst-emerald)' : 'var(--gst-text-sec)',
              fontWeight: activeTab === t.id ? 700 : 500, paddingBottom: 12,
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'summary' && (
        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20, alignItems: 'start' }}>
          {/* Section nav */}
          <div className="gst-card" style={{ padding: 8 }}>
            {[
              { id: 'b2b', label: 'B2B Invoices', count: b2bList.length },
              { id: 'b2cs', label: 'B2CS Invoices', count: b2csList.length },
              { id: 'hsn', label: 'HSN Summary', count: hsnList.length },
              { id: 'table14', label: 'Table 14 (ECO)', count: table14List.length },
            ].map(sec => (
              <button key={sec.id} onClick={() => setActiveSection(sec.id)}
                style={{
                  width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 12px', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600,
                  background: activeSection === sec.id ? 'rgba(0,214,143,0.1)' : 'transparent',
                  color: activeSection === sec.id ? 'var(--gst-emerald)' : 'var(--gst-text-sec)',
                  border: '1px solid ' + (activeSection === sec.id ? 'rgba(0,214,143,0.2)' : 'transparent'),
                  cursor: 'pointer', marginBottom: 2,
                }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileBarChart2 size={14} />
                  {sec.label}
                </span>
                {sec.count > 0 && <span className="gst-badge gst-badge-blue">{sec.count}</span>}
              </button>
            ))}
          </div>

          {/* Section tables */}
          <div>
            <div className="gst-table-wrap">
              <table className="gst-table">
                {activeSection === 'b2b' && (
                  <>
                    <thead><tr><th>Buyer GSTIN</th><th>Invoice No</th><th>Date</th><th>Taxable</th><th>IGST</th><th>CGST+SGST</th></tr></thead>
                    <tbody>
                      {b2bList.length > 0 ? (
                        b2bList.flatMap(buyer => buyer.inv.map(inv => (
                          <tr key={inv.inum}>
                            <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--gst-emerald)' }}>{buyer.ctin}</td>
                            <td style={{ fontFamily: 'monospace' }}>{inv.inum}</td>
                            <td>{inv.idt}</td>
                            <td style={{ fontWeight: 600 }}>{formatINR(inv.itms[0]?.itm_det?.txval)}</td>
                            <td>{formatINR(inv.itms[0]?.itm_det?.iamt)}</td>
                            <td>{formatINR((inv.itms[0]?.itm_det?.camt || 0) + (inv.itms[0]?.itm_det?.samt || 0))}</td>
                          </tr>
                        )))
                      ) : (
                        <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--gst-text-mute)', padding: 24 }}>No B2B invoices in this return</td></tr>
                      )}
                    </tbody>
                  </>
                )}

                {activeSection === 'b2cs' && (
                  <>
                    <thead><tr><th>Place of Supply</th><th>Rate</th><th>Type</th><th>Taxable Value</th><th>IGST</th><th>CGST</th><th>SGST</th></tr></thead>
                    <tbody>
                      {b2csList.length > 0 ? (
                        b2csList.map((r, i) => (
                          <tr key={i}>
                            <td style={{ fontWeight: 600 }}>State {r.pos}</td>
                            <td><span className="gst-badge gst-badge-blue">{r.rt}%</span></td>
                            <td>{r.sply_ty}</td>
                            <td style={{ fontWeight: 600 }}>{formatINR(r.txval)}</td>
                            <td style={{ color: 'var(--gst-blue)' }}>{formatINR(r.iamt)}</td>
                            <td style={{ color: 'var(--gst-gold)' }}>{formatINR(r.camt)}</td>
                            <td style={{ color: 'var(--gst-gold)' }}>{formatINR(r.samt)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--gst-text-mute)', padding: 24 }}>No B2CS transactions in this return</td></tr>
                      )}
                    </tbody>
                  </>
                )}

                {activeSection === 'hsn' && (
                  <>
                    <thead><tr><th>HSN Code</th><th>Description</th><th>UQC</th><th>Qty</th><th>Taxable</th><th>Rate</th><th>Total Tax</th></tr></thead>
                    <tbody>
                      {hsnList.length > 0 ? (
                        hsnList.map((r, i) => (
                          <tr key={i}>
                            <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{r.hsn_sc}</td>
                            <td style={{ fontSize: '0.82rem' }}>{r.desc}</td>
                            <td><span className="gst-badge gst-badge-blue">{r.uqc}</span></td>
                            <td>{r.qty}</td>
                            <td style={{ fontWeight: 600 }}>{formatINR(r.txval)}</td>
                            <td>{r.rt}%</td>
                            <td style={{ color: 'var(--gst-emerald)', fontWeight: 700 }}>{formatINR((r.iamt || 0) + (r.camt || 0) + (r.samt || 0))}</td>
                          </tr>
                        ))
                      ) : (
                        <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--gst-text-mute)', padding: 24 }}>No HSN items in this return</td></tr>
                      )}
                    </tbody>
                  </>
                )}

                {activeSection === 'table14' && (
                  <>
                    <thead><tr><th>Operator GSTIN (ETIN)</th><th>Operator Name</th><th>Taxable Value</th><th>IGST</th><th>CGST+SGST</th></tr></thead>
                    <tbody>
                      {table14List.length > 0 ? (
                        table14List.map((r, i) => (
                          <tr key={i}>
                            <td style={{ fontFamily: 'monospace', color: 'var(--gst-emerald)' }}>{r.etin}</td>
                            <td style={{ fontWeight: 600 }}>{r.sup_name}</td>
                            <td style={{ fontWeight: 600 }}>{formatINR(r.txval)}</td>
                            <td style={{ color: 'var(--gst-blue)' }}>{formatINR(r.iamt)}</td>
                            <td style={{ color: 'var(--gst-gold)' }}>{formatINR((r.camt || 0) + (r.samt || 0))}</td>
                          </tr>
                        ))
                      ) : (
                        <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--gst-text-mute)', padding: 24 }}>No E-Commerce Operator supplies</td></tr>
                      )}
                    </tbody>
                  </>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'errors' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {allIssues.length > 0 ? (
            allIssues.map((e, i) => (
              <div key={i} style={{
                display: 'flex', gap: 14, alignItems: 'flex-start',
                background: e.type === 'ERROR' ? 'rgba(255,71,87,0.05)' : 'rgba(255,165,2,0.05)',
                border: `1px solid ${e.type === 'ERROR' ? 'rgba(255,71,87,0.2)' : 'rgba(255,165,2,0.2)'}`,
                borderRadius: 'var(--gst-radius)', padding: '14px 18px',
              }}>
                <AlertTriangle size={16} color={e.type === 'ERROR' ? 'var(--gst-red)' : 'var(--gst-warn)'} style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.87rem', color: e.type === 'ERROR' ? 'var(--gst-red)' : 'var(--gst-warn)', marginBottom: 2 }}>
                    {e.type} — Row {e.sourceRow} ({e.platform?.toUpperCase()})
                  </div>
                  <div style={{ fontSize: '0.83rem', color: 'var(--gst-text-sec)' }}>{e.message}</div>
                </div>
                <span className={`gst-badge ${e.type === 'ERROR' ? 'gst-badge-red' : 'gst-badge-gold'}`}>
                  Row {e.sourceRow}
                </span>
              </div>
            ))
          ) : (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--gst-emerald)' }}>
              <CheckCircle2 size={32} style={{ margin: '0 auto 12px' }} />
              <div>Zero errors or discrepancies detected in this return.</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
