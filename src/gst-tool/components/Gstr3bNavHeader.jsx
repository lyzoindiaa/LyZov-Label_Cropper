import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';

const TABS = [
  { path: '/gst-tool/gstr3b',           label: '1. Dashboard & Compute', icon: '📊' },
  { path: '/gst-tool/gstr3b/reconcile', label: '2. Reconcile (GSTR-1 vs 3B)', icon: '🔍' },
  { path: '/gst-tool/gstr3b/itc',       label: '3. GSTR-2B & ITC Review', icon: '📂' },
  { path: '/gst-tool/gstr3b/offset',    label: '4. Set-Off & Net Payable', icon: '🧮' },
  { path: '/gst-tool/gstr3b/downloads', label: '5. Downloads & JSON', icon: '⬇' },
];

export default function Gstr3bNavHeader({ returnId, title, subtitle }) {
  const location = useLocation();

  return (
    <div style={{ marginBottom: 28 }}>
      {/* Top Title Banner */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }}>
              {title || 'GSTR-3B Helper'}
            </h1>
            <span style={{
              background: 'linear-gradient(135deg, rgba(0,214,143,0.2), rgba(0,214,143,0.05))',
              color: '#00d68f',
              border: '1px solid rgba(0,214,143,0.35)',
              fontSize: 11,
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: 6,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              Statutory 3B Module
            </span>
          </div>
          {subtitle && (
            <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: 13 }}>
              {subtitle}
            </p>
          )}
        </div>
        {returnId && (
          <div style={{
            background: 'rgba(30,41,59,0.7)',
            border: '1px solid #334155',
            borderRadius: 8,
            padding: '6px 12px',
            fontSize: 12,
            color: '#cbd5e1',
            fontFamily: 'monospace',
          }}>
            <span style={{ color: '#64748b' }}>Active Return ID: </span>
            <span style={{ color: '#60a5fa', fontWeight: 600 }}>{returnId}</span>
          </div>
        )}
      </div>

      {/* Nav Tabs */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px',
        background: '#1e293b',
        borderRadius: 12,
        border: '1px solid #334155',
        overflowX: 'auto',
      }}>
        {TABS.map(tab => {
          const isActive = location.pathname === tab.path;
          const href = returnId ? `${tab.path}?returnId=${returnId}` : tab.path;

          return (
            <NavLink
              key={tab.path}
              to={href}
              style={{
                textDecoration: 'none',
                flexShrink: 0,
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 14px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#f8fafc' : '#94a3b8',
                background: isActive ? 'linear-gradient(135deg, rgba(59,130,246,0.3), rgba(0,214,143,0.15))' : 'transparent',
                border: isActive ? '1px solid rgba(59,130,246,0.5)' : '1px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}>
                <span style={{ fontSize: 14 }}>{tab.icon}</span>
                <span>{tab.label}</span>
              </div>
            </NavLink>
          );
        })}
      </div>
    </div>
  );
}
