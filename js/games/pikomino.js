import { h } from '../dom.js';
import { hasExpansion, playerTabs, stepper } from '../components.js';

const worms = (tile) => (tile < 21 ? 1 : Math.ceil((tile - 20) / 4));
const BASE_TILES = Array.from({ length: 16 }, (_, k) => 21 + k);
const EXTRA_TILES = [11, 13]; // Extrawurm : uniquement avec un total exact, jamais volés

const tilesFor = (options) => (hasExpansion(options, 'extrawurm') ? [...EXTRA_TILES, ...BASE_TILES] : BASE_TILES);
const score = (data, i, options) => data.stacks[i].reduce((acc, t) => acc + worms(t), 0)
  + (hasExpansion(options, 'extrawurm') ? data.grilled[i] ?? 0 : 0);

export default {
  id: 'pikomino',
  name: 'Pikomino',
  icon: '🪱',
  color: '#65a30d',
  tagline: 'Vers sur les pickominos',
  minPlayers: 2,
  maxPlayers: 7,
  dice: { count: 8, sides: 6, labels: { 6: '🪱' } },
  expansions: [
    { key: 'extrawurm', name: 'Extension (Extrawurm)', description: 'Pickominos 11 et 13, vers grillés à +1' },
  ],

  init: (players) => ({ stacks: players.map(() => []), grilled: players.map(() => 0) }),

  render(root, ctx) {
    const { players, data, options } = ctx;
    const tabs = playerTabs(players, {
      label: (i) => [h('span', null, players[i]), h('strong', null, score(data, i, options))],
      renderPanel,
    });

    function owner(tile) {
      return data.stacks.findIndex((s) => s.includes(tile));
    }

    function renderPanel(i) {
      const stack = data.stacks[i];
      return h('div', { class: 'stack' },
        h('p', { class: 'muted small' }, 'Touchez un pickomino pour l’ajouter à la pile du joueur ou l’en retirer. Un pickomino volé passe d’une pile à l’autre.'),
        h('div', { class: 'piko-grid' }, tilesFor(options).map((tile) => {
          const o = owner(tile);
          return h('button', {
            type: 'button',
            class: `piko${o === i ? ' on' : ''}${o >= 0 && o !== i ? ' taken' : ''}`,
            title: o >= 0 && o !== i ? `Chez ${players[o]}` : '',
            onclick: () => {
              if (o === i) stack.splice(stack.indexOf(tile), 1);
              else {
                if (o >= 0) data.stacks[o].splice(data.stacks[o].indexOf(tile), 1);
                stack.push(tile);
              }
              ctx.save();
              tabs.refresh();
              tabs.rerender();
            },
          }, h('strong', null, tile), h('span', null, '🪱'.repeat(worms(tile))), o >= 0 && o !== i && h('small', null, players[o]));
        })),
        hasExpansion(options, 'extrawurm') && h('div', { class: 'counter-line' },
          h('span', { class: 'counter-label' }, '🔥 Vers grillés', h('small', null, '+1 ver chacun')),
          stepper(data.grilled[i] ?? 0, (v) => { data.grilled[i] = v; ctx.save(); tabs.refresh(); }, { min: 0, max: 7, label: 'Vers grillés' })),
        h('p', { class: 'muted small' }, `Pile : ${stack.length ? stack.join(', ') : 'vide'}`));
    }

    root.append(tabs.el, h('p', { class: 'muted small' }, 'La partie se termine quand il n’y a plus de pickomino visible sur la brochette.'));
  },

  results({ data, players, options }) {
    const scores = players.map((_, i) => score(data, i, options));
    const best = Math.max(...scores);
    const tied = scores.flatMap((s, i) => (s === best ? [i] : []));
    // Égalité : le joueur qui possède le pickomino le plus élevé gagne.
    const top = (i) => Math.max(0, ...data.stacks[i]);
    const bestTop = Math.max(...tied.map(top));
    return {
      scores,
      winners: tied.filter((i) => top(i) === bestTop),
      unit: 'vers',
      details: players.map((_, i) => data.stacks[i].slice().sort((a, b) => a - b).join(', ')),
    };
  },
};
