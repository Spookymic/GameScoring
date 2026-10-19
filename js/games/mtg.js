import { h } from '../dom.js';
import { PLAYER_COLORS, stepper } from '../components.js';

const POISON_LIMIT = 10;
const COMMANDER_LIMIT = 21;

// Brawl : 25 points de vie en duel, 30 en multijoueur, sans dégâts de commandant.
function startingLife(format, count) {
  if (format === 'commander') return 40;
  if (format === 'brawl') return count === 2 ? 25 : 30;
  return 20;
}

const isDead = (data, i) => data.life[i] <= 0 || data.poison[i] >= POISON_LIMIT || data.cmd[i].some((d) => d >= COMMANDER_LIMIT);

export default {
  id: 'mtg',
  name: 'Magic: The Gathering',
  icon: '🧙',
  color: '#f97316',
  tagline: 'Points de vie, poison, commandant',
  minPlayers: 2,
  maxPlayers: 6,
  showBest: false,
  options: [
    { key: 'format', type: 'choice', label: 'Format', default: 'classic', choices: [
      { value: 'classic', label: 'Classique (20)' },
      { value: 'commander', label: 'Commander (40)' },
      { value: 'brawl', label: 'Brawl (25 / 30)' },
    ] },
  ],

  init: (players, options) => ({
    life: players.map(() => startingLife(options.format, players.length)),
    poison: players.map(() => 0),
    // cmd[i][j] : dégâts de commandant infligés au joueur i par le commandant du joueur j
    cmd: players.map(() => players.map(() => 0)),
  }),

  render(root, ctx) {
    const { players, data } = ctx;
    const commander = ctx.options.format === 'commander';
    const openCommander = new Set();
    const delta = players.map(() => 0);
    const timers = [];

    const grid = h('div', { class: `counters-grid${players.length === 2 ? ' duel' : ''}` });
    const cards = players.map((_, i) => card(i));
    grid.append(...cards);
    root.append(grid);

    function update(i) {
      const next = card(i);
      cards[i].replaceWith(next);
      cards[i] = next;
    }

    function changeLife(i, d) {
      data.life[i] += d;
      delta[i] += d;
      clearTimeout(timers[i]);
      timers[i] = setTimeout(() => { delta[i] = 0; update(i); }, 1500);
      ctx.save();
      update(i);
    }

    function card(i) {
      const tap = (d, text) => h('button', { type: 'button', class: 'life-tap', 'aria-label': `${d > 0 ? '+' : ''}${d} PV`, onclick: () => changeLife(i, d) }, text);
      return h('section', { class: `life-card${isDead(data, i) ? ' dead' : ''}`, style: `--accent:${PLAYER_COLORS[i % PLAYER_COLORS.length]}` },
        h('div', { class: 'life-name' }, players[i], isDead(data, i) && h('span', { class: 'tag' }, 'Éliminé')),
        delta[i] !== 0 && h('span', { class: 'delta' }, `${delta[i] > 0 ? '+' : ''}${delta[i]}`),
        h('div', { class: 'life-main' }, tap(-1, '−'), h('output', { class: 'life-value' }, data.life[i]), tap(1, '+')),
        h('div', { class: 'life-quick' }, tap(-5, '−5'), tap(5, '+5')),
        h('div', { class: 'counter-line' }, h('span', null, '☠️ Poison'),
          stepper(data.poison[i], (v) => { data.poison[i] = v; ctx.save(); update(i); }, { min: 0, max: POISON_LIMIT, label: 'Poison' })),
        commander && h('details', {
          class: 'commander',
          open: openCommander.has(i),
          ontoggle: (e) => (e.target.open ? openCommander.add(i) : openCommander.delete(i)),
        },
        h('summary', null, `⚔️ Dégâts de commandant (max ${Math.max(...data.cmd[i])})`),
        players.map((name, j) => j !== i && h('div', { class: 'counter-line' }, h('span', null, name),
          stepper(data.cmd[i][j], (v) => {
            // Les dégâts de commandant font aussi perdre des points de vie.
            const d = v - data.cmd[i][j];
            data.cmd[i][j] = v;
            changeLife(i, -d);
          }, { min: 0, label: `Commandant de ${name}` })))));
    }
  },

  results({ data, players }) {
    const alive = players.flatMap((_, i) => (isDead(data, i) ? [] : [i]));
    const pool = alive.length ? alive : players.map((_, i) => i);
    const best = Math.max(...pool.map((i) => data.life[i]));
    return {
      scores: data.life,
      winners: pool.filter((i) => data.life[i] === best),
      unit: 'PV',
      details: players.map((_, i) => [
        isDead(data, i) && 'éliminé',
        data.poison[i] > 0 && `☠️ ${data.poison[i]}`,
        Math.max(...data.cmd[i]) > 0 && `⚔️ ${Math.max(...data.cmd[i])}`,
      ].filter(Boolean).join(' · ')),
    };
  },
};
