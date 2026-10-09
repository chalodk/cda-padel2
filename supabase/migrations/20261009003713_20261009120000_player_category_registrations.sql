/*
# Add optional player category registrations

1. Purpose
- Keep `players` as the global directory of people.
- Store category participation in a separate relation because one player may join different categories or leagues.

2. New table
- `player_category_registrations`
- `player_id` references `players`.
- `category_id` references `categories`.
- `created_at` records when the player selected the category.
- A unique pair prevents duplicate registrations for the same player and category.

3. Security
- Public visitors may create a registration from the participation form.
- Public visitors may read registrations so the admin dashboard can show categories.
- Authenticated administrators may update or delete registrations.
- Existing player records remain intact.

4. Compatibility
- The category relationship is optional.
- Existing players do not receive a category automatically.
*/

CREATE TABLE IF NOT EXISTS player_category_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_player_category_registration UNIQUE (player_id, category_id)
);

ALTER TABLE player_category_registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_select_player_category_registrations" ON player_category_registrations;
CREATE POLICY "public_select_player_category_registrations" ON player_category_registrations FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_insert_player_category_registrations" ON player_category_registrations;
CREATE POLICY "public_insert_player_category_registrations" ON player_category_registrations FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "admin_update_player_category_registrations" ON player_category_registrations;
CREATE POLICY "admin_update_player_category_registrations" ON player_category_registrations FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin_delete_player_category_registrations" ON player_category_registrations;
CREATE POLICY "admin_delete_player_category_registrations" ON player_category_registrations FOR DELETE
  TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_player_category_registrations_player
  ON player_category_registrations(player_id);
CREATE INDEX IF NOT EXISTS idx_player_category_registrations_category
  ON player_category_registrations(category_id);

DROP POLICY IF EXISTS "public_insert_players" ON players;
CREATE POLICY "public_insert_players" ON players FOR INSERT
  TO anon, authenticated WITH CHECK (true);
