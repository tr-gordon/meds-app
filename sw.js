self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(clients.claim()));

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({type:'window',includeUncontrolled:true}).then(cs => {
      if(cs.length) return cs[0].focus();
      return clients.openWindow('/');
    })
  );
});

self.addEventListener('message', e => {
  if(e.data && e.data.type === 'SCHEDULE_NOTIFS') {
    const settings = e.data.settings || {};
    const checked = e.data.checked || {};
    // Clear old alarms
    if(self._alarms) self._alarms.forEach(t => clearTimeout(t));
    self._alarms = [];
    const MSGS = {
      m: {title:'Time to meditate', body:'Your meditation reminder. Take a few minutes for yourself.'},
      e: {title:'Time to move', body:'Your exercise reminder. Even 10 minutes counts.'},
      d: {title:'Meal check-in', body:'Have you logged your meals today?'},
      s: {title:'Wind down for sleep', body:'Start your bedtime routine for a good night\'s rest.'}
    };
    const now = new Date();
    ['m','e','d','s'].forEach(k => {
      const cfg = settings[k];
      if(!cfg || !cfg.enabled || !cfg.time) return;
      if(checked[k]) return; // already done today
      const [hh, mm] = cfg.time.split(':').map(Number);
      const fire = new Date();
      fire.setHours(hh, mm, 0, 0);
      if(fire <= now) return;
      const delay = fire - now;
      const t = setTimeout(() => {
        self.registration.showNotification(MSGS[k].title, {
          body: MSGS[k].body,
          icon: '/icon.png',
          badge: '/icon.png',
          tag: 'meds-' + k,
          renotify: true,
          requireInteraction: false
        });
      }, delay);
      self._alarms.push(t);
    });
  }
});
