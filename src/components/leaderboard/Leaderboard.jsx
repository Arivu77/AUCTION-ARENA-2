import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Avatar, Badge, Button } from '../ui/index';
import { db } from '../../firebase';
import { ref, onValue } from 'firebase/database';

const MOCK_LEADERBOARD = [
  { rank: 1, name: 'CricketMaster99', ppm: 95.2, totalPoints: 2380, gamesPlayed: 25, level: 67, title: 'Legend', badge: '🥇', avatar: '', trend: 'up' },
  { rank: 2, name: 'AuctionKing', ppm: 88.5, totalPoints: 1770, gamesPlayed: 20, level: 52, title: 'Elite', badge: '🥈', avatar: '', trend: 'up' },
  { rank: 3, name: 'BidWarrior', ppm: 79.4, totalPoints: 1191, gamesPlayed: 15, level: 45, title: 'Pro', badge: '🥉', avatar: '', trend: 'same' },
  { rank: 4, name: 'MegaBidder', ppm: 72.1, totalPoints: 865, gamesPlayed: 12, level: 38, title: 'Challenger', badge: null, avatar: '', trend: 'down' },
  { rank: 5, name: 'IPL_Genius', ppm: 65.0, totalPoints: 650, gamesPlayed: 10, level: 34, title: 'Challenger', badge: null, avatar: '', trend: 'up' },
  { rank: 6, name: 'DhoniLover', ppm: 58.2, totalPoints: 466, gamesPlayed: 8, level: 30, title: 'Challenger', badge: null, avatar: '', trend: 'same' },
  { rank: 7, name: 'ViratArmy', ppm: 49.3, totalPoints: 345, gamesPlayed: 7, level: 26, title: 'Challenger', badge: null, avatar: '', trend: 'down' },
  { rank: 8, name: 'SkyWalker', ppm: 42.0, totalPoints: 252, gamesPlayed: 6, level: 22, title: 'Rising', badge: null, avatar: '', trend: 'up' },
  { rank: 9, name: 'RohitFan22', ppm: 35.8, totalPoints: 179, gamesPlayed: 5, level: 18, title: 'Rising', badge: null, avatar: '', trend: 'same' },
  { rank: 10, name: 'BumrahBoss', ppm: 28.5, totalPoints: 114, gamesPlayed: 4, level: 14, title: 'Rising', badge: null, avatar: '', trend: 'down' },
  { rank: 11, name: 'WicketWiz', ppm: 21.0, totalPoints: 63, gamesPlayed: 3, level: 12, title: 'Rookie', badge: null, avatar: '', trend: 'up' },
  { rank: 12, name: 'BatFirst', ppm: 15.5, totalPoints: 31, gamesPlayed: 2, level: 10, title: 'Rookie', badge: null, avatar: '', trend: 'same' },
];

function AppHeader({ navigate }) {
  return (
    <header className="app-header" style={{ zIndex: 101, height: 'auto', paddingTop: 10, paddingBottom: 10 }}>
      <div className="app-header-inner" style={{ alignItems: 'center', gap: 14 }}>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/dashboard', { state: { tab: 'rankings' } })} style={{ background: 'var(--bg-primary)', flexShrink: 0 }}>← Back</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="trophy-big" style={{ fontSize: '1.8rem' }}>🏆</span>
          <div className="leaderboard-title" style={{ fontSize: 'clamp(0.9rem, 2.5vw, 1.2rem)' }}>HALL OF FAME</div>
        </div>
      </div>
    </header>
  );
}

export default function Leaderboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('global');
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
                
                let title = 'Rookie';
                if (ppm >= 80) title = 'Legend';
                else if (ppm >= 60) title = 'Elite';
                else if (ppm >= 40) title = 'Pro';
                else if (ppm >= 20) title = 'Challenger';

                return {
                  uid: item.uid,
                  name: item.name || 'Anonymous',
                  ppm,
                  totalPoints: pts,
                  gamesPlayed: games,
                  level: Math.max(1, Math.min(100, Math.floor(pts / 50) + 1)),
                  title,
                  trend: 'same'
                };
              })
              .sort((a, b) => b.ppm - a.ppm)
              .map((item, idx) => ({
                ...item,
                rank: idx + 1,
                badge: idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null
              }));
            setLeaderboardList(list);
          }
        });
      } catch (err) {
        console.error("Failed to load global leaderboard:", err);
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
              
              let title = 'Rookie';
              if (ppm >= 80) title = 'Legend';
              else if (ppm >= 60) title = 'Elite';
              else if (ppm >= 40) title = 'Pro';
              else if (ppm >= 20) title = 'Challenger';

              return {
                uid: item.uid,
                name: item.name || 'Anonymous',
                ppm,
                totalPoints: pts,
                gamesPlayed: games,
                level: Math.max(1, Math.min(100, Math.floor(pts / 50) + 1)),
                title,
                trend: 'same'
              };
            })
            .sort((a, b) => b.ppm - a.ppm)
            .map((item, idx) => ({
              ...item,
              rank: idx + 1,
              badge: idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null
            }));
          setLeaderboardList(list);
        }
      } catch (err) {
        console.error("Failed to load demo leaderboard:", err);
      }
    }
    return () => unsub();
  }, []);

  const tabs = ['Global', 'Weekly', 'Monthly', 'Tournament', 'Friends'];
  const activeLeaderboard = leaderboardList.length > 0 ? leaderboardList : MOCK_LEADERBOARD;
  const top3 = activeLeaderboard.slice(0, 3);
  const rest = activeLeaderboard.slice(3);

  const rankColor = r => r === 1 ? 'var(--accent-gold)' : r === 2 ? '#C0C0C0' : r === 3 ? '#CD7F32' : 'var(--text-muted)';
  const formatWinnings = v => { const cr = v / 10000000; return cr >= 1 ? `₹${cr.toFixed(1)}Cr` : `₹${(v / 100000).toFixed(0)}L`; };
  const trendIcon = t => t === 'up' ? '📈' : t === 'down' ? '📉' : '➡️';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', position: 'relative', overflow: 'hidden' }}>
      <AppHeader navigate={navigate} />

      {/* Glow */}
      <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 800, height: 800, background: 'radial-gradient(circle, rgba(255,193,7,0.04), transparent 60%)', borderRadius: '50%', pointerEvents: 'none' }} />

      <div style={{ maxWidth: 700, margin: '0 auto', padding: '100px 16px 60px', position: 'relative', zIndex: 1 }}>

        {/* Tabs */}
        <div className="leaderboard-tabs" style={{ animation: 'fadeInUp 0.4s ease 0.1s both' }}>
          {tabs.map(t => (
            <button key={t} className={`leaderboard-tab ${activeTab === t.toLowerCase() ? 'active' : ''}`} onClick={() => setActiveTab(t.toLowerCase())} id={`lb-tab-${t.toLowerCase()}`}>
              {t}
            </button>
          ))}
        </div>

        {/* Ranking formula */}
        <div style={{ background: 'rgba(8,8,20,0.8)', border: '1px solid rgba(255,193,7,0.12)', borderRadius: 14, padding: '14px 18px', marginBottom: 20, animation: 'fadeInUp 0.4s ease 0.15s both' }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--accent-gold)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>📊 Ranking Formula</div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {[
              { pct: '40%', label: 'Wins', color: 'var(--accent-gold)' },
              { pct: '25%', label: 'Earnings', color: 'var(--accent-cyan)' },
              { pct: '15%', label: 'Championships', color: 'var(--accent-purple)' },
              { pct: '10%', label: 'Win Rate', color: 'var(--accent-pink)' },
              { pct: '10%', label: 'XP Level', color: 'var(--accent-green)' },
            ].map(f => (
              <div key={f.label} style={{ fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontFamily: 'var(--font-orbitron)', fontWeight: 800, color: f.color, fontSize: '0.78rem' }}>{f.pct}</span>
                <span style={{ color: 'var(--text-muted)' }}>{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Podium */}
        <div className="podium-section" style={{ animation: 'fadeInUp 0.5s ease 0.2s both', marginBottom: 28 }}>
          {[top3[1], top3[0], top3[2]].filter(Boolean).map((p, idx) => {
            const order = idx === 0 ? 2 : idx === 1 ? 1 : 3;
            const heights = { 1: 180, 2: 150, 3: 130 };
            const isYou = p.uid === user?.uid;
            const displayName = isYou ? (user?.displayName || p.name) : p.name;
            return (
              <div key={p.rank} className={`podium-item podium-item-${p.rank}`} style={{ minHeight: heights[p.rank], order }}>
                <div className="podium-rank-badge">{p.rank === 1 ? '👑' : p.badge}</div>
                <Avatar name={displayName} size="lg" variant={p.rank === 1 ? 'gold' : p.rank === 2 ? '' : ''} />
                <div className="podium-username">
                  {displayName}
                  {isYou && <span style={{ display: 'block', fontSize: '0.55rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>YOU</span>}
                </div>
                <Badge variant={p.rank === 1 ? 'gold' : p.rank === 2 ? 'grey' : 'grey'} style={{ fontSize: '0.55rem' }}>{p.title}</Badge>
                <div className="podium-winnings" style={{ color: rankColor(p.rank) }}>
                  {p.ppm !== undefined ? p.ppm : formatWinnings(p.winnings)}
                </div>
                <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>
                  {p.gamesPlayed !== undefined ? `${p.gamesPlayed} games` : `${p.wins} wins`} · Lv.{p.level}
                </div>
              </div>
            );
          })}
        </div>

        {/* Full list */}
        <div className="leaderboard-list" style={{ animation: 'fadeInUp 0.4s ease 0.3s both' }}>
          {rest.map((p, i) => {
            const isYou = p.uid === user?.uid;
            const displayName = isYou ? (user?.displayName || p.name) : p.name;
            return (
              <div key={p.rank} id={`lb-rank-${p.rank}`} className={`leaderboard-card ${isYou ? 'you' : ''}`} style={{ animation: `fadeInUp 0.3s ease ${0.3 + i * 0.04}s both` }}>
                <div className="rank-position" style={{ color: rankColor(p.rank) }}>#{p.rank}</div>
                <Avatar name={displayName} size="sm" />
                <div className="leaderboard-info">
                  <div className="leaderboard-name">
                    {displayName}
                    {isYou && <span style={{ marginLeft: 6, fontSize: '0.6rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>YOU</span>}
                  </div>
                  <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>
                    {p.title} · Lv.{p.level} · {p.gamesPlayed !== undefined ? `${p.gamesPlayed} games` : `${p.wins} wins`}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <div className="leaderboard-winnings">
                    <div className="leaderboard-amount" style={{ color: 'var(--accent-cyan)' }}>
                      {p.ppm !== undefined ? p.ppm : formatWinnings(p.winnings)}
                    </div>
                    <div className="leaderboard-label">
                      {p.ppm !== undefined ? 'PPM' : 'Earnings'}
                    </div>
                  </div>
                  <span style={{ fontSize: '0.82rem' }}>{trendIcon(p.trend)}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Reward tiers */}
        <div style={{ marginTop: 24, background: 'rgba(8,8,20,0.8)', border: '1px solid rgba(123,97,255,0.12)', borderRadius: 16, padding: '20px', animation: 'fadeInUp 0.4s ease 0.5s both' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-purple)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>🎖️ Reward Tiers</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
            {[
              { tier: 'Top 10', icon: '🏆', color: 'var(--accent-gold)', reward: 'Legend Badge + 500 XP' },
              { tier: 'Top 100', icon: '⭐', color: 'var(--accent-cyan)', reward: 'Elite Badge + 200 XP' },
              { tier: 'Top 1000', icon: '🎯', color: 'var(--accent-purple)', reward: 'Pro Badge + 100 XP' },
              { tier: 'Season Champ', icon: '👑', color: 'var(--accent-gold)', reward: 'Crown + 1000 XP' },
            ].map(t => (
              <div key={t.tier} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '14px 12px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: 6 }}>{t.icon}</div>
                <div style={{ fontWeight: 800, fontSize: '0.82rem', color: t.color, marginBottom: 4 }}>{t.tier}</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'none', letterSpacing: 0, fontFamily: 'var(--font-body)', fontWeight: 400 }}>{t.reward}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
