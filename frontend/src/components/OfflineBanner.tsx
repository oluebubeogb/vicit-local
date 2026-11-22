'use client';

import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { api } from '@/lib/api';

/** v33: concise banner when the device is offline or the local Vicit server can't be reached. */
export default function OfflineBanner() {
  const [down, setDown] = useState(false);
  useEffect(() => {
    const onApi = (e: Event) => setDown(!(e as CustomEvent).detail?.up);
    const onOffline = () => setDown(true);
    const onOnline = () => { api.health().catch(() => {}); };
    window.addEventListener('vicit:api', onApi);
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    if (typeof navigator !== 'undefined' && navigator.onLine === false) setDown(true);
    return () => {
      window.removeEventListener('vicit:api', onApi);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
    };
  }, []);
  // While down, retry quietly every 10 s so the banner clears by itself.
  useEffect(() => {
    if (!down) return;
    const t = window.setInterval(() => { api.health().then(() => setDown(false)).catch(() => {}); }, 10000);
    return () => window.clearInterval(t);
  }, [down]);
  if (!down) return null;
  return (
    <div role="status" className="fixed inset-x-0 top-0 z-[90] flex items-center justify-center gap-2 bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white shadow" data-testid="offline-banner">
      <WifiOff size={14} /> Offline — can&apos;t reach the Vicit server. Actions will work again once it is back.
    </div>
  );
}
