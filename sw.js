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

// Store schedule in SW global so it survives tab switches
let _schedule = {};
let _checked = {};
let _fired = {};  // track which have already fired today
let _ticker = null;

const MSGS = {
  m: {title:'Time to meditate 🧘', body:'Your meditation reminder. Take a few minutes for yourself.'},
  e: {title:'Time to move 💪',     body:'Your exercise reminder. Even 10 minutes counts.'},
  d: {title:'Meal check-in 🥗',    body:'Have you logged your meals today?'},
  s: {title:'Wind down 🌙',        body:'Start your bedtime routine for a good night\'s rest.'}
};

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function startTicker() {
  if(_ticker) clearInterval(_ticker);
  // Check every 60 seconds
  _ticker = setInterval(checkNotifications, 60 * 1000);
  // Also check immediately
  checkNotifications();
}

function checkNotifications() {
  const now = new Date();
  const today = todayStr();
  const hhmm = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0');

  // Reset fired log on new day
  if(_fired._date !== today) {
    _fired = {_date: today};
  }

  ['m','e','d','s'].forEach(k => {
    const cfg = _schedule[k];
    if(!cfg || !cfg.enabled || !cfg.time) return;
    if(_checked[k]) return;       // already logged today
    if(_fired[k]) return;          // already fired today

    // Fire if we're within 1 minute of the scheduled time
    const [hh, mm] = cfg.time.split(':').map(Number);
    const targetMinutes = hh * 60 + mm;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const diff = nowMinutes - targetMinutes;

    if(diff >= 0 && diff < 2) {  // within a 2-minute window
      _fired[k] = true;
      self.registration.showNotification(MSGS[k].title, {
        body: MSGS[k].body,
        icon: SCOPE + 'icon.png',
        badge: SCOPE + 'icon.png',
        tag: 'meds-' + k,
        renotify: true,
        requireInteraction: false,
        vibrate: [200, 100, 200]
      });
    }
  });
}

self.addEventListener('message', e => {
  if(!e.data) return;

  if(e.data.type === 'SCHEDULE_NOTIFS') {
    _schedule = e.data.settings || {};
    _checked = e.data.checked || {};

    // Reset today's fired log if date changed
    const today = todayStr();
    if(_fired._date !== today) {
      _fired = {_date: today};
    }

    // Update checked state — if a pillar is now done, mark it
    ['m','e','d','s'].forEach(k => {
      if(_checked[k]) _fired[k] = true;
    });

    startTicker();
  }

  if(e.data.type === 'UPDATE_CHECKED') {
    _checked = e.data.checked || {};
    ['m','e','d','s'].forEach(k => {
      if(_checked[k]) _fired[k] = true;
    });
  }
});
