// Persistance locale (localStorage) : joueurs connus, historique et partie en cours.
const KEY = 'gamescoring:v1';
const empty = () => ({ players: [], history: [], current: null });

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

export const store = {
  get current() { return state.current; },
  get history() { return state.history; },
  get knownPlayers() { return state.players; },

  saveCurrent(game) {
    state.current = game;
    write();
  },
  clearCurrent() {
    state.current = null;
    write();
  },
  addHistory(entry) {
    state.history.unshift(entry);
    write();
  },
  removeHistory(id) {
    state.history = state.history.filter((e) => e.id !== id);
    write();
  },
  rememberPlayers(names) {
    state.players = [...names, ...state.players.filter((n) => !names.includes(n))].slice(0, 40);
    write();
  },
  forgetPlayer(name) {
    state.players = state.players.filter((n) => n !== name);
    write();
  },

  exportData() {
    return { app: 'gamescoring', version: 1, exportedAt: new Date().toISOString(), players: state.players, history: state.history };
  },
  importData(data) {
    if (!Array.isArray(data?.history)) throw new Error('Fichier invalide');
    const known = new Set(state.history.map((e) => e.id));
    const added = data.history.filter((e) => e?.id && !known.has(e.id));
    state.history = [...state.history, ...added].sort((a, b) => b.endedAt - a.endedAt);
    state.players = [...new Set([...state.players, ...(data.players ?? [])])];
    write();
    return added.length;
  },
};
