/**
 * Round-robin fixture generation using the circle method.
 * Supports odd and even number of teams.
 * Returns array of { round, pair1_index, pair2_index }.
 */
export function generateRoundRobin(numTeams: number): Array<{
  round: number;
  pair1_index: number;
  pair2_index: number;
}> {
  if (numTeams < 2) return [];

  const games: Array<{ round: number; pair1_index: number; pair2_index: number }> = [];
  const teams = Array.from({ length: numTeams }, (_, i) => i);

  // If odd, add a "bye" (dummy) team
  if (teams.length % 2 !== 0) teams.push(-1);

  const n = teams.length;
  const rounds = n - 1;
  const half = n / 2;

  for (let r = 0; r < rounds; r++) {
    for (let i = 0; i < half; i++) {
      const t1 = teams[i];
      const t2 = teams[n - 1 - i];
      if (t1 !== -1 && t2 !== -1) {
        games.push({ round: r + 1, pair1_index: t1, pair2_index: t2 });
      }
    }
    // Rotate: keep first fixed, rotate the rest
    const fixed = teams[0];
    const rest = teams.slice(1);
    rest.unshift(rest.pop()!);
    teams.splice(0, teams.length, fixed, ...rest);
  }

  return games;
}
