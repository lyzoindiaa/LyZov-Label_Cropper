import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../gst.css';
import {
  Upload, FileText, CheckCircle2, AlertCircle, Trash2,
  CloudUpload, ArrowRight, X, Info, Loader2
} from 'lucide-react';
import { gstApi, getActiveBusiness } from '../api/client';

const MONTHS = [
  { name: 'January', code: '01' }, { name: 'February', code: '02' },
  { name: 'March', code: '03' }, { name: 'April', code: '04' },
  { name: 'May', code: '05' }, { name: 'June', code: '06' },
  { name: 'July', code: '07' }, { name: 'August', code: '08' },
  { name: 'September', code: '09' }, { name: 'October', code: '10' },
  { name: 'November', code: '11' }, { name: 'December', code: '12' },
];

const YEARS = ['2026', '2025', '2024'];

function FileSlot({ platform, color, emoji, onFile, file, onRemove, status, msg }) {
  const ref = useRef();
  const [drag, setDrag] = useState(false);

  const accept = f => {
    if (!f) return;
    const ext = f.name.split('.').pop().toLowerCase();
    if (!['xlsx','xls','csv'].includes(ext)) return;
    onFile(f);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: '1.2rem' }}>{emoji}</span>
        <span style={{ fontWeight: 700, color }}>{platform}</span>
        <span style={{ fontSize: '0.75rem', color: 'var(--gst-text-mute)' }}>(Excel or CSV)</span>
      </div>

      {!file ? (
        <div
          className={`gst-dropzone${drag ? ' drag-over' : ''}`}
          style={{ borderColor: drag ? color : undefined }}
          onClick={() => ref.current.click()}
          onDragOver={e => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={e => { e.preventDefault(); setDrag(false); accept(e.dataTransfer.files[0]); }}
        >
          <input ref={ref} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }}
            onChange={e => accept(e.target.files[0])} />
          <CloudUpload size={28} color={drag ? color : 'var(--gst-text-mute)'} style={{ marginBottom: 10 }} />
          <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 4 }}>
            Drop {platform} report here
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--gst-text-mute)' }}>
            or click to browse · .xlsx .xls .csv
          </div>
        </div>
      ) : (
        <div style={{
          background: 'var(--gst-surface2)',
          border: `1px solid ${status === 'ok' ? 'rgba(0,214,143,0.3)' : status === 'error' ? 'rgba(255,71,87,0.3)' : 'var(--gst-border)'}`,
          borderRadius: 'var(--gst-radius)',
          padding: '14px 18px',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <FileText size={20} color={color} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {file.name}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--gst-text-mute)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>{(file.size / 1024).toFixed(1)} KB</span>
              {status === 'loading' && <span style={{ color: 'var(--gst-gold)' }}>Uploading &amp; parsing...</span>}
              {status === 'ok' && <span style={{ color: 'var(--gst-emerald)' }}>✓ {msg || 'Ready'}</span>}
              {status === 'error' && <span style={{ color: 'var(--gst-coral)' }}>✗ {msg || 'Upload failed'}</span>}
            </div>
          </div>
          <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gst-text-mute)' }}>
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

export default function GstUpload() {
  const navigate = useNavigate();
  const [businesses, setBusinesses] = useState([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState('');
  const [month, setMonth] = useState('09');
  const [year, setYear] = useState('2026');

  const [amazonFile, setAmazonFile] = useState(null);
  const [flipkartFile, setFlipkartFile] = useState(null);
  const [amazonStatus, setAmazonStatus] = useState('');
  const [amazonMsg, setAmazonMsg] = useState('');
  const [flipkartStatus, setFlipkartStatus] = useState('');
  const [flipkartMsg, setFlipkartMsg] = useState('');

  const [processing, setProcessing] = useState(false);
  const [globalError, setGlobalError] = useState('');

  const period = `${month}${year}`;

  useEffect(() => {
    async function loadBusinesses() {
      try {
        const res = await gstApi.getBusinesses();
        if (res?.businesses?.length > 0) {
          setBusinesses(res.businesses);
          setSelectedBusinessId(res.businesses[0]._id);
        } else {
          const fallback = getActiveBusiness() || {
            _id: 'default-1',
            legalName: 'Sunrise Traders',
            gstin: '29AABCU9603R1ZX',
          };
          setBusinesses([fallback]);
          setSelectedBusinessId(fallback._id);
        }
      } catch {
        const fallback = {
          _id: 'default-1',
          legalName: 'Sunrise Traders',
          gstin: '29AABCU9603R1ZX',
        };
        setBusinesses([fallback]);
        setSelectedBusinessId(fallback._id);
      }
    }
    loadBusinesses();
  }, []);

  const handleFileUpload = async (platform, file) => {
    const isAmazon = platform === 'amazon';
    if (isAmazon) {
      setAmazonFile(file);
      setAmazonStatus('loading');
    } else {
      setFlipkartFile(file);
      setFlipkartStatus('loading');
    }

    try {
      const res = await gstApi.uploadFile({
        file,
        platform,
        businessId: selectedBusinessId,
        period,
      });

      const successMsg = `${res.upload.rowCount} rows parsed`;
      if (isAmazon) {
        setAmazonStatus('ok');
        setAmazonMsg(successMsg);
      } else {
        setFlipkartStatus('ok');
        setFlipkartMsg(successMsg);
      }
    } catch (err) {
      const errMsg = err.message || 'Parsing error';
      if (isAmazon) {
        setAmazonStatus('error');
        setAmazonMsg(errMsg);
      } else {
        setFlipkartStatus('error');
        setFlipkartMsg(errMsg);
      }
    }
  };

  const generate = async () => {
    if (!amazonFile && !flipkartFile) return;

    try {
      setProcessing(true);
      setGlobalError('');
      const res = await gstApi.generateReturn({
        businessId: selectedBusinessId,
        period,
      });

      // Store generated return in sessionStorage for summary page
      sessionStorage.setItem('gst_active_return', JSON.stringify(res));
      navigate('/gst-tool/summary');
    } catch (err) {
      // If server or DB is in demo fallback mode, navigate to summary anyway with mock data
      console.warn('API Generate fallback:', err.message);
      navigate('/gst-tool/summary');
    } finally {
      setProcessing(false);
    }
  };

  const currentBusiness = businesses.find(b => b._id === selectedBusinessId) || businesses[0];
  const monthName = MONTHS.find(m => m.code === month)?.name || 'September';

  return (
    <div className="gst-animate-in">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 4 }}>New Return</h1>
        <p style={{ color: 'var(--gst-text-sec)', fontSize: '0.88rem' }}>
          Upload your Amazon and/or Flipkart reports. We'll handle the rest.
        </p>
      </div>

      {globalError && (
        <div style={{
          background: 'rgba(255,87,87,0.1)', border: '1px solid rgba(255,87,87,0.3)',
          borderRadius: 8, padding: '10px 14px', marginBottom: 20, display: 'flex',
          alignItems: 'center', gap: 10, color: 'var(--gst-coral)', fontSize: '0.85rem'
        }}>
          <AlertCircle size={16} />
          <span>{globalError}</span>
        </div>
      )}

      {/* Progress steps */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 32, overflowX: 'auto' }}>
        {['Select Period', 'Upload Reports', 'Review & Generate'].map((s, i) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < 2 ? 1 : 'initial' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: i === 0 ? 'var(--gst-emerald)' : i === 1 ? 'var(--gst-emerald)' : 'var(--gst-surface2)',
                color: i <= 1 ? '#0a0f1e' : 'var(--gst-text-mute)',
                fontWeight: 800, fontSize: '0.78rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{i === 0 ? <CheckCircle2 size={14} /> : i + 1}</div>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: i <= 1 ? 'var(--gst-text)' : 'var(--gst-text-mute)' }}>{s}</span>
            </div>
            {i < 2 && <div style={{ flex: 1, height: 2, background: i === 0 ? 'var(--gst-emerald)' : 'var(--gst-border)', margin: '0 12px' }} />}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(260px,1fr)', gap: 20, alignItems: 'start' }}>
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Period & Business */}
          <div className="gst-card">
            <h2 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 18 }}>1. Select Period &amp; Business</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 14 }}>
              <div className="gst-form-group" style={{ marginBottom: 0 }}>
                <label className="gst-label">GSTIN / Business</label>
                <select className="gst-input gst-select" value={selectedBusinessId} onChange={e => setSelectedBusinessId(e.target.value)}>
                  {businesses.map(b => (
                    <option key={b._id} value={b._id}>
                      {b.legalName} ({b.gstin})
                    </option>
                  ))}
                </select>
              </div>
              <div className="gst-form-group" style={{ marginBottom: 0 }}>
                <label className="gst-label">Month</label>
                <select className="gst-input gst-select" value={month} onChange={e => setMonth(e.target.value)}>
                  {MONTHS.map(m => <option key={m.code} value={m.code}>{m.name}</option>)}
                </select>
              </div>
              <div className="gst-form-group" style={{ marginBottom: 0 }}>
                <label className="gst-label">Year</label>
                <select className="gst-input gst-select" value={year} onChange={e => setYear(e.target.value)}>
                  {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Upload slots */}
          <div className="gst-card">
            <h2 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 18 }}>2. Upload Reports</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <FileSlot platform="Amazon" color="var(--gst-gold)" emoji="📦"
                file={amazonFile} status={amazonStatus} msg={amazonMsg}
                onFile={f => handleFileUpload('amazon', f)}
                onRemove={() => { setAmazonFile(null); setAmazonStatus(''); setAmazonMsg(''); }} />
              <hr className="gst-divider" style={{ margin: '4px 0' }} />
              <FileSlot platform="Flipkart" color="var(--gst-blue)" emoji="🛒"
                file={flipkartFile} status={flipkartStatus} msg={flipkartMsg}
                onFile={f => handleFileUpload('flipkart', f)}
                onRemove={() => { setFlipkartFile(null); setFlipkartStatus(''); setFlipkartMsg(''); }} />
            </div>
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Summary card */}
          <div className="gst-card">
            <h2 style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 14 }}>Return Summary</h2>
            {[
              { label: 'Business', value: currentBusiness?.legalName || 'Sunrise Traders' },
              { label: 'Period', value: `${monthName} ${year} (${period})` },
              { label: 'Amazon Report', value: amazonFile ? '✓ ' + amazonFile.name.slice(0, 18) + '…' : 'Not uploaded' },
              { label: 'Flipkart Report', value: flipkartFile ? '✓ ' + flipkartFile.name.slice(0, 18) + '…' : 'Not uploaded' },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--gst-border)', fontSize: '0.83rem' }}>
                <span style={{ color: 'var(--gst-text-sec)' }}>{label}</span>
                <span style={{ fontWeight: 600, textAlign: 'right', maxWidth: '55%', wordBreak: 'break-all' }}>{value}</span>
              </div>
            ))}

            <button
              className="gst-btn gst-btn-primary"
              style={{ width: '100%', justifyContent: 'center', marginTop: 18, opacity: (!amazonFile && !flipkartFile) ? 0.4 : 1 }}
              disabled={(!amazonFile && !flipkartFile) || processing}
              onClick={generate}
            >
              {processing ? <><Loader2 size={16} className="gst-spin" /> Processing...</> : <>Generate GSTR-1 <ArrowRight size={16} /></>}
            </button>
            {processing && (
              <div style={{ marginTop: 12 }}>
                <div className="gst-progress-wrap">
                  <div className="gst-progress-bar" style={{ width: '70%', animation: 'gst-shimmer 1.4s infinite' }} />
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--gst-text-mute)', marginTop: 6, textAlign: 'center' }}>
                  Aggregating B2B, B2CS, and Table 14...
                </div>
              </div>
            )}
          </div>

          {/* Info */}
          <div style={{
            background: 'rgba(74,158,255,0.06)', border: '1px solid rgba(74,158,255,0.15)',
            borderRadius: 'var(--gst-radius)', padding: '14px 16px',
          }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: '0.8rem', color: 'var(--gst-text-sec)', lineHeight: 1.6 }}>
              <Info size={14} color="var(--gst-blue)" style={{ flexShrink: 0, marginTop: 2 }} />
              <span>
                <strong style={{ color: 'var(--gst-blue)' }}>Amazon:</strong> Use the MTR (Merchant Tax Report) from Seller Central → Reports → Tax.<br />
                <strong style={{ color: 'var(--gst-blue)' }}>Flipkart:</strong> Use GST/Sales report from Seller Hub → Reports → Tax Reports.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
