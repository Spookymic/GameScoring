// Persistance locale (localStorage) : joueurs connus et leurs profils, jeux favoris, historique et partie en cours.
const KEY = 'gamescoring:v1';
const empty = () => ({ players: [], profiles: {}, favorites: [], history: [], current: null });

let state = read();

function read() {
  try {
    return { ...empty(), ...JSON.parse(localStorage.getItem(KEY)) };
  } catch {
    return empty();
  }
}

function write() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Sauvegarde impossible', err);
  }
}

const renameIn = (names, from, to) => names.map((n) => (n === from ? to : n));

export const store = {
  get current() { return state.current; },
  get history() { return state.history; },
  get knownPlayers() { return state.players; },
  get favorites() { return state.favorites; },

  saveCurrent(game) {
    state.current = game;
    write();
  },
  clearCurrent() {
    state.current = null;
    write();
  },
  // Une partie modifiée garde son identifiant : elle remplace l'ancienne version au même endroit.
  addHistory(entry) {
    const k = state.history.findIndex((e) => e.id === entry.id);
    if (k >= 0) state.history[k] = entry; else state.history.unshift(entry);
    write();
  },
  removeHistory(id) {
    state.history = state.history.filter((e) => e.id !== id);
    write();
  },
  rememberPlayers(names) {
    state.players = [...names, ...state.players.filter((n) => !names.includes(n))].slice(0, 60);
    write();
  },

  // ---- joueurs
  // Tous les noms connus : liste rapide, profils et historique.
  allPlayers() {
    const names = new Set([...state.players, ...Object.keys(state.profiles), ...state.history.flatMap((e) => e.players)]);
    return [...names].sort((a, b) => a.localeCompare(b, 'fr'));
  },
  profile(name) {
    return state.profiles[name] ?? {};
  },
  setProfile(name, patch) {
    state.profiles[name] = { ...state.profiles[name], ...patch };
    write();
  },
  // Renomme partout (historique, partie en cours, profils). Si le nouveau nom existe déjà, les deux joueurs fusionnent.
  // Refusé si les deux noms apparaissent dans une même partie.
  renamePlayer(from, to) {
    to = to.trim();
    if (!to || to === from) return { ok: true };
    const clash = [...state.history, state.current].some((e) => e && e.players.includes(from) && e.players.includes(to));
    if (clash) return { ok: false, reason: `« ${from} » et « ${to} » ont joué une même partie : impossible de les fusionner.` };
    for (const e of state.history) e.players = renameIn(e.players, from, to);
    if (state.current) state.current.players = renameIn(state.current.players, from, to);
    state.players = [...new Set(renameIn(state.players, from, to))];
    if (state.profiles[from]) {
      state.profiles[to] = { ...state.profiles[from], ...state.profiles[to] };
      delete state.profiles[from];
    }
    write();
    return { ok: true };
  },
  // Retire un joueur de la liste rapide et oublie son profil ; l'historique n'est pas touché.
  forgetPlayer(name) {
    state.players = state.players.filter((n) => n !== name);
    delete state.profiles[name];
    write();
  },

  // ---- jeux favoris
  isFavorite(gameId) {
    return state.favorites.includes(gameId);
  },
  toggleFavorite(gameId) {
    state.favorites = state.favorites.includes(gameId) ? state.favorites.filter((g) => g !== gameId) : [...state.favorites, gameId];
    write();
  },

  // ---- sauvegarde
  exportData() {
    return {
      app: 'gamescoring',
      version: 2,
      exportedAt: new Date().toISOString(),
      players: state.players,
      profiles: state.profiles,
      favorites: state.favorites,
      history: state.history,
    };
  },
  importData(data) {
    if (!Array.isArray(data?.history)) throw new Error('Fichier invalide');
    const known = new Set(state.history.map((e) => e.id));
    const added = data.history.filter((e) => e?.id && !known.has(e.id));
    state.history = [...state.history, ...added].sort((a, b) => b.endedAt - a.endedAt);
    state.players = [...new Set([...state.players, ...(data.players ?? [])])];
    state.profiles = { ...(data.profiles ?? {}), ...state.profiles };
    state.favorites = [...new Set([...state.favorites, ...(data.favorites ?? [])])];
    write();
    return added.length;
  },
};
