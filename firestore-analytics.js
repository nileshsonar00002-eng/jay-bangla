/**
 * ==========================================================================
 * Cloud Firestore Analytics Engine (Firebase v10+ Modular SDK)
 * ==========================================================================
 * - Persistent Anonymous Authentication (users/{uid})
 * - Zero Login/Signup UI (100% Background Execution)
 * - Single Document per Visitor (Re-visits update existing record, no duplicates)
 * - Deduplicated Session Tracking & Real-Time Song Analytics
 * ==========================================================================
 */

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  increment, 
  serverTimestamp,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Firebase Project Configuration
export const firebaseConfig = {
  apiKey: 'AIzaSyDnvjfQrfkspVnq570hjNios9Yd6A0EjSA',
  authDomain: 'khaneshijatra.firebaseapp.com',
  projectId: 'khaneshijatra',
  storageBucket: 'khaneshijatra.firebasestorage.app',
  messagingSenderId: '762404305793',
  appId: '1:762404305793:web:8ec333a65b673211af8680'
};

// Target Database ID in your Cloud Firestore console
export const DATABASE_ID = 'khandeshijatra';

// 1. Initialize Firebase App, Auth & Cloud Firestore
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Connect directly to custom named database 'khandeshijatra'
let dbInstance;
try {
  dbInstance = getFirestore(app, DATABASE_ID);
  console.log(`🔥 [Firestore] Connected to database: "${DATABASE_ID}"`);
} catch (e) {
  try {
    dbInstance = getFirestore(app);
    console.log('🔥 [Firestore] Connected to (default) database');
  } catch (err) {
    console.error('Firestore init error:', err);
  }
}
export const db = dbInstance;

// Global persistent UID tracking
let currentUid = null;
try {
  currentUid = localStorage.getItem('kj_user_uid') || null;
} catch (e) {}

/**
 * Fast Non-Blocking User Location Resolver
 */
async function resolveUserLocation() {
  let locationData = 'Maharashtra, India';
  try {
    const fetchWithTimeout = (url, ms = 1800) => {
      const controller = new AbortController();
      const promise = fetch(url, { signal: controller.signal });
      const timeout = new Promise((_, reject) => setTimeout(() => { controller.abort(); reject(new Error('timeout')); }, ms));
      return Promise.race([promise, timeout]);
    };

    const response = await fetchWithTimeout('https://ipapi.co/json/');
    if (response.ok) {
      const data = await response.json();
      if (data.city && data.region) {
        locationData = `${data.city}, ${data.region}`;
      } else if (data.region) {
        locationData = `${data.region}, India`;
      }
    }
  } catch (err) {
    try {
      const fbRes = await fetch('https://ipwho.is/');
      if (fbRes.ok) {
        const fbData = await fbRes.json();
        if (fbData.city && fbData.region) {
          locationData = `${fbData.city}, ${fbData.region}`;
        }
      }
    } catch (e) {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
      locationData = `Location (${tz})`;
    }
  }
  return locationData;
}

/**
 * 2. Persistent User Record Synchronization under users/{uid}
 * Re-visits from the same browser/device update the existing document, NOT creating duplicates.
 */
export async function syncUserRecord(user) {
  if (!user || !user.uid) return;
  const uid = user.uid;
  currentUid = uid;
  try { localStorage.setItem('kj_user_uid', uid); } catch (e) {}

  // Determine Device & Platform
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isTablet = /iPad|Tablet/i.test(navigator.userAgent);
  const deviceType = isTablet ? 'Tablet' : (isMobile ? 'Mobile' : 'Desktop');
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';

  // Check if this browser tab session was already counted
  const sessionKey = `kj_session_recorded_${uid}`;
  const isNewSession = !sessionStorage.getItem(sessionKey);

  const locationData = await resolveUserLocation();

  try {
    const userDocRef = doc(db, 'users', uid);
    
    // Construct merged payload (stores/updates under users/{uid})
    const updateData = {
      uid: uid,
      location: locationData,
      device_type: deviceType,
      timezone: timezone,
      last_visited: serverTimestamp(),
      user_agent: (navigator.userAgent || '').substring(0, 100)
    };

    if (isNewSession) {
      updateData.visit_count = increment(1);
    }

    // Update users/{uid} without duplicate document creation
    await setDoc(userDocRef, updateData, { merge: true });
    sessionStorage.setItem(sessionKey, 'true');

    console.log(`✅ [Firestore Auth] Synced persistent visitor record: users/${uid} (${locationData} | ${deviceType})`);
    
    return { success: true, uid: uid, location: locationData, deviceType: deviceType };
  } catch (error) {
    console.error('❌ [Firestore Sync Error users/{uid}]:', error);
    return { success: false, error: error };
  }
}

// 3. Persistent Anonymous Authentication Lifecycle (Zero Login/Signup UI)
onAuthStateChanged(auth, async (user) => {
  if (user) {
    console.log('🔥 [Firestore Auth] Persistent Anonymous User Restored | UID:', user.uid);
    await syncUserRecord(user);
  } else {
    try {
      const userCred = await signInAnonymously(auth);
      console.log('🔥 [Firestore Auth] New Anonymous User Created | UID:', userCred.user.uid);
      await syncUserRecord(userCred.user);
    } catch (err) {
      console.info('ℹ️ [Firestore Auth Note]:', err.message);
      // Fallback guest tracking if auth is disabled
      let fallbackUid = localStorage.getItem('kj_user_uid');
      if (!fallbackUid) {
        fallbackUid = 'user_' + Math.random().toString(36).substring(2, 12);
        localStorage.setItem('kj_user_uid', fallbackUid);
      }
      await syncUserRecord({ uid: fallbackUid });
    }
  }
});

/**
 * 4. Song Analytics Tracking (song_analytics Collection with increment(1))
 * Increments play count whenever a song is clicked or played.
 */
export async function trackSongPlay(songTitle, singer) {
  if (!songTitle) return;
  try {
    const docId = songTitle.trim().replace(/[\/\\]/g, '_');
    const songDocRef = doc(db, 'song_analytics', docId);

    await setDoc(songDocRef, {
      title: songTitle,
      singer: singer || 'अहिराणी खजिना',
      plays: increment(1),
      last_played: serverTimestamp()
    }, { merge: true });

    // Also update user's last played song inside users/{uid}
    if (currentUid) {
      try {
        const userDocRef = doc(db, 'users', currentUid);
        await setDoc(userDocRef, {
          last_played_song: songTitle,
          last_active: serverTimestamp()
        }, { merge: true });
      } catch (e) {}
    }

    console.log(`✅ [Firestore] Incremented play count in 'song_analytics' for: "${songTitle}"`);
    return { success: true, docId: docId };
  } catch (error) {
    console.error('❌ [Firestore Write Error in song_analytics]:', error);
    return { success: false, error: error };
  }
}

/**
 * 5. Diagnostics & Live Connection Test
 */
export async function testFirestoreConnection() {
  console.log(`🔄 Running Cloud Firestore Diagnostic Test on database "${DATABASE_ID}"...`);
  try {
    const user = auth.currentUser || { uid: currentUid || 'admin_test_uid' };
    const userRes = await syncUserRecord(user);
    const songRes = await trackSongPlay('Laganma Machadu Dhum', 'Bhaiya More');

    return {
      success: userRes && userRes.success && songRes && songRes.success,
      uid: user.uid,
      songDocId: songRes ? songRes.docId : null,
      databaseId: DATABASE_ID
    };
  } catch (err) {
    console.error('❌ Firestore Diagnostic Failed:', err);
    return { success: false, error: err.message, code: err.code };
  }
}

// Global Exports
if (typeof window !== 'undefined') {
  window.firestoreDb = db;
  window.trackSongPlayModular = trackSongPlay;
  window.syncUserRecord = syncUserRecord;
  window.testFirestoreConnection = testFirestoreConnection;
}
