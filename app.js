// גרסת האפליקציה – כשמשנים קבצים, מעלים את המספר גם כאן וגם ב-sw.js
const APP_VERSION = '1.0.0';
document.getElementById('appVersion').textContent = APP_VERSION;

const $ = (id) => document.getElementById(id);
function setPill(el, text, kind) {
  el.textContent = text;
  el.className = 'pill' + (kind ? ' ' + kind : '');
}

/* ---------- מצב חיבור לאינטרנט ---------- */
function updateOnline() {
  navigator.onLine
    ? setPill($('stOnline'), 'מחובר', 'ok')
    : setPill($('stOnline'), 'לא מחובר', 'warn');
}
window.addEventListener('online', updateOnline);
window.addEventListener('offline', updateOnline);
updateOnline();

/* ---------- HTTPS ---------- */
window.isSecureContext
  ? setPill($('stSecure'), 'כן', 'ok')
  : setPill($('stSecure'), 'לא – PWA לא תעבוד', 'bad');

/* ---------- אופן הפתיחה: דפדפן או אפליקציה מותקנת ---------- */
function updateMode() {
  const standalone = window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;
  standalone
    ? setPill($('stMode'), 'אפליקציה מותקנת', 'ok')
    : setPill($('stMode'), 'בתוך הדפדפן', '');
}
window.matchMedia('(display-mode: standalone)').addEventListener('change', updateMode);
updateMode();

/* ---------- כמה קבצים שמורים ב-Cache ---------- */
async function updateCacheInfo() {
  if (!('caches' in window)) return setPill($('stCache'), 'לא נתמך', 'bad');
  let count = 0;
  for (const name of await caches.keys()) {
    count += (await (await caches.open(name)).keys()).length;
  }
  count
    ? setPill($('stCache'), count + ' קבצים', 'ok')
    : setPill($('stCache'), 'עדיין אין', 'warn');
}

/* ---------- רישום ה-Service Worker ---------- */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').then((reg) => {
    const showSw = () => {
      if (reg.active) setPill($('stSw'), 'פעיל', 'ok');
      else setPill($('stSw'), 'נטען…', 'warn');
    };
    showSw();

    // גרסה חדשה כבר מחכה
    if (reg.waiting && navigator.serviceWorker.controller) showUpdate(reg.waiting);

    reg.addEventListener('updatefound', () => {
      const sw = reg.installing;
      sw.addEventListener('statechange', () => {
        if (sw.state === 'installed' && navigator.serviceWorker.controller) showUpdate(sw);
        if (sw.state === 'activated') { showSw(); updateCacheInfo(); }
      });
    });
  }).catch((err) => {
    console.error(err);
    setPill($('stSw'), 'שגיאה ברישום', 'bad');
  });

  // אחרי שהגרסה החדשה השתלטה – טוענים מחדש פעם אחת
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloaded) return;
    reloaded = true;
    location.reload();
  });
} else {
  setPill($('stSw'), 'לא נתמך', 'bad');
}
updateCacheInfo();

function showUpdate(worker) {
  $('updateBanner').hidden = false;
  $('reloadBtn').onclick = () => worker.postMessage({ type: 'SKIP_WAITING' });
}

/* ---------- כפתור התקנה ---------- */
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();          // מונע את החלון האוטומטי, נציג כפתור משלנו
  deferredPrompt = e;
  $('installBtn').hidden = false;
});
$('installBtn').addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  $('installBtn').hidden = true;
});
window.addEventListener('appinstalled', () => {
  $('installBtn').hidden = true;
  updateMode();
});

// באייפון אין כפתור התקנה – מציגים הסבר
const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
if (isIos && !window.navigator.standalone) $('iosHint').hidden = false;

/* ---------- רשימת ציוד חסר (נשמרת במכשיר) ---------- */
const KEY = 'pwa-test-items';
function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch { return null; }
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(items)); } catch {}
}
let items = load() || [
  { id: 1, text: 'כפפות לטקס מידה M', done: false },
  { id: 2, text: 'נייר למדפסת A4', done: true },
  { id: 3, text: 'אלכוג׳ל 500 מ"ל', done: false },
];

function render() {
  const list = $('list');
  list.innerHTML = '';
  for (const it of items) {
    const li = document.createElement('li');
    if (it.done) li.className = 'done';

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.id = 'it-' + it.id;
    cb.checked = it.done;
    cb.addEventListener('change', () => { it.done = cb.checked; save(); render(); });

    const label = document.createElement('label');
    label.htmlFor = cb.id;
    label.textContent = it.text;

    const del = document.createElement('button');
    del.className = 'del';
    del.type = 'button';
    del.textContent = '×';
    del.setAttribute('aria-label', 'מחיקת ' + it.text);
    del.addEventListener('click', () => { items = items.filter((x) => x.id !== it.id); save(); render(); });

    li.append(cb, label, del);
    list.append(li);
  }
  $('emptyMsg').hidden = items.length > 0;
}

$('addForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const text = $('itemInput').value.trim();
  if (!text) return;
  items.push({ id: Date.now(), text, done: false });
  $('itemInput').value = '';
  save();
  render();
});

render();
