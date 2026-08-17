/**
 * ==========================================================================
 * Cloud Firestore Analytics & Announcement Engine (Firebase v10+ Modular SDK)
 * ==========================================================================
 * - Target Database: 'khandeshijatra'
 * - Real-Time Dynamic Top Announcement Badge ('siteSettings/announcement')
 * - Visitor & Device Tracking ('user_visits' & 'users')
 * - Song Streaming Analytics ('song_analytics')
 * - Multi-Channel Synchronization (Firestore + BroadcastChannel + LocalStorage)
 * - Persistent Anonymous Authentication (users/{uid} & user_visits/{uid})
 * ==========================================================================
 */

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
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

// Firebase Project Configuration (khaneshijatra)
export const firebaseConfig = {
  apiKey: "AIzaSyDnVjfQrfksPVnq57OhjNios9Yd6A0EjSA",
  authDomain: "khaneshijatra.firebaseapp.com",
  databaseURL: "https://khaneshijatra-default-rtdb.firebaseio.com",
  projectId: "khaneshijatra",
  storageBucket: "khaneshijatra.firebasestorage.app",
  messagingSenderId: "762404305793",
  appId: "1:762404305793:web:8ec333a65b673211af8680",
  measurementId: "G-0CQ0YDPPQP"
};

// 1. Initialize Firebase App, Auth & Cloud Firestore
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);
console.log('🔥 [Firestore] Connected to Cloud Firestore database');

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
 * 2. Persistent User Record Synchronization under user_visits/{uid} & users/{uid}
 * Re-visits from the same browser/device update existing records, avoiding artificial duplicates.
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
    const userVisitsDocRef = doc(db, 'user_visits', uid);
    
    // Construct payload with all standard field names
    const updateData = {
      uid: uid,
      location: locationData,
      device_type: deviceType,
      device: deviceType,
      timezone: timezone,
      last_visited: serverTimestamp(),
      timestamp: serverTimestamp(),
      user_agent: (navigator.userAgent || '').substring(0, 120)
    };

    if (isNewSession) {
      updateData.visit_count = increment(1);
    }

    // Write to both 'users' and 'user_visits' collections in Firestore
    await Promise.allSettled([
      setDoc(userDocRef, updateData, { merge: true }),
      setDoc(userVisitsDocRef, updateData, { merge: true })
    ]);

    sessionStorage.setItem(sessionKey, 'true');

    console.log(`✅ [Firestore Auth] Synced visitor in user_visits/${uid} (${locationData} | ${deviceType})`);
    
    return { success: true, uid: uid, location: locationData, deviceType: deviceType };
  } catch (error) {
    console.error('❌ [Firestore Sync Error user_visits/{uid}]:', error);
    return { success: false, error: error };
  }
}

// 3. Persistent Anonymous Authentication Lifecycle (Zero Login/Signup UI for public visitors)
const isPublicVisitor = typeof window !== 'undefined' && 
  !window.location.pathname.includes('admin') && 
  !window.location.href.includes('admin');

if (isPublicVisitor) {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      if (!user.email) {
        console.log('🔥 [Firestore Auth] Visitor session active | UID:', user.uid);
        await syncUserRecord(user);
      }
    } else {
      try {
        const userCred = await signInAnonymously(auth);
        console.log('🔥 [Firestore Auth] New Anonymous Visitor Created | UID:', userCred.user.uid);
        await syncUserRecord(userCred.user);
      } catch (err) {
        console.info('ℹ️ [Firestore Auth Note]:', err.message);
        let fallbackUid = localStorage.getItem('kj_user_uid');
        if (!fallbackUid) {
          fallbackUid = 'user_' + Math.random().toString(36).substring(2, 12);
          localStorage.setItem('kj_user_uid', fallbackUid);
        }
        await syncUserRecord({ uid: fallbackUid });
      }
    }
  });
}

/**
 * 4. Song Analytics Tracking (song_analytics Collection with increment(1))
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

    // Also update user's last played song inside users/{uid} & user_visits/{uid}
    if (currentUid) {
      try {
        const payload = {
          last_played_song: songTitle,
          last_active: serverTimestamp()
        };
        await Promise.allSettled([
          setDoc(doc(db, 'users', currentUid), payload, { merge: true }),
          setDoc(doc(db, 'user_visits', currentUid), payload, { merge: true })
        ]);
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
 * 5. Real-Time Announcement Badge Synchronization
 * Listens to Firestore, BroadcastChannel, and LocalStorage for instant updates.
 */
export function initAnnouncementListener() {
  const bannerEl = document.getElementById('festiveAdBanner');
  const textEl = document.getElementById('billboardText');
  if (!bannerEl && !textEl) return;

  function applyAnnouncement(data) {
    if (!data) return;
    if (data.enabled === false) {
      if (bannerEl) bannerEl.style.display = 'none';
    } else {
      if (bannerEl) bannerEl.style.display = '';
      if (textEl && data.text) {
        textEl.textContent = data.text;
      }
    }
  }

  // 1. Check local storage cache on initial render
  try {
    const cached = localStorage.getItem('kj_announcement_override');
    if (cached) {
      applyAnnouncement(JSON.parse(cached));
    }
  } catch (e) {}

  // 2. BroadcastChannel for instant local cross-tab sync
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel('kj_announcement_broadcast');
      bc.onmessage = (ev) => {
        if (ev.data) applyAnnouncement(ev.data);
      };
    }
  } catch (e) {}

  // 3. Window Storage Event Listener
  window.addEventListener('storage', (e) => {
    if (e.key === 'kj_announcement_override' && e.newValue) {
      try { applyAnnouncement(JSON.parse(e.newValue)); } catch (err) {}
    }
  });

  // 4. Real-time Cloud Firestore Listener
  try {
    const announcementDocRef = doc(db, 'siteSettings', 'announcement');
    onSnapshot(announcementDocRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        applyAnnouncement(data);
        try { localStorage.setItem('kj_announcement_override', JSON.stringify(data)); } catch (e) {}
        console.log(`📢 [Firestore] Live Announcement Synced: "${data.text}" | Enabled: ${data.enabled}`);
      } else {
        if (bannerEl) bannerEl.style.display = '';
        if (textEl && !localStorage.getItem('kj_announcement_override')) {
          textEl.textContent = 'HBD SANDEEP';
        }
      }
    }, (err) => {
      console.info('Announcement listener notice:', err.message);
    });
  } catch (e) {
    console.warn('Announcement listener init error:', e);
  }
}

/**
 * Save Announcement Settings (Admin Action)
 */
export async function saveAnnouncementSettings(text, enabled) {
  const payload = {
    text: text || 'HBD SANDEEP',
    enabled: Boolean(enabled),
    updatedAt: serverTimestamp(),
    updatedBy: (auth.currentUser && (auth.currentUser.email || auth.currentUser.uid)) || 'admin'
  };

  // Local storage cache & broadcast
  try {
    localStorage.setItem('kj_announcement_override', JSON.stringify({
      text: payload.text,
      enabled: payload.enabled,
      updatedAt: Date.now()
    }));
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel('kj_announcement_broadcast');
      bc.postMessage(payload);
      setTimeout(() => bc.close(), 1000);
    }
  } catch (e) {}

  try {
    const announcementDocRef = doc(db, 'siteSettings', 'announcement');
    await setDoc(announcementDocRef, payload, { merge: true });

    console.log(`✅ [Firestore] Announcement settings published: "${text}" [Enabled: ${enabled}]`);
    return { success: true };
  } catch (error) {
    console.error('❌ [Firestore] Error publishing announcement:', error);
    return { success: false, error: error };
  }
}

/**
 * 6. Diagnostics & Live Connection Test
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

// Global Exports & Automatic Initialization
if (typeof window !== 'undefined') {
  window.firestoreDb = db;
  window.firestoreAuth = auth;
  window.trackSongPlayModular = trackSongPlay;
  window.syncUserRecord = syncUserRecord;
  window.testFirestoreConnection = testFirestoreConnection;
  window.saveAnnouncementSettings = saveAnnouncementSettings;
  window.initAnnouncementListener = initAnnouncementListener;

  // Initialize announcement real-time listener on website
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initAnnouncementListener());
  } else {
    initAnnouncementListener();
  }
}
