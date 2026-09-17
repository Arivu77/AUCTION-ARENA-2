/**
 * ── Category Registry ──────────────────────────────────────────────────────────
 *
 * Single source of truth for all auction set/category definitions.
 *
 * Every category has:
 *   id            – snake_case canonical identifier  (e.g. "capped_bowler")
 *   canonicalName – full official name               (e.g. "Capped Bowler")
 *   displayName   – short badge text for Auction UI  (e.g. "CAP BOWLER")
 *   aliases       – all known variant strings that should resolve here
 *   colors        – { bg, border, color } for badge rendering
 *
 * Use `resolveCategory()` to map any raw string → category object.
 * Use `getCategoryById()` for fast lookup by ID.
 */

// ── Registry Definition ────────────────────────────────────────────────────────

export const CATEGORY_REGISTRY = [
  {
    id: 'marquee_set',
    canonicalName: 'Marquee Set',
    displayName: 'MARQUEE',
    aliases: [
      'Marquee Set', 'Marquee', 'MARQUEE', 'MARQUEE SET',
      'marquee set', 'marquee',
    ],
    colors: { bg: 'rgba(255,193,7,0.12)', border: 'rgba(255,193,7,0.35)', color: '#ffc107' },
  },
  {
    id: 'capped_batter',
    canonicalName: 'Capped Batter',
    displayName: 'CAP BATTER',
    aliases: [
      'Capped Batter', 'CAP BATTER', 'Capped Batsman', 'CAP BAT',
      'Capped Bat', 'CAP BATSMAN', 'CAPPED BATTER', 'CAPPED BATSMAN',
      'capped batter', 'capped batsman', 'cap batter',
    ],
    colors: { bg: 'rgba(20,209,255,0.10)', border: 'rgba(20,209,255,0.3)', color: '#14d1ff' },
  },
  {
    id: 'uncapped_batter',
    canonicalName: 'Uncapped Batter',
    displayName: 'UNCAP BATTER',
    aliases: [
      'Uncapped Batter', 'UNCAP BATTER', 'Uncapped Batsman', 'UNCAP BAT',
      'Uncapped Bat', 'UNCAP BATSMAN', 'UNCAPPED BATTER', 'UNCAPPED BATSMAN',
      'uncapped batter', 'uncapped batsman', 'uncap batter',
    ],
    colors: { bg: 'rgba(20,209,255,0.07)', border: 'rgba(20,209,255,0.2)', color: '#7ad8f5' },
  },
  {
    id: 'capped_bowler',
    canonicalName: 'Capped Bowler',
    displayName: 'CAP BOWLER',
    aliases: [
      'Capped Bowler', 'CAP BOWLER', 'CAP BOWL', 'CAPPED BOWLER',
      'Capped Bowling', 'capped bowler', 'cap bowler',
    ],
    colors: { bg: 'rgba(255,60,172,0.10)', border: 'rgba(255,60,172,0.3)', color: '#ff3cac' },
  },
  {
    id: 'uncapped_bowler',
    canonicalName: 'Uncapped Bowler',
    displayName: 'UNCAP BOWLER',
    aliases: [
      'Uncapped Bowler', 'UNCAP BOWLER', 'UNCAP BOWL', 'UNCAPPED BOWLER',
      'Uncapped Bowling', 'uncapped bowler', 'uncap bowler',
    ],
    colors: { bg: 'rgba(255,60,172,0.07)', border: 'rgba(255,60,172,0.2)', color: '#f59bc8' },
  },
  {
    id: 'capped_allrounder',
    canonicalName: 'Capped All-rounder',
    displayName: 'CAP AR',
    aliases: [
      'Capped All-rounder', 'Capped All-Rounder', 'Capped Allrounder',
      'Capped All Rounder', 'CAP AR', 'CAP ALL-ROUNDER', 'CAP ALL ROUNDER',
      'CAP ALLROUNDER', 'CAPPED ALL-ROUNDER', 'CAPPED ALL ROUNDER',
      'CAPPED ALLROUNDER', 'capped all-rounder', 'capped allrounder',
      'capped all rounder', 'cap ar', 'cap allrounder',
    ],
    colors: { bg: 'rgba(123,97,255,0.10)', border: 'rgba(123,97,255,0.3)', color: '#7b61ff' },
  },
  {
    id: 'uncapped_allrounder',
    canonicalName: 'Uncapped All-rounder',
    displayName: 'UNCAP AR',
    aliases: [
      'Uncapped All-rounder', 'Uncapped All-Rounder', 'Uncapped Allrounder',
      'Uncapped All Rounder', 'UNCAP AR', 'UNCAP ALL-ROUNDER', 'UNCAP ALL ROUNDER',
      'UNCAP ALLROUNDER', 'UNCAPPED ALL-ROUNDER', 'UNCAPPED ALL ROUNDER',
      'UNCAPPED ALLROUNDER', 'uncapped all-rounder', 'uncapped allrounder',
      'uncapped all rounder', 'uncap ar', 'uncap allrounder',
    ],
    colors: { bg: 'rgba(123,97,255,0.07)', border: 'rgba(123,97,255,0.2)', color: '#b8a9ff' },
  },
  {
    id: 'capped_wicketkeeper',
    canonicalName: 'Capped Wicketkeeper',
    displayName: 'CAP WK',
    aliases: [
      'Capped Wicketkeeper', 'Capped Wicket Keeper', 'Capped WK',
      'CAP WK', 'CAP WICKETKEEPER', 'CAP WICKET KEEPER',
      'CAPPED WICKETKEEPER', 'CAPPED WICKET KEEPER', 'CAPPED WK',
      'capped wicketkeeper', 'capped wicket keeper', 'capped wk',
      'cap wk', 'cap wicketkeeper', 'cap wicket keeper',
    ],
    colors: { bg: 'rgba(0,230,118,0.10)', border: 'rgba(0,230,118,0.3)', color: '#00e676' },
  },
  {
    id: 'uncapped_wicketkeeper',
    canonicalName: 'Uncapped Wicketkeeper',
    displayName: 'UNCAP WK',
    aliases: [
      'Uncapped Wicketkeeper', 'Uncapped Wicket Keeper', 'Uncapped WK',
      'UNCAP WK', 'UNCAP WICKETKEEPER', 'UNCAP WICKET KEEPER',
      'UNCAPPED WICKETKEEPER', 'UNCAPPED WICKET KEEPER', 'UNCAPPED WK',
      'uncapped wicketkeeper', 'uncapped wicket keeper', 'uncapped wk',
      'uncap wk', 'uncap wicketkeeper', 'uncap wicket keeper',
    ],
    colors: { bg: 'rgba(0,230,118,0.07)', border: 'rgba(0,230,118,0.2)', color: '#7bdfab' },
  },
];

// ── Precomputed Indexes ────────────────────────────────────────────────────────

/** Map from category id → category object */
const _byId = new Map();

/** Map from canonical name → category object */
const _byCanonical = new Map();

/** Map from normalized alias → category object (for fast lookup) */
const _byNormalized = new Map();

/**
 * Normalize a raw string for matching purposes.
 * Trims, lowercases, collapses whitespace/hyphens/underscores into a single space.
 */
function _normalize(raw) {
  if (!raw) return '';
  return String(raw).trim().toLowerCase().replace(/[\s_-]+/g, ' ');
}

// Build indexes on module load
(function buildIndexes() {
  for (const cat of CATEGORY_REGISTRY) {
    _byId.set(cat.id, cat);
    _byCanonical.set(cat.canonicalName, cat);

    // Index all aliases (both exact and normalized forms)
    for (const alias of cat.aliases) {
      _byNormalized.set(_normalize(alias), cat);
    }
    // Also index the canonical name, display name, and id itself
    _byNormalized.set(_normalize(cat.canonicalName), cat);
    _byNormalized.set(_normalize(cat.displayName), cat);
    _byNormalized.set(_normalize(cat.id), cat);
  }
})();

// ── Abbreviation expansion table ───────────────────────────────────────────────
const ABBREVIATION_MAP = {
  'cap': 'capped',
  'uncap': 'uncapped',
  'wk': 'wicketkeeper',
  'ar': 'all rounder',
  'bat': 'batter',
  'bowl': 'bowler',
};

/**
 * Attempt to expand common abbreviations in a normalized string.
 * E.g. "cap bowl" → "capped bowler"
 */
function _expandAbbreviations(normalized) {
  const parts = normalized.split(' ');
  const expanded = parts.map(p => ABBREVIATION_MAP[p] || p);
  return expanded.join(' ');
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Resolve a raw category/set string to a category object.
 *
 * Tries, in order:
 *   1. Exact match on canonical name
 *   2. Normalized alias match
 *   3. Abbreviation-expanded match
 *
 * @param {string} rawString — any variant of a category name
 * @returns {object|null} — category object or null if no match
 */
export function resolveCategory(rawString) {
  if (!rawString) return null;
  const raw = String(rawString).trim();
  if (!raw) return null;

  // 1. Exact canonical name match
  const exactCanonical = _byCanonical.get(raw);
  if (exactCanonical) return exactCanonical;

  // 2. Normalized match against aliases/names
  const norm = _normalize(raw);
  const normMatch = _byNormalized.get(norm);
  if (normMatch) return normMatch;

  // 3. Try expanding abbreviations
  const expanded = _expandAbbreviations(norm);
  if (expanded !== norm) {
    const expandedMatch = _byNormalized.get(expanded);
    if (expandedMatch) return expandedMatch;
  }

  // No match found
  return null;
}

/**
 * Get a category by its canonical ID.
 * @param {string} id — e.g. "capped_bowler"
 * @returns {object|null}
 */
export function getCategoryById(id) {
  return _byId.get(id) || null;
}

/**
 * Get the display name (short badge text) for a category ID.
 * Falls back to the raw ID or the provided fallback string.
 * @param {string} idOrCanonical — category id or canonical name
 * @param {string} [fallback] — fallback if not found
 * @returns {string}
 */
export function getCategoryDisplayName(idOrCanonical, fallback) {
  const cat = _byId.get(idOrCanonical) || _byCanonical.get(idOrCanonical);
  if (cat) return cat.displayName;

  // Try resolving as an arbitrary string
  const resolved = resolveCategory(idOrCanonical);
  if (resolved) return resolved.displayName;

  return fallback || idOrCanonical || '';
}

/**
 * Get the canonical (full) name for a category ID.
 * @param {string} idOrCanonical — category id or canonical name
 * @param {string} [fallback] — fallback if not found
 * @returns {string}
 */
export function getCategoryCanonicalName(idOrCanonical, fallback) {
  const cat = _byId.get(idOrCanonical) || _byCanonical.get(idOrCanonical);
  if (cat) return cat.canonicalName;

  const resolved = resolveCategory(idOrCanonical);
  if (resolved) return resolved.canonicalName;

  return fallback || idOrCanonical || '';
}

/**
 * Get the badge colors for a category.
 * @param {string} idOrCanonicalOrRaw — category id, canonical name, or any raw variant
 * @returns {{ bg: string, border: string, color: string } | null}
 */
export function getCategoryColors(idOrCanonicalOrRaw) {
  const cat = _byId.get(idOrCanonicalOrRaw)
    || _byCanonical.get(idOrCanonicalOrRaw);
  if (cat) return cat.colors;

  const resolved = resolveCategory(idOrCanonicalOrRaw);
  if (resolved) return resolved.colors;

  return null;
}

/**
 * Get all category IDs in registry order.
 * @returns {string[]}
 */
export function getAllCategoryIds() {
  return CATEGORY_REGISTRY.map(c => c.id);
}

/**
 * Get all canonical names in registry order.
 * @returns {string[]}
 */
export function getAllCanonicalNames() {
  return CATEGORY_REGISTRY.map(c => c.canonicalName);
}

/**
 * Default fallback colors for custom/unknown sets.
 */
export const DEFAULT_CATEGORY_COLORS = {
  bg: 'rgba(255,255,255,0.06)',
  border: 'rgba(255,255,255,0.15)',
  color: '#888',
};

// ── Category → UI Role mapping ───────────────────────────────────────────
// Maps a canonical category ID to the four Auction Arena role values.
const CATEGORY_ID_TO_ROLE = {
  marquee_set:            null,          // determined by player's own role field
  capped_batter:          'Batter',
  uncapped_batter:        'Batter',
  capped_bowler:          'Bowler',
  uncapped_bowler:        'Bowler',
  capped_allrounder:      'All-Rounder',
  uncapped_allrounder:    'All-Rounder',
  capped_wicketkeeper:    'WK-Batter',
  uncapped_wicketkeeper:  'WK-Batter',
};

/**
 * Normalize a player's Excel set/category string to one of the four
 * Auction Arena UI role values: 'Batter' | 'Bowler' | 'All-Rounder' | 'WK-Batter'.
 *
 * For Marquee Set players, the role is determined from the player's own `role`
 * field (passed as the second argument) — NOT blindly assumed to be 'Batter'.
 *
 * @param {string}  category   - Raw or canonical set/category name from Excel
 * @param {object}  playerData - Player object (used to extract role for Marquee)
 * @returns {string|null} One of the four UI roles, or null if undetermined
 */
export function normalizePlayerCategory(category, playerData = {}) {
  if (!category) return null;

  // 1. Resolve the category to a canonical registry entry
  const cat = resolveCategory(category);

  if (cat) {
    const mapped = CATEGORY_ID_TO_ROLE[cat.id];

    // Marquee Set: derive role from the player's actual role field
    if (cat.id === 'marquee_set') {
      const rawRole = playerData.role || playerData.playerRole || playerData.position || '';
      if (!rawRole) return null;  // preserve null — needs manual resolution

      const r = String(rawRole).trim().toLowerCase().replace(/[\s_-]+/g, '');
      if (r.includes('wk') || r.includes('wicket') || r.includes('keeper')) return 'WK-Batter';
      if (r.includes('allround') || r === 'ar') return 'All-Rounder';
      if (r.includes('bowl') || r === 'pacer' || r === 'spinner') return 'Bowler';
      if (r.includes('bat') || r === 'opener' || r === 'finisher') return 'Batter';
      return null;
    }

    return mapped ?? null;
  }

  // 2. No registry match: try to infer from the raw category string directly
  const raw = String(category).trim().toLowerCase().replace(/[\s_-]+/g, '');
  if (raw.includes('wicket') || raw.includes('keeper') || raw.endsWith('wk')) return 'WK-Batter';
  if (raw.includes('allround') || raw.endsWith('ar')) return 'All-Rounder';
  if (raw.includes('bowl')) return 'Bowler';
  if (raw.includes('bat')) return 'Batter';

  return null;
}

/**
 * Get the effective Auction Arena UI role for a player.
 *
 * This is the SINGLE CENTRALIZED function that ALL components must use
 * when reading a player's role — instead of reading `player.role` directly.
 *
 * Priority order:
 *   1. player.normalizedCategory  (set during import, most reliable)
 *   2. Derive from player.categoryId or player.set via normalizePlayerCategory()
 *   3. player.role                (raw Excel Role column or inferred)
 *
 * @param {object} player - Any player object from any source
 * @returns {string} One of: 'Batter' | 'Bowler' | 'All-Rounder' | 'WK-Batter' | ''
 */
export function getPlayerRole(player) {
  if (!player) return '';

  // 1. Prefer already-normalised category (set at import time)
  if (player.normalizedCategory) return player.normalizedCategory;

  // 2. Derive from categoryId (registry canonical ID)
  if (player.categoryId) {
    const mapped = CATEGORY_ID_TO_ROLE[player.categoryId];
    if (mapped) return mapped;
    // categoryId is marquee_set — fall through to role field
  }

  // 3. Derive from canonical set name
  if (player.set) {
    const derived = normalizePlayerCategory(player.set, player);
    if (derived) return derived;
  }

  // 4. Use raw role field as final fallback
  return player.role || '';
}
