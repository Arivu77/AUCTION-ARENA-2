import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getPlayerRole } from '../../data/categoryRegistry';
import { formatPrice } from '../../utils/bidUtils';

// ── Role constants ─────────────────────────────────────────────────────────────
const ROLE_BATSMAN  = 'Batter';
const ROLE_WK       = 'WK-Batter';
const ROLE_AR       = 'All-Rounder';
const ROLE_BOWLER   = 'Bowler';
const ROLE_ORDER    = [ROLE_BATSMAN, ROLE_WK, ROLE_AR, ROLE_BOWLER];

// Required Best 11 composition
const REQUIRED = {
  [ROLE_BATSMAN]: 4,
  [ROLE_WK]:      1,
  [ROLE_AR]:      2,
  [ROLE_BOWLER]:  4,
};
const REQUIRED_UNCAPPED = 4;
const REQUIRED_TOTAL    = 11;

// Role visual metadata
const ROLE_META = {
  [ROLE_BATSMAN]: { color: '#14d1ff', bg: 'rgba(20,209,255,0.12)',  border: 'rgba(20,209,255,0.35)',  emoji: '🏏', label: 'BATSMEN',        short: 'BAT' },
  [ROLE_WK]:      { color: '#00e676', bg: 'rgba(0,230,118,0.12)',   border: 'rgba(0,230,118,0.35)',   emoji: '🧤', label: 'WICKET KEEPERS', short: 'WK'  },
  [ROLE_AR]:      { color: '#7b61ff', bg: 'rgba(123,97,255,0.12)',  border: 'rgba(123,97,255,0.35)',  emoji: '⚡', label: 'ALL-ROUNDERS',   short: 'AR'  },
  [ROLE_BOWLER]:  { color: '#ff3cac', bg: 'rgba(255,60,172,0.12)',  border: 'rgba(255,60,172,0.35)',  emoji: '🎯', label: 'BOWLERS',        short: 'BOW' },
};

// ── Helpers ────────────────────────────────────────────────────────────────────
function getBest11Role(player) {
  const raw = getPlayerRole(player) || '';
  const r   = raw.trim().toLowerCase().replace(/[\s_-]+/g, '');
  if (r === 'wkbatter' || r === 'wk' || r.includes('wicket') || r.includes('keeper')) return ROLE_WK;
  if (r.includes('allround') || r === 'ar')                                             return ROLE_AR;
  if (r === 'bowler' || r.includes('bowl'))                                             return ROLE_BOWLER;
  if (r === 'batter' || r === 'batsman' || r.includes('bat'))                          return ROLE_BATSMAN;
  return ROLE_BATSMAN; // safe fallback
}

function isUncapped(player) {
  if (player.capped === false || player.capped === 0) return true;
  if (typeof player.capped === 'string') {
    const v = player.capped.toLowerCase().trim();
    return v === 'false' || v === 'no' || v === 'uncapped' || v === '0';
  }
  // If capped field is missing, check set/categoryId for "uncapped" keyword
  const src = (player.set || player.categoryId || '').toLowerCase();
  if (src.includes('uncap')) return true;
  return false;
}

function computeValidation(best11) {
  const counts = { [ROLE_BATSMAN]: 0, [ROLE_WK]: 0, [ROLE_AR]: 0, [ROLE_BOWLER]: 0 };
  let uncappedCount = 0;
  let uncappedBest11TotalScore = 0;
  for (const p of best11) {
    const role = getBest11Role(p);
    if (role in counts) counts[role]++;
    if (isUncapped(p)) {
      uncappedCount++;
      uncappedBest11TotalScore += (p.score || 0);
    }
  }
  const total       = best11.length;
  const best11Score = best11.reduce((s, p) => s + (p.score || 0), 0);

  const checks = [
    { key: 'total',      label: 'Total Players',    req: REQUIRED_TOTAL,         actual: total,                  ok: total === REQUIRED_TOTAL,                          minCheck: false },
    { key: ROLE_BATSMAN, label: 'Batsmen',           req: REQUIRED[ROLE_BATSMAN], actual: counts[ROLE_BATSMAN],   ok: counts[ROLE_BATSMAN] === REQUIRED[ROLE_BATSMAN],   minCheck: false },
    { key: ROLE_WK,      label: 'Wicket Keepers',   req: REQUIRED[ROLE_WK],      actual: counts[ROLE_WK],        ok: counts[ROLE_WK]      === REQUIRED[ROLE_WK],        minCheck: false },
    { key: ROLE_AR,      label: 'All-Rounders',     req: REQUIRED[ROLE_AR],      actual: counts[ROLE_AR],        ok: counts[ROLE_AR]      === REQUIRED[ROLE_AR],        minCheck: false },
    { key: ROLE_BOWLER,  label: 'Bowlers',          req: REQUIRED[ROLE_BOWLER],  actual: counts[ROLE_BOWLER],    ok: counts[ROLE_BOWLER]  === REQUIRED[ROLE_BOWLER],    minCheck: false },
    { key: 'uncapped',   label: 'Uncapped (min 4)', req: REQUIRED_UNCAPPED,      actual: uncappedCount,          ok: uncappedCount >= REQUIRED_UNCAPPED,                minCheck: true  },
  ];

  return { checks, isValid: checks.every(c => c.ok), best11Score, counts, uncappedCount, uncappedBest11TotalScore };
}

// ── Score badge color ──────────────────────────────────────────────────────────
function scoreColor(score) {
  if (score >= 90) return '#00e676';
  if (score >= 80) return '#14d1ff';
  if (score >= 70) return '#ffc107';
  if (score >= 60) return '#ff9800';
  return '#888';
}

// ── Player Card ────────────────────────────────────────────────────────────────
function PlayerCard({ player, onAdd, onRemove, inBest11, disabled, submitted }) {
  const role  = getBest11Role(player);
  const meta  = ROLE_META[role] || ROLE_META[ROLE_BATSMAN];
  const uncap = isUncapped(player);

  const handleClick = (e) => {
    if (submitted || disabled) return;
    if (inBest11) onRemove(player);
    else onAdd(player);
  };

  const handleDragStart = (e) => {
    if (submitted) { e.preventDefault(); return; }
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('playerId', player.id || player.name);
    e.dataTransfer.setData('source', inBest11 ? 'best11' : 'pool');
  };

  return (
    <div
      className="b11-card"
      draggable={!submitted && !disabled}
      onClick={handleClick}
      onDragStart={handleDragStart}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 11px',
        background: inBest11 ? meta.bg : 'rgba(255,255,255,0.025)',
        border: `1px solid ${inBest11 ? meta.border : 'rgba(255,255,255,0.07)'}`,
        borderRadius: 10,
        cursor: submitted ? 'default' : disabled ? 'not-allowed' : 'grab',
        userSelect: 'none',
        transition: 'all 0.15s ease',
        opacity: disabled && !inBest11 ? 0.35 : 1,
        flexShrink: 0,
      }}
    >
      {/* Avatar */}
      <div style={{
        width: 34, height: 34, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
        background: meta.bg, border: `1px solid ${meta.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem',
      }}>
        {player.imageUrl
          ? <img src={player.imageUrl} alt={player.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={e => { e.target.style.display = 'none'; e.target.parentNode.textContent = meta.emoji; }}
            />
          : meta.emoji}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#e8f0fe', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {player.name}
        </div>
        <div style={{ display: 'flex', gap: 5, alignItems: 'center', marginTop: 2 }}>
          <span style={{
            fontSize: '0.55rem', fontWeight: 800, padding: '1px 6px', borderRadius: 999,
            background: meta.bg, border: `1px solid ${meta.border}`, color: meta.color,
            letterSpacing: '0.06em', textTransform: 'uppercase', flexShrink: 0,
          }}>{meta.short}</span>
          {uncap && (
            <span style={{
              fontSize: '0.5rem', fontWeight: 800, padding: '1px 5px', borderRadius: 999,
              background: 'rgba(255,193,7,0.12)', border: '1px solid rgba(255,193,7,0.3)', color: '#ffc107',
              letterSpacing: '0.04em', flexShrink: 0,
            }}>UNCAP</span>
          )}
        </div>
      </div>

      {/* Score + action */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontFamily: "'Barlow Condensed', 'Orbitron', monospace", fontWeight: 900, fontSize: '1.05rem', color: scoreColor(player.score || 0) }}>
          {player.score ?? '—'}
        </div>
        {inBest11 && !submitted && (
          <div
            onClick={e => { e.stopPropagation(); onRemove(player); }}
            style={{ fontSize: '0.55rem', color: '#ff5555', cursor: 'pointer', marginTop: 1, fontWeight: 700 }}
          >✕ remove</div>
        )}
        {!inBest11 && !submitted && !disabled && (
          <div style={{ fontSize: '0.52rem', color: '#444', marginTop: 1 }}>+ add</div>
        )}
      </div>
    </div>
  );
}

// ── Validation Bar ─────────────────────────────────────────────────────────────
function ValidationBar({ checks }) {
  return (
    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', justifyContent: 'center' }}>
      {checks.map(c => (
        <div key={c.key} style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '4px 9px', borderRadius: 999,
          background: c.ok ? 'rgba(0,230,118,0.08)' : 'rgba(255,60,60,0.08)',
          border:    `1px solid ${c.ok ? 'rgba(0,230,118,0.3)' : 'rgba(255,60,60,0.25)'}`,
          fontSize: '0.6rem', fontWeight: 700, transition: 'all 0.2s',
        }}>
          <span style={{ fontSize: '0.7rem' }}>{c.ok ? '✓' : '✗'}</span>
          <span style={{ color: c.ok ? '#00e676' : '#ff6060' }}>
            {c.label}: {c.actual}/{c.minCheck ? `≥${c.req}` : c.req}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function Best11Page() {
  const { roomId }  = useParams();
  const navigate    = useNavigate();
  const { user }    = useAuth();

  const [room,        setRoom]        = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [best11,      setBest11]      = useState([]);
  const [submitting,  setSubmitting]  = useState(false);
  const [submitted,   setSubmitted]   = useState(false);
  const [dropTarget,  setDropTarget]  = useState(null); // 'pool' | 'best11'
  const [submitError, setSubmitError] = useState('');
  const [navigating,  setNavigating]  = useState(false);
  const [navCountdown, setNavCountdown] = useState(null);
  const [showHelp,    setShowHelp]    = useState(false);
  const [calcError,   setCalcError]   = useState('');

  // ── Load room (Firebase → localStorage fallback) ────────────────────────
  useEffect(() => {
    let unsub = () => {};
    (async () => {
      try {
        const { ref: dbRef, onValue } = await import('firebase/database');
        const { db } = await import('../../firebase');
        if (!db) throw new Error('demo');
        unsub = onValue(dbRef(db, `rooms/${roomId}`), snap => {
          if (snap.exists()) setRoom(snap.val());
          setLoading(false);
        });
      } catch {
        const stored = localStorage.getItem(`aa_room_${roomId}`);
        if (stored) setRoom(JSON.parse(stored));
        setLoading(false);
      }
    })();
    return () => unsub();
  }, [roomId]);

  // ── localStorage polling (fallback when Firebase unavailable) ────────────
  // Polls every 2 s so allSubmitted can become true in offline/demo mode.
  useEffect(() => {
    if (navigating) return; // no need to poll once navigating
    const id = setInterval(() => {
      const stored = localStorage.getItem(`aa_room_${roomId}`);
      if (stored) {
        try {
          const rd = JSON.parse(stored);
          setRoom(prev => {
            // Only update if something meaningful changed (avoid infinite loops)
            const prevJson = JSON.stringify(prev?.teams);
            const nextJson = JSON.stringify(rd?.teams);
            return prevJson !== nextJson ? rd : prev;
          });
        } catch { /* ignore parse errors */ }
      }
    }, 2000);
    return () => clearInterval(id);
  }, [roomId, navigating]);

  // ── Load existing best11 if already submitted ────────────────────────────
  useEffect(() => {
    if (!room || !user) return;
    const myTeam = room.teams?.[user.uid];
    if (myTeam?.best11 && Array.isArray(myTeam.best11) && myTeam.best11.length > 0) {
      setBest11(myTeam.best11);
      setSubmitted(true);
    }
  }, [room, user]);

  // ── Derived data ─────────────────────────────────────────────────────────
  const myTeam     = room?.teams?.[user?.uid];
  const allBought  = myTeam?.players || [];
  const best11Ids  = new Set(best11.map(p => p.id || p.name));
  const pool       = allBought.filter(p => !best11Ids.has(p.id || p.name));
  const validation = computeValidation(best11);
  const allTeams   = room ? Object.entries(room.teams || {}) : [];
  const allSubmitted = allTeams.length > 0 && allTeams.every(([, t]) => t.best11 && Array.isArray(t.best11) && t.best11.length > 0);

  const best11ByRole = ROLE_ORDER.reduce((acc, role) => {
    acc[role] = best11.filter(p => getBest11Role(p) === role);
    return acc;
  }, {});

  // ── Navigate when all teams submitted ────────────────────────────────────
  useEffect(() => {
    if (allSubmitted && submitted && !navigating) {
      setNavigating(true);
      setNavCountdown(5);
      // Primary navigation after 1.5 s
      const primary = setTimeout(() => navigate(`/results/${roomId}`), 1500);
      // Hard fallback: force navigate at 6 s regardless
      const fallback = setTimeout(() => navigate(`/results/${roomId}`), 6000);
      return () => { clearTimeout(primary); clearTimeout(fallback); };
    }
  }, [allSubmitted, submitted, navigating, navigate, roomId]);

  // ── Countdown ticker for navigating screen ───────────────────────────────
  useEffect(() => {
    if (navCountdown === null || navCountdown <= 0) return;
    const t = setTimeout(() => setNavCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [navCountdown]);

  // ── Mutation helpers ──────────────────────────────────────────────────────
  const addPlayer = useCallback((player) => {
    if (submitted || best11.length >= REQUIRED_TOTAL) return;
    const key = player.id || player.name;
    setBest11(prev => prev.some(p => (p.id || p.name) === key) ? prev : [...prev, player]);
  }, [submitted, best11.length]);

  const removePlayer = useCallback((player) => {
    if (submitted) return;
    const key = player.id || player.name;
    setBest11(prev => prev.filter(p => (p.id || p.name) !== key));
  }, [submitted]);

  // ── Drag handlers ─────────────────────────────────────────────────────────
  const handleDropOnBest11 = (e) => {
    e.preventDefault();
    setDropTarget(null);
    if (e.dataTransfer.getData('source') === 'best11') return;
    const pid = e.dataTransfer.getData('playerId');
    const player = allBought.find(p => (p.id || p.name) === pid);
    if (player) addPlayer(player);
  };

  const handleDropOnPool = (e) => {
    e.preventDefault();
    setDropTarget(null);
    if (e.dataTransfer.getData('source') === 'pool') return;
    const pid = e.dataTransfer.getData('playerId');
    const player = best11.find(p => (p.id || p.name) === pid);
    if (player) removePlayer(player);
  };

  // ── Submit best11 ─────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validation.isValid || submitting || submitted) return;
    setSubmitting(true);
    setSubmitError('');
    setCalcError('');
    try {
      // Validate each player has a score
      const badPlayer = best11.find(p => p.score == null || p.score === undefined);
      if (badPlayer) {
        const msg = `Missing score for player: ${badPlayer.name}. Cannot submit.`;
        console.error('[Best11] Calc error:', msg, badPlayer);
        setCalcError(msg);
        setSubmitting(false);
        return;
      }

      // Calculate uncapped tie-breaker score (sum of ALL uncapped in Best 11)
      const uncappedPlayers = best11.filter(p => isUncapped(p));
      const uncappedBest11TotalScore = uncappedPlayers.reduce((s, p) => s + (p.score || 0), 0);

      const payload = {
        best11,
        best11Score:               validation.best11Score,
        best11UncappedCount:       validation.uncappedCount,
        uncappedBest11TotalScore,  // ← TIE-BREAKER: sum of uncapped players' scores
        best11SubmittedAt:         Date.now(),
      };

      let savedViaFirebase = false;
      try {
        const { ref: dbRef, update: dbUpdate } = await import('firebase/database');
        const { db } = await import('../../firebase');
        if (!db) throw new Error('no db');
        await dbUpdate(dbRef(db, `rooms/${roomId}/teams/${user.uid}`), payload);
        savedViaFirebase = true;
      } catch {
        // localStorage fallback
        const stored = localStorage.getItem(`aa_room_${roomId}`);
        const rd     = stored ? JSON.parse(stored) : {};
        rd.teams     = rd.teams || {};
        rd.teams[user.uid] = { ...(rd.teams[user.uid] || {}), ...payload };
        localStorage.setItem(`aa_room_${roomId}`, JSON.stringify(rd));

        // For localStorage mode: refresh room state so allSubmitted can be re-evaluated
        setRoom({ ...rd });
      }

      setSubmitted(true);
      console.info(
        `[Best11] Submitted: score=${payload.best11Score} uncappedScore=${uncappedBest11TotalScore} via=${savedViaFirebase ? 'firebase' : 'localStorage'}`
      );
    } catch (err) {
      console.error('[Best11] Submit failed:', err);
      setSubmitError('Failed to submit: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Inline CSS ────────────────────────────────────────────────────────────
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;900&family=Inter:wght@400;500;600;700&family=Orbitron:wght@700;900&display=swap');
    * { box-sizing: border-box; }
    @keyframes b11-fadeIn  { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
    @keyframes b11-float   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
    @keyframes b11-pulse   { 0%,100%{opacity:1} 50%{opacity:0.45} }
    @keyframes b11-glow    { 0%,100%{box-shadow:0 0 20px rgba(255,193,7,0.3)} 50%{box-shadow:0 0 40px rgba(255,193,7,0.6)} }
    @keyframes b11-spin    { to{transform:rotate(360deg)} }
    .b11-card:hover   { transform: translateY(-1px); box-shadow: 0 4px 20px rgba(0,0,0,0.3); }
    .b11-card:active  { transform: scale(0.97); }
    .b11-drop-best11  { background: rgba(255,193,7,0.04) !important; box-shadow: inset 0 0 0 2px rgba(255,193,7,0.4) !important; }
    .b11-drop-pool    { background: rgba(20,209,255,0.04) !important; box-shadow: inset 0 0 0 2px rgba(20,209,255,0.4) !important; }
    ::-webkit-scrollbar        { width: 4px; height: 4px; }
    ::-webkit-scrollbar-track  { background: transparent; }
    ::-webkit-scrollbar-thumb  { background: rgba(255,255,255,0.08); border-radius: 2px; }
    ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.18); }
  `;

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#050508', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 20 }}>
      <style>{css}</style>
      <div style={{ fontSize: '3.5rem', animation: 'b11-float 2s ease-in-out infinite' }}>🏏</div>
      <div style={{ color: '#14d1ff', fontFamily: "'Orbitron', sans-serif", fontSize: '0.85rem', letterSpacing: '0.2em', fontWeight: 900 }}>LOADING BEST 11...</div>
    </div>
  );

  if (!room) return (
    <div style={{ minHeight: '100vh', background: '#050508', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 20 }}>
      <style>{css}</style>
      <div style={{ fontSize: '3rem' }}>😕</div>
      <div style={{ color: '#888', fontSize: '0.9rem' }}>Room not found</div>
      <Link to="/dashboard" style={{ color: '#14d1ff', textDecoration: 'none', fontSize: '0.82rem' }}>← Dashboard</Link>
    </div>
  );

  // ── All-submitted → navigating screen ────────────────────────────────────
  if (navigating) return (
    <div style={{ minHeight: '100vh', background: '#050508', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 20, textAlign: 'center', padding: 20 }}>
      <style>{css}</style>
      <div style={{ fontSize: '5rem', animation: 'b11-float 2s ease-in-out infinite' }}>🏆</div>
      <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '1.2rem', fontWeight: 900, color: '#ffc107', letterSpacing: '0.1em' }}>ALL TEAMS SUBMITTED!</div>
      <div style={{ color: '#888', fontSize: '0.85rem' }}>Calculating Final Results...</div>
      <div style={{ width: 40, height: 40, border: '3px solid rgba(255,193,7,0.2)', borderTop: '3px solid #ffc107', borderRadius: '50%', animation: 'b11-spin 0.8s linear infinite', margin: '0 auto' }} />
      {navCountdown !== null && navCountdown > 2 && (
        <div style={{ color: '#444', fontSize: '0.72rem', marginTop: 4 }}>Redirecting in {navCountdown}s...</div>
      )}
      {/* Safety button: visible after 3 s */}
      {navCountdown !== null && navCountdown <= 3 && (
        <button
          onClick={() => navigate(`/results/${roomId}`)}
          style={{
            marginTop: 8, padding: '9px 22px', borderRadius: 10,
            background: 'rgba(255,193,7,0.15)', border: '1px solid rgba(255,193,7,0.4)',
            color: '#ffc107', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer',
            animation: 'b11-fadeIn 0.3s ease',
          }}
        >
          🏆 View Final Results →
        </button>
      )}
    </div>
  );

  // ── Submitted + waiting for others ───────────────────────────────────────
  if (submitted && !allSubmitted) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #040408, #060610)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <style>{css}</style>
        <div style={{ maxWidth: 460, width: '100%', animation: 'b11-fadeIn 0.5s ease' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ fontSize: '3.5rem', marginBottom: 12 }}>✅</div>
            <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '1.1rem', fontWeight: 900, color: '#00e676', letterSpacing: '0.08em', marginBottom: 8 }}>
              BEST 11 LOCKED IN!
            </div>
            <div style={{ color: '#666', fontSize: '0.82rem' }}>Waiting for other teams to submit their Best 11...</div>
          </div>

          {/* Your score card */}
          <div style={{
            background: 'rgba(0,230,118,0.06)', border: '1px solid rgba(0,230,118,0.2)',
            borderRadius: 16, padding: '20px 24px', marginBottom: 16, textAlign: 'center',
          }}>
            <div style={{ fontSize: '0.6rem', fontWeight: 800, color: '#00e676', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 10 }}>
              YOUR BEST 11 SCORE
            </div>
            <div style={{ fontFamily: "'Barlow Condensed', monospace", fontSize: '3.5rem', fontWeight: 900, color: '#ffc107', lineHeight: 1 }}>
              {myTeam?.best11Score ?? validation.best11Score}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#555', marginTop: 8 }}>
              {validation.uncappedCount} Uncapped · {best11.length} Players Selected
            </div>
          </div>

          {/* Team submission status */}
          <div style={{ background: 'rgba(8,8,20,0.9)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '14px 16px', marginBottom: 16 }}>
            <div style={{ fontSize: '0.6rem', fontWeight: 800, color: '#555', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 12 }}>
              TEAM SUBMISSION STATUS
            </div>
            {allTeams.map(([uid, team]) => {
              const done = !!(team.best11 && team.best11.length > 0);
              const isMe = uid === user?.uid;
              return (
                <div key={uid} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ fontSize: '1.1rem' }}>{done ? '✅' : '⏳'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: isMe ? 700 : 500, color: isMe ? '#fff' : '#888', display: 'flex', gap: 6, alignItems: 'center' }}>
                      {team.name}
                      {isMe && <span style={{ fontSize: '0.55rem', background: 'rgba(20,209,255,0.15)', border: '1px solid rgba(20,209,255,0.3)', color: '#14d1ff', padding: '1px 6px', borderRadius: 999, fontWeight: 800 }}>YOU</span>}
                    </div>
                    {done && team.best11Score != null && (
                      <div style={{ fontSize: '0.65rem', color: '#00e676', fontWeight: 700 }}>Score: {team.best11Score}</div>
                    )}
                  </div>
                  <span style={{
                    fontSize: '0.7rem', fontWeight: 700,
                    color: done ? '#00e676' : '#ffc107',
                    animation: done ? 'none' : 'b11-pulse 1.5s ease-in-out infinite',
                  }}>
                    {done ? 'Submitted ✓' : 'Selecting...'}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Your Best 11 summary */}
          <div style={{ background: 'rgba(8,8,20,0.9)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '14px 16px' }}>
            <div style={{ fontSize: '0.6rem', fontWeight: 800, color: '#555', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 12 }}>
              YOUR BEST 11 LINEUP
            </div>
            {ROLE_ORDER.map(role => {
              const players = best11.filter(p => getBest11Role(p) === role);
              if (!players.length) return null;
              const meta = ROLE_META[role];
              return (
                <div key={role} style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: '0.58rem', fontWeight: 800, color: meta.color, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 5 }}>
                    {meta.emoji} {meta.label} ({players.length})
                  </div>
                  {players.map(p => (
                    <div key={p.id || p.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px', borderBottom: '1px solid rgba(255,255,255,0.03)', gap: 8 }}>
                      <span style={{ fontSize: '0.8rem', color: '#ccc', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.name}
                        {isUncapped(p) && <span style={{ color: '#ffc107', fontSize: '0.58rem', marginLeft: 5 }}>★</span>}
                      </span>
                      <span style={{ fontFamily: "'Barlow Condensed', monospace", fontWeight: 900, fontSize: '0.9rem', color: scoreColor(p.score || 0), flexShrink: 0 }}>
                        {p.score ?? '—'}
                      </span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          {/* Go to results anyway */}
          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <Link to={`/results/${roomId}`} style={{ color: '#555', fontSize: '0.72rem', textDecoration: 'none' }}>
              View results page anyway →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── MAIN SELECTION UI ─────────────────────────────────────────────────────
  const isFull = best11.length >= REQUIRED_TOTAL;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #040408 0%, #05050e 50%, #040410 100%)',
      display: 'flex', flexDirection: 'column',
      fontFamily: "'Inter', sans-serif",
      overflow: 'hidden',
    }}>
      <style>{css}</style>

      {/* ── HEADER ── */}
      <div style={{
        background: 'rgba(4,4,10,0.97)',
        backdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        padding: '11px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        flexShrink: 0,
        zIndex: 100,
      }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 'clamp(0.62rem, 2vw, 0.8rem)', fontWeight: 900, color: '#ffc107', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>
            🏏 SELECT YOUR BEST 11
          </div>
          <div style={{ fontSize: '0.62rem', color: '#444', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {room.meta?.name} · <span style={{ color: '#666' }}>{myTeam?.name}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexShrink: 0 }}>
          {/* Selected count */}
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontFamily: "'Barlow Condensed', monospace", fontWeight: 900,
              fontSize: '1.4rem', lineHeight: 1,
              color: isFull ? '#00e676' : '#ffc107',
            }}>{best11.length}/{REQUIRED_TOTAL}</div>
            <div style={{ fontSize: '0.52rem', color: '#444', letterSpacing: '0.06em', textTransform: 'uppercase' }}>SELECTED</div>
          </div>

          {/* Live score */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: "'Barlow Condensed', monospace", fontWeight: 900, fontSize: '1.4rem', lineHeight: 1, color: '#7b61ff' }}>
              {validation.best11Score}
            </div>
            <div style={{ fontSize: '0.52rem', color: '#444', letterSpacing: '0.06em', textTransform: 'uppercase' }}>B11 SCORE</div>
          </div>

          {/* Help */}
          <button
            onClick={() => setShowHelp(h => !h)}
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#666', fontSize: '0.75rem', padding: '5px 10px', cursor: 'pointer' }}
          >?</button>

          {/* Skip */}
          <Link to={`/results/${roomId}`} style={{
            fontSize: '0.65rem', color: '#444', textDecoration: 'none',
            padding: '5px 10px', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8,
            whiteSpace: 'nowrap',
          }}>Skip →</Link>
        </div>
      </div>

      {/* Help panel */}
      {showHelp && (
        <div style={{
          background: 'rgba(5,5,20,0.98)', backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255,193,7,0.15)', padding: '14px 16px',
          animation: 'b11-fadeIn 0.2s ease',
        }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#ffc107', letterSpacing: '0.1em', marginBottom: 10, textTransform: 'uppercase' }}>
            📋 Best 11 Rules
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
            {[
              { e: '🏏', t: 'Exactly 4 Batsmen' },
              { e: '🧤', t: 'Exactly 1 Wicket Keeper' },
              { e: '⚡', t: 'Exactly 2 All-Rounders' },
              { e: '🎯', t: 'Exactly 4 Bowlers' },
              { e: '⭐', t: '11 players total' },
              { e: '🌟', t: 'Min. 4 Uncapped players' },
            ].map(r => (
              <div key={r.t} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: '0.72rem', color: '#888' }}>
                <span>{r.e}</span><span>{r.t}</span>
              </div>
            ))}
          </div>
          <div style={{ fontSize: '0.65rem', color: '#555', marginTop: 10 }}>
            💡 <strong style={{ color: '#666' }}>Drag</strong> players between panels, or <strong style={{ color: '#666' }}>click</strong> to add/remove.
          </div>
        </div>
      )}

      {/* ── PANELS ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* ── LEFT: Player Pool ── */}
        <div
          className={dropTarget === 'pool' ? 'b11-drop-pool' : ''}
          style={{
            width: '50%', display: 'flex', flexDirection: 'column',
            borderRight: '1px solid rgba(255,255,255,0.06)',
            transition: 'background 0.15s, box-shadow 0.15s',
          }}
          onDragOver={e => { e.preventDefault(); setDropTarget('pool'); }}
          onDragLeave={() => setDropTarget(null)}
          onDrop={handleDropOnPool}
        >
          {/* Pool header */}
          <div style={{
            padding: '10px 14px 8px', flexShrink: 0,
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            background: 'rgba(20,209,255,0.03)',
          }}>
            <div style={{ fontSize: '0.58rem', fontWeight: 800, color: '#14d1ff', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              🎒 ALL BOUGHT PLAYERS
            </div>
            <div style={{ fontSize: '0.6rem', color: '#444', marginTop: 2 }}>
              {pool.length} available · {allBought.length} total purchased
            </div>
          </div>

          {/* Pool list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 5 }}>
            {allBought.length === 0 && (
              <div style={{ textAlign: 'center', padding: '50px 20px', color: '#333' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 14 }}>🎒</div>
                <div style={{ fontSize: '0.8rem' }}>No players purchased by your team</div>
              </div>
            )}
            {pool.length === 0 && allBought.length > 0 && (
              <div style={{ textAlign: 'center', padding: '50px 20px', color: '#333' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 14 }}>✅</div>
                <div style={{ fontSize: '0.8rem' }}>All players added to Best 11</div>
                <div style={{ fontSize: '0.7rem', marginTop: 6, color: '#444' }}>Drag them back from the right to swap</div>
              </div>
            )}
            {pool.map(player => (
              <PlayerCard
                key={player.id || player.name}
                player={player}
                onAdd={addPlayer}
                onRemove={removePlayer}
                inBest11={false}
                disabled={isFull}
                submitted={submitted}
              />
            ))}
          </div>
        </div>

        {/* ── RIGHT: Best 11 ── */}
        <div
          className={dropTarget === 'best11' ? 'b11-drop-best11' : ''}
          style={{
            width: '50%', display: 'flex', flexDirection: 'column',
            transition: 'background 0.15s, box-shadow 0.15s',
          }}
          onDragOver={e => { e.preventDefault(); setDropTarget('best11'); }}
          onDragLeave={() => setDropTarget(null)}
          onDrop={handleDropOnBest11}
        >
          {/* Best11 header */}
          <div style={{
            padding: '10px 14px 8px', flexShrink: 0,
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            background: 'rgba(255,193,7,0.03)',
          }}>
            <div style={{ fontSize: '0.58rem', fontWeight: 800, color: '#ffc107', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              ⭐ BEST 11
            </div>
            <div style={{ fontSize: '0.6rem', color: '#444', marginTop: 2 }}>
              Score: <span style={{ color: '#7b61ff', fontWeight: 700 }}>{validation.best11Score}</span> · drag players here
            </div>
          </div>

          {/* Role groups */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px' }}>
            {best11.length === 0 && (
              <div style={{ textAlign: 'center', padding: '50px 20px', color: '#333' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 14, animation: 'b11-pulse 2s ease-in-out infinite' }}>⭐</div>
                <div style={{ fontSize: '0.8rem' }}>Drag or click players from the left</div>
                <div style={{ fontSize: '0.7rem', marginTop: 6, color: '#444' }}>Build your Best 11</div>
              </div>
            )}

            {ROLE_ORDER.map(role => {
              const rolePlayers = best11ByRole[role] || [];
              const req         = REQUIRED[role];
              const meta        = ROLE_META[role];
              const fulfilled   = rolePlayers.length === req;
              const overflow    = rolePlayers.length > req;

              return (
                <div key={role} style={{ marginBottom: 14 }}>
                  {/* Role group header */}
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '5px 9px', borderRadius: 8, marginBottom: 5,
                    background: fulfilled ? meta.bg : 'rgba(255,255,255,0.025)',
                    border: `1px solid ${fulfilled ? meta.border : overflow ? 'rgba(255,60,60,0.3)' : 'rgba(255,255,255,0.05)'}`,
                    transition: 'all 0.2s',
                  }}>
                    <div style={{ fontSize: '0.56rem', fontWeight: 800, color: fulfilled ? meta.color : '#555', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                      {meta.emoji} {meta.label}
                    </div>
                    <div style={{
                      fontSize: '0.65rem', fontWeight: 900,
                      color: fulfilled ? '#00e676' : overflow ? '#ff4444' : '#555',
                      fontFamily: "'Barlow Condensed', monospace",
                    }}>
                      {rolePlayers.length}/{req}{fulfilled ? ' ✓' : ''}
                    </div>
                  </div>

                  {/* Players */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {rolePlayers.map(player => (
                      <PlayerCard
                        key={player.id || player.name}
                        player={player}
                        onAdd={addPlayer}
                        onRemove={removePlayer}
                        inBest11={true}
                        disabled={false}
                        submitted={submitted}
                      />
                    ))}

                    {/* Empty slot indicators */}
                    {!submitted && Array.from({ length: Math.max(0, req - rolePlayers.length) }, (_, i) => (
                      <div key={`empty-${i}`} style={{
                        padding: '9px 12px', borderRadius: 10,
                        border: '1px dashed rgba(255,255,255,0.07)',
                        color: '#2a2a3a', fontSize: '0.68rem', textAlign: 'center',
                        fontStyle: 'italic',
                      }}>
                        {meta.emoji} {meta.short} slot {rolePlayers.length + i + 1}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── BOTTOM BAR: Validation + Submit ── */}
      <div style={{
        background: 'rgba(4,4,12,0.99)',
        backdropFilter: 'blur(24px)',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        padding: '10px 14px 12px',
        flexShrink: 0,
        zIndex: 100,
      }}>
        {/* Validation checks row */}
        <div style={{ marginBottom: 10 }}>
          <ValidationBar checks={validation.checks} />
        </div>

        {/* Error */}
        {(submitError || calcError) && (
          <div style={{ color: '#ff6060', fontSize: '0.7rem', textAlign: 'center', marginBottom: 8, padding: '6px 10px', background: 'rgba(255,60,60,0.06)', borderRadius: 8 }}>
            ⚠️ {calcError || submitError}
            {calcError && (
              <div style={{ marginTop: 4, fontSize: '0.65rem', color: '#ff9090' }}>
                Check that all players in the list have valid scores before submitting.
              </div>
            )}
          </div>
        )}


        {/* Submit button */}
        <button
          id="b11-submit-btn"
          onClick={handleSubmit}
          disabled={!validation.isValid || submitting || submitted}
          style={{
            width: '100%', padding: '13px 20px', borderRadius: 14, border: 'none',
            fontFamily: "'Barlow Condensed', 'Orbitron', sans-serif",
            fontWeight: 900, fontSize: '1.05rem', letterSpacing: '0.12em', textTransform: 'uppercase',
            cursor: validation.isValid && !submitting && !submitted ? 'pointer' : 'not-allowed',
            background: submitted
              ? 'rgba(0,230,118,0.12)'
              : validation.isValid
                ? 'linear-gradient(135deg, #7b61ff 0%, #14d1ff 100%)'
                : 'rgba(255,255,255,0.04)',
            color: submitted ? '#00e676' : validation.isValid ? '#fff' : '#333',
            boxShadow: validation.isValid && !submitted ? '0 0 30px rgba(123,97,255,0.35)' : 'none',
            transition: 'all 0.2s ease',
            animation: validation.isValid && !submitted && !submitting ? 'b11-glow 2s ease-in-out infinite' : 'none',
          }}
        >
          {submitted
            ? '✅ BEST 11 SUBMITTED'
            : submitting
              ? '⏳ SUBMITTING...'
              : validation.isValid
                ? `🚀 SUBMIT BEST 11  ·  SCORE: ${validation.best11Score}`
                : `⚠️ COMPLETE SELECTION  (${best11.length}/${REQUIRED_TOTAL} players)`}
        </button>
      </div>
    </div>
  );
}
