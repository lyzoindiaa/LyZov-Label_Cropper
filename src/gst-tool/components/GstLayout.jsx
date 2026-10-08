import React from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import '../gst.css';
import {
  LayoutDashboard, Building2, Upload, FileBarChart2,
  Download, CreditCard, HelpCircle, LogOut, ChevronRight,
  FileText, Bell, Shield, Crown
} from 'lucide-react';
import { gstApi, getActiveUser } from '../api/client';

const BASE_NAV = [
  { to: '/gst-tool/dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
  { to: '/gst-tool/businesses', label: 'My GSTINs',  icon: Building2 },
  { to: '/gst-tool/upload',     label: 'New Return',  icon: Upload },
  { to: '/gst-tool/summary',    label: 'Summary',     icon: FileBarChart2 },
  { to: '/gst-tool/downloads',  label: 'Downloads',   icon: Download },
  { to: '/gst-tool/billing',    label: 'Billing',     icon: CreditCard },
  { to: '/gst-tool/help',       label: 'Help',        icon: HelpCircle },
];

export default function GstLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getActiveUser();
  const userName = user?.name || 'Seller';
  const userInitial = userName.charAt(0).toUpperCase();
  const isAdmin = user?.role === 'admin';

  const navItems = isAdmin
    ? [
        ...BASE_NAV.slice(0, 1),
        { to: '/gst-tool/admin', label: 'Admin Customers', icon: Shield, isAdminOnly: true },
        ...BASE_NAV.slice(1),
      ]
    : BASE_NAV;

  return (
    <div className="gst-root" style={{ display: 'flex', minHeight: '100vh' }}>
      {/* ── Sidebar ── */}
      <aside style={{
        width: 240,
        flexShrink: 0,
        background: 'var(--gst-surface)',
        borderRight: '1px solid var(--gst-border)',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        height: '100vh',
        overflowY: 'auto',
      }}>
        {/* Logo */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--gst-border)' }}>
          <a href="/gst-tool" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, #00d68f 0%, #f5a623 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 4px 14px rgba(0,214,143,0.4)',
            }}>
              <FileText size={18} color="#0a0f1e" />
            </div>
            <div>
              <div style={{ color: 'var(--gst-text)', fontWeight: 800, fontSize: '0.95rem', lineHeight: 1.1 }}>
                GST<span style={{ color: 'var(--gst-emerald)' }}>Tool</span>
              </div>
              <div style={{ color: 'var(--gst-text-sec)', fontSize: '0.68rem', fontWeight: 500 }}>
                Amazon & Flipkart
              </div>
            </div>
          </a>
        </div>

        {/* Plan / Admin banner */}
        <div style={{
          margin: '12px 12px 0',
          padding: '10px 12px',
          background: isAdmin
            ? 'linear-gradient(135deg,rgba(239,68,68,0.15),rgba(245,166,35,0.08))'
            : 'linear-gradient(135deg,rgba(245,166,35,0.12),rgba(245,166,35,0.04))',
          border: isAdmin ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(245,166,35,0.2)',
          borderRadius: 10,
        }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: isAdmin ? '#fca5a5' : 'var(--gst-gold)', marginBottom: 2 }}>
            {isAdmin ? '🛡️ Super Administrator' : '⚡ Free Trial'}
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--gst-text-sec)', lineHeight: 1.4 }}>
            {isAdmin ? (
              <span style={{ color: '#fca5a5' }}>Full Management Access</span>
            ) : (
              <>Active · <span style={{ color: 'var(--gst-gold)', cursor: 'pointer' }} onClick={() => navigate('/gst-tool/billing')}>Upgrade →</span></>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ padding: '16px 8px', flex: 1 }}>
          {navItems.map(({ to, label, icon: Icon, isAdminOnly }) => {
            const active = location.pathname === to;
            return (
              <NavLink key={to} to={to} style={{ textDecoration: 'none' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px',
                  borderRadius: 10,
                  marginBottom: 2,
                  background: active
                    ? (isAdminOnly ? 'rgba(239,68,68,0.12)' : 'rgba(0,214,143,0.1)')
                    : 'transparent',
                  color: active
                    ? (isAdminOnly ? '#fca5a5' : 'var(--gst-emerald)')
                    : 'var(--gst-text-sec)',
                  fontWeight: active ? 700 : 500,
                  fontSize: '0.88rem',
                  transition: 'all 0.15s',
                  border: active
                    ? (isAdminOnly ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(0,214,143,0.2)')
                    : '1px solid transparent',
                }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'var(--gst-text)'; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--gst-text-sec)'; }}
                >
                  <Icon size={16} />
                  <span style={{ flex: 1 }}>{label}</span>
                  {isAdminOnly && (
                    <span style={{
                      fontSize: '0.62rem', fontWeight: 800, padding: '1px 5px',
                      borderRadius: 4, background: 'rgba(239,68,68,0.2)', color: '#fca5a5'
                    }}>
                      ADMIN
                    </span>
                  )}
                </div>
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom user area */}
        <div style={{ padding: '12px 8px', borderTop: '1px solid var(--gst-border)' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px', borderRadius: 10,
            cursor: 'pointer',
            transition: 'background 0.15s',
          }}
            title="Click to logout"
            onClick={() => {
              gstApi.logout();
              navigate('/gst-tool/login');
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,71,87,0.06)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'linear-gradient(135deg,#4a9eff,#00d68f)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: '0.8rem', color: '#0a0f1e',
            }}>{userInitial}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--gst-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {userName}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--gst-text-mute)' }}>Active Account · Logout</div>
            </div>
            <LogOut size={14} color="var(--gst-text-mute)" />
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Top bar */}
        <header style={{
          height: 60, display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          borderBottom: '1px solid var(--gst-border)',
          background: 'rgba(8,12,24,0.8)',
          backdropFilter: 'blur(12px)',
          position: 'sticky', top: 0, zIndex: 50,
        }}>
          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.83rem', color: 'var(--gst-text-sec)' }}>
            <span>LyZov</span>
            <ChevronRight size={13} />
            <span style={{ color: 'var(--gst-text)', fontWeight: 600 }}>GST Tool</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="gst-btn gst-btn-ghost gst-btn-sm" style={{ padding: '6px 10px', position: 'relative' }}>
              <Bell size={16} />
              <span style={{
                position: 'absolute', top: 4, right: 4,
                width: 7, height: 7, borderRadius: '50%',
                background: 'var(--gst-emerald)', border: '1.5px solid var(--gst-bg)',
              }} />
            </button>
            <button className="gst-btn gst-btn-primary gst-btn-sm" onClick={() => navigate('/gst-tool/upload')}>
              + New Return
            </button>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, padding: '28px 28px 40px', overflow: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
