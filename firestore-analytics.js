/**
 * ==========================================================================
 * Cloud Firestore Analytics Engine (Firebase v10+ Modular SDK)
 * ==========================================================================
 * - Firestore Initialization using getFirestore()
 * - User Location Tracking (ipapi.co -> 'user_visits' collection)
 * - Song Streaming Analytics (increment(1) -> 'song_analytics' collection)
 * ==========================================================================
 */

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
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

// 1. Initialize Firebase App & Cloud Firestore using getFirestore()
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);

/**
 * 2. User Location Tracking:
 * On page load, fetch the user's location (City and State) using ipapi.co
 * and log an entry into the Firestore collection 'user_visits'.
 */
export async function trackUserVisitLocation() {
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
      // Fallback endpoint if ipapi is rate-limited
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
      timestamp: serverTimestamp()
    });

    console.log(`📍 [Firestore v10+] Logged user visit (${docRef.id}): ${locationData} [${deviceType}]`);
  } catch (error) {
    console.info('ℹ️ [Firestore v10+] user_visits notice:', error.message);
  }
}

/**
 * 3. Song Analytics Tracking:
 * Every time a user clicks play or a song starts streaming,
 * increment the play count for that specific song title in the 'song_analytics' collection using increment(1).
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

    console.log(`🎵 [Firestore v10+] Incremented play count in 'song_analytics': ${songTitle}`);
  } catch (error) {
    console.info('ℹ️ [Firestore v10+] song_analytics notice:', error.message);
  }
}

// Attach to window object for global accessibility
if (typeof window !== 'undefined') {
  window.firestoreDb = db;
  window.trackSongPlayModular = trackSongPlay;
  window.trackUserVisitModular = trackUserVisitLocation;

  // Run location tracking on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => trackUserVisitLocation());
  } else {
    trackUserVisitLocation();
  }
}
