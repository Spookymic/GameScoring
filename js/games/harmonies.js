import { h } from '../dom.js';
import { hasExpansion, scoreGrid, sum } from '../components.js';

function categories(options) {
  const side = options.side ?? 'A';
  return [
    side === 'D'
      ? { key: 'trees', icon: '🌳', label: 'Arbres', hint: '2 / 4 / 9 selon la hauteur, 0 sur case sèche' }
      : { key: 'trees', icon: '🌳', label: 'Arbres', hint: '1 / 3 / 7 selon la hauteur' },
    { key: 'mountains', icon: '⛰️', label: 'Montagnes', hint: '1 / 3 / 7 si adjacente à une autre' },
    side === 'D'
      ? { key: 'fields', icon: '🌾', label: 'Champs', hint: '6 par champ de 2+ jetons touchant une case ordinaire' }
      : { key: 'fields', icon: '🌾', label: 'Champs', hint: '5 par champ de 2+ jetons' },
    side === 'C'
      ? { key: 'buildings', icon: '🏠', label: 'Bâtiments', hint: '8 si entouré de 4 couleurs' }
      : { key: 'buildings', icon: '🏠', label: 'Bâtiments', hint: '5 si entouré de 3 couleurs' },
    side === 'B'
      ? { key: 'water', icon: '🏝️', label: 'Îles', hint: '5 par île (au moins 1 île)' }
      : { key: 'water', icon: '💧', label: 'Rivière', hint: 'Plus longue : 0/2/5/8/11/15, +4 au-delà' },
    { key: 'animals', icon: '🦊', label: 'Cartes animaux', hint: 'Valeur de la plus haute case vide' },
    options.spirits && { key: 'spirit', icon: '✨', label: 'Esprit de la nature', hint: 'Si son cube a été posé' },
    hasExpansion(options, 'crescendo') && options.sanctuaries && { key: 'sanctuaries', icon: '⛩️', label: 'Sanctuaires', hint: '3 par case voisine de ses 2 couleurs' },
    hasExpansion(options, 'crescendo') && options.whispers && { key: 'whispers', icon: '🍃', label: 'Murmures', hint: '2 par cube seul, 5 avec un cube animal/esprit' },
  ].filter(Boolean);
}

// Ligne de départage, non comptée dans le total.
const TIEBREAK = { key: 'cubes', icon: '🟫', label: 'Cubes animaux posés', hint: 'Départage, non compté' };

const total = (sheet, cats) => sum(cats.map((c) => sheet[c.key]));

export default {
  id: 'harmonies',
  name: 'Harmonies',
  icon: '🌿',
  color: '#3f9b5b',
  tagline: 'Paysages et animaux',
  minPlayers: 1,
  maxPlayers: 4,
  expansions: [
    { key: 'pulse', name: 'Pulse', description: 'Nouvelles cartes animaux, décompte inchangé' },
    { key: 'crescendo', name: 'Crescendo', description: 'Faces C et D, modules Sanctuaires et Murmures' },
  ],
  options: [
    { key: 'side', type: 'choice', label: 'Face du plateau', default: 'A', choices: [
      { value: 'A', label: 'A : rivière' },
      { value: 'B', label: 'B : îles' },
      { value: 'C', label: 'C', requires: 'crescendo' },
      { value: 'D', label: 'D', requires: 'crescendo' },
    ] },
    { key: 'spirits', type: 'checkbox', label: 'Variante « Esprits de la nature »', default: false },
    { key: 'sanctuaries', type: 'checkbox', label: 'Module Sanctuaires', default: false, requires: 'crescendo' },
    { key: 'whispers', type: 'checkbox', label: 'Module Murmures', default: false, requires: 'crescendo' },
  ],

  init: (players) => players.map(() => ({})),

  render(root, ctx) {
    const cats = categories(ctx.options);
    const toRow = (c) => ({
      ...c,
      get: (i) => ctx.data[i][c.key] ?? 0,
      set: (i, v) => { ctx.data[i][c.key] = v; ctx.save(); },
    });
    root.append(scoreGrid({
      players: ctx.players,
      rows: [...cats, TIEBREAK].map(toRow),
      total: (i) => total(ctx.data[i], cats),
    }));
    if (['C', 'D'].includes(ctx.options.side)) {
      root.append(h('p', { class: 'muted small' }, ctx.options.side === 'C'
        ? 'Face C : la case centrale est inutilisable ; le reste se compte comme la face A.'
        : 'Face D : une case sèche devient ordinaire une fois adjacente à de l’eau.'));
    }
  },

  results({ data, options }) {
    const cats = categories(options);
    const scores = data.map((sheet) => total(sheet, cats));
    const best = Math.max(...scores);
    const tied = scores.flatMap((s, i) => (s === best ? [i] : []));
    const maxCubes = Math.max(...tied.map((i) => data[i].cubes ?? 0));
    return {
      scores,
      winners: tied.filter((i) => (data[i].cubes ?? 0) === maxCubes),
      details: data.map((sheet) => cats.map((c) => `${c.icon} ${sheet[c.key] ?? 0}`).join(' · ')),
    };
  },
};
