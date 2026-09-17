import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ToastProvider, useToast, Button, Avatar, Input, Badge, ProgressBar } from '../ui/index';
import { formatPrice } from '../../utils/bidUtils';

function ProfileContent() {
  const { user, userProfile, logout, updateTheme } = useAuth();
  const addToast = useToast();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(user?.displayName || '');

  const stats = userProfile?.stats || { wins: 0, losses: 0, totalGames: 0, totalSpent: 0, championships: 0, highestBid: 0 };
  const currentTheme = userProfile?.theme || localStorage.getItem(user ? `theme_${user.uid}` : 'theme_guest') || 'dark';
  const level = userProfile?.level || 1;
  const xp = userProfile?.xp || 0;
  const maxXp = level * 100;
  const xpPct = Math.min(100, (xp / maxXp) * 100);

  const levelTitles = [
    { min: 0, title: 'Rookie', emoji: '🌱' },
    { min: 10, title: 'Challenger', emoji: '⚔️' },
    { min: 25, title: 'Pro', emoji: '🎯' },
    { min: 50, title: 'Elite', emoji: '💎' },
    { min: 75, title: 'Master', emoji: '👑' },
    { min: 100, title: 'Legend', emoji: '🏆' },
  ];
  const getTitle = (lv) => {
    for (let i = levelTitles.length - 1; i >= 0; i--) {
      if (lv >= levelTitles[i].min) return levelTitles[i];
    }
    return levelTitles[0];
  };
  const currentTitle = getTitle(level);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleSave = async () => {
    if (!editName.trim()) { addToast('Name cannot be empty', 'error'); return; }
    try {
      const { updateProfile } = await import('firebase/auth');
      const { auth } = await import('../../firebase');
      if (auth?.currentUser) {
        await updateProfile(auth.currentUser, { displayName: editName.trim() });
      }
      addToast('Profile updated!', 'success', '✅ Saved');
      setEditing(false);
    } catch {
      addToast('Profile updated locally', 'success');
      setEditing(false);
    }
  };

  const ALL_ACHIEVEMENTS = [
    { id: 'first_win', label: 'First Win', icon: '🎉', desc: 'Win your first auction' },
    { id: 'champion', label: 'Champion', icon: '🏆', desc: 'Win 5 auctions' },
    { id: 'big_spender', label: 'Big Spender', icon: '💰', desc: 'Spend over ₹100Cr total' },
    { id: 'auction_king', label: 'Auction King', icon: '👑', desc: 'Win 3 consecutively' },
    { id: 'elite_bidder', label: 'Elite Bidder', icon: '⚡', desc: 'Bid on 100+ players' },
    { id: 'hall_of_fame', label: 'Hall of Fame', icon: '🌟', desc: 'Reach Level 50' },
  ];

  const unlockedIds = (userProfile?.achievements || []).map(a => typeof a === 'string' ? a : a.id);
  const matchHistory = userProfile?.matchHistory || [];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', position: 'relative', overflow: 'hidden' }}>
      {/* Background */}
      <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 600, height: 600, background: 'radial-gradient(circle, rgba(123,97,255,0.06), transparent 65%)', borderRadius: '50%', pointerEvents: 'none' }} />

      <div style={{ maxWidth: 700, margin: '0 auto', padding: '80px 16px 120px', position: 'relative', zIndex: 1 }}>
        <Link to="/dashboard" className="btn btn-ghost btn-sm" style={{ position: 'fixed', top: 24, left: 24, zIndex: 100, display: 'inline-flex', background: 'var(--bg-primary)' }}>← Dashboard</Link>

        {/* Hero card */}
        <div className="profile-hero-card" style={{ animation: 'fadeInUp 0.4s ease' }}>
          <div className="profile-avatar-wrapper">
            <div className="profile-avatar">
              {user?.photoURL
                ? <img src={user.photoURL} alt="avatar" />
                : <span>{(user?.displayName || 'P').charAt(0).toUpperCase()}</span>
              }
            </div>
            <div className="profile-avatar-ring" />
            <div className="profile-online-dot" />
          </div>

          {editing ? (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 14, maxWidth: 300, margin: '0 auto 14px' }}>
              <Input value={editName} onChange={e => setEditName(e.target.value)} autoFocus style={{ flex: 1 }} />
              <Button variant="cyan" size="sm" onClick={handleSave}>Save</Button>
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>✕</Button>
            </div>
          ) : (
            <div className="profile-username">{user?.displayName || 'Player'}</div>
          )}

          <div className="profile-email">{user?.email || 'guest@auctionarena.app'}</div>

          {/* Level / Title */}
          <div style={{ margin: '8px 0 12px', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
            <Badge variant="purple" style={{ fontSize: '0.72rem' }}>
              {currentTitle.emoji} {currentTitle.title} · Level {level}
            </Badge>
            {userProfile?.isGuest && <Badge variant="grey" style={{ fontSize: '0.62rem' }}>GUEST</Badge>}
          </div>

          {/* XP Bar */}
          <div style={{ maxWidth: 320, margin: '0 auto 18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 6 }}>
              <span>{xp} XP</span>
              <span>{maxXp} XP to next level</span>
            </div>
            <div className="xp-bar-wrapper">
              <div className="xp-bar-fill" style={{ width: `${xpPct}%` }} />
            </div>
          </div>

          {/* Player ID & Join date */}
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 18, flexWrap: 'wrap' }}>
            <span>🆔 {user?.uid?.slice(0, 8) || 'DEMO001'}</span>
            <span>📅 Joined {userProfile?.joinedAt ? new Date(userProfile.joinedAt).toLocaleDateString() : new Date().toLocaleDateString()}</span>
          </div>

          {/* Action buttons */}
          <div className="profile-action-buttons">
            <Button variant="secondary" size="sm" onClick={() => setEditing(true)} id="edit-profile-btn">✏️ Edit Profile</Button>
            <Button variant="ghost" size="sm" id="how-to-play-btn">📖 How To Play</Button>
            <Button variant="ghost" size="sm" id="test-voice-btn">🎙️ Voice</Button>
          </div>
        </div>

        {/* Career Stats */}
        <div className="profile-stats-grid" style={{ animation: 'fadeInUp 0.4s ease 0.12s both' }}>
          {[
            { icon: '💰', value: formatPrice(stats.totalSpent), label: 'Budget Managed', color: 'var(--accent-cyan)' },
            { icon: '🏆', value: `#${stats.wins > 0 ? Math.max(1, 100 - stats.wins * 5) : '--'}`, label: 'Global Rank', color: 'var(--accent-purple)' },
            { icon: '🥇', value: stats.championships, label: 'Championships', color: 'var(--accent-gold)' },
            { icon: '🔥', value: formatPrice(stats.highestBid), label: 'Highest Bid', color: 'var(--accent-pink)' },
          ].map(s => (
            <div key={s.label} className="profile-stat-card">
              <div className="stat-icon-row">{s.icon}</div>
              <div className="stat-big-value" style={{ color: s.color }}>{s.value}</div>
              <div className="stat-big-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* More stats */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 16, padding: '18px', marginBottom: 14, animation: 'fadeInUp 0.4s ease 0.2s both' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>📊 Career Performance</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, textAlign: 'center' }}>
            {[
              { label: 'Games', value: stats.totalGames, color: 'var(--accent-cyan)' },
              { label: 'Wins', value: stats.wins, color: 'var(--accent-gold)' },
              { label: 'Win Rate', value: stats.totalGames ? `${Math.round(stats.wins / stats.totalGames * 100)}%` : '0%', color: 'var(--accent-green)' },
            ].map(s => (
              <div key={s.label}>
                <div style={{ fontFamily: 'var(--font-orbitron)', fontSize: '1.4rem', fontWeight: 800, color: s.color, marginBottom: 4 }}>{s.value}</div>
                <div style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Achievements */}
        <div style={{ marginBottom: 14, animation: 'fadeInUp 0.4s ease 0.28s both' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>🏅 Achievements</div>
          <div className="achievement-grid">
            {ALL_ACHIEVEMENTS.map(a => {
              const isUnlocked = unlockedIds.includes(a.id);
              return (
                <div
                  key={a.id}
                  className="achievement-card"
                  style={{
                    opacity: isUnlocked ? 1 : 0.45,
                    filter: isUnlocked ? 'none' : 'grayscale(60%)',
                    borderStyle: isUnlocked ? 'solid' : 'dashed',
                    borderColor: isUnlocked ? 'rgba(255, 193, 7, 0.4)' : 'rgba(255,255,255,0.08)',
                    transition: 'all 0.3s ease',
                  }}
                >
                  <span className="achievement-icon" style={{ filter: isUnlocked ? 'none' : 'grayscale(1)' }}>{a.icon}</span>
                  <div>
                    <div className="achievement-label" style={{ color: isUnlocked ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {a.label} {!isUnlocked && '🔒'}
                    </div>
                    <div className="achievement-desc">{a.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Match History */}
        <div style={{ marginBottom: 14, animation: 'fadeInUp 0.4s ease 0.36s both' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>📋 Auction History</div>
          {matchHistory.length === 0 ? (
            <div style={{ background: 'var(--bg-card)', border: '1px dashed var(--border-color)', borderRadius: 14, padding: '28px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: 8, opacity: 0.4 }}>📋</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'none', letterSpacing: 0, fontFamily: 'var(--font-body)', fontWeight: 400 }}>No auction history yet. Start playing!</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {matchHistory.map((m, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 12, padding: '12px 14px', transition: 'all 0.2s ease' }}>
                  <div style={{ fontSize: '1.3rem' }}>{m.rank === 1 ? '🥇' : m.rank === 2 ? '🥈' : m.rank === 3 ? '🥉' : '🏏'}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name || `Auction #${i + 1}`}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Rank #{m.rank} · {new Date(m.date).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ fontFamily: 'var(--font-orbitron)', fontWeight: 800, color: 'var(--accent-cyan)', fontSize: '0.85rem', flexShrink: 0 }}>⭐ {m.teamScore}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Settings section */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 16, padding: '18px', marginBottom: 14, animation: 'fadeInUp 0.4s ease 0.44s both' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>⚙️ Preferences</div>
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
            {[
              { label: '🔔 Notifications', desc: 'Get alerts for new auctions', checked: true },
              { label: '🔊 Sound Effects', desc: 'Bid sounds and auction alerts', checked: true },
            ].map(pref => (
              <label key={pref.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }}>
                <input type="checkbox" defaultChecked={pref.checked} style={{ width: 18, height: 18, accentColor: 'var(--accent-cyan)', marginTop: 2, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>{pref.label}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2, textTransform: 'none', letterSpacing: 0, fontFamily: 'var(--font-body)', fontWeight: 400 }}>{pref.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

      </div>

      {/* Fixed bottom Sign Out bar */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
        background: 'var(--bg-overlay)', backdropFilter: 'blur(16px)',
        borderTop: '1px solid var(--border-color)',
        padding: '12px 24px',
        display: 'flex', justifyContent: 'center'
      }}>
        <div style={{ width: '100%', maxWidth: 700 }}>
          <Button variant="danger" onClick={handleLogout} id="profile-logout-btn" style={{ width: '100%', justifyContent: 'center' }}>
            🚪 Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function Profile() {
  return <ToastProvider><ProfileContent /></ToastProvider>;
}
