// Carcassonne : on enregistre chaque évaluation (pendant la partie et à la fin) ; l'appli calcule les points.
// À égalité de majorité, chaque joueur concerné marque la totalité des points.
import { h } from '../dom.js';
import { cumulate, hasExpansion, PLAYER_COLORS, stepper, winnersBy } from '../components.js';

const TRACK = 50;

// Calcul des points d'une évaluation. `end` = décompte de fin de partie (éléments inachevés).
function featurePoints(d, options) {
  const inns = hasExpansion(options, 'inns');
  switch (d.type) {
    case 'road':
      if (d.end) return d.inn && inns ? 0 : d.tiles;
      return d.tiles * (d.inn && inns ? 2 : 1);
    case 'city': {
      const base = d.tiles + d.pennants;
      if (d.end) return d.cathedral && inns ? 0 : base;
      return base * (d.cathedral && inns ? 3 : 2);
    }
    case 'cloister':
      return d.end || d.abbot ? 1 + d.neighbours : 9;
    case 'field':
      return d.cities * (d.pig && hasExpansion(options, 'traders') ? 4 : 3);
    case 'goods':
      return 10;
    case 'fairy':
      return d.fairyBig ? 3 : 1;
    case 'custom':
      return d.custom;
    default:
      return 0;
  }
}

const TYPES = [
  { key: 'road', label: '🛣️ Route' },
  { key: 'city', label: '🏰 Ville' },
  { key: 'cloister', label: '⛪ Abbaye / jardin' },
  { key: 'field', label: '🌾 Pré', endOnly: true },
  { key: 'goods', label: '📦 Marchandises', expansion: 'traders', endOnly: true },
  { key: 'fairy', label: '🧚 Fée', expansion: 'princess' },
  { key: 'ransom', label: '🗼 Rançon', expansion: 'tower' },
  { key: 'custom', label: '✏️ Autre' },
];

const newDraft = (end = false) => ({ type: 'city', end, tiles: 3, pennants: 0, inn: false, cathedral: false, neighbours: 8, abbot: false, cities: 1, pig: false, fairyBig: false, custom: 0, who: [], payer: null, captor: null });

function eventPoints(e, n) {
  const pts = Array(n).fill(0);
  if (e.type === 'ransom') {
    pts[e.payer] -= 3;
    pts[e.captor] += 3;
  } else {
    for (const i of e.who) pts[i] += e.points;
  }
  return pts;
}

const totals = (data, n) => Array.from({ length: n }, (_, i) => data.events.reduce((acc, e) => acc + eventPoints(e, n)[i], 0));

export default {
  id: 'carcassonne',
  name: 'Carcassonne',
  icon: '🏰',
  color: '#0369a1',
  tagline: 'Routes, villes, abbayes et prés',
  minPlayers: 2,
  maxPlayers: 6,
  expansions: [
    { key: 'inns', name: 'Auberges et Cathédrales', description: 'Auberge : route ×2, cathédrale : ville ×3 (0 si inachevées)' },
    { key: 'traders', name: 'Marchands et Bâtisseurs', description: 'Marchandises : 10 par majorité, cochon : 4 par ville' },
    { key: 'princess', name: 'Princesse et Dragon', description: 'Fée : +1 en début de tour, +3 à l’évaluation' },
    { key: 'tower', name: 'La Tour', description: 'Rançon : 3 points du payeur au joueur qui libère' },
  ],

  init: () => ({ events: [], draft: newDraft() }),

  render(root, ctx) {
    const { players, data, options } = ctx;
    const n = players.length;
    data.draft ??= newDraft();
    draw();

    function draw() {
      const d = data.draft;
      const scores = totals(data, n);
      const types = TYPES.filter((t) => (!t.expansion || hasExpansion(options, t.expansion)) && (!t.endOnly || d.end));
      if (!types.some((t) => t.key === d.type)) d.type = 'city';
      const points = featurePoints(d, options);
      const ransom = d.type === 'ransom';
      const valid = ransom ? d.payer !== null && d.captor !== null && d.payer !== d.captor : d.who.length > 0;

      const set = (patch) => { Object.assign(data.draft, patch); ctx.save(); draw(); };
      const count = (key, label, max, hint) => h('div', { class: 'counter-line' },
        h('span', { class: 'counter-label' }, label, hint && h('small', null, hint)),
        stepper(d[key], (v) => set({ [key]: v }), { min: 0, max, label }));
      const check = (key, label) => h('label', { class: 'check' },
        h('input', { type: 'checkbox', checked: d[key], onchange: (e) => set({ [key]: e.target.checked }) }), h('span', null, label));
      const pick = (label, key, multi) => h('div', { class: 'stack' },
        h('span', { class: 'small muted' }, label),
        h('div', { class: 'chips' }, players.map((p, i) => {
          const on = multi ? d.who.includes(i) : d[key] === i;
          return h('button', {
            type: 'button',
            class: `chip${on ? ' on' : ''}`,
            onclick: () => (multi
              ? set({ who: on ? d.who.filter((k) => k !== i) : [...d.who, i] })
              : set({ [key]: on ? null : i })),
          }, p);
        })));

      const params = {
        road: [count('tiles', 'Tuiles de la route', 40), hasExpansion(options, 'inns') && check('inn', '🍺 Avec une auberge')],
        city: [count('tiles', 'Tuiles de la ville', 40), count('pennants', 'Blasons', 20),
          hasExpansion(options, 'inns') && check('cathedral', '⛪ Avec une cathédrale')],
        cloister: [!d.end && check('abbot', 'Abbé retiré avant la fin (compté comme inachevé)'),
          (d.end || d.abbot) && count('neighbours', 'Tuiles autour', 8, '1 + 1 par tuile voisine')],
        field: [count('cities', 'Villes achevées bordant le pré', 30, `${d.pig && hasExpansion(options, 'traders') ? 4 : 3} pts chacune`),
          hasExpansion(options, 'traders') && check('pig', '🐖 Avec un cochon (4 par ville)')],
        goods: [h('p', { class: 'muted small' }, '10 points par type de marchandise (vin, blé, tissu) au(x) joueur(s) majoritaire(s).')],
        fairy: [check('fairyBig', 'Évaluation d’un élément avec la fée (+3) — sinon début de tour (+1)')],
        ransom: [pick('Qui paie la rançon ?', 'payer', false), pick('Qui libère son prisonnier contre la rançon ?', 'captor', false)],
        custom: [count('custom', 'Points', 200)],
      }[d.type];

      const preview = !valid
        ? 'Choisissez le ou les joueurs.'
        : ransom
          ? `${players[d.payer]} −3, ${players[d.captor]} +3`
          : `+${points} pour ${d.who.map((i) => players[i]).join(', ')}`;

      root.replaceChildren(...[
        h('div', { class: 'tabs' }, players.map((p, i) => h('div', { class: 'tab', style: `border-top:4px solid ${PLAYER_COLORS[i % PLAYER_COLORS.length]}` },
          h('span', null, p), h('strong', null, scores[i]),
          h('small', { class: 'muted' }, `piste ${((scores[i] % TRACK) + TRACK) % TRACK}${scores[i] >= TRACK ? ` · ${Math.floor(scores[i] / TRACK)} tour(s)` : ''}`)))),

        h('section', { class: 'card stack' },
          h('div', { class: 'segmented' }, [[false, 'Pendant la partie'], [true, 'Fin de partie']].map(([value, label]) => h('label', null,
            h('input', { type: 'radio', name: 'carc-phase', checked: d.end === value, onchange: () => set({ end: value }) }),
            h('span', null, label)))),
          h('div', { class: 'chips' }, types.map((t) => h('button', { type: 'button', class: `chip${d.type === t.key ? ' on' : ''}`, onclick: () => set({ type: t.key }) }, t.label))),
          params,
          !ransom && pick(d.type === 'fairy' ? 'Joueur avec la fée' : 'Joueur(s) majoritaire(s) — à égalité, tous marquent', 'who', true),
          h('p', { class: 'turn-preview' }, preview),
          h('button', { type: 'button', class: 'btn primary block', disabled: !valid, onclick: () => {
            const label = TYPES.find((t) => t.key === d.type).label;
            data.events.push({ type: d.type, label, end: d.end, points, who: [...d.who], payer: d.payer, captor: d.captor });
            data.draft = { ...newDraft(d.end), type: d.type };
            ctx.save();
            draw();
          } }, 'Ajouter')),

        data.events.length > 0 && h('section', { class: 'card stack' },
          h('h3', { class: 'section-title' }, `Évaluations (${data.events.length})`),
          h('ol', { class: 'event-log', reversed: true }, data.events.slice().reverse().slice(0, 12).map((e) => h('li', null,
            e.type === 'ransom'
              ? `${e.label} : ${players[e.payer]} −3, ${players[e.captor]} +3`
              : `${e.label}${e.end ? ' (fin)' : ''} : +${e.points} ${e.who.map((i) => players[i]).join(', ')}`))),
          h('button', { type: 'button', class: 'btn ghost', onclick: () => {
            data.events.pop();
            ctx.save();
            draw();
          } }, '↶ Annuler la dernière évaluation')),
        h('p', { class: 'muted small' }, 'Fin de partie : route inachevée 1/tuile, ville inachevée 1/tuile + 1/blason, abbaye 1 + tuiles voisines, pré 3 par ville achevée.'),
      ].filter(Boolean));
    }
  },

  timeline: ({ data, players }) => ({ points: cumulate(data.events.map((e) => eventPoints(e, players.length))), roundLabel: 'Évaluation' }),

  results({ data, players }) {
    const scores = totals(data, players.length);
    return { scores, winners: winnersBy(scores), details: players.map((_, i) => `${data.events.filter((e) => e.who?.includes(i)).length} évaluation(s)`) };
  },
};
