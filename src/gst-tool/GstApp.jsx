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
import Gstr3bDashboard from './pages/Gstr3bDashboard';
import Gstr3bReconcile from './pages/Gstr3bReconcile';
import Gstr3bItcReview from './pages/Gstr3bItcReview';
import Gstr3bOffsetPayable from './pages/Gstr3bOffsetPayable';
import Gstr3bDownloads from './pages/Gstr3bDownloads';

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

        {/* GSTR-3B Helper pages */}
        <Route path="/gstr3b" element={<Gstr3bDashboard />} />
        <Route path="/gstr3b/reconcile" element={<Gstr3bReconcile />} />
        <Route path="/gstr3b/itc" element={<Gstr3bItcReview />} />
        <Route path="/gstr3b/offset" element={<Gstr3bOffsetPayable />} />
        <Route path="/gstr3b/downloads" element={<Gstr3bDownloads />} />
      </Route>
    </Routes>
  );
}
