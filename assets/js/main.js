/* Portfolio behaviour: boot, reveals, chapter tracking, scrollytelling stages,
   live app embeds, Render wake-ups, the university gallery and small HUD bits. */

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const root = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = () => window.innerWidth < 900;
const touch = matchMedia('(hover: none)').matches;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
let expanded = null;   // the live app currently shown full screen, if any
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
};

/* ============================================================
   Swarm (WebGL). The page works without it.
   ============================================================ */
let swarm = null;
let swarmState = { name: 'hero', dim: false };
import('./swarm.js')
  .then(m => {
    swarm = m.createSwarm($('#swarm'), { mobile: isMobile() && touch, reduced });
    swarm.setTheme(root.dataset.theme === 'light');
    swarm.setState(swarmState.name, { dim: swarmState.dim });
  })
  .catch(() => root.classList.add('no-webgl'));

const ATMOS = { hero: '#3df2ff', about: '#8b5cff', journey: '#3df2ff', brac: '#ff2e93', agami: '#ff2e93', voice: '#3df2ff', local: '#b6ff3d', field: '#1ed6a0', schedule: '#c86bff', qr: '#ff4fa8', uni: '#8b5cff', skills: '#3df2ff', contact: '#ff2e93' };
function setSwarm(name, dim) {
  if (swarmState.name === name && swarmState.dim === dim) return;
  swarmState = { name, dim };
  if (swarm) swarm.setState(name, { dim });
  root.style.setProperty('--atmos', ATMOS[name] || '#3df2ff');
}

/* ============================================================
   Theme
   ============================================================ */
function applyTheme(t) {
  root.dataset.theme = t;
  store.set('aem-theme', t);
  $('meta[name="theme-color"]').setAttribute('content', t === 'light' ? '#f3f4fa' : '#05060c');
  if (swarm) swarm.setTheme(t === 'light');
}
$('#themeBtn').addEventListener('click', () => applyTheme(root.dataset.theme === 'light' ? 'dark' : 'light'));

/* ============================================================
   Mobile menu
   ============================================================ */
const menuBtn = $('#menuBtn'), mobileNav = $('#mobileNav');
function setMenu(open) {
  mobileNav.hidden = !open;
  menuBtn.setAttribute('aria-expanded', String(open));
  menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  document.body.classList.toggle('menu-open', open);
}
function closeMenu() { if (!mobileNav.hidden) setMenu(false); }
menuBtn.addEventListener('click', () => setMenu(mobileNav.hidden));
$$('a', mobileNav).forEach(a => a.addEventListener('click', closeMenu));
// tapping the empty area of the menu closes it
mobileNav.addEventListener('click', e => { if (e.target === mobileNav) closeMenu(); });

/* ============================================================
   Text effects: split words, scramble, reveals, counters
   ============================================================ */
$$('[data-split]').forEach(el => {
  const words = el.textContent.trim().split(/\s+/);
  el.setAttribute('aria-label', el.textContent.trim());
  el.innerHTML = words.map((w, i) => `<span class="w" aria-hidden="true"><span style="--i:${i}">${w}</span></span>`).join(' ');
});

const GLYPHS = '▓▒░<>/\\|_=+*#01ABCDEFX';
function scramble(el) {
  if (reduced) return;
  const final = el.dataset.text || (el.dataset.text = el.textContent);
  let f = 0; const total = 28;
  const tick = () => {
    f++;
    const reveal = f / total * final.length;
    el.textContent = [...final].map((c, i) => (c === ' ' || i < reveal) ? c : GLYPHS[Math.random() * GLYPHS.length | 0]).join('');
    if (f < total) requestAnimationFrame(tick); else el.textContent = final;
  };
  tick();
}

function countUp(el) {
  if (el.dataset.done) return;
  el.dataset.done = 1;
  const to = parseFloat(el.dataset.to), dec = +(el.dataset.dec || 0);
  if (reduced) { el.textContent = to.toFixed(dec); return; }
  const t0 = performance.now(), dur = 1400;
  const step = now => {
    const p = clamp((now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
    el.textContent = (to * e).toFixed(dec).replace(/\B(?=(\d{3})+(?!\d))/g, dec ? '' : ',');
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function startReveals() {
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      const el = en.target;
      el.classList.add('in');
      if (el.classList.contains('scramble')) scramble(el);
      $$('.count', el).forEach(c => { if (!c.closest('.scene')) countUp(c); });
      if (el.classList.contains('count')) countUp(el);
      io.unobserve(el);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: .12 });
  $$('.reveal, [data-split], .scramble').forEach(el => io.observe(el));
}

/* ============================================================
   Boot sequence (first visit per session only)
   ============================================================ */
const boot = $('#boot');
let booted = false;
function finishBoot() {
  if (booted) return;
  booted = true;
  boot.classList.add('done');
  try { sessionStorage.setItem('aem-boot', '1'); } catch (e) {}
  setTimeout(() => boot.remove(), 700);
  startReveals();
}
(function runBoot() {
  let seen = false;
  try { seen = !!sessionStorage.getItem('aem-boot'); } catch (e) {}
  if (reduced || seen) { root.classList.add('no-boot'); finishBoot(); return; }
  const lines = $$('.boot-log li', boot);
  requestAnimationFrame(() => boot.classList.add('go'));
  lines.forEach((li, i) => setTimeout(() => li.classList.add('on'), 120 + i * 300));
  setTimeout(finishBoot, 1500);
  $('.boot-skip', boot).addEventListener('click', finishBoot);
  window.addEventListener('keydown', finishBoot, { once: true });
  boot.addEventListener('click', finishBoot);
})();

/* ============================================================
   Dhaka clock, internship progress
   ============================================================ */
const clockEl = $('#clock');
const dhaka = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Dhaka', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
function tickClock() { clockEl.textContent = 'DHAKA ' + dhaka.format(new Date()); }
tickClock(); setInterval(tickClock, 1000);

$$('.mission').forEach(m => {
  const start = new Date(m.dataset.start + 'T00:00:00+06:00'), end = new Date(m.dataset.end + 'T23:59:59+06:00');
  const now = new Date(), p = clamp((now - start) / (end - start));
  const day = Math.floor((now - start) / 864e5) + 1, days = Math.round((end - start) / 864e5);
  const pct = $('.mission-pct', m);
  if (now < start) pct.textContent = 'STARTS 12 JUL 2026';
  else if (now > end) pct.textContent = 'COMPLETE';
  else pct.textContent = `DAY ${day} OF ${days} · ${Math.round(p * 100)}%`;
  new IntersectionObserver((en, o) => { if (en[0].isIntersecting) { $('.mission-bar i', m).style.width = (p * 100) + '%'; o.disconnect(); } }).observe(m);
});

/* ============================================================
   Chapter tracking: swarm state, nav, rail
   ============================================================ */
const NAV_OF = { about: 'about', journey: 'journey', brac: 'brac', agami: 'brac', voice: 'brac', local: 'brac', field: 'brac', schedule: 'brac', qr: 'brac', university: 'university', 'uni-gallery': 'university', skills: 'skills', contact: 'contact' };
const railNum = $('#railNum'), railLabel = $('#railLabel');
function activateTracker(el) {
  setSwarm(el.dataset.swarm, el.hasAttribute('data-dim'));
  const sec = el.closest('section');
  const labelled = el.closest('[data-label]');
  if (labelled) { railNum.textContent = labelled.dataset.num; railLabel.textContent = labelled.dataset.label; }
  const key = NAV_OF[sec && sec.id];
  $$('.nav a').forEach(a => a.classList.toggle('on', a.dataset.nav === key));
}
const trackIO = new IntersectionObserver(entries => {
  entries.forEach(en => { if (en.isIntersecting) activateTracker(en.target); });
}, { rootMargin: '-50% 0px -50% 0px', threshold: 0 });
$$('[data-swarm]').forEach(el => trackIO.observe(el));

/* ============================================================
   Scroll-linked: progress bar, timeline, gallery, swarm kick
   ============================================================ */
const progressBar = $('#progressBar');
const timeline = $('#timeline');
const tlItems = $$('.tl-item', timeline);
const hs = $('#uni-gallery'), hsTrack = $('#hsTrack'), hsCount = $('#hsCount');
const pcards = $$('.pcard', hsTrack);
let hsDist = 0;

function layoutGallery() {
  if (isMobile()) { hs.style.height = ''; hsTrack.style.transform = ''; hsDist = 0; return; }
  hsDist = Math.max(0, hsTrack.scrollWidth - window.innerWidth);
  hs.style.height = (hsDist + window.innerHeight) + 'px';
}

let lastY = window.scrollY, ticking = false;
function onScroll() {
  ticking = false;
  const y = window.scrollY, H = document.documentElement.scrollHeight - window.innerHeight;
  progressBar.style.transform = `scaleX(${H > 0 ? y / H : 0})`;
  if (swarm) swarm.kick(y - lastY);
  lastY = y;

  // timeline fill and lit nodes
  const tr = timeline.getBoundingClientRect(), line = window.innerHeight * .62;
  timeline.style.setProperty('--tl', clamp((line - tr.top) / tr.height).toFixed(4));
  tlItems.forEach(li => li.classList.toggle('lit', li.getBoundingClientRect().top < line));

  // horizontal gallery
  if (hsDist > 0 && !(expanded && expanded.card)) {
    const r = hs.getBoundingClientRect();
    const p = clamp(-r.top / (hs.offsetHeight - window.innerHeight));
    hsTrack.style.transform = `translate3d(${-p * hsDist}px,0,0)`;
    hsCount.textContent = String(Math.round(p * (pcards.length - 1)) + 1).padStart(2, '0') + ' / ' + String(pcards.length).padStart(2, '0');
  }
}
window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
window.addEventListener('resize', () => { layoutGallery(); onScroll(); });
window.addEventListener('load', () => {
  layoutGallery(); onScroll();
  // smooth in-page jumps only after the first (instant) jump to a #hash
  setTimeout(() => { if (!reduced) root.classList.add('smooth'); }, 300);
});
layoutGallery(); onScroll();

/* ============================================================
   Render wake-ups: field visit tracker + voice assistant
   ============================================================ */
const SERVICES = {
  field: 'https://field-visit-v1-8.onrender.com/',
  voice: 'https://brac-voice-assistant.onrender.com/healthz'
};
const svc = {};
function paintStatus(id) {
  const s = svc[id];
  $$(`.srv[data-srv="${id}"]`).forEach(el => { el.dataset.s = s.status; });
  const secs = Math.round((Date.now() - s.t0) / 1000);
  const text = {
    waking: `Waking the server · ${secs}s (free hosting sleeps when idle)`,
    live: '● Server is awake and ready',
    down: 'Couldn\'t reach the server. Try opening it in a new tab.'
  }[s.status] || 'Checking the server…';
  $$(`[data-status-for="${id}"]`).forEach(el => { el.dataset.s = s.status; el.textContent = text; });
  $$(`.live[data-wake="${id}"] .wake-secs`).forEach(el => { el.textContent = s.status === 'waking' ? secs + 's' : ''; });
}
async function wake(id) {
  const s = svc[id] || (svc[id] = { status: 'idle', t0: Date.now() });
  if (s.busy) return;
  s.busy = true;
  if (s.status !== 'live') { s.status = 'waking'; s.t0 = Date.now(); }
  paintStatus(id);
  const timer = setInterval(() => paintStatus(id), 1000);
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 95000);
  try {
    await fetch(SERVICES[id] + (SERVICES[id].includes('?') ? '&' : '?') + 'wake=' + Date.now(), { mode: 'no-cors', cache: 'no-store', signal: ctrl.signal });
    s.status = 'live';
  } catch (e) {
    s.status = 'down';
  }
  clearTimeout(to); clearInterval(timer); s.busy = false;
  paintStatus(id);
  document.dispatchEvent(new CustomEvent('svc', { detail: { id, status: s.status } }));
}
// Field Visit is embedded further down, so wake it on arrival. The voice assistant only
// wakes once someone reaches the BRAC chapter, to save free-tier hours on quick visits.
wake('field');
const voiceIO = new IntersectionObserver(en => {
  if (en.some(e => e.isIntersecting)) { wake('voice'); voiceIO.disconnect(); }
}, { rootMargin: '0px 0px 50% 0px' });
['#brac', '#voice'].forEach(sel => voiceIO.observe($(sel)));
// keep awake whatever has been woken while someone is reading (Render sleeps after 15 idle minutes)
setInterval(() => { if (!document.hidden) Object.keys(svc).forEach(wake); }, 10 * 60 * 1000);

$$('[data-popup]').forEach(btn => btn.addEventListener('click', () => {
  const url = btn.dataset.popup;
  if (!svc.voice || svc.voice.status !== 'live') wake('voice');
  if (isMobile()) { window.open(url, '_blank', 'noopener'); return; }
  const w = 440, h = Math.min(860, screen.availHeight - 60);
  const left = Math.max(0, (screen.availWidth - w) / 2), top = Math.max(0, (screen.availHeight - h) / 2);
  const win = window.open(url, 'brac-voice', `popup,width=${w},height=${h},left=${left},top=${top}`);
  if (!win) window.open(url, '_blank', 'noopener');
}));

/* ============================================================
   Live embeds
   ============================================================ */
const lives = new Map();
function fitLive(live) {
  const f = $('iframe', live);
  if (!f) return;
  // phones: preview responsive apps at a narrower virtual width so they stay readable
  const w = isMobile() ? Math.min(+live.dataset.w, 820) : +live.dataset.w, h = +live.dataset.h;
  const r = live.getBoundingClientRect();
  if (!r.width || !r.height) return;
  // full screen on a phone: render at native size so responsive apps use their mobile layout
  // (data-min-w marks apps with no phone layout, which are scaled down to that width instead)
  const minW = +live.dataset.minW || 0;
  const s = isMobile() && live.closest('.is-expanded') ? Math.min(1, minW ? r.width / minW : 1) : Math.min(1, r.width / w, r.height / h);
  f.style.width = (r.width / s) + 'px';
  f.style.height = (r.height / s) + 'px';
  f.style.transform = `scale(${s})`;
}
const ro = new ResizeObserver(entries => entries.forEach(en => fitLive(en.target)));

function prepLive(live) {
  if (lives.has(live)) return;
  lives.set(live, {});
  const shield = document.createElement('button');
  shield.type = 'button';
  shield.className = 'live-shield';
  shield.innerHTML = `<span><svg><use href="#i-play"/></svg>${touch ? 'Tap to try it' : 'Click to use the live app'}</span>`;
  shield.setAttribute('aria-label', 'Use the live app: ' + (live.dataset.title || ''));
  // on phones the embed is too small to use in place, so open it full screen
  shield.addEventListener('click', () => { if (isMobile()) openExpanded(live); else setInteractive(live, true); });
  const exit = document.createElement('button');
  exit.type = 'button';
  exit.className = 'live-exit';
  exit.innerHTML = '<svg><use href="#i-close"/></svg> Done';
  exit.addEventListener('click', e => { e.stopPropagation(); setInteractive(live, false); if (live.closest('.is-expanded')) closeExpanded(); });
  live.append(shield, exit);
  ro.observe(live);
}

function loadLive(live, force) {
  if (!live) return;
  prepLive(live);
  if (live.dataset.loaded && !force) return;
  const wakeId = live.dataset.wake;
  if (wakeId && svc[wakeId] && svc[wakeId].status === 'waking' && !force) {
    // wait for the server, but never more than ~75 s
    if (live.dataset.waiting) return;
    live.dataset.waiting = 1;
    const go = () => { document.removeEventListener('svc', onSvc); clearTimeout(cap); delete live.dataset.waiting; loadLive(live, true); };
    const onSvc = e => { if (e.detail.id === wakeId) go(); };
    const cap = setTimeout(go, 75000);
    document.addEventListener('svc', onSvc);
    return;
  }
  live.dataset.loaded = 1;
  live.classList.remove('loaded');
  let f = $('iframe', live);
  if (f) f.remove();
  f = document.createElement('iframe');
  f.title = live.dataset.title || 'Live app';
  f.allow = 'autoplay; clipboard-write; fullscreen';
  f.addEventListener('load', () => {
    live.classList.add('loaded');
    // same-origin apps: let Esc inside the app close full screen too
    try { f.contentWindow.addEventListener('keydown', e => { if (e.key === 'Escape') closeExpanded(); }); } catch (e) {}
  });
  f.src = live.dataset.src;
  live.prepend(f);
  fitLive(live);
}

function setInteractive(live, on) {
  if (!live) return;
  loadLive(live);
  live.classList.toggle('interactive', on);
  if (on) { const f = $('iframe', live); if (f) setTimeout(() => f.focus({ preventScroll: true }), 50); }
}
// clicking anywhere else gives the page its scroll back
document.addEventListener('pointerdown', e => {
  $$('.live.interactive').forEach(l => {
    if (l.contains(e.target) || e.target.closest('[data-interact],[data-expand]')) return;
    if (l.closest('.is-expanded')) return;
    l.classList.remove('interactive');
  });
});

/* expand / close */
const expandClose = $('#expandClose');
function openExpanded(live) {
  const device = live.closest('[data-device]');
  if (!device) return;
  if (device.hidden) return;
  loadLive(live);
  closeExpanded();
  expanded = { device, live, stage: device.closest('.stage'), card: device.closest('.pcard') };
  // a transformed track or a backdrop-filtered card would trap the fixed element, so lift both while expanded
  if (expanded.card) { hsTrack.style.transform = 'none'; hsTrack.style.willChange = 'auto'; expanded.card.classList.add('hosting'); }
  device.classList.add('is-expanded');
  if (expanded.stage) expanded.stage.classList.add('hosting');
  document.body.classList.add('expanded');
  expandClose.hidden = false;
  setInteractive(live, true);
  requestAnimationFrame(() => fitLive(live));
}
function closeExpanded() {
  if (!expanded) return;
  const { device, live, stage, card } = expanded;
  device.classList.remove('is-expanded');
  if (stage) stage.classList.remove('hosting');
  if (card) { card.classList.remove('hosting'); hsTrack.style.willChange = ''; }
  document.body.classList.remove('expanded');
  expandClose.hidden = true;
  live.classList.remove('interactive');
  expanded = null;
  requestAnimationFrame(() => { fitLive(live); onScroll(); });
}
expandClose.addEventListener('click', closeExpanded);
// clicking the dimmed area around an expanded app closes it
document.addEventListener('pointerdown', e => {
  if (expanded && !expanded.device.contains(e.target) && !expandClose.contains(e.target)) closeExpanded();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeExpanded(); $$('.live.interactive').forEach(l => l.classList.remove('interactive')); closeMenu(); }
});

$$('[data-interact]').forEach(btn => btn.addEventListener('click', () => {
  const live = document.getElementById(btn.dataset.interact);
  if (!live) return;
  if (isMobile()) { openExpanded(live); return; }
  const r = live.getBoundingClientRect();
  if (r.bottom < 0 || r.top > window.innerHeight) live.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
  setInteractive(live, true);
}));
$$('[data-expand]').forEach(btn => btn.addEventListener('click', () => {
  const live = document.getElementById(btn.dataset.expand);
  if (live) openExpanded(live);
}));
$$('[data-reload]').forEach(btn => btn.addEventListener('click', () => {
  const live = document.getElementById(btn.dataset.reload);
  if (live) loadLive(live, true);
}));

// embeds that load as soon as they come near the viewport
const nearIO = new IntersectionObserver(entries => {
  entries.forEach(en => {
    if (!en.isIntersecting) return;
    (en.target.matches('.live') ? [en.target] : $$('.live', en.target)).forEach(l => loadLive(l));
    nearIO.unobserve(en.target);
  });
}, { rootMargin: '60% 0px 60% 0px' });
$$('[data-static], [data-autoload]').forEach(el => nearIO.observe(el));

/* Schedule Miss: app / portal switch */
$$('[data-sm]').forEach(btn => btn.addEventListener('click', () => {
  const wrap = btn.closest('.live-switch');
  $$('[data-sm]', wrap).forEach(b => b.setAttribute('aria-selected', String(b === btn)));
  const showPortal = btn.dataset.sm === 'portal';
  $('.sm-app', wrap).hidden = showPortal;
  $('.sm-portal', wrap).hidden = !showPortal;
  const live = $(showPortal ? '#sm-portal' : '#sm-app');
  loadLive(live);
  requestAnimationFrame(() => fitLive(live));
  const interact = $('[data-interact="sm-app"], [data-interact="sm-portal"]');
  if (interact) interact.dataset.interact = live.id;
}));

/* ============================================================
   Scrollytelling stages
   ============================================================ */
const FX = {};   // per-scene effects: { on(stage), off(stage) }
const timers = new WeakMap();
function every(stage, ms, fn) { stopTimer(stage); fn(); timers.set(stage, setInterval(fn, ms)); }
function stopTimer(stage) { clearInterval(timers.get(stage)); timers.delete(stage); }

FX.tiers = {
  on(stage) {
    const imgs = $$('.cycler img', stage), lis = $$('.tier-list li', stage);
    let i = -1;
    every(stage, reduced ? 1e9 : 1700, () => {
      i = (i + 1) % imgs.length;
      imgs.forEach((im, k) => im.classList.toggle('on', k === i));
      lis.forEach((li, k) => li.classList.toggle('on', k === i));
    });
  },
  off: stopTimer
};
FX.adapt = {
  on(stage) {
    const cells = $$('.adapt-cells i', stage), pattern = 'ccrcccrccc', out = $('.adapt-clean', stage);
    cells.forEach(c => c.className = '');
    let i = 0, clean = 0; out.textContent = '0';
    every(stage, reduced ? 1e9 : 220, () => {
      if (i >= cells.length) { stopTimer(stage); return; }
      const k = pattern[i]; cells[i].className = k; if (k === 'c') clean++;
      out.textContent = clean; i++;
    });
    if (reduced) { cells.forEach((c, k) => c.className = pattern[k]); out.textContent = '8'; }
  },
  off: stopTimer
};
const ORB = [['idle', 'অপেক্ষা', 'Idle: press to start'], ['listening', 'শুনছি…', 'Listening'], ['searching', 'নথি খোঁজা হচ্ছে…', 'Searching the documents'], ['speaking', 'উত্তর দিচ্ছি…', 'Speaking']];
FX.orb = {
  on(stage) {
    const orb = $('[data-scene="orb"] .orb', stage), bn = $('[data-bn]', stage), en = $('[data-en]', stage);
    let i = -1;
    every(stage, reduced ? 1e9 : 2100, () => {
      i = (i + 1) % ORB.length;
      orb.dataset.state = ORB[i][0]; bn.textContent = ORB[i][1]; en.textContent = ORB[i][2];
    });
  },
  off: stopTimer
};
FX.pipeline = {
  on(stage) {
    const lis = $$('.pipeline li', stage);
    let i = -1;
    every(stage, reduced ? 1e9 : 520, () => {
      i = (i + 1) % (lis.length + 2);
      lis.forEach((li, k) => li.classList.toggle('hot', k === i));
    });
  },
  off: stopTimer
};
const TIME = [['15 OCT 2026', -1, 'commitment date set: 22 Oct'], ['16 OCT 2026', 0, 'grace period running'], ['23 OCT 2026', 1, 'grace period expired → re-miss detected'], ['23 NOV 2026', 2, '2+ missed commitments → escalated to BM']];
FX.time = {
  on(stage) {
    const d = $('.ts-date', stage), btns = $$('.ts-btns span', stage), ev = $('.ts-event', stage);
    let i = -1;
    every(stage, reduced ? 1e9 : 1600, () => {
      i = (i + 1) % TIME.length;
      d.textContent = TIME[i][0];
      btns.forEach((b, k) => b.classList.toggle('hit', k === TIME[i][1]));
      ev.textContent = TIME[i][2];
    });
  },
  off: stopTimer
};
FX.drill = { on(stage) { $$('[data-scene="drill"] .count', stage).forEach(countUp); } };

function setScene(stage, key) {
  if (stage.dataset.active === key) return;
  const prev = stage.dataset.active;
  if (prev && FX[prev] && FX[prev].off) FX[prev].off(stage);
  stage.dataset.active = key;
  $$('[data-scene]:not([data-static]), [data-for], [data-scene-only]', stage).forEach(el => {
    const k = el.dataset.scene || el.dataset.for || el.dataset.sceneOnly;
    el.classList.toggle('is-on', k === key);
  });
  stage.classList.toggle('with-callout', !!stage.querySelector('.callout.is-on'));
  if (FX[key] && FX[key].on) FX[key].on(stage);
  if (key === 'live') $$('[data-scene="live"] .live, [data-scene-only="live"] .live:not([hidden])', stage).forEach(l => {
    if (!l.closest('[hidden]')) loadLive(l);
  });
}

$$('.scrolly').forEach(scrolly => {
  const stage = $('.stage', scrolly);
  const steps = $$('.step', scrolly);
  setScene(stage, steps[0].dataset.step);
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      const step = en.target;
      steps.forEach(s => s.classList.toggle('on', s === step));
      setScene(stage, step.dataset.step);
      // warm up a live app one step early
      const next = steps[steps.indexOf(step) + 1];
      if (next && next.dataset.step === 'live') $$('[data-scene="live"] .live, [data-scene-only="live"] .live', stage).forEach(l => { if (!l.closest('[hidden]')) loadLive(l); });
    });
  }, {
    // (phones: the stage covers the top half, so a step takes over as its card rises into view)
    rootMargin: isMobile() ? '-78% 0px -21% 0px' : '-48% 0px -48% 0px',
    threshold: 0
  });
  steps.forEach(s => io.observe(s));
});

/* ============================================================
   Bangladesh maps (Field Visit scenes)
   ============================================================ */
const SHADE = { Dhaka: .95, Chittagong: .75, Rajshani: .55, Khulna: .5, Rangpur: .4, Mymensingh: .35, Sylhet: .3, Barisal: .2 };
const NAME = n => n === 'Rajshani' ? 'Rajshahi' : n;
function bbox(paths) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  paths.forEach(d => { for (const m of d.matchAll(/(-?\d+\.?\d*),(-?\d+\.?\d*)/g)) { const x = +m[1], y = +m[2]; if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; } });
  return [x0, y0, x1 - x0, y1 - y0];
}
function drawMaps() {
  const M = window.BD_MAP;
  if (!M) return;
  const NS = 'http://www.w3.org/2000/svg';
  $$('[data-bdmap]').forEach(host => {
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('role', 'img');
    if (host.dataset.bdmap === 'divisions') {
      svg.setAttribute('viewBox', `0 0 ${M.w} ${M.h}`);
      svg.setAttribute('aria-label', 'Map of Bangladesh with its eight divisions shaded by sample visit counts');
      M.divisions.forEach(dv => {
        const p = document.createElementNS(NS, 'path');
        p.setAttribute('d', dv.d); p.setAttribute('class', 'div'); p.style.setProperty('--v', SHADE[dv.n] || .2);
        const t = document.createElementNS(NS, 'title'); t.textContent = NAME(dv.n); p.append(t);
        svg.append(p);
      });
      M.divisions.forEach(dv => {
        const t = document.createElementNS(NS, 'text');
        t.setAttribute('x', dv.c[0]); t.setAttribute('y', dv.c[1]); t.setAttribute('text-anchor', 'middle');
        t.textContent = NAME(dv.n); svg.append(t);
      });
    } else {
      const ds = M.districts.filter(d => d.v === 'Dhaka');
      const [x, y, w, h] = bbox(ds.map(d => d.d));
      svg.setAttribute('viewBox', `${x - 6} ${y - 6} ${w + 12} ${h + 12}`);
      svg.setAttribute('aria-label', 'Dhaka division with its districts shaded by sample visit counts');
      ds.forEach((d, i) => {
        const p = document.createElementNS(NS, 'path');
        p.setAttribute('d', d.d); p.setAttribute('class', 'div'); p.style.setProperty('--v', (.15 + ((i * 37) % 80) / 100).toFixed(2));
        p.style.strokeWidth = '.8';
        const t = document.createElementNS(NS, 'title'); t.textContent = d.n; p.append(t);
        svg.append(p);
      });
    }
    host.prepend(svg);
  });
}
if (window.BD_MAP) drawMaps(); else window.addEventListener('load', drawMaps);

/* ============================================================
   Copy email
   ============================================================ */
const copyBtn = $('#copyEmail');
copyBtn.addEventListener('click', async () => {
  const label = $('span', copyBtn);
  try { await navigator.clipboard.writeText(copyBtn.dataset.copy); label.textContent = 'Copied'; }
  catch (e) { label.textContent = 'Press Ctrl+C'; }
  setTimeout(() => { label.textContent = 'Copy'; }, 1800);
});
