export type LeagueSeason = 'primavera' | 'verano' | 'otono' | 'invierno';
export type LeagueStatus = 'draft' | 'active' | 'completed';
export type Modality = 'masculino' | 'femenino' | 'mixto';
export type MatchStatus = 'scheduled' | 'played';

export interface League {
  id: string;
  name: string;
  season: LeagueSeason;
  year: number;
  status: LeagueStatus;
  created_at: string;
}

export interface Category {
  id: string;
  league_id: string;
  name: string;
  modality: Modality;
  level: string;
  created_at: string;
}

export interface Player {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  created_at: string;
}

export interface PlayerCategoryRegistration {
  id: string;
  player_id: string;
  category_id: string;
  created_at: string;
}

export interface Pair {
  id: string;
  category_id: string;
  name: string;
  player1_id: string;
  player2_id: string;
  created_at: string;
}

export interface MatchSet {
  id: string;
  match_id: string;
  set_number: number;
  pair1_games: number;
  pair2_games: number;
  created_at: string;
}

export interface Match {
  id: string;
  category_id: string;
  round: number;
  pair1_id: string;
  pair2_id: string;
  scheduled_date: string | null;
  status: MatchStatus;
  created_at: string;
}

export interface MatchWithDetails extends Match {
  pair1: Pair;
  pair2: Pair;
  match_sets: MatchSet[];
}

export interface PairWithPlayers extends Pair {
  player1: Player;
  player2: Player;
}

export interface CategoryWithPairs extends Category {
  pairs: PairWithPlayers[];
}

export interface StandingsRow {
  pair_id: string;
  pair_name: string;
  player1_name: string;
  player2_name: string;
  matches_played: number;
  matches_won: number;
  matches_lost: number;
  sets_won: number;
  sets_lost: number;
  games_won: number;
  games_lost: number;
  games_diff: number;
  points: number;
}

export interface FixtureMatch {
  round: number;
  pair1_id: string;
  pair2_id: string;
  pair1_name: string;
  pair2_name: string;
}
