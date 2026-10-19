// Courbe de l'évolution des scores (cumul après chaque manche), en SVG, sans dépendance.
// Lignes de 2 px, points de 8 px entourés de la couleur du fond, légende toujours visible,
// noms écrits au bout des courbes jusqu'à 4 joueurs, infobulle au toucher, et vue en tableau.
import { h } from './dom.js';

const SVG = 'http://www.w3.org/2000/svg';
const W = 340;
const H = 190;
const PAD = { top: 12, right: 64, bottom: 24, left: 36 };
const LABEL_GAP = 12;

function s(tag, attrs = {}, ...children) {
  const el = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) el.setAttribute(k, v);
  el.append(...children);
  return el;
}

function niceTicks(min, max, count = 4) {
  if (min === max) { min -= 1; max += 1; }
  const raw = (max - min) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((v) => v >= raw);
  const start = Math.floor(min / step) * step;
  const ticks = [];
  for (let v = start; v <= max + step * 0.5; v += step) ticks.push(Math.round(v * 100) / 100);
  return ticks;
}

/**
 * @param {object} p
 * @param {string[]} p.names noms des joueurs
 * @param {string[]} p.colors couleur de chaque joueur (CSS)
 * @param {number[][]} p.points cumul de chaque joueur après chaque manche : points[manche][joueur]
 * @param {string} [p.unit]
 */
export function scoreChart({ names, colors, points, unit = 'pts', roundLabel = 'Manche' }) {
  if (points.length === 0) return h('p', { class: 'muted small' }, 'Le graphique apparaîtra après la première manche.');
  const series = [names.map(() => 0), ...points]; // on part de 0
  const all = series.flat();
  const ticks = niceTicks(Math.min(0, ...all), Math.max(...all));
  const yMin = ticks[0];
  const yMax = ticks.at(-1);
  const x = (k) => PAD.left + (k * (W - PAD.left - PAD.right)) / Math.max(1, series.length - 1);
  const y = (v) => PAD.top + ((yMax - v) * (H - PAD.top - PAD.bottom)) / (yMax - yMin || 1);

  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart-svg', role: 'img', 'aria-label': `Évolution des scores sur ${points.length} manche(s)` });

  // Grille et axes discrets
  for (const t of ticks) {
    svg.append(
      s('line', { x1: PAD.left, x2: W - PAD.right, y1: y(t), y2: y(t), class: 'chart-grid' }),
      s('text', { x: PAD.left - 6, y: y(t) + 3, 'text-anchor': 'end', class: 'chart-axis' }, String(t)));
  }
  const labelEvery = Math.ceil(series.length / 8);
  series.forEach((_, k) => {
    if (k % labelEvery === 0 || k === series.length - 1) {
      svg.append(s('text', { x: x(k), y: H - 6, 'text-anchor': 'middle', class: 'chart-axis' }, k === 0 ? 'Départ' : `${k}`));
    }
  });

  // Courbes et points
  names.forEach((_, i) => {
    const d = series.map((row, k) => `${k ? 'L' : 'M'}${x(k).toFixed(1)},${y(row[i]).toFixed(1)}`).join(' ');
    svg.append(s('path', { d, class: 'chart-line', style: `stroke:${colors[i]}` }));
    series.forEach((row, k) => {
      if (k === 0) return;
      svg.append(s('circle', { cx: x(k), cy: y(row[i]), r: 4, class: 'chart-dot', style: `fill:${colors[i]}` }));
    });
  });

  // Noms au bout des courbes (jusqu'à 4 joueurs), écartés pour ne pas se chevaucher
  if (names.length <= 4) {
    const last = series.at(-1);
    const placed = names.map((name, i) => ({ name, i, y: y(last[i]) })).sort((a, b) => a.y - b.y);
    for (let k = 1; k < placed.length; k++) placed[k].y = Math.max(placed[k].y, placed[k - 1].y + LABEL_GAP);
    for (const p of placed) {
      svg.append(s('text', { x: x(series.length - 1) + 8, y: p.y + 4, class: 'chart-label' }, `${p.name.slice(0, 9)} ${last[p.i]}`));
    }
  }

  // Infobulle : ligne verticale + valeurs de la manche la plus proche
  const cross = s('line', { y1: PAD.top, y2: H - PAD.bottom, class: 'chart-cross', visibility: 'hidden' });
  const hit = s('rect', { x: PAD.left - 10, y: 0, width: W - PAD.left - PAD.right + 20, height: H, fill: 'transparent' });
  svg.append(cross, hit);
  const tip = h('div', { class: 'chart-tip', hidden: true });
  const wrap = h('div', { class: 'chart-wrap' }, svg, tip);

  const show = (ev) => {
    const box = svg.getBoundingClientRect();
    const vx = ((ev.clientX - box.left) / box.width) * W;
    const k = Math.max(0, Math.min(series.length - 1, Math.round(((vx - PAD.left) / (W - PAD.left - PAD.right)) * (series.length - 1))));
    cross.setAttribute('x1', x(k));
    cross.setAttribute('x2', x(k));
    cross.setAttribute('visibility', 'visible');
    const rows = names.map((name, i) => ({ name, value: series[k][i], color: colors[i] })).sort((a, b) => b.value - a.value);
    tip.replaceChildren(h('strong', null, k === 0 ? 'Départ' : `${roundLabel} ${k}`),
      ...rows.map((r) => h('div', { class: 'chart-tip-row' }, h('span', { class: 'swatch', style: `background:${r.color}` }), h('span', { class: 'grow' }, r.name), h('strong', null, `${r.value}`))));
    tip.hidden = false;
    const left = (x(k) / W) * box.width;
    tip.style.left = `${Math.min(Math.max(0, left - 70), box.width - 150)}px`;
  };
  const hide = () => { tip.hidden = true; cross.setAttribute('visibility', 'hidden'); };
  hit.addEventListener('pointermove', show);
  hit.addEventListener('pointerdown', show);
  hit.addEventListener('pointerleave', hide);

  const legend = names.length >= 2 && h('div', { class: 'chart-legend' }, names.map((name, i) => h('span', { class: 'chart-legend-item' },
    h('span', { class: 'swatch', style: `background:${colors[i]}` }), name)));

  const table = h('details', { class: 'chart-table' }, h('summary', null, 'Voir en tableau'),
    h('div', { class: 'grid-wrap' }, h('table', { class: 'grid' },
      h('thead', null, h('tr', null, h('th', null), names.map((n) => h('th', null, n)))),
      h('tbody', null, points.map((row, k) => h('tr', null, h('th', { scope: 'row' }, `${roundLabel} ${k + 1}`), row.map((v) => h('td', { class: 'total' }, v))))))));

  return h('div', { class: 'chart' }, legend, wrap, h('p', { class: 'muted small' }, `Cumul en ${unit} après chaque ${roundLabel.toLowerCase()}.`), table);
}
