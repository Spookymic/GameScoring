import { h } from '../dom.js';
import { banner, PLAYER_COLORS } from '../components.js';

const DEFAULT_TARGET = 20;
const ALT_TARGET = 25; // Format Coconut, ou effet « Les adversaires ont besoin de 25 lore »

export default {
  id: 'lorcana',
  name: 'Lorcana',
  icon: '✨',
  color: '#6366f1',
  tagline: 'Premier à 20 (ou 25) de lore',
  minPlayers: 2,
  maxPlayers: 4,
  showBest: false,
  options: [
    { key: 'target', type: 'choice', label: 'Lore pour gagner', default: '20', choices: [
      { value: '20', label: 'Standard (20)' },
      { value: '25', label: 'Format Coconut (25)' },
    ] },
  ],

  init: (players, options) => ({ lore: players.map(() => 0), targets: players.map(() => Number(options.target ?? DEFAULT_TARGET)) }),

  render(root, ctx) {
    const { players, data } = ctx;
    data.targets ??= players.map(() => DEFAULT_TARGET);
    const winBanner = h('div');
    const grid = h('div', { class: `counters-grid${players.length === 2 ? ' duel' : ''}` });
    const cards = players.map((_, i) => card(i));
    grid.append(...cards);
    root.append(winBanner, grid);
    checkWin();

    function change(i, d) {
      data.lore[i] = Math.max(0, data.lore[i] + d);
      ctx.save();
      const next = card(i);
      cards[i].replaceWith(next);
      cards[i] = next;
      checkWin();
    }

    function checkWin() {
      const winners = players.filter((_, i) => data.lore[i] >= data.targets[i]);
      winBanner.replaceChildren(winners.length
        ? banner(`🏆 ${winners.join(', ')} a atteint son objectif de lore !`, h('button', { type: 'button', class: 'btn small primary', onclick: () => ctx.finish() }, 'Terminer'))
        : '');
    }

    function card(i) {
      const lore = data.lore[i];
      const target = data.targets[i];
      const tap = (d, text) => h('button', { type: 'button', class: 'life-tap', 'aria-label': `${d > 0 ? '+' : ''}${d} lore`, onclick: () => change(i, d) }, text);
      return h('section', { class: `life-card${lore >= target ? ' won' : ''}`, style: `--accent:${PLAYER_COLORS[i % PLAYER_COLORS.length]}` },
        h('div', { class: 'life-name' }, h('span', { class: 'grow' }, players[i]),
          h('button', {
            type: 'button',
            class: 'chip small-chip',
            title: 'Objectif de lore de ce joueur',
            onclick: () => {
              data.targets[i] = target === DEFAULT_TARGET ? ALT_TARGET : DEFAULT_TARGET;
              change(i, 0);
            },
          }, `🎯 ${target}`)),
        h('div', { class: 'life-main' }, tap(-1, '−'), h('output', { class: 'life-value' }, lore), tap(1, '+')),
        h('div', { class: 'progress', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': target, 'aria-valuenow': lore },
          h('span', { style: `width:${Math.min(100, (lore / target) * 100)}%` })),
        h('div', { class: 'life-quick' }, tap(2, '+2'), tap(3, '+3')));
    }
  },

  results({ data }) {
    const targets = data.targets ?? data.lore.map(() => DEFAULT_TARGET);
    const reached = data.lore.flatMap((l, i) => (l >= targets[i] ? [i] : []));
    const best = Math.max(...data.lore);
    return {
      scores: data.lore,
      winners: reached.length ? reached : data.lore.flatMap((l, i) => (l === best ? [i] : [])),
      unit: 'lore',
    };
  },
};
