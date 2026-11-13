/* Roadster in-car screen (Second Life MOAP). Static site: no server, no database.
   The car passes its secure HTTP-in URL as ?car=<url>&k=<token>; light commands are plain GET pings to it.
   Edit the lists below to change the YouTube quick picks or radio categories. */
'use strict';

/* ------------------------------------------------------------------ config */
const RADIO_CATEGORIES = [      // first four are pinned to the top: Trending, R&B, Hip-Hop, Rap
  ['Trending', '__trending'], ['R&B', 'rnb'], ['Hip-Hop', 'hiphop'], ['Rap', 'rap'],
  ['Top 40', 'pop'], ['Rock', 'rock'], ['Dance', 'dance'],
  ['Jazz', 'jazz'], ['Country', 'country'], ['Classical', 'classical'], ['Lo-fi', 'lofi'],
  ['Latin', 'latin'], ['Reggae', 'reggae'], ['News', 'news'], ['Talk', 'talk'], ['80s', '80s'],
];
const RADIO_HOSTS = ['https://de1.api.radio-browser.info', 'https://nl1.api.radio-browser.info', 'https://at1.api.radio-browser.info'];
const COLORS = [['White', '#ffffff'], ['Ice Blue', '#73ccff'], ['Tiffany', '#0dbfb3'], ['Blue', '#0d33ff'], ['Purple', '#730dff'],
                ['Pink', '#ff1f80'], ['Red', '#ff0505'], ['Amber', '#ff6605'], ['Green', '#0dff26'], ['Warm White', '#ffbf73']];
const EFFECTS = ['Steady', 'Pulse', 'Strobe', 'Flash', 'Wave', 'Fade', 'Sequence', 'Rainbow'];
const GLOWS = [0, 2, 5, 10, 15, 20, 30, 40, 50];
const SPEEDS = ['Slow', 'Normal', 'Fast'];

/* ------------------------------------------------------------------ car link */
const qs = new URLSearchParams(location.search);
const CAR = qs.get('car') || '';
const KEY = qs.get('k') || '';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
function toast(msg) {
  let t = $('.toast'); if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 1600);
}
function send(params) {
  if (!CAR) { toast('Demo mode – open this screen in the car'); return; }
  const u = new URL(CAR); u.searchParams.set('k', KEY);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  u.searchParams.set('t', Date.now());
  // The car's reply has no CORS headers; a no-cors GET still reaches it.
  fetch(u.toString(), { mode: 'no-cors', cache: 'no-store' }).catch(() => { new Image().src = u.toString(); });
}
if (CAR) { $('#connBadge').textContent = 'Linked to car'; $('#connBadge').classList.add('ok'); $('#aboutLink').textContent = '✓ Connected to your car'; $('#aboutLink').classList.add('ok'); }

/* ------------------------------------------------------------------ navigation (Back + Home everywhere) */
const navStack = ['home'];
function open(page, push = true) {
  $$('.page').forEach(p => p.classList.toggle('active', p.dataset.page === page));
  $$('#dock > button').forEach(b => b.classList.toggle('on', b.dataset.open === page));
  if (push && navStack[navStack.length - 1] !== page) navStack.push(page);
  if (page === 'radio' && !$('#radioList .item')) loadRadio(RADIO_CATEGORIES[0][1], $('#radioCats .chip'));
}
document.addEventListener('click', e => {
  const o = e.target.closest('[data-open]'); if (o) { open(o.dataset.open); return; }
  if (e.target.closest('.homebtn')) { navStack.length = 0; navStack.push('home'); open('home', false); return; }
  if (e.target.closest('.back')) { navStack.pop(); open(navStack[navStack.length - 1] || 'home', false); }
});
open('home', false);

/* ------------------------------------------------------------------ clock + status */
function tick() { const d = new Date(); $('#clock').textContent = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); }
tick(); setInterval(tick, 10000);

/* ------------------------------------------------------------------ home: rotating quick tips (tap opens the Guide) */
const TIPS = [
  ['✈️', 'Hold the left mouse button for 1.5 s to take off'],
  ['🛬', 'Fly low and hold C to land, or type /7 land'],
  ['⬆️', 'In the air: E climbs, C goes lower'],
  ['🚪', 'Touch a door to open or close it'],
  ['✦', 'Tap the console light panel for ambient, cabin and headlights'],
  ['📏', 'Head through the roof? Owner types /7 size to make the car bigger'],
  ['💺', 'Owner can fine-tune seats with /7 seat up / down'],
  ['🎨', 'Use the Tesla Colour Cube to change the paint'],
  ['🙃', 'Upside down? Just stand up and the car flips back'],
];
let tipIx = 0;
setInterval(() => {
  const t = $('#tipText'); t.classList.add('fade');
  setTimeout(() => { tipIx = (tipIx + 1) % TIPS.length; $('#tipIcon').textContent = TIPS[tipIx][0]; t.textContent = TIPS[tipIx][1]; t.classList.remove('fade'); }, 300);
}, 7000);

/* ------------------------------------------------------------------ now playing (one source at a time) */
const audio = $('#radioAudio'); let nowSource = null;   // 'radio' | 'youtube'
function setNow(title, sub, art, source) {
  nowSource = source; $('#nowTitle').textContent = title; $('#nowSub').textContent = sub;
  $('#nowArt').innerHTML = art ? `<img src="${art}" alt="" onerror="this.parentNode.textContent='♪'">` : '♪';
}
function stopYouTube() { const f = $('#ytWrap iframe'); if (f) { f.remove(); $('#ytWrap').innerHTML = '<div class="yt-empty">Paste a YouTube link or pick a video below</div>'; } }
$('#nowToggle').addEventListener('click', () => {
  if (nowSource === 'radio') { audio.paused ? audio.play() : audio.pause(); }
  else if (nowSource === 'youtube') open('youtube');
  else open('radio');
});
audio.addEventListener('play', () => { $('#nowToggle').textContent = '❚❚'; $('#rpToggle').textContent = '❚❚'; });
audio.addEventListener('pause', () => { $('#nowToggle').textContent = '▶'; $('#rpToggle').textContent = '▶'; });

/* ------------------------------------------------------------------ YouTube (in-screen)
   Search: official YouTube Data API v3 when config.js has a key (embeddable videos only), otherwise a public
   Piped mirror. Playback: YouTube's own embedded player inside this page, so Back/Home never disappear. */
const YT_CATS = [['Trending music', ''], ['Hip-Hop', 'hip hop music video'], ['R&B', 'r&b music video'], ['Rap', 'rap music video'], ['Pop', 'pop music video'], ['Lo-fi live', 'lofi hip hop radio live']];
const PIPED = ['https://api.piped.private.coffee', 'https://pipedapi.kavin.rocks'];
function stopYouTube() { if ($('#ytWrap iframe')) $('#ytWrap').innerHTML = '<div class="yt-empty">Search or pick a category, then tap a video</div>'; }
async function ytSearch(q) {
  const key = window.YT_API_KEY;
  if (key) {
    const base = 'https://www.googleapis.com/youtube/v3/';
    const url = q ? `${base}search?part=snippet&type=video&videoEmbeddable=true&safeSearch=moderate&maxResults=24&q=${encodeURIComponent(q)}&key=${key}`
                  : `${base}videos?part=snippet&chart=mostPopular&videoCategoryId=10&regionCode=US&maxResults=24&key=${key}`;
    const r = await fetch(url); if (!r.ok) throw new Error('api ' + r.status); const d = await r.json();
    return d.items.map(it => ({ id: it.id.videoId || it.id, title: it.snippet.title, channel: it.snippet.channelTitle,
                                 thumb: (it.snippet.thumbnails.medium || it.snippet.thumbnails.default).url }));
  }
  for (const h of PIPED) {
    try {
      const qq = q || 'new music videos this week';   // keyless: the mirror's trending feed is not music-only
      const r = await fetch(`${h}/search?q=${encodeURIComponent(qq)}&filter=videos`); if (!r.ok) continue;
      const d = await r.json(); const items = Array.isArray(d) ? d : (d.items || []);
      const out = items.filter(x => (x.url || '').includes('watch?v=')).map(x => ({ id: x.url.split('v=')[1].slice(0, 11), title: x.title, channel: x.uploaderName, thumb: x.thumbnail, dur: x.duration }));
      if (out.length) return out;
    } catch (e) { /* next mirror */ }
  }
  throw new Error('no search source');
}
function fmtDur(s) { if (s === -1) return 'LIVE'; if (!(s > 0)) return ''; const m = Math.floor(s / 60); return m + ':' + String(s % 60).padStart(2, '0'); }
function playYouTube(v) {
  audio.pause();
  // YouTube rejects embeds that arrive without a referrer (error 153): send the page origin explicitly.
  const origin = encodeURIComponent(location.origin);
  $('#ytWrap').innerHTML = `<iframe src="https://www.youtube.com/embed/${v.id}?autoplay=1&playsinline=1&rel=0&modestbranding=1&enablejsapi=1&origin=${origin}" referrerpolicy="strict-origin-when-cross-origin" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
  setNow(v.title, 'YouTube · ' + (v.channel || ''), v.thumb, 'youtube'); $('#nowToggle').textContent = '▶';
  $('.page.active').scrollTop = 0;
}
async function ytLoad(q, chip) {
  $$('#ytCats .chip').forEach(c => c.classList.toggle('on', c === chip));
  const box = $('#ytList'); box.innerHTML = '<div class="hint">Loading…</div>';
  try {
    const vids = await ytSearch(q); box.innerHTML = '';
    for (const v of vids) {
      const b = document.createElement('button'); b.className = 'item';
      b.innerHTML = `<img src="${v.thumb}" alt="" style="width:5.4rem;height:3rem"><div class="t"><b></b><span></span></div>` + (v.dur !== undefined ? `<span class="dur">${fmtDur(v.dur)}</span>` : '');
      b.querySelector('b').textContent = v.title; b.querySelector('span').textContent = v.channel || '';
      b.addEventListener('click', () => { playYouTube(v); $$('#ytList .item').forEach(x => x.classList.toggle('playing', x === b)); });
      box.appendChild(b);
    }
    if (!vids.length) box.innerHTML = '<div class="hint">No videos found.</div>';
  } catch (e) {
    box.innerHTML = '<div class="hint">YouTube search is unavailable right now. Add a free API key in config.js for reliable search, or open the full YouTube site below.</div>';
  }
}
$('#ytForm').addEventListener('submit', e => { e.preventDefault(); const q = $('#ytInput').value.trim(); if (q) { $('#ytInput').blur(); ytLoad(q, null); } });
YT_CATS.forEach(([label, q]) => {
  const c = document.createElement('button'); c.className = 'chip'; c.textContent = label;
  c.addEventListener('click', () => ytLoad(q, c)); $('#ytCats').appendChild(c);
});
let ytFirst = true;
document.addEventListener('click', e => { if (e.target.closest('[data-open="youtube"]') && ytFirst) { ytFirst = false; ytLoad('', $('#ytCats .chip')); } });
document.addEventListener('click', e => {
  const x = e.target.closest('[data-ext]'); if (!x) return;
  e.stopPropagation(); audio.pause(); toast('Opening YouTube… use ⌂ on the media bar to come back');
  setTimeout(() => { location.href = x.dataset.ext; }, 600);
}, true);

/* ------------------------------------------------------------------ Radio (radio-browser.info, live streams, https only) */
async function rbFetch(path) {
  for (const h of RADIO_HOSTS) {
    try { const r = await fetch(h + path, { headers: { 'Accept': 'application/json' } }); if (r.ok) return await r.json(); } catch (e) { /* next mirror */ }
  }
  throw new Error('radio directory unavailable');
}
function stationsFrom(list) {
  const seen = new Set();
  return list.filter(s => (s.url_resolved || '').startsWith('https://') && /mp3|aac|ogg/i.test(s.codec || 'mp3'))
             .filter(s => { const k = s.name.trim().toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 40);
}
function renderStations(list, label) {
  const box = $('#radioList'); box.innerHTML = '';
  if (!list.length) { box.innerHTML = '<div class="hint">No playable stations found. Try another category.</div>'; return; }
  for (const s of list) {
    const b = document.createElement('button'); b.className = 'item';
    const icon = s.favicon && s.favicon.startsWith('https://') ? `<img src="${s.favicon}" alt="" onerror="this.outerHTML='<div class=ph>📻</div>'">` : '<div class="ph">📻</div>';
    b.innerHTML = `${icon}<div class="t"><b></b><span></span></div>`;
    b.querySelector('b').textContent = s.name.trim();
    b.querySelector('span').textContent = [s.country, (s.tags || '').split(',').slice(0, 2).join(', '), s.bitrate ? s.bitrate + ' kbps' : ''].filter(Boolean).join(' · ');
    b.addEventListener('click', () => playStation(s, b, label)); box.appendChild(b);
  }
}
async function loadRadio(tag, chip) {
  $$('#radioCats .chip').forEach(c => c.classList.toggle('on', c === chip));
  $('#radioList').innerHTML = '<div class="hint">Loading live stations…</div>';
  try {
    let list;
    if (tag === '__trending') {        // trending music: hip-hop, R&B, rap and pop stations gaining listeners right now
      const tags = ['hiphop', 'rnb', 'rap', 'pop'];
      const parts = await Promise.all(tags.map(t => rbFetch(`/json/stations/bytag/${t}?hidebroken=true&order=clicktrend&reverse=true&limit=60`).catch(() => [])));
      list = parts.flat().sort((a, b) => (b.clicktrend - a.clicktrend) || (b.clickcount - a.clickcount));
    } else {
      list = await rbFetch(`/json/stations/bytag/${encodeURIComponent(tag)}?hidebroken=true&order=clickcount&reverse=true&limit=120`);
    }
    renderStations(stationsFrom(list), chip ? chip.textContent : tag);
  }
  catch (e) { $('#radioList').innerHTML = '<div class="hint">Radio directory is unreachable right now. Try again in a moment.</div>'; }
}
$('#radioForm').addEventListener('submit', async e => {
  e.preventDefault(); const q = $('#radioInput').value.trim(); if (!q) return; $('#radioInput').blur();
  $$('#radioCats .chip').forEach(c => c.classList.remove('on')); $('#radioList').innerHTML = '<div class="hint">Searching…</div>';
  try { renderStations(stationsFrom(await rbFetch(`/json/stations/byname/${encodeURIComponent(q)}?hidebroken=true&order=clickcount&reverse=true&limit=120`)), 'Search'); }
  catch (err) { $('#radioList').innerHTML = '<div class="hint">Search failed. Try again.</div>'; }
});
RADIO_CATEGORIES.forEach(([label, tag]) => {
  const c = document.createElement('button'); c.className = 'chip'; c.textContent = label;
  c.addEventListener('click', () => loadRadio(tag, c)); $('#radioCats').appendChild(c);
});
function playStation(s, btn, label) {
  stopYouTube();
  audio.src = s.url_resolved; audio.volume = $('#rpVol').value / 100;
  audio.play().catch(() => toast('This station could not start – pick another'));
  $$('#radioList .item').forEach(x => x.classList.toggle('playing', x === btn));
  $('#rpName').textContent = s.name.trim(); $('#rpMeta').textContent = label + (s.country ? ' · ' + s.country : '');
  $('#rpIcon').src = s.favicon && s.favicon.startsWith('https://') ? s.favicon : 'assets/t_logo.png';
  setNow(s.name.trim(), 'Radio · ' + label, s.favicon && s.favicon.startsWith('https://') ? s.favicon : '', 'radio');
  fetch(RADIO_HOSTS[0] + '/json/url/' + s.stationuuid).catch(() => {});   // counts the click, as the directory asks
}
audio.addEventListener('error', () => { if (audio.src) toast('Stream unavailable – try another station'); });
$('#rpToggle').addEventListener('click', () => { if (!audio.src) return; audio.paused ? audio.play() : audio.pause(); });
$('#rpVol').addEventListener('input', e => { audio.volume = e.target.value / 100; });
$('#volUp').addEventListener('click', () => { const v = Math.min(100, +$('#rpVol').value + 10); $('#rpVol').value = v; audio.volume = v / 100; toast('Volume ' + v + '%'); });
$('#volDown').addEventListener('click', () => { const v = Math.max(0, +$('#rpVol').value - 10); $('#rpVol').value = v; audio.volume = v / 100; toast('Volume ' + v + '%'); });

/* ------------------------------------------------------------------ Lights (same model as the G-Wagon: colour, effect, glow, speed) */
const L = Object.assign({ on: 1, color: 1, effect: 0, glow: 3, speed: 1, head: 0, cabin: 0 }, JSON.parse(localStorage.getItem('rsLights') || '{}'));
function saveL() { try { localStorage.setItem('rsLights', JSON.stringify(L)); } catch (e) {} }
function pushL() { saveL(); syncL(); send({ cmd: 'lights', on: L.on, color: L.color, effect: L.effect, glow: L.glow, speed: L.speed, head: L.head, cabin: L.cabin }); }
function syncL() {
  document.documentElement.style.setProperty('--amb', L.effect === 7 ? '#c58bff' : COLORS[L.color][1]);
  $$('#swatches .sw').forEach((s, i) => s.classList.toggle('on', i === L.color));
  $$('#effects .chip').forEach((c, i) => c.classList.toggle('on', i === L.effect));
  $('#ambOn').checked = !!L.on; $('#headOn').checked = !!L.head; $('#cabinOn').checked = !!L.cabin;
  $('#glow').value = L.glow; $('#glowVal').textContent = GLOWS[L.glow] + '%';
  $('#speed').value = L.speed; $('#speedVal').textContent = SPEEDS[L.speed];
  $('[data-act=headlights]').classList.toggle('on', !!L.head); $('[data-act=cabin]').classList.toggle('on', !!L.cabin); $('[data-act=ambient]').classList.toggle('on', !!L.on);
  $('.car-hero').classList.toggle('head', !!L.head); $('#carGlow').style.opacity = L.on ? .55 : 0;
  $('#lightHint').textContent = CAR ? 'Changes apply to the car instantly.' : 'Demo mode: open this screen inside the car to control its lights.';
}
COLORS.forEach(([name, hex], i) => {
  const s = document.createElement('button'); s.className = 'sw'; s.style.background = hex; s.innerHTML = `<span>${name}</span>`;
  s.addEventListener('click', () => { L.color = i; L.on = 1; if (L.effect > 4) L.effect = 0; pushL(); }); $('#swatches').appendChild(s);
});
EFFECTS.forEach((name, i) => {
  const c = document.createElement('button'); c.className = 'chip'; c.textContent = name;
  c.addEventListener('click', () => { L.effect = i; L.on = 1; pushL(); }); $('#effects').appendChild(c);
});
$('#ambOn').addEventListener('change', e => { L.on = e.target.checked ? 1 : 0; pushL(); });
$('#headOn').addEventListener('change', e => { L.head = e.target.checked ? 1 : 0; pushL(); });
$('#cabinOn').addEventListener('change', e => { L.cabin = e.target.checked ? 1 : 0; pushL(); });
$('#glow').addEventListener('input', e => { L.glow = +e.target.value; syncL(); });
$('#glow').addEventListener('change', () => pushL());
$('#speed').addEventListener('input', e => { L.speed = +e.target.value; syncL(); });
$('#speed').addEventListener('change', () => pushL());
$$('.qbtn').forEach(b => b.addEventListener('click', () => {
  const a = b.dataset.act;
  if (a === 'headlights') L.head = L.head ? 0 : 1; else if (a === 'cabin') L.cabin = L.cabin ? 0 : 1; else L.on = L.on ? 0 : 1;
  pushL();
  toast(a === 'headlights' ? 'Headlights ' + (L.head ? 'on' : 'off') : a === 'cabin' ? 'Cabin light ' + (L.cabin ? 'on' : 'off') : 'Ambient lighting ' + (L.on ? 'on' : 'off'));
}));
syncL();
