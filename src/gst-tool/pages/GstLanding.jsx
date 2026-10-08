import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../gst.css';
import {
  FileText, CheckCircle2, ArrowRight, Upload, Download,
  ShieldCheck, Zap, Star, ChevronRight, Building2,
  FileBarChart2, CreditCard, Play
} from 'lucide-react';

const FEATURES = [
  { icon: Upload, title: 'Upload Amazon & Flipkart Reports', desc: 'Excel or CSV — drag, drop, done. Checks column names before processing.' },
  { icon: FileBarChart2, title: 'Auto GST Classification', desc: 'B2B, B2CS, CDNR, HSN, Table 14 — all GSTR-1 sections handled.' },
  { icon: ShieldCheck, title: 'Error Check Before Download', desc: 'GSTIN validation, rate checks, duplicate invoices flagged with row numbers.' },
  { icon: Download, title: 'GSTR-1 JSON & Excel', desc: 'JSON ready to upload to the GST portal. Excel for CA review. Both with one click.' },
];

const STEPS = [
  { n: '1', title: 'Add your GSTIN', desc: 'Enter your business GSTIN — we validate the checksum instantly.' },
  { n: '2', title: 'Upload sales reports', desc: 'Amazon MTR or Flipkart GST report — pick the month and upload.' },
  { n: '3', title: 'Review & fix errors', desc: 'See every error and warning with the exact row number from your file.' },
  { n: '4', title: 'Download & file', desc: 'Get GSTR-1 JSON + Excel. Upload the JSON directly to the GST portal.' },
];

const PLANS = [
  {
    name: 'Free Trial',
    price: '₹0',
    period: '30 days',
    highlight: false,
    features: ['1 GSTIN', '3 returns', 'JSON + Excel download', 'Error checker'],
  },
  {
    name: 'Monthly',
    price: '₹149',
    period: 'per month',
    highlight: true,
    features: ['Unlimited GSTINs', 'Unlimited returns', 'Priority support', 'Return history'],
  },
  {
    name: 'CA Plan',
    price: '₹699',
    period: 'per month',
    highlight: false,
    features: ['Up to 25 GSTINs', 'All platforms', 'Bulk download', 'Dedicated support'],
  },
];

export default function GstLanding() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');

  return (
    <div className="gst-root" style={{ background: 'var(--gst-bg)' }}>

      {/* ── Navbar ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(8,12,24,0.85)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--gst-border)',
        padding: '0 clamp(20px,5vw,80px)',
        height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg,#00d68f,#f5a623)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(0,214,143,0.4)',
          }}>
            <FileText size={18} color="#0a0f1e" />
          </div>
          <div>
            <span style={{ color: 'var(--gst-text)', fontWeight: 800, fontSize: '1.05rem' }}>
              GST<span style={{ color: 'var(--gst-emerald)' }}>Tool</span>
            </span>
            <span style={{ color: 'var(--gst-text-mute)', fontSize: '0.72rem', marginLeft: 8 }}>by LyZov</span>
          </div>
        </div>

        <nav style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <a href="/" className="gst-btn gst-btn-ghost gst-btn-sm" style={{ fontSize: '0.78rem', color: 'var(--gst-text-mute)' }}>← All Tools</a>
          <a href="#features" className="gst-btn gst-btn-ghost gst-btn-sm">Features</a>
          <a href="#how" className="gst-btn gst-btn-ghost gst-btn-sm">How it works</a>
          <a href="#pricing" className="gst-btn gst-btn-ghost gst-btn-sm">Pricing</a>
          <button className="gst-btn gst-btn-outline gst-btn-sm" onClick={() => navigate('/gst-tool/login')}>Log in</button>
          <button className="gst-btn gst-btn-primary gst-btn-sm" onClick={() => navigate('/gst-tool/signup')}>Try Free</button>
        </nav>
      </header>

      {/* ── Hero ── */}
      <section style={{
        textAlign: 'center',
        padding: 'clamp(60px,10vh,120px) clamp(20px,8vw,160px) clamp(40px,6vh,80px)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Background glow blobs */}
        <div style={{
          position: 'absolute', top: '10%', left: '20%',
          width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle,rgba(0,214,143,0.12) 0%,transparent 70%)',
          pointerEvents: 'none', filter: 'blur(40px)',
        }} />
        <div style={{
          position: 'absolute', top: '20%', right: '20%',
          width: 300, height: 300, borderRadius: '50%',
          background: 'radial-gradient(circle,rgba(245,166,35,0.1) 0%,transparent 70%)',
          pointerEvents: 'none', filter: 'blur(40px)',
        }} />

        <div className="gst-badge gst-badge-green" style={{ margin: '0 auto 20px', display: 'inline-flex' }}>
          <Zap size={11} />
          Amazon & Flipkart · GSTR-1 in minutes
        </div>

        <h1 style={{
          fontSize: 'clamp(2.2rem,5vw,4rem)',
          fontWeight: 900,
          lineHeight: 1.1,
          letterSpacing: '-1.5px',
          marginBottom: 20,
          maxWidth: 800,
          margin: '0 auto 20px',
        }}>
          Stop spending hours on<br />
          <span className="gst-gradient-text">GSTR-1. Let it happen in minutes.</span>
        </h1>

        <p style={{
          fontSize: 'clamp(1rem,2vw,1.2rem)',
          color: 'var(--gst-text-sec)',
          maxWidth: 600,
          margin: '0 auto 36px',
          lineHeight: 1.7,
        }}>
          Upload your Amazon MTR or Flipkart GST report. Get GSTR-1 JSON ready to file.
          Error-checked. CA-verified logic. No data sent to any server.
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 20 }}>
          <button className="gst-btn gst-btn-primary gst-btn-lg" onClick={() => navigate('/gst-tool/signup')}>
            Start Free Trial <ArrowRight size={18} />
          </button>
          <button className="gst-btn gst-btn-outline gst-btn-lg" onClick={() => navigate('/gst-tool/help')}>
            <Play size={16} /> Watch Demo
          </button>
        </div>

        <div style={{ display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap' }}>
          {['No credit card', '30-day free trial', 'GSTIN validated'].map(t => (
            <span key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', color: 'var(--gst-text-sec)' }}>
              <CheckCircle2 size={14} color="var(--gst-emerald)" /> {t}
            </span>
          ))}
        </div>
      </section>

      {/* ── Platform Cards ── */}
      <section style={{ padding: '0 clamp(20px,8vw,160px) 60px', display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
        {[
          { name: 'Amazon', report: 'MTR / Merchant Tax Report', color: '#f5a623', emoji: '📦' },
          { name: 'Flipkart', report: 'GST / Sales Tax Report', color: '#00d68f', emoji: '🛒' },
        ].map(p => (
          <div key={p.name} className="gst-card" style={{ flex: '1 1 300px', maxWidth: 380, borderColor: p.color + '30' }}>
            <div style={{ fontSize: '2rem', marginBottom: 12 }}>{p.emoji}</div>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: 4 }}>{p.name} Reports</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--gst-text-sec)' }}>Accepts: <strong style={{ color: p.color }}>{p.report}</strong></div>
            <div style={{ marginTop: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {['B2B','B2CS','CDNR','HSN','Table 14'].map(tag => (
                <span key={tag} className="gst-badge gst-badge-blue" style={{ fontSize: '0.68rem' }}>{tag}</span>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* ── Features ── */}
      <section id="features" style={{ padding: '60px clamp(20px,8vw,160px)' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2 style={{ fontSize: 'clamp(1.6rem,3vw,2.4rem)', fontWeight: 800, letterSpacing: '-0.5px' }}>
            Everything you need for <span className="gst-gradient-text">clean GSTR-1</span>
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 20 }}>
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="gst-card" style={{ transition: 'transform 0.2s,border 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = 'rgba(0,214,143,0.3)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'var(--gst-border)'; }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 12, marginBottom: 16,
                background: 'rgba(0,214,143,0.1)', border: '1px solid rgba(0,214,143,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon size={20} color="var(--gst-emerald)" />
              </div>
              <div style={{ fontWeight: 700, marginBottom: 8, fontSize: '1rem' }}>{title}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--gst-text-sec)', lineHeight: 1.6 }}>{desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how" style={{
        padding: '60px clamp(20px,8vw,160px)',
        background: 'var(--gst-surface)',
        borderTop: '1px solid var(--gst-border)',
        borderBottom: '1px solid var(--gst-border)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2 style={{ fontSize: 'clamp(1.6rem,3vw,2.4rem)', fontWeight: 800, letterSpacing: '-0.5px' }}>
            How it works
          </h2>
          <p style={{ color: 'var(--gst-text-sec)', marginTop: 8 }}>Four steps from raw report to filed GSTR-1</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 24 }}>
          {STEPS.map((s, i) => (
            <div key={s.n} style={{ position: 'relative' }}>
              <div style={{
                width: 44, height: 44, borderRadius: '50%', marginBottom: 16,
                background: 'linear-gradient(135deg,var(--gst-emerald),#00b37a)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 900, fontSize: '1rem', color: '#0a0f1e',
                boxShadow: '0 4px 14px rgba(0,214,143,0.4)',
              }}>{s.n}</div>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>{s.title}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--gst-text-sec)', lineHeight: 1.6 }}>{s.desc}</div>
              {i < STEPS.length - 1 && (
                <ChevronRight size={20} color="var(--gst-text-mute)"
                  style={{ position: 'absolute', top: 12, right: -12, display: 'none' }} />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" style={{ padding: '60px clamp(20px,8vw,160px)' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2 style={{ fontSize: 'clamp(1.6rem,3vw,2.4rem)', fontWeight: 800, letterSpacing: '-0.5px' }}>
            Simple, honest pricing
          </h2>
          <p style={{ color: 'var(--gst-text-sec)', marginTop: 8 }}>Start free. Upgrade when you need more returns.</p>
        </div>
        <div style={{ display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap' }}>
          {PLANS.map(p => (
            <div key={p.name} style={{
              flex: '1 1 260px', maxWidth: 320,
              background: p.highlight ? 'linear-gradient(145deg,rgba(0,214,143,0.08),rgba(0,214,143,0.02))' : 'var(--gst-surface)',
              border: p.highlight ? '2px solid rgba(0,214,143,0.5)' : '1px solid var(--gst-border)',
              borderRadius: 'var(--gst-radius-lg)',
              padding: '28px 24px',
              position: 'relative',
              boxShadow: p.highlight ? 'var(--gst-glow-em)' : 'var(--gst-shadow)',
            }}>
              {p.highlight && (
                <div style={{
                  position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
                  background: 'linear-gradient(135deg,var(--gst-emerald),#00b37a)',
                  color: '#0a0f1e', fontWeight: 800, fontSize: '0.72rem',
                  padding: '4px 14px', borderRadius: 99,
                  whiteSpace: 'nowrap',
                }}>MOST POPULAR</div>
              )}
              <div style={{ fontWeight: 800, fontSize: '1rem', marginBottom: 4 }}>{p.name}</div>
              <div style={{ marginBottom: 16 }}>
                <span style={{ fontSize: '2rem', fontWeight: 900, color: p.highlight ? 'var(--gst-emerald)' : 'var(--gst-text)' }}>{p.price}</span>
                <span style={{ color: 'var(--gst-text-sec)', fontSize: '0.82rem', marginLeft: 4 }}>/ {p.period}</span>
              </div>
              <hr className="gst-divider" style={{ marginBottom: 16 }} />
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px' }}>
                {p.features.map(f => (
                  <li key={f} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10, fontSize: '0.87rem', color: 'var(--gst-text-sec)' }}>
                    <CheckCircle2 size={15} color="var(--gst-emerald)" style={{ flexShrink: 0 }} /> {f}
                  </li>
                ))}
              </ul>
              <button
                className={`gst-btn gst-btn-${p.highlight ? 'primary' : 'outline'}`}
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => navigate('/gst-tool/signup')}
              >
                Get started
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{
        margin: '0 clamp(20px,8vw,160px) 60px',
        background: 'linear-gradient(135deg,rgba(0,214,143,0.1),rgba(245,166,35,0.06))',
        border: '1px solid rgba(0,214,143,0.2)',
        borderRadius: 'var(--gst-radius-lg)',
        padding: 'clamp(32px,5vw,60px)',
        textAlign: 'center',
      }}>
        <h2 style={{ fontSize: 'clamp(1.4rem,3vw,2rem)', fontWeight: 800, marginBottom: 12 }}>
          Ready to file your first GSTR-1?
        </h2>
        <p style={{ color: 'var(--gst-text-sec)', marginBottom: 28 }}>
          No credit card needed. 30-day free trial. Cancel anytime.
        </p>
        <button className="gst-btn gst-btn-primary gst-btn-lg" onClick={() => navigate('/gst-tool/signup')}>
          Start Free Trial <ArrowRight size={18} />
        </button>
      </section>

      {/* ── Footer ── */}
      <footer style={{
        borderTop: '1px solid var(--gst-border)',
        padding: '28px clamp(20px,8vw,160px)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 12,
      }}>
        <div style={{ fontSize: '0.8rem', color: 'var(--gst-text-mute)' }}>
          © {new Date().getFullYear()} LyZov GST Tool · Part of <a href="/" style={{ color: 'var(--gst-text-sec)', textDecoration: 'none' }}>tools.lyzov.com</a>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          {[
            { label: 'Privacy', href: '/privacy-policy' },
            { label: 'Terms', href: '/terms' },
            { label: 'Help', href: '/gst-tool/help' },
          ].map(({ label, href }) => (
            <a key={label} href={href} style={{ fontSize: '0.8rem', color: 'var(--gst-text-mute)', textDecoration: 'none' }}>{label}</a>
          ))}
        </div>
      </footer>
    </div>
  );
}
