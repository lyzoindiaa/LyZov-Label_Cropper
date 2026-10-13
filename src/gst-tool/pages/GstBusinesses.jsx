import React, { useState, useEffect } from 'react';
import '../gst.css';
import { Plus, Building2, CheckCircle2, AlertCircle, Trash2, X, Loader2 } from 'lucide-react';
import { gstApi, setActiveBusiness } from '../api/client';

const STATES = [
  { code: '01', name: 'Jammu & Kashmir' }, { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' }, { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' }, { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' }, { code: '10', name: 'Bihar' },
  { code: '19', name: 'West Bengal' }, { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' }, { code: '24', name: 'Gujarat' },
  { code: '27', name: 'Maharashtra' }, { code: '29', name: 'Karnataka' },
  { code: '32', name: 'Kerala' }, { code: '33', name: 'Tamil Nadu' },
  { code: '36', name: 'Telangana' }, { code: '37', name: 'Andhra Pradesh' },
];

export default function GstBusinesses() {
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ legalName: '', gstin: '', filingFrequency: 'monthly' });
  const [gstinCheck, setGstinCheck] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchBusinesses = async () => {
    try {
      setLoading(true);
      const res = await gstApi.getBusinesses();
      if (res?.businesses) {
        setBusinesses(res.businesses);
      } else {
        setBusinesses([]);
      }
    } catch (err) {
      console.error('Failed to load businesses:', err);
      setBusinesses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBusinesses();
  }, []);

  const handle = async (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));

    if (name === 'gstin') {
      const clean = value.trim().toUpperCase();
      if (clean.length === 15) {
        try {
          const res = await gstApi.validateGstin(clean);
          setGstinCheck(res);
        } catch {
          setGstinCheck(null);
        }
      } else {
        setGstinCheck(null);
      }
    }
  };

  const save = async () => {
    if (!form.legalName || !form.gstin) {
      setErrorMsg('Legal Name and GSTIN are required');
      return;
    }

    try {
      setSaving(true);
      setErrorMsg('');
      const cleanGstin = form.gstin.trim().toUpperCase();
      const res = await gstApi.createBusiness({
        legalName: form.legalName,
        gstin: cleanGstin,
        filingFrequency: form.filingFrequency,
        isDefault: businesses.length === 0,
      });

      if (res?.business) {
        setBusinesses(prev => [res.business, ...prev]);
        setActiveBusiness(res.business);
      }
      setShowForm(false);
      setForm({ legalName: '', gstin: '', filingFrequency: 'monthly' });
      setGstinCheck(null);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save business');
    } finally {
      setSaving(false);
    }
  };

  const del = async (id) => {
    try {
      await gstApi.deleteBusiness(id);
      setBusinesses(bs => bs.filter(b => b._id !== id && b.id !== id));
    } catch {
      setBusinesses(bs => bs.filter(b => b._id !== id && b.id !== id));
    }
  };

  return (
    <div className="gst-animate-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 4 }}>My GSTINs</h1>
          <p style={{ color: 'var(--gst-text-sec)', fontSize: '0.88rem' }}>Manage your registered businesses and filing frequencies.</p>
        </div>
        <button className="gst-btn gst-btn-primary" onClick={() => { setShowForm(true); setForm({ legalName: '', gstin: '', filingFrequency: 'monthly' }); setErrorMsg(''); }}>
          <Plus size={16} /> Add GSTIN
        </button>
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="gst-card" style={{ marginBottom: 24, border: '1px solid rgba(0,214,143,0.25)', position: 'relative' }}>
          <button onClick={() => setShowForm(false)} style={{
            position: 'absolute', top: 16, right: 16,
            background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gst-text-sec)',
          }}><X size={18} /></button>

          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 20 }}>
            Add New Business GSTIN
          </h2>

          {errorMsg && (
            <div style={{
              background: 'rgba(255,87,87,0.1)', border: '1px solid rgba(255,87,87,0.3)',
              borderRadius: 8, padding: '10px 14px', marginBottom: 16, display: 'flex',
              alignItems: 'center', gap: 10, color: 'var(--gst-coral)', fontSize: '0.85rem'
            }}>
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 16 }}>
            <div className="gst-form-group">
              <label className="gst-label">Legal Business Name</label>
              <input className="gst-input" name="legalName" placeholder="e.g., Sunrise Traders"
                value={form.legalName} onChange={handle} />
            </div>

            <div className="gst-form-group">
              <label className="gst-label">
                GSTIN (15 characters)
                {gstinCheck && (
                  <span style={{
                    fontSize: '0.72rem', marginLeft: 6,
                    color: gstinCheck.valid ? 'var(--gst-emerald)' : 'var(--gst-coral)'
                  }}>
                    {gstinCheck.valid ? `✓ Valid (${gstinCheck.stateName})` : `✗ ${gstinCheck.reason}`}
                  </span>
                )}
              </label>
              <input className="gst-input" name="gstin" placeholder="29AABCU9603R1ZX"
                value={form.gstin} onChange={handle} maxLength={15}
                style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'monospace' }} />
            </div>

            <div className="gst-form-group">
              <label className="gst-label">Filing Frequency</label>
              <select className="gst-input gst-select" name="filingFrequency" value={form.filingFrequency} onChange={handle}>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly (QRMP)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button className="gst-btn gst-btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="gst-btn gst-btn-primary" onClick={save} disabled={saving}>
              {saving ? <><Loader2 size={16} className="gst-spin" /> Saving...</> : 'Save Business'}
            </button>
          </div>
        </div>
      )}

      {/* Business Cards Grid */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--gst-text-sec)' }}>
          <Loader2 size={24} className="gst-spin" style={{ margin: '0 auto 12px' }} />
          Loading businesses...
        </div>
      ) : businesses.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 20px', border: '1px dashed var(--gst-border)', borderRadius: 'var(--gst-radius)', background: 'var(--gst-surface)' }}>
          <Building2 size={42} color="var(--gst-text-sec)" style={{ margin: '0 auto 12px', opacity: 0.6 }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 6 }}>No Business GSTIN Added Yet</h3>
          <p style={{ color: 'var(--gst-text-sec)', fontSize: '0.85rem', maxWidth: 420, margin: '0 auto 20px' }}>
            Add your registered GSTIN to start processing Amazon and Flipkart sales reports and generate statutory GSTR-1 files.
          </p>
          <button className="gst-btn gst-btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={16} /> Add Your First GSTIN
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 16 }}>
          {businesses.map(b => (
            <div key={b._id || b.id} className="gst-card" style={{ position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 10,
                    background: 'rgba(0,214,143,0.1)', border: '1px solid rgba(0,214,143,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Building2 size={18} color="var(--gst-emerald)" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.98rem' }}>{b.legalName || b.name}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--gst-text-sec)' }}>
                      {b.stateName || b.state} (Code: {b.stateCode})
                    </div>
                  </div>
                </div>
                <button onClick={() => del(b._id || b.id)} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--gst-text-mute)', padding: 4, borderRadius: 6,
                }}>
                  <Trash2 size={15} />
                </button>
              </div>

              <div style={{
                fontFamily: 'monospace', fontSize: '0.88rem', letterSpacing: '0.06em',
                background: 'var(--gst-surface)', padding: '8px 12px', borderRadius: 8,
                marginBottom: 12, border: '1px solid var(--gst-border)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ color: 'var(--gst-emerald)' }}>{b.gstin}</span>
                <span className="gst-tag gst-tag-success" style={{ fontSize: '0.68rem' }}>Active</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--gst-text-sec)' }}>
                <span>Frequency: <strong style={{ color: 'var(--gst-text)' }}>{b.filingFrequency || b.freq || 'Monthly'}</strong></span>
                <span style={{ color: 'var(--gst-emerald)', fontSize: '0.78rem' }}>✓ Verified</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
