import { h } from '../dom.js';
import { hasExpansion, playerTabs, stepper, sum } from '../components.js';

const DISTRICTS = [
  { key: 'houses', label: 'Habitations', icon: '🏠', color: '#3b82f6', hint: 'Seul le plus grand groupe d’habitations adjacentes compte.', variant: 'Variante : tout compte double si le groupe vaut 10 ou plus.' },
  { key: 'markets', label: 'Marchés', icon: '🏪', color: '#eab308', hint: 'Seuls les marchés sans marché adjacent comptent.', variant: 'Variante : double s’il touche une place Marché.' },
  { key: 'barracks', label: 'Casernes', icon: '🛡️', color: '#ef4444', hint: 'Seules les casernes en bordure de la cité comptent.', variant: 'Variante : double avec 3 ou 4 cases vides voisines.' },
  { key: 'temples', label: 'Temples', icon: '🏛️', color: '#a855f7', hint: 'Seuls les temples entièrement entourés comptent.', variant: 'Variante : double s’il est construit en hauteur.' },
  { key: 'gardens', label: 'Jardins', icon: '🌳', color: '#22c55e', hint: 'Tous les jardins comptent.', variant: 'Variante : double s’il touche un lac.' },
];

const variantOn = (options, key) => Boolean(options[`variant_${key}`]);
// Quartiers « doublés » (en hauteur) : ils comptent une seconde fois.
const districtScore = (sheet, key, options) => (sheet.stars[key] ?? 0)
  * ((sheet.districts[key] ?? 0) + (variantOn(options, key) ? sheet.doubled?.[key] ?? 0 : 0));
const stoneValue = (sheet, options) => (hasExpansion(options, 'athena') && sheet.statue ? 5 : 1);
const total = (sheet, options) => sum(DISTRICTS.map((d) => districtScore(sheet, d.key, options))) + sheet.stones * stoneValue(sheet, options);

export default {
  id: 'akropolis',
  name: 'Akropolis',
  icon: '🏛️',
  color: '#8b5cf6',
  tagline: 'Places × quartiers + pierres',
  minPlayers: 2,
  maxPlayers: 4,
  expansions: [
    { key: 'athena', name: 'Athena', description: 'Statue complétée : 5 points par pierre' },
  ],
  options: DISTRICTS.map((d) => ({ key: `variant_${d.key}`, type: 'checkbox', label: `Variante ${d.label}`, default: false })),

  init: (players) => players.map(() => ({ stars: {}, districts: {}, doubled: {}, stones: 0, statue: false })),

  render(root, ctx) {
    const { options } = ctx;
    const tabs = playerTabs(ctx.players, {
      label: (i) => [h('span', null, ctx.players[i]), h('strong', null, total(ctx.data[i], options))],
      renderPanel,
    });

    function renderPanel(i) {
      const sheet = ctx.data[i];
      sheet.doubled ??= {};
      const totalEl = h('strong', null, total(sheet, options));
      const stonesHint = h('p', { class: 'muted small' });
      const refreshStones = () => {
        const v = stoneValue(sheet, options);
        stonesHint.textContent = `${v} point${v > 1 ? 's' : ''} par pierre ; les pierres départagent les égalités.`;
      };
      const changed = () => {
        ctx.save();
        totalEl.textContent = total(sheet, options);
        refreshStones();
        tabs.refresh();
      };

      const panel = h('div', { class: 'stack' },
        DISTRICTS.map((d) => {
          const value = h('strong', { class: 'district-value' }, districtScore(sheet, d.key, options));
          const update = (field) => (v) => {
            sheet[field][d.key] = v;
            value.textContent = districtScore(sheet, d.key, options);
            changed();
          };
          return h('section', { class: 'card district', style: `--accent:${d.color}` },
            h('div', { class: 'district-head' }, h('span', null, `${d.icon} ${d.label}`), value),
            h('p', { class: 'muted small' }, d.hint, variantOn(options, d.key) && h('span', { class: 'block' }, d.variant)),
            h('div', { class: 'field-row' },
              h('label', null, '★ Étoiles des places', stepper(sheet.stars[d.key] ?? 0, update('stars'), { min: 0, label: 'Étoiles' })),
              h('label', null, 'Quartiers (hauteur)', stepper(sheet.districts[d.key] ?? 0, update('districts'), { min: 0, label: 'Quartiers' })),
              variantOn(options, d.key) && h('label', null, 'Dont doublés (hauteur)', stepper(sheet.doubled[d.key] ?? 0, update('doubled'), { min: 0, label: 'Doublés' }))));
        }),
        h('section', { class: 'card district', style: '--accent:#9ca3af' },
          h('div', { class: 'district-head' }, h('span', null, '🪨 Pierres'),
            stepper(sheet.stones, (v) => { sheet.stones = v; changed(); }, { min: 0, label: 'Pierres' })),
          hasExpansion(options, 'athena') && h('label', { class: 'check' },
            h('input', { type: 'checkbox', checked: sheet.statue, onchange: (e) => { sheet.statue = e.target.checked; changed(); } }),
            h('span', null, '🗿 Statue d’Athéna complétée')),
          stonesHint),
        h('div', { class: 'total-line' }, 'Total ', totalEl),
        h('p', { class: 'muted small' }, 'Un quartier posé au niveau 2 compte pour 2, au niveau 3 pour 3…'));
      refreshStones();
      return panel;
    }

    root.append(tabs.el);
  },

  results({ data, options }) {
    const scores = data.map((sheet) => total(sheet, options));
    const best = Math.max(...scores);
    const tied = scores.flatMap((s, i) => (s === best ? [i] : []));
    const maxStones = Math.max(...tied.map((i) => data[i].stones));
    return {
      scores,
      winners: tied.filter((i) => data[i].stones === maxStones),
      details: data.map((sheet) => [
        ...DISTRICTS.map((d) => `${d.icon} ${districtScore(sheet, d.key, options)}`),
        `🪨 ${sheet.stones * stoneValue(sheet, options)}`,
      ].join(' · ')),
    };
  },
};
