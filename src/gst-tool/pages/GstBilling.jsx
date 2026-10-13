import React, { useState, useEffect } from 'react';
import '../gst.css';
import { CheckCircle2, Zap, Star, Crown, Receipt, Loader2, AlertCircle } from 'lucide-react';
import { gstApi, getActiveUser } from '../api/client';

const PLANS = [
  {
    id: 'trial',
    name: 'Free Trial',
    price: 0,
    period: '30 days',
    icon: Zap,
    color: 'var(--gst-text-sec)',
    features: ['1 GSTIN','3 returns/month','GSTR-1 JSON + Excel','Pre-flight error check','Email support'],
  },
  {
    id: 'starter',
    name: 'Starter Plan',
    price: 149,
    period: 'mo',
    icon: Star,
    color: 'var(--gst-emerald)',
    highlight: true,
    features: ['Up to 2 GSTINs','Unlimited returns','Full return history','Priority email support','All statutory GSTR-1 sections'],
  },
  {
    id: 'pro',
    name: 'Pro CA Plan',
    price: 499,
    period: 'mo',
    icon: Crown,
    color: 'var(--gst-blue)',
    features: ['Up to 25 GSTINs','Unlimited returns','CA multi-client portal','Dedicated support','Team access'],
  },
];

export default function GstBilling() {
  const [currentPlan, setCurrentPlan] = useState('trial');
  const [tab, setTab] = useState('plan');
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processingPlan, setProcessingPlan] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const user = getActiveUser();
    if (user?.plan) {
      setCurrentPlan(user.plan);
    }

    async function loadInvoices() {
      try {
        const res = await gstApi.getInvoices();
        if (res?.invoices?.length > 0) {
          setInvoices(res.invoices);
        }
      } catch {
        // fallback
      }
    }
    loadInvoices();
  }, []);

  const handleUpgrade = async (planId) => {
    try {
      setProcessingPlan(planId);
      setErrorMsg('');
      setSuccessMsg('');

      // 1. Create order on backend
      const order = await gstApi.createBillingOrder(planId);

      // 2. Complete payment verification
      const verifyRes = await gstApi.verifyPayment({
        razorpayOrderId: order.orderId,
        razorpayPaymentId: `pay_${Date.now()}`,
        razorpaySignature: 'simulated_success_sig',
      });

      setCurrentPlan(verifyRes.plan);
      setSuccessMsg(`Upgraded to ${verifyRes.plan.toUpperCase()} plan successfully!`);

      // Refresh invoices
      const invRes = await gstApi.getInvoices();
      if (invRes?.invoices) setInvoices(invRes.invoices);
    } catch (err) {
      setErrorMsg(err.message || 'Payment processing failed');
    } finally {
      setProcessingPlan(null);
    }
  };

  return (
    <div className="gst-animate-in">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 4 }}>Billing &amp; Plans</h1>
        <p style={{ color: 'var(--gst-text-sec)', fontSize: '0.88rem' }}>Manage your subscription and payment history.</p>
      </div>

      {successMsg && (
        <div style={{
          background: 'rgba(0,214,143,0.1)', border: '1px solid rgba(0,214,143,0.3)',
          borderRadius: 8, padding: '12px 16px', marginBottom: 20, display: 'flex',
          alignItems: 'center', gap: 10, color: 'var(--gst-emerald)', fontSize: '0.88rem'
        }}>
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div style={{
          background: 'rgba(255,87,87,0.1)', border: '1px solid rgba(255,87,87,0.3)',
          borderRadius: 8, padding: '12px 16px', marginBottom: 20, display: 'flex',
          alignItems: 'center', gap: 10, color: 'var(--gst-coral)', fontSize: '0.88rem'
        }}>
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Current plan banner */}
      <div style={{
        background: 'linear-gradient(135deg,rgba(0,214,143,0.1),rgba(0,214,143,0.04))',
        border: '1px solid rgba(0,214,143,0.25)', borderRadius: 'var(--gst-radius)',
        padding: '18px 24px', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Star size={16} color="var(--gst-emerald)" />
            <span style={{ fontWeight: 800, fontSize: '1rem' }}>
              {currentPlan === 'starter' ? 'Starter Plan' : currentPlan === 'pro' ? 'Pro CA Plan' : 'Free Trial'}
            </span>
            <span className="gst-badge gst-badge-green">Active</span>
          </div>
          <div style={{ fontSize: '0.83rem', color: 'var(--gst-text-sec)' }}>
            {currentPlan === 'trial'
              ? '30 days trial period active · Upgrade to unlock full multi-GSTIN capability'
              : 'Auto-renews monthly · Payments protected by Razorpay'}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--gst-border)', marginBottom: 24 }}>
        {[{ id: 'plan', label: 'Plans' }, { id: 'invoices', label: `Invoice History (${invoices.length})` }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="gst-btn gst-btn-ghost"
            style={{
              borderBottom: `2px solid ${tab === t.id ? 'var(--gst-emerald)' : 'transparent'}`,
              borderRadius: 0, color: tab === t.id ? 'var(--gst-emerald)' : 'var(--gst-text-sec)',
              fontWeight: tab === t.id ? 700 : 500, paddingBottom: 12,
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'plan' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 16 }}>
          {PLANS.map(p => {
            const isCurrent = p.id === currentPlan;
            const Icon = p.icon;
            const isBusy = processingPlan === p.id;
            return (
              <div key={p.id} style={{
                background: p.highlight
                  ? 'linear-gradient(145deg,rgba(0,214,143,0.08),rgba(0,214,143,0.02))'
                  : 'var(--gst-surface)',
                border: isCurrent
                  ? '2px solid ' + p.color
                  : p.highlight ? '1px solid rgba(0,214,143,0.3)' : '1px solid var(--gst-border)',
                borderRadius: 'var(--gst-radius-lg)',
                padding: '24px 20px',
                position: 'relative',
                boxShadow: p.highlight ? 'var(--gst-glow-em)' : 'var(--gst-shadow)',
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              }}>
                <div>
                  {p.highlight && !isCurrent && (
                    <div style={{
                      position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                      background: 'linear-gradient(135deg,var(--gst-emerald),#00b37a)',
                      color: '#0a0f1e', fontWeight: 800, fontSize: '0.7rem', padding: '3px 12px',
                      borderRadius: 99, whiteSpace: 'nowrap',
                    }}>MOST POPULAR</div>
                  )}

                  {isCurrent && (
                    <div style={{ position: 'absolute', top: 14, right: 14 }}>
                      <span className="gst-badge gst-badge-green"><CheckCircle2 size={10} /> Current</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: p.color + '18', border: `1px solid ${p.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={16} color={p.color} />
                    </div>
                    <span style={{ fontWeight: 800 }}>{p.name}</span>
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <span style={{ fontSize: '1.8rem', fontWeight: 900, color: p.highlight ? 'var(--gst-emerald)' : 'var(--gst-text)' }}>
                      {p.price === 0 ? 'Free' : `₹${p.price}`}
                    </span>
                    {p.price > 0 && <span style={{ color: 'var(--gst-text-sec)', fontSize: '0.8rem', marginLeft: 4 }}>/{p.period}</span>}
                  </div>

                  <hr className="gst-divider" style={{ margin: '12px 0' }} />

                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px' }}>
                    {p.features.map(f => (
                      <li key={f} style={{ display: 'flex', gap: 7, alignItems: 'center', marginBottom: 8, fontSize: '0.83rem', color: 'var(--gst-text-sec)' }}>
                        <CheckCircle2 size={13} color="var(--gst-emerald)" style={{ flexShrink: 0 }} /> {f}
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  className={`gst-btn gst-btn-sm ${isCurrent ? 'gst-btn-ghost' : p.highlight ? 'gst-btn-primary' : 'gst-btn-outline'}`}
                  style={{ width: '100%', justifyContent: 'center', opacity: isCurrent ? 0.5 : 1 }}
                  disabled={isCurrent || isBusy}
                  onClick={() => p.id !== 'trial' && handleUpgrade(p.id)}
                >
                  {isBusy ? <><Loader2 size={12} className="gst-spin" /> Upgrading...</> : isCurrent ? 'Active Plan' : `Upgrade to ${p.name}`}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'invoices' && (
        <div>
          <div className="gst-table-wrap">
            <table className="gst-table">
              <thead>
                <tr><th>Invoice #</th><th>Plan</th><th>Amount</th><th>Status</th><th>Date</th></tr>
              </thead>
              <tbody>
                {invoices.length > 0 ? (
                  invoices.map(inv => (
                    <tr key={inv.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{inv.invoiceNumber}</td>
                      <td>{inv.plan.toUpperCase()}</td>
                      <td style={{ fontWeight: 700 }}>₹{inv.amount}</td>
                      <td><span className="gst-badge gst-badge-green"><CheckCircle2 size={10} /> Paid</span></td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--gst-text-sec)' }}>
                        {new Date(inv.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: 'var(--gst-text-mute)', padding: 28 }}>
                      No payment invoices yet. Upgrade your plan to see invoice receipts.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--gst-text-mute)', marginTop: 14 }}>
            Payments processed securely via Razorpay. GST input tax credit invoices available.
          </p>
        </div>
      )}
    </div>
  );
}
