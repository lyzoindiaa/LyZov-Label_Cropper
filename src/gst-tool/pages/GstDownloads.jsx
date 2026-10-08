import React, { useState, useEffect } from 'react';
import '../gst.css';
import { Download, FileJson, FileSpreadsheet, CheckCircle2, Clock, Calendar, ChevronRight, Loader2 } from 'lucide-react';
import { gstApi } from '../api/client';

export default function GstDownloads() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    async function loadHistory() {
      try {
        setLoading(true);
        const res = await gstApi.getReturnHistory();
        if (res?.returns?.length > 0) {
          setHistory(res.returns);
        } else {
          setHistory([]);
        }
      } catch (err) {
        console.error('Failed to load downloads history:', err);
        setHistory([]);
      } finally {
        setLoading(false);
      }
    }
    loadHistory();
  }, []);

  const handleDownload = async (id, type) => {
    try {
      setDownloadingId(`${id}-${type}`);
      await gstApi.downloadReturnFile(id, type);
    } catch (err) {
      console.error('Download error:', err);
      alert(err.message || 'Failed to download file');
    } finally {
      setDownloadingId(null);
    }
  };

  const formatINR = val => '₹' + Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

  return (
    <div className="gst-animate-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 4 }}>Downloads</h1>
          <p style={{ color: 'var(--gst-text-sec)', fontSize: '0.88rem' }}>
            GSTR-1 JSON and Excel files for all your returns.
          </p>
        </div>
      </div>

      {/* Info box */}
      <div style={{
        background: 'rgba(0,214,143,0.05)', border: '1px solid rgba(0,214,143,0.15)',
        borderRadius: 'var(--gst-radius)', padding: '14px 20px', marginBottom: 24,
        display: 'flex', gap: 14, alignItems: 'flex-start', fontSize: '0.83rem',
      }}>
        <CheckCircle2 size={16} color="var(--gst-emerald)" style={{ flexShrink: 0, marginTop: 2 }} />
        <span style={{ color: 'var(--gst-text-sec)', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--gst-emerald)' }}>GSTR-1 JSON</strong> — Upload directly to the GST portal offline tool. 
          Always test the JSON in the <strong>official GST offline utility</strong> before filing.&nbsp;
          <strong style={{ color: 'var(--gst-emerald)' }}>Excel</strong> — Formatted for CA review, matching the official government multi-sheet template.
        </span>
      </div>

      {/* Downloads table */}
      <div className="gst-table-wrap">
        <table className="gst-table">
          <thead>
            <tr>
              <th>Period</th>
              <th>Business / GSTIN</th>
              <th>Generated Date</th>
              <th>Taxable Value</th>
              <th>Total Tax</th>
              <th style={{ textAlign: 'center' }}>GSTR-1 JSON</th>
              <th style={{ textAlign: 'center' }}>GSTR-1 Excel</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: 32 }}>
                  <Loader2 size={20} className="gst-spin" style={{ margin: '0 auto 8px' }} />
                  Loading files...
                </td>
              </tr>
            ) : history.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--gst-text-mute)' }}>
                  No returns generated yet. Go to New Return to upload your reports.
                </td>
              </tr>
            ) : (
              history.map(r => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 700 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Calendar size={13} color="var(--gst-emerald)" />
                      {r.period ? `${r.period.slice(0, 2)}/${r.period.slice(2)}` : '09/2026'}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{r.business?.legalName || 'Sunrise Traders'}</div>
                    <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--gst-text-sec)' }}>
                      {r.business?.gstin || '29AABCU9603R1ZX'}
                    </div>
                  </td>
                  <td style={{ fontSize: '0.82rem', color: 'var(--gst-text-sec)' }}>
                    {new Date(r.generatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td style={{ fontWeight: 600 }}>{formatINR(r.totalTaxableValue)}</td>
                  <td style={{ color: 'var(--gst-emerald)', fontWeight: 700 }}>{formatINR(r.totalTax)}</td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      className="gst-btn gst-btn-sm gst-btn-outline"
                      style={{ gap: 6 }}
                      onClick={() => handleDownload(r.id, 'json')}
                      disabled={downloadingId === `${r.id}-json`}
                    >
                      {downloadingId === `${r.id}-json` ? <Loader2 size={12} className="gst-spin" /> : <FileJson size={13} />}
                      JSON
                    </button>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      className="gst-btn gst-btn-sm gst-btn-outline"
                      style={{ gap: 6 }}
                      onClick={() => handleDownload(r.id, 'excel')}
                      disabled={downloadingId === `${r.id}-excel`}
                    >
                      {downloadingId === `${r.id}-excel` ? <Loader2 size={12} className="gst-spin" /> : <FileSpreadsheet size={13} />}
                      Excel
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
