import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ToastProvider, useToast, Input, Button } from '../ui/index';

function JoinRoomForm() {
  const { user } = useAuth();
  const addToast = useToast();
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState('');
  const [teamName, setTeamName] = useState(user?.displayName || '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('code'); // 'code' | 'details'

  const handleLookup = async () => {
    if (!roomCode.trim()) { addToast('Please enter a room code', 'error'); return; }
    setStep('details');
  };

  const handleJoin = async () => {
    if (!teamName.trim()) { addToast('Please enter your team name', 'error'); return; }
    setLoading(true);
    try {
      // Try Firebase first
      let roomId = null;
      let status = 'lobby';
      try {
        const { ref: dbRef, get, update: dbUpdate } = await import('firebase/database');
        const { db } = await import('../../firebase');
        if (db) {
          const snap = await get(dbRef(db, 'rooms'));
          if (snap.exists()) {
            const rooms = snap.val();
            const entry = Object.entries(rooms).find(([, r]) => r.meta?.code === roomCode.trim().toUpperCase());
            if (entry) {
              roomId = entry[0];
              const room = entry[1];
              status = room.meta?.status || 'lobby';
              // Check password if needed
              if (room.meta?.settings?.passwordProtected && room.meta?.settings?.password) {
                if (password !== room.meta.settings.password) {
                  addToast('Incorrect room password', 'error');
                  setLoading(false);
                  return;
                }
              }
              // Join room - preserve team state if they already exist (rejoining)
              const existingTeam = room.teams?.[user.uid];
              const teamData = {
                name: teamName.trim(),
                displayName: user?.displayName || teamName.trim(),
                avatar: user?.photoURL || '',
                purse: existingTeam ? (existingTeam.purse !== undefined ? existingTeam.purse : (room.meta?.settings?.teamPurseAmount || 1000000000)) : (room.meta?.settings?.teamPurseAmount || 1000000000),
                score: existingTeam ? (existingTeam.score !== undefined ? existingTeam.score : 0) : 0,
                players: existingTeam ? (existingTeam.players || []) : [],
              };
              await dbUpdate(dbRef(db, `rooms/${roomId}/teams/${user.uid}`), teamData);
              await dbUpdate(dbRef(db, `rooms/${roomId}/presence/${user.uid}`), {
                name: teamName.trim(),
                online: true,
                joinedAt: Date.now(),
              });
            }
          }
        }
      } catch (e) {
        console.warn('Firebase lookup failed:', e);
      }

      // Demo mode fallback
      if (!roomId) {
        const keys = Object.keys(localStorage).filter(k => k.startsWith('aa_room_'));
        for (const key of keys) {
          const data = JSON.parse(localStorage.getItem(key));
          if (data?.meta?.code === roomCode.trim().toUpperCase()) {
            roomId = key.replace('aa_room_', '');
            status = data.meta?.status || 'lobby';
            if (data.meta?.settings?.passwordProtected && data.meta?.settings?.password && password !== data.meta.settings.password) {
              addToast('Incorrect room password', 'error');
              setLoading(false);
              return;
            }
            data.teams = data.teams || {};
            const existingTeam = data.teams[user.uid];
            data.teams[user.uid] = {
              name: teamName.trim(),
              displayName: user?.displayName || teamName.trim(),
              avatar: user?.photoURL || '',
              purse: existingTeam ? (existingTeam.purse !== undefined ? existingTeam.purse : (data.meta?.settings?.teamPurseAmount || 1000000000)) : (data.meta?.settings?.teamPurseAmount || 1000000000),
              score: existingTeam ? (existingTeam.score !== undefined ? existingTeam.score : 0) : 0,
              players: existingTeam ? (existingTeam.players || []) : [],
            };
            data.presence = data.presence || {};
            data.presence[user.uid] = { name: teamName.trim(), online: true, joinedAt: Date.now() };
            localStorage.setItem(key, JSON.stringify(data));
            break;
          }
        }
      }

      if (roomId) {
        addToast('Successfully joined the auction!', 'success', '🎉 Welcome!');
        if (status === 'finished') {
          navigate(`/results/${roomId}`);
        } else if (status === 'auction') {
          navigate(`/auction/${roomId}`);
        } else {
          navigate(`/lobby/${roomId}`);
        }
      } else {
        addToast('Room not found. Check the code and try again.', 'error', 'Room Not Found');
      }
    } catch (err) {
      addToast('Failed to join: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, position: 'relative', overflow: 'hidden' }}>
      {/* Background glow */}
      <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)', width: 500, height: 500, background: 'radial-gradient(circle, rgba(123,97,255,0.08), transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 440, position: 'relative', zIndex: 1, animation: 'slideUp 0.5s ease' }}>
        <Link to="/dashboard" className="btn btn-secondary btn-sm" style={{ position: 'fixed', top: 24, left: 24, zIndex: 100, display: 'inline-flex', background: 'var(--bg-primary)' }}>← Back</Link>

        <div style={{ background: 'rgba(8,8,20,0.95)', backdropFilter: 'blur(24px)', border: '1px solid rgba(123,97,255,0.2)', borderRadius: 24, padding: '36px 28px', boxShadow: 'var(--shadow-purple)' }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ fontSize: '3rem', marginBottom: 12, animation: 'float 3s ease-in-out infinite' }}>🎯</div>
            <h1 style={{ fontFamily: 'var(--font-orbitron)', fontSize: '1.4rem', fontWeight: 900, marginBottom: 6, letterSpacing: '0.08em' }}>JOIN AUCTION</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', textTransform: 'none', letterSpacing: 0, fontFamily: 'var(--font-body)', fontWeight: 400 }}>Enter a room code to join the action</p>
          </div>

          {step === 'code' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="input-group">
                <label className="input-label" htmlFor="room-code">Room Code</label>
                <input
                  id="room-code"
                  className="input"
                  placeholder="Enter 6-digit code"
                  value={roomCode}
                  onChange={e => setRoomCode(e.target.value.toUpperCase())}
                  maxLength={8}
                  style={{ fontFamily: 'var(--font-orbitron)', fontSize: '1.5rem', fontWeight: 800, textAlign: 'center', letterSpacing: '0.3em', padding: '16px' }}
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleLookup()}
                />
              </div>
              <Button id="lookup-room-btn" variant="neon" size="lg" onClick={handleLookup} style={{ width: '100%', justifyContent: 'center' }}>
                🔍 Find Room
              </Button>
              <div style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4, textTransform: 'none', letterSpacing: 0, fontFamily: 'var(--font-body)' }}>
                Get a code from the room host to join
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ background: 'rgba(0,217,255,0.06)', border: '1px solid rgba(0,217,255,0.2)', borderRadius: 12, padding: '12px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Joining Room</div>
                <div style={{ fontFamily: 'var(--font-orbitron)', fontSize: '1.3rem', fontWeight: 800, color: 'var(--accent-cyan)', letterSpacing: '0.2em' }}>{roomCode}</div>
              </div>
              <Input id="team-name-input" label="Your Team Name" placeholder="e.g. Royal Challengers" value={teamName} onChange={e => setTeamName(e.target.value)} autoFocus />
              <Input id="room-password-input" label="Room Password (if needed)" type="password" placeholder="Leave blank if no password" value={password} onChange={e => setPassword(e.target.value)} />
              <div style={{ display: 'flex', gap: 10 }}>
                <Button variant="secondary" onClick={() => setStep('code')} style={{ flex: 1 }}>← Back</Button>
                <Button id="join-room-submit-btn" variant="cyan" size="lg" loading={loading} onClick={handleJoin} style={{ flex: 2, justifyContent: 'center' }}>
                  🚀 Join Auction
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function JoinRoom() {
  return <ToastProvider><JoinRoomForm /></ToastProvider>;
}
