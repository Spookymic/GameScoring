import { h } from '../dom.js';
import { banner, hasExpansion, playerTabs, stepper } from '../components.js';

const COLUMNS = 'ABCDEFGHIJKLMNO'.split('');
const FIRST = [5, 3, 3, 3, 2, 2, 2, 1, 2, 2, 2, 3, 3, 3, 5];
const LATER = [3, 2, 2, 2, 1, 1, 1, 0, 1, 1, 1, 2, 2, 2, 3];
const COLOURS = [
  { key: 'green', label: 'Vert', color: '#16a34a' },
  { key: 'yellow', label: 'Jaune', color: '#ca8a04' },
  { key: 'blue', label: 'Bleu', color: '#2563eb' },
  { key: 'pink', label: 'Rose', color: '#db2777' },
  { key: 'orange', label: 'Orange', color: '#ea580c' },
];
const JOKERS = 8;
const STAR_PENALTY = 2;

// État d'une colonne ou d'une couleur : 0 = non complétée, 1 = complétée en premier, 2 = complétée plus tard.
const next = (state) => (state + 1) % 3;

function score(sheet, options) {
  const columns = COLUMNS.reduce((acc, _, k) => acc + [0, FIRST[k], LATER[k]][sheet.columns[k] ?? 0], 0);
  const colours = COLOURS.reduce((acc, c) => acc + [0, 5, 3][sheet.colours[c.key] ?? 0], 0);
  const jokers = sheet.jokers ?? JOKERS;
  const stars = -STAR_PENALTY * (sheet.stars ?? 0);
  const extra = hasExpansion(options, 'encore2')
    ? (sheet.hearts ?? 0) + 5 * (sheet.rows ?? 0) + 2 * (sheet.specialDice ?? 0)
    : 0;
  return { columns, colours, jokers, stars, extra, total: columns + colours + jokers + stars + extra };
}

const coloursDone = (sheet) => COLOURS.filter((c) => sheet.colours[c.key]).length;

export default {
  id: 'encore',
  name: 'Encore !',
  icon: '🖍️',
  color: '#db2777',
  tagline: 'Colonnes, couleurs, jokers et étoiles',
  minPlayers: 1,
  maxPlayers: 6,
  expansions: [
    { key: 'encore2', name: 'Encore et encore !', description: 'Cœurs, lignes complétées (5 pts), dés spéciaux inutilisés (2 pts)' },
    { key: 'blocks', name: 'Blocs de feuilles I à VI', description: 'Nouvelles feuilles, décompte inchangé' },
  ],

  init: (players) => players.map(() => ({ columns: [], colours: {}, jokers: JOKERS, stars: 0 })),

  render(root, ctx) {
    const { players, data, options } = ctx;
    const endBanner = h('div');
    const tabs = playerTabs(players, {
      label: (i) => [h('span', null, players[i]), h('strong', null, score(data[i], options).total)],
      renderPanel,
    });

    function changed() {
      ctx.save();
      tabs.refresh();
      tabs.rerender();
      checkEnd();
    }

    function checkEnd() {
      const ended = data.some((sheet) => coloursDone(sheet) >= 2);
      endBanner.replaceChildren(ended
        ? banner('Un joueur a complété 2 couleurs : la partie s’arrête après ce lancer.', h('button', { type: 'button', class: 'btn small primary', onclick: () => ctx.finish() }, 'Terminer'))
        : '');
    }

    function renderPanel(i) {
      const sheet = data[i];
      const s = score(sheet, options);
      const counter = (key, label, hint, max, fallback = 0) => h('div', { class: 'counter-line' },
        h('span', { class: 'counter-label' }, label, h('small', null, hint)),
        stepper(sheet[key] ?? fallback, (v) => { sheet[key] = v; changed(); }, { min: 0, max, label }));
      return h('div', { class: 'stack' },
        h('h3', { class: 'section-title' }, 'Colonnes complétées'),
        h('p', { class: 'muted small' }, 'Touchez une colonne : 1er à la compléter (valeur haute), puis plus tard (valeur basse), puis annuler.'),
        h('div', { class: 'enc-columns' }, COLUMNS.map((letter, k) => {
          const state = sheet.columns[k] ?? 0;
          return h('button', {
            type: 'button',
            class: `enc-col${state === 1 ? ' first' : ''}${state === 2 ? ' later' : ''}`,
            onclick: () => { sheet.columns[k] = next(state); changed(); },
          }, h('strong', null, letter), h('span', null, state === 1 ? FIRST[k] : state === 2 ? LATER[k] : `${FIRST[k]}/${LATER[k]}`));
        })),
        h('h3', { class: 'section-title' }, 'Couleurs complétées'),
        h('div', { class: 'enc-colours' }, COLOURS.map((c) => {
          const state = sheet.colours[c.key] ?? 0;
          return h('button', {
            type: 'button',
            class: `enc-colour${state ? ' done' : ''}`,
            style: `--row:${c.color}`,
            onclick: () => { sheet.colours[c.key] = next(state); changed(); },
          }, c.label, h('strong', null, ['—', '5', '3'][state]));
        })),
        counter('jokers', '❗ Jokers non utilisés', '+1 chacun', JOKERS, JOKERS),
        counter('stars', '⭐ Étoiles non cochées', `−${STAR_PENALTY} chacune`, 15),
        hasExpansion(options, 'encore2') && h('div', { class: 'stack' },
          counter('hearts', '❤️ Bonus cœurs', 'Somme des cases cœur sous les colonnes', 100),
          counter('rows', '➖ Lignes complétées', '5 pts chacune', 7),
          counter('specialDice', '🎲 Dés spéciaux non utilisés', '2 pts chacun', 10)),
        h('div', { class: 'total-line' },
          h('span', { class: 'qsum neutral' }, `Col. ${s.columns}`),
          h('span', { class: 'qsum neutral' }, `Coul. ${s.colours}`),
          h('span', { class: 'qsum neutral' }, `❗ ${s.jokers}`),
          h('span', { class: 'qsum penalty' }, `⭐ ${s.stars}`),
          s.extra > 0 && h('span', { class: 'qsum neutral' }, `+${s.extra}`),
          ' = ', h('strong', null, s.total)));
    }

    checkEnd();
    root.append(endBanner, tabs.el);
  },

  results({ data, options }) {
    const scores = data.map((sheet) => score(sheet, options).total);
    const best = Math.max(...scores);
    const tied = scores.flatMap((s, i) => (s === best ? [i] : []));
    // Égalité : le plus de jokers non utilisés.
    const jokers = (i) => data[i].jokers ?? JOKERS;
    const maxJokers = Math.max(...tied.map(jokers));
    return {
      scores,
      winners: tied.filter((i) => jokers(i) === maxJokers),
      details: data.map((sheet) => {
        const s = score(sheet, options);
        return `Col. ${s.columns} · Coul. ${s.colours} · ❗ ${s.jokers} · ⭐ ${s.stars}${s.extra ? ` · +${s.extra}` : ''}`;
      }),
    };
  },
};
