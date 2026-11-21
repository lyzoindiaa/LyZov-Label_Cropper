import { useState, useEffect } from 'react';

const PREFIX = 'lyzov_tool_prefs_v1_';

/**
 * Persists a tool's user settings in localStorage safely so users don't have to
 * reconfigure options every time they return.
 *
 * @template T
 * @param {string} toolKey
 * @param {T} defaultValue
 * @returns {[T, (updater: T | ((prev: T) => T)) => void, () => void]}
 */
export function useToolSettings(toolKey, defaultValue) {
  const storageKey = `${PREFIX}${toolKey}`;

  const [settings, setSettings] = useState(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return defaultValue;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? { ...defaultValue, ...parsed } : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(settings));
    } catch {
      // Ignore storage quota or private mode failures
    }
  }, [storageKey, settings]);

  const resetSettings = () => {
    setSettings(defaultValue);
    try {
      localStorage.removeItem(storageKey);
    } catch {}
  };

  return [settings, setSettings, resetSettings];
}
