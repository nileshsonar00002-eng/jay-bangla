/**
 * ==========================================================================
 * Cloud Firestore Analytics Engine (Firebase v10+ Modular SDK)
 * ==========================================================================
 * - Firestore Initialization using getFirestore()
 * - Anonymous Authentication for secure database writes
 * - User Location Tracking (ipapi.co -> 'user_visits' collection)
 * - Song Streaming Analytics (increment(1) -> 'song_analytics' collection)
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
  increment, 
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
  limit
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

// 1. Initialize Firebase App, Auth & Cloud Firestore using getFirestore()
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);

// Authenticate anonymously to ensure all Firestore security rules permit writes
signInAnonymously(auth)
  .then((userCred) => {
    console.log('🔥 [Firestore v10+] Anonymous Auth Connected:', userCred.user.uid);
    // Trigger location tracking after authentication
    trackUserVisitLocation();
  })
  .catch((err) => {
    console.warn('⚠️ [Firestore v10+] Auth notice:', err.message);
    // Still attempt write in case test mode rules permit open writes
    trackUserVisitLocation();
  });

/**
 * 2. User Location Tracking:
 * Fetches user location (City, State) and logs an entry into 'user_visits' in Firestore.
 */
let hasLoggedVisit = false;

export async function trackUserVisitLocation() {
  if (hasLoggedVisit) return;
  hasLoggedVisit = true;

  try {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isTablet = /iPad|Tablet/i.test(navigator.userAgent);
    const deviceType = isTablet ? 'Tablet' : (isMobile ? 'Mobile' : 'Desktop');

    let locationData = 'Maharashtra, India';

    try {
      const response = await fetch('https://ipapi.co/json/');
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
      } catch (e) {}
    }

    // Write visit record to Firestore 'user_visits' collection
    const docRef = await addDoc(collection(db, 'user_visits'), {
      location: locationData,
      device_type: deviceType,
      timestamp: serverTimestamp(),
      user_agent: (navigator.userAgent || '').substring(0, 100)
    });

    console.log(`✅ [Firestore v10+] Successfully stored user visit in 'user_visits' (${docRef.id}): ${locationData} [${deviceType}]`);
  } catch (error) {
    console.error('❌ [Firestore v10+] Error writing to user_visits:', error);
  }
}

/**
 * 3. Song Analytics Tracking:
 * Every time a user clicks play or a song starts streaming,
 * increment the play count in Firestore 'song_analytics' collection using increment(1).
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

    console.log(`✅ [Firestore v10+] Successfully incremented play count in 'song_analytics' for: "${songTitle}"`);
  } catch (error) {
    console.error('❌ [Firestore v10+] Error writing to song_analytics:', error);
  }
}

// Global Exports
if (typeof window !== 'undefined') {
  window.firestoreDb = db;
  window.trackSongPlayModular = trackSongPlay;
  window.trackUserVisitModular = trackUserVisitLocation;
}
