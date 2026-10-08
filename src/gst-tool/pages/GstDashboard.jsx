import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../gst.css';
import {
  ArrowRight, FileText, AlertTriangle, CheckCircle2,
  Clock, TrendingUp, Upload, Download, Building2
} from 'lucide-react';
import { gstApi, getActiveUser } from '../api/client';

export default function GstDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [businessCount, setBusinessCount] = useState(0);
  const [recentReturns, setRecentReturns] = useState([]);
  const [trialDaysLeft, setTrialDaysLeft] = useState(30);

  useEffect(() => {
    const active = getActiveUser();
    if (active) {
      setUser(active);
      if (active.trialEndsAt) {
        const diff = Math.ceil((new Date(active.trialEndsAt) - new Date()) / (1000 * 60 * 60 * 24));
        setTrialDaysLeft(Math.max(0, diff));
      }
    }

    async function loadData() {
      try {
        const bizRes = await gstApi.getBusinesses();
        if (bizRes?.businesses) {
          setBusinessCount(bizRes.businesses.length);
        } else {
          setBusinessCount(0);
        }

        const retRes = await gstApi.getReturnHistory();
        if (retRes?.returns) {
          setRecentReturns(retRes.returns.slice(0, 5));
        } else {
          setRecentReturns([]);
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
        setRecentReturns([]);
      }
    }
    loadData();
  }, []);

  const userName = user?.name ? user.name.split(' ')[0] : 'Seller';

  return (
    <div className="gst-animate-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 4 }}>
            Good day, {userName} 👋
          </h1>
          <p style={{ color: 'var(--gst-text-sec)', fontSize: '0.88rem' }}>
            FY 2026-27 · Returns due by <strong style={{ color: 'var(--gst-gold)' }}>11th of every month</strong>
          </p>
        </div>
        <button className="gst-btn gst-btn-primary" onClick={() => navigate('/gst-tool/upload')}>
          <Upload size={16} /> New Return <ArrowRight size={14} />
        </button>
      </div>

      {/* Trial notice */}
      {user?.plan === 'trial' && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          background: 'linear-gradient(135deg,rgba(245,166,35,0.08),rgba(245,166,35,0.03))',
          border: '1px solid rgba(245,166,35,0.25)',
          borderRadius: 'var(--gst-radius)', padding: '14px 20px', marginBottom: 28,
        }}>
          <Clock size={18} color="var(--gst-gold)" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <span style={{ fontWeight: 700, color: 'var(--gst-gold)', fontSize: '0.9rem' }}>
              {trialDaysLeft} days left on your free trial.
            </span>
            <span style={{ color: 'var(--gst-text-sec)', fontSize: '0.85rem', marginLeft: 8 }}>
              Upgrade anytime for unlimited business GSTINs and priority filing support.
            </span>
          </div>
          <button className="gst-btn gst-btn-gold gst-btn-sm" onClick={() => navigate('/gst-tool/billing')}>
            Upgrade ₹149/mo
          </button>
        </div>
      )}

      {/* Quick stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16, marginBottom: 32 }}>
        {[
          { label: 'Total Returns Filed', value: recentReturns.length, color: 'var(--gst-emerald)', icon: FileText },
          { label: 'Active Business GSTINs', value: businessCount, color: 'var(--gst-blue)', icon: Building2 },
          { label: 'GST Compliance Rate', value: recentReturns.length > 0 ? '100%' : '—', color: 'var(--gst-emerald)', icon: CheckCircle2 },
          { label: 'Next Due Date', value: '11 Nov', color: 'var(--gst-gold)', icon: Clock },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="gst-card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: 'rgba(255,255,255,0.04)', border: '1px solid var(--gst-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Icon size={20} color={s.color} />
              </div>
              <div>
                <div style={{ fontSize: '0.78rem', color: 'var(--gst-text-sec)', marginBottom: 2 }}>{s.label}</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Returns */}
      <div className="gst-card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Recent Returns</h2>
          {recentReturns.length > 0 && (
            <button className="gst-btn gst-btn-ghost gst-btn-sm" onClick={() => navigate('/gst-tool/downloads')}>
              View all <ArrowRight size={13} />
            </button>
          )}
        </div>

        {recentReturns.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', border: '1px dashed var(--gst-border)', borderRadius: 'var(--gst-radius)' }}>
            <FileText size={40} color="var(--gst-text-sec)" style={{ margin: '0 auto 12px', opacity: 0.6 }} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 6 }}>No returns generated yet</h3>
            <p style={{ color: 'var(--gst-text-sec)', fontSize: '0.85rem', maxWidth: 420, margin: '0 auto 20px' }}>
              Upload your Amazon MTR, Flipkart, or Meesho monthly sales report to generate compliant GSTR-1 JSON and Excel files.
            </p>
            <button className="gst-btn gst-btn-primary" onClick={() => navigate('/gst-tool/upload')}>
              <Upload size={15} /> Upload Sales Report
            </button>
          </div>
        ) : (
          <div className="gst-table-wrap">
            <table className="gst-table">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Status</th>
                  <th>Taxable Value</th>
                  <th>Total Tax</th>
                  <th>Invoices</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentReturns.map(r => (
                  <tr key={r._id || r.id}>
                    <td style={{ fontWeight: 700 }}>
                      {r.period ? `${r.period.slice(0, 2)}/${r.period.slice(2)}` : 'Current'}
                    </td>
                    <td>
                      <span className="gst-tag gst-tag-success">Generated</span>
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {r.totals?.taxableValuePaise ? `₹${(r.totals.taxableValuePaise / 100).toLocaleString('en-IN')}` : '₹0'}
                    </td>
                    <td style={{ color: 'var(--gst-emerald)', fontWeight: 700 }}>
                      {r.totals?.totalTaxPaise ? `₹${(r.totals.totalTaxPaise / 100).toLocaleString('en-IN')}` : '₹0'}
                    </td>
                    <td style={{ color: 'var(--gst-text-sec)' }}>
                      {r.totals?.totalInvoices || 0}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="gst-btn gst-btn-sm gst-btn-outline" onClick={() => navigate('/gst-tool/downloads')}>
                        <Download size={12} /> Files
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
