import { createContext, useContext, useEffect, useState } from 'react';
import { isFirebaseConfigured, FIREBASE_CONFIGURED } from '../firebase';

const AuthContext = createContext(null);
export function useAuth() { return useContext(AuthContext); }

function friendlyError(err) {
  const code = err?.code || '';
  const map = {
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/invalid-credential': 'Incorrect email or password.',
    'auth/email-already-in-use': 'This email is already registered.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/too-many-requests': 'Too many attempts. Please wait a moment.',
    'auth/network-request-failed': 'Network error. Check your connection.',
    'auth/popup-closed-by-user': 'Google sign-in was cancelled.',
    'auth/api-key-not-valid': 'Firebase API key is invalid.',
    'auth/configuration-not-found': 'Firebase Authentication not enabled.',
    'auth/operation-not-allowed': 'This sign-in method is disabled.',
    'auth/admin-restricted-operation': 'Anonymous login must be enabled in Firebase Console.',
  };
  return map[code] || err?.message || 'An unexpected error occurred.';
}

// ── Demo mode user data ──────────────────────────────────────────────────────
const DEMO_USER = {
  uid: 'demo-user-001',
  displayName: 'Demo Player',
  email: 'demo@auctionarena.app',
  photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=auction-arena-demo',
  isAnonymous: false,
};
const DEMO_PROFILE = {
  displayName: 'Demo Player',
  email: 'demo@auctionarena.app',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=auction-arena-demo',
  level: 12,
  xp: 3400,
  stats: { wins: 5, losses: 3, totalGames: 8, totalSpent: 1250000000, championships: 2, highestBid: 180000000 },
  matchHistory: [
    { roomId: 'demo1', name: 'IPL Mega Auction', date: Date.now() - 86400000, rank: 1, teamScore: 412 },
    { roomId: 'demo2', name: 'T20 Draft', date: Date.now() - 172800000, rank: 2, teamScore: 385 },
    { roomId: 'demo3', name: 'World Cup Auction', date: Date.now() - 259200000, rank: 1, teamScore: 430 },
  ],
  achievements: [
    { id: 'champion', label: 'Champion', icon: '🏆', desc: 'Won 5 auctions' },
    { id: 'big_spender', label: 'Big Spender', icon: '💰', desc: 'Spent over ₹100Cr' },
    { id: 'auction_king', label: 'Auction King', icon: '👑', desc: 'Won consecutively' },
    { id: 'elite_bidder', label: 'Elite Bidder', icon: '⚡', desc: 'Bid on 100 players' },
  ],
  isGuest: false,
  joinedAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
};

function DemoAuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('aa_demo_user');
    if (savedUser) {
      const u = JSON.parse(savedUser);
      setUser(u);
      const cached = localStorage.getItem(`aa_profile_${u.uid}`);
      setUserProfile(cached ? JSON.parse(cached) : DEMO_PROFILE);
    }
  }, []);

  const login = async (email, password) => {
    if (!email || !password) throw new Error('Please enter email and password.');
    setUser(DEMO_USER);
    const cached = localStorage.getItem(`aa_profile_${DEMO_USER.uid}`);
    setUserProfile(cached ? JSON.parse(cached) : DEMO_PROFILE);
    localStorage.setItem('aa_demo_user', JSON.stringify(DEMO_USER));
  };
  const signup = async (email, password, username) => {
    const u = { ...DEMO_USER, displayName: username, email };
    setUser(u);
    const cached = localStorage.getItem(`aa_profile_${DEMO_USER.uid}`);
    setUserProfile(cached ? JSON.parse(cached) : { ...DEMO_PROFILE, displayName: username, email });
    localStorage.setItem('aa_demo_user', JSON.stringify(u));
  };
  const loginWithGoogle = async () => {
    setUser(DEMO_USER);
    const cached = localStorage.getItem(`aa_profile_${DEMO_USER.uid}`);
    setUserProfile(cached ? JSON.parse(cached) : DEMO_PROFILE);
    localStorage.setItem('aa_demo_user', JSON.stringify(DEMO_USER));
  };
  const loginAsGuest = async (name) => {
    const n = name || 'Guest';
    let uid = localStorage.getItem('aa_guest_uid');
    if (!uid) {
      uid = 'guest-' + Date.now();
      localStorage.setItem('aa_guest_uid', uid);
    }
    const u = { ...DEMO_USER, uid, displayName: n, isAnonymous: true };
    setUser(u);
    const cached = localStorage.getItem(`aa_profile_${uid}`);
    const profile = cached ? JSON.parse(cached) : { ...DEMO_PROFILE, displayName: n, isGuest: true, stats: { wins: 0, losses: 0, totalGames: 0, totalSpent: 0, championships: 0, highestBid: 0 }, achievements: [], matchHistory: [] };
    setUserProfile(profile);
    localStorage.setItem(`aa_profile_${uid}`, JSON.stringify(profile));
    localStorage.setItem('aa_demo_user', JSON.stringify(u));
  };
  const logout = () => {
    setUser(null);
    setUserProfile(null);
    localStorage.removeItem('aa_demo_user');
  };
  const fetchUserProfile = async () => {};

  const updateUserProfile = async (newData) => {
    setUserProfile(prev => {
      const updated = prev ? { ...prev, ...newData } : newData;
      if (user?.uid) {
        localStorage.setItem(`aa_profile_${user.uid}`, JSON.stringify(updated));
      }
      return updated;
    });
  };

  const updateTheme = async (theme) => {
    setUserProfile(prev => prev ? { ...prev, theme } : { theme });
    localStorage.setItem(`theme_${user?.uid || 'guest'}`, theme);
    document.documentElement.setAttribute('data-theme', theme);
  };

  useEffect(() => {
    const theme = userProfile?.theme || localStorage.getItem(user ? `theme_${user.uid}` : 'theme_guest') || 'dark';
    document.documentElement.setAttribute('data-theme', theme);
  }, [userProfile, user]);

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, login, signup, loginWithGoogle, loginAsGuest, logout, fetchUserProfile, updateTheme, updateUserProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Real Firebase Auth Provider ──────────────────────────────────────────────
function FirebaseAuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const getFirebaseModules = async () => {
    const { auth, googleProvider, firestore } = await import('../firebase');
    const { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup,
      signOut, onAuthStateChanged, updateProfile, signInAnonymously } = await import('firebase/auth');
    const { doc, setDoc, getDoc, updateDoc, serverTimestamp } = await import('firebase/firestore');
    return { auth, googleProvider, firestore, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, signOut, onAuthStateChanged, updateProfile, signInAnonymously, doc, setDoc, getDoc, updateDoc, serverTimestamp };
  };

  const createUserProfile = async (uid, data) => {
    try {
      const { firestore, doc, setDoc, getDoc, serverTimestamp } = await getFirebaseModules();
      const ref = doc(firestore, 'users', uid);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        await setDoc(ref, {
          displayName: data.displayName || 'Player',
          email: data.email || '',
          avatar: data.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${uid}`,
          level: 1, xp: 0,
          stats: { wins: 0, losses: 0, totalGames: 0, totalSpent: 0, championships: 0, highestBid: 0 },
          matchHistory: [], achievements: [],
          createdAt: serverTimestamp(), isGuest: data.isGuest || false,
        });
      }
      const updated = await getDoc(ref);
      return updated.data();
    } catch (e) {
      return {
        displayName: data.displayName || 'Player', email: data.email || '',
        avatar: data.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${uid}`,
        level: 1, xp: 0,
        stats: { wins: 0, losses: 0, totalGames: 0, totalSpent: 0, championships: 0, highestBid: 0 },
        matchHistory: [], achievements: [], isGuest: data.isGuest || false,
      };
    }
  };

  const signup = async (email, password, username) => {
    try {
      const { auth, createUserWithEmailAndPassword, updateProfile } = await getFirebaseModules();
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: username });
      const profile = await createUserProfile(cred.user.uid, { displayName: username, email });
      setUserProfile(profile);
      return cred.user;
    } catch (err) { throw new Error(friendlyError(err)); }
  };

  const login = async (email, password) => {
    try {
      const { auth, signInWithEmailAndPassword } = await getFirebaseModules();
      return await signInWithEmailAndPassword(auth, email, password);
    } catch (err) { throw new Error(friendlyError(err)); }
  };

  const loginWithGoogle = async () => {
    try {
      const { auth, googleProvider, signInWithPopup } = await getFirebaseModules();
      const cred = await signInWithPopup(auth, googleProvider);
      const profile = await createUserProfile(cred.user.uid, {
        displayName: cred.user.displayName, email: cred.user.email, avatar: cred.user.photoURL,
      });
      setUserProfile(profile);
      return cred.user;
    } catch (err) { throw new Error(friendlyError(err)); }
  };

  const loginAsGuest = async (guestName) => {
    const name = guestName || 'Guest';
    try {
      const { auth, signInAnonymously, updateProfile } = await getFirebaseModules();
      const cred = await signInAnonymously(auth);
      await updateProfile(cred.user, { displayName: name });
      const profile = await createUserProfile(cred.user.uid, { displayName: name, isGuest: true });
      setUserProfile(profile);
      return cred.user;
    } catch (err) {
      // Fallback: if anonymous auth is disabled, create a temp email account
      const code = err?.code || '';
      if (code === 'auth/admin-restricted-operation' || code === 'auth/operation-not-allowed') {
        try {
          const { auth, createUserWithEmailAndPassword, updateProfile: up } = await getFirebaseModules();
          let tempEmail = localStorage.getItem('aa_temp_guest_email');
          let tempPass = localStorage.getItem('aa_temp_guest_pass');
          let cred;
          if (tempEmail && tempPass) {
            try {
              const { signInWithEmailAndPassword } = await getFirebaseModules();
              cred = await signInWithEmailAndPassword(auth, tempEmail, tempPass);
            } catch {
              tempEmail = null;
            }
          }
          if (!tempEmail) {
            const ts = Date.now();
            tempEmail = `guest_${ts}@auctionarena.app`;
            tempPass = `guest_${ts}_AA!`;
            cred = await createUserWithEmailAndPassword(auth, tempEmail, tempPass);
            localStorage.setItem('aa_temp_guest_email', tempEmail);
            localStorage.setItem('aa_temp_guest_pass', tempPass);
          }
          await up(cred.user, { displayName: name });
          const profile = await createUserProfile(cred.user.uid, { displayName: name, isGuest: true, email: tempEmail });
          setUserProfile(profile);
          return cred.user;
        } catch (fallbackErr) {
          throw new Error(friendlyError(fallbackErr));
        }
      }
      throw new Error(friendlyError(err));
    }
  };

  const logout = async () => {
    try {
      const { auth, signOut } = await getFirebaseModules();
      await signOut(auth); setUserProfile(null);
    } catch (err) { console.error('Logout error:', err); }
  };

  const fetchUserProfile = async (uid) => {
    try {
      const { firestore, doc, getDoc } = await getFirebaseModules();
      const snap = await getDoc(doc(firestore, 'users', uid));
      if (snap.exists()) {
        const data = snap.data();
        setUserProfile(data);
        localStorage.setItem(`aa_profile_${uid}`, JSON.stringify(data));
      } else {
        const cached = localStorage.getItem(`aa_profile_${uid}`);
        setUserProfile(cached ? JSON.parse(cached) : {
          displayName: user?.displayName || 'Player',
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${uid}`,
          level: 1, xp: 0,
          stats: { wins: 0, losses: 0, totalGames: 0, totalSpent: 0, championships: 0, highestBid: 0 },
          matchHistory: [], achievements: [], isGuest: user?.isAnonymous || false,
        });
      }
    } catch (e) {
      console.warn('Profile fetch failed:', e.message);
      const cached = localStorage.getItem(`aa_profile_${uid}`);
      setUserProfile(cached ? JSON.parse(cached) : {
        displayName: user?.displayName || 'Player',
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${uid}`,
        level: 1, xp: 0,
        stats: { wins: 0, losses: 0, totalGames: 0, totalSpent: 0, championships: 0, highestBid: 0 },
        matchHistory: [], achievements: [], isGuest: user?.isAnonymous || false,
      });
    }
  };

  const updateUserProfile = async (newData) => {
    setUserProfile(prev => {
      const updated = prev ? { ...prev, ...newData } : newData;
      if (user?.uid) {
        localStorage.setItem(`aa_profile_${user.uid}`, JSON.stringify(updated));
      }
      return updated;
    });

    if (user) {
      try {
        const { firestore, doc, updateDoc } = await getFirebaseModules();
        const userRef = doc(firestore, 'users', user.uid);
        await updateDoc(userRef, newData);
      } catch (err) {
        console.warn('Failed to update user profile in Firestore:', err);
      }
    }
  };

  const updateTheme = async (theme) => {
    setUserProfile(prev => prev ? { ...prev, theme } : { theme });
    localStorage.setItem(`theme_${user?.uid || 'guest'}`, theme);
    document.documentElement.setAttribute('data-theme', theme);
    if (user) {
      try {
        const { firestore, doc, updateDoc } = await getFirebaseModules();
        const userRef = doc(firestore, 'users', user.uid);
        await updateDoc(userRef, { theme });
      } catch (err) {
        console.warn('Failed to update theme in Firestore:', err);
      }
    }
  };

  useEffect(() => {
    const theme = userProfile?.theme || localStorage.getItem(user ? `theme_${user.uid}` : 'theme_guest') || 'dark';
    document.documentElement.setAttribute('data-theme', theme);
  }, [userProfile, user]);

  useEffect(() => {
    let unsub = () => {};
    (async () => {
      try {
        const { auth, onAuthStateChanged } = await getFirebaseModules();
        unsub = onAuthStateChanged(auth, async (u) => {
          setUser(u);
          if (u) await fetchUserProfile(u.uid);
          setLoading(false);
        });
      } catch (e) { console.warn('Auth listener failed:', e); setLoading(false); }
    })();
    return () => unsub();
  }, []);

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, signup, login, loginWithGoogle, loginAsGuest, logout, fetchUserProfile, updateTheme, updateUserProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function AuthProvider({ children }) {
  if (!FIREBASE_CONFIGURED) return <DemoAuthProvider>{children}</DemoAuthProvider>;
  return <FirebaseAuthProvider>{children}</FirebaseAuthProvider>;
}
