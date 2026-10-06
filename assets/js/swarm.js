/* Particle swarm: one cloud of points that morphs into each chapter's symbol.
   Shapes are generated once (lazily), shuffled so morphs swirl rather than stream,
   and eased per particle on the CPU; drift, voice pulse and the cursor's push
   happen in the vertex shader. */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.min.js';

// QR code for https://ayazelahimullick12-droid.github.io/Portofolio-Website/ (33×33, level M)
const QR = ["111111101010000011111001001111111","100000101110100000101111101000001","101110100101011110111000101011101","101110101101010101110010101011101","101110100010011110010110101011101","100000100100101010011000001000001","111111101010101010101010101111111","000000001001100011101001000000000","101101110111101001100100001001011","101101010100010011111101001101101","001111111110110001101101001111011","110100010010111000111011011101011","011110110101100110010011000111011","111110010000001111110011100100010","010000100101110001010010101111100","011110001101110100001111011001100","010011100000001100111110111011100","111000010011110100001011111011011","100011101000000111001110011110100","001010010100011011100001000010001","011110100111100111110100000101100","100100011011000011111001101000001","001111110000101010000001101000011","011110000010101110101011100001011","101000111000100101111011111111011","000000001110000101110101100011000","111111101100101010111101101010000","100000101101011000001111100011110","101110100011111010111111111110100","101110101101011100001111000101001","101110101001001100100100011100100","100000100110000101110011100110001","111111101010011001010101000010100"];

// x: offset as a fraction of the half-width (+ right); s: scale; o: opacity; my/ms: phone y-offset/scale
const STATES = {
  hero:     { shape: 'sphere',        x: .46, s: 1.00, o: 1.0, a: '#3df2ff', b: '#8b5cff', spin: .12, my: .45, ms: .62 },
  about:    { shape: 'torus',         x: -.5, s: .95,  o: .55, a: '#8b5cff', b: '#3df2ff', spin: .10 },
  journey:  { shape: 'helix',         x: .55, s: 1.00, o: .75, a: '#3df2ff', b: '#ff2e93', spin: .28 },
  brac:     { shape: 'bangladesh',    x: .62, s: 1.00, o: .9,  a: '#ff2e93', b: '#ffb3d9', sway: true },
  agami:    { shape: 'phone',         x: .52, s: 1.00, o: 1.0, a: '#ff2e93', b: '#ffd1ea', sway: true },
  voice:    { shape: 'orb',           x: .52, s: 1.00, o: 1.0, a: '#3df2ff', b: '#ff2e93', spin: .15, pulse: 1 },
  local:    { shape: 'chip',          x: .52, s: 1.00, o: 1.0, a: '#b6ff3d', b: '#3df2ff', sway: true },
  field:    { shape: 'bangladesh',    x: .52, s: 1.00, o: 1.0, a: '#1ed6a0', b: '#ff2e93', sway: true },
  schedule: { shape: 'calendar',      x: .52, s: 1.00, o: 1.0, a: '#c86bff', b: '#ff2e93', sway: true },
  qr:       { shape: 'qr',            x: .52, s: 1.00, o: 1.0, a: '#ff4fa8', b: '#ffffff', sway: true },
  uni:      { shape: 'lattice',       x: .5,  s: 1.00, o: .9,  a: '#8b5cff', b: '#3df2ff', spin: .16 },
  skills:   { shape: 'constellation', x: .55, s: 1.00, o: .7,  a: '#3df2ff', b: '#b6ff3d', spin: .07 },
  contact:  { shape: 'galaxy',        x: .45, s: 1.10, o: .9,  a: '#ff2e93', b: '#3df2ff', spin: .06 }
};

function rng(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const gauss = r => { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

/* ---------------- shape generators ---------------- */
// Each returns an array of [x, y, z] with exactly n points.

function fill(n, parts, r) {
  // parts: [[weight, fn(r) -> [x,y,z]], ...]
  const total = parts.reduce((s, p) => s + p[0], 0);
  const out = [];
  parts.forEach(([w, fn], i) => {
    const k = i === parts.length - 1 ? n - out.length : Math.round(n * w / total);
    for (let j = 0; j < k; j++) out.push(fn(r, j, k));
  });
  return out;
}

function rotX(p, a) { const c = Math.cos(a), s = Math.sin(a); return [p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c]; }
function rotZ(p, a) { const c = Math.cos(a), s = Math.sin(a); return [p[0] * c - p[1] * s, p[0] * s + p[1] * c, p[2]]; }

function onSegment(r, a, b, jit = .01) {
  const t = r();
  return [a[0] + (b[0] - a[0]) * t + gauss(r) * jit, a[1] + (b[1] - a[1]) * t + gauss(r) * jit, (a[2] || 0) + ((b[2] || 0) - (a[2] || 0)) * t + gauss(r) * jit];
}
function roundRectPoint(r, w, h, rad) {
  // uniform-ish point on a rounded rectangle outline centred at 0
  const straightW = w - 2 * rad, straightH = h - 2 * rad, arc = Math.PI * rad / 2;
  const per = 2 * straightW + 2 * straightH + 4 * arc;
  let d = r() * per;
  const segs = [
    [straightW, t => [-w / 2 + rad + t, h / 2]],
    [arc, t => { const a = Math.PI / 2 - t / rad; return [w / 2 - rad + Math.cos(a) * rad, h / 2 - rad + Math.sin(a) * rad]; }],
    [straightH, t => [w / 2, h / 2 - rad - t]],
    [arc, t => { const a = -t / rad; return [w / 2 - rad + Math.cos(a) * rad, -h / 2 + rad + Math.sin(a) * rad]; }],
    [straightW, t => [w / 2 - rad - t, -h / 2]],
    [arc, t => { const a = -Math.PI / 2 - t / rad; return [-w / 2 + rad + Math.cos(a) * rad, -h / 2 + rad + Math.sin(a) * rad]; }],
    [straightH, t => [-w / 2, -h / 2 + rad + t]],
    [arc, t => { const a = Math.PI - t / rad; return [-w / 2 + rad + Math.cos(a) * rad, h / 2 - rad + Math.sin(a) * rad]; }]
  ];
  for (const [len, f] of segs) { if (d <= len) return f(d); d -= len; }
  return [0, 0];
}

const SHAPES = {
  sphere(n, r) {
    return fill(n, [
      [.78, (r) => {
        const u = r() * 2 - 1, th = r() * Math.PI * 2, rad = 1.5 * (1 + gauss(r) * .012);
        const s = Math.sqrt(1 - u * u);
        return [Math.cos(th) * s * rad, u * rad, Math.sin(th) * s * rad];
      }],
      [.22, (r) => {
        const th = r() * Math.PI * 2, rad = 1.95 + r() * .4;
        return rotZ(rotX([Math.cos(th) * rad, gauss(r) * .015, Math.sin(th) * rad], .32), -.25);
      }]
    ], r);
  },

  torus(n, r) {
    return fill(n, [[1, (r) => {
      const u = r() * Math.PI * 2, v = r() * Math.PI * 2, R = 1.35, rr = .5 + gauss(r) * .02;
      return rotX([(R + rr * Math.cos(v)) * Math.cos(u), rr * Math.sin(v), (R + rr * Math.cos(v)) * Math.sin(u)], 1.15);
    }]], r);
  },

  helix(n, r) {
    const turns = 2.6, H = 4.2, rad = .75;
    const strand = (phase) => (r) => {
      const t = r(), a = t * turns * Math.PI * 2 + phase;
      return [Math.cos(a) * rad + gauss(r) * .025, (t - .5) * H, Math.sin(a) * rad + gauss(r) * .025];
    };
    return fill(n, [
      [.36, strand(0)], [.36, strand(Math.PI)],
      [.28, (r) => {
        const k = Math.floor(r() * 26), t = (k + .5) / 26, a = t * turns * Math.PI * 2;
        const p1 = [Math.cos(a) * rad, (t - .5) * H, Math.sin(a) * rad];
        const p2 = [Math.cos(a + Math.PI) * rad, (t - .5) * H, Math.sin(a + Math.PI) * rad];
        return onSegment(r, p1, p2, .008);
      }]
    ], r);
  },

  phone(n, r) {
    const W = 1.45, H = 3.0;
    const tile = (cx, cy) => (r) => {
      // a rounded tile, mostly outline with a little fill
      if (r() < .65) { const p = roundRectPoint(r, .56, .74, .1); return [cx + p[0], cy + p[1], gauss(r) * .01]; }
      return [cx + (r() - .5) * .5, cy + (r() - .5) * .68, gauss(r) * .02];
    };
    return fill(n, [
      [.30, (r) => { const p = roundRectPoint(r, W, H, .24); return [p[0], p[1], gauss(r) * .012]; }],
      [.06, (r) => { const p = roundRectPoint(r, W + .09, H + .09, .28); return [p[0], p[1], -.03]; }],
      [.12, tile(-.32, .38)], [.12, tile(.32, .38)], [.12, tile(-.32, -.46)], [.12, tile(.32, -.46)],
      [.06, (r) => [(r() - .5) * 1.1, 1.08 + gauss(r) * .02, 0]],
      [.06, (r) => { const k = Math.floor(r() * 3), a = r() * Math.PI * 2, rad = .09 * Math.sqrt(r()); return [-.42 + k * .42 + Math.cos(a) * rad, -1.22 + Math.sin(a) * rad, 0]; }],
      [.04, (r) => { const k = 1 + Math.floor(r() * 3), a = (r() - .5) * 1.2; return [.95 + Math.cos(a) * .14 * k, .9 + Math.sin(a) * .14 * k, 0]; }]
    ], r);
  },

  orb(n, r) {
    return fill(n, [
      [.55, (r) => {
        const u = r() * 2 - 1, th = r() * Math.PI * 2, s = Math.sqrt(1 - u * u), rad = 1.12 * Math.cbrt(.55 + .45 * r());
        return [Math.cos(th) * s * rad, u * rad, Math.sin(th) * s * rad];
      }],
      [.45, (r) => {
        const ring = Math.floor(r() * 3), th = r() * Math.PI * 2, rad = 1.55 + ring * .32 + gauss(r) * .01;
        return [Math.cos(th) * rad, Math.sin(th) * rad, gauss(r) * .02];
      }]
    ], r);
  },

  chip(n, r) {
    const S = 1.7, pins = 9, sides = [[0, 1], [1, 0], [0, -1], [-1, 0]];
    const pinPos = (r) => {
      const side = sides[Math.floor(r() * 4)], k = Math.floor(r() * pins);
      const t = (k + .5) / pins * S - S / 2;
      const base = side[0] === 0 ? [t, side[1] * S / 2] : [side[0] * S / 2, t];
      return { side, base };
    };
    return fill(n, [
      [.22, (r) => { const p = roundRectPoint(r, S, S, .08); return [p[0], p[1], 0]; }],
      [.16, (r) => [(r() - .5) * S * .92, (r() - .5) * S * .92, gauss(r) * .015]],
      [.14, (r) => { const p = roundRectPoint(r, .7, .7, .04); return [p[0], p[1], .02]; }],
      [.14, (r) => { const { side, base } = pinPos(r), L = r() * .26; return [base[0] + side[0] * L, base[1] + side[1] * L, 0]; }],
      [.30, (r) => {
        // traces: out from a pin, then turn 90°
        const { side, base } = pinPos(r), l1 = .26 + r() * .4, turn = (r() < .5 ? -1 : 1), l2 = r() * .5;
        const end1 = [base[0] + side[0] * l1, base[1] + side[1] * l1];
        if (r() < .55) { const t = r() * l1 + .26; return [base[0] + side[0] * Math.min(t, l1), base[1] + side[1] * Math.min(t, l1), 0]; }
        const perp = [side[1] * turn, side[0] * turn];
        const t = r() * l2;
        return [end1[0] + perp[0] * t, end1[1] + perp[1] * t, 0];
      }],
      [.04, (r) => [(r() - .5) * 4, (r() - .5) * 4, (r() - .5) * .6]]
    ], r);
  },

  calendar(n, r) {
    const cols = 7, rows = 5, cw = .44, ch = .4, gap = .05;
    const W = cols * cw + (cols - 1) * gap, H = rows * ch + (rows - 1) * gap;
    const missed = [[2, 1], [5, 1], [1, 3], [4, 2], [6, 4]];
    const cell = (c, rw) => [-W / 2 + c * (cw + gap) + cw / 2, H / 2 - .25 - rw * (ch + gap) - ch / 2];
    return fill(n, [
      [.10, (r) => { const p = roundRectPoint(r, W + .2, .36, .08); return [p[0], H / 2 + .22 + p[1], 0]; }],
      [.04, (r) => { const k = r() < .5 ? -1 : 1, a = r() * Math.PI * 2; return [k * W / 3.2 + Math.cos(a) * .07, H / 2 + .45 + Math.sin(a) * .07, 0]; }],
      [.62, (r) => { const c = Math.floor(r() * cols), rw = Math.floor(r() * rows), o = cell(c, rw), p = roundRectPoint(r, cw, ch, .06); return [o[0] + p[0], o[1] + p[1], gauss(r) * .01]; }],
      [.24, (r) => { const m = missed[Math.floor(r() * missed.length)], o = cell(m[0], m[1]); return [o[0] + (r() - .5) * cw * .8, o[1] + (r() - .5) * ch * .8, .03]; }]
    ], r).map(p => [p[0], p[1] + .1, p[2]]);
  },

  qr(n, r) {
    const N = QR.length, size = 2.9, cell = size / N, dark = [];
    QR.forEach((row, y) => [...row].forEach((v, x) => { if (v === '1') dark.push([x, y]); }));
    return fill(n, [[1, (r) => {
      const [x, y] = dark[Math.floor(r() * dark.length)];
      return [-size / 2 + (x + r()) * cell, size / 2 - (y + r()) * cell, gauss(r) * .02];
    }]], r);
  },

  lattice(n, r) {
    const S = 1.15, edges = [];
    const v = [-S, S];
    for (const a of v) for (const b of v) {
      edges.push([[-S, a, b], [S, a, b]], [[a, -S, b], [a, S, b]], [[a, b, -S], [a, b, S]]);
    }
    const g = [-S, -S / 3, S / 3, S];
    return fill(n, [
      [.38, (r) => { const e = edges[Math.floor(r() * edges.length)]; return onSegment(r, e[0], e[1], .012); }],
      [.30, (r) => { const p = [g[Math.floor(r() * 4)], g[Math.floor(r() * 4)], g[Math.floor(r() * 4)]]; return [p[0] + gauss(r) * .04, p[1] + gauss(r) * .04, p[2] + gauss(r) * .04]; }],
      [.32, (r) => {
        const p = [g[Math.floor(r() * 4)], g[Math.floor(r() * 4)], g[Math.floor(r() * 4)]];
        const axis = Math.floor(r() * 3), q = p.slice(), i = g.indexOf(p[axis]);
        q[axis] = g[Math.min(3, i + 1)];
        return onSegment(r, p, q, .006);
      }]
    ], r);
  },

  constellation(n, r) {
    const K = 6, centers = [];
    for (let i = 0; i < K; i++) {
      const y = 1 - (i + .5) / K * 2, rad = Math.sqrt(1 - y * y), th = i * 2.399963;
      centers.push([Math.cos(th) * rad * 1.7, y * 1.5, Math.sin(th) * rad * 1.7]);
    }
    const links = [];
    centers.forEach((c, i) => {
      const near = centers.map((d, j) => [j, Math.hypot(c[0] - d[0], c[1] - d[1], c[2] - d[2])]).filter(x => x[0] !== i).sort((a, b) => a[1] - b[1]).slice(0, 2);
      near.forEach(([j]) => links.push([c, centers[j]]));
    });
    return fill(n, [
      [.52, (r) => { const c = centers[Math.floor(r() * K)]; return [c[0] + gauss(r) * .2, c[1] + gauss(r) * .2, c[2] + gauss(r) * .2]; }],
      [.30, (r) => { const l = links[Math.floor(r() * links.length)]; return onSegment(r, l[0], l[1], .01); }],
      [.18, (r) => { const u = r() * 2 - 1, th = r() * Math.PI * 2, s = Math.sqrt(1 - u * u), rad = 2.5 * Math.cbrt(r()); return [Math.cos(th) * s * rad, u * rad, Math.sin(th) * s * rad]; }]
    ], r);
  },

  galaxy(n, r) {
    return fill(n, [
      [.82, (r) => {
        const arm = Math.floor(r() * 3), rad = Math.pow(r(), .65) * 2.7;
        const a = arm * Math.PI * 2 / 3 + rad * 2.1 + gauss(r) * .28 / (rad + .35);
        return rotX([Math.cos(a) * rad, gauss(r) * .07 * (1.4 - rad / 2.7), Math.sin(a) * rad], 1.08);
      }],
      [.18, (r) => rotX([gauss(r) * .28, gauss(r) * .14, gauss(r) * .28], 1.08)]
    ], r);
  },

  bangladesh(n, r) {
    const M = window.BD_MAP;
    if (!M || typeof Path2D === 'undefined' || typeof document === 'undefined') return SHAPES.sphere(n, r);
    const sc = .5, W = Math.round(M.w * sc), H = Math.round(M.h * sc);
    const sample = (draw) => {
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const g = c.getContext('2d'); g.scale(sc, sc); draw(g);
      const d = g.getImageData(0, 0, W, H).data, pts = [];
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 128) pts.push([x, y]);
      return pts;
    };
    const area = sample(g => { g.fillStyle = '#fff'; M.divisions.forEach(dv => g.fill(new Path2D(dv.d))); });
    const lines = sample(g => { g.strokeStyle = '#fff'; g.lineWidth = 2.2; M.districts.forEach(ds => g.stroke(new Path2D(ds.d))); });
    if (!area.length) return SHAPES.sphere(n, r);
    const Hs = 3.7, Ws = Hs * W / H;
    const toWorld = ([x, y], z) => [(x / W - .5) * Ws + (r() - .5) * Ws / W, -(y / H - .5) * Hs + (r() - .5) * Hs / H, z];
    return fill(n, [
      [.55, (r) => toWorld(area[Math.floor(r() * area.length)], gauss(r) * .05)],
      [.45, (r) => toWorld((lines.length ? lines : area)[Math.floor(r() * (lines.length || area.length))], .02)]
    ], r);
  }
};

/* ---------------- shaders ---------------- */
const VERT = /* glsl */`
  attribute float aSeed;
  uniform float uTime, uSize, uPulse, uPR, uMouseK, uAspect, uDrift;
  uniform vec2 uMouse;
  varying float vSeed; varying float vDepth;
  void main() {
    vec3 p = position;
    float t = uTime * .6 + aSeed * 6.2831;
    p += vec3(sin(t * 1.3), cos(t * 1.1), sin(t * .9)) * .02 * uDrift;
    float ang = atan(p.y, p.x);
    float rr = length(p.xy);
    p *= 1. + uPulse * (.07 * sin(uTime * 5. + ang * 6. + aSeed * 3.) * smoothstep(1.3, 1.6, rr) + .025 * sin(uTime * 2.2 + rr * 4.));
    vec4 mv = modelViewMatrix * vec4(p, 1.);
    vec4 clip = projectionMatrix * mv;
    vec2 ndc = clip.xy / clip.w;
    vec2 d = ndc - uMouse; d.x *= uAspect;
    float dist = length(d);
    float f = smoothstep(.32, .0, dist) * uMouseK;
    vec2 push = normalize(d + 1e-5) * f * .11; push.x /= uAspect;
    clip.xy = (ndc + push) * clip.w;
    gl_Position = clip;
    gl_PointSize = uSize * (.55 + .9 * fract(aSeed * 13.7)) * uPR * (6. / -mv.z);
    vSeed = aSeed; vDepth = -mv.z;
  }`;
const FRAG = /* glsl */`
  uniform vec3 uA, uB; uniform float uOpacity, uLight;
  varying float vSeed; varying float vDepth;
  void main() {
    vec2 c = gl_PointCoord - .5;
    float d = length(c);
    if (d > .5) discard;
    float a = pow(smoothstep(.5, .0, d), 1.35);
    vec3 col = mix(uA, uB, fract(vSeed * 7.31));
    col += smoothstep(.2, .0, d) * .8 * (1. - uLight);
    float fade = smoothstep(11., 4.5, vDepth);
    gl_FragColor = vec4(col, a * uOpacity * (.5 + .5 * fade) * (1. + uLight * .5));
  }`;

/* ---------------- swarm ---------------- */
export function createSwarm(canvas, opts = {}) {
  const mobile = !!opts.mobile, reduced = !!opts.reduced;
  const N = mobile ? 2300 : 4800;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'high-performance' });
  if (!renderer.getContext()) throw new Error('no webgl');
  const pr = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 1.75);
  renderer.setPixelRatio(pr);
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, .1, 100);
  camera.position.z = 6.2;
  const group = new THREE.Group();
  scene.add(group);

  const r0 = rng(7);
  const pos = new Float32Array(N * 3), seed = new Float32Array(N), speed = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const u = r0() * 2 - 1, th = r0() * Math.PI * 2, s = Math.sqrt(1 - u * u), rad = 6 + r0() * 4;
    pos[i * 3] = Math.cos(th) * s * rad; pos[i * 3 + 1] = u * rad; pos[i * 3 + 2] = Math.sin(th) * s * rad;
    seed[i] = r0(); speed[i] = .55 + r0() * .9;
  }
  const geo = new THREE.BufferGeometry();
  const posAttr = new THREE.BufferAttribute(pos, 3); posAttr.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('position', posAttr);
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));

  const U = {
    uTime: { value: 0 }, uSize: { value: mobile ? 3.2 : 3.4 }, uPulse: { value: 0 }, uPR: { value: pr },
    uMouse: { value: new THREE.Vector2(9, 9) }, uMouseK: { value: 0 }, uAspect: { value: 1 }, uDrift: { value: reduced ? 0 : 1 },
    uA: { value: new THREE.Color('#3df2ff') }, uB: { value: new THREE.Color('#8b5cff') }, uOpacity: { value: 0 }, uLight: { value: 0 }
  };
  const mat = new THREE.ShaderMaterial({ uniforms: U, vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  group.add(points);

  /* shape cache: generated on first use, shuffled for organic morphs */
  const cache = {};
  function shape(name) {
    if (cache[name]) return cache[name];
    const r = rng(name.length * 977 + name.charCodeAt(0));
    const pts = (SHAPES[name] || SHAPES.sphere)(N, r);
    for (let i = pts.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [pts[i], pts[j]] = [pts[j], pts[i]]; }
    const arr = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { const p = pts[i] || pts[i % pts.length]; arr[i * 3] = p[0]; arr[i * 3 + 1] = p[1]; arr[i * 3 + 2] = p[2]; }
    return (cache[name] = arr);
  }

  /* state */
  let light = false;
  let target = shape('sphere');
  const cur = { x: 0, y: 0, s: 1, o: 0, pulse: 0 };
  let goal = { x: 0, y: 0, s: 1, o: 1, pulse: 0, spin: .12, sway: false };
  const colA = new THREE.Color(), colB = new THREE.Color();
  const dark = new THREE.Color('#0b0e1d');
  let rotY = 0, kick = 0;
  const mouse = { x: 9, y: 9, k: 0, tx: 0, ty: 0, last: 0 };

  function tint(hex) {
    const c = new THREE.Color(hex);
    return light ? c.lerp(dark, .45) : c;
  }

  function setState(name, o = {}) {
    const st = STATES[name] || STATES.hero;
    target = shape(st.shape);
    const isMobile = mobile || window.innerWidth < 900;
    goal = {
      x: isMobile ? 0 : st.x,
      y: isMobile ? (o.dim ? 0 : (st.my != null ? st.my : .32)) : 0,
      s: (o.dim ? 1.12 : st.s) * (isMobile ? (st.ms || .78) : 1),
      o: (o.dim ? .2 : st.o) * (isMobile ? (o.dim ? .8 : .7) : 1),
      pulse: st.pulse || 0,
      spin: st.spin || 0,
      sway: !!st.sway
    };
    colA.copy(tint(st.a)); colB.copy(tint(st.b));
    if (reduced) snap();
  }
  function snap() {
    pos.set(target); posAttr.needsUpdate = true;
    Object.assign(cur, { x: goal.x, y: goal.y, s: goal.s, o: goal.o, pulse: 0 });
    U.uA.value.copy(colA); U.uB.value.copy(colB);
  }

  function setTheme(isLight) {
    light = isLight;
    mat.blending = isLight ? THREE.NormalBlending : THREE.AdditiveBlending;
    mat.needsUpdate = true;
    U.uLight.value = isLight ? 1 : 0;
  }

  /* size */
  let vw = 0, vh = 0;
  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    // ignore small height changes from mobile URL bars
    if (w === vw && Math.abs(h - vh) < 120) return;
    vw = w; vh = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    U.uAspect.value = w / h;
  }
  resize();
  window.addEventListener('resize', resize);

  if (!mobile && !reduced) {
    window.addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse') return;
      mouse.x = e.clientX / window.innerWidth * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight * 2 - 1);
      mouse.last = performance.now();
    }, { passive: true });
    document.addEventListener('pointerleave', () => { mouse.last = 0; });
  }

  /* loop */
  const clock = new THREE.Clock();
  let running = true;
  function frame() {
    if (!running) return;
    requestAnimationFrame(frame);
    if (document.hidden) return;
    const dt = Math.min(clock.getDelta(), .05);
    const t = clock.elapsedTime;
    U.uTime.value = t;

    // particles ease towards the target, each at its own speed
    if (!reduced) {
      const base = 1 - Math.pow(1 - .05, dt * 60);
      for (let i = 0; i < N * 3; i += 3) {
        const k = base * speed[i / 3];
        pos[i] += (target[i] - pos[i]) * k;
        pos[i + 1] += (target[i + 1] - pos[i + 1]) * k;
        pos[i + 2] += (target[i + 2] - pos[i + 2]) * k;
      }
      posAttr.needsUpdate = true;
    }

    const e = reduced ? 1 : 1 - Math.pow(1 - .045, dt * 60);
    cur.x += (goal.x - cur.x) * e; cur.y += (goal.y - cur.y) * e;
    cur.s += (goal.s - cur.s) * e; cur.o += (goal.o - cur.o) * e;
    cur.pulse += (goal.pulse - cur.pulse) * e;
    U.uA.value.lerp(colA, e); U.uB.value.lerp(colB, e);
    U.uOpacity.value = cur.o;
    U.uPulse.value = reduced ? 0 : cur.pulse;

    const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
    const halfW = halfH * camera.aspect;
    group.position.set(cur.x * halfW, cur.y * halfH, 0);
    group.scale.setScalar(cur.s * Math.min(1, camera.aspect / .9 + .25));

    // mouse: parallax tilt + local push
    const active = mouse.last && performance.now() - mouse.last < 2500;
    mouse.k += ((active ? 1 : 0) - mouse.k) * .05;
    U.uMouseK.value = mouse.k;
    U.uMouse.value.set(mouse.x, mouse.y);
    mouse.tx += ((active ? mouse.y * .18 : 0) - mouse.tx) * .04;
    mouse.ty += ((active ? mouse.x * .25 : 0) - mouse.ty) * .04;

    if (!reduced) {
      kick *= Math.pow(.92, dt * 60);
      if (goal.sway) {
        // flat shapes rock gently instead of turning edge-on
        let wrapped = ((rotY + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
        const want = Math.sin(t * .35) * .32;
        wrapped += (want - wrapped) * e;
        rotY = wrapped;
      } else {
        rotY += dt * (goal.spin + kick);
      }
    }
    group.rotation.set(mouse.tx + (goal.sway ? Math.sin(t * .27) * .08 : .12), rotY + mouse.ty, 0);
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);

  return {
    setState,
    setTheme,
    kick(v) { kick = Math.min(1.2, kick + Math.abs(v) * .002); },
    destroy() { running = false; renderer.dispose(); },
    states: STATES
  };
}
