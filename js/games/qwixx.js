import { h } from '../dom.js';
import { banner, hasExpansion, playerTabs, stepper, sum } from '../components.js';

const asc = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const ROWS = [
  { key: 'red', label: 'Rouge', short: 'R', color: '#dc2626', numbers: asc, bonusRow: 'bonusTop' },
  { key: 'yellow', label: 'Jaune', short: 'J', color: '#ca8a04', numbers: asc, bonusRow: 'bonusTop' },
  { key: 'green', label: 'Vert', short: 'V', color: '#16a34a', numbers: [...asc].reverse(), bonusRow: 'bonusBottom' },
  { key: 'blue', label: 'Bleu', short: 'B', color: '#2563eb', numbers: [...asc].reverse(), bonusRow: 'bonusBottom' },
];
const PENALTY = 5;
const MAX_PENALTIES = 4;
const BIG_POINTS_MAX = 15; // Big Points : 15 croix maximum par couleur

// Le cadenas compte comme une croix supplémentaire.
const crosses = (sheet, key) => sheet[key].filter(Boolean).length + (sheet.locks[key] ? 1 : 0);
const points = (n) => (n * (n + 1)) / 2;
const lockedRows = (data) => new Set(ROWS.filter((r) => data.some((s) => s.locks[r.key])).map((r) => r.key));

// Big Points : chaque case bonus cochée compte pour les deux rangées voisines.
function rowCrosses(sheet, row, options) {
  const n = crosses(sheet, row.key);
  return hasExpansion(options, 'bigpoints') ? Math.min(BIG_POINTS_MAX, n + (sheet[row.bonusRow] ?? 0)) : n;
}

function score(sheet, options) {
  const rows = ROWS.map((r) => points(rowCrosses(sheet, r, options)));
  const bonus = hasExpansion(options, 'bonus');
  const doubled = bonus && sheet.bonusDouble ? Math.min(...rows) : 0;
  const plus = bonus && sheet.bonusPlus13 ? 13 : 0;
  const steps = hasExpansion(options, 'connected') ? points(sheet.steps ?? 0) : 0;
  const penalty = bonus && sheet.bonusNoPenalty ? 0 : PENALTY * sheet.penalties;
  return { rows, doubled, plus, steps, penalty, total: sum(rows) + doubled + plus + steps - penalty };
}

export default {
  id: 'qwixx',
  name: 'Qwixx',
  icon: '🎲',
  color: '#dc2626',
  tagline: 'Feuilles de score à cocher',
  minPlayers: 1,
  maxPlayers: 5,
  dice: { count: 6, sides: 6, colors: ['#ffffff', '#ffffff', '#dc2626', '#ca8a04', '#16a34a', '#2563eb'] },
  expansions: [
    { key: 'bigpoints', name: 'Big Points', description: 'Rangées bonus comptant pour les deux couleurs voisines (15 croix max)' },
    { key: 'bonus', name: 'Bonus (version B)', description: '×2 sur la rangée la plus faible, +13 points, pénalités annulées' },
    { key: 'connected', name: 'Connected (marches)', description: 'Les marches cochées forment une 5e ligne de score' },
  ],

  init: (players) => players.map(() => ({
    ...Object.fromEntries(ROWS.map((r) => [r.key, Array(r.numbers.length).fill(false)])),
    locks: {},
    penalties: 0,
  })),

  render(root, ctx) {
    const { options } = ctx;
    const endBanner = h('div');
    const tabs = playerTabs(ctx.players, {
      label: (i) => [h('span', null, ctx.players[i]), h('strong', null, score(ctx.data[i], options).total)],
      renderPanel,
    });

    function changed() {
      ctx.save();
      tabs.refresh();
      tabs.rerender();
      checkEnd();
    }

    function checkEnd() {
      const ended = lockedRows(ctx.data).size >= 2 || ctx.data.some((s) => s.penalties >= MAX_PENALTIES);
      endBanner.replaceChildren(ended
        ? banner('Fin de partie : 2 rangées fermées ou 4 pénalités.', h('button', { type: 'button', class: 'btn small primary', onclick: () => ctx.finish() }, 'Terminer'))
        : '');
    }

    function extras(sheet) {
      const bonusFlag = (key, label) => h('label', { class: 'check' },
        h('input', { type: 'checkbox', checked: Boolean(sheet[key]), onchange: (e) => { sheet[key] = e.target.checked; changed(); } }),
        h('span', null, label));
      const counter = (key, label, max) => h('div', { class: 'counter-line' }, h('span', null, label),
        stepper(sheet[key] ?? 0, (v) => { sheet[key] = v; changed(); }, { min: 0, max, label }));
      const items = [
        hasExpansion(options, 'bigpoints') && counter('bonusTop', '⭕ Bonus rouge / jaune', 11),
        hasExpansion(options, 'bigpoints') && counter('bonusBottom', '⭕ Bonus vert / bleu', 11),
        hasExpansion(options, 'connected') && counter('steps', '🪜 Marches cochées', 11),
        hasExpansion(options, 'bonus') && bonusFlag('bonusDouble', '×2 sur la rangée la plus faible'),
        hasExpansion(options, 'bonus') && bonusFlag('bonusPlus13', '+13 points'),
        hasExpansion(options, 'bonus') && bonusFlag('bonusNoPenalty', 'Pénalités à 0 point'),
      ].filter(Boolean);
      return items.length > 0 && h('section', { class: 'card stack' }, h('h3', { class: 'section-title' }, 'Extensions'), items);
    }

    function renderPanel(i) {
      const sheet = ctx.data[i];
      const closed = lockedRows(ctx.data);
      const s = score(sheet, options);
      return h('div', { class: 'qwixx' },
        ROWS.map((row, r) => {
          const cells = sheet[row.key];
          const last = cells.length - 1;
          const before = cells.slice(0, last).filter(Boolean).length;
          const n = rowCrosses(sheet, row, options);
          // Une rangée fermée (par n'importe quel joueur) n'accepte plus de nouvelle croix.
          // Exception : un autre joueur peut encore la fermer pendant le même lancer (dernier nombre + cadenas).
          // Retirer une croix reste possible pour corriger une erreur de saisie.
          const rowClosed = closed.has(row.key);
          const closedByOther = rowClosed && !sheet.locks[row.key];
          const closers = ctx.players.filter((_, j) => ctx.data[j].locks[row.key]);
          // On coche de gauche à droite : les nombres à gauche de la dernière croix sont perdus.
          const rightmost = cells.lastIndexOf(true);
          return h('div', { class: `qrow${closedByOther ? ' closed' : ''}`, style: `--row:${row.color}` },
            h('div', { class: 'qcells' },
              row.numbers.map((num, k) => h('button', {
                type: 'button',
                class: `qcell${cells[k] ? ' x' : ''}`,
                // Le dernier nombre n'est cochable qu'avec au moins 5 croix dans la rangée.
                disabled: !cells[k] && (k < rightmost || (k === last ? before < 5 : rowClosed)),
                'aria-pressed': String(cells[k]),
                'aria-label': `${row.label} ${num}`,
                onclick: () => {
                  if (k === last && !cells[k] && closedByOther) {
                    if (!confirm(`La rangée ${row.label.toLowerCase()} est déjà fermée par ${closers.join(', ')}.\n\nFermer aussi la rangée pour ${ctx.players[i]} ? Ce n’est permis que pendant le même lancer.`)) return;
                    sheet.locks[row.key] = true;
                  }
                  cells[k] = !cells[k];
                  if (k === last && !cells[k]) sheet.locks[row.key] = false;
                  changed();
                },
              }, num)),
              h('button', {
                type: 'button',
                class: `qcell lock${sheet.locks[row.key] ? ' x' : ''}`,
                disabled: !cells[last] || closedByOther,
                'aria-label': `Cadenas ${row.label}`,
                onclick: () => { sheet.locks[row.key] = !sheet.locks[row.key]; changed(); },
              }, '🔒')),
            h('div', { class: 'qpoints' }, `${n} croix → ${s.rows[r]} pts`));
        }),
        h('div', { class: 'qpenalties' },
          h('span', null, 'Pénalités (−5)'),
          h('div', { class: 'qpenalty-boxes' },
            Array.from({ length: MAX_PENALTIES }, (_, k) => h('button', {
              type: 'button',
              class: `qcell penalty${k < sheet.penalties ? ' x' : ''}`,
              'aria-label': `Pénalité ${k + 1}`,
              onclick: () => { sheet.penalties = sheet.penalties === k + 1 ? k : k + 1; changed(); },
            }, k < sheet.penalties ? '✕' : '')))),
        extras(sheet),
        h('div', { class: 'total-line' },
          ROWS.map((row, r) => h('span', { class: 'qsum', style: `--row:${row.color}` }, s.rows[r])),
          s.doubled > 0 && h('span', { class: 'qsum penalty' }, `×2 +${s.doubled}`),
          s.plus > 0 && h('span', { class: 'qsum penalty' }, `+${s.plus}`),
          s.steps > 0 && h('span', { class: 'qsum penalty' }, `🪜 +${s.steps}`),
          h('span', { class: 'qsum penalty' }, `−${s.penalty}`),
          ' = ', h('strong', null, s.total)));
    }

    checkEnd();
    root.append(endBanner, tabs.el);
  },

  results({ data, options }) {
    const scores = data.map((sheet) => score(sheet, options).total);
    const best = Math.max(...scores);
    return {
      scores,
      winners: scores.flatMap((s, i) => (s === best ? [i] : [])),
      details: data.map((sheet) => {
        const s = score(sheet, options);
        return [
          ...ROWS.map((r, k) => `${r.short} ${s.rows[k]}`),
          s.doubled && `×2 ${s.doubled}`,
          s.plus && `+${s.plus}`,
          s.steps && `🪜 ${s.steps}`,
          `−${s.penalty}`,
        ].filter(Boolean).join(' · ');
      }),
    };
  },
};
