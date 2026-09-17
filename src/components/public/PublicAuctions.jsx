import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button, Badge } from '../ui/index';
import { formatPrice } from '../../utils/bidUtils';

function AppHeader({ navigate, search, setSearch, filter, setFilter }) {
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 101,
      background: 'rgba(5,5,15,0.95)', backdropFilter: 'blur(24px)',
      borderBottom: '1px solid rgba(123,97,255,0.12)',
      boxShadow: '0 4px 30px rgba(0,0,0,0.5)',
    }}>
      <div className="app-header-inner" style={{ height: 'var(--header-height)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px' }}>
        <span style={{ fontFamily: 'var(--font-orbitron)', fontWeight: 900, letterSpacing: '0.08em', fontSize: 'clamp(0.9rem, 2.5vw, 1.2rem)', background: 'var(--gradient-cyan)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>PUBLIC AUCTIONS</span>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/dashboard')}>Back</button>
      </div>
      <div style={{ padding: '8px 20px 14px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ display: 'flex', gap: 12, width: '100%', maxWidth: 960, margin: '0 auto', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="public-search-bar" style={{ flex: 1, minWidth: 200, position: 'relative', margin: 0 }}>
            <span className="public-search-icon" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: '1rem', zIndex: 1 }}>🔍</span>
            <input className="input" placeholder="Search auctions, hosts..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 44, paddingTop: 10, paddingBottom: 10 }} id="public-search-input" />
          </div>
          <div className="filter-chips" style={{ margin: 0 }}>
            {[
              { id: 'all', label: '🌐 All' },
              { id: 'live', label: '🔴 Live' },
              { id: 'waiting', label: '⏳ Waiting' },
            ].map(f => (
              <button key={f.id} className={`filter-chip ${filter === f.id ? 'active' : ''}`} onClick={() => setFilter(f.id)} id={`filter-${f.id}`}>{f.label}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PublicAuctions() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    let unsub = () => {};
    const init = async () => {
      try {
        const { ref: dbRef, onValue } = await import('firebase/database');
        const { db } = await import('../../firebase');
        if (!db) throw new Error('demo');
        unsub = onValue(dbRef(db, 'rooms'), snap => {
          if (snap.exists()) {
            const data = snap.val();
            const publicRooms = Object.entries(data)
              .filter(([, r]) => r.meta?.settings?.publicViewing !== false)
              .map(([id, r]) => ({
                id,
                name: r.meta?.name || 'Unnamed',
                host: r.meta?.ownerName || 'Host',
                code: r.meta?.code || '',
                status: r.meta?.status || 'lobby',
                type: r.meta?.settings?.auctionType || 'cricket',
                teamCount: Object.keys(r.teams || {}).length,
                maxTeams: r.meta?.settings?.maxTeams || 8,
                playerCount: Object.keys(r.players || {}).length,
                soldCount: r.auction?.soldCount || 0,
                budget: r.meta?.settings?.teamPurseAmount || 0,
                createdAt: r.meta?.createdAt || Date.now(),
                passwordProtected: r.meta?.settings?.passwordProtected || false,
              }))
              .sort((a, b) => {
                if (a.status === 'auction' && b.status !== 'auction') return -1;
                if (b.status === 'auction' && a.status !== 'auction') return 1;
                return b.createdAt - a.createdAt;
              });
            setRooms(publicRooms);
          }
          setLoading(false);
        });
      } catch {
        // Demo fallback
        setRooms([
          { id: 'demo1', name: 'IPL Mega Auction 2025', host: 'CricketMaster', status: 'auction', type: 'cricket', teamCount: 6, maxTeams: 8, playerCount: 60, soldCount: 12, budget: 1200000000, createdAt: Date.now() - 3600000, passwordProtected: false },
          { id: 'demo2', name: 'T20 World Draft', host: 'AuctionPro', status: 'lobby', type: 'cricket', teamCount: 3, maxTeams: 10, playerCount: 45, soldCount: 0, budget: 800000000, createdAt: Date.now() - 7200000, passwordProtected: false },
          { id: 'demo3', name: 'College League', host: 'Student99', status: 'lobby', type: 'custom', teamCount: 2, maxTeams: 4, playerCount: 30, soldCount: 0, budget: 500000000, createdAt: Date.now() - 86400000, passwordProtected: true },
        ]);
        setLoading(false);
      }
    };
    init();
    return () => unsub();
  }, []);

  const filtered = rooms.filter(r => {
    if (search && !r.name.toLowerCase().includes(search.toLowerCase()) && !r.host.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === 'live' && r.status !== 'auction') return false;
    if (filter === 'waiting' && r.status !== 'lobby') return false;
    return true;
  });

  const statusConfig = {
    auction: { label: 'LIVE', color: 'var(--accent-green)', badge: 'green', icon: '🔴' },
    lobby: { label: 'WAITING', color: 'var(--accent-gold)', badge: 'gold', icon: '⏳' },
    finished: { label: 'ENDED', color: 'var(--text-muted)', badge: 'grey', icon: '🏁' },
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', position: 'relative', overflow: 'hidden' }}>
      <AppHeader
        navigate={navigate}
        search={search}
        setSearch={setSearch}
        filter={filter}
        setFilter={setFilter}
      />

      {/* Background */}
      <div style={{ position: 'absolute', top: '5%', left: '50%', transform: 'translateX(-50%)', width: 600, height: 600, background: 'radial-gradient(circle, rgba(123,97,255,0.05), transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '160px 16px 60px', position: 'relative', zIndex: 1 }}>





        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', animation: 'fadeIn 0.3s ease' }}>
            <div style={{ fontSize: '3rem', marginBottom: 12, animation: 'float 2s ease-in-out infinite' }}>🔄</div>
            <div style={{ fontFamily: 'var(--font-orbitron)', fontSize: '0.85rem', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>Scanning for live auctions...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: 'rgba(8,8,20,0.8)', border: '1px dashed rgba(123,97,255,0.15)', borderRadius: 20, animation: 'fadeInUp 0.4s ease' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: 14, opacity: 0.4 }}>🏟️</div>
            <h3 style={{ marginBottom: 8, color: 'var(--text-secondary)' }}>No Auctions Found</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: 20, textTransform: 'none', letterSpacing: 0, fontFamily: 'var(--font-body)', fontWeight: 400 }}>
              {search ? 'Try different search terms' : 'Be the first to host a public auction!'}
            </p>
            <Button variant="neon" onClick={() => navigate('/create')}>🚀 Host an Auction</Button>
          </div>
        ) : (
          <div className="public-room-grid" style={{ animation: 'fadeInUp 0.4s ease 0.15s both' }}>
            {filtered.map((room, i) => {
              const sc = statusConfig[room.status] || statusConfig.lobby;
              return (
                <div key={room.id} className={`public-room-card ${room.status === 'auction' ? 'live-card' : ''}`} onClick={() => navigate(room.status === 'auction' ? `/auction/${room.id}` : `/lobby/${room.id}`)} style={{ animation: `fadeInUp 0.3s ease ${i * 0.05}s both` }}>
                  {/* Status badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <Badge variant={sc.badge} style={{ fontSize: '0.62rem' }}>
                      {sc.icon} {sc.label}
                    </Badge>
                    {room.passwordProtected && <span style={{ fontSize: '0.85rem' }}>🔒</span>}
                  </div>

                  {/* Name + host */}
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 800, marginBottom: 4, letterSpacing: '0.04em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{room.name}</h3>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 14, textTransform: 'none', letterSpacing: 0, fontFamily: 'var(--font-body)', fontWeight: 400 }}>Hosted by {room.host}</div>

                  {/* Stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 14 }}>
                    {[
                      { icon: '👥', val: `${room.teamCount}/${room.maxTeams}`, label: 'Teams' },
                      { icon: '🏏', val: room.status === 'auction' ? `${room.soldCount}/${room.playerCount}` : `${room.playerCount}`, label: room.status === 'auction' ? 'Sold' : 'Players' },
                      { icon: '💰', val: formatPrice(room.budget), label: 'Budget' },
                    ].map(s => (
                      <div key={s.label} style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.75rem' }}>{s.icon}</div>
                        <div style={{ fontWeight: 800, fontSize: '0.82rem', color: 'var(--accent-cyan)' }}>{s.val}</div>
                        <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 6 }}>
                    {room.status === 'auction' ? (
                      <Button variant="cyan" size="sm" style={{ flex: 1, justifyContent: 'center' }}>🔴 Watch Live</Button>
                    ) : (
                      <Button variant="purple" size="sm" style={{ flex: 1, justifyContent: 'center' }}>🎯 Join Room</Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
