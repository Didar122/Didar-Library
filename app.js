/* ══════════════════════════════════════════════════════════════
   app.js — Didar Library
   Core application logic: particle engine, rendering, state,
   modal, search, settings, PWA service worker, Element SDK.
   Depends on AD array defined in data.js (loaded first).
══════════════════════════════════════════════════════════════ */
'use strict';

/* ──────────────────────────────────────────
   TUTORIAL VIDEO CONFIG
────────────────────────────────────────── */
const TV = { enabled: true, url: 'videos/tutorial.mp4' };

/* ══════════════════════════════════════════════════════════════
   PARTICLE FIELD — Antigravity atmospheric effect
   300 particles across a multi-speed swarm.
   PC: distance-based dynamic lerp (near=fast, far=slow).
   Mobile: gentle ambient drift + touch scatter.
   Reads --ac CSS var for auto theme-matching.
   Canvas sits at z-index:1, UI shell at z-index:10+.
══════════════════════════════════════════════════════════════ */
class Ring {
  constructor() {
    this.cv = document.getElementById('pc');
    this.cx = this.cv.getContext('2d');
    this.mob   = matchMedia('(pointer:coarse)').matches;
    this.N  = this.mob ? 100 : 220;        // lower particle count for faster rendering
    this.ps = [];
    this.ox = innerWidth  * .5;
    this.oy = innerHeight * .5;
    this.tx = this.ox;
    this.ty = this.oy;
    this.touch = false;
    this.moved = false;
    this.paused = false;
    this._init();
    this._bind();
    this._loop();
  }

  _resize() { this.cv.width = innerWidth; this.cv.height = innerHeight; }

  pause(paused) {
    this.paused = paused;
    this.cv.style.display = paused ? 'none' : 'block';
    if (!this.paused) this._loop();
  }

  _color() {
    return (getComputedStyle(document.body).getPropertyValue('--ac') || '#00b4ff').trim();
  }

  _rgb(c) {
    c = c.trim();
    if (c[0] === '#') {
      const h = c.length === 4 ? c[1]+c[1]+c[2]+c[2]+c[3]+c[3] : c.slice(1);
      const n = parseInt(h, 16);
      return isNaN(n) ? [0, 180, 255] : [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }
    const m = c.match(/\d+/g);
    return m ? [+m[0], +m[1], +m[2]] : [0, 180, 255];
  }

  _lerp(a, b, t) { return a + (b - a) * t; }

  _init() {
    this._resize();
    const isPC = !this.mob;

    if (isPC) {
      /* ── PC: 220 particles with individual speed/orbit variance ── */
      this.N = 220;
      for (let k = 0; k < this.N; k++) {
        // Orbit radius spread: 90–310px for a wider, more expansive PC field
        const r = 90 + Math.random() * 220;
        // Continuous rotation speed — each particle shifts its own angle (CW or CCW)
        const orbitSpeed = (Math.random() * 0.006 + 0.001) * (Math.random() < .5 ? 1 : -1);
        // Per-particle velocity multiplier so no two particles travel identically
        const speedMultiplier = Math.random() * 0.8 + 0.2;
        const pullLayer = r < 140; // inner-most particles are pulled into center first

        this.ps.push({
          angle:         Math.random() * Math.PI * 2,  // starting orbit position
          orbitSpeed,                                   // unique continuous rotation
          r,                                            // orbit radius 90–310px
          speedMultiplier,                              // individual velocity scale
          pullLayer,                                    // initial pull-in effect
          sz:            1.2 + Math.random() * 1.8,
          op:            0,
          top:           0.2 + Math.random() * 0.3,
          x:             this.ox, y: this.oy,
          vx:            0, vy: 0,
          drift:         false,
          noiseOff:      Math.random() * Math.PI * 2
        });
      }
    } else {
      /* ── Mobile: gentle ambient drift particles ── */
      const rings = [
        { n: 120, rBase:  55, rVar: 30, spdBase: .005, spdVar: .003 },
        { n: 110, rBase: 120, rVar: 40, spdBase: .003, spdVar: .002 },
        { n:  70, rBase: 220, rVar: 60, spdBase: .002, spdVar: .0015 }
      ];
      const scale = this.N / 300;
      let total = 0;
      rings.forEach((ring, index) => {
        ring.n = Math.max(1, Math.round(ring.n * scale));
        total += ring.n;
      });
      while (total < this.N) { rings[0].n++; total++; }
      while (total > this.N) { rings[rings.length - 1].n--; total--; }

      rings.forEach(ring => {
        for (let k = 0; k < ring.n; k++) {
          const ph  = (k / ring.n) * Math.PI * 2 + Math.random() * .4;
          const r   = ring.rBase + (Math.random() * 2 - 1) * ring.rVar;
          const spd = ring.spdBase + Math.random() * ring.spdVar;
          this.ps.push({
            ph, r, spd,
            angle: 0, orbitSpeed: 0, speedMultiplier: 1,
            sz:       1.2 + Math.random() * 1.8,
            op:       0,
            top:      .05 + Math.random() * .07,
            x:        Math.random() * innerWidth,
            y:        Math.random() * innerHeight,
            vx:       (Math.random() - .5) * .5,
            vy:       (Math.random() - .5) * .5,
            drift:    true,
            noiseOff: Math.random() * Math.PI * 2
          });
        }
      });
    }
  }

  _bind() {
    addEventListener('resize', () => this._resize());
    document.addEventListener('visibilitychange', () => {
      this.pause(document.hidden);
    });

    if (!this.mob) {
      /* ── PC: track pointer with basic throttling ── */
      let lastMove = 0;
      addEventListener('pointermove', e => {
        const now = performance.now();
        if (now - lastMove < 40) return;
        lastMove = now;
        this.tx = e.clientX; this.ty = e.clientY; this.moved = true;
      });
    } else {
      /* ── Mobile: touch events */
      addEventListener('touchstart', e => {
        const t = e.touches[0];
        this.tx = t.clientX;
        this.ty = t.clientY;
        this.touch = true;
        this.moved = true;
        this.ps.forEach(p => {
          p.drift = false;
          p.top   = .2 + Math.random() * .3;
        });
      }, { passive: true });

      addEventListener('touchmove', e => {
        const t = e.touches[0];
        this.tx = t.clientX;
        this.ty = t.clientY;
      }, { passive: true });

      addEventListener('touchend', () => {
        this.touch = false;
        this.ps.forEach(p => {
          p.drift = true;
          p.vx = (Math.random() - .5) * 3.5;
          p.vy = (Math.random() - .5) * 3.5;
        });
        setTimeout(() => this.ps.forEach(p => {
          p.top = .05 + Math.random() * .07;
          p.vx  = (Math.random() - .5) * .5;
          p.vy  = (Math.random() - .5) * .5;
        }), 2400);
      }, { passive: true });
    }
  }

  _loop() {
    if (this.paused) return;
    const ctx  = this.cx;
    const now  = Date.now() * .001;
    const isPC = !this.mob;
    ctx.clearRect(0, 0, this.cv.width, this.cv.height);

    // Ambient drift on PC before first mouse move
    if (isPC && !this.moved) {
      this.tx = this.cv.width  / 2 + Math.cos(now * .15) * 110;
      this.ty = this.cv.height / 2 + Math.sin(now * .11) * 80;
    }

    // Smooth cursor centre follows mouse / touch
    const lf = this.touch ? .06 : .03;
    this.ox = this._lerp(this.ox, this.tx, lf);
    this.oy = this._lerp(this.oy, this.ty, lf);

    const col     = this._color();
    const [r,g,b] = this._rgb(col);

    this.ps.forEach(p => {
      if (!p.drift) {
        if (isPC) {
          /* ── PC Multi-Velocity Physics ──────────────────────────
             Inner particles are first pulled to the cursor center,
             then transition into their orbit lanes around that point.
          ──────────────────────────────────────────────────────── */
          if (p.pullLayer) {
            const dx = this.ox - p.x;
            const dy = this.oy - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 12) {
              const pullStrength = 0.18 + (dist > 120 ? 0.08 : 0);
              p.x = this._lerp(p.x, this.ox, pullStrength);
              p.y = this._lerp(p.y, this.oy, pullStrength);
            } else {
              p.pullLayer = false;
              p.angle = Math.atan2(p.y - this.oy, p.x - this.ox);
            }
          }

          p.angle += p.orbitSpeed;   // continuous individual rotation

          const noise   = Math.sin(now * 0.7 + p.noiseOff) * 14;
          const targetX = this.ox + Math.cos(p.angle) * (p.r + noise);
          const targetY = this.oy + Math.sin(p.angle) * (p.r + noise);

          const dx   = targetX - p.x;
          const dy   = targetY - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          // Dynamic lerp: near (≤60px) → 0.12, far (≥260px) → 0.015
          const nearThresh = 60, farThresh  = 260;
          const lerpNear   = 0.12, lerpFar  = 0.015;
          const t          = Math.max(0, Math.min(1, (dist - nearThresh) / (farThresh - nearThresh)));
          const dynamicLerp = this._lerp(lerpNear, lerpFar, t) * p.speedMultiplier;

          p.x = this._lerp(p.x, targetX, dynamicLerp);
          p.y = this._lerp(p.y, targetY, dynamicLerp);

        } else {
          /* ── Mobile: original slow cinematic orbit ── */
          p.ph += p.spd;
          const noise = Math.sin(now * .8 + p.noiseOff) * 18;
          const px    = this.ox + Math.cos(p.ph) * (p.r + noise);
          const py    = this.oy + Math.sin(p.ph) * (p.r + noise);
          p.x = this._lerp(p.x, px, .025);
          p.y = this._lerp(p.y, py, .025);
        }
      } else {
        /* ── Mobile drift scatter ── */
        p.x += p.vx; p.y += p.vy;
        p.vx *= .994; p.vy *= .994;
        const W = this.cv.width, H = this.cv.height;
        if (p.x < -16) p.x = W + 16; else if (p.x > W + 16) p.x = -16;
        if (p.y < -16) p.y = H + 16; else if (p.y > H + 16) p.y = -16;
      }

      p.op = this._lerp(p.op, p.top, .02);

      const sz = p.sz * (1 + .12 * Math.sin(now * 1.6 + p.noiseOff));
      const ga = Math.max(0, Math.min(1, p.op));

      ctx.save();
      ctx.globalAlpha = ga;

      // Soft glow halo
      const glowSize = Math.max(1, sz * (this.mob ? 3 : 4));
      const gl = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowSize);
      gl.addColorStop(0,  `rgba(${r},${g},${b},.7)`);
      gl.addColorStop(.5, `rgba(${r},${g},${b},.1)`);
      gl.addColorStop(1,  `rgba(${r},${g},${b},0)`);
      ctx.beginPath(); ctx.arc(p.x, p.y, glowSize, 0, Math.PI * 2);
      ctx.fillStyle = gl; ctx.fill();

      // Bright core dot
      ctx.beginPath(); ctx.arc(p.x, p.y, sz, 0, Math.PI * 2);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.shadowBlur  = this.mob ? 4 : 6;
      ctx.shadowColor = col;
      ctx.fill();
      ctx.restore();
    });

    requestAnimationFrame(() => this._loop());
  }
}

/* ──────────────────────────────────────────
   STATE
   (AD is declared as var in data.js — globally accessible)
────────────────────────────────────────── */
let S = { view: 'grid', filter: 'all', music: true, theme: 'light', bgEffect: 'particles', sel: null, favs: [], vc: {} };

/* ──────────────────────────────────────────
   DOM SHORTCUTS
────────────────────────────────────────── */
const $ = id => document.getElementById(id);
const D = {
  spl:    $('spl'),    ca:      $('ca'),      srchInp: $('srchInp'),
  srchRes:$('srchRes'), srchClr: $('srchClr'), modov:   $('modov'),
  aud:     $('aud'),   mTog:   $('mTog'),   vG:      $('vG'),
  vL:      $('vL'),    vC:     $('vC'),     ftabs:  $('ftabs'),
  sbCnt:   $('sbCnt'), abSn:   $('abSn'),   mBg:    $('mBg'),
  mFlt:    $('mFlt'),  mTtl:   $('mTtl'),   mVer:   $('mVer'),
  mBdg:    $('mBdg'),  favBtn: $('favBtn'), ssTrk:  $('ssTrk'),
  ssDts:   $('ssDts'), ssSec:  $('ssSec'),  mSpcs:  $('mSpcs'),
  mDsc:    $('mDsc'),  mTgs:   $('mTgs'),   mLnch:  $('mLnch'),
  relTrk:  $('relTrk'), vidEl:  $('vidEl'),  vidSrc: $('vidSrc'),
  vidPh:   $('vidPh'),  lbov:   $('lbov'),   lbCls:  $('lbCls'),
  lbImg:   $('lbImg'),  bnH:    $('bnH'),    bnS:    $('bnS'),
  bnA:     $('bnA'),    bnSt:   $('bnSt')
};

/* ──────────────────────────────────────────
   STORAGE
────────────────────────────────────────── */
function ld() {
  try { const s = localStorage.getItem('dl9'); if (s) S = { ...S, ...JSON.parse(s) } } catch (e) {}
}
function sv() {
  try { localStorage.setItem('dl9', JSON.stringify(S)) } catch (e) {}
}

/* ──────────────────────────────────────────
   MUSIC
────────────────────────────────────────── */
function play()    { D.aud.play().catch(() => {}) }
function togMus()  { S.music = !S.music; S.music ? play() : D.aud.pause(); D.mTog.classList.toggle('on', S.music); sv() }

/* ──────────────────────────────────────────
   THEME
────────────────────────────────────────── */
function updateThemeColor(t) {
  const colorMap = {
    light: '#f0f4fa',
    neon: '#0a0010',
    aurora: '#040e18',
    crystal: '#07070f'
  };
  const color = colorMap[t] || colorMap.crystal;
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  if (meta.getAttribute('content') === color) return;
  const newMeta = document.createElement('meta');
  newMeta.setAttribute('name', 'theme-color');
  newMeta.setAttribute('content', color);
  document.head.replaceChild(newMeta, meta);
}

function theme(t) {
  document.body.classList.remove('th-neon', 'th-aurora', 'th-light');
  if (t !== 'crystal') document.body.classList.add('th-' + t);
  document.querySelectorAll('.theme-chip[data-t]').forEach(e => e.classList.toggle('on', e.dataset.t === t));
  S.theme = t; updateThemeColor(t); sv();
}

function updateBgEffectUI() {
  document.querySelectorAll('.theme-chip[data-bg]').forEach(btn => {
    btn.classList.toggle('on', btn.dataset.bg === S.bgEffect);
  });
}
// Ocean ripples state
let oceanRipplesActive = false;
let oceanIsMobile = false;

function destroyOceanRipples() {
  const ocean = document.getElementById('oceanBg');
  const jq = window.jQuery;
  if (!ocean || !jq || typeof jq.fn?.ripples !== 'function') return;
  try { jq(ocean).ripples('destroy'); } catch (e) {}
  oceanRipplesActive = false;
}

function initOceanRipples(isMobile) {
  const ocean = document.getElementById('oceanBg');
  const jq = window.jQuery;
  oceanIsMobile = !!isMobile;
  if (!ocean) return;

  const attempt = () => {
    if (!window.jQuery || typeof window.jQuery.fn?.ripples !== 'function') {
      setTimeout(attempt, 100);
      return;
    }

    try {
      destroyOceanRipples();
      window.jQuery(ocean).ripples({
        resolution: oceanIsMobile ? 256 : 812,
        dropRadius: oceanIsMobile ? 3 : 6,
        perturbance: oceanIsMobile ? 0.004 : 0.01,
        interactive: !oceanIsMobile
      });
      window.jQuery(ocean).ripples('drop', window.innerWidth * 0.5, window.innerHeight * 0.5, oceanIsMobile ? 20 : 30, oceanIsMobile ? 0.06 : 0.08);
      oceanRipplesActive = true;
    } catch (e) {}
  };

  attempt();
}

function applyBgEffect(effect) {
  const useOcean = effect === 'ocean';
  const canvas = document.getElementById('pc');
  const ocean = document.getElementById('oceanBg');
  if (!canvas || !ocean) return;

  S.bgEffect = useOcean ? 'ocean' : 'particles';
  canvas.style.display = useOcean ? 'none' : 'block';
  ocean.style.display = useOcean ? 'block' : 'none';
  updateBgEffectUI();
  if (window.ring) {
    window.ring.pause(useOcean);
  }
  if (!useOcean) {
    destroyOceanRipples();
    return;
  }

  const isMobile = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 820;
  const oceanAsset = isMobile ? 'games/ocean_mobile.png' : 'games/ocean_pc.png';
  ocean.style.backgroundImage = `url('${oceanAsset}')`;
  // Initialize ripples using separate mobile/PC configuration
  initOceanRipples(isMobile);
}

/* ──────────────────────────────────────────
   FAVORITES
────────────────────────────────────────── */
const isFav = id => S.favs.includes(id);
function togFav(id) {
  const i = S.favs.indexOf(id);
  if (i > -1) S.favs.splice(i, 1);
  else {
    if (S.favs.length >= 3) { alert('بیری ئەپ تەنها بە ٣ یاری سنووردارە!'); return false }
    S.favs.push(id);
  }
  sv(); return true;
}
function srt(arr)      { return [...arr].sort((a, b) => isFav(a.id) === isFav(b.id) ? 0 : isFav(a.id) ? -1 : 1) }
function updFavBtn()   { if (!S.sel) return; D.favBtn.classList.toggle('faved', isFav(S.sel.id)) }

/* ──────────────────────────────────────────
   NEW BADGE
────────────────────────────────────────── */
const getVc = id => S.vc[id] || 0;
const isNew = id => getVc(id) < 4;
function incVc(id) { S.vc[id] = (S.vc[id] || 0) + 1; sv() }

/* ──────────────────────────────────────────
   FILTER & VIEW
────────────────────────────────────────── */
function filt(f) {
  S.filter = f;
  document.querySelectorAll('.ftab').forEach(e => e.classList.toggle('on', e.dataset.f === f));
  render();
}
function vw(v) {
  S.view = v;
  D.vG.classList.toggle('on', v === 'grid');
  D.vL.classList.toggle('on', v === 'list');
  $('vC')?.classList.toggle('on', v === 'cover');
  render(); sv();
}

/* ──────────────────────────────────────────
   RENDER
────────────────────────────────────────── */
const NI = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect fill='%23223' width='100' height='100' rx='20'/><text x='50' y='62' text-anchor='middle' fill='%23556' font-size='36'>📱</text></svg>";

function coverPath(a) {
  return a.cover || `games/${a.id}cover.png`;
}
function iconPath(a) {
  return a.icon || `games/${a.id}.png`;
}
function getScreens(a) {
  return Array.isArray(a.screenshots) ? a.screenshots.slice() : [];
}
function probeScreens(a) {
  const candidates = getScreens(a).length
    ? getScreens(a)
    : Array.from({ length: 4 }, (_, i) => `games/${a.id}screen${i + 1}.png`);
  const found = [];
  return Promise.all(candidates.map(src => new Promise(resolve => {
    const img = new Image();
    img.onload = () => { found.push(src); resolve(); };
    img.onerror = resolve;
    img.src = src;
  }))).then(() => found);
}

function getApps(q = '') {
  return srt(AD.filter(a => {
    const matchText = a.name.toLowerCase().includes(q.toLowerCase())
      || a.sh.toLowerCase().includes(q.toLowerCase())
      || (a.tags && a.tags.some(t => t.toLowerCase().includes(q.toLowerCase())));
    const ms = !q || matchText;
    return ms && (S.filter === 'all' || a.cat === S.filter);
  }));
}

function render(q = '') {
  const list = getApps(q);
  if (!list.length) {
    D.ca.innerHTML = `<div class="empty"><svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg><h3>هیچ ئەپێک نەدۆزرایەوە</h3><p>تکایە ناوێکی تر بنووسە</p></div>`;
    return;
  }
  if      (S.view === 'cover') rCover(list);
  else if (S.view === 'list')  rList(list);
  else                          rGrid(list);
}

function rGrid(list) {
  D.ca.innerHTML = `<div class="grid">${list.map((a, i) => `
    <div class="gc ${isFav(a.id) ? 'fav' : ''} ${isNew(a.id) ? 'isn' : ''}" data-id="${a.id}" style="animation-delay:${i * .04}s">
      <div class="gc-wrap">
        <img class="gc-ico" src="${iconPath(a)}" alt="${a.name}" loading="lazy" onerror="this.src='${NI}'">
        <div class="gc-glow"></div>
      </div>
      <span class="gc-name">${a.name}</span>
      <span class="gc-cat">${a.cat}</span>
    </div>`).join('')}</div>`;
  attach();
}

function rList(list) {
  D.ca.innerHTML = `<div class="listv">${list.map((a, i) => `
    <div class="lc ${isFav(a.id) ? 'fav' : ''} ${isNew(a.id) ? 'isn' : ''}" data-id="${a.id}" style="animation-delay:${i * .04}s">
      <img class="lc-ico" src="${iconPath(a)}" alt="${a.name}" loading="lazy" onerror="this.src='${NI}'">
      <div class="lc-info"><h3>${a.name}</h3><p>${a.sh} · ${a.sz}</p></div>
      <div class="lc-meta"><span class="lc-cat">${a.cat}</span><svg class="lc-arr" viewBox="0 0 24 24"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41L10.83 12z"/></svg></div>
    </div>`).join('')}</div>`;
  attach();
}

function rCover(list) {
  D.ca.innerHTML = `<div class="coverv">${list.map((a, i) => {
    const favHtml = isFav(a.id) ? `<span class="cv-fav">❤️</span>` : '';
    const newHtml = isNew(a.id) ? `<span class="cv-new">نوێ</span>` : '';
    return `<div class="cv-card ${isFav(a.id) ? 'fav' : ''}" data-id="${a.id}" style="animation-delay:${i * .05}s">
      <div class="cv-bg" style="background-image:url('${coverPath(a)}')"></div>
      <div class="cv-tint"></div>
      ${newHtml}${favHtml}
      <div class="cv-glass">
        <img class="cv-icon" src="${iconPath(a)}" alt="${a.name}" loading="lazy" onerror="this.src='${NI}'">
        <div class="cv-info">
          <span class="cv-cat">${a.cat}</span>
          <h3>${a.name}</h3>
          <div class="cv-meta">
            <span class="cv-badge">⬇ ${a.dl || '—'}</span>
            <span>·</span>
            <span class="cv-badge">${a.sz}</span>
            <span>·</span>
            <span class="cv-badge">v${a.ver}</span>
          </div>
        </div>
      </div>
      <button class="cv-launch" onclick="event.stopPropagation();window.open('${a.link}','_blank','noopener,noreferrer')">کردنەوە ↗</button>
    </div>`;
  }).join('')}</div>`;
  attach();
}

function attach() {
  document.querySelectorAll('[data-id]').forEach(el => el.addEventListener('click', () => openMod(el.dataset.id)));
}

function initScreenshotTrack(track, onTap) {
  if (!track) return;

  let isDragging = false;
  let startX = 0;
  let startScrollLeft = 0;
  let hasDragged = false;
  let pointerWasOnImage = false;
  let pointerStartTime = 0;
  let activeImage = null;

  const stopDragging = () => {
    isDragging = false;
    track.classList.remove('dragging');
  };

  track.addEventListener('pointerdown', e => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    isDragging = true;
    hasDragged = false;
    pointerWasOnImage = e.target.closest('img') !== null;
    activeImage = e.target.closest('img');
    pointerStartTime = Date.now();
    startX = e.clientX;
    startScrollLeft = track.scrollLeft;
    track.classList.add('dragging');
    track.setPointerCapture?.(e.pointerId);
  });

  track.addEventListener('pointermove', e => {
    if (!isDragging) return;
    const deltaX = e.clientX - startX;
    if (Math.abs(deltaX) > 5) hasDragged = true;
    e.preventDefault();
    track.scrollLeft = startScrollLeft - deltaX;
  });

  track.addEventListener('pointerup', e => {
    if (!isDragging) return;
    stopDragging();
    track.releasePointerCapture?.(e.pointerId);
    const wasTap = !hasDragged && pointerWasOnImage && activeImage && Date.now() - pointerStartTime < 350;
    if (wasTap && typeof onTap === 'function') {
      track.dataset.suppressNextClick = '1';
      onTap(activeImage);
    }
  });

  track.addEventListener('pointercancel', () => stopDragging());
  track.addEventListener('dragstart', e => e.preventDefault());
}

/* ──────────────────────────────────────────
   MODAL
────────────────────────────────────────── */
async function openMod(id) {
  const a = AD.find(x => x.id === id); if (!a) return;
  S.sel = a; incVc(id);

  D.mBg.style.backgroundImage = `linear-gradient(180deg, rgba(0,0,0,.18), rgba(0,0,0,.25)), url('${coverPath(a)}')`;
  D.mFlt.src = iconPath(a); D.mFlt.onerror = () => D.mFlt.src = NI;
  D.mTtl.textContent = a.name;
  D.mVer.textContent = `وەشان ${a.ver}`;

  let bdg = `<span class="mb mb-cat">${a.cat}</span>`;
  if (a.dl)      bdg += `<span class="mb mb-dl">⬇ ${a.dl}</span>`;
  if (isNew(id)) bdg += `<span class="mb mb-new">نوێ</span>`;
  D.mBdg.innerHTML = bdg;

  const screens = await probeScreens(a);
  if (screens.length) {
    D.ssSec.style.display = 'block';
    D.ssTrk.innerHTML = screens.map((s, i) => `<div class="ss-slide"><img src="${s}" alt="Screenshot ${i + 1}" loading="lazy" data-screen="${s}"></div>`).join('');
    D.ssDts.innerHTML = screens.map((_, i) => `<div class="ss-dot${i === 0 ? ' on' : ''}" data-i="${i}"></div>`).join('');
    initScreenshotTrack(D.ssTrk, img => {
      if (!img) return;
      const src = img.dataset.screen;
      if (src) {
        D.lbImg.src = src;
        D.lbov.classList.add('open');
      }
    });
    D.ssTrk.querySelectorAll('img').forEach(img => {
      img.draggable = false;
      img.setAttribute('draggable', 'false');
      img.addEventListener('dragstart', e => e.preventDefault());
      img.addEventListener('click', e => {
        if (D.ssTrk.dataset.suppressNextClick === '1') {
          e.preventDefault();
          e.stopPropagation();
          delete D.ssTrk.dataset.suppressNextClick;
          return;
        }
        const src = e.currentTarget.dataset.screen;
        if (src) {
          D.lbImg.src = src;
          D.lbov.classList.add('open');
        }
      });
    });
    D.ssTrk.onscroll = () => {
      const w   = D.ssTrk.firstElementChild?.offsetWidth || 1;
      const act = Math.round(D.ssTrk.scrollLeft / w);
      D.ssDts.querySelectorAll('.ss-dot').forEach((d, i) => d.classList.toggle('on', i === act));
    };
    D.ssDts.querySelectorAll('.ss-dot').forEach(d => {
      d.addEventListener('click', () => {
        const w = D.ssTrk.firstElementChild?.offsetWidth || 0;
        D.ssTrk.scrollTo({ left: +d.dataset.i * (w + 9), behavior: 'smooth' });
      });
    });
  } else {
    D.ssSec.style.display = 'block';
    D.ssTrk.innerHTML = `<div class="ss-empty">ئەم یارییە هیچ وێنەیەکی وەرگرتوو نییە.</div>`;
    D.ssDts.innerHTML = '';
  }

  D.mSpcs.innerHTML = [
    ['جۆر', a.cat], ['قەبارە', a.sz], ['داونلۆد', a.dl || '—'],
    ['وەشان', a.ver], ['گەشەپێدەر', a.dev], ['دواین نوێکردن', a.upd]
  ].map(([l, v]) => `<div class="spec"><label>${l}</label><span>${v}</span></div>`).join('');

  D.mDsc.textContent = a.desc;
  D.mTgs.innerHTML   = (a.tags || []).map(t => `<span class="tag">${t}</span>`).join('');
  D.mTgs.style.display = a.tags?.length ? 'flex' : 'none';
  D.mLnch.onclick = () => window.open(a.link, '_blank', 'noopener,noreferrer');
  updFavBtn();

  D.lbCls?.addEventListener('click', closeLb);
  D.lbov?.addEventListener('click', e => { if (e.target === D.lbov || e.target === D.lbCls || e.target === D.lbImg) closeLb(); });

  let rel = AD.filter(x => x.id !== id && x.cat === a.cat).slice(0, 6);
  if (!rel.length) rel = AD.filter(x => x.id !== id).slice(0, 4);
  D.relTrk.innerHTML = rel.map(x => `<div class="rc" data-id="${x.id}"><img src="${iconPath(x)}" alt="${x.name}" loading="lazy" onerror="this.src='${NI}'"><span>${x.name}</span></div>`).join('');
  D.relTrk.querySelectorAll('.rc').forEach(rc => rc.addEventListener('click', () => { closeMod(); setTimeout(() => openMod(rc.dataset.id), 310) }));

  D.modov.classList.add('open');
  const b = document.getElementById('mBdy'); if (b) b.scrollTop = 0;
}

function closeMod() { D.modov.classList.remove('open'); S.sel = null }
function closeLb() { D.lbov.classList.remove('open'); D.lbImg.src = ''; }
function initStateUI() {
  const view = S.view || 'grid';
  const filter = S.filter || 'all';
  document.querySelectorAll('.ftab').forEach(e => e.classList.toggle('on', e.dataset.f === filter));
  D.vG.classList.toggle('on', view === 'grid');
  D.vL.classList.toggle('on', view === 'list');
  $('vC')?.classList.toggle('on', view === 'cover');
  switchView('view-home', 'H');
}

/* ──────────────────────────────────────────
   SEARCH
────────────────────────────────────────── */
function rSrch(q) {
  const query = q.toLowerCase();
  const list = query
    ? AD.filter(a => a.name.toLowerCase().includes(query)
      || a.sh.toLowerCase().includes(query)
      || (a.tags && a.tags.some(t => t.toLowerCase().includes(query))))
    : AD;
  if (!list.length) { D.srchRes.innerHTML = `<div class="empty"><p>هیچ ئەنجامێک نەدۆزرایەوە</p></div>`; return }
  D.srchRes.innerHTML = srt(list).map(a => `
    <div class="search-card" data-id="${a.id}">
      <div class="search-item-head">
        <img class="sri-ico" src="${iconPath(a)}" alt="${a.name}" loading="lazy" onerror="this.src='${NI}'">
        <div class="sri-info"><h4>${a.name}${isFav(a.id) ? ' ❤️' : ''}${isNew(a.id) ? ' <span class="sri-new">نوێ</span>' : ''}</h4><p>${a.sh}</p></div>
      </div>
      <div class="search-item-meta"><span>${a.cat}</span></div>
    </div>`).join('');
  D.srchRes.querySelectorAll('.search-card').forEach(el => el.addEventListener('click', () => openMod(el.dataset.id)));
}

/* ──────────────────────────────────────────
   PANELS
────────────────────────────────────────── */
function switchView(viewId, navId) {
  document.querySelectorAll('.app-view').forEach(v => v.classList.remove('active'));
  document.getElementById(viewId)?.classList.add('active');
  document.querySelectorAll('.sb-i, .bn').forEach(btn => btn.classList.remove('on'));
  if (navId) {
    document.getElementById('sb' + navId)?.classList.add('on');
    document.getElementById('bn' + navId)?.classList.add('on');
  }
}

function loadVid() {
  if (TV.enabled && TV.url) {
    D.vidSrc.src = TV.url;
    D.vidEl.style.display = 'block';
    D.vidPh.style.display = 'none';
    D.vidEl.load();
  } else {
    D.vidEl.style.display = 'none';
    D.vidPh.style.display = 'flex';
  }
}

/* ──────────────────────────────────────────
   STATS
────────────────────────────────────────── */
function stats() {
  const n = AD.length;
  if (D.sbCnt) D.sbCnt.textContent = n;
  if (D.abSn)  D.abSn.textContent  = n;
}

/* ──────────────────────────────────────────
   SPLASH
────────────────────────────────────────── */
function initSplash() {
  const p = $('splPts');
  for (let i = 0; i < 20; i++) {
    const el = document.createElement('div');
    el.className = 'spl-pt';
    el.style.cssText = `left:${Math.random() * 100}%;animation-delay:${Math.random() * 5}s;animation-duration:${3 + Math.random() * 2.5}s`;
    if (i % 2) el.style.background = 'var(--ac2)';
    p.appendChild(el);
  }
  setTimeout(() => { D.spl.classList.add('out'); if (S.music) play() }, 3000);
}

/* ──────────────────────────────────────────
   EVENTS
────────────────────────────────────────── */
function events() {
  // Lightbox
  D.lbCls?.addEventListener('click', closeLb);
  D.lbov?.addEventListener('click', e => { if (e.target === D.lbov || e.target === D.lbCls) closeLb(); });

  // Sidebar
  $('sbH')?.addEventListener('click', () => switchView('view-home', 'H'));
  $('sbS')?.addEventListener('click', () => { switchView('view-search', 'S'); setTimeout(() => D.srchInp.focus(), 120); });
  $('sbA')?.addEventListener('click', () => { loadVid(); switchView('view-about', 'A'); });
  $('sbSt')?.addEventListener('click', () => switchView('view-settings', 'St'));

  // Bottom nav
  $('bnH')?.addEventListener('click', () => switchView('view-home', 'H'));
  $('bnS')?.addEventListener('click', () => { switchView('view-search', 'S'); setTimeout(() => D.srchInp.focus(), 120); });
  $('bnA')?.addEventListener('click', () => { loadVid(); switchView('view-about', 'A'); });
  $('bnSt')?.addEventListener('click', () => switchView('view-settings', 'St'));

  // View — grid / list / cover
  D.vG.addEventListener('click', () => vw('grid'));
  D.vL.addEventListener('click', () => vw('list'));
  $('vC')?.addEventListener('click', () => vw('cover'));

  // Filter tabs
  D.ftabs.querySelectorAll('.ftab').forEach(e => e.addEventListener('click', () => filt(e.dataset.f)));

  // Search
  D.srchInp.addEventListener('input', e => rSrch(e.target.value));
  D.srchClr?.addEventListener('click', () => { D.srchInp.value = ''; rSrch(''); D.srchInp.focus(); });

  // Modal
  $('mCls')?.addEventListener('click', closeMod);
  D.modov.addEventListener('click', e => { if (e.target === D.modov) closeMod() });
  D.favBtn.addEventListener('click', () => { if (!S.sel) return; if (togFav(S.sel.id)) { updFavBtn(); render() } });

  // Theme selectors
  D.mTog.addEventListener('click', togMus);
  document.querySelectorAll('.theme-chip[data-t]').forEach(e => e.addEventListener('click', () => theme(e.dataset.t)));
  document.querySelectorAll('.theme-chip[data-bg]').forEach(e => e.addEventListener('click', () => {
    S.bgEffect = e.dataset.bg;
    applyBgEffect(S.bgEffect);
    sv();
  }));

  // Forward pointer events through the UI shell to the ocean background
  document.addEventListener('pointermove', e => {
    if (S.bgEffect === 'ocean') {
      const ocean = document.getElementById('oceanBg');
      if (!ocean) return;
      try {
        const dropRadius = oceanIsMobile ? 1 : 20;
        const strength = oceanIsMobile ? 0.05 : 0.08;
        if (window.jQuery && typeof window.jQuery.fn?.ripples === 'function') {
          window.jQuery(ocean).ripples('drop', e.clientX, e.clientY, dropRadius, strength);
        }
      } catch (err) {}
    }
  });

  document.addEventListener('pointerdown', e => {
    if (S.bgEffect === 'ocean') {
      const ocean = document.getElementById('oceanBg');
      if (!ocean) return;
      try {
        const dropRadius = oceanIsMobile ? 18 : 30;
        const strength = oceanIsMobile ? 0.05 : 0.08;
        if (window.jQuery && typeof window.jQuery.fn?.ripples === 'function') {
          window.jQuery(ocean).ripples('drop', e.clientX, e.clientY, dropRadius, strength);
        }
      } catch (err) {}
    }
  });

  // First interaction → play music
  document.addEventListener('click', () => { if (S.music && D.aud.paused) play() }, { once: true });
}

/* ──────────────────────────────────────────
   ELEMENT SDK
────────────────────────────────────────── */
const DC = { app_title: 'Didar Library' };
if (window.elementSdk) {
  window.elementSdk.init({
    defaultConfig: DC,
    onConfigChange: async c => {
      const t  = c.app_title || DC.app_title;
      const h  = $('hdTitle'); if (h)  h.textContent  = t;
      const ab = $('abTtl');   if (ab) ab.textContent = t;
      const st = document.querySelector('.spl-title'); if (st) st.textContent = t;
    },
    mapToCapabilities:    () => ({ recolorables: [], borderables: [] }),
    mapToEditPanelValues:  c => new Map([['app_title', c.app_title || DC.app_title]])
  });
}

/* ──────────────────────────────────────────
   SERVICE WORKER (PWA)
────────────────────────────────────────── */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

/* ──────────────────────────────────────────
   BOOT
────────────────────────────────────────── */
ld();
theme(S.theme);
window.ring = new Ring();
applyBgEffect(S.bgEffect);
D.mTog.classList.toggle('on', S.music);
render();
stats();
events();
initSplash();
initStateUI();
loadVid();
