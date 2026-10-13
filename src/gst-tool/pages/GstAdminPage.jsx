import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../gst.css';
import {
  Users, Shield, Search, RefreshCw, Building2,
  FileText, CheckCircle2, Clock, Crown, Mail,
  Phone, Trash2, Edit3, ArrowUpDown, AlertTriangle,
  X
} from 'lucide-react';
import { gstApi, getActiveUser } from '../api/client';

export default function GstAdminPage() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [planFilter, setPlanFilter] = useState('all');

  // Plan Edit Modal state
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [editPlan, setEditPlan] = useState('trial');
  const [extendDays, setExtendDays] = useState(0);
  const [savingPlan, setSavingPlan] = useState(false);
  const [modalSuccess, setModalSuccess] = useState('');

  useEffect(() => {
    const user = getActiveUser();
    setCurrentUser(user);

    if (!user || user.role !== 'admin') {
      // If not admin, redirect to regular dashboard
      navigate('/gst-tool/dashboard');
      return;
    }

    loadAdminData();
  }, [navigate]);

  async function loadAdminData() {
    setLoading(true);
    setError('');
    try {
      const [statsRes, customersRes] = await Promise.all([
        gstApi.getAdminStats(),
        gstApi.getAdminCustomers(),
      ]);

      if (statsRes?.stats) setStats(statsRes.stats);
      if (customersRes?.customers) setCustomers(customersRes.customers);
    } catch (err) {
      console.error('Failed to load admin data:', err);
      setError(err.message || 'Failed to fetch admin data. Check permissions.');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdatePlan(e) {
    e.preventDefault();
    if (!selectedCustomer) return;

    setSavingPlan(true);
    setModalSuccess('');
    try {
      await gstApi.updateCustomerPlan(selectedCustomer.id, {
        plan: editPlan,
        extendDays: parseInt(extendDays, 10) || 0,
      });

      setModalSuccess('Customer plan updated successfully!');
      setTimeout(() => {
        setSelectedCustomer(null);
        setModalSuccess('');
        loadAdminData();
      }, 1000);
    } catch (err) {
      alert(err.message || 'Failed to update plan');
    } finally {
      setSavingPlan(false);
    }
  }

  async function handleDeleteCustomer(cust) {
    if (!window.confirm(`Are you sure you want to permanently delete customer "${cust.name}" (${cust.email})? This removes all their businesses and return filings.`)) {
      return;
    }

    try {
      await gstApi.deleteCustomer(cust.id);
      loadAdminData();
    } catch (err) {
      alert(err.message || 'Failed to delete customer');
    }
  }

  const filteredCustomers = customers.filter(c => {
    const matchSearch =
      c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.businesses?.some(b => b.gstin?.toLowerCase().includes(searchQuery.toLowerCase()) || b.legalName?.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchPlan = planFilter === 'all' || c.plan === planFilter;

    return matchSearch && matchPlan;
  });

  return (
    <div className="gst-animate-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 28 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{
              background: 'linear-gradient(135deg, rgba(239,68,68,0.2), rgba(245,166,35,0.2))',
              border: '1px solid rgba(239,68,68,0.4)',
              color: '#fca5a5', fontSize: '0.75rem', fontWeight: 800,
              padding: '2px 10px', borderRadius: 99, textTransform: 'uppercase', letterSpacing: '0.5px'
            }}>
              Super Admin Console
            </span>
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.5px' }}>
            Customer Management & System Directory
          </h1>
          <p style={{ color: 'var(--gst-text-sec)', fontSize: '0.88rem' }}>
            Restricted administrative view — Manage registered sellers, monitor contact details, subscriptions, and filings.
          </p>
        </div>

        <button
          className="gst-btn gst-btn-outline"
          onClick={loadAdminData}
          disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error && (
        <div style={{
          padding: '14px 18px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 'var(--gst-radius)', color: '#fca5a5', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10
        }}>
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Total Registered Sellers', value: stats?.totalUsers ?? '...', color: 'var(--gst-emerald)', icon: Users },
          { label: 'Active Trial Sellers', value: stats?.trialUsers ?? '...', color: 'var(--gst-gold)', icon: Clock },
          { label: 'Paid Subscribers', value: stats?.paidUsers ?? '...', color: 'var(--gst-purple)', icon: Crown },
          { label: 'Business GSTINs Added', value: stats?.totalBusinesses ?? '...', color: 'var(--gst-blue)', icon: Building2 },
          { label: 'Returns Processed', value: stats?.totalReturns ?? '...', color: 'var(--gst-emerald)', icon: FileText },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="gst-card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 42, height: 42, borderRadius: 12,
                background: 'rgba(255,255,255,0.04)', border: '1px solid var(--gst-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Icon size={18} color={s.color} />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--gst-text-sec)', marginBottom: 2 }}>{s.label}</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters and Search Bar */}
      <div className="gst-card" style={{ marginBottom: 24, padding: 18 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: '1 1 280px' }}>
            <Search size={16} color="var(--gst-text-sec)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              className="gst-input"
              placeholder="Search by customer name, email, phone, or GSTIN..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ paddingLeft: 38 }}
            />
          </div>

          {/* Plan Filter */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--gst-text-sec)', fontWeight: 600 }}>Plan:</span>
            {['all', 'trial', 'starter', 'pro'].map(p => (
              <button
                key={p}
                className={`gst-btn gst-btn-sm ${planFilter === p ? 'gst-btn-primary' : 'gst-btn-outline'}`}
                onClick={() => setPlanFilter(p)}
                style={{ textTransform: 'capitalize' }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Customers Table */}
      <div className="gst-card" style={{ marginBottom: 30 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>
            Registered Sellers Directory ({filteredCustomers.length})
          </h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--gst-text-sec)' }}>
            Strict privacy active — Only admins can see this directory
          </span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--gst-text-sec)' }}>
            Loading customer accounts...
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--gst-text-sec)' }}>
            No customer accounts matched your search.
          </div>
        ) : (
          <div className="gst-table-wrap">
            <table className="gst-table">
              <thead>
                <tr>
                  <th>Customer / Contact</th>
                  <th>Business & GSTIN</th>
                  <th>Role</th>
                  <th>Subscription Plan</th>
                  <th>Filings</th>
                  <th>Joined Date</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map(cust => (
                  <tr key={cust.id}>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--gst-text)' }}>{cust.name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: 'var(--gst-text-sec)', marginTop: 2 }}>
                        <Mail size={12} /> {cust.email}
                      </div>
                      {cust.phone && cust.phone !== '—' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--gst-text-sec)', marginTop: 2 }}>
                          <Phone size={12} /> {cust.phone}
                        </div>
                      )}
                    </td>

                    <td>
                      {cust.businesses?.length > 0 ? (
                        cust.businesses.map(b => (
                          <div key={b.id || b.gstin} style={{ marginBottom: 4 }}>
                            <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{b.legalName}</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--gst-gold)', fontFamily: 'monospace' }}>
                              {b.gstin} ({b.stateName || b.stateCode})
                            </div>
                          </div>
                        ))
                      ) : (
                        <span style={{ color: 'var(--gst-text-sec)', fontSize: '0.82rem', fontStyle: 'italic' }}>
                          No GSTIN added yet
                        </span>
                      )}
                    </td>

                    <td>
                      {cust.role === 'admin' ? (
                        <span style={{
                          background: 'rgba(239,68,68,0.15)', color: '#fca5a5',
                          border: '1px solid rgba(239,68,68,0.3)', padding: '2px 8px',
                          borderRadius: 6, fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase'
                        }}>
                          Admin
                        </span>
                      ) : (
                        <span style={{
                          background: 'rgba(59,130,246,0.1)', color: '#93c5fd',
                          border: '1px solid rgba(59,130,246,0.2)', padding: '2px 8px',
                          borderRadius: 6, fontSize: '0.75rem', fontWeight: 600
                        }}>
                          Seller
                        </span>
                      )}
                    </td>

                    <td>
                      <span className={`gst-tag ${cust.plan === 'pro' ? 'gst-tag-success' : cust.plan === 'starter' ? 'gst-tag-warning' : 'gst-tag-info'}`} style={{ textTransform: 'capitalize' }}>
                        {cust.plan}
                      </span>
                      {cust.plan === 'trial' && cust.trialEndsAt && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--gst-text-sec)', marginTop: 4 }}>
                          Expires: {new Date(cust.trialEndsAt).toLocaleDateString('en-IN')}
                        </div>
                      )}
                    </td>

                    <td>
                      <span style={{ fontWeight: 700, color: cust.returnsCount > 0 ? 'var(--gst-emerald)' : 'var(--gst-text-sec)' }}>
                        {cust.returnsCount} returns
                      </span>
                    </td>

                    <td style={{ color: 'var(--gst-text-sec)', fontSize: '0.82rem' }}>
                      {new Date(cust.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button
                          className="gst-btn gst-btn-sm gst-btn-outline"
                          title="Manage Plan / Extend Trial"
                          onClick={() => {
                            setSelectedCustomer(cust);
                            setEditPlan(cust.plan || 'trial');
                            setExtendDays(0);
                            setModalSuccess('');
                          }}
                        >
                          <Edit3 size={12} /> Edit Plan
                        </button>
                        {cust.id !== currentUser?.id && cust.role !== 'admin' && (
                          <button
                            className="gst-btn gst-btn-sm"
                            style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}
                            title="Delete User"
                            onClick={() => handleDeleteCustomer(cust)}
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Plan / Trial Edit Modal */}
      {selectedCustomer && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20
        }}>
          <div className="gst-card gst-animate-in" style={{ width: '100%', maxWidth: 460, position: 'relative' }}>
            <button
              onClick={() => setSelectedCustomer(null)}
              style={{
                position: 'absolute', right: 16, top: 16, background: 'none',
                border: 'none', color: 'var(--gst-text-sec)', cursor: 'pointer'
              }}
            >
              <X size={18} />
            </button>

            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 4 }}>
              Manage Customer Subscription
            </h3>
            <p style={{ color: 'var(--gst-text-sec)', fontSize: '0.85rem', marginBottom: 20 }}>
              Adjust plan and trial period for <strong>{selectedCustomer.name}</strong> ({selectedCustomer.email}).
            </p>

            {modalSuccess && (
              <div style={{
                padding: '10px 14px', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)',
                borderRadius: 8, color: 'var(--gst-emerald)', fontSize: '0.85rem', marginBottom: 16
              }}>
                ✓ {modalSuccess}
              </div>
            )}

            <form onSubmit={handleUpdatePlan}>
              <div className="gst-form-group">
                <label className="gst-label">Subscription Plan</label>
                <select
                  className="gst-input"
                  value={editPlan}
                  onChange={e => setEditPlan(e.target.value)}
                >
                  <option value="trial">Trial (Free 30-Day Evaluation)</option>
                  <option value="starter">Starter (Single GSTIN - ₹149/mo)</option>
                  <option value="pro">Pro (Unlimited GSTINs - ₹499/mo)</option>
                </select>
              </div>

              <div className="gst-form-group">
                <label className="gst-label">Extend Trial By (Days)</label>
                <select
                  className="gst-input"
                  value={extendDays}
                  onChange={e => setExtendDays(Number(e.target.value))}
                >
                  <option value={0}>Do not extend</option>
                  <option value={15}>+ 15 Days</option>
                  <option value={30}>+ 30 Days (1 Month)</option>
                  <option value={60}>+ 60 Days (2 Months)</option>
                  <option value={365}>+ 365 Days (1 Year)</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
                <button
                  type="button"
                  className="gst-btn gst-btn-ghost"
                  onClick={() => setSelectedCustomer(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="gst-btn gst-btn-primary"
                  disabled={savingPlan}
                >
                  {savingPlan ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
