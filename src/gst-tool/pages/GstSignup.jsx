import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../gst.css';
import { FileText, Eye, EyeOff, ArrowRight, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { gstApi } from '../api/client';

const STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh',
  'Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka',
  'Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram',
  'Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu',
  'Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
  'Delhi','Jammu & Kashmir','Ladakh','Puducherry',
];

export default function GstSignup() {
  const navigate = useNavigate();
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', gstin: '', state: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [gstinStatus, setGstinStatus] = useState(null); // { valid: boolean, stateName?: string, reason?: string }

  const handle = async (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));

    // Auto validate GSTIN when 15 characters
    if (name === 'gstin') {
      const clean = value.trim().toUpperCase();
      if (clean.length === 15) {
        try {
          const res = await gstApi.validateGstin(clean);
          setGstinStatus(res);
          if (res.valid && res.stateName) {
            setForm(f => ({ ...f, state: res.stateName }));
          }
        } catch {
          // ignore network glitch for validation
        }
      } else {
        setGstinStatus(null);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) {
      setError('Name, email, and password are required');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await gstApi.signup({
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
        gstin: form.gstin ? form.gstin.trim().toUpperCase() : '',
        legalName: form.gstin ? (form.name + ' Enterprise') : '',
      });
      navigate('/gst-tool/dashboard');
    } catch (err) {
      setError(err.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="gst-root" style={{
      minHeight: '100vh', display: 'flex',
      background: 'radial-gradient(ellipse at 70% 10%,rgba(245,166,35,0.07) 0%,transparent 50%), var(--gst-bg)',
    }}>
      {/* Left panel */}
      <div style={{
        flex: '0 0 420px', display: 'none',
        flexDirection: 'column', justifyContent: 'center',
        padding: '48px 40px',
        background: 'var(--gst-surface)',
        borderRight: '1px solid var(--gst-border)',
      }}
        className="signup-left"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 40 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg,#00d68f,#f5a623)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <FileText size={18} color="#0a0f1e" />
          </div>
          <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--gst-text)' }}>
            GST<span style={{ color: 'var(--gst-emerald)' }}>Tool</span>
          </span>
        </div>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 800, lineHeight: 1.3, marginBottom: 16 }}>
          File GSTR-1 without the headache
        </h2>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {[
            'Upload Amazon MTR or Flipkart GST report',
            'Auto B2B, B2CS, CDNR, HSN classification',
            'Error check before download',
            'GSTR-1 JSON + Excel in one click',
            '30-day free trial, no credit card',
          ].map(t => (
            <li key={t} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 14, color: 'var(--gst-text-sec)', fontSize: '0.87rem' }}>
              <CheckCircle2 size={16} color="var(--gst-emerald)" style={{ flexShrink: 0, marginTop: 2 }} />
              {t}
            </li>
          ))}
        </ul>
      </div>

      {/* Form panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ width: '100%', maxWidth: 460 }}>
          <a href="/gst-tool" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg,#00d68f,#f5a623)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(0,214,143,0.35)',
            }}>
              <FileText size={18} color="#0a0f1e" />
            </div>
            <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--gst-text)' }}>
              GST<span style={{ color: 'var(--gst-emerald)' }}>Tool</span>
            </span>
          </a>

          <div className="gst-card">
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 4 }}>Create your account</h1>
            <p style={{ color: 'var(--gst-text-sec)', fontSize: '0.85rem', marginBottom: 24 }}>
              30 days free · No credit card needed
            </p>

            {error && (
              <div style={{
                background: 'rgba(255,87,87,0.1)', border: '1px solid rgba(255,87,87,0.3)',
                borderRadius: 8, padding: '10px 14px', marginBottom: 20, display: 'flex',
                alignItems: 'center', gap: 10, color: 'var(--gst-coral)', fontSize: '0.85rem'
              }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="gst-form-group" style={{ marginBottom: 0 }}>
                  <label className="gst-label">Full Name</label>
                  <input className="gst-input" name="name" required placeholder="Rahul Sharma" value={form.name} onChange={handle} />
                </div>
                <div className="gst-form-group" style={{ marginBottom: 0 }}>
                  <label className="gst-label">Phone</label>
                  <input className="gst-input" name="phone" placeholder="+91 98765 43210" value={form.phone} onChange={handle} />
                </div>
              </div>

              <div className="gst-form-group" style={{ marginTop: 16 }}>
                <label className="gst-label">Email</label>
                <input className="gst-input" type="email" name="email" required placeholder="you@example.com" value={form.email} onChange={handle} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="gst-form-group" style={{ marginBottom: 0 }}>
                  <label className="gst-label">
                    GSTIN (optional)
                    {gstinStatus && (
                      <span style={{
                        fontSize: '0.72rem', marginLeft: 6,
                        color: gstinStatus.valid ? 'var(--gst-emerald)' : 'var(--gst-coral)'
                      }}>
                        {gstinStatus.valid ? '✓ Valid' : '✗ Invalid'}
                      </span>
                    )}
                  </label>
                  <input className="gst-input" name="gstin" placeholder="29AABCU9603R1ZX"
                    value={form.gstin} onChange={handle} maxLength={15}
                    style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'monospace' }} />
                </div>
                <div className="gst-form-group" style={{ marginBottom: 0 }}>
                  <label className="gst-label">State</label>
                  <select className="gst-input gst-select" name="state" value={form.state} onChange={handle}>
                    <option value="">Select state</option>
                    {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="gst-form-group" style={{ marginTop: 16 }}>
                <label className="gst-label">Password</label>
                <div style={{ position: 'relative' }}>
                  <input className="gst-input" type={show ? 'text' : 'password'} name="password" required
                    placeholder="Min 6 characters" value={form.password} onChange={handle}
                    style={{ paddingRight: 44 }} />
                  <button type="button" onClick={() => setShow(s => !s)} style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gst-text-sec)',
                    display: 'flex', alignItems: 'center',
                  }}>
                    {show ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button className="gst-btn gst-btn-primary" type="submit" disabled={loading}
                style={{ width: '100%', justifyContent: 'center', fontSize: '0.95rem', padding: '13px', marginTop: 4 }}
              >
                {loading ? <><Loader2 size={16} className="gst-spin" /> Creating account...</> : <>Create account &amp; start trial <ArrowRight size={16} /></>}
              </button>
            </form>

            <p style={{ fontSize: '0.72rem', color: 'var(--gst-text-mute)', marginTop: 12, textAlign: 'center', lineHeight: 1.5 }}>
              By signing up, you agree to our Terms &amp; Privacy Policy.
            </p>

            <hr className="gst-divider" />
            <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--gst-text-sec)' }}>
              Already have an account?{' '}
              <Link to="/gst-tool/login" style={{ color: 'var(--gst-emerald)', fontWeight: 700, textDecoration: 'none' }}>
                Log in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
