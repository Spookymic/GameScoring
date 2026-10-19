// Couleurs et avatars des joueurs.
import { store } from './store.js';
import { PLAYER_COLORS } from './components.js';

// 8 couleurs validées pour le daltonisme, dans un ordre fixe (variables CSS --p1 à --p8, claires et sombres).
export const COLOR_SLOTS = Array.from({ length: 8 }, (_, k) => `var(--p${k + 1})`);

export const AVATARS = ['😀', '😎', '🤓', '🥳', '🤠', '🧐', '😺', '🐶', '🦊', '🐼', '🐸', '🦁', '🐯', '🐙', '🦄', '🐲',
  '👑', '🧙', '🧚', '🦸', '🥷', '🧑‍🚀', '🤖', '👻', '🎃', '🌵', '🍀', '🌸', '🔥', '⭐', '🍕', '🎲'];

export const avatarOf = (name) => store.profile(name).avatar ?? '';
export const label = (name) => (avatarOf(name) ? `${avatarOf(name)} ${name}` : name);

// Couleurs d'une partie : chacun garde la couleur de son profil, les autres prennent les couleurs libres dans l'ordre.
// Deux joueurs d'une même partie n'ont jamais la même couleur (au-delà de 8 joueurs, les couleurs se répètent).
export function colorsFor(names) {
  const used = new Set();
  const colors = names.map((name) => {
    const slot = store.profile(name).color;
    if (Number.isInteger(slot) && !used.has(slot)) {
      used.add(slot);
      return slot;
    }
    return null;
  });
  let next = 0;
  return colors.map((slot) => {
    if (slot !== null) return COLOR_SLOTS[slot];
    while (used.has(next) && used.size < COLOR_SLOTS.length) next++;
    const free = next % COLOR_SLOTS.length;
    used.add(free);
    next++;
    return COLOR_SLOTS[free];
  });
}

// Les modules de jeu lisent PLAYER_COLORS[i] : on y place les couleurs des joueurs de la partie affichée.
export function applyPlayerColors(names) {
  PLAYER_COLORS.splice(0, PLAYER_COLORS.length, ...colorsFor(names));
  if (!PLAYER_COLORS.length) PLAYER_COLORS.push(...COLOR_SLOTS);
}
