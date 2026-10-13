import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../gst.css';
import { FileText, Eye, EyeOff, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { gstApi } from '../api/client';

export default function GstLogin() {
  const navigate = useNavigate();
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError('Please enter both email and password');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await gstApi.login({ email: form.email, password: form.password });
      navigate('/gst-tool/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="gst-root" style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse at 30% 20%,rgba(0,214,143,0.07) 0%,transparent 50%), var(--gst-bg)',
      padding: 24,
    }}>
      {/* Logo */}
      <a href="/gst-tool" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: 'linear-gradient(135deg,#00d68f,#f5a623)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(0,214,143,0.4)',
        }}>
          <FileText size={20} color="#0a0f1e" />
        </div>
        <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--gst-text)' }}>
          GST<span style={{ color: 'var(--gst-emerald)' }}>Tool</span>
        </span>
      </a>

      <div className="gst-card" style={{ width: '100%', maxWidth: 420 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 4 }}>Welcome back</h1>
        <p style={{ color: 'var(--gst-text-sec)', fontSize: '0.88rem', marginBottom: 28 }}>
          Log in to file your GSTR-1
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
          <div className="gst-form-group">
            <label className="gst-label">Email</label>
            <input className="gst-input" type="email" name="email" required
              placeholder="you@example.com" value={form.email} onChange={handle} />
          </div>

          <div className="gst-form-group">
            <label className="gst-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input className="gst-input" type={show ? 'text' : 'password'} name="password" required
                placeholder="••••••••" value={form.password} onChange={handle}
                style={{ paddingRight: 44 }} />
              <button type="button" onClick={() => setShow(s => !s)} style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gst-text-sec)',
                display: 'flex', alignItems: 'center',
              }}>
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <div style={{ textAlign: 'right', marginTop: 6 }}>
              <a href="#" style={{ fontSize: '0.78rem', color: 'var(--gst-emerald)', textDecoration: 'none' }}>
                Forgot password?
              </a>
            </div>
          </div>

          <button className="gst-btn gst-btn-primary" type="submit" disabled={loading}
            style={{ width: '100%', justifyContent: 'center', fontSize: '0.95rem', padding: '13px' }}
          >
            {loading ? <><Loader2 size={16} className="gst-spin" /> Logging in...</> : <>Log in <ArrowRight size={16} /></>}
          </button>
        </form>

        <hr className="gst-divider" />

        <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--gst-text-sec)' }}>
          Don't have an account?{' '}
          <Link to="/gst-tool/signup" style={{ color: 'var(--gst-emerald)', fontWeight: 700, textDecoration: 'none' }}>
            Start free trial
          </Link>
        </p>
      </div>

      <p style={{ marginTop: 20, fontSize: '0.75rem', color: 'var(--gst-text-mute)', textAlign: 'center' }}>
        Part of <a href="/" style={{ color: 'var(--gst-text-sec)', textDecoration: 'none' }}>tools.lyzov.com</a>
        &nbsp;·&nbsp;
        <a href="/gst-tool" style={{ color: 'var(--gst-text-sec)', textDecoration: 'none' }}>Back to landing</a>
      </p>
    </div>
  );
}
