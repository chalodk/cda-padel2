import type { Match, MatchSet, StandingsRow } from '@/types';

interface PairInfo {
  id: string;
  name: string;
  player1_name: string;
  player2_name: string;
}

export function calculateStandings(
  matches: Match[],
  sets: MatchSet[],
  pairs: PairInfo[]
): StandingsRow[] {
  const rows = new Map<string, StandingsRow>();

  for (const p of pairs) {
    rows.set(p.id, {
      pair_id: p.id,
      pair_name: p.name,
      player1_name: p.player1_name,
      player2_name: p.player2_name,
      matches_played: 0,
      matches_won: 0,
      matches_lost: 0,
      sets_won: 0,
      sets_lost: 0,
      games_won: 0,
      games_lost: 0,
      games_diff: 0,
      points: 0,
    });
  }

  const setsByMatch = new Map<string, MatchSet[]>();
  for (const s of sets) {
    const arr = setsByMatch.get(s.match_id) ?? [];
    arr.push(s);
    setsByMatch.set(s.match_id, arr);
  }

  for (const m of matches) {
    if (m.status !== 'played') continue;
    const matchSets = setsByMatch.get(m.id) ?? [];
    if (matchSets.length === 0) continue;

    const r1 = rows.get(m.pair1_id);
    const r2 = rows.get(m.pair2_id);
    if (!r1 || !r2) continue;

    let p1SetsWon = 0;
    let p2SetsWon = 0;

    for (const s of matchSets) {
      r1.games_won += s.pair1_games;
      r1.games_lost += s.pair2_games;
      r2.games_won += s.pair2_games;
      r2.games_lost += s.pair1_games;

      if (s.pair1_games > s.pair2_games) p1SetsWon++;
      else if (s.pair2_games > s.pair1_games) p2SetsWon++;
    }

    r1.sets_won += p1SetsWon;
    r1.sets_lost += p2SetsWon;
    r2.sets_won += p2SetsWon;
    r2.sets_lost += p1SetsWon;

    r1.matches_played++;
    r2.matches_played++;

    if (p1SetsWon > p2SetsWon) {
      r1.matches_won++;
      r2.matches_lost++;
      r1.points += 2;
    } else if (p2SetsWon > p1SetsWon) {
      r2.matches_won++;
      r1.matches_lost++;
      r2.points += 2;
    }
  }

  for (const r of rows.values()) {
    r.games_diff = r.games_won - r.games_lost;
  }

  // Sort by: points desc → set diff desc → games_diff desc
  return Array.from(rows.values()).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const setDiffA = a.sets_won - a.sets_lost;
    const setDiffB = b.sets_won - b.sets_lost;
    if (setDiffB !== setDiffA) return setDiffB - setDiffA;
    return b.games_diff - a.games_diff;
  });
}
