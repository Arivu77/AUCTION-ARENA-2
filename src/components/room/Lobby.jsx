import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ToastProvider, useToast, Button, Avatar } from '../ui/index';
import { formatPrice } from '../../utils/bidUtils';

function LobbyContent() {
  const { roomId } = useParams();
  const { user } = useAuth();
  const addToast = useToast();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState('');

  useEffect(() => {
    let unsub = () => { };
    const init = async () => {
      try {
        const { ref: dbRef, onValue } = await import('firebase/database');
        const { db } = await import('../../firebase');
        if (!db) throw new Error('demo');
        unsub = onValue(dbRef(db, `rooms/${roomId}`), snap => {
          if (snap.exists()) {
            setRoom(snap.val());
            if (snap.val().meta?.status === 'auction') navigate(`/auction/${roomId}`);
          }
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
  }, [roomId, navigate]);

  const isOwner = room?.meta?.ownerId === user?.uid;
  const teams = room?.teams ? Object.entries(room.teams) : [];
  const settings = room?.meta?.settings || {};
  const playerCount = Object.keys(room?.players || {}).length;

  const copy = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(''), 2000);
  };

  const handleStartAuction = async () => {
    if (teams.length < 2) { addToast('Need at least 2 teams to start', 'warning'); return; }
    try {
      const { ref: dbRef, update: dbUpdate } = await import('firebase/database');
      const { db } = await import('../../firebase');
      if (db) {
        await dbUpdate(dbRef(db, `rooms/${roomId}/meta`), { status: 'auction' });
      } else throw new Error('demo');
    } catch {
      const stored = localStorage.getItem(`aa_room_${roomId}`);
      if (stored) {
        const data = JSON.parse(stored);
        data.meta.status = 'auction';
        localStorage.setItem(`aa_room_${roomId}`, JSON.stringify(data));
      }
    }
    navigate(`/auction/${roomId}`);
  };

  const handleEnterAuction = () => { navigate(`/auction/${roomId}`); };

  if (loading) {
    return (
      <div className="full-screen-center" style={{ background: '#050505', flexDirection: 'column', gap: 20 }}>
        <div style={{ fontSize: '4rem', animation: 'float 2s ease-in-out infinite' }}>🏟️</div>
        <div style={{ fontFamily: 'var(--font-orbitron)', fontSize: '0.9rem', color: 'var(--accent-purple)', letterSpacing: '0.15em' }}>LOADING LOBBY...</div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="full-screen-center" style={{ background: '#050505', flexDirection: 'column', gap: 20 }}>
        <div style={{ fontSize: '3rem' }}>😕</div>
        <h2 style={{ color: 'var(--text-secondary)' }}>Room Not Found</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', textTransform: 'none', letterSpacing: 0, fontFamily: 'var(--font-body)' }}>This room doesn't exist or has been removed.</p>
        <Link to="/dashboard"><Button variant="secondary">← Back to Dashboard</Button></Link>
      </div>
    );
  }

  const joinUrl = `${window.location.origin}/lobby/${roomId}`;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', position: 'relative', overflow: 'hidden' }}>
      {/* Background effects */}
      <div style={{ position: 'absolute', top: '10%', left: '30%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(123,97,255,0.06), transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '10%', right: '20%', width: 300, height: 300, background: 'radial-gradient(circle, rgba(0,217,255,0.04), transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />

      <div className="lobby-container" style={{ position: 'relative', zIndex: 1 }}>
        <Link to="/dashboard" className="btn btn-secondary btn-sm" style={{ position: 'fixed', top: 24, left: 24, zIndex: 100, display: 'inline-flex', background: 'var(--bg-primary)' }}>Dashboard</Link>

        {/* Header card */}
        <div className="lobby-header" style={{ animation: 'fadeInUp 0.4s ease' }}>
          <div style={{ fontSize: '3rem', marginBottom: 12, animation: 'trophyFloat 4s ease-in-out infinite' }}>🏟️</div>
          <h1 style={{ fontFamily: 'var(--font-orbitron)', fontSize: 'clamp(1.2rem, 4vw, 1.8rem)', fontWeight: 900, marginBottom: 6, letterSpacing: '0.08em' }}>{room.meta?.name}</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: 16, textTransform: 'none', letterSpacing: 0, fontFamily: 'var(--font-body)', fontWeight: 400 }}>
            Hosted by {room.meta?.ownerName} · {playerCount} players in pool
          </p>

          {/* Room code */}
          <div style={{ background: 'rgba(0,217,255,0.06)', border: '1px solid rgba(0,217,255,0.2)', borderRadius: 16, padding: '16px 20px', display: 'inline-block', marginBottom: 16 }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Room Code</div>
            <div style={{ fontFamily: 'var(--font-orbitron)', fontSize: '1.8rem', fontWeight: 900, color: 'var(--accent-cyan)', letterSpacing: '0.3em', textShadow: '0 0 30px rgba(0,217,255,0.5)' }}>{room.meta?.code}</div>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-cyan btn-sm" onClick={() => copy(room.meta?.code, 'code')}>
              {copied === 'code' ? '✅ Copied!' : '📋 Copy Code'}
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => copy(joinUrl, 'link')}>
              {copied === 'link' ? '✅ Copied!' : '🔗 Copy Link'}
            </button>
          </div>
        </div>

        {/* Settings summary */}
        <div style={{ background: 'rgba(8,8,20,0.9)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '20px', marginBottom: 20, animation: 'fadeInUp 0.4s ease 0.1s both' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>⚙️ Auction Settings</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
            {[
              { icon: '💰', label: 'Team Budget', value: formatPrice(settings.teamPurseAmount || 1000000000) },
              { icon: '⏱️', label: 'Bid Timer', value: `${settings.timerDuration || 15}s` },
              { icon: '👥', label: 'Max Teams', value: settings.maxTeams || 8 },
              { icon: '🏏', label: 'Players', value: playerCount },
              { icon: '🔒', label: 'Password', value: settings.passwordProtected ? 'Yes' : 'No' },
              { icon: '👁️', label: 'Public', value: settings.publicViewing !== false ? 'Yes' : 'No' },
            ].map(s => (
              <div key={s.label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
                <div style={{ fontSize: '1rem', marginBottom: 4 }}>{s.icon}</div>
                <div style={{ fontFamily: 'var(--font-orbitron)', fontSize: '0.9rem', fontWeight: 800, color: 'var(--accent-cyan)', marginBottom: 2 }}>{s.value}</div>
                <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Teams */}
        <div style={{ background: 'rgba(8,8,20,0.9)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '20px', marginBottom: 20, animation: 'fadeInUp 0.4s ease 0.2s both' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              👥 Teams Joined ({teams.length}/{settings.maxTeams || 8})
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, background: 'var(--accent-green)', borderRadius: '50%', boxShadow: '0 0 8px var(--accent-green)', animation: 'pulseDot 1.5s infinite' }} />
              <span style={{ fontSize: '0.72rem', color: 'var(--accent-green)', fontWeight: 700 }}>LIVE</span>
            </div>
          </div>
          <div className="player-list">
            {teams.map(([uid, team], i) => (
              <div key={uid} className={`player-list-item ${uid === room.meta?.ownerId ? 'owner' : ''}`} style={{ animation: `fadeInUp 0.3s ease ${i * 0.05}s both` }}>
                <Avatar
                  name={team.name}
                  src={team.avatar}
                  size="md"
                  variant={uid === room.meta?.ownerId ? 'gold' : uid === user?.uid ? 'cyan' : ''}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{team.name}</span>
                    {uid === room.meta?.ownerId && <span className="badge badge-gold" style={{ fontSize: '0.55rem' }}>👑 HOST</span>}
                    {uid === user?.uid && <span className="badge badge-cyan" style={{ fontSize: '0.55rem' }}>YOU</span>}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>Budget: {formatPrice(team.purse)}</div>
                </div>
                <div style={{ width: 10, height: 10, background: 'var(--accent-green)', borderRadius: '50%', boxShadow: '0 0 6px var(--accent-green)', animation: 'pulseDot 2s infinite', flexShrink: 0 }} />
              </div>
            ))}
            {teams.length === 0 && (
              <div style={{ textAlign: 'center', padding: '24px 16px', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                <div style={{ fontSize: '2rem', marginBottom: 8, opacity: 0.4 }}>👥</div>
                No teams yet. Share the room code!
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Fixed bottom action bar */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
        background: 'rgba(5,5,5,0.92)', backdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        padding: '14px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ display: 'flex', gap: 12, width: '100%', maxWidth: 680, flexDirection: 'column' }}>
          {isOwner ? (
            <Button id="lobby-start-btn" variant="gold" onClick={handleStartAuction} style={{ width: '100%', justifyContent: 'center', paddingLeft: 12, paddingRight: 12, fontSize: '0.9rem' }}>
              🚀 Start Auction ({teams.length} teams)
            </Button>
          ) : (
            <Button id="lobby-enter-btn" variant="neon" onClick={handleEnterAuction} style={{ width: '100%', justifyContent: 'center', paddingLeft: 12, paddingRight: 12, fontSize: '0.9rem' }}>
              ⚡ Enter Auction Room
            </Button>
          )}
          {room.meta?.status === 'auction' && (
            <Button variant="cyan" onClick={() => navigate(`/auction/${roomId}`)} style={{ width: '100%', justifyContent: 'center', paddingLeft: 12, paddingRight: 12, fontSize: '0.9rem' }}>
              🔴 Auction is LIVE — Join Now!
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Lobby() {
  return <ToastProvider><LobbyContent /></ToastProvider>;
}
