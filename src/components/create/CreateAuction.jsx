import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button, Input, Select, ToastProvider, useToast, Modal } from '../ui/index';
import { generateRoomCode, generateAdminKey } from '../../utils/roomCode';
import { DEFAULT_PLAYERS, IPL_SETS, SET_ORDER, inferSet } from '../../data/defaultPlayers';
import {
  resolveCategory,
  getCategoryColors,
  getCategoryDisplayName,
  DEFAULT_CATEGORY_COLORS,
  normalizePlayerCategory,
  getPlayerRole,
} from '../../data/categoryRegistry';
import { formatPrice, getBasePriceInPaise } from '../../utils/bidUtils';

const DEFAULTS = {
  timerDuration: 15, teamPurse: 120, maxTeams: 8, maxSquadSize: 15, minSquadSize: 11,
  overseasLimit: 4, minUncapped: 4, minKeepers: 1, minBowlers: 4, minBatters: 4, minAllRounders: 2,
  passwordProtected: false, password: '', publicViewing: true, guestAllowed: true,
  pauseVoteType: 'majority', undoRule: 'host_only', unsoldRule: 'returnToPool',
  bidThresholdCr: 2, bidRate1Cr: 0.5, bidRate2Cr: 1.0,
  auctionOrder: 'random', reAuction: false, auctionType: 'cricket',
};

// ── SET badge colors — delegated to the category registry ─────────────────────
// getCategoryColors(setNameOrId) returns { bg, border, color } or null.
// Falls back to DEFAULT_CATEGORY_COLORS for unknown/custom sets.

function SetBadge({ set }) {
  const c = getCategoryColors(set) || DEFAULT_CATEGORY_COLORS;
  // Display the short display name for known categories, raw set name for custom ones
  const label = getCategoryDisplayName(set, set) || set || '—';
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 999, fontSize: '0.6rem', fontWeight: 700,
      letterSpacing: '0.07em', textTransform: 'uppercase', whiteSpace: 'nowrap',
      background: c.bg, border: `1px solid ${c.border}`, color: c.color,
    }}>{label}</span>
  );
}

function StepIndicator({ current, steps }) {
  return (
    <div className="wizard-steps">
      {steps.map((s, i) => (
        <div key={s} className="wizard-step">
          <div className={`wizard-step-dot ${i < current ? 'done' : i === current ? 'active' : 'pending'}`}>
            {i < current ? '✓' : i + 1}
          </div>
          <span className={`wizard-step-label ${i === current ? 'active' : ''}`}>{s}</span>
          {i < steps.length - 1 && <div className={`wizard-step-connector ${i < current ? 'done' : ''}`} />}
        </div>
      ))}
    </div>
  );
}

function SummaryPanel({ roomName, teamName, settings, playerSource, playerCount }) {
  const rows = [
    ['Auction', roomName || '—'],
    ['Your Team', teamName || '—'],
    ['Type', settings.auctionType === 'cricket' ? '🏏 Cricket' : '⚽ Custom'],
    ['Max Teams', settings.maxTeams],
    ['Team Budget', `₹${settings.teamPurse}Cr`],
    ['Timer', `${settings.timerDuration}s`],
    ['Password', settings.passwordProtected ? '🔒 Protected' : '🔓 Open'],
    ['Public View', settings.publicViewing ? '✅ Yes' : '❌ No'],
    ['Guests', settings.guestAllowed ? '✅ Yes' : '❌ No'],
    ['Player Pool', `${playerCount} players (${playerSource})`],
    ['Bid Increment', `+₹${settings.bidRate1Cr}Cr / +₹${settings.bidRate2Cr}Cr (Thresh: ₹${settings.bidThresholdCr}Cr)`],
    ['Pause Vote', settings.pauseVoteType],
  ];
  return (
    <div className="summary-panel">
      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-cyan)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 14 }}>
        📋 Live Summary
      </div>
      {rows.map(([k, v]) => (
        <div key={k} className="summary-row">
          <span className="summary-key">{k}</span>
          <span className="summary-val">{String(v)}</span>
        </div>
      ))}
    </div>
  );
}

// Step 1: Basic Info
function Step1({ roomName, setRoomName, teamName, setTeamName, settings, update }) {
  return (
    <div className="wizard-panel">
      <h2>🏟️ Basic Information</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Input id="room-name-input" label="Auction Name *" placeholder="My IPL Mega Auction" value={roomName} onChange={e => setRoomName(e.target.value)} />
        <Input id="team-name-input" label="Your Team Name *" placeholder="e.g. Mumbai Indians, Royal Challengers..." value={teamName} onChange={e => setTeamName(e.target.value)} />
        <Select id="auction-type" label="Auction Type" value={settings.auctionType} onChange={e => update('auctionType', e.target.value)}>
          <option value="cricket">🏏 Cricket (IPL Style)</option>
          <option value="football">⚽ Football</option>
          <option value="kabaddi">💪 Kabaddi</option>
          <option value="custom">🎮 Custom Sport</option>
        </Select>
        <Select id="max-teams" label="Maximum Teams" value={settings.maxTeams} onChange={e => update('maxTeams', Number(e.target.value))}>
          {[2,3,4,5,6,7,8,10,12].map(n => <option key={n} value={n}>{n} Teams</option>)}
        </Select>
        <div style={{ background: 'rgba(8,8,20,0.8)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Access Settings</div>
          {[
            { key: 'passwordProtected', label: '🔒 Password Protected Room', desc: 'Only players with password can join as bidders' },
            { key: 'publicViewing', label: '👁️ Public Viewing', desc: 'Anyone with the link can watch live' },
            { key: 'guestAllowed', label: '👤 Allow Guests', desc: 'Guest users can participate' },
          ].map(({ key, label, desc }) => (
            <label key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }}>
              <input type="checkbox" checked={settings[key]} onChange={e => update(key, e.target.checked)}
                style={{ width: 18, height: 18, accentColor: 'var(--accent-cyan)', marginTop: 2, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{label}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2, textTransform: 'none', letterSpacing: 0, fontFamily: 'var(--font-body)', fontWeight: 400 }}>{desc}</div>
              </div>
            </label>
          ))}
        </div>
        {settings.passwordProtected && (
          <Input id="room-password" label="Room Password *" type="password" placeholder="Enter admin password" value={settings.password} onChange={e => update('password', e.target.value)} />
        )}
      </div>
    </div>
  );
}

// Step 2: Auction Rules
function Step2({ settings, update }) {
  return (
    <div className="wizard-panel">
      <h2>⚖️ Auction Rules</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Input id="timer-duration" label="Bid Timer (secs)" type="number" min={5} max={120} value={settings.timerDuration} onChange={e => update('timerDuration', Number(e.target.value))} />
          <Input id="team-purse" label="Team Budget (₹ Crores)" type="number" min={10} max={5000} value={settings.teamPurse} onChange={e => update('teamPurse', Number(e.target.value))} />
          <Input id="max-squad" label="Max Squad Size" type="number" min={5} max={25} value={settings.maxSquadSize} onChange={e => update('maxSquadSize', Number(e.target.value))} />
          <Input id="min-squad" label="Min Squad Size" type="number" min={1} max={15} value={settings.minSquadSize} onChange={e => update('minSquadSize', Number(e.target.value))} />
          <Input id="overseas-limit" label="Overseas Limit" type="number" min={0} max={11} value={settings.overseasLimit} onChange={e => update('overseasLimit', Number(e.target.value))} />
          <Input id="min-uncapped" label="Min Uncapped Players" type="number" min={0} max={15} value={settings.minUncapped} onChange={e => update('minUncapped', Number(e.target.value))} />
          <Input id="min-keepers" label="Min Wicket Keepers" type="number" min={0} max={4} value={settings.minKeepers} onChange={e => update('minKeepers', Number(e.target.value))} />
          <Input id="min-bowlers" label="Min Bowlers" type="number" min={0} max={8} value={settings.minBowlers} onChange={e => update('minBowlers', Number(e.target.value))} />
          <Input id="min-batters" label="Min Batters" type="number" min={0} max={8} value={settings.minBatters} onChange={e => update('minBatters', Number(e.target.value))} />
          <Input id="min-allrounders" label="Min All-Rounders" type="number" min={0} max={6} value={settings.minAllRounders} onChange={e => update('minAllRounders', Number(e.target.value))} />
        </div>
        <Select id="pause-vote-type" label="Pause Voting Rule" value={settings.pauseVoteType} onChange={e => update('pauseVoteType', e.target.value)}>
          <option value="majority">Majority Vote (&gt;50%)</option>
          <option value="unanimous">Unanimous (All agree)</option>
          <option value="host_only">Host Only</option>
        </Select>
        <Select id="undo-rule" label="Undo Rule" value={settings.undoRule} onChange={e => update('undoRule', e.target.value)}>
          <option value="host_only">Host Only (Admin password)</option>
          <option value="voted">Voted (Majority approve)</option>
          <option value="disabled">Disabled (No undo)</option>
        </Select>
        <Select id="unsold-rule" label="Unsold Player Rule" value={settings.unsoldRule} onChange={e => update('unsoldRule', e.target.value)}>
          <option value="returnToPool">Return to Pool (re-auctioned)</option>
          <option value="eliminate">Eliminate (no re-auction)</option>
        </Select>
        {/* Bid Increment — two-stage configurable */}
        <div style={{ background: 'rgba(8,8,20,0.8)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>⚡ Bid Increment Rules</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'none', letterSpacing: 0, fontFamily: 'var(--font-body)', fontWeight: 400 }}>
            Bids increase by <b>Rate 1</b> until the threshold, then switch to <b>Rate 2</b>.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <Input id="bid-threshold" label="Threshold (₹ Cr)" type="number" min={0.25} max={200} step={0.25} value={settings.bidThresholdCr} onChange={e => update('bidThresholdCr', Number(e.target.value))} />
            <Input id="bid-rate1" label="Rate 1 (₹ Cr/bid)" type="number" min={0.05} max={10} step={0.05} value={settings.bidRate1Cr} onChange={e => update('bidRate1Cr', Number(e.target.value))} />
            <Input id="bid-rate2" label="Rate 2 (₹ Cr/bid)" type="number" min={0.05} max={10} step={0.05} value={settings.bidRate2Cr} onChange={e => update('bidRate2Cr', Number(e.target.value))} />
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)', background: 'rgba(20,209,255,0.05)', border: '1px solid rgba(20,209,255,0.12)', borderRadius: 8, padding: '8px 12px', textTransform: 'none', letterSpacing: 0, fontFamily: 'var(--font-body)', fontWeight: 400 }}>
            📌 Example: Up to ₹{settings.bidThresholdCr}Cr → +₹{settings.bidRate1Cr}Cr per bid · Above ₹{settings.bidThresholdCr}Cr → +₹{settings.bidRate2Cr}Cr per bid
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Select id="auction-order" label="Player Order" value={settings.auctionOrder} onChange={e => update('auctionOrder', e.target.value)}>
            <option value="random">Random Shuffle</option>
            <option value="category">By Set (Marquee first)</option>
            <option value="manual">Manual Order</option>
          </Select>
          <Select id="re-auction" label="Re-Auction" value={settings.reAuction ? 'yes' : 'no'} onChange={e => update('reAuction', e.target.value === 'yes')}>
            <option value="yes">Yes — Unsold go back</option>
            <option value="no">No — One shot</option>
          </Select>
        </div>
      </div>
    </div>
  );
}

// Helper to get normalized property values from dynamic spreadsheet imports (robust parsing)
const getVal = (obj, keys, defaultVal = '') => {
  if (!obj) return defaultVal;
  const cleanVal = (val) => (typeof val === 'string' ? val.trim() : val);
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) return cleanVal(obj[k]);
  }
  const normalizedTargets = keys.map(k => k.toLowerCase().replace(/[\s_-]+/g, ''));
  for (const actualKey of Object.keys(obj)) {
    const normActual = actualKey.trim().toLowerCase().replace(/[\s_-]+/g, '');
    if (normalizedTargets.includes(normActual)) {
      return cleanVal(obj[actualKey]);
    }
  }
  return defaultVal;
};

/** Normalize a raw role string to one of our four official role values */
const normalizeRole = (raw) => {
  if (!raw) return '';
  const r = String(raw).trim().toLowerCase().replace(/[\s_-]+/g, '');
  if (r.includes('wk') || r.includes('wicket') || r.includes('keeper')) return 'WK-Batter';
  if (r.includes('allround') || r === 'ar') return 'All-Rounder';
  if (r.includes('bowl') || r === 'pacer' || r === 'spinner') return 'Bowler';
  if (r.includes('bat') || r === 'opener' || r === 'finisher') return 'Batter';
  // Return original with Title Case if no match
  return raw.trim();
};

/**
 * Normalize a raw set/category name from any import source.
 * Uses the canonical category registry as the single source of truth.
 * Returns the canonical name if found, otherwise returns the original trimmed string.
 *
 * @param {string} raw — any raw set/category string
 * @returns {{ canonicalName: string, categoryId: string|null, resolved: boolean }}
 */
const normalizeSetName = (raw) => {
  if (!raw) return { canonicalName: '', categoryId: null, resolved: false };
  const resolved = resolveCategory(raw);
  if (resolved) {
    return { canonicalName: resolved.canonicalName, categoryId: resolved.id, resolved: true };
  }
  return { canonicalName: String(raw).trim(), categoryId: null, resolved: false };
};

/**
 * Normalize a raw player row from any import format into our data model.
 *
 * Stores:
 *   originalCategory  - the raw Excel set/category string (preserved for filtering/auditing)
 *   normalizedCategory - the resolved Auction Arena UI role (Batter/Bowler/All-Rounder/WK-Batter)
 *   role              - same as normalizedCategory (or derived from Role column) — used everywhere
 */
const normalizePlayer = (p, i) => {
  const name = getVal(p, ['name', 'player name', 'player_name', 'playerName', 'player']);
  const setRaw = getVal(p, ['set', 'player set', 'playerset', 'group', 'category', 'cat']);
  let imageUrl = getVal(p, ['imageUrl', 'image url', 'image_url', 'image', 'photo', 'pic', 'link', 'player image', 'playerimage']);
  if (imageUrl && typeof imageUrl === 'string') {
    imageUrl = imageUrl.trim();
    if (/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\//.test(imageUrl) && !/^https?:\/\//i.test(imageUrl) && !/^data:image\//i.test(imageUrl)) {
      imageUrl = 'https://' + imageUrl;
    }
  }
  const roleRaw = getVal(p, ['role', 'player role', 'playerrole', 'position', 'playing role', 'type', 'player type']);
  const roleFromColumn = normalizeRole(roleRaw);   // may be '' if column absent/unrecognised
  const country = getVal(p, ['country', 'nation', 'nationality', 'origin']);
  const basePrice = getVal(p, ['basePrice', 'base price', 'base_price', 'price', 'base']);
  const score = Number(getVal(p, ['score', 'rating', 'performance rating', 'performancerating', 'performancescore', 'points'], 70));
  const age = Number(getVal(p, ['age'], 0));
  const battingAvg = Number(getVal(p, ['battingAvg', 'bat avg', 'batting average', 'batting_avg', 'average', 'avg'], 0));
  const strikeRate = Number(getVal(p, ['strikeRate', 'sr', 'strike rate', 'strike_rate'], 0));
  const wickets = Number(getVal(p, ['wickets', 'wkt', 'wkts'], 0));
  const economy = Number(getVal(p, ['economy', 'econ', 'economy rate', 'economy_rate'], 0));

  // Parse Capped/Uncapped column first, then fall back to the 'capped' boolean column
  const cappedUncappedRaw = String(getVal(p, ['capped/uncapped', 'capped uncapped', 'capped_uncapped', 'cappeduncapped', 'status'], '')).toLowerCase();
  let cappedFromColumn;
  if (cappedUncappedRaw === 'capped') cappedFromColumn = true;
  else if (cappedUncappedRaw === 'uncapped') cappedFromColumn = false;
  else {
    const cappedRaw = String(getVal(p, ['capped', 'capped status', 'is capped', 'iscapped'], 'true')).toLowerCase();
    cappedFromColumn = cappedRaw === 'true' || cappedRaw === 'yes' || cappedRaw === '1';
  }
  const capped = cappedFromColumn;

  // ── Resolve set/category via the registry ──────────────────────────────────
  const normResult = setRaw ? normalizeSetName(setRaw) : { canonicalName: '', categoryId: null, resolved: false };
  const set = normResult.canonicalName || inferSet({ role: roleFromColumn, country, capped, category: '' });
  const categoryId = normResult.categoryId || (resolveCategory(set)?.id || null);

  // ── Derive normalizedCategory (the UI role) from the set/category ──────────────
  // Pass roleFromColumn so Marquee players get their role from the Role column.
  const partialPlayer = { role: roleFromColumn, categoryId, set };
  const normalizedCategory = normalizePlayerCategory(set, partialPlayer) || roleFromColumn || null;

  // ── Canonical role used by squad counts, bid validation, team sheet ─────
  // Prefer normalizedCategory (derived from set) over raw role column.
  // This ensures "Capped All-rounder" → "All-Rounder" even when Role column is blank.
  const role = normalizedCategory || roleFromColumn;

  return {
    id: `c${i}`,
    name,
    set,                             // canonical set name (e.g. 'Capped Bowler')
    categoryId,                      // canonical id (e.g. 'capped_bowler') or null
    originalCategory: setRaw || '',  // ← raw Excel value, never overwritten
    normalizedCategory,              // ← mapped UI role (Batter/Bowler/All-Rounder/WK-Batter)
    _rawSet: setRaw || '',           // preserved for unmapped-category warnings
    imageUrl,
    role,                            // ← canonical role used everywhere in the app
    country,
    basePrice,
    score,
    age,
    battingAvg,
    strikeRate,
    wickets,
    economy,
    capped,
    category: normResult.canonicalName || 'Custom',
  };
};

// ── Step 3: Player Pool ────────────────────────────────────────────────────────
function Step3({
  playerSource, setPlayerSource, customPlayers, setCustomPlayers, customSets, setCustomSets,
  officialPlayers, startLongPress, cancelLongPress, longPressedRef
}) {
  const [dragging, setDragging] = useState(false);
  const [parseError, setParseError] = useState('');
  const [setFilter, setSetFilter] = useState('All Sets');
  const [newSetName, setNewSetName] = useState('');
  const [showAddSet, setShowAddSet] = useState(false);
  // Track Excel categories that couldn’t be resolved to the registry
  const [unmappedCategories, setUnmappedCategories] = useState([]);

  /** After normalisation, collect any categories that failed registry resolution */
  const detectUnmapped = (normalizedPlayers) => {
    const seen = new Map(); // rawSet → { inferred, count }
    for (const p of normalizedPlayers) {
      if (p._rawSet && !p.categoryId) {
        if (!seen.has(p._rawSet)) {
          seen.set(p._rawSet, { inferred: p.set, count: 0 });
        }
        seen.get(p._rawSet).count++;
      }
    }
    return Array.from(seen.entries()).map(([raw, { inferred, count }]) => ({ raw, inferred, count }));
  };

  const allSets = [...IPL_SETS, ...customSets];

  const handleFile = async (file) => {
    if (!file) return;
    setParseError('');
    try {
      const ext = file.name.split('.').pop().toLowerCase();
      if (ext === 'json') {
        const text = await file.text();
        const data = JSON.parse(text);
        const players = Array.isArray(data) ? data : data.players || [];
        const normalized = players.map(normalizePlayer);
        setCustomPlayers(normalized);
        setUnmappedCategories(detectUnmapped(normalized));
      } else if (ext === 'csv') {
        const Papa = await import('papaparse');
        const text = await file.text();
        const result = Papa.default.parse(text, { header: true, skipEmptyLines: true });
        const normalized = result.data.map(normalizePlayer);
        setCustomPlayers(normalized);
        setUnmappedCategories(detectUnmapped(normalized));
      } else if (ext === 'xlsx' || ext === 'xls') {
        const XLSXModule = await import('xlsx');
        const XLSX = XLSXModule.default || XLSXModule;
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer);
        const ws = wb.Sheets[wb.SheetNames[0]];
        // Extract hyperlink targets and formulas before converting to JSON
        for (const cellAddress in ws) {
          if (cellAddress[0] === '!') continue;
          const cell = ws[cellAddress];
          if (cell) {
            if (cell.l && cell.l.Target) {
              cell.v = cell.l.Target;
              cell.w = cell.l.Target;
            } else if (cell.f && typeof cell.f === 'string' && cell.f.toUpperCase().includes('HYPERLINK')) {
              const match = cell.f.match(/HYPERLINK\(\s*["']([^"']+)["']/i);
              if (match && match[1]) {
                cell.v = match[1];
                cell.w = match[1];
              }
            }
          }
        }
        const data = XLSX.utils.sheet_to_json(ws);
        const normalized = data.map(normalizePlayer);
        setCustomPlayers(normalized);
        setUnmappedCategories(detectUnmapped(normalized));
      } else {
        setParseError('Unsupported file type. Use CSV, XLSX, or JSON.');
      }
    } catch (e) {
      setParseError('Failed to parse file: ' + e.message);
    }
  };

  const downloadTemplate = async (format) => {
    const headers = ['Set', 'Player Name', 'Image URL', 'Role', 'Country', 'Base Price', 'Rating', 'Age', 'Bat Avg', 'SR', 'Wickets', 'Economy', 'Capped/Uncapped'];
    const sampleRow = ['Marquee Set', 'Virat Kohli', '', 'Batter', 'India', '20Cr', '98', '35', '55.8', '143.2', '0', '0', 'Capped'];

    if (format === 'csv') {
      const csv = [headers.join(','), sampleRow.join(',')].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'ipl-players-template.csv'; a.click();
    } else if (format === 'xlsx') {
      try {
        const XLSXModule = await import('xlsx');
        const XLSX = XLSXModule.default || XLSXModule;
        const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow]);
        // Style the header row (column widths)
        ws['!cols'] = headers.map((h, i) => ({ wch: [22, 20, 30, 14, 14, 12, 8, 6, 10, 8, 10, 10, 16][i] }));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Players');
        // Add a Sets reference sheet
        const setsData = [['Available Sets'], ...allSets.map(s => [s])];
        const ws2 = XLSX.utils.aoa_to_sheet(setsData);
        XLSX.utils.book_append_sheet(wb, ws2, 'Sets Reference');
        XLSX.writeFile(wb, 'ipl-players-template.xlsx');
      } catch (e) {
        setParseError('XLSX export failed: ' + e.message);
      }
    } else if (format === 'json') {
      const json = JSON.stringify([{
        set: 'Marquee Set', name: 'Virat Kohli', imageUrl: '', role: 'Batter',
        country: 'India', basePrice: '20Cr', score: 98, age: 35,
        battingAvg: 55.8, strikeRate: 143.2, wickets: 0, economy: 0,
        'capped/uncapped': 'Capped',
      }], null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'ipl-players-template.json'; a.click();
    }
  };

  const handleAddSet = () => {
    const trimmed = newSetName.trim();
    if (!trimmed) return;
    const label = trimmed.endsWith('Set') ? trimmed : `${trimmed} Set`;
    if (!allSets.includes(label)) setCustomSets(s => [...s, label]);
    setNewSetName('');
    setShowAddSet(false);
  };

  const players = playerSource === 'default' ? officialPlayers : playerSource === 'custom' ? customPlayers : [...officialPlayers, ...customPlayers];
  const filteredPlayers = setFilter === 'All Sets' ? players : players.filter(p => (p.set || inferSet(p)) === setFilter);

  // Count per set
  const setCounts = allSets.reduce((acc, s) => {
    acc[s] = players.filter(p => (p.set || inferSet(p)) === s).length;
    return acc;
  }, {});

  return (
    <div className="wizard-panel">
      <h2>🏏 Player Pool</h2>
      <div className="source-options" style={{ marginBottom: 20 }}>
        {[
          { id: 'default', icon: '🏏', label: 'Official Database', desc: `${officialPlayers.length} real IPL players` },
          { id: 'custom', icon: '📤', label: 'Upload Custom', desc: 'CSV, XLSX, or JSON' },
          { id: 'mixed', icon: '🔀', label: 'Mixed Pool', desc: 'Combine both sources' },
        ].map(s => (
          <div
            key={s.id}
            className={`source-option ${playerSource === s.id ? 'selected' : ''}`}
            onClick={() => {
              if (s.id === 'default' && longPressedRef.current) {
                longPressedRef.current = false;
                return;
              }
              setPlayerSource(s.id);
            }}
            id={`source-${s.id}`}
            onMouseDown={s.id === 'default' ? startLongPress : undefined}
            onMouseUp={s.id === 'default' ? cancelLongPress : undefined}
            onMouseLeave={s.id === 'default' ? cancelLongPress : undefined}
            onTouchStart={s.id === 'default' ? startLongPress : undefined}
            onTouchEnd={s.id === 'default' ? cancelLongPress : undefined}
            style={{ userSelect: 'none' }}
          >
            <div className="source-option-icon">{s.icon}</div>
            <div className="source-option-label">{s.label}</div>
            <div className="source-option-desc">{s.desc}</div>
          </div>
        ))}
      </div>

      {(playerSource === 'custom' || playerSource === 'mixed') && (
        <div style={{ marginBottom: 20 }}>
          <div
            className={`upload-zone ${dragging ? 'drag-over' : ''}`}
            id="upload-zone"
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
            onClick={() => document.getElementById('file-input').click()}
          >
            <input id="file-input" type="file" accept=".csv,.xlsx,.xls,.json" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
            <div className="upload-icon">📁</div>
            <div className="upload-text">Drop file here or click to browse</div>
            <div className="upload-sub">Supports CSV, XLSX, JSON · 12-column IPL format</div>
          </div>
          {parseError && <div style={{ color: 'var(--accent-red)', fontSize: '0.82rem', marginTop: 8 }}>⚠️ {parseError}</div>}

          {/* ── Unmapped Category Warning ── */}
          {unmappedCategories.length > 0 && (
            <div style={{
              marginTop: 12,
              background: 'rgba(255,193,7,0.06)',
              border: '1px solid rgba(255,193,7,0.25)',
              borderRadius: 10,
              padding: '12px 14px',
            }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#ffc107', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                ⚠️ {unmappedCategories.length} Unrecognised {unmappedCategories.length === 1 ? 'Category' : 'Categories'} in File
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 10, textTransform: 'none', letterSpacing: 0, fontFamily: 'var(--font-body)', fontWeight: 400 }}>
                These Excel category values were not recognised by the registry. Players have been auto-assigned to the inferred set below — verify they are correct before launching.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '4px 10px', alignItems: 'center' }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#ffc107', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Excel Value</span>
                <span />
                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#00e676', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Assigned Set</span>
                {unmappedCategories.map(({ raw, inferred, count }) => {
                  const col = getCategoryColors(inferred);
                  return [
                    <span key={`raw-${raw}`} style={{ fontSize: '0.75rem', color: '#ffc107', fontFamily: 'monospace', background: 'rgba(255,193,7,0.08)', padding: '2px 8px', borderRadius: 6 }}>
                      &ldquo;{raw}&rdquo; <span style={{ color: '#555', fontSize: '0.62rem' }}>({count} player{count !== 1 ? 's' : ''})</span>
                    </span>,
                    <span key={`arr-${raw}`} style={{ color: '#555', textAlign: 'center' }}>→</span>,
                    <span key={`inf-${raw}`} style={{
                      fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                      padding: '2px 8px', borderRadius: 6,
                      background: col?.bg || 'rgba(255,255,255,0.06)',
                      border: `1px solid ${col?.border || 'rgba(255,255,255,0.15)'}`,
                      color: col?.color || '#888',
                    }}>{inferred || '—'}</span>,
                  ];
                })}
              </div>
              <div style={{ marginTop: 10, fontSize: '0.7rem', color: '#888', textTransform: 'none', letterSpacing: 0, fontFamily: 'var(--font-body)', fontWeight: 400 }}>
                💡 Tip: In your Excel file, use exact category names like <b>Capped Bowler</b>, <b>Uncapped Batter</b>, <b>Capped Wicketkeeper</b>, etc.
              </div>
            </div>
          )}

          {/* Template download */}
          <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Download template:</span>
            <button className="btn btn-ghost btn-sm" onClick={() => downloadTemplate('xlsx')}>📊 Excel (XLSX)</button>
            <button className="btn btn-ghost btn-sm" onClick={() => downloadTemplate('csv')}>📄 CSV</button>
            <button className="btn btn-ghost btn-sm" onClick={() => downloadTemplate('json')}>📋 JSON</button>
          </div>
        </div>
      )}

      {players.length > 0 && (
        <div>
          {/* Set filter + counts */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.06em' }}>
                {filteredPlayers.length} / {players.length} PLAYERS
              </span>
              <span className="badge badge-green">{players.length} ✓</span>
            </div>

            {/* Set filter pills */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
              <button
                id="filter-all-sets"
                onClick={() => setSetFilter('All Sets')}
                style={{
                  padding: '4px 10px', borderRadius: 999, fontSize: '0.65rem', fontWeight: 700,
                  letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer', border: '1px solid',
                  background: setFilter === 'All Sets' ? 'rgba(20,209,255,0.15)' : 'rgba(255,255,255,0.04)',
                  borderColor: setFilter === 'All Sets' ? 'rgba(20,209,255,0.5)' : 'rgba(255,255,255,0.1)',
                  color: setFilter === 'All Sets' ? '#14d1ff' : '#555',
                  transition: 'all 0.15s',
                }}
              >All Sets ({players.length})</button>
              {allSets.filter(s => setCounts[s] > 0).map(s => {
                const c = getCategoryColors(s) || DEFAULT_CATEGORY_COLORS;
                const active = setFilter === s;
                return (
                  <button
                    key={s}
                    id={`filter-set-${s.replace(/\s+/g, '-').toLowerCase()}`}
                    onClick={() => setSetFilter(s)}
                    style={{
                      padding: '4px 10px', borderRadius: 999, fontSize: '0.65rem', fontWeight: 700,
                      letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer', border: '1px solid',
                      background: active ? c.bg : 'rgba(255,255,255,0.04)',
                      borderColor: active ? c.border : 'rgba(255,255,255,0.1)',
                      color: active ? c.color : '#555',
                      transition: 'all 0.15s',
                    }}
                  >{s.replace(' Set', '')} ({setCounts[s]})</button>
                );
              })}
            </div>
          </div>

          {/* Custom set manager */}
          <div style={{ marginBottom: 12 }}>
            {!showAddSet ? (
              <button
                id="add-custom-set-btn"
                className="btn btn-ghost btn-sm"
                onClick={() => setShowAddSet(true)}
                style={{ fontSize: '0.72rem' }}
              >
                ＋ Add Custom Set
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  id="custom-set-input"
                  type="text"
                  placeholder="e.g. Mystery Spinner Set"
                  value={newSetName}
                  onChange={e => setNewSetName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddSet()}
                  autoFocus
                  style={{
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 8, padding: '6px 12px', color: '#d8e3fb', fontSize: '0.82rem',
                    outline: 'none', minWidth: 200,
                  }}
                />
                <button className="btn btn-cyan btn-sm" onClick={handleAddSet}>Add</button>
                <button className="btn btn-ghost btn-sm" onClick={() => { setShowAddSet(false); setNewSetName(''); }}>Cancel</button>
              </div>
            )}
            {customSets.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                {customSets.map(s => (
                  <span key={s} style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '3px 10px', borderRadius: 999, fontSize: '0.62rem', fontWeight: 700,
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#aaa',
                  }}>
                    {s}
                    <button
                      onClick={() => {
                        setCustomSets(prev => prev.filter(x => x !== s));
                        if (setFilter === s) setSetFilter('All Sets');
                      }}
                      style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', padding: 0, fontSize: '0.75rem', lineHeight: 1 }}
                    >✕</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Player table */}
          <div style={{ minWidth: 0, overflow: 'hidden' }}>
          <div className="player-table-wrapper" style={{ maxHeight: 340, overflowY: 'auto', overflowX: 'auto' }}>
            <table className="player-table" style={{ fontSize: '0.78rem', minWidth: 480 }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                <tr>
                  <th style={{ width: 36 }}></th>
                  <th>Set</th>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Country</th>
                  <th>Base Price</th>
                  <th>Rating</th>
                </tr>
              </thead>
              <tbody>
                {filteredPlayers.slice(0, 60).map((p, i) => {
                  const playerSet = p.set || inferSet(p);
                  const hasImg = !!p.imageUrl;
                  return (
                    <tr key={p.id || i}>
                      {/* Avatar thumb */}
                      <td style={{ padding: '4px 6px' }}>
                        {hasImg ? (
                          <img
                            src={p.imageUrl}
                            alt={p.name}
                            referrerPolicy="no-referrer"
                            style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)' }}
                            onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                          />
                        ) : null}
                        <div style={{
                          width: 28, height: 28, borderRadius: '50%',
                          background: 'rgba(20,209,255,0.08)', border: '1px solid rgba(20,209,255,0.2)',
                          display: hasImg ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.75rem',
                        }}>🏏</div>
                      </td>
                      <td><SetBadge set={playerSet} /></td>
                      <td style={{ fontWeight: 600 }}>{p.name}</td>
                      <td><span className="badge badge-purple" style={{ fontSize: '0.58rem' }}>{p.role}</span></td>
                      <td>{p.country}</td>
                      <td style={{ color: 'var(--accent-gold)', fontFamily: 'var(--font-orbitron)', fontSize: '0.75rem' }}>{p.basePrice}</td>
                      <td>
                        <span style={{
                          fontSize: '0.7rem', fontWeight: 700,
                          color: p.score >= 90 ? '#00e676' : p.score >= 80 ? '#14d1ff' : p.score >= 70 ? '#ffc107' : '#888',
                        }}>
                          {p.score || '—'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {filteredPlayers.length > 60 && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                    ... and {filteredPlayers.length - 60} more
                  </td></tr>
                )}
                {filteredPlayers.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.78rem', padding: 20 }}>
                    No players in this set
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Step 4: Review & Launch
function Step4({ roomName, settings, playerSource, playerCount, roomCode, adminKey }) {
  const joinUrl = `${window.location.origin}/lobby/${roomCode}`;
  const [copied, setCopied] = useState('');

  const copy = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(''), 2000);
  };

  return (
    <div className="wizard-panel">
      <h2>✅ Review &amp; Launch</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Room code */}
        <div className="room-code-display">
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Room Code</div>
          <div className="room-code">{roomCode}</div>
          <div className="room-link" style={{ marginBottom: 12 }}>{joinUrl}</div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-cyan btn-sm" onClick={() => copy(roomCode, 'code')}>
              {copied === 'code' ? '✅ Copied!' : '📋 Copy Code'}
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => copy(joinUrl, 'link')}>
              {copied === 'link' ? '✅ Copied!' : '🔗 Copy Link'}
            </button>
          </div>
        </div>

        {/* Admin key */}
        <div style={{ background: 'rgba(255,193,7,0.06)', border: '1px solid rgba(255,193,7,0.2)', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--accent-gold)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8, fontWeight: 700 }}>⚠️ Admin Secret Key</div>
          <div style={{ fontFamily: 'var(--font-orbitron)', fontSize: '1.1rem', fontWeight: 800, color: '#fff', letterSpacing: '0.2em', marginBottom: 8 }}>{adminKey}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'none', letterSpacing: 0, fontFamily: 'var(--font-body)', fontWeight: 400, marginBottom: 10 }}>
            Keep this safe! Required for host admin controls (start/pause/undo).
          </div>
          <button className="btn btn-gold btn-sm" onClick={() => copy(adminKey, 'key')}>
            {copied === 'key' ? '✅ Copied!' : '🔑 Copy Admin Key'}
          </button>
        </div>

        {/* Settings summary */}
        <div style={{ background: 'rgba(8,8,20,0.9)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Auction Summary</div>
          {[
            ['Name', roomName],
            ['Type', settings.auctionType],
            ['Max Teams', settings.maxTeams],
            ['Team Budget', `₹${settings.teamPurse} Crores`],
            ['Bid Timer', `${settings.timerDuration} seconds`],
            ['Password', settings.passwordProtected ? '🔒 Protected' : '🔓 Open'],
            ['Player Pool', `${playerCount} players (${playerSource})`],
            ['Player Order', settings.auctionOrder === 'category' ? 'By Set (Marquee first)' : settings.auctionOrder],
            ['Pause Voting', settings.pauseVoteType],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>{k}</span>
              <span style={{ fontWeight: 600 }}>{String(v)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── MAIN WIZARD ────────────────────────────────────────────────────────────────
function CreateAuctionForm() {
  const { user, userProfile } = useAuth();
  const addToast = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [roomName, setRoomName] = useState(`${user?.displayName?.split(' ')[0] || 'My'}'s Auction`);
  const [teamName, setTeamName] = useState('');
  const [settings, setSettings] = useState(DEFAULTS);
  const [playerSource, setPlayerSource] = useState('default');
  const [customPlayers, setCustomPlayers] = useState([]);
  const [customSets, setCustomSets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [roomCode] = useState(() => generateRoomCode());
  const [adminKey] = useState(() => generateAdminKey());

  const [officialPlayers, setOfficialPlayers] = useState(() => {
    const cached = localStorage.getItem('aa_official_players');
    return cached ? JSON.parse(cached) : DEFAULT_PLAYERS;
  });

  const [showAdminPasswordModal, setShowAdminPasswordModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [showOfficialUploadModal, setShowOfficialUploadModal] = useState(false);
  const [officialUploadError, setOfficialUploadError] = useState('');
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const initDb = async () => {
      try {
        const { ref: dbRef, get: dbGet } = await import('firebase/database');
        const { db } = await import('../../firebase');
        if (db) {
          const snap = await dbGet(dbRef(db, 'settings/official_players'));
          if (snap.exists()) {
            const data = snap.val();
            setOfficialPlayers(data);
            localStorage.setItem('aa_official_players', JSON.stringify(data));
          }
        }
      } catch (err) {
        console.warn("Failed to fetch official database from DB:", err);
      }
    };
    initDb();
  }, []);

  const longPressTimer = useRef(null);
  const longPressedRef = useRef(false);

  const startLongPress = () => {
    longPressedRef.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressedRef.current = true;
      setShowAdminPasswordModal(true);
    }, 800);
  };

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  const verifyPassword = () => {
    if (adminPassword === 'admin123' || adminPassword === 'official123' || adminPassword === 'admin') {
      setShowAdminPasswordModal(false);
      setAdminPassword('');
      setShowOfficialUploadModal(true);
    } else {
      addToast('Incorrect password!', 'error');
    }
  };

  const handleOfficialFile = async (file) => {
    if (!file) return;
    setOfficialUploadError('');
    try {
      const ext = file.name.split('.').pop().toLowerCase();
      let parsed = [];
      if (ext === 'json') {
        const text = await file.text();
        const data = JSON.parse(text);
        parsed = Array.isArray(data) ? data : data.players || [];
      } else if (ext === 'csv') {
        const Papa = await import('papaparse');
        const text = await file.text();
        const result = Papa.default.parse(text, { header: true, skipEmptyLines: true });
        parsed = result.data;
      } else if (ext === 'xlsx' || ext === 'xls') {
        const XLSXModule = await import('xlsx');
        const XLSX = XLSXModule.default || XLSXModule;
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer);
        const ws = wb.Sheets[wb.SheetNames[0]];
        for (const cellAddress in ws) {
          if (cellAddress[0] === '!') continue;
          const cell = ws[cellAddress];
          if (cell) {
            if (cell.l && cell.l.Target) {
              cell.v = cell.l.Target;
              cell.w = cell.l.Target;
            } else if (cell.f && typeof cell.f === 'string' && cell.f.toUpperCase().includes('HYPERLINK')) {
              const match = cell.f.match(/HYPERLINK\(\s*["']([^"']+)["']/i);
              if (match && match[1]) {
                cell.v = match[1];
                cell.w = match[1];
              }
            }
          }
        }
        parsed = XLSX.utils.sheet_to_json(ws);
      } else {
        setOfficialUploadError('Unsupported file type. Use CSV, XLSX, or JSON.');
        return;
      }

      if (parsed.length === 0) {
        setOfficialUploadError('No players found in the file.');
        return;
      }

      const normalized = parsed.map(normalizePlayer);
      setOfficialPlayers(normalized);
      localStorage.setItem('aa_official_players', JSON.stringify(normalized));

      // Sync to Realtime DB if connected
      const { db } = await import('../../firebase');
      if (db) {
        const { ref: dbRef, set: dbSet } = await import('firebase/database');
        await dbSet(dbRef(db, 'settings/official_players'), normalized);
      }

      addToast(`Official Database updated with ${normalized.length} players!`, 'success', '⚡ DATABASE UPDATED');
      setShowOfficialUploadModal(false);
    } catch (e) {
      setOfficialUploadError('Failed to parse file: ' + e.message);
    }
  };

  const update = (key, val) => setSettings(s => ({ ...s, [key]: val }));
  const players = playerSource === 'default' ? officialPlayers : playerSource === 'custom' ? customPlayers : [...officialPlayers, ...customPlayers];
  const steps = ['Basic Info', 'Rules', 'Players', 'Review & Launch'];

  const handleCreate = async () => {
    if (!roomName.trim()) { addToast('Room name is required', 'error'); return; }
    if (!teamName.trim()) { addToast('Team name is required', 'error'); return; }
    setLoading(true);
    try {
      const roomId = `room_${Date.now()}`;
      const playersObj = players.reduce((acc, p, idx) => {
        acc[p.id] = {
          ...p,
          excelIndex: p.excelIndex !== undefined ? p.excelIndex : idx,
          set: p.set || inferSet(p),
          status: 'pending',
          boughtBy: null,
          soldFor: null,
        };
        return acc;
      }, {});

      // Preserve exact original Excel / source array order
      const originalExcelQueue = players.map(p => p.id);

      let queue = [...originalExcelQueue];
      if (settings.auctionOrder === 'random') {
        const shuffleArray = (array) => {
          const arr = [...array];
          for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
          }
          return arr;
        };
        queue = shuffleArray(queue);
      } else if (settings.auctionOrder === 'category') {
        // Group players by set, shuffle players within each set, and then order the sets themselves
        const uniqueSetsInOrder = [];
        players.forEach(p => {
          const s = p.set || inferSet(p) || 'Custom';
          if (!uniqueSetsInOrder.includes(s)) {
            uniqueSetsInOrder.push(s);
          }
        });

        const getSetRank = (setName) => {
          const idx = SET_ORDER.indexOf(setName);
          if (idx !== -1) return idx;
          const appIdx = uniqueSetsInOrder.indexOf(setName);
          return appIdx !== -1 ? SET_ORDER.length + appIdx : 999;
        };

        const playersBySet = {};
        originalExcelQueue.forEach(pid => {
          const s = playersObj[pid]?.set || 'Custom';
          if (!playersBySet[s]) playersBySet[s] = [];
          playersBySet[s].push(pid);
        });

        const shuffleArray = (array) => {
          const arr = [...array];
          for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
          }
          return arr;
        };

        Object.keys(playersBySet).forEach(s => {
          playersBySet[s] = shuffleArray(playersBySet[s]);
        });

        const sortedSets = Object.keys(playersBySet).sort((a, b) => getSetRank(a) - getSetRank(b));
        queue = [];
        sortedSets.forEach(s => {
          queue = queue.concat(playersBySet[s]);
        });
      }

      const roomData = {
        meta: {
          name: roomName.trim(), ownerId: user.uid, ownerName: user.displayName || 'Host',
          code: roomCode, adminKey, status: 'lobby', createdAt: Date.now(),
          settings: { ...settings, timerDurationMs: settings.timerDuration * 1000, teamPurseAmount: settings.teamPurse * 10000000 },
        },
        teams: { [user.uid]: { name: teamName.trim() || user.displayName || 'Host', displayName: user.displayName || 'Host', avatar: userProfile?.avatar || '', purse: settings.teamPurse * 10000000, score: 0, players: [] } },
        players: playersObj,
        auction: { state: 'idle', currentPlayer: null, currentBid: null, timerEnd: null, paused: false, pauseVotes: {}, pauseRequester: null, playerQueue: queue, originalQueue: [...originalExcelQueue], soldCount: 0, unsoldCount: 0 },
        chat: {}, presence: { [user.uid]: { name: user.displayName, online: true, joinedAt: Date.now() } },
      };

      try {
        const { ref: dbRef, set: dbSet } = await import('firebase/database');
        const { db } = await import('../../firebase');
        if (db) { await dbSet(dbRef(db, `rooms/${roomId}`), roomData); }
        else throw new Error('no db');
      } catch {
        localStorage.setItem(`aa_room_${roomId}`, JSON.stringify(roomData));
      }

      addToast(`"${roomName}" created! Share the room code.`, 'success', '🏟️ Room Created');
      navigate(`/lobby/${roomId}`);
    } catch (err) {
      console.error(err);
      addToast('Failed to create room: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', padding: '80px 0 100px' }}>
      <div className="wizard-container">
        <Link to="/dashboard" className="btn btn-secondary btn-sm" style={{ position: 'fixed', top: 24, left: 24, zIndex: 100, display: 'inline-flex', background: 'var(--bg-primary)' }}>← Back</Link>
        <div style={{ marginBottom: 8 }}>
          <h1 style={{ fontSize: 'clamp(1.4rem, 4vw, 2rem)', marginBottom: 4 }}>🏟️ Host a New Auction</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textTransform: 'none', letterSpacing: 0, fontFamily: 'var(--font-body)', fontWeight: 400 }}>Configure your room, set rules, and invite players to compete</p>
        </div>
        <StepIndicator current={step} steps={steps} />

        <div className="wizard-layout">
          <div>
            {step === 0 && <Step1 roomName={roomName} setRoomName={setRoomName} teamName={teamName} setTeamName={setTeamName} settings={settings} update={update} />}
            {step === 1 && <Step2 settings={settings} update={update} />}
            {step === 2 && (
              <Step3
                playerSource={playerSource} setPlayerSource={setPlayerSource}
                customPlayers={customPlayers} setCustomPlayers={setCustomPlayers}
                customSets={customSets} setCustomSets={setCustomSets}
                officialPlayers={officialPlayers}
                startLongPress={startLongPress}
                cancelLongPress={cancelLongPress}
                longPressedRef={longPressedRef}
              />
            )}
            {step === 3 && <Step4 roomName={roomName} settings={settings} playerSource={playerSource} playerCount={players.length} roomCode={roomCode} adminKey={adminKey} />}
          </div>

          <SummaryPanel roomName={roomName} teamName={teamName} settings={settings} playerSource={playerSource} playerCount={players.length} />
        </div>
      </div>

      {/* Fixed bottom navigation bar */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
        background: 'rgba(5,5,5,0.92)', backdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        padding: '14px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ display: 'flex', gap: 12, width: '100%', maxWidth: 680 }}>
          {step > 0 && <Button variant="secondary" onClick={() => setStep(s => s - 1)} style={{ flex: 1 }}>← Back</Button>}
          {step < 3 && (
            <Button id={`next-step-${step}`} variant="neon" onClick={() => {
              if (step === 0 && !roomName.trim()) { addToast('Please enter a room name', 'error'); return; }
              if (step === 0 && !teamName.trim()) { addToast('Please enter your team name', 'error'); return; }
              setStep(s => s + 1);
            }} style={{ flex: step > 0 ? 2 : 1 }}>
              Continue →
            </Button>
          )}
          {step === 3 && (
            <Button id="launch-auction-btn" variant="gold" loading={loading} onClick={handleCreate} style={{ flex: 2, paddingLeft: 12, paddingRight: 12, fontSize: '0.85rem' }}>
              🚀 Launch Auction
            </Button>
          )}
        </div>
      </div>
      {/* Admin Password verification Modal */}
      <Modal
        open={showAdminPasswordModal}
        onClose={() => { setShowAdminPasswordModal(false); setAdminPassword(''); }}
        title="Admin Authentication"
        footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', width: '100%' }}>
            <Button variant="secondary" onClick={() => { setShowAdminPasswordModal(false); setAdminPassword(''); }}>Cancel</Button>
            <Button variant="cyan" onClick={verifyPassword}>Verify</Button>
          </div>
        }
      >
        <div style={{ padding: '8px 0' }}>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: 12 }}>
            Please enter the administrator password to override the official player database.
          </p>
          <Input
            type="password"
            placeholder="Enter password..."
            value={adminPassword}
            onChange={e => setAdminPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && verifyPassword()}
            autoFocus
          />
        </div>
      </Modal>

      {/* Official Database upload Modal */}
      <Modal
        open={showOfficialUploadModal}
        onClose={() => { setShowOfficialUploadModal(false); setOfficialUploadError(''); }}
        title="Upload Official Database"
        maxWidth={580}
      >
        <div style={{ padding: '8px 0' }}>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: 14 }}>
            Upload a file in **CSV, XLSX, or JSON** format. This will replace the default IPL player database for all matches.
          </p>
          <div
            className={`upload-zone ${dragging ? 'drag-over' : ''}`}
            style={{ padding: '36px 20px', border: '1px dashed var(--border-color)', borderRadius: 12, textAlign: 'center', cursor: 'pointer', background: 'rgba(255,255,255,0.01)' }}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); handleOfficialFile(e.dataTransfer.files[0]); }}
            onClick={() => document.getElementById('official-file-input').click()}
          >
            <input id="official-file-input" type="file" accept=".csv,.xlsx,.xls,.json" style={{ display: 'none' }} onChange={e => handleOfficialFile(e.target.files[0])} />
            <div style={{ fontSize: '2.2rem', marginBottom: 8 }}>📁</div>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.92rem' }}>Drop file here or click to browse</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>Supports CSV, XLSX, JSON · 12-column IPL format</div>
          </div>
          {officialUploadError && <div style={{ color: 'var(--accent-red)', fontSize: '0.82rem', marginTop: 10 }}>⚠️ {officialUploadError}</div>}
        </div>
      </Modal>
    </div>
  );
}

export default function CreateAuction() {
  return <ToastProvider><CreateAuctionForm /></ToastProvider>;
}
