import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getFirestore } from 'firebase/firestore';

// Firebase web API keys are NOT secrets — they are safe to commit.
// Security is enforced by Firebase Security Rules, not by hiding this config.
// Hardcoding ensures the app always works on deployment without needing
// hosting-platform env var setup (Netlify/Vercel won't have .env at build time).
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY            || 'AIzaSyASJTvJ8nhWMDmMPLp4Sd-hSJTEUrtzub4',
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN        || 'auction-arena-39231.firebaseapp.com',
  databaseURL:       import.meta.env.VITE_FIREBASE_DATABASE_URL       || 'https://auction-arena-39231-default-rtdb.firebaseio.com',
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID         || 'auction-arena-39231',
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET     || 'auction-arena-39231.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '787357323518',
  appId:             import.meta.env.VITE_FIREBASE_APP_ID             || '1:787357323518:web:20de6099a13b27fae695af',
};

let app, auth, googleProvider, db, firestore;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();
  db = getDatabase(app);
  firestore = getFirestore(app);
} catch (e) {
  console.warn('Firebase initialization failed — using demo mode:', e.message);
}

// Check AFTER initialization so `auth` is defined when this runs
export const isFirebaseConfigured = () => !!(auth);

// Pre-computed stable flag — always true as long as Firebase init succeeded
export const FIREBASE_CONFIGURED = !!(auth);

export { auth, googleProvider, db, firestore };
export default app;

