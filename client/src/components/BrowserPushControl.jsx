import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { browserPushSupported, enableBrowserPush, disableBrowserPush } from '../services/browserPush';

export default function BrowserPushControl() {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState(localStorage.getItem('browser-push-user') === user?._id);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!browserPushSupported()) return;
    if (localStorage.getItem('browser-push-user') === user?._id && Notification.permission === 'granted') {
      enableBrowserPush(user._id).then(() => setEnabled(true)).catch(() => setEnabled(false));
    } else setEnabled(false);
  }, [user?._id]);
  if (!browserPushSupported()) return null;
  const toggle = async () => {
    setBusy(true);
    try {
      if (enabled) await disableBrowserPush(); else await enableBrowserPush(user._id);
      setEnabled(!enabled);
      toast.success(enabled ? 'Browser notifications disabled' : 'Browser notifications enabled');
    } catch (error) { toast.error(error.response?.data?.message || error.message); }
    finally { setBusy(false); }
  };
  return <button type="button" disabled={busy} onClick={toggle} className="text-xs text-gold px-4 py-3 w-full text-left border-b border-white/10">{busy ? 'Updating…' : enabled ? 'Disable browser notifications' : 'Enable browser notifications'}</button>;
}
