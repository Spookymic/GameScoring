// Star Wars: Unlimited : on suit les dégâts sur la base de chaque joueur.
// Une base est détruite quand ses dégâts atteignent ses PV. En Twin Suns (3-4 joueurs), la partie s'arrête
// dès qu'une base tombe et le joueur dont la base a le plus de PV restants gagne.
import { h } from '../dom.js';
import { banner, PLAYER_COLORS, winnersBy } from '../components.js';

const DEFAULT_HP = 30;

const remaining = (data, i) => data.hp[i] - data.damage[i];
const destroyed = (data, i) => remaining(data, i) <= 0;

export default {
  id: 'swu',
  name: 'Star Wars: Unlimited',
  icon: '🌌',
  color: '#facc15',
  tagline: 'Dégâts sur les bases',
  minPlayers: 2,
  maxPlayers: 4,
  showBest: false,
  options: [
    { key: 'hp', type: 'number', label: 'PV des bases', default: DEFAULT_HP, hint: 'Valeur imprimée sur la base ; modifiable ensuite pour chaque joueur' },
  ],

  init: (players, options) => ({
    hp: players.map(() => Number(options.hp) || DEFAULT_HP),
    damage: players.map(() => 0),
    initiative: 0,
  }),

  render(root, ctx) {
    const { players, data } = ctx;
    const twinSuns = players.length > 2;
    const endBanner = h('div');
    const grid = h('div', { class: `counters-grid${players.length === 2 ? ' duel' : ''}` });
    const cards = players.map((_, i) => card(i));
    grid.append(...cards);
    root.append(endBanner,
      twinSuns && h('p', { class: 'muted small' }, 'Twin Suns : la partie s’arrête à la fin de la phase où une base est détruite ; la base avec le plus de PV restants gagne.'),
      grid);
    checkEnd();

    function update(i) {
      const next = card(i);
      cards[i].replaceWith(next);
      cards[i] = next;
    }

    function damage(i, d) {
      data.damage[i] = Math.max(0, data.damage[i] + d);
      ctx.save();
      update(i);
      checkEnd();
    }

    function checkEnd() {
      const fallen = players.filter((_, i) => destroyed(data, i));
      endBanner.replaceChildren(fallen.length
        ? banner(`💥 Base détruite : ${fallen.join(', ')}.`, h('button', { type: 'button', class: 'btn small primary', onclick: () => ctx.finish() }, 'Terminer'))
        : '');
    }

    function card(i) {
      const left = remaining(data, i);
      const tap = (d, text, label) => h('button', { type: 'button', class: 'life-tap', 'aria-label': label, onclick: () => damage(i, d) }, text);
      return h('section', { class: `life-card${destroyed(data, i) ? ' dead' : ''}`, style: `--accent:${PLAYER_COLORS[i % PLAYER_COLORS.length]}` },
        h('div', { class: 'life-name' }, players[i]),
        h('div', { class: 'base-tags' },
          h('button', {
            type: 'button',
            class: `chip small-chip${data.initiative === i ? ' on' : ''}`,
            title: 'Initiative',
            onclick: () => { data.initiative = i; ctx.save(); cards.forEach((_, k) => update(k)); },
          }, data.initiative === i ? '⭐ Initiative' : 'Initiative'),
          h('button', {
            type: 'button',
            class: 'chip small-chip',
            title: 'PV de la base',
            onclick: () => {
              const value = Number(prompt(`PV de la base de ${players[i]} :`, data.hp[i]));
              if (!Number.isFinite(value) || value <= 0) return;
              data.hp[i] = Math.round(value);
              ctx.save();
              update(i);
              checkEnd();
            },
          }, `🛡️ ${data.hp[i]}`)),
        h('div', { class: 'life-main' },
          tap(1, '−', '1 dégât'),
          h('output', { class: 'life-value', title: 'PV restants' }, Math.max(0, left)),
          tap(-1, '+', 'Retirer 1 dégât')),
        h('p', { class: 'muted small center' }, `${data.damage[i]} dégât(s) sur ${data.hp[i]} PV`),
        h('div', { class: 'life-quick' }, tap(5, '−5', '5 dégâts'), tap(3, '−3', '3 dégâts')),
        twinSuns && h('button', {
          type: 'button',
          class: 'btn small',
          onclick: () => {
            // Jeton « blast » : 1 dégât à la base de chaque adversaire.
            players.forEach((_, j) => { if (j !== i) data.damage[j] += 1; });
            ctx.save();
            cards.forEach((_, k) => update(k));
            checkEnd();
          },
        }, '💥 Blast : 1 dégât à chaque adversaire'));
    }
  },

  results({ data, players }) {
    const left = players.map((_, i) => Math.max(0, remaining(data, i)));
    return {
      scores: left,
      winners: winnersBy(left),
      unit: 'PV',
      details: players.map((_, i) => (destroyed(data, i) ? 'base détruite' : `${data.damage[i]} dégât(s)`)),
    };
  },
};
