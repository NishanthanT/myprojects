import { useState, useEffect } from 'react';

// Fetches the public site's shop info / social links / about text.
// No auth required — this powers the public marketing website.
export const usePublicSettings = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const refresh=()=>fetch('/api/public/settings',{cache:'no-store'})
      .then(res => res.json())
      .then(data => { if (!cancelled && data.success) setSettings(data.settings); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    refresh();
    const timer=setInterval(refresh,30000);
    const storage=event=>{if(event.key==='stn-public-settings-updated')refresh();};
    window.addEventListener('focus',refresh);
    window.addEventListener('storage',storage);
    window.addEventListener('stn-public-settings-updated',refresh);
    return () => { cancelled = true;clearInterval(timer);window.removeEventListener('focus',refresh);window.removeEventListener('storage',storage);window.removeEventListener('stn-public-settings-updated',refresh); };
  }, []);

  return { settings, loading };
};
