import React from 'react';
import { Routes, Route } from 'react-router-dom';
import GstLayout from './components/GstLayout';
import GstLanding from './pages/GstLanding';
import GstLogin from './pages/GstLogin';
import GstSignup from './pages/GstSignup';
import GstDashboard from './pages/GstDashboard';
import GstBusinesses from './pages/GstBusinesses';
import GstUpload from './pages/GstUpload';
import GstSummary from './pages/GstSummary';
import GstDownloads from './pages/GstDownloads';
import GstBilling from './pages/GstBilling';
import GstHelp from './pages/GstHelp';
import GstAdminPage from './pages/GstAdminPage';

export default function GstApp() {
  return (
    <Routes>
      {/* Public landing page — no layout wrapper */}
      <Route path="/" element={<GstLanding />} />
      <Route path="/login" element={<GstLogin />} />
      <Route path="/signup" element={<GstSignup />} />

      {/* App pages — inside shared layout */}
      <Route element={<GstLayout />}>
        <Route path="/dashboard" element={<GstDashboard />} />
        <Route path="/admin" element={<GstAdminPage />} />
        <Route path="/businesses" element={<GstBusinesses />} />
        <Route path="/upload" element={<GstUpload />} />
        <Route path="/summary" element={<GstSummary />} />
        <Route path="/downloads" element={<GstDownloads />} />
        <Route path="/billing" element={<GstBilling />} />
        <Route path="/help" element={<GstHelp />} />
      </Route>
    </Routes>
  );
}
