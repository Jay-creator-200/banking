'use client';

import { useEffect, useState } from 'react';
import { MonitorDown } from 'lucide-react';

export default function PwaInstallButton() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    setIsInstalled(mediaQuery.matches || window.navigator.standalone === true);

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };

    const handleInstalled = () => {
      setInstallPrompt(null);
      setIsInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;

    installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  if (isInstalled || !installPrompt) return null;

  return (
    <button
      type="button"
      onClick={handleInstall}
      title="Install desktop app"
      className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors cursor-pointer"
    >
      <MonitorDown className="w-4 h-4" />
      Install App
    </button>
  );
}
