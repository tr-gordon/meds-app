const SCOPE = '/meds-app/';

self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(clients.claim()));

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({type:'window',includeUncontrolled:true}).then(cs => {
      const match = cs.find(c => c.url.includes(SCOPE));
      if(match) return match.focus();
      return clients.openWindow(SCOPE);
    })
  );
});

self.addEventListener('message', e => {
  if(!e.data || e.data.type !== 'SCHEDULE_NOTIFS') return;
  const settings = e.data.settings || {};
  const checked = e.data.checked || {};

  if(self._alarms) self._alarms.forEach(t => clearTimeout(t));
  self._alarms = [];

  const MSGS = {
    m: {title:'Time to meditate 🧘', body:'Your meditation reminder. Take a few minutes for yourself.'},
    e: {title:'Time to move 💪',     body:'Your exercise reminder. Even 10 minutes counts.'},
    d: {title:'Meal check-in 🥗',    body:'Have you logged your meals today?'},
    s: {title:'Wind down 🌙',        body:'Start your bedtime routine for a good night\'s rest.'}
  };

  const now = new Date();
  ['m','e','d','s'].forEach(k => {
    const cfg = settings[k];
    if(!cfg || !cfg.enabled || !cfg.time) return;
    if(checked[k]) return;

    const [hh, mm] = cfg.time.split(':').map(Number);
    const fire = new Date();
    fire.setHours(hh, mm, 0, 0);
    if(fire <= now) return;

    const delay = fire - now;
    const t = setTimeout(() => {
      self.registration.showNotification(MSGS[k].title, {
        body: MSGS[k].body,
        icon: SCOPE + 'icon.png',
        badge: SCOPE + 'icon.png',
        tag: 'meds-' + k,
        renotify: true,
        requireInteraction: false,
        vibrate: [200, 100, 200]
      });
    }, delay);
    self._alarms.push(t);
  });
});
