// Agricola : Les Fermiers de la Lande – La Big Box (2 joueurs).
// Score = animaux (1 pt chacun) + bonus par espèce + 4 par extension de ferme complète + points des bâtiments.
import { h } from '../dom.js';
import { playerTabs, stepper, numInput, sum } from '../components.js';

// Bonus par espèce : tranches [min, max, points], puis à partir du seuil t : 3 + 1 par animal au-delà.
const ANIMALS = [
  { key: 'sheep', label: 'Moutons', icon: '🐑', bands: [[0, 3, -3], [4, 7, 0], [8, 10, 1], [11, 12, 2]], t: 13 },
  { key: 'pigs', label: 'Cochons', icon: '🐖', bands: [[0, 3, -3], [4, 6, 0], [7, 8, 1], [9, 10, 2]], t: 11 },
  { key: 'cows', label: 'Vaches', icon: '🐄', bands: [[0, 3, -3], [4, 5, 0], [6, 7, 1], [8, 9, 2]], t: 10 },
  { key: 'horses', label: 'Chevaux', icon: '🐎', bands: [[0, 3, -3], [4, 4, 0], [5, 6, 1], [7, 8, 2]], t: 9 },
];
const EXPANSION_POINTS = 4;
const STALL_POINTS = 1;
const STABLE_POINTS = 4;

export function animalBonus(animal, n) {
  if (n >= animal.t) return 3 + (n - animal.t);
  return animal.bands.find(([min, max]) => n >= min && n <= max)[2];
}

function score(sheet) {
  const animals = sum(ANIMALS.map((a) => sheet[a.key]));
  const bonus = sum(ANIMALS.map((a) => animalBonus(a, sheet[a.key] ?? 0)));
  const expansions = EXPANSION_POINTS * (sheet.expansions ?? 0);
  const buildings = STALL_POINTS * (sheet.stalls ?? 0) + STABLE_POINTS * (sheet.stables ?? 0) + (Number(sheet.otherBuildings) || 0);
  return { animals, bonus, expansions, buildings, total: animals + bonus + expansions + buildings };
}

export default {
  id: 'agricola2',
  name: 'Agricola 2 joueurs',
  icon: '🐑',
  color: '#a16207',
  tagline: 'Les Fermiers de la Lande – Big Box',
  minPlayers: 2,
  maxPlayers: 2,

  init: (players) => ({ sheets: players.map(() => ({})), firstPlayer: 0 }),

  render(root, ctx) {
    const { players, data } = ctx;
    const tabs = playerTabs(players, {
      label: (i) => [h('span', null, players[i]), h('strong', null, score(data.sheets[i]).total)],
      renderPanel,
    });

    function renderPanel(i) {
      const sheet = data.sheets[i];
      const summary = h('div', { class: 'total-line' });
      const bonusCells = {};
      const refresh = () => {
        const s = score(sheet);
        ANIMALS.forEach((a) => {
          const b = animalBonus(a, sheet[a.key] ?? 0);
          bonusCells[a.key].textContent = `${sheet[a.key] ?? 0} pt + bonus ${b > 0 ? '+' : ''}${b}`;
        });
        summary.replaceChildren(
          h('span', { class: 'qsum neutral' }, `🐾 ${s.animals}`),
          h('span', { class: 'qsum neutral' }, `Bonus ${s.bonus}`),
          h('span', { class: 'qsum neutral' }, `🏡 ${s.expansions}`),
          h('span', { class: 'qsum neutral' }, `🏠 ${s.buildings}`),
          ' = ', h('strong', null, s.total));
        ctx.save();
        tabs.refresh();
      };
      const line = (label, hint, control) => h('div', { class: 'counter-line' },
        h('span', { class: 'counter-label' }, label, hint && h('small', null, hint)), control);

      const panel = h('div', { class: 'stack' },
        h('h3', { class: 'section-title' }, 'Animaux'),
        ANIMALS.map((a) => {
          bonusCells[a.key] = h('small');
          return h('div', { class: 'counter-line' },
            h('span', { class: 'counter-label' }, `${a.icon} ${a.label}`, bonusCells[a.key]),
            stepper(sheet[a.key] ?? 0, (v) => { sheet[a.key] = v; refresh(); }, { min: 0, max: 40, label: a.label }));
        }),
        h('p', { class: 'muted small' }, 'Les animaux de l’Enclos ne comptent pas. Moins de 4 animaux d’une espèce : −3.'),
        h('h3', { class: 'section-title' }, 'Ferme'),
        line('🏡 Extensions de ferme complètes', `${EXPANSION_POINTS} pts chacune (3 cases utilisées)`,
          stepper(sheet.expansions ?? 0, (v) => { sheet.expansions = v; refresh(); }, { min: 0, max: 5, label: 'Extensions' })),
        line('Stalles', `${STALL_POINTS} pt chacune`,
          stepper(sheet.stalls ?? 0, (v) => { sheet.stalls = v; refresh(); }, { min: 0, max: 5, label: 'Stalles' })),
        line('Étables', `${STABLE_POINTS} pts chacune`,
          stepper(sheet.stables ?? 0, (v) => { sheet.stables = v; refresh(); }, { min: 0, max: 5, label: 'Étables' })),
        line('🏠 Bâtiments spéciaux', 'Points imprimés et formules (½ point et négatif possibles)',
          h('div', { style: 'width:110px' }, numInput(sheet.otherBuildings, (v) => { sheet.otherBuildings = v; refresh(); }, { label: 'Points des bâtiments spéciaux' }))),
        h('details', { class: 'muted small' }, h('summary', null, 'Bâtiments à formule'),
          h('ul', null,
            h('li', null, 'Entrepôt : ½ point par bois, pierre ou roseau en réserve'),
            h('li', null, 'Stalle à cochons : 4 avec 13 cochons ou plus ; Stalle à vaches : 4 avec 11 vaches ou plus'),
            h('li', null, 'Maison de rondins : 4 avec 4 bois ou plus en réserve'),
            h('li', null, 'Réserve de nourriture : 3 avec 5 auges ou plus ; Domaine : 3 avec 5 bâtiments spéciaux ou plus'),
            h('li', null, 'Bureau : 6 − 2 par bâtiment de la rangée du haut ; Manoir : 7 − 2 par bâtiment de la rangée du bas'),
            h('li', null, 'Agrandissement et Cour : 2 par bâtiment adjacent ; Tailleur de pierre : 2 par pierre posée dessus'),
            h('li', null, 'Intendance : −3'))),
        summary);
      queueMicrotask(refresh);
      return panel;
    }

    root.append(
      h('div', { class: 'stack' },
        h('span', { class: 'small muted' }, 'Premier joueur au 1er tour (en cas d’égalité, l’autre joueur gagne) :'),
        h('div', { class: 'chips' }, players.map((p, i) => h('button', {
          type: 'button',
          class: `chip${data.firstPlayer === i ? ' on' : ''}`,
          onclick: (e) => {
            data.firstPlayer = i;
            ctx.save();
            e.target.parentElement.querySelectorAll('.chip').forEach((c, k) => c.classList.toggle('on', k === i));
          },
        }, p)))),
      tabs.el);
  },

  results({ data, players }) {
    const scores = data.sheets.map((sheet) => score(sheet).total);
    const best = Math.max(...scores);
    const tied = scores.flatMap((s, i) => (s === best ? [i] : []));
    // Égalité : le joueur qui n'était pas premier joueur au premier tour gagne.
    const winners = tied.length > 1 ? tied.filter((i) => i !== data.firstPlayer) : tied;
    return {
      scores,
      winners,
      details: data.sheets.map((sheet) => {
        const s = score(sheet);
        return `🐾 ${s.animals} · bonus ${s.bonus} · 🏡 ${s.expansions} · 🏠 ${s.buildings}`;
      }),
    };
  },
};
