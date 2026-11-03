CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS families (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_en TEXT,
  unlock_level INTEGER NOT NULL,
  base_seed_price INTEGER NOT NULL,
  seed2_price_mult REAL NOT NULL,
  grow_time_sec INTEGER NOT NULL,
  watering_interval_sec INTEGER NOT NULL,
  base_mutation_chance REAL NOT NULL,
  stage_thresholds TEXT NOT NULL,
  reveal_variant_from_stage INTEGER NOT NULL,
  growth_pauses_when_dry INTEGER NOT NULL,
  tags TEXT NOT NULL,
  archived INTEGER NOT NULL DEFAULT 0,
  builtin INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS variants (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES families(id) ON DELETE RESTRICT,
  key TEXT NOT NULL,
  name TEXT NOT NULL,
  name_en TEXT,
  rarity_id TEXT NOT NULL,
  is_base INTEGER NOT NULL,
  mutation_weight REAL NOT NULL,
  yield_count INTEGER NOT NULL,
  yield_unit_price INTEGER NOT NULL,
  sort_order INTEGER NOT NULL,
  archived INTEGER NOT NULL DEFAULT 0,
  UNIQUE(family_id, key)
);

CREATE TABLE IF NOT EXISTS images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_type TEXT NOT NULL CHECK(owner_type IN ('family','variant')),
  owner_id TEXT NOT NULL,
  slot TEXT NOT NULL,
  file_path TEXT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  bytes INTEGER NOT NULL,
  sha256 TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(owner_type, owner_id, slot)
);

CREATE TABLE IF NOT EXISTS catalog_meta (
  id INTEGER PRIMARY KEY CHECK(id = 1),
  version INTEGER NOT NULL
);
INSERT OR IGNORE INTO catalog_meta(id, version) VALUES(1, 1);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at INTEGER NOT NULL,
  action TEXT NOT NULL,
  family_id TEXT,
  detail TEXT
);
