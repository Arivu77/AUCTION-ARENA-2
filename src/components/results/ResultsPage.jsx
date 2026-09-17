import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button, Avatar, Badge } from '../ui/index';
import { formatPrice } from '../../utils/bidUtils';
import { getCategoryCanonicalName, getPlayerRole } from '../../data/categoryRegistry';
import PdfPreviewModal from './PdfPreviewModal';
import { validateBest11Data } from '../../utils/pdfGenerator';

export default function ResultsPage() {
  const { roomId } = useParams();
  const { user, userProfile, updateUserProfile } = useAuth();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPdfPreview, setShowPdfPreview] = useState(false);

  useEffect(() => {
    let unsub = () => {};
    const init = async () => {
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
    };
    init();
    return () => unsub();
  }, [roomId]);

  useEffect(() => {
    if (!room || !user || !userProfile || !updateUserProfile) return;
    
    // Check if the user was in the room
    const teamEntry = room.teams ? Object.entries(room.teams).find(([uid]) => uid === user.uid) : null;
    if (!teamEntry) return; // User was not a participant
    
    // Check if match was already processed
    const alreadyProcessed = (userProfile.matchHistory || []).some(m => m.roomId === roomId);
    if (alreadyProcessed) return;
    
    // Process stats
    const team = teamEntry[1];
    const teamScore = team.score || 0;
    
    // Rank calculation
    const sortedTeams = Object.entries(room.teams)
      .map(([uid, t]) => ({ uid, score: t.score || 0 }))
      .sort((a, b) => b.score - a.score);
    const rank = sortedTeams.findIndex(t => t.uid === user.uid) + 1;
    const isWin = rank === 1;
    
    // Spent & Highest Bid
    const draftedPlayers = team.players || [];
    const spentInMatch = draftedPlayers.reduce((sum, p) => sum + (p.soldFor || 0), 0);
    const highestBidInMatch = draftedPlayers.reduce((max, p) => Math.max(max, p.soldFor || 0), 0);
    
    // XP Calculation
    const baseXp = 50;
    const rankBonus = rank === 1 ? 150 : rank === 2 ? 100 : rank === 3 ? 50 : 10;
    const gainedXp = baseXp + rankBonus;
    
    let newLevel = userProfile.level || 1;
    let newXp = (userProfile.xp || 0) + gainedXp;
    while (newXp >= newLevel * 100) {
      newXp -= newLevel * 100;
      newLevel += 1;
    }
    
    // Update stats
    const currentStats = {
      wins: 0,
      losses: 0,
      totalGames: 0,
      totalSpent: 0,
      championships: 0,
      highestBid: 0,
      totalBids: 0,
      ...(userProfile.stats || {})
    };
    
    const newStats = {
      wins: currentStats.wins + (isWin ? 1 : 0),
      losses: currentStats.losses + (isWin ? 0 : 1),
      totalGames: currentStats.totalGames + 1,
      totalSpent: currentStats.totalSpent + spentInMatch,
      championships: currentStats.championships + (isWin ? 1 : 0),
      highestBid: Math.max(currentStats.highestBid, highestBidInMatch),
      totalBids: currentStats.totalBids + (draftedPlayers.length * 3)
    };
    
    // Match history entry
    const newHistoryEntry = {
      roomId,
      name: room.meta?.name || `Auction Room`,
      date: Date.now(),
      rank,
      teamScore
    };
    const newMatchHistory = [...(userProfile.matchHistory || []), newHistoryEntry];
    
    // Achievements check
    const checkAchievements = (stats, matchHistory, level) => {
      const unlocked = [];
      if (stats.wins >= 1) unlocked.push({ id: 'first_win', label: 'First Win', icon: '🎉', desc: 'Win your first auction' });
      if (stats.wins >= 5) unlocked.push({ id: 'champion', label: 'Champion', icon: '🏆', desc: 'Win 5 auctions' });
      if (stats.totalSpent >= 1000000000) unlocked.push({ id: 'big_spender', label: 'Big Spender', icon: '💰', desc: 'Spend over ₹100Cr total' });
      
      if (matchHistory && matchHistory.length >= 3) {
        const sortedHistory = [...matchHistory].sort((a, b) => b.date - a.date);
        if (sortedHistory.slice(0, 3).every(m => m.rank === 1)) {
          unlocked.push({ id: 'auction_king', label: 'Auction King', icon: '👑', desc: 'Win 3 consecutively' });
        }
      }
      
      if (stats.totalBids >= 100 || stats.totalGames >= 15) {
        unlocked.push({ id: 'elite_bidder', label: 'Elite Bidder', icon: '⚡', desc: 'Bid on 100+ players' });
      }
      
      if (level >= 50) unlocked.push({ id: 'hall_of_fame', label: 'Hall of Fame', icon: '🌟', desc: 'Reach Level 50' });
      
      return unlocked;
    };
    
    const newAchievements = checkAchievements(newStats, newMatchHistory, newLevel);
    
    updateUserProfile({
      stats: newStats,
      level: newLevel,
      xp: newXp,
      matchHistory: newMatchHistory,
      achievements: newAchievements
    });
    
  }, [room, user, userProfile, updateUserProfile, roomId]);

  if (loading) {
    return (
      <div className="full-screen-center" style={{ background: '#050505', flexDirection: 'column', gap: 20 }}>
        <div style={{ fontSize: '4rem', animation: 'float 2s ease-in-out infinite' }}>🏆</div>
        <div style={{ fontFamily: 'var(--font-orbitron)', fontSize: '0.9rem', color: 'var(--accent-gold)', letterSpacing: '0.15em' }}>LOADING RESULTS...</div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="full-screen-center" style={{ background: '#050505', flexDirection: 'column', gap: 20 }}>
        <div style={{ fontSize: '3rem' }}>😕</div>
        <h2 style={{ color: 'var(--text-secondary)' }}>Results Not Found</h2>
        <Link to="/dashboard"><Button variant="secondary">← Dashboard</Button></Link>
      </div>
    );
  }

  const teams = room.teams ? Object.entries(room.teams) : [];
  const allHaveBest11 = teams.length > 0 && teams.every(([, t]) => t.best11 && Array.isArray(t.best11) && t.best11.length > 0);

  // Sort by Best 11 Score; tie-breaker = uncappedBest11TotalScore (sum of 4 uncapped players' scores)
  const ranked = [...teams].sort(([, a], [, b]) => {
    if (allHaveBest11) {
      const scoreDiff = (b.best11Score || 0) - (a.best11Score || 0);
      if (scoreDiff !== 0) return scoreDiff;
      // Tie-breaker: sum of scores of the 4 uncapped players in Best 11
      return (b.uncappedBest11TotalScore || 0) - (a.uncappedBest11TotalScore || 0);
    }
    return (b.score || 0) - (a.score || 0);
  });

  // COMPLETE TIE: same best11Score AND same uncappedBest11TotalScore
  let isTie = false;
  if (allHaveBest11 && ranked.length >= 2) {
    const top    = ranked[0][1];
    const second = ranked[1][1];
    isTie = (top.best11Score || 0) === (second.best11Score || 0) &&
             (top.uncappedBest11TotalScore || 0) === (second.uncappedBest11TotalScore || 0);
  }
  const players = room.players || {};
  const soldPlayers = Object.values(players).filter(p => p.status === 'sold');
  const unsoldPlayers = Object.values(players).filter(p => p.status === 'unsold');
  const totalSpent = soldPlayers.reduce((sum, p) => sum + (p.soldFor || 0), 0);
  const rankIcons = ['🥇', '🥈', '🥉'];
  const rankColors = ['var(--accent-gold)', '#C0C0C0', '#CD7F32'];
  const generatedAt = new Date().toLocaleString();

  const handleOpenPdfPreview = () => setShowPdfPreview(true);

  // Tie-breaker applied = best11Score tied but uncappedBest11TotalScore differs → used to break the tie
  let tieBreakerApplied = false;
  if (allHaveBest11 && ranked.length >= 2) {
    const [, top]    = ranked[0];
    const [, second] = ranked[1];
    tieBreakerApplied = !isTie &&
      (top.best11Score || 0) === (second.best11Score || 0) &&
      (top.uncappedBest11TotalScore || 0) !== (second.uncappedBest11TotalScore || 0);
  }

  // Validation check for PDF
  const pdfValidation = room ? validateBest11Data(room) : { valid: false, errors: [] };
  const teamsWithoutBest11 = teams.filter(([, t]) => !t.best11 || !Array.isArray(t.best11) || t.best11.length === 0);

  return (
    <div id="rp-print-shell" style={{ minHeight: '100vh', background: 'var(--bg-primary)', position: 'relative', overflow: 'hidden' }}>
      {/* Print Stylesheet */}
      <style>{`
        @media print {
          body > *:not(#rp-print-shell) { display: none !important; }
          #rp-print-shell { display: block !important; background: #fff !important; min-height: auto !important; overflow: visible !important; }
          #rp-print-back, .rp-bottom-bar { display: none !important; }
          #rp-print-area {
            padding: 24px !important; max-width: 100% !important; padding-bottom: 24px !important;
          }
          #rp-print-area table { width: 100%; border-collapse: collapse; page-break-inside: auto; }
          #rp-print-area tr { page-break-inside: avoid; }
          #rp-print-area th, #rp-print-area td { border: 1px solid #ccc !important; color: #111 !important; padding: 6px 10px !important; }
          #rp-print-area .rp-squad-row { background: #f9f9f9 !important; border: 1px solid #eee !important; }
          #rp-print-area details { display: block !important; }
          #rp-print-area details > div { display: block !important; }
          #rp-print-area [style*="background"] { background: #fff !important; }
          .results-podium { display: none !important; }
        }
      `}</style>

      {/* Gold confetti glow */}
      <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 800, height: 800, background: 'radial-gradient(circle, rgba(255,193,7,0.06), transparent 60%)', borderRadius: '50%', pointerEvents: 'none' }} />

      <div id="rp-print-area" className="results-container" style={{ position: 'relative', zIndex: 1, paddingBottom: 110 }}>
        <Link
          id="rp-print-back"
          to="/dashboard"
          className="btn btn-ghost btn-sm"
          style={{
            position: 'fixed',
            top: 20,
            left: 'max(20px, calc(50% - 384px))',
            zIndex: 100,
            background: 'rgba(8, 8, 20, 0.75)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
            borderRadius: '8px',
            padding: '8px 14px',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          ← Dashboard
        </Link>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32, animation: 'fadeInUp 0.5s ease' }}>
          <div style={{ fontSize: '4rem', marginBottom: 12, animation: 'trophyFloat 4s ease-in-out infinite' }}>🏆</div>
          <h1 style={{ fontFamily: 'var(--font-orbitron)', fontSize: 'clamp(1.4rem, 4vw, 2rem)', fontWeight: 900, letterSpacing: '0.08em', marginBottom: 6 }}>
            AUCTION COMPLETE
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginBottom: 4, textTransform: 'none', letterSpacing: 0, fontFamily: 'var(--font-body)', fontWeight: 400 }}>{room.meta?.name}</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'none', letterSpacing: 0, fontFamily: 'var(--font-body)', fontWeight: 400 }}>Hosted by {room.meta?.ownerName}</p>
        </div>

        {/* Winner / Tie banner (only when all best11 submitted) */}
        {allHaveBest11 && (
          <div style={{ marginBottom: 20, animation: 'fadeInUp 0.4s ease 0.15s both' }}>
            {isTie ? (
              <div style={{ textAlign: 'center', padding: '14px 20px', background: 'rgba(255,193,7,0.06)', border: '1px solid rgba(255,193,7,0.25)', borderRadius: 14 }}>
                <div style={{ fontFamily: 'var(--font-orbitron)', fontSize: '0.9rem', fontWeight: 900, color: '#ffc107', letterSpacing: '0.08em' }}>⚖️ TIE — ADMIN DECISION REQUIRED</div>
                <div style={{ fontSize: '0.72rem', color: '#888', marginTop: 6 }}>Two or more teams have an equal Best 11 Score and Uncapped count</div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '14px 20px', background: 'rgba(0,230,118,0.06)', border: '1px solid rgba(0,230,118,0.2)', borderRadius: 14 }}>
                <div style={{ fontFamily: 'var(--font-orbitron)', fontSize: '0.9rem', fontWeight: 900, color: '#00e676', letterSpacing: '0.08em' }}>🏆 WINNER: {ranked[0]?.[1]?.name}</div>
                <div style={{ fontSize: '0.72rem', color: '#888', marginTop: 6 }}>Best 11 Score: <strong style={{ color: '#ffc107' }}>{ranked[0]?.[1]?.best11Score}</strong> · Uncapped-4 Score: <strong style={{ color: '#14d1ff' }}>{ranked[0]?.[1]?.uncappedBest11TotalScore ?? '—'}</strong></div>
                {tieBreakerApplied && (
                  <div style={{ marginTop: 8, display: 'inline-block', padding: '5px 14px', background: 'rgba(255,193,7,0.08)', border: '1px solid rgba(255,193,7,0.25)', borderRadius: 999, fontSize: '0.68rem', color: '#ffc107', fontWeight: 700 }}>
                    ⚖️ Tie-breaker: Higher Uncapped-4 Score ({ranked[0]?.[1]?.uncappedBest11TotalScore} vs {ranked[1]?.[1]?.uncappedBest11TotalScore})
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* PDF validation alert — teams that haven't submitted Best 11 */}
        {teamsWithoutBest11.length > 0 && (
          <div style={{ marginBottom: 16, padding: '12px 16px', background: 'rgba(255,80,80,0.05)', border: '1px solid rgba(255,80,80,0.2)', borderRadius: 12, animation: 'fadeInUp 0.3s ease both' }}>
            <div style={{ fontSize: '0.73rem', fontWeight: 700, color: '#ff7070', marginBottom: 4 }}>⚠️ Final report cannot be generated yet:</div>
            {teamsWithoutBest11.map(([, t]) => (
              <div key={t.name} style={{ fontSize: '0.7rem', color: '#ff9090', paddingLeft: 10 }}>• {t.name} has not submitted its Best 11</div>
            ))}
          </div>
        )}

        {/* Best 11 not yet submitted banner */}
        {!allHaveBest11 && teams.some(([, t]) => t.best11 && t.best11.length > 0) && (
          <div style={{ marginBottom: 16, padding: '12px 16px', background: 'rgba(255,193,7,0.05)', border: '1px solid rgba(255,193,7,0.2)', borderRadius: 12, textAlign: 'center', fontSize: '0.75rem', color: '#ffc107', animation: 'fadeInUp 0.3s ease both' }}>
            ⏳ Waiting for all teams to submit their Best 11 selection
          </div>
        )}

        {/* Summary stats */}

        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${allHaveBest11 ? 4 : 3}, 1fr)`, gap: 10, marginBottom: 28, animation: 'fadeInUp 0.4s ease 0.1s both' }}>
          {[
            { icon: '🔨', value: soldPlayers.length, label: 'Players Sold', color: 'var(--accent-green)' },
            { icon: '❌', value: unsoldPlayers.length, label: 'Unsold', color: 'var(--accent-red)' },
            { icon: '💰', value: formatPrice(totalSpent), label: 'Total Spent', color: 'var(--accent-gold)' },
            ...(allHaveBest11 ? [{ icon: '⭐', value: ranked[0]?.[1]?.best11Score ?? '—', label: 'Top B11 Score', color: '#7b61ff' }] : []),
          ].map(s => (
            <div key={s.label} style={{ background: 'rgba(8,8,20,0.9)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '16px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.3rem', marginBottom: 6 }}>{s.icon}</div>
              <div style={{ fontFamily: 'var(--font-orbitron)', fontSize: '1.3rem', fontWeight: 800, color: s.color, marginBottom: 4 }}>{s.value}</div>
              <div style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Podium */}
        <div className="results-podium" style={{ animation: 'fadeInUp 0.5s ease 0.2s both' }}>
          {[ranked[1], ranked[0], ranked[2]].filter(Boolean).map(([uid, team], idx) => {
            const podiumRank = idx === 0 ? 2 : idx === 1 ? 1 : 3;
            const heights = { 1: 200, 2: 160, 3: 140 };
            const numPlayers = (team.players || []).length;
            const avgRating = numPlayers > 0 ? ((team.score || 0) / numPlayers).toFixed(1) : '0.0';
            return (
              <div key={uid} className={`results-podium-item rank-${podiumRank}`} style={{ minHeight: heights[podiumRank], order: podiumRank === 1 ? 2 : podiumRank === 2 ? 1 : 3 }}>
                <div style={{ fontSize: '2rem' }}>{rankIcons[podiumRank - 1] || `#${podiumRank}`}</div>
                <Avatar name={team.name} src={team.avatar} size="lg" variant={podiumRank === 1 ? 'gold' : ''} />
                <div style={{ fontWeight: 800, fontSize: '0.95rem', textAlign: 'center', wordBreak: 'break-all' }}>{team.name}</div>
                <div style={{ fontFamily: 'var(--font-orbitron)', fontWeight: 900, color: rankColors[podiumRank - 1], fontSize: '1.2rem' }}>⭐ {allHaveBest11 ? (team.best11Score ?? '—') : (team.score || 0)}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                 {numPlayers} players · {formatPrice(team.purse)} left{allHaveBest11 ? ` · Uncapped-4: ${team.uncappedBest11TotalScore ?? '—'}` : ` · Avg: ${avgRating}`}
                </div>

                {uid === user?.uid && <Badge variant="cyan" style={{ fontSize: '0.6rem' }}>YOU</Badge>}
              </div>
            );
          })}
        </div>

        {/* Full rankings */}
        <div style={{ marginBottom: 28, animation: 'fadeInUp 0.4s ease 0.3s both' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>📊 Final Standings</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {ranked.map(([uid, team], i) => {
              const isYou = uid === user?.uid;
              const numPlayers = (team.players || []).length;
              const avgRating = numPlayers > 0 ? ((team.score || 0) / numPlayers).toFixed(1) : '0.0';
              return (
                <div key={uid} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: isYou ? 'rgba(0,217,255,0.04)' : 'rgba(8,8,20,0.8)',
                  border: `1px solid ${isYou ? 'rgba(0,217,255,0.25)' : i < 3 ? `${rankColors[i]}30` : 'rgba(255,255,255,0.06)'}`,
                  borderRadius: 12, padding: '14px 16px',
                  animation: `fadeInUp 0.3s ease ${0.3 + i * 0.04}s both`,
                }}>
                  <div style={{ fontFamily: 'var(--font-orbitron)', fontWeight: 900, fontSize: '1rem', color: i < 3 ? rankColors[i] : 'var(--text-muted)', minWidth: 32, textAlign: 'center' }}>
                    {i < 3 ? rankIcons[i] : `#${i + 1}`}
                  </div>
                  <Avatar name={team.name} src={team.avatar} size="sm" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{team.name}</span>
                      {isYou && <Badge variant="cyan" style={{ fontSize: '0.55rem' }}>YOU</Badge>}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {numPlayers} players · Purse: {formatPrice(team.purse)}
                      {allHaveBest11
                        ? ` · B11: ${team.best11Score ?? '—'} · UC4: ${team.uncappedBest11TotalScore ?? '—'}`
                        : ` · Avg Rating: ${avgRating}`}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontFamily: 'var(--font-orbitron)', fontWeight: 800, color: i < 3 ? rankColors[i] : 'var(--accent-cyan)', fontSize: '1rem' }}>
                      {allHaveBest11 ? `⭐ ${team.best11Score ?? '—'}` : `⭐ ${team.score || 0}`}
                    </div>
                    <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>{allHaveBest11 ? 'Best 11 Score' : 'Team Score'}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Team details (expand each team's squad) */}
        <div style={{ marginBottom: 28, animation: 'fadeInUp 0.4s ease 0.4s both' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>🏏 Squad Details</div>
          {ranked.map(([uid, team], idx) => (
            <details key={uid} style={{ marginBottom: 8 }} open={idx === 0}>
              <summary style={{
                background: 'rgba(8,8,20,0.9)', border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 12, padding: '12px 16px', cursor: 'pointer', fontWeight: 700,
                display: 'flex', alignItems: 'center', gap: 10, listStyle: 'none',
              }}>
                <span>{idx < 3 ? rankIcons[idx] : `#${idx + 1}`}</span>
                <span style={{ flex: 1 }}>{team.name} ({(team.players || []).length} players)</span>
                <span style={{ fontFamily: 'var(--font-orbitron)', fontWeight: 800, fontSize: '0.85rem', color: 'var(--accent-gold)' }}>⭐ {allHaveBest11 ? (team.best11Score ?? '—') : (team.score || 0)}</span>
              </summary>
              <div style={{ padding: '10px 0', display: 'flex', flexDirection: 'column', gap: 4, marginLeft: 16 }}>
                {(team.players || []).length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', padding: '8px 0', textTransform: 'none', letterSpacing: 0, fontFamily: 'var(--font-body)' }}>No players acquired</div>
                ) : (
                  <>
                    {/* Best 11 section if submitted */}
                    {allHaveBest11 && team.best11 && team.best11.length > 0 && (
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: '0.6rem', fontWeight: 800, color: '#ffc107', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8, padding: '5px 8px', background: 'rgba(255,193,7,0.06)', border: '1px solid rgba(255,193,7,0.15)', borderRadius: 6 }}>
                          ⭐ BEST 11 — Score: {team.best11Score ?? '—'} · Uncapped-4 Score: {team.uncappedBest11TotalScore ?? '—'}
                        </div>
                        {['Batter','WK-Batter','All-Rounder','Bowler'].map(role => {
                          const rPlayers = (team.best11 || []).filter(p => {
                            const r = (p.normalizedCategory || p.role || '').trim().toLowerCase().replace(/[\s_-]+/g,'');
                            if (role === 'Batter')      return r === 'batter' || r === 'batsman';
                            if (role === 'WK-Batter')  return r === 'wkbatter' || r === 'wk' || r.includes('wicket') || r.includes('keeper');
                            if (role === 'All-Rounder') return r.includes('allround') || r === 'ar';
                            if (role === 'Bowler')     return r === 'bowler' || r.includes('bowl');
                            return false;
                          });
                          if (!rPlayers.length) return null;
                          const roleColors = { 'Batter': '#14d1ff', 'WK-Batter': '#00e676', 'All-Rounder': '#7b61ff', 'Bowler': '#ff3cac' };
                          return (
                            <div key={role} style={{ marginBottom: 8 }}>
                              <div style={{ fontSize: '0.56rem', fontWeight: 800, color: roleColors[role], letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>{role} ({rPlayers.length})</div>
                              {rPlayers.map((p, pi) => (
                                <div key={pi} className="rp-squad-row" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px', background: 'rgba(255,193,7,0.04)', borderRadius: 6, border: '1px solid rgba(255,193,7,0.08)', marginBottom: 3 }}>
                                  <Avatar src={p.imageUrl} name={p.name} size="xs" />
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 600, fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                                  </div>
                                  <div style={{ fontFamily: 'var(--font-orbitron)', fontWeight: 700, fontSize: '0.75rem', color: '#ffc107', flexShrink: 0 }}>⭐ {p.score ?? '—'}</div>
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Full squad */}
                    <div style={{ fontSize: '0.56rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>FULL SQUAD ({(team.players||[]).length})</div>
                    {(team.players || []).map((p, pi) => (
                      <div key={pi} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'rgba(8,8,20,0.6)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.04)' }}>
                        <Avatar src={p.imageUrl} name={p.name} size="xs" />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                            {getPlayerRole(p) || p.role}{p.country ? ` · ${p.country}` : ''}
                            {(p.categoryId || p.set) && ` · ${getCategoryCanonicalName(p.categoryId || p.set, p.set || '')}`}
                          </div>
                        </div>
                        <div style={{ fontFamily: 'var(--font-orbitron)', fontWeight: 700, fontSize: '0.78rem', color: 'var(--accent-gold)', flexShrink: 0 }}>{formatPrice(p.soldFor)}</div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </details>
          ))}
        </div>

        {/* Unsold players */}
        {unsoldPlayers.length > 0 && (
          <div style={{ marginBottom: 28, animation: 'fadeInUp 0.4s ease 0.5s both' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-red)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>❌ Unsold Players ({unsoldPlayers.length})</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {unsoldPlayers.map((p, i) => (
                <Badge key={i} variant="red" style={{ fontSize: '0.68rem' }}>{p.name}</Badge>
              ))}
            </div>
          </div>
        )}

        {/* Print footer */}
        <div style={{ textAlign: 'center', fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 20, paddingBottom: 8 }}>
          Generated by Auction Arena · {generatedAt} · Read-Only Report
        </div>

      </div>

      {/* Fixed bottom action bar for quick actions */}
      <div className="rp-bottom-bar" style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'rgba(5, 5, 12, 0.93)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255, 255, 255, 0.06)',
        padding: '14px 20px',
        zIndex: 90,
        boxShadow: '0 -8px 30px rgba(0, 0, 0, 0.6)',
        display: 'flex',
        justifyContent: 'center',
        animation: 'fadeInUp 0.4s ease 0.6s both'
      }}>
        <div style={{ width: '100%', maxWidth: 800, display: 'flex', gap: 10 }}>
          <Button
            variant="neon"
            onClick={() => navigate('/create')}
            style={{
              flex: 1,
              justifyContent: 'center',
              fontSize: 'clamp(0.72rem, 3vw, 0.88rem)',
              whiteSpace: 'nowrap',
              padding: '10px 6px'
            }}
          >
            🏟️ Host Auction
          </Button>
          <Button
            variant="ghost"
            onClick={() => navigate('/leaderboard')}
            style={{
              flex: 1,
              justifyContent: 'center',
              fontSize: 'clamp(0.72rem, 3vw, 0.88rem)',
              whiteSpace: 'nowrap',
              padding: '10px 6px'
            }}
          >
            🏆 Leaderboard
          </Button>
          <Button
            variant="secondary"
            id="pdf-preview-btn"
            onClick={handleOpenPdfPreview}
            style={{
              flex: 1,
              justifyContent: 'center',
              fontSize: 'clamp(0.72rem, 3vw, 0.88rem)',
              whiteSpace: 'nowrap',
              padding: '10px 6px',
              background: pdfValidation.valid ? 'rgba(255,193,7,0.12)' : 'rgba(255,80,80,0.08)',
              border: `1px solid ${pdfValidation.valid ? 'rgba(255,193,7,0.35)' : 'rgba(255,80,80,0.3)'}`,
              color: pdfValidation.valid ? '#ffc107' : '#ff7070',
            }}
          >
            {pdfValidation.valid ? '📄 Preview / Download PDF' : '⚠️ PDF Not Ready'}
          </Button>
        </div>
      </div>

      {/* PDF Preview Modal */}
      {showPdfPreview && room && (
        <PdfPreviewModal room={room} onClose={() => setShowPdfPreview(false)} />
      )}
    </div>
  );
}
