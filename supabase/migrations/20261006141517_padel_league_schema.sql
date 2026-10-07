/*
# Padel League Management Schema

## Overview
Complete schema for a padel league management system with admin authentication.
Admins register leagues (primavera/verano), categories, players, pairs, fixtures, and match results.
Public users view standings, results, and upcoming fixtures without login.

## Business Rules
- Each pair belongs to exactly one category within one league.
- Players cannot change pairs between leagues (a player stays with the same partner).
- Scoring: table ranking determined by (1) sets won, then (2) point difference (games won - games lost).
- Matches are played with time limits; sets and exact games are recorded.
- Format: round-robin group stage + final four (cuadrangular) per category.
- Multiple leagues can run in parallel; each league is independent.

## Tables

1. `leagues` — A league/season (e.g. Primavera 2026, Verano 2026).
   - id, name, season (primavera/verano), year, status (draft/active/completed), created_at

2. `categories` — Categories within a league. Masculino 2da–6ta, Femenino A–?, 6ta/amigos (mixed).
   - id, league_id (FK), name, modality (masculino/femenino/mixto), level (e.g. "2da", "6ta", "A"), created_at

3. `players` — Individual players. Unique per email; cannot change pairs between leagues.
   - id, first_name, last_name, phone, email, created_at

4. `pairs` — Duplas. Belong to one category in one league. Two players per pair.
   - id, category_id (FK), name, player1_id (FK), player2_id (FK), created_at

5. `matches` — Individual matches within a category's fixture.
   - id, category_id (FK), round (round number for round-robin, or 100+ for cuadrangular),
   - pair1_id (FK), pair2_id (FK), scheduled_date, status (scheduled/played),
   - created_at

6. `match_sets` — Sets played within a match. Each set has games for pair1 and pair2.
   - id, match_id (FK), set_number, pair1_games, pair2_games, created_at

## Security
- RLS enabled on all tables.
- SELECT: public (anon + authenticated) on all tables — all data is intentionally public.
- INSERT/UPDATE/DELETE: authenticated only (admins). No ownership check needed since any
  authenticated user is an admin; sign-up is restricted to admin-created accounts via
  the admin UI flow.
*/

-- ============ LEAGUES ============
CREATE TABLE IF NOT EXISTS leagues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  season text NOT NULL CHECK (season IN ('primavera', 'verano', 'otono', 'invierno')),
  year int NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_select_leagues" ON leagues;
CREATE POLICY "public_select_leagues" ON leagues FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_leagues" ON leagues;
CREATE POLICY "admin_insert_leagues" ON leagues FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "admin_update_leagues" ON leagues;
CREATE POLICY "admin_update_leagues" ON leagues FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin_delete_leagues" ON leagues;
CREATE POLICY "admin_delete_leagues" ON leagues FOR DELETE
  TO authenticated USING (true);

-- ============ CATEGORIES ============
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  name text NOT NULL,
  modality text NOT NULL CHECK (modality IN ('masculino', 'femenino', 'mixto')),
  level text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_select_categories" ON categories;
CREATE POLICY "public_select_categories" ON categories FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_categories" ON categories;
CREATE POLICY "admin_insert_categories" ON categories FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "admin_update_categories" ON categories;
CREATE POLICY "admin_update_categories" ON categories FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin_delete_categories" ON categories;
CREATE POLICY "admin_delete_categories" ON categories FOR DELETE
  TO authenticated USING (true);

-- ============ PLAYERS ============
CREATE TABLE IF NOT EXISTS players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text,
  email text UNIQUE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE players ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_select_players" ON players;
CREATE POLICY "public_select_players" ON players FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_players" ON players;
CREATE POLICY "admin_insert_players" ON players FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "admin_update_players" ON players;
CREATE POLICY "admin_update_players" ON players FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin_delete_players" ON players;
CREATE POLICY "admin_delete_players" ON players FOR DELETE
  TO authenticated USING (true);

-- ============ PAIRS ============
CREATE TABLE IF NOT EXISTS pairs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  player1_id uuid NOT NULL REFERENCES players(id) ON DELETE RESTRICT,
  player2_id uuid NOT NULL REFERENCES players(id) ON DELETE RESTRICT,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT different_players CHECK (player1_id <> player2_id)
);

ALTER TABLE pairs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_select_pairs" ON pairs;
CREATE POLICY "public_select_pairs" ON pairs FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_pairs" ON pairs;
CREATE POLICY "admin_insert_pairs" ON pairs FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "admin_update_pairs" ON pairs;
CREATE POLICY "admin_update_pairs" ON pairs FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin_delete_pairs" ON pairs;
CREATE POLICY "admin_delete_pairs" ON pairs FOR DELETE
  TO authenticated USING (true);

-- ============ MATCHES ============
CREATE TABLE IF NOT EXISTS matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  round int NOT NULL,
  pair1_id uuid NOT NULL REFERENCES pairs(id) ON DELETE CASCADE,
  pair2_id uuid NOT NULL REFERENCES pairs(id) ON DELETE CASCADE,
  scheduled_date timestamptz,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'played')),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT different_pairs CHECK (pair1_id <> pair2_id)
);

ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_select_matches" ON matches;
CREATE POLICY "public_select_matches" ON matches FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_matches" ON matches;
CREATE POLICY "admin_insert_matches" ON matches FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "admin_update_matches" ON matches;
CREATE POLICY "admin_update_matches" ON matches FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin_delete_matches" ON matches;
CREATE POLICY "admin_delete_matches" ON matches FOR DELETE
  TO authenticated USING (true);

-- ============ MATCH SETS ============
CREATE TABLE IF NOT EXISTS match_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  set_number int NOT NULL,
  pair1_games int NOT NULL DEFAULT 0,
  pair2_games int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE (match_id, set_number)
);

ALTER TABLE match_sets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_select_match_sets" ON match_sets;
CREATE POLICY "public_select_match_sets" ON match_sets FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_match_sets" ON match_sets;
CREATE POLICY "admin_insert_match_sets" ON match_sets FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "admin_update_match_sets" ON match_sets;
CREATE POLICY "admin_update_match_sets" ON match_sets FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin_delete_match_sets" ON match_sets;
CREATE POLICY "admin_delete_match_sets" ON match_sets FOR DELETE
  TO authenticated USING (true);

-- ============ INDEXES ============
CREATE INDEX IF NOT EXISTS idx_categories_league ON categories(league_id);
CREATE INDEX IF NOT EXISTS idx_pairs_category ON pairs(category_id);
CREATE INDEX IF NOT EXISTS idx_matches_category ON matches(category_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_match_sets_match ON match_sets(match_id);
