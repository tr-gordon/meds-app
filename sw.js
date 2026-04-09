// This service worker delegates to OneSignal for push notifications.
// It stays minimal to avoid conflicting with OneSignalSDKWorker.js

self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(clients.claim()));

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({type:'window',includeUncontrolled:true}).then(cs=>{
      const match=cs.find(c=>c.url.includes('/meds-app/'));
      if(match)return match.focus();
      return clients.openWindow('/meds-app/');
    })
  );
});
