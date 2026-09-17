import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ToastProvider, useToast, Input, Button } from '../ui/index';
import { isFirebaseConfigured } from '../../firebase';

function ParticleField() {
  useEffect(() => {
    const container = document.getElementById('aa-particle-field');
    if (!container) return;
    const colors = ['#00D9FF', '#7B61FF', '#FF3CAC', '#FFC107', '#00E676'];
    const particles = [];
    for (let i = 0; i < 50; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      const color = colors[Math.floor(Math.random() * colors.length)];
      p.style.cssText = `
        left:${Math.random()*100}%;background:${color};
        box-shadow:0 0 6px ${color};
        width:${Math.random()*3+1}px;height:${Math.random()*3+1}px;
        animation-duration:${Math.random()*14+8}s;
        animation-delay:${Math.random()*-20}s;
        --drift:${(Math.random()-0.5)*120}px;opacity:0;
      `;
      container.appendChild(p);
      particles.push(p);
    }
    // Light beams
    const beams = [];
    for (let i = 0; i < 5; i++) {
      const b = document.createElement('div');
      b.className = 'light-beam';
      b.style.cssText = `
        left:${15+i*18}%;animation-delay:${i*1.6}s;
        animation-duration:${10+i*3}s;transform-origin:bottom;
        top:0;height:100vh;
      `;
      container.appendChild(b);
      beams.push(b);
    }
    return () => { particles.forEach(p => p.remove()); beams.forEach(b => b.remove()); };
  }, []);
  return <div id="aa-particle-field" className="particles-bg" />;
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.35-8.16 2.35-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}

function LandingForm() {
  const { loginWithGoogle, loginAsGuest, login, signup } = useAuth();
  const addToast = useToast();
  const navigate = useNavigate();
  const [view, setView] = useState('landing');
  const [loading, setLoading] = useState({ google: false, guest: false, email: false });
  const [guestName, setGuestName] = useState('');
  const [showGuestInput, setShowGuestInput] = useState(false);
  const [emailForm, setEmailForm] = useState({ email: '', password: '', name: '' });
  const [emailMode, setEmailMode] = useState('login');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(t);
  }, []);

  const handleGoogle = async () => {
    setLoading(l => ({ ...l, google: true }));
    try {
      await loginWithGoogle();
      navigate('/dashboard');
    } catch (err) {
      addToast(err.message, 'error', 'Sign-In Failed');
    } finally {
      setLoading(l => ({ ...l, google: false }));
    }
  };

  const handleGuest = async () => {
    if (!guestName.trim()) { setShowGuestInput(true); return; }
    setLoading(l => ({ ...l, guest: true }));
    try {
      await loginAsGuest(guestName.trim());
      navigate('/dashboard');
    } catch (err) {
      addToast(err.message, 'error', 'Guest Login Failed');
    } finally {
      setLoading(l => ({ ...l, guest: false }));
    }
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setLoading(l => ({ ...l, email: true }));
    try {
      if (emailMode === 'login') {
        await login(emailForm.email, emailForm.password);
      } else {
        await signup(emailForm.email, emailForm.password, emailForm.name || 'Player');
      }
      navigate('/dashboard');
    } catch (err) {
      addToast(err.message, 'error', emailMode === 'login' ? 'Login Failed' : 'Signup Failed');
    } finally {
      setLoading(l => ({ ...l, email: false }));
    }
  };

  const features = [
    { icon: '⚡', label: 'Real-Time Bidding' },
    { icon: '🎯', label: 'Live Strategy' },
    { icon: '🏟️', label: 'Stadium Arena' },
    { icon: '💬', label: 'Live Chat' },
    { icon: '🌐', label: 'Multiplayer' },
    { icon: '📊', label: 'Analytics' },
  ];

  if (view === 'auth') {
    return (
      <div className="landing-page" style={{ position: 'relative', zIndex: 1 }}>
        <ParticleField />
        <div className="landing-bg-glow" />
        <button
          onClick={() => setView('landing')}
          style={{ position: 'absolute', top: 20, left: 20, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '8px 14px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
        >← Back</button>

        <div style={{ width: '100%', maxWidth: 420, background: 'rgba(5,5,15,0.97)', backdropFilter: 'blur(24px)', border: '1px solid rgba(123,97,255,0.2)', borderRadius: 24, padding: '36px 28px', boxShadow: 'var(--shadow-purple), var(--shadow-lg)', animation: 'slideUp 0.4s ease', position: 'relative', zIndex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ fontSize: '2rem', marginBottom: 10 }}>🏆</div>
            <h2 style={{ fontFamily: 'var(--font-orbitron)', fontSize: '1.4rem', fontWeight: 900, letterSpacing: '0.05em', color: '#fff', marginBottom: 6 }}>AUCTION ARENA</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'none', letterSpacing: 0, fontFamily: 'var(--font-body)', fontWeight: 400 }}>Sign in to enter the arena</p>
          </div>

          <button className="btn-google" onClick={handleGoogle} disabled={loading.google} id="google-signin-btn" style={{ marginBottom: 20, justifyContent: 'center' }}>
            {loading.google ? <span style={{ width: 18, height: 18, border: '2px solid rgba(0,0,0,0.15)', borderTopColor: '#333', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} /> : <><GoogleIcon /> Continue with Google</>}
          </button>

          <div className="auth-divider">or with email</div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {['login', 'signup'].map(m => (
              <button key={m} onClick={() => setEmailMode(m)} style={{ flex: 1, padding: '9px', background: emailMode === m ? 'rgba(123,97,255,0.15)' : 'transparent', border: `1px solid ${emailMode === m ? 'rgba(123,97,255,0.4)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 10, color: emailMode === m ? 'var(--accent-purple)' : 'var(--text-muted)', fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {m === 'login' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <form onSubmit={handleEmailSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
            {emailMode === 'signup' && <Input id="signup-name" label="Display Name" placeholder="Your arena name" value={emailForm.name} onChange={e => setEmailForm(f => ({ ...f, name: e.target.value }))} />}
            <Input id="auth-email" label="Email" type="email" placeholder="you@example.com" value={emailForm.email} onChange={e => setEmailForm(f => ({ ...f, email: e.target.value }))} required />
            <Input id="auth-password" label="Password" type="password" placeholder="••••••••" value={emailForm.password} onChange={e => setEmailForm(f => ({ ...f, password: e.target.value }))} required />
            <Button id="email-auth-btn" type="submit" variant="neon" size="lg" loading={loading.email} style={{ width: '100%', marginTop: 4 }}>
              {emailMode === 'login' ? 'Sign In' : 'Create Account'}
            </Button>
          </form>

          <div className="auth-divider">or play as guest</div>

          {showGuestInput ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Input id="guest-name-input" label="Your Display Name" placeholder="Arena nickname" value={guestName} onChange={e => setGuestName(e.target.value)} autoFocus />
              <Button id="confirm-guest-btn" variant="secondary" onClick={handleGuest} loading={loading.guest} style={{ width: '100%' }}>
                Enter as Guest
              </Button>
            </div>
          ) : (
            <button id="guest-login-btn" className="btn btn-ghost w-full" onClick={() => setShowGuestInput(true)} style={{ width: '100%', justifyContent: 'center' }}>
              👤 Continue as Guest
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="landing-page" style={{ position: 'relative', zIndex: 1 }}>
      <ParticleField />
      <div className="landing-bg-glow" />

      {/* Trophy */}
      <div className="trophy-icon-card" style={{ opacity: mounted ? 1 : 0, transition: 'opacity 0.6s ease, transform 0.6s ease', transform: mounted ? 'scale(1)' : 'scale(0.5)' }}>
        🏆
      </div>

      {/* Title */}
      <h1 className="landing-headline" style={{ opacity: mounted ? 1 : 0, transition: 'opacity 0.6s ease 0.2s, transform 0.6s ease 0.2s', transform: mounted ? 'translateY(0)' : 'translateY(30px)' }}>
        AUCTION<br />ARENA
      </h1>

      {/* Tagline */}
      <p className="landing-subheadline" style={{ opacity: mounted ? 1 : 0, transition: 'opacity 0.6s ease 0.35s', transform: mounted ? 'translateY(0)' : 'translateY(20px)' }}>
        BID. BUILD. WIN.
      </p>

      {/* Description */}
      <p className="landing-description" style={{ opacity: mounted ? 1 : 0, transition: 'opacity 0.6s ease 0.45s' }}>
        The ultimate real-time multiplayer auction experience. Build your dream team, outsmart your rivals, and dominate the leaderboard.
      </p>

      {/* Demo mode banner */}
      {!isFirebaseConfigured() && (
        <div style={{ background: 'rgba(0,217,255,0.06)', border: '1px solid rgba(0,217,255,0.2)', borderRadius: 16, padding: '14px 20px', marginBottom: 20, width: '100%', maxWidth: 380, textAlign: 'center', animation: mounted ? 'fadeInUp 0.5s ease 0.5s both' : 'none' }}>
          <div style={{ fontWeight: 800, fontSize: '0.78rem', color: 'var(--accent-cyan)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>⚡ Demo Mode Active</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: 1.5, textTransform: 'none', letterSpacing: 0 }}>Firebase is not configured. Environment variables must be set up in your hosting provider's dashboard to enable real-time multiplayer.</div>
        </div>
      )}

      {/* CTA Buttons */}
      <div className="landing-cta-section" style={{ opacity: mounted ? 1 : 0, transition: 'opacity 0.6s ease 0.55s' }}>
        <button
          id="google-cta-btn"
          className="btn-google"
          onClick={handleGoogle}
          disabled={loading.google}
          style={{ fontSize: '1rem', fontWeight: 800 }}
        >
          {loading.google
            ? <span style={{ width: 18, height: 18, border: '2px solid rgba(0,0,0,0.15)', borderTopColor: '#333', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
            : <><GoogleIcon /> CONTINUE WITH GOOGLE</>
          }
        </button>

        <div className="landing-divider">or</div>

        <button
          id="guest-cta-btn"
          className="btn btn-secondary w-full"
          onClick={() => setView('auth')}
          style={{ width: '100%', justifyContent: 'center', fontSize: '0.95rem' }}
        >
          👤 CONTINUE AS GUEST
        </button>

        <button
          id="email-cta-btn"
          className="btn btn-ghost w-full"
          onClick={() => setView('auth')}
          style={{ width: '100%', justifyContent: 'center', fontSize: '0.85rem' }}
        >
          ✉️ Sign In with Email
        </button>
      </div>

      {/* Feature pills */}
      <div className="landing-feature-pills" style={{ opacity: mounted ? 1 : 0, transition: 'opacity 0.6s ease 0.7s' }}>
        {features.map((f, i) => (
          <div key={f.label} className="feature-pill" style={{ animationDelay: `${i * 0.05}s` }}>
            <span>{f.icon}</span>
            <span>{f.label}</span>
          </div>
        ))}
      </div>

      {/* Bottom links */}
      <p style={{ marginTop: 28, color: 'var(--text-muted)', fontSize: '0.78rem', textAlign: 'center', opacity: mounted ? 1 : 0, transition: 'opacity 0.6s ease 0.8s', letterSpacing: 0, textTransform: 'none', fontFamily: 'var(--font-body)', fontWeight: 400 }}>
        By continuing you agree to our Terms of Service.
      </p>
    </div>
  );
}

export default function LandingPage() {
  return (
    <ToastProvider>
      <LandingForm />
    </ToastProvider>
  );
}
