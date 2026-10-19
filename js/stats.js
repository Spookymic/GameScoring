// Calculs des statistiques à partir de l'historique des parties.

// Classement d'une partie : gagnants d'abord, puis par score ; deux joueurs à égalité partagent le même rang.
export function ranking(entry) {
  const rows = entry.players.map((name, i) => ({
    name,
    i,
    score: entry.scores[i],
    winner: entry.winners.includes(i),
    detail: entry.details?.[i],
  }));
  rows.sort((a, b) => (b.winner - a.winner) || (entry.lowerWins ? a.score - b.score : b.score - a.score));
  rows.forEach((r, k) => {
    const prev = rows[k - 1];
    r.rank = prev && prev.score === r.score && prev.winner === r.winner ? prev.rank : k + 1;
  });
  return rows;
}

const rankOf = (entry, name) => ranking(entry).find((r) => r.name === name)?.rank;
const chronological = (entries) => [...entries].sort((a, b) => a.endedAt - b.endedAt);

/**
 * Bilan par joueur sur un ensemble de parties : parties, victoires, record, meilleure série de victoires,
 * série en cours, rang moyen.
 */
export function playerStats(entries) {
  const byPlayer = new Map();
  for (const e of chronological(entries)) {
    const ranks = ranking(e);
    e.players.forEach((name, i) => {
      const s = byPlayer.get(name) ?? { name, played: 0, wins: 0, best: null, streak: 0, bestStreak: 0, rankSum: 0 };
      const won = e.winners.includes(i);
      s.played += 1;
      s.wins += won ? 1 : 0;
      s.streak = won ? s.streak + 1 : 0;
      s.bestStreak = Math.max(s.bestStreak, s.streak);
      s.rankSum += ranks.find((r) => r.i === i).rank;
      const score = e.scores[i];
      if (s.best === null || (e.lowerWins ? score < s.best : score > s.best)) s.best = score;
      byPlayer.set(name, s);
    });
  }
  return [...byPlayer.values()]
    .map((s) => ({ ...s, rate: s.wins / s.played, avgRank: s.rankSum / s.played }))
    .sort((a, b) => b.wins - a.wins || b.rate - a.rate || a.avgRank - b.avgRank);
}

/** Face-à-face : sur les parties jouées ensemble, qui a fini devant l'autre ? */
export function headToHead(entries, a, b) {
  const result = { a: 0, b: 0, draws: 0, games: new Map() };
  for (const e of entries) {
    if (!e.players.includes(a) || !e.players.includes(b)) continue;
    const ra = rankOf(e, a);
    const rb = rankOf(e, b);
    const g = result.games.get(e.gameId) ?? { a: 0, b: 0, draws: 0 };
    const key = ra < rb ? 'a' : rb < ra ? 'b' : 'draws';
    result[key] += 1;
    g[key] += 1;
    result.games.set(e.gameId, g);
  }
  return result;
}
