import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ToastProvider, useToast, Avatar, Button } from '../ui/index';
import { db } from '../../firebase';
import { ref, onValue } from 'firebase/database';
import { formatPrice } from '../../utils/bidUtils';

function MiniParticles() {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {[...Array(20)].map((_, i) => {
        const colors = ['#00D9FF', '#7B61FF', '#FF3CAC'];
        const color = colors[i % 3];
        return (
          <div key={i} className="particle" style={{
            left: `${(i * 5.2) % 100}%`, background: color,
            boxShadow: `0 0 4px ${color}`,
            width: `${(i % 2) + 1}px`, height: `${(i % 2) + 1}px`,
            animationDuration: `${14 + i * 1.2}s`,
            animationDelay: `${-i * 1.8}s`,
            '--drift': `${(i % 2 === 0 ? 1 : -1) * (20 + i * 4)}px`,
          }} />
        );
      })}
    </div>
  );
}

function AppHeader({ user, userProfile, onLogout, navigate }) {
  return (
    <header className="app-header" style={{ zIndex: 101 }}>
      <div className="app-header-inner">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>
          <span className="logo-icon">🏆</span>
          <span className="logo">AUCTION ARENA</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button id="header-profile-btn" className="header-icon-btn" onClick={() => navigate('/profile')} title="Profile">
            {user?.photoURL ? <img src={user.photoURL} style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover' }} alt="" /> : '👤'}
          </button>
        </div>
      </div>
    </header>
  );
}

function BottomNav({ activeTab, onChange }) {
  const tabs = [
    { id: 'play', icon: '🎮', label: 'Play' },
    { id: 'rooms', icon: '🏟️', label: 'Rooms' },
    { id: 'rankings', icon: '🏆', label: 'Ranks' },
    { id: 'profile', icon: '👤', label: 'Profile' },
  ];
  return (
    <nav className="bottom-nav">
      <div className="bottom-nav-inner">
        {tabs.map(tab => (
          <button key={tab.id} id={`nav-${tab.id}`} className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`} onClick={() => onChange(tab.id)}>
            <span className="nav-tab-icon">{tab.icon}</span>
            <span className="nav-tab-label">{tab.label}</span>
            <div className="nav-tab-indicator" />
          </button>
        ))}
      </div>
    </nav>
  );
}

// ── PLAY SCREEN ───────────────────────────────────────────────────────────────
function PlayScreen({ user, userProfile, navigate }) {
  const stats = userProfile?.stats || { wins: 0, losses: 0, totalGames: 0, totalSpent: 0, championships: 0, highestBid: 0 };
  const winRate = stats.totalGames ? Math.round((stats.wins / stats.totalGames) * 100) : 0;

  return (
    <div className="screen-content">
      {/* Welcome card */}
      <div className="welcome-card" style={{ animation: 'fadeInUp 0.4s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div className={`avatar avatar-lg ${user?.photoURL ? '' : 'avatar-purple'}`} style={{ fontSize: '1.6rem', flexShrink: 0 }}>
            {user?.photoURL ? <img src={user.photoURL} alt="" /> : (user?.displayName || 'P').charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>Welcome back</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 800, color: '#fff', letterSpacing: '0.04em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.displayName?.split(' ')[0] || 'Champion'} 👋
            </div>
            {userProfile?.isGuest && <span className="badge badge-grey" style={{ fontSize: '0.6rem', marginTop: 4 }}>GUEST</span>}
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Level</div>
            <div style={{ fontFamily: 'var(--font-orbitron)', fontSize: '1.4rem', fontWeight: 900, background: 'var(--gradient-gold)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {userProfile?.level || 1}
            </div>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="stats-row" style={{ animation: 'fadeInUp 0.4s ease 0.1s both' }}>
        <div className="mini-stat-card">
          <div className="mini-stat-value text-gradient-gold">{stats.wins}</div>
          <div className="mini-stat-label">🏆 Wins</div>
        </div>
        <div className="mini-stat-card">
          <div className="mini-stat-value" style={{ color: 'var(--accent-cyan)' }}>{stats.totalGames}</div>
          <div className="mini-stat-label">🎮 Games</div>
        </div>
        <div className="mini-stat-card">
          <div className="mini-stat-value text-gradient-purple">{winRate}%</div>
          <div className="mini-stat-label">🎯 Win %</div>
        </div>
      </div>

      {/* Action cards */}
      <div style={{ marginBottom: 24, animation: 'fadeInUp 0.4s ease 0.18s both' }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>Quick Play</div>
        <div className="action-cards-grid">
          <div className="action-card host" onClick={() => navigate('/create')} id="create-room-btn">
            <span className="action-card-icon">🏟️</span>
            <div>
              <div className="action-card-title">HOST</div>
              <div className="action-card-sub">Create & manage your own auction room</div>
            </div>
            <span className="badge badge-cyan" style={{ fontSize: '0.58rem', alignSelf: 'flex-start' }}>ROOM OWNER</span>
          </div>
          <div className="action-card join" onClick={() => navigate('/join')} id="join-room-btn">
            <span className="action-card-icon">🎯</span>
            <div>
              <div className="action-card-title">JOIN</div>
              <div className="action-card-sub">Enter a code and dive into a live auction</div>
            </div>
            <span className="badge badge-purple" style={{ fontSize: '0.58rem', alignSelf: 'flex-start' }}>PLAYER</span>
          </div>
        </div>
        <div style={{ marginTop: 10 }}>
          <div className="action-card public" onClick={() => navigate('/public')} id="public-rooms-btn" style={{ flexDirection: 'row', alignItems: 'center', minHeight: 'auto', padding: '14px 16px', gap: 12 }}>
            <span style={{ fontSize: '1.4rem' }}>🌐</span>
            <div style={{ flex: 1 }}>
              <div className="action-card-title" style={{ fontSize: '1rem' }}>PUBLIC AUCTIONS</div>
              <div className="action-card-sub">Browse live rooms & spectate</div>
            </div>
            <span className="badge badge-gold" style={{ fontSize: '0.58rem' }}>LIVE</span>
          </div>
        </div>
      </div>

      {/* Recent matches */}
      <div style={{ animation: 'fadeInUp 0.4s ease 0.26s both' }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>Recent Auctions</div>
        {(userProfile?.matchHistory || []).length === 0 ? (
          <div style={{ background: 'rgba(8,8,20,0.8)', border: '1px dashed rgba(123,97,255,0.15)', borderRadius: 16, padding: '32px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12, opacity: 0.4 }}>🏏</div>
            <div style={{ fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>No auctions yet</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'none', letterSpacing: 0, fontFamily: 'var(--font-body)', fontWeight: 400 }}>Host or join your first auction above!</div>
          </div>
        ) : (
          <div className="match-history-list">
            {(userProfile.matchHistory || []).slice(0, 4).map((m, i) => (
              <div key={i} className="match-card">
                <div className="match-rank-icon">{m.rank === 1 ? '🥇' : m.rank === 2 ? '🥈' : m.rank === 3 ? '🥉' : '🏏'}</div>
                <div className="match-info">
                  <div className="match-rank-text">{m.name || `Auction #${i + 1}`} — Rank #{m.rank}</div>
                  <div className="match-date">{new Date(m.date).toLocaleDateString()}</div>
                </div>
                <div className="match-score">⭐ {m.teamScore}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── ROOMS SCREEN ──────────────────────────────────────────────────────────────
function RoomsScreen({ navigate }) {
  const [liveRooms, setLiveRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const tryFetch = async () => {
      try {
        const { ref, onValue } = await import('firebase/database');
        const { db } = await import('../../firebase');
        if (!db) throw new Error('no db');
        const roomsRef = ref(db, 'rooms');
        const unsub = onValue(roomsRef, snap => {
          if (snap.exists()) {
            const data = snap.val();
            const publicRooms = Object.entries(data)
              .filter(([, r]) => r.meta?.status !== 'finished' && r.meta?.settings?.publicViewing !== false)
              .map(([id, r]) => ({ id, ...r.meta, playerCount: Object.keys(r.players || {}).length, teamCount: Object.keys(r.teams || {}).length }))
              .slice(0, 12);
            setLiveRooms(publicRooms);
          }
          setLoading(false);
        });
        return unsub;
      } catch {
        setLoading(false);
        return () => {};
      }
    };
    let unsub;
    tryFetch().then(u => { unsub = u; });
    return () => { if (unsub) unsub(); };
  }, []);

  const filteredRooms = liveRooms.filter(r =>
    (r.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.ownerName || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      {/* Fixed header with title + search bar */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 101,
        background: 'var(--bg-overlay)', backdropFilter: 'blur(24px)',
        borderBottom: '1px solid var(--border-color)',
        boxShadow: '0 4px 30px rgba(0,0,0,0.15)',
      }}>
        {/* Title row */}
        <div className="app-header-inner" style={{ height: 'var(--header-height)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px' }}>
          <span style={{ fontFamily: 'var(--font-orbitron)', fontWeight: 900, letterSpacing: '0.08em', fontSize: 'clamp(0.9rem, 2.5vw, 1.2rem)', background: 'var(--gradient-cyan)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>PUBLIC AUCTIONS</span>
          <button id="create-public-room-btn" className="btn btn-neon btn-sm" onClick={() => navigate('/create')}>+ Host</button>
        </div>
        {/* Search bar row */}
        <div style={{ padding: '8px 20px 14px', borderTop: '1px solid var(--border-color)' }}>
          <div style={{ position: 'relative', maxWidth: 960, margin: '0 auto' }}>
            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: '1rem', zIndex: 1, color: 'var(--text-muted)' }}>🔍</span>
            <input
              className="input"
              id="rooms-search-input"
              placeholder="Search rooms, hosts..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 44, paddingTop: 10, paddingBottom: 10, width: '100%' }}
            />
          </div>
        </div>
      </div>

      <div className="screen-content" style={{ paddingTop: 'calc(var(--header-height) + 58px)', paddingBottom: 'calc(var(--bottom-nav-height) + 80px)' }}>
        <div className="rooms-container" style={{ animation: 'fadeInUp 0.4s ease 0.1s both' }}>
          <div className="rooms-toolbar">
            <div className="live-counter">
              <div className="live-dot" /><span>{filteredRooms.length} Live Rooms</span>
            </div>
          </div>
          {loading ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              <div style={{ fontSize: '2rem', marginBottom: 8, animation: 'float 2s ease-in-out infinite' }}>🔄</div>
              Loading rooms...
            </div>
          ) : filteredRooms.length === 0 ? (
            <div className="rooms-empty">
              <div className="rooms-empty-icon">🏟️</div>
              <div className="rooms-empty-title">{search ? 'No rooms match your search' : 'No Public Rooms Active'}</div>
              <div className="rooms-empty-sub" style={{ marginBottom: 20 }}>{search ? 'Try a different name' : 'Be the first to create one!'}</div>
              {!search && <button id="create-room-empty-btn" className="btn btn-purple" onClick={() => navigate('/create')} style={{ margin: '0 auto', display: 'flex' }}>🚀 Host Auction</button>}
            </div>
          ) : (
            filteredRooms.map(room => (
              <div key={room.id} className="room-card" onClick={() => navigate(`/lobby/${room.id}`)}>
                <div className="room-team-logo">🏟️</div>
                <div className="room-info">
                  <div className="room-name">{room.name}</div>
                  <div className="room-meta">
                    <span className="room-meta-text">👥 {room.teamCount} teams</span>
                    <span className="room-meta-text">🏏 {room.playerCount} players</span>
                    {room.status === 'auction' && <span className="room-pulse"><span className="room-pulse-dot" />LIVE</span>}
                    {room.status === 'lobby' && <span className="badge badge-gold" style={{ fontSize: '0.6rem', padding: '2px 8px' }}>WAITING</span>}
                  </div>
                </div>
                <button id={`join-room-${room.id}`} className="room-join-btn">JOIN</button>
              </div>
            ))
          )}
        </div>
        {/* Fixed bottom Enter Room Code bar */}
        <div style={{
          position: 'fixed', bottom: 'var(--bottom-nav-height)', left: 0, right: 0, zIndex: 45,
          background: 'var(--bg-overlay)', backdropFilter: 'blur(16px)',
          borderTop: '1px solid var(--border-color)',
          padding: '12px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ display: 'flex', gap: 12, width: '100%', maxWidth: 680, alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Have a room code?</span>
            <button id="join-by-code-btn" className="btn btn-secondary btn-sm" onClick={() => navigate('/join')} style={{ margin: 0 }}>🔑 Enter Room Code</button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── RANKINGS SCREEN ───────────────────────────────────────────────────────────

function RankingsScreen({ user, navigate }) {
  const [leaderboardList, setLeaderboardList] = useState([]);

  useEffect(() => {
    let unsub = () => {};
    if (db) {
      try {
        unsub = onValue(ref(db, 'leaderboard'), snap => {
          if (snap.exists()) {
            const data = snap.val();
            const list = Object.values(data)
              .map(item => {
                const games = item.gamesPlayed || 1;
                const pts = item.totalPoints || 0;
                const ppm = item.ppm !== undefined ? item.ppm : Number((pts / games).toFixed(1));
                return {
                  uid: item.uid,
                  name: item.name || 'Anonymous',
                  ppm,
                  gamesPlayed: games,
                  level: Math.max(1, Math.min(100, Math.floor(pts / 50) + 1)),
                  trend: 'same'
                };
              })
              .sort((a, b) => b.ppm - a.ppm)
              .map((item, idx) => ({
                ...item,
                rank: idx + 1,
                badge: idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null,
                isYou: item.uid === user?.uid
              }));
            setLeaderboardList(list);
          }
        });
      } catch (err) {
        console.error("Failed to load global leaderboard in dashboard:", err);
      }
    } else {
      try {
        const stored = localStorage.getItem('aa_demo_leaderboard');
        if (stored) {
          const data = JSON.parse(stored);
          const list = Object.values(data)
            .map(item => {
              const games = item.gamesPlayed || 1;
              const pts = item.totalPoints || 0;
              const ppm = item.ppm !== undefined ? item.ppm : Number((pts / games).toFixed(1));
              return {
                uid: item.uid,
                name: item.name || 'Anonymous',
                ppm,
                gamesPlayed: games,
                level: Math.max(1, Math.min(100, Math.floor(pts / 50) + 1)),
                trend: 'same'
              };
            })
            .sort((a, b) => b.ppm - a.ppm)
            .map((item, idx) => ({
              ...item,
              rank: idx + 1,
              badge: idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null,
              isYou: item.uid === user?.uid
            }));
          setLeaderboardList(list);
        }
      } catch (err) {
        console.error("Failed to load demo leaderboard in dashboard:", err);
      }
    }
    return () => unsub();
  }, [user?.uid]);

  const activeLeaders = leaderboardList.length > 0 ? leaderboardList.slice(0, 10) : [
    { rank: 1, name: user?.displayName || 'Champion', winnings: '92.5', badge: '🥇', wins: 12, level: 45, isYou: true, ppm: 92.5, gamesPlayed: 12 },
    { rank: 2, name: 'RohitFan22', winnings: '86.2', badge: '🥈', wins: 9, level: 38, ppm: 86.2, gamesPlayed: 9 },
    { rank: 3, name: 'DhoniLvr99', winnings: '79.8', badge: '🥉', wins: 7, level: 30, ppm: 79.8, gamesPlayed: 7 },
    { rank: 4, name: 'ViratKing', winnings: '74.5', badge: null, wins: 5, level: 24, ppm: 74.5, gamesPlayed: 5 },
    { rank: 5, name: 'IPL_Master', winnings: '68.0', badge: null, wins: 4, level: 20, ppm: 68.0, gamesPlayed: 4 },
  ];

  const rankColor = r => r === 1 ? 'var(--accent-gold)' : r === 2 ? '#C0C0C0' : r === 3 ? '#CD7F32' : 'var(--text-muted)';

  return (
    <>
      <header className="app-header" style={{ zIndex: 101 }}>
        <div className="app-header-inner">
          <span style={{ fontFamily: 'var(--font-orbitron)', fontWeight: 900, letterSpacing: '0.08em', fontSize: 'clamp(0.9rem, 2.5vw, 1.2rem)', background: 'var(--gradient-gold)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>GLOBAL RANKINGS</span>
        </div>
      </header>
      <div className="screen-content">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/leaderboard')} style={{ marginBottom: 16, fontSize: '0.78rem' }}>View Full Leaderboard →</button>
      <div className="leaderboard-list">
        {activeLeaders.map((p, i) => (
          <div key={p.rank} id={`lb-rank-${p.rank}`} className={`leaderboard-card ${p.isYou ? 'you' : ''}`} style={{ animation: `fadeInUp 0.4s ease ${i * 0.06}s both` }}>
            <div className="rank-position" style={{ color: rankColor(p.rank) }}>
              {p.rank <= 3 ? p.badge : `#${p.rank}`}
            </div>
            <div className="avatar avatar-sm" style={{ background: 'var(--bg-surface)', border: `2px solid ${rankColor(p.rank)}30` }}>
              {p.name.charAt(0).toUpperCase()}
            </div>
            <div className="leaderboard-info">
              <div className="leaderboard-name" style={{ color: p.isYou ? 'var(--accent-cyan)' : undefined }}>
                {p.name}{p.isYou && <span style={{ marginLeft: 6, fontSize: '0.62rem', color: 'var(--accent-cyan)', fontWeight: 700 }}>YOU</span>}
              </div>
              <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>
                Lv.{p.level} · {p.gamesPlayed !== undefined ? `${p.gamesPlayed} games` : `${p.wins} wins`}
              </div>
            </div>
            <div className="leaderboard-winnings">
              <div className="leaderboard-amount" style={{ color: rankColor(p.rank) }}>
                {p.ppm !== undefined ? p.ppm : p.winnings}
              </div>
              <div className="leaderboard-label">
                {p.ppm !== undefined ? 'PPM' : 'Earnings'}
              </div>
            </div>
          </div>
        ))}
      </div>
      </div>
    </>
  );
}

// ── PROFILE SCREEN ────────────────────────────────────────────────────────────
function ProfileScreen({ user, userProfile, onLogout, navigate }) {
  const { updateTheme } = useAuth();
  const stats = userProfile?.stats || { wins: 0, totalGames: 0, totalSpent: 0, championships: 0, highestBid: 0 };
  const currentTheme = userProfile?.theme || localStorage.getItem(user ? `theme_${user.uid}` : 'theme_guest') || 'dark';
  const level = userProfile?.level || 1;
  const xp = userProfile?.xp || 0;
  const levelTitles = { 1: 'Rookie', 10: 'Challenger', 25: 'Pro', 50: 'Elite', 75: 'Master', 100: 'Legend' };
  const getLevelTitle = (lv) => {
    const keys = Object.keys(levelTitles).map(Number).sort((a, b) => b - a);
    for (const k of keys) if (lv >= k) return levelTitles[k];
    return 'Rookie';
  };

  return (
    <div className="screen-content">
      <div className="profile-hero-card" style={{ animation: 'fadeInUp 0.4s ease' }}>
        <div className="profile-avatar-wrapper">
          <div className="profile-avatar">
            {user?.photoURL ? <img src={user.photoURL} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span>{(user?.displayName || 'P').charAt(0).toUpperCase()}</span>}
            <div className="profile-avatar-ring" />
          </div>
          <div className="profile-online-dot" />
        </div>
        <div className="profile-username">{user?.displayName || 'Player'}</div>
        <div className="profile-email">{user?.email || 'guest@auctionarena.app'}</div>
        <div style={{ margin: '8px 0 16px' }}>
          <span className="badge badge-purple" style={{ fontSize: '0.7rem' }}>
            {getLevelTitle(level)} · Level {level}
          </span>
        </div>
        {/* XP bar */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 6 }}>
            <span>{xp} XP</span><span>{(level * 100)} XP needed</span>
          </div>
          <div className="xp-bar-wrapper">
            <div className="xp-bar-fill" style={{ width: `${Math.min(100, (xp % 100))}%` }} />
          </div>
        </div>
        <div className="profile-action-buttons">
          <button id="edit-profile-btn" className="btn btn-secondary btn-sm">✏️ Edit Profile</button>
          <button id="how-to-play-btn" className="btn btn-ghost btn-sm">📖 How To Play</button>
          <button id="test-voice-btn" className="btn btn-ghost btn-sm">🎙️ Voice</button>
        </div>
      </div>

      <div className="profile-stats-grid" style={{ animation: 'fadeInUp 0.4s ease 0.15s both' }}>
        <div className="profile-stat-card">
          <div className="stat-icon-row">💰</div>
          <div className="stat-big-value text-neon-cyan">{formatPrice(stats.totalSpent)}</div>
          <div className="stat-big-label">Budget Managed</div>
        </div>
        <div className="profile-stat-card">
          <div className="stat-icon-row">🏆</div>
          <div className="stat-big-value text-neon-purple">#{stats.wins > 0 ? Math.max(1, 100 - stats.wins * 3) : '--'}</div>
          <div className="stat-big-label">Global Rank</div>
        </div>
      </div>

      {/* Career stats */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 16, padding: '18px', marginBottom: 12, animation: 'fadeInUp 0.4s ease 0.22s both' }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>Career Stats</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, textAlign: 'center' }}>
          {[
            { label: 'Wins', value: stats.wins, color: 'var(--accent-gold)' },
            { label: 'Games', value: stats.totalGames, color: 'var(--accent-cyan)' },
            { label: 'Win Rate', value: stats.totalGames ? `${Math.round(stats.wins / stats.totalGames * 100)}%` : '0%', color: 'var(--accent-purple)' },
          ].map(s => (
            <div key={s.label}>
              <div style={{ fontFamily: 'var(--font-orbitron)', fontSize: '1.3rem', fontWeight: 800, color: s.color, marginBottom: 4 }}>{s.value}</div>
              <div style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Achievements */}
      {(userProfile?.achievements || []).length > 0 && (
        <div style={{ marginBottom: 12, animation: 'fadeInUp 0.4s ease 0.3s both' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Achievements</div>
          <div className="achievement-grid">
            {userProfile.achievements.map(a => (
              <div key={a.id} className="achievement-card">
                <span className="achievement-icon">{a.icon}</span>
                <div>
                  <div className="achievement-label">{a.label}</div>
                  <div className="achievement-desc">{a.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preferences */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 16, padding: '18px', marginBottom: 12, animation: 'fadeInUp 0.4s ease 0.34s both' }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>⚙️ Preferences</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={currentTheme === 'light'}
              onChange={(e) => updateTheme(e.target.checked ? 'light' : 'dark')}
              style={{ width: 18, height: 18, accentColor: 'var(--accent-cyan)', marginTop: 2, flexShrink: 0 }}
            />
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>☀️ Light Mode</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2, textTransform: 'none', letterSpacing: 0, fontFamily: 'var(--font-body)', fontWeight: 400 }}>Toggle high-contrast light mode across the application</div>
            </div>
          </label>
        </div>
      </div>

      <button id="profile-logout-btn" className="btn btn-danger w-full" onClick={onLogout} style={{ width: '100%', justifyContent: 'center', marginTop: 8, animation: 'fadeInUp 0.4s ease 0.38s both' }}>
        🚪 Sign Out
      </button>
    </div>
  );
}

// ── MAIN DASHBOARD ────────────────────────────────────────────────────────────
function DashboardContent() {
  const { user, userProfile, logout } = useAuth();
  const addToast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(location.state?.tab || 'play');

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const renderScreen = () => {
    switch (activeTab) {
      case 'play': return <PlayScreen user={user} userProfile={userProfile} navigate={navigate} />;
      case 'rooms': return <RoomsScreen navigate={navigate} />;
      case 'rankings': return <RankingsScreen user={user} navigate={navigate} />;
      case 'profile': return <ProfileScreen user={user} userProfile={userProfile} onLogout={handleLogout} navigate={navigate} />;
      default: return <PlayScreen user={user} userProfile={userProfile} navigate={navigate} />;
    }
  };

  return (
    <div className="mobile-screen">
      <MiniParticles />
      <div style={{ position: 'fixed', top: '10%', left: '5%', width: 300, height: 300, background: 'radial-gradient(circle, rgba(123,97,255,0.05), transparent 70%)', borderRadius: '50%', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', bottom: '20%', right: '5%', width: 250, height: 250, background: 'radial-gradient(circle, rgba(0,217,255,0.04), transparent 70%)', borderRadius: '50%', pointerEvents: 'none', zIndex: 0 }} />

      {activeTab !== 'rooms' && activeTab !== 'rankings' && (
        <AppHeader user={user} userProfile={userProfile} onLogout={handleLogout} navigate={navigate} />
      )}

      <div style={{ position: 'relative', zIndex: 1, flex: 1, overflow: 'hidden' }}>
        {renderScreen()}
      </div>

      <BottomNav activeTab={activeTab} onChange={setActiveTab} />
    </div>
  );
}

export default function Dashboard() {
  return (
    <ToastProvider>
      <DashboardContent />
    </ToastProvider>
  );
}
