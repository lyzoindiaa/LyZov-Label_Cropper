import React, { createContext, useContext, useState, useEffect } from 'react';
import { pnlApi, getPnlUser, setPnlSession, clearPnlSession } from '../api/client.js';

const PnlAuthContext = createContext(null);

export function PnlAuthProvider({ children }) {
  const [user, setUser] = useState(() => getPnlUser());
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [pricingModalOpen, setPricingModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Listen to storage / custom event updates
    const onUserChanged = (e) => {
      setUser(e.detail);
    };
    window.addEventListener('pnl_user_changed', onUserChanged);

    // If logged in, fetch fresh profile from MongoDB
    if (user) {
      pnlApi.getMe()
        .then(res => {
          if (res.user) {
            setUser(res.user);
            setPnlSession(null, res.user);
          }
        })
        .catch(() => {});
    }

    return () => window.removeEventListener('pnl_user_changed', onUserChanged);
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await pnlApi.login({ email, password });
      setPnlSession(res.token, res.user);
      setUser(res.user);
      setAuthModalOpen(false);
      return res.user;
    } finally {
      setLoading(false);
    }
  };

  const register = async ({ email, password, name, businessName }) => {
    setLoading(true);
    try {
      const res = await pnlApi.register({ email, password, name, businessName });
      setPnlSession(res.token, res.user);
      setUser(res.user);
      setAuthModalOpen(false);
      return res.user;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    clearPnlSession();
    setUser(null);
  };

  // 30-day Free Trial Calculation
  const trialDaysRemaining = user?.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(user.trialEndsAt) - new Date()) / (1000 * 60 * 60 * 24)))
    : 30;

  const isPro = user?.plan === 'pro_199' || user?.plan === 'enterprise_499';
  const isEnterprise = user?.plan === 'enterprise_499';
  const isAdmin = user?.role === 'admin';

  return (
    <PnlAuthContext.Provider
      value={{
        user,
        setUser,
        login,
        register,
        logout,
        loading,
        authModalOpen,
        setAuthModalOpen,
        pricingModalOpen,
        setPricingModalOpen,
        trialDaysRemaining,
        isPro,
        isEnterprise,
        isAdmin,
      }}
    >
      {children}
    </PnlAuthContext.Provider>
  );
}

export function usePnlAuth() {
  const ctx = useContext(PnlAuthContext);
  if (!ctx) throw new Error('usePnlAuth must be used within PnlAuthProvider');
  return ctx;
}
