'use strict';
/* AS SOMBRAS DE ELDORIA — RPG de ação 2D em Canvas puro */
(() => {
const TS = 32, VW = 640, VH = 480;
const cv = document.getElementById('game'), ctx = cv.getContext('2d');
cv.width = VW; cv.height = VH; ctx.imageSmoothingEnabled = false;
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);
const rint = (a, b) => Math.floor(rnd(a, b + 1));
const dst = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/* ---------------- ÁUDIO ---------------- */
let AC = null;
const SND = { sword: [320, 110, .09, 'square'], hit: [170, 60, .1, 'sawtooth'], hurt: [220, 50, .22, 'sawtooth'], coin: [800, 1500, .1, 'square'],
  magic: [500, 1000, .16, 'sine'], lvl: [400, 1100, .4, 'triangle'], win: [300, 1000, .9, 'triangle'], dodge: [260, 420, .08, 'sine'],
  pick: [600, 950, .14, 'triangle'], die: [220, 40, .3, 'square'], boom: [120, 30, .4, 'sawtooth'] };
function snd(n) {
  try {
    if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)();
    const s = SND[n], t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain();
    o.type = s[3]; o.frequency.setValueAtTime(s[0], t); o.frequency.exponentialRampToValueAtTime(s[1], t + s[2]);
    g.gain.setValueAtTime(.05, t); g.gain.exponentialRampToValueAtTime(.001, t + s[2]);
    o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + s[2] + .02);
  } catch (e) {}
}

/* ---------------- SPRITES (pixel art 10x10) ---------------- */
const SPR = {
  player: ["...hhhh...", "..hhhhhh..", "..hsssshh.", "..sKsKss..", "..ssssss..", "..gggggg..", ".sggyyggs.", ".sggggggs.", "..gg..gg..", "..bb..bb.."],
  goblin: ["..G....G..", ".GGGGGGGG.", ".GrGGGGrG.", ".GGGwwGGG.", "..GGGGGG..", "..bbbbbb..", ".GbbbbbbG.", "..bb..bb..", "..bb..bb..", "..dd..dd.."],
  skeleton: ["..wwwwww..", ".wwwwwwww.", ".wkkwwkkw.", ".wkkwwkkw.", "..wwkkww..", "..wwwwww..", ".wwwwwwww.", "..w.ww.w..", "..w....w..", ".ww....ww."],
  troll: [".PPPPPPPP.", "PPPPPPPPPP", "PPrPPPPrPP", "PPPPwwPPPP", ".PPPPPPPP.", "PPddddddPP", "PPddddddPP", "PPddddddPP", ".PP....PP.", ".dd....dd."],
  mage: ["...vvvv...", "..vvvvvv..", ".vvkkkkvv.", ".vvkyykvv.", ".vvvvvvvv.", "vvvvvvvvvv", "vvvvvvvvvv", ".vvvvvvvv.", ".vvvvvvvv.", "..vvvvvv.."],
  demon: ["w........w", "wR......Rw", ".RRRRRRRR.", ".RyRRRRyR.", ".RRRRRRRR.", "..RwRRwR..", ".RRRRRRRR.", "RR.RRRR.RR", "..RR..RR..", "..kk..kk.."],
  chest: [".bbbbbbbb.", "bBBBBBBBBb", "bBBBBBBBBb", "bbbbbbbbbb", "bbbbyybbbb", "bBBByyBBBb", "bBBBBBBBBb", "bbbbbbbbbb"],
  chestO: [".bbbbbbbb.", "bkkkkkkkkb", "bkyykyykkb", "bbbbbbbbbb", "bBBByyBBBb", "bBBBBBBBBb", "bBBBBBBBBb", "bbbbbbbbbb"],
};
const PAL0 = { h: '#6b3f1d', s: '#f1c27d', K: '#1b1b1b', g: '#3aa655', y: '#f2c94c', b: '#4a2e14', B: '#b9791f', G: '#6fbf3b', r: '#e03030', w: '#f4f4f0', d: '#3b2a4a', k: '#1c1c22', P: '#7a5aa6', v: '#4b2f7a', R: '#c0392b' };
const mkPal = (id, o) => Object.assign({ id }, PAL0, o);
const PAL = mkPal('base', {});
const PALS = { guard: mkPal('guard', { P: '#4f8a3c', d: '#2b4a22', r: '#ffd23a', w: '#d8e8a0' }), baph: mkPal('baph', { R: '#3b1457', y: '#ff2a2a', w: '#e8dcc0', k: '#05000a' }),
  n1: mkPal('n1', { g: '#2f6fd6', h: '#cfcfcf' }), n2: mkPal('n2', { g: '#d6a02f', h: '#2a1a0a' }), n3: mkPal('n3', { g: '#c0457a', h: '#e8b84a', s: '#f4d6b0' }),
  n4: mkPal('n4', { g: '#4aa86a', h: '#6fe0a0', s: '#d8f4d0', y: '#ffffff' }), n5: mkPal('n5', { g: '#8a5a2a', h: '#a04020', s: '#e8b080' }), n6: mkPal('n6', { g: '#b06aff', h: '#fff2a0', s: '#ffe8d0' }) };
const sprCache = {};
function getSpr(name, pal, sc, flash) {
  const key = name + '|' + pal.id + '|' + sc + '|' + (flash ? 1 : 0);
  if (sprCache[key]) return sprCache[key];
  const rows = SPR[name], c = document.createElement('canvas'); c.width = rows[0].length * sc; c.height = rows.length * sc;
  const x = c.getContext('2d');
  rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) { const ch = r[i]; if (ch === '.') continue; x.fillStyle = flash ? '#fff' : (pal[ch] || '#f0f'); x.fillRect(i * sc, j * sc, sc, sc); } });
  return sprCache[key] = c;
}
function drawSpr(name, pal, sc, cx, cy, flip, flash, bob) {
  const c = getSpr(name, pal, sc, flash);
  ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(Math.round(cx), Math.round(cy + c.height / 2 - 1), c.width * .4, c.height * .12, 0, 0, 7); ctx.fill();
  ctx.save(); ctx.translate(Math.round(cx), Math.round(cy + (bob || 0))); if (flip) ctx.scale(-1, 1); ctx.drawImage(c, -c.width / 2, -c.height / 2); ctx.restore();
}

/* ---------------- DADOS ---------------- */
const EN = {
  goblin: { n: 'Goblin', hp: 6, sp: 90, dmg: 1, xp: 6, c: [1, 3], hw: 10, sc: 3, spr: 'goblin', pal: PAL, ag: 6 },
  skeleton: { n: 'Esqueleto', hp: 11, sp: 58, dmg: 2, xp: 10, c: [2, 5], hw: 10, sc: 3, spr: 'skeleton', pal: PAL, ag: 6 },
  troll: { n: 'Troll', hp: 30, sp: 36, dmg: 3, xp: 26, c: [6, 12], hw: 15, sc: 4, spr: 'troll', pal: PAL, ag: 5 },
  mage: { n: 'Mago', hp: 8, sp: 55, dmg: 2, xp: 15, c: [3, 7], hw: 10, sc: 3, spr: 'mage', pal: PAL, ag: 8, ranged: 1 },
  demon: { n: 'Demônio', hp: 18, sp: 96, dmg: 3, xp: 22, c: [4, 9], hw: 11, sc: 3, spr: 'demon', pal: PAL, ag: 7 },
  guardian: { n: 'Guardião Corrompido', hp: 90, sp: 70, dmg: 3, xp: 120, c: [40, 40], hw: 24, sc: 6, spr: 'troll', pal: PALS.guard, ag: 7, boss: 1 },
  baphome: { n: 'Baphome, Senhor das Trevas', hp: 240, sp: 34, dmg: 4, xp: 500, c: [0, 0], hw: 36, sc: 10, spr: 'demon', pal: PALS.baph, ag: 8, boss: 1 },
};
const CRY_COL = ['#4ade80', '#fbbf24', '#60a5fa', '#f472b6'];
const CRY_NAME = ['da Floresta', 'das Minas', 'Oculto', 'do Castelo'];
const CR = [{ a: 1, tx: 43, ty: 26, need: 'boss1' }, { a: 2, tx: 42, ty: 5 }, { a: 2, tx: 7, ty: 26 }, { a: 3, tx: 20, ty: 14 }];
const AREA_NAMES = ['Vila dos Pequenos', 'Floresta das Fadas', 'Minas dos Gnomos', 'Castelo das Sombras'];

/* ---------------- MAPAS ---------------- */
function newMap(w, h, fill) { return { w, h, t: new Uint8Array(w * h).fill(fill) }; }
function setR(m, x, y, w, h, v) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (i >= 0 && j >= 0 && i < m.w && j < m.h) m.t[j * m.w + i] = v; }
function border(m, v) { setR(m, 0, 0, m.w, 1, v); setR(m, 0, m.h - 1, m.w, 1, v); setR(m, 0, 0, 1, m.h, v); setR(m, m.w - 1, 0, 1, m.h, v); }
function clearTrees(m, tx, ty, r) { for (let j = ty - r; j <= ty + r; j++) for (let i = tx - r; i <= tx + r; i++) if (i > 0 && j > 0 && i < m.w - 1 && j < m.h - 1 && m.t[j * m.w + i] === 1) m.t[j * m.w + i] = 0; }
const tileAt = (m, x, y) => (x < 0 || y < 0 || x >= m.w || y >= m.h) ? 1 : m.t[y * m.w + x];
function mkEnemy(type, tx, ty, ai) {
  const d = EN[type]; const hp = Math.round(d.hp * (1 + .25 * (ai || 0)));
  return { type, x: (tx + .5) * TS, y: (ty + .5) * TS, hw: d.hw, hh: d.hw, hp, maxhp: hp, dmg: d.dmg + Math.floor((ai || 0) / 2), kx: 0, ky: 0, hurt: 0, cd: rnd(0, 1.5), t: Math.random() * 6, face: 1, alert: false, st: '', sT: 0, pi: -1, hit: 0 };
}
function scatter(a, m, R, type, n, x0, y0, x1, y1, avoid) {
  let tries = 0;
  while (n > 0 && tries++ < 4000) {
    const tx = x0 + Math.floor(R() * (x1 - x0)), ty = y0 + Math.floor(R() * (y1 - y0)), v = tileAt(m, tx, ty);
    if ((v === 0 || v === 3) && (!avoid || dst(tx, ty, avoid[0], avoid[1]) > 9)) { a.enemies.push(mkEnemy(type, tx, ty, a.ai)); n--; }
  }
}
function buildAreas() {
  const A = [];
  /* 0 — VILA */
  { const m = newMap(40, 28, 0), R = mulberry(11);
    for (let i = 0; i < m.t.length; i++) if (R() < .05) m.t[i] = 1;
    setR(m, 0, 12, 40, 2, 3); setR(m, 19, 8, 2, 20, 3);
    const houses = [[3, 3, 7, 5], [12, 3, 7, 5], [26, 3, 7, 5]];
    houses.forEach(h => setR(m, h[0], h[1], h[2], h[3], 5));
    setR(m, 22, 18, 8, 6, 2); setR(m, 22, 20, 8, 2, 4);
    border(m, 1);
    [[8, 10], [15, 10], [31, 10], [14, 21], [5, 22], [34, 22], [36, 3], [20, 12]].forEach(p => clearTrees(m, p[0], p[1], 1));
    A.push({ ai: 0, name: AREA_NAMES[0], th: 'grass', m, houses, enemies: [], portals: [{ x: 38, y: 12, w: 1, h: 2, to: 1, tx: 4, ty: 16 }],
      npcs: [{ id: 'orin', n: 'Ancião Orin', tx: 8, ty: 10, pal: PALS.n1 }, { id: 'pip', n: 'Pip, a Mercadora', tx: 15, ty: 10, pal: PALS.n3 },
        { id: 'bob', n: 'Fazendeiro Bob', tx: 31, ty: 10, pal: PALS.n5 }, { id: 'lyra', n: 'Lyra, a Elfa', tx: 14, ty: 21, pal: PALS.n4 }],
      chests: [{ id: 'v1', tx: 5, ty: 22, k: 'coins', v: 25 }, { id: 'v2', tx: 34, ty: 22, k: 'potion', v: 2 }, { id: 'v3', tx: 36, ty: 3, k: 'coins', v: 40 }] });
  }
  /* 1 — FLORESTA */
  { const m = newMap(50, 34, 0), R = mulberry(7);
    for (let i = 0; i < m.t.length; i++) if (R() < .17) m.t[i] = 1;
    setR(m, 1, 14, 48, 5, 0); setR(m, 10, 3, 3, 28, 0); setR(m, 24, 3, 3, 28, 0); setR(m, 36, 6, 3, 22, 0);
    setR(m, 17, 8, 6, 5, 0); setR(m, 28, 20, 6, 6, 0); setR(m, 38, 22, 11, 10, 0);
    setR(m, 14, 26, 5, 5, 1); setR(m, 15, 27, 3, 3, 0); setR(m, 13, 28, 2, 1, 0);
    border(m, 1);
    [[24, 5], [36, 8], [6, 16]].forEach(p => clearTrees(m, p[0], p[1], 1));
    const a = { ai: 1, name: AREA_NAMES[1], th: 'forest', m, houses: [], enemies: [],
      portals: [{ x: 1, y: 15, w: 1, h: 4, to: 0, tx: 36, ty: 12 }, { x: 48, y: 25, w: 1, h: 4, to: 2, tx: 4, ty: 15, req: 'boss1', msg: 'Uma barreira de espinhos bloqueia o caminho. Derrote o Guardião!' }],
      npcs: [{ id: 'fila', n: 'Fila, a Fada', tx: 6, ty: 16, pal: PALS.n6 }],
      chests: [{ id: 'f1', tx: 16, ty: 28, k: 'coins', v: 80 }, { id: 'f2', tx: 24, ty: 5, k: 'potion', v: 1 }, { id: 'f3', tx: 36, ty: 8, k: 'coins', v: 30 }] };
    scatter(a, m, R, 'goblin', 9, 6, 3, 46, 31, [4, 16]); scatter(a, m, R, 'skeleton', 3, 14, 3, 46, 31, [4, 16]); scatter(a, m, R, 'mage', 3, 20, 3, 36, 31, [4, 16]);
    if (!window.__F || !window.__F.boss1) a.enemies.push(mkEnemy('guardian', 43, 26, 1));
    A.push(a);
  }
  /* 2 — MINAS */
  { const m = newMap(46, 32, 1), R = mulberry(5);
    [[1, 12, 7, 8], [8, 14, 6, 3], [14, 9, 9, 11], [23, 13, 5, 3], [28, 5, 8, 11], [36, 9, 4, 3], [40, 3, 5, 15], [41, 18, 3, 6], [36, 24, 9, 7]].forEach(r => setR(m, r[0], r[1], r[2], r[3], 0));
    setR(m, 24, 13, 2, 3, 6);
    [[17, 12], [20, 12], [17, 16], [20, 16], [31, 8], [31, 12], [38, 26], [42, 28]].forEach(p => setR(m, p[0], p[1], 1, 1, 1));
    setR(m, 17, 20, 1, 1, 9); setR(m, 17, 21, 1, 7, 0); setR(m, 12, 27, 6, 1, 0); setR(m, 4, 24, 8, 6, 0);
    const a = { ai: 2, name: AREA_NAMES[2], th: 'mine', m, houses: [], enemies: [],
      portals: [{ x: 1, y: 14, w: 1, h: 4, to: 1, tx: 45, ty: 27 }, { x: 40, y: 30, w: 3, h: 1, to: 3, tx: 3, ty: 31, req: 'c2', msg: 'Um desabamento bloqueia a saída. Encontre o Cristal das Minas!' }],
      npcs: [{ id: 'torb', n: 'Torb, o Gnomo', tx: 5, ty: 13, pal: PALS.n2 }],
      chests: [{ id: 'm1', tx: 15, ty: 10, k: 'potion', v: 2 }, { id: 'm2', tx: 34, ty: 6, k: 'coins', v: 50 }, { id: 'm3', tx: 44, ty: 16, k: 'atk', v: 1 },
        { id: 'm4', tx: 37, ty: 26, k: 'coins', v: 40 }, { id: 'm5', tx: 10, ty: 25, k: 'maxhp', v: 2 }] };
    [[16, 12, 'goblin'], [21, 15, 'goblin'], [19, 10, 'skeleton'], [20, 18, 'skeleton'], [30, 8, 'troll'], [33, 12, 'troll'], [32, 14, 'mage'], [42, 8, 'troll'], [42, 12, 'troll'], [43, 5, 'mage'],
      [38, 27, 'skeleton'], [41, 26, 'skeleton'], [43, 28, 'demon']].forEach(e => a.enemies.push(mkEnemy(e[2], e[0], e[1], 2)));
    A.push(a);
  }
  /* 3 — CASTELO */
  { const m = newMap(40, 36, 1);
    [[8, 1, 24, 9], [12, 12, 16, 6], [18, 18, 4, 3], [12, 21, 16, 9], [7, 25, 5, 3], [1, 22, 6, 13]].forEach(r => setR(m, r[0], r[1], r[2], r[3], 0));
    setR(m, 18, 10, 4, 2, 7);
    [[10, 3], [10, 7], [29, 3], [29, 7], [15, 24], [24, 24], [15, 28], [24, 28], [14, 14], [25, 14]].forEach(p => setR(m, p[0], p[1], 1, 1, 1));
    const a = { ai: 3, name: AREA_NAMES[3], th: 'castle', m, houses: [], enemies: [],
      portals: [{ x: 2, y: 34, w: 3, h: 1, to: 2, tx: 41, ty: 27 }], npcs: [],
      chests: [{ id: 'k1', tx: 13, ty: 22, k: 'potion', v: 2 }, { id: 'k2', tx: 13, ty: 13, k: 'coins', v: 100 }, { id: 'k3', tx: 26, ty: 22, k: 'maxhp', v: 2 }] };
    [[3, 26, 'skeleton'], [4, 30, 'skeleton'], [14, 23, 'demon'], [20, 24, 'demon'], [24, 27, 'demon'], [18, 22, 'skeleton'], [22, 28, 'mage'], [15, 14, 'troll'], [24, 15, 'troll'], [18, 13, 'mage'], [22, 16, 'mage'], [18, 15, 'demon']]
      .forEach(e => a.enemies.push(mkEnemy(e[2], e[0], e[1], 3)));
    if (!window.__F || !window.__F.win) a.enemies.push(mkEnemy('baphome', 20, 4, 3));
    A.push(a);
  }
  return A;
}

/* ---------------- RENDER DO MAPA (cache) ---------------- */
const FLOOR = { grass: ['#3f9142', '#3a8a3e', '#2f7a33'], forest: ['#2e6b3d', '#2a6337', '#1f5430'], mine: ['#4b4560', '#443e58', '#37324a'], castle: ['#3d3050', '#352a46', '#2a2038'] };
function hash(x, y) { return ((x * 73856093) ^ (y * 19349663)) >>> 0; }
function paintFloor(c, x, y, th, h, tx, ty) {
  const f = FLOOR[th]; c.fillStyle = f[h & 1]; c.fillRect(x, y, TS, TS); c.fillStyle = f[2];
  for (let k = 0; k < 4; k++) c.fillRect(x + ((h >> (k * 5)) & 31), y + ((h >> (k * 5 + 2)) & 31), 2, 2);
  if (th === 'grass' || th === 'forest') {
    if (h % 9 === 0) { c.fillStyle = '#5fb85a'; c.fillRect(x + 8, y + 12, 2, 5); c.fillRect(x + 11, y + 14, 2, 4); }
    if (h % 17 === 0) { c.fillStyle = ['#ffe34a', '#ff7ab8', '#fff', '#9ad0ff'][h % 4]; c.fillRect(x + 14, y + 14, 4, 4); c.fillStyle = '#ffb000'; c.fillRect(x + 15, y + 15, 2, 2); }
  } else { if (((tx + ty) & 1) === 0) { c.fillStyle = 'rgba(255,255,255,.04)'; c.fillRect(x, y, TS, TS); } c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(x, y + TS - 1, TS, 1); c.fillRect(x + TS - 1, y, 1, TS); }
}
function paintTile(c, x, y, v, th, tx, ty) {
  const h = hash(tx, ty);
  const grassy = th === 'grass' || th === 'forest';
  if (v === 1 && grassy) {
    paintFloor(c, x, y, th, h, tx, ty);
    c.fillStyle = '#5b3a1a'; c.fillRect(x + 13, y + 18, 7, 14); c.fillStyle = '#1f5a2a'; c.fillRect(x + 2, y + 3, 28, 20); c.fillRect(x + 5, y, 22, 4);
    c.fillStyle = '#2f7d37'; c.fillRect(x + 4, y + 4, 24, 16); c.fillStyle = '#4aa84a'; c.fillRect(x + 8, y + 6, 9, 5); c.fillRect(x + 20, y + 12, 5, 4);
    if (h % 7 === 0) { c.fillStyle = '#e03030'; c.fillRect(x + 22, y + 8, 3, 3); }
  } else if (v === 1 || v === 9 || v === 5) {
    if (v === 5) { c.fillStyle = '#d9c7a0'; c.fillRect(x, y, TS, TS); return; }
    c.fillStyle = th === 'castle' ? '#241a33' : '#2c2838'; c.fillRect(x, y, TS, TS);
    c.fillStyle = th === 'castle' ? '#3a2b52' : '#4a4560'; c.fillRect(x, y, TS, 5); c.fillStyle = '#15111d'; c.fillRect(x, y + 15, TS, 1); c.fillRect(x + ((ty & 1) ? 8 : 20), y + 5, 1, 10); c.fillRect(x + ((ty & 1) ? 22 : 10), y + 16, 1, 16);
    if (v === 9) { c.fillStyle = '#0c0912'; c.fillRect(x + 12, y + 4, 2, 10); c.fillRect(x + 14, y + 12, 5, 2); c.fillRect(x + 18, y + 14, 2, 10); c.fillRect(x + 9, y + 18, 5, 2); c.fillStyle = '#7a6aa8'; c.fillRect(x + 6, y + 8, 2, 2); }
  } else if (v === 2) {
    c.fillStyle = '#2a64c8'; c.fillRect(x, y, TS, TS); c.fillStyle = '#5b94e8'; c.fillRect(x + (h & 15), y + 6, 10, 2); c.fillRect(x + ((h >> 4) & 15), y + 20, 8, 2); c.fillStyle = '#1b4aa0'; c.fillRect(x, y + 28, TS, 4);
  } else if (v === 3) {
    c.fillStyle = '#c8a56a'; c.fillRect(x, y, TS, TS); c.fillStyle = '#b38f55'; for (let k = 0; k < 5; k++) c.fillRect(x + ((h >> (k * 5)) & 29), y + ((h >> (k * 5 + 2)) & 29), 3, 2);
  } else if (v === 4) {
    c.fillStyle = '#8b5a2b'; c.fillRect(x, y, TS, TS); c.fillStyle = '#5f3a18'; for (let k = 0; k < 4; k++) c.fillRect(x + k * 8, y, 1, TS); c.fillRect(x, y, TS, 2); c.fillRect(x, y + 30, TS, 2);
  } else if (v === 6) {
    paintFloor(c, x, y, th, h, tx, ty); c.fillStyle = '#9aa0b0';
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { const bx = x + 4 + i * 14, by = y + 4 + j * 14; c.beginPath(); c.moveTo(bx, by + 10); c.lineTo(bx + 5, by); c.lineTo(bx + 10, by + 10); c.fill(); }
    c.fillStyle = '#d8dcea'; for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) c.fillRect(x + 8 + i * 14, y + 6 + j * 14, 2, 3);
  } else if (v === 7) {
    c.fillStyle = '#1a0a2a'; c.fillRect(x, y, TS, TS); c.fillStyle = '#7a2cd6'; c.fillRect(x + 2, y + 2, TS - 4, TS - 4); c.fillStyle = '#2a0f3f'; c.fillRect(x + 5, y + 5, TS - 10, TS - 10);
    c.fillStyle = '#d8a6ff'; c.fillRect(x + 14, y + 8, 4, 16); c.fillRect(x + 9, y + 13, 14, 3);
  } else paintFloor(c, x, y, th, h, tx, ty);
}
function buildCache(a) {
  const m = a.m, cvs = a.cache || (a.cache = document.createElement('canvas')); cvs.width = m.w * TS; cvs.height = m.h * TS; const c = cvs.getContext('2d');
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) paintTile(c, x * TS, y * TS, m.t[y * m.w + x], a.th, x, y);
  a.houses.forEach((hs, i) => {
    const [hx, hy, w, h] = hs, X = hx * TS, Y = hy * TS;
    c.fillStyle = '#000'; c.fillRect(X - 2, Y + 2 * TS - 2, w * TS + 4, (h - 2) * TS + 4);
    c.fillStyle = '#e8d7ac'; c.fillRect(X, Y + 2 * TS, w * TS, (h - 2) * TS); c.fillStyle = '#c9b585'; c.fillRect(X, Y + 2 * TS, w * TS, 4);
    c.fillStyle = '#b5452f'; c.fillRect(X - 6, Y, w * TS + 12, 2.4 * TS); c.fillStyle = '#8a2f1f'; for (let k = 0; k < 6; k++) c.fillRect(X - 6, Y + k * 13 + 10, w * TS + 12, 2);
    c.fillStyle = '#d65a3f'; c.fillRect(X - 6, Y, w * TS + 12, 4);
    c.fillStyle = '#5a3414'; c.fillRect(X + w * TS / 2 - 14, Y + h * TS - 44, 28, 44); c.fillStyle = '#ffd86b'; c.fillRect(X + w * TS / 2 + 6, Y + h * TS - 22, 3, 3);
    c.fillStyle = '#7fd0ff'; c.fillRect(X + 18, Y + 2.6 * TS, 22, 22); c.fillRect(X + w * TS - 40, Y + 2.6 * TS, 22, 22); c.fillStyle = '#5a3414'; c.fillRect(X + 28, Y + 2.6 * TS, 2, 22);
    if (i === 1) { c.fillStyle = '#5a3414'; c.fillRect(X + w * TS / 2 - 26, Y + 2.1 * TS - 2, 52, 18); c.fillStyle = '#ffd86b'; c.font = 'bold 12px monospace'; c.textAlign = 'center'; c.fillText('LOJA', X + w * TS / 2, Y + 2.1 * TS + 11); }
  });
  a.dirty = false;
}

/* ---------------- ESTADO ---------------- */
let state = 'title', areas = [], AI = 0, M, enemies = [], P, F, Q;
let projs = [], parts = [], floats = [], pickups = [], toasts = [], banner = null, shake = 0, fade = 0, gt = 0, hitstop = 0, portalCd = 0, wallToastCd = 0, saveTimer = 0, winT = 0;
let dlg = null, shop = null, cam = { x: 0, y: 0 };
const keys = {}, pr = {};
const xpNeed = l => 20 + l * 15;
function mkPlayer() { return { x: 0, y: 0, hw: 10, hh: 10, face: 'down', fx: 0, fy: 1, hp: 12, maxhp: 12, mp: 20, maxmp: 20, atk: 3, lvl: 1, xp: 0, coins: 0, potions: 2, sword: 0, atkT: 0, atkCd: 0, dodgeT: 0, dodgeCd: 0, magCd: 0, inv: 0, hurt: 0, kx: 0, ky: 0, step: 0, dx: 0, dy: 0 }; }

/* ---------------- UTILIDADES DE JOGO ---------------- */
function solidAt(px, py) { const v = tileAt(M, Math.floor(px / TS), Math.floor(py / TS)); return v === 1 || v === 2 || v === 5 || v === 7 || v === 9; }
function boxHit(x, y, hw, hh) {
  const nx = Math.max(1, Math.ceil(hw * 2 / TS)), ny = Math.max(1, Math.ceil(hh * 2 / TS));
  for (let i = 0; i <= nx; i++) for (let j = 0; j <= ny; j++) if (solidAt(x - hw + 2 * hw * i / nx, y - hh + 2 * hh * j / ny)) return true;
  return false;
}
function move(e, dx, dy) {
  let bl = false;
  if (!boxHit(e.x + dx, e.y, e.hw, e.hh)) e.x += dx; else bl = true;
  if (!boxHit(e.x, e.y + dy, e.hw, e.hh)) e.y += dy; else bl = true;
  return bl;
}
function sparks(x, y, col, n, sp, life) { for (let i = 0; i < n; i++) { const a = rnd(0, 6.283), s = rnd(.2, 1) * sp; parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, l: life || .5, m: life || .5, c: col, s: rint(2, 4) }); } }
function floater(x, y, txt, c) { floats.push({ x, y, t: txt, c: c || '#fff', l: .9 }); }
function toast(t) { toasts.push({ t, l: 3 }); if (toasts.length > 3) toasts.shift(); }
function showBanner(t, s) { banner = { t, s: s || '', l: 3 }; }
function addProj(x, y, ang, sp, dmg, col, hostile, r) { projs.push({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, dmg, c: col, h: hostile, r: r || 6, l: 3 }); }
function gainXp(n) {
  P.xp += n;
  while (P.xp >= xpNeed(P.lvl)) { P.xp -= xpNeed(P.lvl); P.lvl++; P.maxhp += 2; P.maxmp += 4; P.atk += 1; P.hp = P.maxhp; P.mp = P.maxmp; snd('lvl'); floater(P.x, P.y - 24, 'NÍVEL ' + P.lvl + '!', '#ffe34a'); sparks(P.x, P.y, '#ffe34a', 30, 160, .8); toast('Nível ' + P.lvl + '! +2 vida, +4 mana, +1 ataque'); }
}
function usePotion() { if (P.potions > 0 && P.hp < P.maxhp) { P.potions--; P.hp = Math.min(P.maxhp, P.hp + 8); floater(P.x, P.y - 20, '+8 HP', '#5dff7a'); sparks(P.x, P.y, '#5dff7a', 14, 90, .6); snd('pick'); } }
function hurtPlayer(d, sx, sy) {
  if (P.inv > 0 || P.dodgeT > 0 || state !== 'play') return;
  P.hp -= d; P.inv = 1; P.hurt = .25; shake = 6; snd('hurt'); floater(P.x, P.y - 20, '-' + d, '#ff4a4a'); sparks(P.x, P.y, '#ff4a4a', 10, 140, .4);
  const a = Math.atan2(P.y - sy, P.x - sx); P.kx = Math.cos(a) * 220; P.ky = Math.sin(a) * 220;
  if (P.hp <= 0) { P.hp = 0; state = 'dead'; snd('die'); $('endTitle').textContent = 'VOCÊ CAIU...'; $('endText').textContent = 'As sombras avançam sobre Eldoria. Mas o herói pode se levantar de novo.'; $('btnEnd').textContent = 'REVIVER'; $('end').classList.remove('hidden'); }
}
function hurtEnemy(e, dmg, kx, ky, kb) {
  e.hp -= dmg; e.hurt = .15; e.alert = true; const D = EN[e.type];
  if (!D.boss) { e.kx = kx * (kb || 260); e.ky = ky * (kb || 260); }
  floater(e.x, e.y - e.hh - 6, '' + dmg, '#ffe34a'); sparks(e.x, e.y, '#fff', 8, 150, .3); snd('hit'); hitstop = .04; shake = Math.max(shake, 2);
  if (e.hp <= 0) killEnemy(e);
}
function killEnemy(e) {
  const D = EN[e.type]; enemies.splice(enemies.indexOf(e), 1);
  sparks(e.x, e.y, D.boss ? '#ff6ad0' : '#c9a6ff', D.boss ? 60 : 18, 200, .8); snd(D.boss ? 'boom' : 'die');
  gainXp(D.xp); floater(e.x, e.y - 30, '+' + D.xp + ' XP', '#9ad0ff');
  const n = rint(D.c[0], D.c[1]); for (let i = 0; i < Math.min(n, 6); i++) pickups.push({ k: 'coin', x: e.x + rnd(-14, 14), y: e.y + rnd(-14, 14), v: Math.ceil(n / Math.min(n, 6)) });
  if (!D.boss) { if (Math.random() < .14) pickups.push({ k: 'potion', x: e.x, y: e.y, v: 1 }); else if (Math.random() < .2) pickups.push({ k: 'heart', x: e.x, y: e.y, v: 3 }); }
  if (Q.bob === 1 && e.type === 'goblin') Q.kb++;
  if (Q.lyra === 1 && e.type === 'skeleton') Q.kl++;
  if (e.type === 'guardian') { F.boss1 = true; showBanner('GUARDIÃO DERROTADO', 'O cristal da floresta está livre!'); shake = 12; save(); }
  if (e.type === 'baphome') { state = 'winning'; winT = 3.2; F.win = true; shake = 14; enemies.forEach(x => x.hp = 0); enemies.length = 0; projs.length = 0; snd('win'); }
}

/* ---------------- ÁREAS ---------------- */
function applyFlags(a) {
  if (a.ai === 2 && F.secret) a.m.t[20 * a.m.w + 17] = 0;
  if (a.ai === 3 && F.c.every(x => x)) setR(a.m, 18, 10, 4, 2, 0);
  a.dirty = true;
}
function changeArea(i, tx, ty, silent) {
  AI = i; const a = areas[i]; M = a.m; enemies = a.enemies; applyFlags(a); if (!a.cache || a.dirty) buildCache(a);
  P.x = (tx + .5) * TS; P.y = (ty + .5) * TS; projs = []; pickups = []; portalCd = 1; fade = 1;
  if (!silent) { showBanner(a.name.toUpperCase(), ''); save(); }
}
function newGame() {
  F = { elder: false, boss1: false, c: [false, false, false, false], chests: {}, secret: false, win: false }; window.__F = F;
  Q = { bob: 0, kb: 0, lyra: 0, kl: 0 }; P = mkPlayer(); areas = buildAreas(); changeArea(0, 20, 12, true);
  hideOverlays(); state = 'play'; showBanner('VILA DOS PEQUENOS', '');
  startDialog('Narrador', ['Eldoria era um reino mágico de fadas, gnomos, duendes, elfos e magos, protegido por quatro cristais ancestrais.',
    'Então Baphome, o Senhor das Trevas, despertou de seu sono milenar e corrompeu os cristais.', 'As criaturas que protegiam o reino voltaram-se contra seus próprios habitantes.',
    'Você é Aren. Fale com o Ancião Orin — siga a seta dourada. (Espada: ESPAÇO)']);
}
const LS = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }, del(k) { try { localStorage.removeItem(k); } catch (e) {} } };
let USER = null;
const saveKey = () => 'eldoria_save_' + (USER ? USER.toLowerCase() : '_');
function hasSave() { return !!LS.get(saveKey()); }
function save(manual) {
  if (!P || state === 'title' || !USER) return;
  try {
    const s = { F, Q, P: { hp: P.hp, maxhp: P.maxhp, mp: P.mp, maxmp: P.maxmp, atk: P.atk, lvl: P.lvl, xp: P.xp, coins: P.coins, potions: P.potions, sword: P.sword }, a: AI, x: P.x, y: P.y };
    localStorage.setItem(saveKey(), JSON.stringify(s)); if (manual) toast('Jogo salvo!'); else toast('Progresso salvo');
  } catch (e) {}
}
function continueGame() {
  let s; try { s = JSON.parse(LS.get(saveKey())); } catch (e) {} if (!s) return newGame();
  F = s.F; window.__F = F; Q = s.Q; P = mkPlayer(); Object.assign(P, s.P); areas = buildAreas(); changeArea(s.a, 0, 0, true); P.x = s.x; P.y = s.y;
  if (boxHit(P.x, P.y, P.hw, P.hh)) { P.x += TS; }
  hideOverlays(); state = 'play'; showBanner(areas[AI].name.toUpperCase(), 'Jogo carregado');
}
function hideOverlays() { ['title', 'pause', 'end'].forEach(i => $(i).classList.add('hidden')); }
function toTitle() { state = 'title'; hideOverlays(); $('title').classList.remove('hidden'); showAuthOrMenu(); }
function respawn() {
  P.hp = P.maxhp; P.mp = P.maxmp; P.coins = Math.floor(P.coins * .85); P.inv = 2; P.dodgeT = 0;
  const e = [[20, 12], [4, 16], [4, 15], [3, 31]][AI]; enemies.forEach(x => { x.alert = false; if (x.type === 'baphome' || x.type === 'guardian') { x.hp = x.maxhp; x.st = ''; } });
  changeArea(AI, e[0], e[1], true); hideOverlays(); state = 'play'; toast('Você voltou à entrada da área (-15% moedas)');
}

/* ---------------- NPCs / DIÁLOGOS ---------------- */
function startDialog(name, lines, cb) { dlg = { n: name, l: lines, i: 0, c: 0, cb }; state = 'dialog'; }
function interactNpc(n) {
  if (n.id === 'orin') {
    if (!F.elder) startDialog(n.n, ['Aren! Que bom que chegou. As sombras avançam sobre Eldoria.', 'Baphome corrompeu os quatro cristais ancestrais. Você deve recuperá-los.',
      'O primeiro está com o Guardião Corrompido, na Floresta das Fadas, a leste da vila.', 'Leve estas 3 poções (Q para usar). E ajude meus vizinhos, eles pagam bem!'], () => { F.elder = true; P.potions += 3; toast('+3 poções'); });
    else startDialog(n.n, [F.c[3] ? 'O trono de Baphome aguarda, herói. Que os cristais te guiem!' : 'Siga a seta dourada. Cada cristal enfraquece as trevas.', 'Volte quando precisar de conselhos.']);
  } else if (n.id === 'pip') startDialog(n.n, ['Poções fresquinhas! Dê uma olhada, herói.'], () => { shop = true; state = 'shop'; });
  else if (n.id === 'bob') {
    if (Q.bob === 0) startDialog(n.n, ['Goblins corrompidos destroem minha plantação!', 'Derrote 5 deles na floresta e eu te pago 60 moedas.'], () => { Q.bob = 1; Q.kb = 0; toast('Missão: derrotar 5 goblins'); });
    else if (Q.bob === 1) { if (Q.kb >= 5) startDialog(n.n, ['Você conseguiu! Minha plantação está salva!', 'Tome 60 moedas e minha gratidão.'], () => { Q.bob = 2; P.coins += 60; gainXp(40); snd('coin'); toast('Missão concluída! +60 moedas'); }); else startDialog(n.n, ['Ainda faltam ' + (5 - Q.kb) + ' goblins. Eles vivem na Floresta das Fadas.']); }
    else startDialog(n.n, ['Obrigado, herói! Eldoria precisa de você.']);
  } else if (n.id === 'lyra') {
    if (Q.lyra === 0) startDialog(n.n, ['Ossos andam pela noite... Os esqueletos corrompidos perturbam minha família.', 'Derrote 3 esqueletos (floresta ou minas) e eu te darei um presente élfico.'], () => { Q.lyra = 1; Q.kl = 0; toast('Missão: derrotar 3 esqueletos'); });
    else if (Q.lyra === 1) { if (Q.kl >= 3) startDialog(n.n, ['Os esqueletos descansam novamente. Obrigada!', 'Aceite 2 poções e esta bênção: +6 de mana máxima.'], () => { Q.lyra = 2; P.potions += 2; P.maxmp += 6; P.mp = P.maxmp; gainXp(60); snd('pick'); toast('Missão concluída! +2 poções, +6 mana'); }); else startDialog(n.n, ['Faltam ' + (3 - Q.kl) + ' esqueletos. Cuidado com as espadas deles.']); }
    else startDialog(n.n, ['Que a luz dos cristais proteja você, Aren.']);
  } else if (n.id === 'fila') startDialog(n.n, ['Sinto a corrupção em você... deixe-me curar suas feridas.', 'O Guardião brilha em vermelho antes de investir. Esquive com K!'], () => { P.hp = P.maxhp; P.mp = P.maxmp; sparks(P.x, P.y, '#9affc0', 30, 120, .9); snd('lvl'); toast('Vida e mana restauradas!'); });
  else if (n.id === 'torb') startDialog(n.n, ['Os túneis estão cheios de espinhos! Esquive (K) para atravessá-los sem dano.', 'Dizem que paredes rachadas escondem segredos antigos... Bata nelas com a espada!']);
}
function interact() {
  let best = null, bd = 48;
  const a = areas[AI];
  a.npcs.forEach(n => { const d = dst(P.x, P.y, (n.tx + .5) * TS, (n.ty + .5) * TS); if (d < bd) { bd = d; best = { t: 'npc', o: n }; } });
  a.chests.forEach(c => { if (F.chests[c.id]) return; const d = dst(P.x, P.y, (c.tx + .5) * TS, (c.ty + .5) * TS); if (d < bd) { bd = d; best = { t: 'chest', o: c }; } });
  return best;
}
function openChest(c) {
  F.chests[c.id] = true; snd('pick'); const x = (c.tx + .5) * TS, y = (c.ty + .5) * TS; sparks(x, y, '#ffe34a', 20, 140, .7);
  if (c.k === 'coins') { P.coins += c.v; toast('Baú: +' + c.v + ' moedas'); snd('coin'); } else if (c.k === 'potion') { P.potions += c.v; toast('Baú: +' + c.v + ' poção(ões)'); }
  else if (c.k === 'atk') { P.atk += c.v; toast('Baú: Lâmina Rúnica! +1 ataque'); } else if (c.k === 'maxhp') { P.maxhp += c.v; P.hp += c.v; toast('Baú: Fragmento de Coração! +2 vida máxima'); }
}

/* ---------------- OBJETIVOS ---------------- */
function objective() {
  if (!F.elder) return { t: 'Fale com o Ancião Orin na vila', a: 0, x: 8.5, y: 10.5 };
  if (!F.boss1) return { t: 'Derrote o Guardião Corrompido (Floresta das Fadas)', a: 1, x: 43.5, y: 26.5 };
  if (!F.c[0]) return { t: 'Pegue o cristal da floresta', a: 1, x: 43.5, y: 26.5 };
  if (!F.c[1]) return { t: 'Cristal 2: Minas dos Gnomos', a: 2, x: 42.5, y: 5.5 };
  if (!F.c[2]) return F.secret ? { t: 'Cristal 3: sala secreta das Minas', a: 2, x: 7.5, y: 26.5 } : { t: 'Cristal 3: ache a parede rachada nas Minas', a: 2, x: 17.5, y: 19.5 };
  if (!F.c[3]) return { t: 'Cristal 4: Castelo das Sombras', a: 3, x: 20.5, y: 14.5 };
  return { t: 'Derrote Baphome no trono!', a: 3, x: 20.5, y: 5.5 };
}

/* ---------------- ATUALIZAÇÃO ---------------- */
const K = k => keys[k];
function updPlay(dt) {
  gt += dt; P.atkCd -= dt; P.dodgeCd -= dt; P.magCd -= dt; P.inv -= dt; P.hurt -= dt; P.mp = Math.min(P.maxmp, P.mp + 1.6 * dt); portalCd -= dt; wallToastCd -= dt; saveTimer += dt;
  if (saveTimer > 20) { saveTimer = 0; save(); }
  let ax = (K('arrowright') || K('d') ? 1 : 0) - (K('arrowleft') || K('a') ? 1 : 0), ay = (K('arrowdown') || K('s') ? 1 : 0) - (K('arrowup') || K('w') ? 1 : 0);
  if (ax || ay) { const l = Math.hypot(ax, ay); ax /= l; ay /= l; if (P.dodgeT <= 0) { if (Math.abs(ax) >= Math.abs(ay) && ax) { P.face = ax > 0 ? 'right' : 'left'; } else P.face = ay > 0 ? 'down' : 'up'; P.fx = Math.abs(ax) > .5 || !ay ? Math.sign(ax) : 0; P.fy = P.fx ? 0 : Math.sign(ay); if (!P.fx && !P.fy) P.fy = 1; } }
  if (pr.k && P.dodgeCd <= 0 && P.dodgeT <= 0) { P.dodgeT = .2; P.dodgeCd = .7; P.dx = (ax || ay) ? ax : -P.fx; P.dy = (ax || ay) ? ay : -P.fy; snd('dodge'); sparks(P.x, P.y, '#9ad0ff', 8, 80, .3); }
  if (P.dodgeT > 0) { P.dodgeT -= dt; move(P, P.dx * 340 * dt, P.dy * 340 * dt); }
  else { const sp = P.atkT > 0 ? 70 : 130; if (ax || ay) { move(P, ax * sp * dt, ay * sp * dt); P.step += dt * 10; } }
  if (P.kx || P.ky) { move(P, P.kx * dt, P.ky * dt); const f = Math.pow(.001, dt); P.kx *= f; P.ky *= f; if (Math.abs(P.kx) + Math.abs(P.ky) < 8) P.kx = P.ky = 0; }
  if (P.atkT > 0) P.atkT -= dt;
  if (pr[' '] && P.atkCd <= 0 && P.dodgeT <= 0) {
    P.atkT = .22; P.atkCd = .34; snd('sword');
    const hx = P.x + P.fx * 26, hy = P.y + P.fy * 26, hs = 28, dmgBase = P.atk + P.sword;
    for (const e of enemies.slice()) { if (Math.abs(e.x - hx) < hs + e.hw && Math.abs(e.y - hy) < hs + e.hh) { const a = Math.atan2(e.y - P.y, e.x - P.x); hurtEnemy(e, dmgBase + rint(0, 2), Math.cos(a), Math.sin(a)); } }
    for (let i = Math.floor((hx - hs) / TS); i <= Math.floor((hx + hs) / TS); i++) for (let j = Math.floor((hy - hs) / TS); j <= Math.floor((hy + hs) / TS); j++)
      if (tileAt(M, i, j) === 9) { M.t[j * M.w + i] = 0; F.secret = true; areas[AI].dirty = true; buildCache(areas[AI]); sparks((i + .5) * TS, (j + .5) * TS, '#b9a8e8', 30, 160, .8); snd('boom'); shake = 8; toast('A parede se quebrou! Uma passagem secreta!'); }
  }
  if (pr.j && P.mp >= 8 && P.magCd <= 0) { P.mp -= 8; P.magCd = .35; snd('magic'); addProj(P.x, P.y, Math.atan2(P.fy, P.fx), 340, P.atk * 2 + 3, '#6ad0ff', false, 7); P.hurt = 0; }
  if (pr.q) usePotion();
  if (pr.e) { const it = interact(); if (it) { if (it.t === 'npc') interactNpc(it.o); else openChest(it.o); } }
  if (pr.escape) { state = 'pause'; $('pause').classList.remove('hidden'); }
  // portais
  if (portalCd <= 0) for (const p of areas[AI].portals) {
    if (P.x > p.x * TS && P.x < (p.x + p.w) * TS && P.y > p.y * TS && P.y < (p.y + p.h) * TS) {
      if (p.req && !(p.req === 'c2' ? F.c[1] : F[p.req])) { if (wallToastCd <= 0) { toast(p.msg); wallToastCd = 3; } P.x -= Math.sign(P.x - (p.x + p.w / 2) * TS) * 6; P.y -= Math.sign(P.y - (p.y + p.h / 2) * TS) * 6; }
      else { changeArea(p.to, p.tx, p.ty); break; }
    }
  }
  if (AI === 3 && !F.c.every(x => x) && wallToastCd <= 0 && dst(P.x, P.y, 20 * TS, 11 * TS) < 70) { toast('Os portões do trono estão selados pelos 4 cristais.'); wallToastCd = 4; }
  // cristais
  CR.forEach((c, i) => {
    if (c.a !== AI || F.c[i] || (c.need && !F[c.need])) return;
    if (dst(P.x, P.y, (c.tx + .5) * TS, (c.ty + .5) * TS) < 26) {
      F.c[i] = true; snd('win'); sparks(P.x, P.y, CRY_COL[i], 50, 220, 1); shake = 6; showBanner('CRISTAL ' + CRY_NAME[i].toUpperCase(), F.c.filter(x => x).length + ' de 4 cristais');
      P.hp = P.maxhp; P.mp = P.maxmp; gainXp(30);
      if (i === 3) { setR(M, 18, 10, 4, 2, 0); areas[AI].dirty = true; buildCache(areas[AI]); toast('Os portões do trono de Baphome se abriram!'); }
      save();
    }
  });
  // pickups
  for (let i = pickups.length - 1; i >= 0; i--) {
    const p = pickups[i], d = dst(P.x, P.y, p.x, p.y);
    if (p.k === 'coin' && d < 70) { p.x += (P.x - p.x) * 6 * dt; p.y += (P.y - p.y) * 6 * dt; }
    if (d < 18) { if (p.k === 'coin') { P.coins += p.v; snd('coin'); floater(p.x, p.y - 8, '+' + p.v, '#ffe34a'); } else if (p.k === 'potion') { P.potions++; snd('pick'); floater(p.x, p.y - 8, '+Poção', '#ff7aa8'); } else if (p.k === 'heart') { P.hp = Math.min(P.maxhp, P.hp + p.v); snd('pick'); floater(p.x, p.y - 8, '+' + p.v + ' HP', '#5dff7a'); } pickups.splice(i, 1); }
  }
  // espinhos
  if (tileAt(M, Math.floor(P.x / TS), Math.floor(P.y / TS)) === 6) hurtPlayer(2, P.x, P.y + 10);
  updEnemies(dt); updProjs(dt);
}
function updEnemies(dt) {
  for (const e of enemies.slice()) {
    const D = EN[e.type]; e.t += dt; e.hurt = Math.max(0, e.hurt - dt); e.cd -= dt;
    if (e.kx || e.ky) { move(e, e.kx * dt, e.ky * dt); const f = Math.pow(.0005, dt); e.kx *= f; e.ky *= f; if (Math.abs(e.kx) + Math.abs(e.ky) < 8) e.kx = e.ky = 0; }
    const dx = P.x - e.x, dy = P.y - e.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
    if (!e.alert && d < D.ag * TS) e.alert = true;
    if (!e.alert) continue;
    if (Math.abs(ux) > .2) e.face = ux < 0 ? -1 : 1;
    if (D.boss) { bossAI(e, D, dt, d, ux, uy); continue; }
    let sp = D.sp;
    if (D.ranged) {
      if (d < 140) move(e, -ux * sp * dt, -uy * sp * dt); else if (d > 220) move(e, ux * sp * dt, uy * sp * dt); else move(e, -uy * sp * .5 * dt, ux * sp * .5 * dt);
      if (e.cd <= 0 && d < 340) { e.cd = 2.1; addProj(e.x, e.y, Math.atan2(dy, dx), 170, e.dmg, '#c06aff', true, 6); sparks(e.x, e.y, '#c06aff', 6, 80, .3); }
    } else { move(e, ux * sp * dt, uy * sp * dt); }
    for (const o of enemies) if (o !== e) { const od = dst(e.x, e.y, o.x, o.y); if (od < 20 && od > 0) { e.x += (e.x - o.x) / od * 30 * dt; e.y += (e.y - o.y) / od * 30 * dt; } }
    if (d < e.hw + P.hw + 3) hurtPlayer(e.dmg, e.x, e.y);
  }
}
function bossAI(e, D, dt, d, ux, uy) {
  e.sT += dt; const ph2 = e.hp < e.maxhp * .5;
  if (e.type === 'guardian') {
    if (!e.st) e.st = 'chase';
    if (e.st === 'chase') { move(e, ux * D.sp * (ph2 ? 1.3 : 1) * dt, uy * D.sp * (ph2 ? 1.3 : 1) * dt); if (e.sT > (ph2 ? 1.5 : 2.3)) { e.st = 'wind'; e.sT = 0; e.ax = ux; e.ay = uy; } }
    else if (e.st === 'wind') { e.ax = ux; e.ay = uy; if (e.sT > .8) { e.st = 'charge'; e.sT = 0; snd('dodge'); } }
    else if (e.st === 'charge') { const bl = move(e, e.ax * 430 * dt, e.ay * 430 * dt); if (e.sT % .06 < dt) sparks(e.x, e.y, '#9aff6a', 2, 60, .3); if (bl || e.sT > .65) { e.st = 'rest'; e.sT = 0; shake = 8; snd('boom'); if (ph2) for (let i = -1; i <= 1; i++) addProj(e.x, e.y, Math.atan2(P.y - e.y, P.x - e.x) + i * .35, 200, 2, '#7aff5a', true, 7); } }
    else if (e.st === 'rest') { if (e.sT > 1.1) { e.st = 'chase'; e.sT = 0; } }
    if (d < e.hw + P.hw + 3) hurtPlayer(e.st === 'charge' ? 5 : e.dmg, e.x, e.y);
  } else {
    if (!e.st) { e.st = 'idle'; e.pi = -1; }
    if (e.st === 'idle') { if (d > 150) move(e, ux * D.sp * dt, uy * D.sp * dt); if (e.sT > (ph2 ? 1.0 : 1.7)) { e.pi = (e.pi + 1) % 3; e.st = ['energy', 'summon', 'slam'][e.pi]; e.sT = 0; e.n = 0; } }
    else if (e.st === 'energy') {
      if (e.sT > e.n * .45) { e.n++; const base = Math.atan2(P.y - e.y, P.x - e.x), cnt = ph2 ? 7 : 5; snd('magic'); for (let i = 0; i < cnt; i++) addProj(e.x, e.y, base + (i - (cnt - 1) / 2) * .22, 210, 3, '#ff4a9a', true, 8); if (ph2 && e.n === 2) for (let i = 0; i < 12; i++) addProj(e.x, e.y, i / 12 * 6.283, 140, 3, '#b06aff', true, 7); }
      if (e.n >= 3 && e.sT > 1.5) { e.st = 'idle'; e.sT = 0; }
    } else if (e.st === 'summon') {
      if (e.sT > .6 && !e.done) { e.done = 1; if (enemies.length < 7) { const n = ph2 ? 3 : 2; for (let i = 0; i < n; i++) { const t = ['goblin', 'skeleton', 'demon'][rint(0, ph2 ? 2 : 1)]; const m = mkEnemy(t, 0, 0, 2); m.x = e.x + rnd(-90, 90); m.y = e.y + 80 + rnd(0, 30); if (boxHit(m.x, m.y, m.hw, m.hh)) { m.x = e.x; m.y = e.y + 70; } m.alert = true; enemies.push(m); sparks(m.x, m.y, '#b06aff', 14, 120, .6); } snd('boom'); } }
      if (e.sT > 1.3) { e.done = 0; e.st = 'idle'; e.sT = 0; }
    } else if (e.st === 'slam') {
      const R = ph2 ? 160 : 130;
      if (e.sT > 1.1) { shake = 12; snd('boom'); sparks(e.x, e.y, '#ff8a3a', 50, 260, .7); if (dst(P.x, P.y, e.x, e.y) < R + P.hw) hurtPlayer(5, e.x, e.y); if (ph2) for (let i = 0; i < 10; i++) addProj(e.x, e.y, i / 10 * 6.283 + .3, 150, 3, '#ff8a3a', true, 7); e.st = 'idle'; e.sT = -.4; }
    }
    if (d < e.hw + P.hw + 4) hurtPlayer(e.dmg, e.x, e.y);
  }
}
function updProjs(dt) {
  for (let i = projs.length - 1; i >= 0; i--) {
    const p = projs[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.l -= dt; let rm = p.l <= 0 || solidAt(p.x, p.y);
    if (p.l % .05 < dt) parts.push({ x: p.x, y: p.y, vx: rnd(-20, 20), vy: rnd(-20, 20), l: .3, m: .3, c: p.c, s: 3 });
    if (!rm) {
      if (p.h) { if (dst(p.x, p.y, P.x, P.y) < p.r + P.hw) { hurtPlayer(p.dmg, p.x - p.vx, p.y - p.vy); rm = true; } }
      else for (const e of enemies) if (Math.abs(e.x - p.x) < e.hw + p.r && Math.abs(e.y - p.y) < e.hh + p.r) { const a = Math.atan2(p.vy, p.vx); hurtEnemy(e, p.dmg, Math.cos(a), Math.sin(a), 200); sparks(p.x, p.y, p.c, 10, 150, .4); rm = true; break; }
    }
    if (rm) { if (solidAt(p.x, p.y)) sparks(p.x, p.y, p.c, 5, 80, .25); projs.splice(i, 1); }
  }
}
function updFx(dt) {
  for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= .96; p.vy *= .96; p.l -= dt; if (p.l <= 0) parts.splice(i, 1); }
  for (let i = floats.length - 1; i >= 0; i--) { const f = floats[i]; f.y -= 30 * dt; f.l -= dt; if (f.l <= 0) floats.splice(i, 1); }
  for (let i = toasts.length - 1; i >= 0; i--) { toasts[i].l -= dt; if (toasts[i].l <= 0) toasts.splice(i, 1); }
  if (banner) { banner.l -= dt; if (banner.l <= 0) banner = null; }
  shake = Math.max(0, shake - 20 * dt); fade = Math.max(0, fade - dt * 2);
  if (M && (state === 'play') && Math.random() < dt * 6 && AI < 2) parts.push({ x: cam.x + rnd(0, VW), y: cam.y + rnd(0, VH), vx: rnd(-8, 8), vy: rnd(-14, -4), l: 2, m: 2, c: AI === 1 ? '#a8ffcf' : '#fff6a8', s: 2 });
}
function updDialog(dt) {
  dlg.c += dt * 60; const L = dlg.l[dlg.i];
  if (pr.e || pr[' '] || pr.enter) { if (dlg.c < L.length) dlg.c = L.length; else { dlg.i++; dlg.c = 0; if (dlg.i >= dlg.l.length) { const cb = dlg.cb; dlg = null; state = 'play'; if (cb) cb(); } } }
}
const SHOP = [['Poção de Vida', () => 15, () => { P.potions++; return true; }], ['Afiar Espada (+1 ATQ)', () => 50 + P.sword * 40, () => { if (P.sword >= 4) return false; P.sword++; return true; }], ['Coração (+2 Vida Máx)', () => 80, () => { P.maxhp += 2; P.hp += 2; return true; }]];
function updShop() {
  if (pr.escape || pr.e) { shop = null; state = 'play'; return; }
  for (let i = 0; i < 3; i++) if (pr[String(i + 1)]) { const it = SHOP[i], c = it[1](); if (P.coins >= c) { if (it[2]()) { P.coins -= c; snd('coin'); toast('Comprou: ' + it[0]); } else toast('Já no máximo!'); } else toast('Moedas insuficientes!'); }
}
let last = 0;
function loop(ts) {
  const dt = Math.min(.05, (ts - last) / 1000 || .016); last = ts;
  step(dt); draw(); for (const k in pr) delete pr[k]; requestAnimationFrame(loop);
}
function step(dt) {
  if (state === 'play') { if (hitstop > 0) hitstop -= dt; else updPlay(dt); updFx(dt); }
  else if (state === 'dialog') { updDialog(dt); updFx(dt); }
  else if (state === 'shop') { updShop(); updFx(dt); }
  else if (state === 'pause') { if (pr.escape) { state = 'play'; $('pause').classList.add('hidden'); } }
  else if (state === 'winning') { winT -= dt; updFx(dt); sparks(P.x + rnd(-200, 200), P.y + rnd(-150, 150), ['#ffe34a', '#ff6ad0', '#6ad0ff'][rint(0, 2)], 4, 200, .8); if (winT <= 0) { state = 'win'; $('endTitle').textContent = 'VITÓRIA!'; $('endText').textContent = 'Baphome foi derrotado e os cristais brilham outra vez. Eldoria está salva graças a Aren, o herói de Eldoria!'; $('btnEnd').textContent = 'VOLTAR AO MENU'; $('end').classList.remove('hidden'); LS.del(saveKey()); } }
  else if (state === 'dead') updFx(dt);
  else if (state === 'title') gt += dt;
}

/* ---------------- DESENHO ---------------- */
function bar(x, y, w, h, v, max, c1, c2) { ctx.fillStyle = '#000b'; ctx.fillRect(x - 2, y - 2, w + 4, h + 4); ctx.fillStyle = '#2a2236'; ctx.fillRect(x, y, w, h); const ww = w * clamp(v / max, 0, 1); ctx.fillStyle = c1; ctx.fillRect(x, y, ww, h); ctx.fillStyle = c2; ctx.fillRect(x, y, ww, Math.max(2, h / 3)); }
function txt(s, x, y, c, size, al) { ctx.font = 'bold ' + (size || 12) + 'px "Courier New",monospace'; ctx.textAlign = al || 'left'; ctx.fillStyle = '#000'; ctx.fillText(s, x + 1, y + 1); ctx.fillStyle = c || '#fff'; ctx.fillText(s, x, y); }
function wrap(s, w) { const out = []; let line = ''; s.split(' ').forEach(wd => { const t = line ? line + ' ' + wd : wd; if (ctx.measureText(t).width > w && line) { out.push(line); line = wd; } else line = t; }); out.push(line); return out; }
function box(x, y, w, h) { ctx.fillStyle = '#0d0820ee'; ctx.fillRect(x, y, w, h); ctx.strokeStyle = '#ffd86b'; ctx.lineWidth = 3; ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3); ctx.strokeStyle = '#6a4bd4'; ctx.lineWidth = 1; ctx.strokeRect(x + 5.5, y + 5.5, w - 11, h - 11); }
function drawTitleBg() {
  const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, '#05020f'); g.addColorStop(.55, '#2a0f4a'); g.addColorStop(1, '#7a2a6a'); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  for (let i = 0; i < 90; i++) { const x = (i * 97) % VW, y = (i * 53) % 300, a = .3 + .7 * Math.abs(Math.sin(gt * 1.3 + i)); ctx.fillStyle = 'rgba(255,255,255,' + a + ')'; ctx.fillRect(x, y, i % 5 ? 2 : 3, i % 5 ? 2 : 3); }
  ctx.fillStyle = 'rgba(255,240,200,.1)'; ctx.beginPath(); ctx.arc(520, 100, 70, 0, 7); ctx.fill(); ctx.fillStyle = '#fff3cf'; ctx.beginPath(); ctx.arc(520, 100, 34, 0, 7); ctx.fill(); ctx.fillStyle = '#1d0c38'; ctx.beginPath(); ctx.arc(532, 94, 30, 0, 7); ctx.fill();
  ctx.fillStyle = '#25103f'; ctx.beginPath(); ctx.moveTo(0, VH); ctx.lineTo(0, 330); [[80, 280], [160, 340], [250, 260], [340, 330], [430, 270], [520, 340], [600, 290], [640, 320]].forEach(p => ctx.lineTo(p[0], p[1])); ctx.lineTo(VW, VH); ctx.fill();
  ctx.fillStyle = '#150a28'; ctx.fillRect(250, 300, 140, 140); [[240, 250, 28, 190], [296, 270, 48, 170], [362, 250, 28, 190]].forEach(r => ctx.fillRect(r[0], r[1], r[2], r[3]));
  [[240, 250], [362, 250]].forEach(p => { ctx.beginPath(); ctx.moveTo(p[0] - 4, p[1]); ctx.lineTo(p[0] + 14, p[1] - 34); ctx.lineTo(p[0] + 32, p[1]); ctx.fill(); });
  for (let k = 0; k < 7; k++) { ctx.fillStyle = 'rgba(255,' + (150 + 60 * Math.sin(gt * 3 + k)) + ',60,.85)'; ctx.fillRect(256 + k * 18, 330 + (k % 2) * 30, 6, 10); }
  ctx.fillStyle = 'rgba(180,60,255,' + (.25 + .1 * Math.sin(gt * 2)) + ')'; ctx.beginPath(); ctx.arc(320, 280, 60, 0, 7); ctx.fill();
  ctx.fillStyle = '#0c0618'; ctx.fillRect(0, 430, VW, 50);
  for (let k = 0; k < 4; k++) { const x = 120 + k * 133, y = 440 + Math.sin(gt * 2 + k) * 6; drawCrystal(x, y, CRY_COL[k], 1.2); }
  for (let i = 0; i < 24; i++) { const x = (i * 71 + gt * 12 * (1 + i % 3)) % VW, y = 480 - ((gt * 20 * (1 + i % 4) + i * 37) % 480); ctx.fillStyle = 'rgba(200,170,255,.5)'; ctx.fillRect(x, y, 2, 2); }
}
function drawCrystal(x, y, col, s) {
  const p = Math.sin(gt * 3) * 3; ctx.save(); ctx.translate(x, y + p * s); ctx.fillStyle = col + '33'; ctx.beginPath(); ctx.arc(0, 0, 22 * s, 0, 7); ctx.fill();
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, -14 * s); ctx.lineTo(9 * s, 0); ctx.lineTo(0, 14 * s); ctx.lineTo(-9 * s, 0); ctx.fill(); ctx.fillStyle = '#fff8'; ctx.beginPath(); ctx.moveTo(0, -14 * s); ctx.lineTo(4 * s, -2 * s); ctx.lineTo(0, 4 * s); ctx.lineTo(-5 * s, -1 * s); ctx.fill(); ctx.restore();
}
function drawPlayer(cx, cy) {
  const flip = P.face === 'left', fl = P.inv > 0 && Math.floor(gt * 20) % 2 === 0;
  const bob = (P.step > 0 && (K('a') || K('d') || K('w') || K('s') || K('arrowleft') || K('arrowright') || K('arrowup') || K('arrowdown'))) ? Math.sin(P.step * 2) * 1.5 : 0;
  if (P.dodgeT > 0) ctx.globalAlpha = .5;
  drawSpr('player', PAL, 3, cx, cy, flip, P.hurt > 0 || fl && P.inv > .8, bob); ctx.globalAlpha = 1;
  if (P.atkT > 0) { // arco da espada
    const t = 1 - P.atkT / .22, base = Math.atan2(P.fy, P.fx), a0 = base - 1.1 + t * 2.2;
    ctx.save(); ctx.translate(cx, cy); ctx.strokeStyle = '#e8f6ff'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 0, 30, a0 - .5, a0); ctx.stroke(); ctx.strokeStyle = '#6ad0ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 34, a0 - .6, a0); ctx.stroke();
    ctx.rotate(a0); ctx.fillStyle = '#dfe9f2'; ctx.fillRect(8, -2, 24, 4); ctx.fillStyle = '#ffe34a'; ctx.fillRect(4, -4, 4, 8); ctx.restore();
  }
}
function drawWorld() {
  const a = areas[AI], mw = M.w * TS, mh = M.h * TS;
  cam.x = mw <= VW ? (mw - VW) / 2 : clamp(P.x - VW / 2, 0, mw - VW); cam.y = mh <= VH ? (mh - VH) / 2 : clamp(P.y - VH / 2, 0, mh - VH);
  const sx = shake ? rnd(-shake, shake) : 0, sy = shake ? rnd(-shake, shake) : 0; cam.x = Math.round(cam.x + sx); cam.y = Math.round(cam.y + sy);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, VW, VH); ctx.drawImage(a.cache, -cam.x, -cam.y);
  if (AI === 3 && !F.c.every(x => x)) { ctx.fillStyle = 'rgba(176,106,255,' + (.15 + .1 * Math.sin(gt * 4)) + ')'; ctx.fillRect(18 * TS - cam.x, 10 * TS - cam.y, 4 * TS, 2 * TS); }
  const list = [];
  a.chests.forEach(c => list.push({ y: (c.ty + .5) * TS, f: () => { const o = F.chests[c.id]; drawSpr(o ? 'chestO' : 'chest', PAL, 3, (c.tx + .5) * TS - cam.x, (c.ty + .5) * TS - cam.y + 2); if (!o) { ctx.fillStyle = 'rgba(255,227,74,' + (.4 + .4 * Math.sin(gt * 5)) + ')'; ctx.fillRect((c.tx + .5) * TS - cam.x + 6 + Math.sin(gt * 3) * 4, (c.ty + .5) * TS - cam.y - 14, 3, 3); } } }));
  a.npcs.forEach(n => list.push({ y: (n.ty + .5) * TS, f: () => { const x = (n.tx + .5) * TS - cam.x, y = (n.ty + .5) * TS - cam.y; drawSpr('player', n.pal, 3, x, y, P.x < (n.tx + .5) * TS, false, Math.sin(gt * 3 + n.tx) * 1.2); if (n.id === 'orin' && !F.elder || n.id === 'bob' && Q.bob === 0 || n.id === 'lyra' && Q.lyra === 0 || n.id === 'bob' && Q.bob === 1 && Q.kb >= 5 || n.id === 'lyra' && Q.lyra === 1 && Q.kl >= 3) txt('!', x, y - 24 + Math.sin(gt * 6) * 3, '#ffe34a', 20, 'center'); } }));
  CR.forEach((c, i) => { if (c.a === AI && !F.c[i] && (!c.need || F[c.need])) list.push({ y: (c.ty + .5) * TS, f: () => drawCrystal((c.tx + .5) * TS - cam.x, (c.ty + .5) * TS - cam.y, CRY_COL[i], 1.5) }); });
  enemies.forEach(e => list.push({ y: e.y, f: () => drawEnemy(e) }));
  list.push({ y: P.y, f: () => drawPlayer(P.x - cam.x, P.y - cam.y) });
  list.sort((p, q) => p.y - q.y).forEach(o => o.f());
  pickups.forEach(p => { const x = p.x - cam.x, y = p.y - cam.y + Math.sin(gt * 6 + p.x) * 2; if (p.k === 'coin') { ctx.fillStyle = '#b8860b'; ctx.fillRect(x - 4, y - 4, 8, 8); ctx.fillStyle = '#ffe34a'; ctx.fillRect(x - 3, y - 3, 6, 6); ctx.fillStyle = '#fff6a8'; ctx.fillRect(x - 2, y - 2, 2, 2); } else if (p.k === 'potion') { ctx.fillStyle = '#fff'; ctx.fillRect(x - 3, y - 7, 6, 4); ctx.fillStyle = '#e03060'; ctx.fillRect(x - 5, y - 3, 10, 9); ctx.fillStyle = '#ff8aa8'; ctx.fillRect(x - 3, y - 1, 3, 3); } else { ctx.fillStyle = '#ff3a5a'; ctx.fillRect(x - 5, y - 4, 4, 4); ctx.fillRect(x + 1, y - 4, 4, 4); ctx.fillRect(x - 5, y - 1, 10, 4); ctx.fillRect(x - 3, y + 3, 6, 2); } });
  projs.forEach(p => { const x = p.x - cam.x, y = p.y - cam.y; ctx.fillStyle = p.c + '44'; ctx.beginPath(); ctx.arc(x, y, p.r * 2, 0, 7); ctx.fill(); ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(x, y, p.r, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, p.r * .45, 0, 7); ctx.fill(); });
  parts.forEach(p => { ctx.globalAlpha = clamp(p.l / p.m, 0, 1); ctx.fillStyle = p.c; ctx.fillRect(Math.round(p.x - cam.x), Math.round(p.y - cam.y), p.s, p.s); }); ctx.globalAlpha = 1;
  if (a.th === 'mine' || a.th === 'castle') { // escuridão com luz em volta do herói
    const g = ctx.createRadialGradient(P.x - cam.x, P.y - cam.y, 60, P.x - cam.x, P.y - cam.y, a.th === 'mine' ? 300 : 340); g.addColorStop(0, 'rgba(5,2,12,0)'); g.addColorStop(1, a.th === 'mine' ? 'rgba(5,2,12,.8)' : 'rgba(20,0,30,.75)'); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  } else if (a.th === 'forest') { ctx.fillStyle = 'rgba(10,30,60,.18)'; ctx.fillRect(0, 0, VW, VH); }
  floats.forEach(f => { ctx.globalAlpha = clamp(f.l * 2, 0, 1); txt(f.t, f.x - cam.x, f.y - cam.y, f.c, 14, 'center'); }); ctx.globalAlpha = 1;
  // prompt de interação
  if (state === 'play') { const it = interact(); if (it) { const o = it.o, x = (o.tx + .5) * TS - cam.x, y = (o.ty + .5) * TS - cam.y - 28; ctx.fillStyle = '#000a'; ctx.fillRect(x - 36, y - 12, 72, 18); txt(it.t === 'npc' ? '[E] Falar' : '[E] Abrir', x, y + 2, '#ffe34a', 12, 'center'); } }
  // seta de objetivo
  const ob = objective(); let tx, ty;
  if (ob.a === AI) { tx = ob.x * TS; ty = ob.y * TS; } else { const p = a.portals.find(p => p.to === AI + Math.sign(ob.a - AI)); if (p) { tx = (p.x + p.w / 2) * TS; ty = (p.y + p.h / 2) * TS; } }
  if (tx !== undefined && dst(P.x, P.y, tx, ty) > 110) { const an = Math.atan2(ty - P.y, tx - P.x), ax = P.x - cam.x + Math.cos(an) * 46, ay = P.y - cam.y + Math.sin(an) * 46 + Math.sin(gt * 6) * 2; ctx.save(); ctx.translate(ax, ay); ctx.rotate(an); ctx.fillStyle = '#000a'; ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-6, -8); ctx.lineTo(-6, 8); ctx.fill(); ctx.fillStyle = '#ffd86b'; ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(-5, -6); ctx.lineTo(-5, 6); ctx.fill(); ctx.restore(); }
}
function drawEnemy(e) {
  const D = EN[e.type], x = e.x - cam.x, y = e.y - cam.y, fl = e.hurt > 0;
  if (e.type === 'baphome') { ctx.fillStyle = 'rgba(160,30,255,' + (.18 + .08 * Math.sin(gt * 5)) + ')'; ctx.beginPath(); ctx.arc(x, y, 70 + Math.sin(gt * 4) * 6, 0, 7); ctx.fill(); }
  if (e.type === 'baphome' && e.st === 'slam') { const R = e.hp < e.maxhp * .5 ? 160 : 130, p = clamp(e.sT / 1.1, 0, 1); ctx.strokeStyle = 'rgba(255,90,40,' + (.4 + .4 * p) + ')'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y, R, 0, 7); ctx.stroke(); ctx.fillStyle = 'rgba(255,90,40,' + .35 * p + ')'; ctx.beginPath(); ctx.arc(x, y, R * p, 0, 7); ctx.fill(); }
  if (e.type === 'guardian' && e.st === 'wind') { ctx.strokeStyle = 'rgba(255,60,60,.6)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + e.ax * 190, y + e.ay * 190); ctx.stroke(); ctx.fillStyle = 'rgba(255,40,40,' + (.2 + .3 * Math.abs(Math.sin(e.sT * 20))) + ')'; ctx.beginPath(); ctx.arc(x, y, 40, 0, 7); ctx.fill(); txt('!', x, y - 50, '#ff4a4a', 26, 'center'); }
  const moving = !D.boss || e.st === 'chase' || e.st === 'idle';
  drawSpr(D.spr, D.pal, D.sc, x, y, e.face < 0, fl, moving ? Math.sin(e.t * 10) * 1.5 : 0);
  if (!D.boss && e.hp < e.maxhp) { ctx.fillStyle = '#000'; ctx.fillRect(x - 12, y - e.hh - 12, 24, 4); ctx.fillStyle = '#ff4a4a'; ctx.fillRect(x - 11, y - e.hh - 11, 22 * e.hp / e.maxhp, 2); }
}
function drawHUD() {
  ctx.fillStyle = '#0d0820cc'; ctx.fillRect(6, 6, 222, 66); ctx.strokeStyle = '#6a4bd4'; ctx.lineWidth = 2; ctx.strokeRect(7, 7, 220, 64);
  txt('HP', 14, 22, '#ff8a8a', 11); bar(34, 13, 120, 10, P.hp, P.maxhp, '#e0384a', '#ff8a9a'); txt(P.hp + '/' + P.maxhp, 160, 22, '#fff', 11);
  txt('MP', 14, 38, '#8ac8ff', 11); bar(34, 29, 120, 10, P.mp, P.maxmp, '#2f7fe0', '#8ac8ff'); txt(Math.floor(P.mp) + '/' + P.maxmp, 160, 38, '#fff', 11);
  txt('NV ' + P.lvl, 14, 56, '#ffe34a', 11); bar(52, 49, 102, 8, P.xp, xpNeed(P.lvl), '#e0a020', '#ffe38a'); txt('ATQ ' + (P.atk + P.sword), 160, 56, '#ffb86a', 11);
  ctx.fillStyle = '#0d0820cc'; ctx.fillRect(VW - 190, 6, 184, 48); ctx.strokeStyle = '#6a4bd4'; ctx.strokeRect(VW - 189, 7, 182, 46);
  ctx.fillStyle = '#ffe34a'; ctx.fillRect(VW - 182, 15, 8, 8); txt('' + P.coins, VW - 168, 23, '#ffe34a', 13);
  ctx.fillStyle = '#e03060'; ctx.fillRect(VW - 110, 15, 8, 10); txt('x' + P.potions + ' [Q]', VW - 98, 23, '#ff9ab8', 12);
  for (let i = 0; i < 4; i++) { const x = VW - 162 + i * 38, y = 40; ctx.fillStyle = F.c[i] ? CRY_COL[i] : '#2a2236'; ctx.beginPath(); ctx.moveTo(x, y - 8); ctx.lineTo(x + 6, y); ctx.lineTo(x, y + 8); ctx.lineTo(x - 6, y); ctx.fill(); if (!F.c[i]) { ctx.strokeStyle = '#555'; ctx.lineWidth = 1; ctx.stroke(); } }
  const ob = objective(); ctx.fillStyle = '#0d0820cc'; ctx.fillRect(6, VH - 28, VW - 12, 22); ctx.strokeStyle = '#ffd86b'; ctx.lineWidth = 1; ctx.strokeRect(6.5, VH - 27.5, VW - 13, 21);
  txt('★ ' + ob.t, 14, VH - 12, '#ffd86b', 12); let q = ''; if (Q.bob === 1) q += 'Goblins ' + Math.min(Q.kb, 5) + '/5  '; if (Q.lyra === 1) q += 'Esqueletos ' + Math.min(Q.kl, 3) + '/3'; if (q) txt(q, VW - 14, VH - 12, '#9ad0ff', 12, 'right');
  const bs = enemies.find(e => EN[e.type].boss && e.alert);
  if (bs) { const w = 360, x = (VW - w) / 2, y = VH - 62; txt(EN[bs.type].n, VW / 2, y - 6, '#ff9ab8', 13, 'center'); bar(x, y, w, 14, bs.hp, bs.maxhp, '#c01840', '#ff6a8a'); }
  toasts.forEach((t, i) => { ctx.globalAlpha = clamp(t.l, 0, 1); ctx.fillStyle = '#000b'; ctx.font = 'bold 13px "Courier New",monospace'; const w = ctx.measureText(t.t).width + 20; ctx.fillRect(VW / 2 - w / 2, 80 + i * 26, w, 22); txt(t.t, VW / 2, 96 + i * 26, '#fff', 13, 'center'); }); ctx.globalAlpha = 1;
  if (banner) { ctx.globalAlpha = clamp(Math.min(banner.l, (3 - banner.l) * 3, 1), 0, 1); ctx.fillStyle = '#000a'; ctx.fillRect(0, 150, VW, 80); txt(banner.t, VW / 2, 192, '#ffd86b', 28, 'center'); if (banner.s) txt(banner.s, VW / 2, 216, '#c9b6ff', 14, 'center'); ctx.globalAlpha = 1; }
}
function draw() {
  if (state === 'title') { drawTitleBg(); return; }
  if (!P) return;
  drawWorld(); drawHUD();
  if (fade > 0) { ctx.fillStyle = 'rgba(0,0,0,' + fade + ')'; ctx.fillRect(0, 0, VW, VH); }
  if (state === 'dialog') {
    box(20, VH - 140, VW - 40, 118); ctx.fillStyle = '#6a4bd4'; ctx.fillRect(34, VH - 152, 190, 22); txt(dlg.n, 42, VH - 136, '#fff', 13);
    ctx.font = 'bold 15px "Courier New",monospace';
    const lines = wrap(dlg.l[dlg.i], VW - 90); let shown = Math.floor(dlg.c); ctx.font = 'bold 15px "Courier New",monospace';
    lines.forEach((ln, i) => { const s = ln.slice(0, Math.max(0, shown)); shown -= ln.length + 1; txt(s, 38, VH - 100 + i * 22, '#f3e9ff', 15); });
    if (dlg.c >= dlg.l[dlg.i].length) txt('▼ E', VW - 56, VH - 34, '#ffd86b', 13, 'center');
  }
  if (state === 'shop') {
    box(110, 90, 420, 250); txt('LOJA DA PIP', VW / 2, 124, '#ffd86b', 20, 'center'); txt('Moedas: ' + P.coins, VW / 2, 148, '#ffe34a', 14, 'center');
    SHOP.forEach((it, i) => { const c = it[1](), ok = P.coins >= c; txt((i + 1) + ') ' + it[0], 140, 190 + i * 40, ok ? '#fff' : '#888', 15); txt(c + ' $', 500, 190 + i * 40, ok ? '#ffe34a' : '#a77', 15, 'right'); });
    txt('Tecle 1, 2 ou 3 para comprar  •  E/ESC para sair', VW / 2, 320, '#c9b6ff', 12, 'center');
  }
  if (state === 'win' || state === 'winning') { ctx.fillStyle = 'rgba(255,255,255,' + (state === 'winning' ? Math.max(0, .5 - winT / 6) : .2) + ')'; ctx.fillRect(0, 0, VW, VH); }
  if (state === 'dead') { ctx.fillStyle = 'rgba(80,0,0,.5)'; ctx.fillRect(0, 0, VW, VH); }
}

/* ---------------- ENTRADA ---------------- */
function kn(e) { const k = e.key.toLowerCase(); return k === ' ' || k === 'spacebar' ? ' ' : k; }
window.addEventListener('keydown', e => { if (e.target && e.target.tagName === 'INPUT') return; const k = kn(e); if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault(); if (!e.repeat) pr[k] = true; keys[k] = true; });
window.addEventListener('keyup', e => { if (e.target && e.target.tagName === 'INPUT') return; keys[kn(e)] = false; });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
$('btnNew').onclick = () => { if (hasSave() && !confirm('Já existe um progresso salvo nesta conta. Um novo jogo vai substituí-lo quando o jogo salvar. Continuar?')) return; newGame(); };
$('btnCont').onclick = () => continueGame();
$('btnResume').onclick = () => { state = 'play'; $('pause').classList.add('hidden'); };
$('btnSave').onclick = () => save(true);
$('btnMenu').onclick = () => { save(); toTitle(); };
$('btnEnd').onclick = () => { if (state === 'dead') respawn(); else toTitle(); };

/* ---------------- CONTAS (login / cadastro) ---------------- */
const UK = 'eldoria_users', SK = 'eldoria_session';
let authMode = 'login';
function getUsers() { try { return JSON.parse(LS.get(UK)) || {}; } catch (e) { return {}; } }
function fbHash(data) {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let r = 0; r < 2000; r++) for (let i = 0; i < data.length; i++) { const c = data.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
  h1 = Math.imul(h1 ^ h1 >>> 16, 2246822507) ^ Math.imul(h2 ^ h2 >>> 13, 3266489909); h2 = Math.imul(h2 ^ h2 >>> 16, 2246822507) ^ Math.imul(h1 ^ h1 >>> 13, 3266489909);
  return 'f' + (h2 >>> 0).toString(16) + (h1 >>> 0).toString(16);
}
async function hashPw(salt, pw, stored) {
  const data = salt + ':' + pw;
  if (stored && stored[0] === 'f') return fbHash(data);
  try { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data)); return Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join(''); }
  catch (e) { return fbHash(data); }
}
function authMsg(t, ok) { const m = $('authMsg'); m.textContent = t || ''; m.className = 'msg' + (ok ? ' ok' : ''); }
function setMode(m) {
  authMode = m; const reg = m === 'reg';
  $('tabLogin').className = 'tab' + (reg ? '' : ' active'); $('tabReg').className = 'tab' + (reg ? ' active' : '');
  $('inPass2')[reg ? 'classList' : 'classList'][reg ? 'remove' : 'add']('hidden');
  $('btnAuth').textContent = reg ? 'CRIAR CONTA' : 'ENTRAR'; $('inPass').autocomplete = reg ? 'new-password' : 'current-password'; authMsg('');
}
function showAuthOrMenu() {
  if (USER) {
    $('auth').classList.add('hidden'); $('menu').classList.remove('hidden');
    $('welcome').textContent = 'Bem-vindo, ' + USER + '!';
    let info = 'Nenhum progresso salvo ainda.'; const raw = LS.get(saveKey());
    if (raw) { try { const sv = JSON.parse(raw); info = 'Nível ' + sv.P.lvl + '  •  ' + sv.F.c.filter(x => x).length + '/4 cristais  •  ' + sv.P.coins + ' moedas  •  ' + areas_name(sv.a); } catch (e) {} }
    $('saveInfo').textContent = info; $('btnCont').disabled = !hasSave();
  } else { $('menu').classList.add('hidden'); $('auth').classList.remove('hidden'); authMsg(''); }
}
const areas_name = i => AREA_NAMES[i] || '';
async function submitAuth(ev) {
  if (ev && ev.preventDefault) ev.preventDefault();
  const name = $('inUser').value.trim(), pw = $('inPass').value, users = getUsers(), key = name.toLowerCase();
  if (!/^[A-Za-z0-9_]{3,16}$/.test(name)) return authMsg('Usuário: 3 a 16 letras, números ou _');
  if (pw.length < 4) return authMsg('A senha precisa ter pelo menos 4 caracteres.');
  if (authMode === 'reg') {
    if (pw !== $('inPass2').value) return authMsg('As senhas não coincidem.');
    if (users[key]) return authMsg('Esse nome de usuário já existe.');
    const salt = Math.random().toString(36).slice(2) + Date.now().toString(36), first = Object.keys(users).length === 0;
    users[key] = { name, salt, hash: await hashPw(salt, pw) }; LS.set(UK, JSON.stringify(users)); USER = name;
    const old = LS.get('eldoria_save'); if (first && old) { LS.set(saveKey(), old); LS.del('eldoria_save'); }
  } else {
    const u = users[key];
    if (!u || (await hashPw(u.salt, pw, u.hash)) !== u.hash) return authMsg('Usuário ou senha incorretos.');
    USER = u.name;
  }
  LS.set(SK, USER); $('inUser').value = ''; $('inPass').value = ''; $('inPass2').value = ''; authMsg(''); showAuthOrMenu();
}
$('tabLogin').onclick = () => setMode('login');
$('tabReg').onclick = () => setMode('reg');
$('authForm').onsubmit = submitAuth;
$('btnLogout').onclick = () => { LS.del(SK); USER = null; setMode('login'); showAuthOrMenu(); };
{ const sn = LS.get(SK), u = sn && getUsers()[sn.toLowerCase()]; if (u) USER = u.name; }
toTitle(); requestAnimationFrame(loop);
window.__eldoria = { submitAuth, setMode, get USER() { return USER; },  get state() { return state; }, newGame, step, draw, get P() { return P; }, get F() { return F; }, get enemies() { return enemies; }, pr, keys, changeArea, get areas() { return areas; }, interactNpc, objective };
})();
