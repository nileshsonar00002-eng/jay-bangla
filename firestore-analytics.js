/**
 * ==========================================================================
 * Cloud Firestore Analytics Engine (Firebase v10+ Modular SDK)
 * ==========================================================================
 * - Target Database: 'khandeshijatra'
 * - Firestore Initialization using getFirestore(app, 'khandeshijatra')
 * - Instant Non-blocking User Location Tracking ('user_visits' collection)
 * - Real-time Song Analytics Tracking ('song_analytics' collection)
 * ==========================================================================
 */

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
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

// Connect directly to the custom named database 'khandeshijatra'
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

// Attempt anonymous sign-in in background
signInAnonymously(auth)
  .then((userCred) => {
    console.log('🔥 [Firestore] Anonymous Auth connected successfully (UID:', userCred.user.uid, ')');
  })
  .catch((err) => {
    console.info('ℹ️ [Firestore] Auth note:', err.message);
  });

/**
 * 2. User Location Tracking (user_visits Collection)
 * Automatically writes on page load with non-blocking location resolution.
 */
let hasLoggedVisit = false;

export async function trackUserVisitLocation() {
  if (hasLoggedVisit) return;
  hasLoggedVisit = true;

  // Determine Device & Platform
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isTablet = /iPad|Tablet/i.test(navigator.userAgent);
  const deviceType = isTablet ? 'Tablet' : (isMobile ? 'Mobile' : 'Desktop');
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';

  let locationData = 'Maharashtra, India';

  // Fast non-blocking location fetch with 1.8s timeout
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
      locationData = `Location (${timezone})`;
    }
  }

  // Write visit document to Firestore 'user_visits' collection
  try {
    const docRef = await addDoc(collection(db, 'user_visits'), {
      location: locationData,
      device_type: deviceType,
      timezone: timezone,
      timestamp: serverTimestamp(),
      page_url: window.location.pathname || '/'
    });

    console.log(`✅ [Firestore] Visit successfully written to 'user_visits' | Doc ID: ${docRef.id} | Location: ${locationData} [${deviceType}]`);
    return { success: true, id: docRef.id, location: locationData };
  } catch (error) {
    console.error('❌ [Firestore Write Error in user_visits]:', error);
    return { success: false, error: error };
  }
}

/**
 * 3. Song Analytics Tracking (song_analytics Collection with increment(1))
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

    console.log(`✅ [Firestore] Incremented play count in 'song_analytics' for: "${songTitle}"`);
    return { success: true, docId: docId };
  } catch (error) {
    console.error('❌ [Firestore Write Error in song_analytics]:', error);
    return { success: false, error: error };
  }
}

/**
 * 4. Diagnostics & Live Connection Test
 */
export async function testFirestoreConnection() {
  console.log(`🔄 Running Cloud Firestore Diagnostic Test on database "${DATABASE_ID}"...`);
  try {
    // Test 1: Write to user_visits
    const visitRes = await trackUserVisitLocation();
    
    // Test 2: Write to song_analytics
    const songRes = await trackSongPlay('Laganma Machadu Dhum', 'Bhaiya More');

    return {
      success: visitRes && visitRes.success && songRes && songRes.success,
      visitDocId: visitRes ? visitRes.id : null,
      songDocId: songRes ? songRes.docId : null,
      databaseId: DATABASE_ID
    };
  } catch (err) {
    console.error('❌ Firestore Diagnostic Failed:', err);
    return { success: false, error: err.message, code: err.code };
  }
}

// Global Export & Auto-Run
if (typeof window !== 'undefined') {
  window.firestoreDb = db;
  window.trackSongPlayModular = trackSongPlay;
  window.trackUserVisitModular = trackUserVisitLocation;
  window.testFirestoreConnection = testFirestoreConnection;

  // Execute location tracking immediately on script load
  trackUserVisitLocation();
}
