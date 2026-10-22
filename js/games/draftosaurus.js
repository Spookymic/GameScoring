// Draftosaurus : calculateur du parc de chaque joueur (face été ou hiver), avec Marina et Aerial Show.
import { h } from '../dom.js';
import { hasExpansion, playerTabs, stepper, numInput, sum, winnersBy } from '../components.js';

const FOREST = [0, 2, 4, 8, 12, 18, 24]; // forêt des Similaires / bois Bien Ordonné
const PLAIN = [0, 1, 3, 6, 10, 15, 21]; // plaine des Différences
const PYRAMID = [0, 2, 4, 6, 10, 14, 21]; // pyramide (valeurs imprimées sur le plateau, à vérifier)

// Zones de chaque face : type 'count' (table ou multiplicateur), 'check' (points fixes si la condition est remplie).
const SIDES = {
  ete: [
    { key: 'forest', label: '🌲 Forêt des Similaires', hint: 'Une seule espèce : 2/4/8/12/18/24', type: 'count', max: 6, table: FOREST },
    { key: 'plain', label: '🌾 Plaine des Différences', hint: 'Espèces toutes différentes : 1/3/6/10/15/21', type: 'count', max: 6, table: PLAIN },
    { key: 'love', label: '💕 Prairie des Amoureux', hint: '5 par couple de même espèce', type: 'count', max: 3, per: 5, unit: 'couples' },
    { key: 'trio', label: '🌳 Trio des bois', hint: '7 avec exactement 3 dinos', type: 'count', max: 3, table: [0, 0, 0, 7] },
    { key: 'king', label: '👑 Roi de la Jungle', hint: '7 si personne n’a strictement plus de dinos de cette espèce', type: 'check', points: 7 },
    { key: 'island', label: '🏝️ Île du Solitaire', hint: '7 s’il est le seul de son espèce dans le parc', type: 'check', points: 7 },
  ],
  hiver: [
    { key: 'ordered', label: '🌲 Bois Bien Ordonné', hint: 'Deux espèces en alternance : 2/4/8/12/18/24', type: 'count', max: 6, table: FOREST },
    { key: 'bridge', label: '🌉 Pont des Amoureux', hint: '6 par couple de même espèce, un sur chaque rive', type: 'count', max: 3, per: 6, unit: 'couples' },
    { key: 'pyramid', label: '🔺 Pyramide', hint: 'Sans voisins identiques : 2/4/6/10/14/21', type: 'count', max: 6, table: PYRAMID },
    { key: 'view', label: '🔭 Point de vue', hint: '2 par dino de la même espèce chez le voisin de droite', type: 'count', max: 12, per: 2, unit: 'dinos' },
  ],
};
const COMMON = [
  { key: 'river', label: '🌊 Rivière', hint: '1 par dino', type: 'count', max: 12, per: 1, unit: 'dinos' },
  { key: 'trex', label: '🦖 Enclos avec un T. rex', hint: '+1 par enclos contenant au moins un T. rex', type: 'count', max: 8, per: 1, unit: 'enclos' },
];

const zones = (options) => [...SIDES[options.side === 'hiver' ? 'hiver' : 'ete'], ...COMMON];
function zoneScore(zone, value) {
  if (zone.type === 'check') return value ? zone.points : 0;
  if (zone.table) return zone.table[Math.min(value ?? 0, zone.table.length - 1)];
  return (value ?? 0) * zone.per;
}
function score(sheet, options) {
  return sum(zones(options).map((z) => zoneScore(z, sheet[z.key])))
    + (hasExpansion(options, 'marina') ? Number(sheet.marina) || 0 : 0)
    + (hasExpansion(options, 'aerial') ? Number(sheet.aerial) || 0 : 0);
}

export default {
  id: 'draftosaurus',
  name: 'Draftosaurus',
  icon: '🦕',
  color: '#16a34a',
  tagline: 'Parc à dinosaures, zones et rivière',
  minPlayers: 2,
  maxPlayers: 5,
  expansions: [
    { key: 'marina', name: 'Marina', description: 'Plésiosaures : points des tronçons de rivière' },
    { key: 'aerial', name: 'Aerial Show', description: 'Volière et ptérodactyles : points gagnés' },
  ],
  options: [
    { key: 'side', type: 'choice', label: 'Face du plateau', default: 'ete', choices: [
      { value: 'ete', label: '☀️ Été' },
      { value: 'hiver', label: '❄️ Hiver' },
    ] },
  ],

  init: (players) => players.map(() => ({})),

  render(root, ctx) {
    const { players, data, options } = ctx;
    const tabs = playerTabs(players, {
      label: (i) => [h('span', null, players[i]), h('strong', null, score(data[i], options))],
      renderPanel,
    });

    function renderPanel(i) {
      const sheet = data[i];
      const totalEl = h('strong', null, score(sheet, options));
      const changed = (out, zone) => {
        if (out) out.textContent = zoneScore(zone, sheet[zone.key]);
        totalEl.textContent = score(sheet, options);
        ctx.save();
        tabs.refresh();
      };
      return h('div', { class: 'stack' },
        zones(options).map((z) => {
          const out = h('strong', { class: 'district-value' }, zoneScore(z, sheet[z.key]));
          return h('div', { class: 'counter-line' },
            h('span', { class: 'counter-label' }, z.label, h('small', null, z.hint)),
            h('div', { class: 'zone-input' },
              z.type === 'check'
                ? h('input', { type: 'checkbox', class: 'big-check', checked: Boolean(sheet[z.key]), 'aria-label': z.label, onchange: (e) => { sheet[z.key] = e.target.checked; changed(out, z); } })
                : stepper(sheet[z.key] ?? 0, (v) => { sheet[z.key] = v; changed(out, z); }, { min: 0, max: z.max, label: z.label }),
              out));
        }),
        hasExpansion(options, 'marina') && h('div', { class: 'counter-line' },
          h('span', { class: 'counter-label' }, '🐋 Plésiosaures (Marina)', h('small', null, 'Valeur du tronçon de chaque plésiosaure')),
          h('div', { style: 'width:110px' }, numInput(sheet.marina, (v) => { sheet.marina = v; totalEl.textContent = score(sheet, options); ctx.save(); tabs.refresh(); }, { label: 'Points Marina' }))),
        hasExpansion(options, 'aerial') && h('div', { class: 'counter-line' },
          h('span', { class: 'counter-label' }, '🦅 Volière (Aerial Show)', h('small', null, 'Cases 3 et 7, ptérodactyles du voisin de gauche, bonus d’espèce')),
          h('div', { style: 'width:110px' }, numInput(sheet.aerial, (v) => { sheet.aerial = v; totalEl.textContent = score(sheet, options); ctx.save(); tabs.refresh(); }, { label: 'Points Aerial Show' }))),
        h('div', { class: 'counter-line' },
          h('span', { class: 'counter-label' }, 'T. rex dans tout le parc', h('small', null, 'Départage : le moins de T. rex gagne')),
          stepper(sheet.trexTotal ?? 0, (v) => { sheet.trexTotal = v; ctx.save(); }, { min: 0, max: 12, label: 'T. rex au total' })),
        h('div', { class: 'total-line' }, 'Total ', totalEl));
    }

    root.append(
      h('p', { class: 'muted small' }, options.side === 'hiver'
        ? 'Face hiver : le dino de la zone de quarantaine est déplacé avant le décompte. Chaque rive du pont compte comme un enclos pour le T. rex.'
        : 'Face été. À 2 joueurs, 4 manches où l’on place 3 dinos sur 6.'),
      tabs.el);
  },

  results({ data, options }) {
    const scores = data.map((sheet) => score(sheet, options));
    const tied = winnersBy(scores);
    const fewest = Math.min(...tied.map((i) => data[i].trexTotal ?? 0));
    return {
      scores,
      winners: tied.filter((i) => (data[i].trexTotal ?? 0) === fewest),
      details: data.map((sheet) => zones(options).map((z) => `${z.label.split(' ')[0]} ${zoneScore(z, sheet[z.key])}`).join(' · ')),
    };
  },
};
