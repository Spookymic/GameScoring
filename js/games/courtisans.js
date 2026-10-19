import { h } from '../dom.js';
import { hasExpansion, playerTabs, stepper, sum, winnersBy } from '../components.js';

const FAMILIES = [
  { key: 'stag', label: 'Cerfs', icon: '🦌' },
  { key: 'toad', label: 'Crapauds', icon: '🐸' },
  { key: 'butterfly', label: 'Papillons', icon: '🦋' },
  { key: 'carp', label: 'Carpes', icon: '🐟' },
  { key: 'nightingale', label: 'Rossignols', icon: '🐦' },
  { key: 'hare', label: 'Lièvres', icon: '🐇' },
];
const STATUSES = [
  { value: 1, label: '☀️ Lumière' },
  { value: 0, label: 'Neutre' },
  { value: -1, label: '🌑 Disgrâce' },
];
const MISSION_POINTS = 3;

const score = (data, i) => sum(FAMILIES.map((f) => (data.status[f.key] ?? 0) * (data.domains[i][f.key] ?? 0)))
  + MISSION_POINTS * (data.missions[i] ?? 0);

// Mode équipes (Diplomates & Confidents) : équipes de 2 joueurs consécutifs, score d'équipe = le plus faible des deux.
const teamMode = (options, count) => hasExpansion(options, 'diplomates') && options.teams && count % 2 === 0;
const teams = (count) => Array.from({ length: count / 2 }, (_, t) => [2 * t, 2 * t + 1]);

export default {
  id: 'courtisans',
  name: 'Courtisans',
  icon: '👑',
  color: '#b45309',
  tagline: 'Familles dans la lumière ou en disgrâce',
  minPlayers: 2,
  maxPlayers: 5,
  maxPlayersFor: (options) => (hasExpansion(options, 'diplomates') ? 6 : 5),
  expansions: [
    { key: 'diplomates', name: 'Diplomates & Confidents', description: 'Jusqu’à 6 joueurs, mode équipes' },
  ],
  options: [
    { key: 'teams', type: 'checkbox', label: 'Mode équipes (4 ou 6 joueurs : 1 & 2, 3 & 4, 5 & 6)', default: false, requires: 'diplomates' },
  ],

  init: (players) => ({ status: {}, domains: players.map(() => ({})), missions: players.map(() => 0) }),

  render(root, ctx) {
    const { players, data, options } = ctx;
    const tabs = playerTabs(players, {
      label: (i) => [h('span', null, players[i]), h('strong', null, score(data, i))],
      renderPanel,
    });
    const teamBox = h('div');
    const refreshTeams = () => {
      if (!teamMode(options, players.length)) return;
      teamBox.replaceChildren(h('div', { class: 'tabs' }, teams(players.length).map(([a, b]) => h('div', { class: 'tab' },
        h('span', null, `${players[a]} & ${players[b]}`),
        h('strong', null, Math.min(score(data, a), score(data, b)))))));
    };
    const changed = () => { ctx.save(); tabs.refresh(); refreshTeams(); };

    function renderPanel(i) {
      const domain = data.domains[i];
      return h('div', { class: 'stack' },
        h('p', { class: 'muted small' }, 'Cartes de chaque famille dans le domaine du joueur (un noble compte pour 2).'),
        h('div', { class: 'calc-grid' }, FAMILIES.map((f) => h('div', { class: 'calc-item' },
          h('span', { class: 'counter-label' }, `${f.icon} ${f.label}`),
          stepper(domain[f.key] ?? 0, (v) => { domain[f.key] = v; changed(); }, { min: 0, max: 30, label: f.label })))),
        h('div', { class: 'counter-line' },
          h('span', { class: 'counter-label' }, '📜 Missions secrètes réussies', h('small', null, `+${MISSION_POINTS} chacune`)),
          stepper(data.missions[i] ?? 0, (v) => { data.missions[i] = v; changed(); }, { min: 0, max: 2, label: 'Missions' })));
    }

    root.append(
      h('h3', { class: 'section-title' }, 'Table de la reine'),
      h('p', { class: 'muted small' }, 'Révélez les espions, puis comparez les cartes au-dessus et au-dessous du tapis (nobles × 2).'),
      h('div', { class: 'stack' }, FAMILIES.map((f) => h('div', { class: 'family-row' },
        h('span', null, `${f.icon} ${f.label}`),
        h('div', { class: 'segmented' }, STATUSES.map((s) => h('label', null,
          h('input', { type: 'radio', name: `status-${f.key}`, checked: (data.status[f.key] ?? 0) === s.value, onchange: () => {
            data.status[f.key] = s.value;
            changed();
            tabs.rerender();
          } }),
          h('span', null, s.label))))))),
      teamBox,
      h('h3', { class: 'section-title' }, 'Domaines'),
      tabs.el);
    refreshTeams();
  },

  results({ data, players, options }) {
    const scores = players.map((_, i) => score(data, i));
    const details = players.map((_, i) => `📜 ${data.missions[i] ?? 0} mission(s)`);
    if (!teamMode(options, players.length)) return { scores, winners: winnersBy(scores), details };
    // Équipes : le plus faible score de l'équipe compte ; en cas d'égalité, on compare le meilleur coéquipier.
    const ranked = teams(players.length).map((members) => ({
      members,
      low: Math.min(...members.map((i) => scores[i])),
      high: Math.max(...members.map((i) => scores[i])),
    }));
    const bestLow = Math.max(...ranked.map((t) => t.low));
    const tied = ranked.filter((t) => t.low === bestLow);
    const bestHigh = Math.max(...tied.map((t) => t.high));
    return {
      scores,
      winners: tied.filter((t) => t.high === bestHigh).flatMap((t) => t.members),
      details: players.map((_, i) => {
        const team = ranked.find((t) => t.members.includes(i));
        return `${details[i]} · équipe ${team.low}`;
      }),
    };
  },
};
