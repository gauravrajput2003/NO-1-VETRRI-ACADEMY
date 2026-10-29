import api from './api';

export const browserPushSupported = () => window.isSecureContext && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
const keyBytes = (value) => Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), (character) => character.charCodeAt(0));
const worker = () => Promise.race([navigator.serviceWorker.ready, new Promise((_, reject) => setTimeout(() => reject(new Error('Notification service is not ready. Reload and retry.')), 10000))]);
const identify = async (registration, userId) => {
  const target = registration.active || navigator.serviceWorker.controller;
  if (!target) return;
  await new Promise((resolve) => {
    const channel = new MessageChannel();
    const timer = setTimeout(resolve, 3000);
    channel.port1.onmessage = () => { clearTimeout(timer); resolve(); };
    target.postMessage({ type: 'PUSH_ACCOUNT', userId: userId || null }, [channel.port2]);
  });
};
export async function enableBrowserPush(userId) {
  if (!browserPushSupported()) throw new Error('This browser does not support notifications.');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Notifications are blocked. Allow them in your browser site settings.');
  const { data } = await api.get('/notifications/browser-push/config');
  if (!data.enabled) throw new Error('Browser notifications are not configured on the academy server yet.');
  const registration = await worker();
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(data.publicKey) });
  try { await api.post('/notifications/browser-push/subscribe', subscription.toJSON()); }
  catch (error) { await subscription.unsubscribe(); throw error; }
  await identify(registration, userId);
  localStorage.setItem('browser-push-user', userId);
}
export async function disableBrowserPush(skipServer = false) {
  localStorage.removeItem('browser-push-user');
  if (!browserPushSupported()) return;
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return;
  await identify(registration, null);
  const notifications = await registration.getNotifications();
  notifications.forEach((notification) => notification.close());
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;
  if (!skipServer) await api.post('/notifications/browser-push/unsubscribe', { endpoint: subscription.endpoint }).catch(() => {});
  await subscription.unsubscribe();
}
