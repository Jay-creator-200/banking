'use client';

import { useEffect } from 'react';

export default function PwaRegistrar() {
  useEffect(() => {
    if (!('serviceWorker' in navigator) || process.env.NODE_ENV !== 'production') return;

    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch((error) => {
        console.warn('PWA service worker registration failed:', error);
      });
    });
  }, []);

  return null;
}
