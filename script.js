/**
 * ==========================================================================
 * खान्देशी जत्रा (Khandeshi Jatra) - Music Player, Clock & Festive Dust Engine
 * ==========================================================================
 * 
 * 👥 रियल-टाइम लाइव प्रेझेन्स (Realtime Active Presence Tracking):
 * - बेस नंबर: 500
 * - सूत्र: displayedCount = 500 + realActiveVisitors
 * - Firebase Realtime Database & onDisconnect() स्वयंचलित जोडणी
 * ==========================================================================
 */

/**
 * --------------------------------------------------------------------------
 * Global Catch-All Application Error Handler & Non-Intrusive Toast System
 * --------------------------------------------------------------------------
 * 1. Catches all unhandled runtime errors (window.onerror) and unhandled promise
 *    rejections (unhandledrejection).
 * 2. Suppresses raw system errors, stack traces, and default browser alert popups.
 * 3. Replaces technical error displays with a sleek, non-intrusive bottom toast in Marathi:
 *    "काहीतरी तांत्रिक अडचण आली आहे. कृपया थोड्या वेळाने प्रयत्न करा."
 * 4. Includes a clean "रिफ्रेश" (Reload) button inside the toast and auto-dismisses after 5s.
 * 5. Keeps full technical error logs only inside console.error for debugging.
 * --------------------------------------------------------------------------
 */
(function initGlobalErrorHandler() {
  if (window.__globalErrorHandlerInitialized) return;
  window.__globalErrorHandlerInitialized = true;

  let activeToast = null;
  let dismissTimer = null;
  let lastToastTime = 0;

  // Known benign browser notices that shouldn't display an error popup
  const IGNORED_PATTERNS = [
    'ResizeObserver loop',
    'AbortError',
    'NotAllowedError',
    'The play() request was interrupted',
    'play() failed because the user didn\'t interact',
    'QuotaExceededError',
    'chrome-extension://',
    'moz-extension://',
    'safari-extension://'
  ];

  function shouldIgnore(errorMsg) {
    if (!errorMsg) return false;
    const str = String(errorMsg);
    return IGNORED_PATTERNS.some(pattern => str.includes(pattern));
  }

  function showGlobalErrorToast() {
    const now = Date.now();
    
    // Ensure document body is available
    if (!document.body) {
      document.addEventListener('DOMContentLoaded', () => showGlobalErrorToast(), { once: true });
      return;
    }

    // Rate limit: if a toast is already visible, extend its timer to 5s instead of stacking
    if (activeToast && document.body.contains(activeToast)) {
      if (dismissTimer) clearTimeout(dismissTimer);
      dismissTimer = setTimeout(dismissToast, 5000);
      return;
    }

    // Debounce: minimum 1.5s interval between distinct toasts
    if (now - lastToastTime < 1500) return;
    lastToastTime = now;

    // Dismiss any previous stale toast
    dismissToast();

    // Create Toast Element
    const toast = document.createElement('div');
    toast.className = 'global-error-toast';
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');

    toast.innerHTML = `
      <div class="global-error-toast-inner">
        <div class="global-error-toast-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>
        <p class="global-error-toast-text">কিছু প্রযুক্তিগত সমস্যা হয়েছে। অনুগ্রহ করে কিছুক্ষণ পরে আবার চেষ্টা করুন。</p>
        <button type="button" class="global-error-toast-reload-btn" id="globalErrorToastReload" aria-label="রিফ্রেশ করুন">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M23 4v6h-6"></path>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
          </svg>
          <span>রিফ্রেশ</span>
        </button>
      </div>
    `;

    document.body.appendChild(toast);
    activeToast = toast;

    // Attach reload handler
    const reloadBtn = toast.querySelector('#globalErrorToastReload');
    if (reloadBtn) {
      reloadBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        window.location.reload();
      });
    }

    // Auto-dismiss after 5 seconds
    dismissTimer = setTimeout(dismissToast, 5000);
  }

  function dismissToast() {
    if (dismissTimer) {
      clearTimeout(dismissTimer);
      dismissTimer = null;
    }
    if (activeToast) {
      const el = activeToast;
      activeToast = null;
      el.classList.add('fade-out');
      setTimeout(() => {
        if (el && el.parentNode) {
          el.parentNode.removeChild(el);
        }
      }, 320);
    }
  }

  // 1. Global Runtime Error Handler
  window.onerror = function(message, source, lineno, colno, error) {
    // Keep full technical error logs only in console.error for debugging
    console.error('⚠️ [Global Runtime Error Caught]:', {
      message: message,
      source: source,
      lineno: lineno,
      colno: colno,
      error: error
    });

    const errorMsg = (error && error.message) ? error.message : String(message);
    if (!shouldIgnore(message) && !shouldIgnore(errorMsg)) {
      showGlobalErrorToast();
    }

    // Suppress raw system error messages / default browser popups
    return true;
  };

  // 2. Global Unhandled Promise Rejection Handler
  window.addEventListener('unhandledrejection', function(event) {
    const reason = event.reason;
    const msg = (reason && reason.message) ? reason.message : String(reason);

    // Keep full technical error logs only in console.error for debugging
    console.error('⚠️ [Global Unhandled Promise Rejection Caught]:', reason);

    if (!shouldIgnore(msg)) {
      showGlobalErrorToast();
    }

    // Suppress default browser unhandled rejection alert/logging
    if (event && typeof event.preventDefault === 'function') {
      event.preventDefault();
    }
  });

  window.__showGlobalErrorToast = showGlobalErrorToast;
})();

// Firebase Project Configuration (bangla-f3985)
const firebaseConfig = {
  apiKey: "AIzaSyD2PXCfJFl7CODIRkQSDqmdbj13tMoVSyE",
  authDomain: "bangla-f3985.firebaseapp.com",
  projectId: "bangla-f3985",
  storageBucket: "bangla-f3985.firebasestorage.app",
  messagingSenderId: "630741936336",
  appId: "1:630741936336:web:6b4233a5046d9a830956d5",
  measurementId: "G-KYHSCJMV43"
};

// Safe Firebase App Initialization with Anonymous Auth
if (typeof firebase !== 'undefined' && (!firebase.apps || !firebase.apps.length)) {
  try {
    firebase.initializeApp(firebaseConfig);
    if (firebase.auth) {
      firebase.auth().signInAnonymously()
        .then(() => {
          console.log('🔥 Firebase Connected & Authenticated (Anonymous)');
          if (window.khandeshiPlayer) {
            window.khandeshiPlayer.loadFromFirebaseStorage('arjit');
            window.khandeshiPlayer.loadFromFirebaseStorage('sanu');
            window.khandeshiPlayer.loadFromFirebaseStorage('jaybangla');
          }
        })
        .catch((err) => console.info('Firebase auth notice:', err.message));
    }
  } catch (e) {
    console.info('Firebase initialization notice:', e);
  }
}

/**
 * 4-Stage Synchronized 15-Minute Base Count Cycle:
 * Stage 1 (00-14 min): 75
 * Stage 2 (15-29 min): 105
 * Stage 3 (30-44 min): 225
 * Stage 4 (45-59 min): 556
 * Repeats every 60 minutes, synchronized across all visitors via real elapsed time.
 */
const BASE_CYCLE_STAGES = [75, 105, 225, 556];
const STAGE_INTERVAL_MS = 15 * 60 * 1000; // Exactly 15 minutes

function getCurrentBaseCount() {
  const stageIndex = Math.floor((Date.now() / STAGE_INTERVAL_MS) % BASE_CYCLE_STAGES.length);
  return BASE_CYCLE_STAGES[stageIndex];
}

/* --------------------------------------------------------------------------
   1. Real-Time Global Presence Engine (Multi-Device MQTT over WebSockets + LWT)
   -------------------------------------------------------------------------- */
class RealtimePresenceTracker {
  constructor() {
    this.badgeEl = document.getElementById('listenerCountText');
    this.sessionId = 'dev_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
    this.activeTabs = 1;
    this.remotePeers = new Map();
    this.storageKey = 'kj_live_presence_registry';
    this.channelName = 'kj_presence_broadcast';
    this.mqttTopic = 'khandeshi_jatra_live/presence/v1';
    this.mqttClient = null;
    this.isMqttConnected = false;
    this.brokers = [
      { host: 'broker.hivemq.com', port: 8884, path: '/mqtt' },
      { host: 'broker.emqx.io', port: 8084, path: '/mqtt' }
    ];
    this.currentBrokerIndex = 0;
    
    // Dynamic Admin-Editable Base Count State
    this.customBaseCount = 500;
    this.countMode = 'custom'; // 'custom' (admin edited) or 'cycle' (15-min dynamic)

    this.init();
  }

  init() {
    // 1. Initial cached state from local storage
    try {
      const cached = localStorage.getItem('kj_live_base_count_override');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (typeof parsed.baseCount === 'number') this.customBaseCount = parsed.baseCount;
        if (parsed.mode) this.countMode = parsed.mode;
      }
    } catch (e) {}

    // 2. Initial display using current base + 1 active user
    this.updateBadge(1);

    // 3. Local multi-tab coordination (BroadcastChannel + LocalStorage)
    this.initLocalTabCoordinator();

    // 4. Global multi-device MQTT WebSocket presence
    this.initGlobalMQTTPresence();

    // 5. Real-Time Admin Live Count Listener (Firestore + BroadcastChannel)
    this.initAdminLiveCountSync();

    // 6. Periodic prune timer for dead devices & stage transitions
    setInterval(() => this.pruneStalePeers(), 1500);
    setInterval(() => this.recalculateTotal(), 10000);
  }

  initAdminLiveCountSync() {
    const applyCountData = (data) => {
      if (!data) return;
      if (typeof data.baseCount === 'number') {
        this.customBaseCount = data.baseCount;
      }
      if (data.mode) {
        this.countMode = data.mode;
      }
      this.recalculateTotal();
    };

    // BroadcastChannel Listener for instant 0ms sync across tabs
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('kj_livecount_broadcast');
        bc.onmessage = (ev) => {
          if (ev.data) applyCountData(ev.data);
        };
      }
    } catch (e) {}

    // Window Storage Listener
    window.addEventListener('storage', (e) => {
      if (e.key === 'kj_live_base_count_override' && e.newValue) {
        try { applyCountData(JSON.parse(e.newValue)); } catch (err) {}
      }
    });

    // Cloud Firestore Live Listener on siteSettings/liveCount
    try {
      if (typeof firebase !== 'undefined' && firebase.app) {
        const fs = (function() { try { return firebase.app().firestore(); } catch(e) { return firebase.firestore(); } })();
        if (fs) {
          fs.collection('siteSettings').doc('liveCount').onSnapshot((docSnap) => {
            if (docSnap.exists) {
              const data = docSnap.data();
              applyCountData(data);
              try {
                localStorage.setItem('kj_live_base_count_override', JSON.stringify(data));
              } catch (e) {}
            }
          }, (err) => {
            console.info('Live count sync note:', err.message);
          });
        }
      }
    } catch (e) {}
  }

  updateBadge(actualActiveUsers) {
    if (!this.badgeEl) return;
    const effectiveUsers = Math.max(1, actualActiveUsers || 1);
    
    // Formula: [Admin Base Count] + [Actual Active Visitors] = [LIVE Count]
    let base = 500;
    if (this.countMode === 'cycle') {
      base = getCurrentBaseCount();
    } else if (typeof this.customBaseCount === 'number' && !isNaN(this.customBaseCount)) {
      base = this.customBaseCount;
    } else {
      base = 500;
    }

    const displayedCount = base + effectiveUsers;
    this.badgeEl.textContent = `${displayedCount} LIVE`;
  }

  recalculateTotal() {
    // Ensure this device is always registered
    this.remotePeers.set(this.sessionId, Date.now());
    
    // Total real active visitors = unique global devices or local tabs
    const globalDeviceCount = this.remotePeers.size;
    const effectiveActiveCount = Math.max(globalDeviceCount, this.activeTabs, 1);
    this.updateBadge(effectiveActiveCount);
  }

  pruneStalePeers() {
    const now = Date.now();
    let changed = false;
    for (const [id, lastSeen] of this.remotePeers.entries()) {
      if (id !== this.sessionId && now - lastSeen > 6500) {
        this.remotePeers.delete(id);
        changed = true;
      }
    }
    if (changed) {
      this.recalculateTotal();
    }
  }

  /* --- Local Multi-Tab Coordinator --- */
  initLocalTabCoordinator() {
    const syncLocal = () => {
      try {
        const raw = localStorage.getItem(this.storageKey);
        const data = raw ? JSON.parse(raw) : {};
        const now = Date.now();
        const cleaned = {};
        for (const [id, ts] of Object.entries(data)) {
          if (now - Number(ts) < 7000) cleaned[id] = ts;
        }
        cleaned[this.sessionId] = now;
        localStorage.setItem(this.storageKey, JSON.stringify(cleaned));
        this.activeTabs = Object.keys(cleaned).length || 1;
        this.recalculateTotal();
      } catch (e) {}
    };

    syncLocal();
    setInterval(syncLocal, 1800);

    window.addEventListener('storage', (e) => {
      if (e.key === this.storageKey) {
        try {
          const data = JSON.parse(e.newValue || '{}');
          this.activeTabs = Object.keys(data).length || 1;
          this.recalculateTotal();
        } catch (err) {}
      }
    });

    if ('BroadcastChannel' in window) {
      try {
        this.bc = new BroadcastChannel(this.channelName);
        this.bc.postMessage({ type: 'JOIN', id: this.sessionId });

        this.bc.onmessage = (e) => {
          if (!e.data) return;
          if (e.data.type === 'JOIN' || e.data.type === 'PING') {
            this.remotePeers.set(e.data.id, Date.now());
            syncLocal();
          } else if (e.data.type === 'LEAVE') {
            this.remotePeers.delete(e.data.id);
            this.recalculateTotal();
          }
        };
      } catch (e) {}
    }

    window.addEventListener('beforeunload', () => {
      this.sendLeaveNotification();
    });
  }

  /* --- Global Multi-Device MQTT Presence Engine --- */
  initGlobalMQTTPresence() {
    if (typeof Paho === 'undefined' || !Paho.MQTT || !Paho.MQTT.Client) {
      // Fallback: retry after Paho loads
      setTimeout(() => this.initGlobalMQTTPresence(), 1000);
      return;
    }

    const broker = this.brokers[this.currentBrokerIndex];
    const clientId = 'kj_client_' + this.sessionId;

    try {
      this.mqttClient = new Paho.MQTT.Client(broker.host, broker.port, broker.path, clientId);

      // Last Will and Testament: Automatically broadcast LEAVE when device disconnects/closes
      const lwt = new Paho.MQTT.Message(JSON.stringify({ type: 'LEAVE', id: this.sessionId }));
      lwt.destinationName = this.mqttTopic;
      lwt.qos = 0;
      lwt.retained = false;

      this.mqttClient.onConnectionLost = (responseObject) => {
        this.isMqttConnected = false;
        if (this.mqttHeartbeatTimer) clearInterval(this.mqttHeartbeatTimer);
        // Failover to next broker after 3s
        this.currentBrokerIndex = (this.currentBrokerIndex + 1) % this.brokers.length;
        setTimeout(() => this.initGlobalMQTTPresence(), 3000);
      };

      this.mqttClient.onMessageArrived = (message) => {
        try {
          const payload = JSON.parse(message.payloadString);
          if (payload && payload.id) {
            if (payload.type === 'PING' || payload.type === 'JOIN') {
              this.remotePeers.set(payload.id, Date.now());
              this.recalculateTotal();
            } else if (payload.type === 'LEAVE') {
              this.remotePeers.delete(payload.id);
              this.recalculateTotal();
            }
          }
        } catch (e) {}
      };

      const connectOptions = {
        useSSL: true,
        timeout: 8,
        keepAliveInterval: 30,
        cleanSession: true,
        willMessage: lwt,
        onSuccess: () => {
          this.isMqttConnected = true;
          this.mqttClient.subscribe(this.mqttTopic, { qos: 0 });

          // Send initial JOIN packet
          this.sendMQTTPing('JOIN');

          // Heartbeat every 2.5 seconds
          if (this.mqttHeartbeatTimer) clearInterval(this.mqttHeartbeatTimer);
          this.mqttHeartbeatTimer = setInterval(() => {
            if (this.isMqttConnected) {
              this.sendMQTTPing('PING');
            }
          }, 2500);
        },
        onFailure: (err) => {
          this.isMqttConnected = false;
          this.currentBrokerIndex = (this.currentBrokerIndex + 1) % this.brokers.length;
          setTimeout(() => this.initGlobalMQTTPresence(), 4000);
        }
      };

      this.mqttClient.connect(connectOptions);
    } catch (err) {
      console.warn('MQTT presence setup notice:', err);
    }
  }

  sendMQTTPing(type = 'PING') {
    if (!this.mqttClient || !this.isMqttConnected) return;
    try {
      const msg = new Paho.MQTT.Message(JSON.stringify({
        type: type,
        id: this.sessionId,
        ts: Date.now()
      }));
      msg.destinationName = this.mqttTopic;
      msg.qos = 0;
      this.mqttClient.send(msg);
      this.remotePeers.set(this.sessionId, Date.now());
    } catch (e) {}
  }

  sendLeaveNotification() {
    // 1. Local cleanup
    try {
      const raw = localStorage.getItem(this.storageKey);
      const data = raw ? JSON.parse(raw) : {};
      delete data[this.sessionId];
      localStorage.setItem(this.storageKey, JSON.stringify(data));
      if (this.bc) this.bc.postMessage({ type: 'LEAVE', id: this.sessionId });
    } catch (e) {}

    // 2. Global MQTT cleanup
    if (this.mqttClient && this.isMqttConnected) {
      try {
        const msg = new Paho.MQTT.Message(JSON.stringify({ type: 'LEAVE', id: this.sessionId }));
        msg.destinationName = this.mqttTopic;
        msg.qos = 0;
        this.mqttClient.send(msg);
        this.mqttClient.disconnect();
      } catch (e) {}
    }
  }
}

/* --------------------------------------------------------------------------
   2. Live Date & Time Clock Controller
   -------------------------------------------------------------------------- */
function initDateTimeWidget() {
  const timeEl = document.getElementById('widgetTime');
  const dateEl = document.getElementById('widgetDate');
  if (!timeEl || !dateEl) return;

  const updateClock = () => {
    const now = new Date();
    
    // Format Time: 08:54 PM
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const formattedHours = String(hours).padStart(2, '0');
    timeEl.textContent = `${formattedHours}:${minutes} ${ampm}`;

    // Format Date: 13 Aug 2026
    const day = String(now.getDate()).padStart(2, '0');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[now.getMonth()];
    const year = now.getFullYear();
    dateEl.textContent = `${day} ${month} ${year}`;
  };

  updateClock();
  setInterval(updateClock, 1000);
}

/* --------------------------------------------------------------------------
   3. Night Sky Twinkle Stars Generator
   -------------------------------------------------------------------------- */
function initNightSkyStars() {
  const container = document.getElementById('skyStars');
  if (!container) return;
  const starCount = 14;

  for (let i = 0; i < starCount; i++) {
    const star = document.createElement('div');
    star.className = 'sky-star';
    const size = (Math.random() * 1.5 + 1.2).toFixed(1);
    const top = (Math.random() * 24 + 2).toFixed(1);
    const left = (Math.random() * 96 + 2).toFixed(1);
    const duration = (Math.random() * 3 + 3.5).toFixed(1);
    const delay = (Math.random() * 4).toFixed(1);

    star.style.width = `${size}px`;
    star.style.height = `${size}px`;
    star.style.top = `${top}%`;
    star.style.left = `${left}%`;
    star.style.animationDuration = `${duration}s`;
    star.style.animationDelay = `${delay}s`;
    star.style.opacity = (Math.random() * 0.4 + 0.2).toFixed(2);

    container.appendChild(star);
  }
}

/* --------------------------------------------------------------------------
   4. Floating Festive Dust Particles (Soft upward magical glow)
   -------------------------------------------------------------------------- */
function initFestiveDustParticles() {
  const container = document.getElementById('festiveDust');
  if (!container) return;

  const isMobile = window.innerWidth <= 680;
  const particleCount = isMobile ? 18 : 38;
  const types = ['dust-gold', 'dust-gold', 'dust-amber', 'dust-white'];

  for (let i = 0; i < particleCount; i++) {
    const p = document.createElement('div');
    const typeClass = types[Math.floor(Math.random() * types.length)];
    p.className = `dust-particle ${typeClass}`;

    const size = (Math.random() * 1.8 + 1.1).toFixed(1);
    const left = (Math.random() * 96 + 2).toFixed(1);
    const duration = (Math.random() * 7 + 9).toFixed(1); // 9s to 16s
    const delay = (-(Math.random() * 14)).toFixed(1); // negative delay so pre-dispersed
    const driftX = (Math.random() * 40 - 20).toFixed(0); // -20px to +20px
    const driftEnd = (Math.random() * 30 - 15).toFixed(0);
    const opacity = (Math.random() * 0.45 + 0.25).toFixed(2); // 0.25 to 0.70

    p.style.width = `${size}px`;
    p.style.height = `${size}px`;
    p.style.left = `${left}%`;
    p.style.animationDuration = `${duration}s`;
    p.style.animationDelay = `${delay}s`;
    p.style.setProperty('--drift-x', `${driftX}px`);
    p.style.setProperty('--drift-end', `${driftEnd}px`);
    p.style.setProperty('--p-opacity', opacity);

    container.appendChild(p);
  }
}

/* --------------------------------------------------------------------------
   5. Subtle Desktop Mouse Parallax (Max 2px movement)
   -------------------------------------------------------------------------- */
function initSubtleParallax() {
  const isDesktop = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (!isDesktop) return;

  const bgImage = document.getElementById('bgImage');
  if (!bgImage) return;

  let targetX = 0;
  let targetY = 0;
  let currentX = 0;
  let currentY = 0;

  window.addEventListener('mousemove', (e) => {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    targetX = ((e.clientX - centerX) / centerX) * 2;
    targetY = ((e.clientY - centerY) / centerY) * 1.5;
  }, { passive: true });

  const render = () => {
    currentX += (targetX - currentX) * 0.05;
    currentY += (targetY - currentY) * 0.05;
    bgImage.style.transform = `translate3d(${currentX.toFixed(2)}px, ${currentY.toFixed(2)}px, 0)`;
    requestAnimationFrame(render);
  };
  requestAnimationFrame(render);
}

/* --------------------------------------------------------------------------
   6. Intelligent Singer & Artist Keyword Recognition Database
   -------------------------------------------------------------------------- */
const KNOWN_KHANDESHI_SINGERS = [
  { name: 'Bhaiya More', regex: /\b(?:bhaiya\s*more|भैय्या\s*मोरे|भय्या\s*मोरे|bhaiya)\b/i },
  { name: 'Ramakant', regex: /\b(?:ramakant|रमाकांत|ramakant\s*gaikwad)\b/i },
  { name: 'Ravindra Khare', regex: /\b(?:ravindra\s*khare|रवींद्र\s*खरे|रविंद्र\s*खरे)\b/i },
  { name: 'Anjana Barlekar', regex: /\b(?:anjana\s*barlekar|अंजना\s*बर्लेकर|anjana)\b/i },
  { name: 'Sachin Kumavat', regex: /\b(?:sachin\s*kumavat|सचिन\s*कुमावत)\b/i },
  { name: 'Ganesh Gujar', regex: /\b(?:ganesh\s*gujar|गणेश\s*गुजर)\b/i },
  { name: 'Anil Kuvar', regex: /\b(?:anil\s*kuvar|अनिल\s*कुवर)\b/i },
  { name: 'Jagdish Sandhanshiv', regex: /\b(?:jagdish\s*sandhanshiv|जगदीश\s*संध्यांशिव|sandhanshiv)\b/i },
  { name: 'Anna Surwade', regex: /\b(?:anna\s*surwade|अण्णा\s*सुरवाडे|अन्ना\s*सुरवाडे)\b/i },
  { name: 'Babu More', regex: /\b(?:babu\s*more|बाबू\s*मोरे)\b/i },
  { name: 'Shrawani More', regex: /\b(?:shrawani\s*more|श्रावणी\s*मोरे)\b/i },
  { name: 'Raju Wagh', regex: /\b(?:raju\s*wagh|राजू\s*वाघ)\b/i },
  { name: 'Naval Mali', regex: /\b(?:naval\s*mali|नवल\s*माळी)\b/i },
  { name: 'Ajay Mali', regex: /\b(?:ajay\s*mali|अजय\s*माळी)\b/i },
  { name: 'Anshuman More', regex: /\b(?:anshuman\s*more|अंशुमन\s*मोरे)\b/i },
  { name: 'Madhuri Koli', regex: /\b(?:madhuri\s*koli|माधुरी\s*कोळी)\b/i },
  { name: 'Kunal Pawar', regex: /\b(?:kunal\s*pawar|कुणाल\s*पवार)\b/i },
  { name: 'Hiten Shivde', regex: /\b(?:hiten\s*shivde|हितेन\s*शिवदे)\b/i },
  { name: 'Vinod Kumavat', regex: /\b(?:vinod\s*kumavat|विनोद\s*कुमावत)\b/i },
  { name: 'Raju Kalme', regex: /\b(?:raju\s*kalme|राजू\s*काळमे)\b/i },
  { name: 'Machindra More', regex: /\b(?:machindra\s*more|मच्छिंद्र\s*मोरे)\b/i },
  { name: 'Arun Ahire', regex: /\b(?:arun\s*ahire|अरुण\s*अहिरे)\b/i },
  { name: 'Rucha Birari', regex: /\b(?:rucha\s*birari|ऋचा\s*बिरारी)\b/i },
  { name: 'Dipak Wagh', regex: /\b(?:dipak\s*wagh|दीपक\s*वाघ)\b/i },
  { name: 'Bhagyashree Sathe', regex: /\b(?:bhagyashree\s*sathe|भाग्यश्री\s*साठे)\b/i },
  { name: 'Megha Musale', regex: /\b(?:megha\s*musale|मेघा\s*मुसळे)\b/i },
  { name: 'Jasraj Joshi', regex: /\b(?:jasraj\s*joshi|जसराज\s*जोशी)\b/i },
  { name: 'Prashant Nakti', regex: /\b(?:prashant\s*nakti|प्रशांत\s*नाकती)\b/i },
  { name: 'Lalit Shinde', regex: /\b(?:lalit\s*shinde|ललित\s*शिंदे)\b/i }
];

function extractSingerKeyword(text) {
  if (!text || typeof text !== 'string') return null;

  // 1. Keyword search against known singers database
  for (const entry of KNOWN_KHANDESHI_SINGERS) {
    if (entry.regex.test(text)) {
      return entry.name;
    }
  }

  // 2. Pattern search: "by <Singer>", "singer: <Singer>", "गायक: <Singer>", "ft. <Singer>"
  const match = text.match(/(?:by|singer|vocals|artist|feat\.?|ft\.?|गायक|स्वर)\s*[:\-–—]?\s*([a-zA-Z\u0900-\u097F\s]{2,40})/i);
  if (match && match[1]) {
    const candidate = match[1].replace(/[\(\)\[\]\.\-_]+$/g, '').trim();
    if (candidate.length >= 2 && candidate.length <= 35) {
      return candidate;
    }
  }

  return null;
}

/* --------------------------------------------------------------------------
   7. Initial Music Player State & Dual Playlist Engine
   -------------------------------------------------------------------------- */
const defaultPlaylists = {
  ahirani: [
    {
        "id": "storage_track_36",
        "title": "Khandeshi Bhawani Powerfull Duff 2022 ( Dj Bhaiya Jalgaon )",
        "singer": "Dj Bhaiya",
        "artist": "Dj Bhaiya",
        "vocals": "Dj Bhaiya",
        "singerName": "Dj Bhaiya",
        "artistName": "Dj Bhaiya",
        "category": "বাংলা গান",
        "filename": "?????????_?????_????_???_??_????_Khandeshi_Bhawani_Powerfull_Duff_2022_(_Dj_Bhaiya_Jalgaon_).mp3",
        "storagePath": "jay bangla/?????????_?????_????_???_??_????_Khandeshi_Bhawani_Powerfull_Duff_2022_(_Dj_Bhaiya_Jalgaon_).mp3",
        "audioUrl": "https://firebasestorage.googleapis.com/v0/b/bangla-f3985.firebasestorage.app/o/jay%20bangla%2F%3F%3F%3F%3F%3F%3F%3F%3F%3F_%3F%3F%3F%3F%3F_%3F%3F%3F%3F_%3F%3F%3F_%3F%3F_%3F%3F%3F%3F_Khandeshi_Bhawani_Powerfull_Duff_2022_%28_Dj_Bhaiya_Jalgaon_%29.mp3?alt=media",
        "duration": "--:--",
        "cover": "assets/images/vinyl-record.svg",
        "isFirebaseStorage": true
    },
    {
        "id": "storage_track_35",
        "title": "Aaj Lagani tile hayad Ahirani Khandeshi Song",
        "singer": "বাংলা সঙ্গীত",
        "artist": "বাংলা সঙ্গীত",
        "vocals": "বাংলা সঙ্গীত",
        "singerName": "বাংলা সঙ্গীত",
        "artistName": "বাংলা সঙ্গীত",
        "category": "বাংলা গান",
        "filename": "??_?????_????_???_Aaj_Lagani_tile_hayad_Ahirani_Khandeshi_Song_Video_Generation.mp3",
        "storagePath": "jay bangla/??_?????_????_???_Aaj_Lagani_tile_hayad_Ahirani_Khandeshi_Song_Video_Generation.mp3",
        "audioUrl": "https://firebasestorage.googleapis.com/v0/b/bangla-f3985.firebasestorage.app/o/jay%20bangla%2F%3F%3F_%3F%3F%3F%3F%3F_%3F%3F%3F%3F_%3F%3F%3F_Aaj_Lagani_tile_hayad_Ahirani_Khandeshi_Song_Video_Generation.mp3?alt=media",
        "duration": "--:--",
        "cover": "assets/images/vinyl-record.svg",
        "isFirebaseStorage": true
    },
    {
        "id": "storage_track_37",
        "title": "Hai jhumka vali por ahirani khandeshi song Vinod kumavat",
        "singer": "Vinod Kumavat",
        "artist": "Vinod Kumavat",
        "vocals": "Vinod Kumavat",
        "singerName": "Vinod Kumavat",
        "artistName": "Vinod Kumavat",
        "category": "বাংলা গান",
        "filename": "?_???_?????_????_???_?_Hai_jhumka_vali_por_?Super_hit_ahirani_khandeshi_song_Vinod_kumavat.mp3",
        "storagePath": "jay bangla/?_???_?????_????_???_?_Hai_jhumka_vali_por_?Super_hit_ahirani_khandeshi_song_Vinod_kumavat.mp3",
        "audioUrl": "https://firebasestorage.googleapis.com/v0/b/bangla-f3985.firebasestorage.app/o/jay%20bangla%2F%3F_%3F%3F%3F_%3F%3F%3F%3F%3F_%3F%3F%3F%3F_%3F%3F%3F_%3F_Hai_jhumka_vali_por_%3FSuper_hit_ahirani_khandeshi_song_Vinod_kumavat.mp3?alt=media",
        "duration": "--:--",
        "cover": "assets/images/vinyl-record.svg",
        "isFirebaseStorage": true
    },
    {
        "id": "storage_track_1",
        "title": "Char varis na pyar, Ajay Mali, Anshuman More",
        "singer": "Ajay Mali",
        "artist": "Ajay Mali",
        "vocals": "Ajay Mali",
        "singerName": "Ajay Mali",
        "artistName": "Ajay Mali",
        "category": "বাংলা গান",
        "filename": "Char_varis_na_pyar,_???_????_??_?????_Ajay_Mali,_Anshuman_More,_new_khandeshi_song,ahirani_song.mp3",
        "storagePath": "jay bangla/Char_varis_na_pyar,_???_????_??_?????_Ajay_Mali,_Anshuman_More,_new_khandeshi_song,ahirani_song.mp3",
        "audioUrl": "https://firebasestorage.googleapis.com/v0/b/bangla-f3985.firebasestorage.app/o/jay%20bangla%2FChar_varis_na_pyar%2C_%3F%3F%3F_%3F%3F%3F%3F_%3F%3F_%3F%3F%3F%3F%3F_Ajay_Mali%2C_Anshuman_More%2C_new_khandeshi_song%2Cahirani_song.mp3?alt=media",
        "duration": "--:--",
        "cover": "assets/images/vinyl-record.svg",
        "isFirebaseStorage": true
    },
    {
        "id": "storage_track_2",
        "title": "Dang Maa Chalay Pori",
        "singer": "বাংলা সঙ্গীত",
        "artist": "বাংলা সঙ্গীত",
        "vocals": "বাংলা সঙ্গীত",
        "singerName": "বাংলা সঙ্গীত",
        "artistName": "বাংলা সঙ্গীত",
        "category": "বাংলা গান",
        "filename": "Dang_Maa_Chalay_Pori.mp3",
        "storagePath": "jay bangla/Dang_Maa_Chalay_Pori.mp3",
        "audioUrl": "https://firebasestorage.googleapis.com/v0/b/bangla-f3985.firebasestorage.app/o/jay%20bangla%2FDang_Maa_Chalay_Pori.mp3?alt=media",
        "duration": "--:--",
        "cover": "assets/images/vinyl-record.svg",
        "isFirebaseStorage": true
    },
    {
        "id": "storage_track_3",
        "title": "Dekh Tuni Bayko Anjana Barlekar Jagdish Sandhanshiv",
        "singer": "Anjana Barlekar",
        "artist": "Anjana Barlekar",
        "vocals": "Anjana Barlekar",
        "singerName": "Anjana Barlekar",
        "artistName": "Anjana Barlekar",
        "category": "বাংলা গান",
        "filename": "Dekh_Tuni_Bayko_Superhit_Ahirani_Song_Anjana_Barlekar_Jagdish_Sandhanshiv.mp3",
        "storagePath": "jay bangla/Dekh_Tuni_Bayko_Superhit_Ahirani_Song_Anjana_Barlekar_Jagdish_Sandhanshiv.mp3",
        "audioUrl": "https://firebasestorage.googleapis.com/v0/b/bangla-f3985.firebasestorage.app/o/jay%20bangla%2FDekh_Tuni_Bayko_Superhit_Ahirani_Song_Anjana_Barlekar_Jagdish_Sandhanshiv.mp3?alt=media",
        "duration": "--:--",
        "cover": "assets/images/vinyl-record.svg",
        "isFirebaseStorage": true
    },
    {
        "id": "storage_track_4",
        "title": "Dena Tuni Sath",
        "singer": "বাংলা সঙ্গীত",
        "artist": "বাংলা সঙ্গীত",
        "vocals": "বাংলা সঙ্গীত",
        "singerName": "বাংলা সঙ্গীত",
        "artistName": "বাংলা সঙ্গীত",
        "category": "বাংলা গান",
        "filename": "Dena_Tuni_Sath.mp3",
        "storagePath": "jay bangla/Dena_Tuni_Sath.mp3",
        "audioUrl": "https://firebasestorage.googleapis.com/v0/b/bangla-f3985.firebasestorage.app/o/jay%20bangla%2FDena_Tuni_Sath.mp3?alt=media",
        "duration": "--:--",
        "cover": "assets/images/vinyl-record.svg",
        "isFirebaseStorage": true
    },
    {
        "id": "storage_track_5",
        "title": "Dhokebaz Hui Gai",
        "singer": "বাংলা সঙ্গীত",
        "artist": "বাংলা সঙ্গীত",
        "vocals": "বাংলা সঙ্গীত",
        "singerName": "বাংলা সঙ্গীত",
        "artistName": "বাংলা সঙ্গীত",
        "category": "বাংলা গান",
        "filename": "Dhokebaz_Hui_Gai.mp3",
        "storagePath": "jay bangla/Dhokebaz_Hui_Gai.mp3",
        "audioUrl": "https://firebasestorage.googleapis.com/v0/b/bangla-f3985.firebasestorage.app/o/jay%20bangla%2FDhokebaz_Hui_Gai.mp3?alt=media",
        "duration": "--:--",
        "cover": "assets/images/vinyl-record.svg",
        "isFirebaseStorage": true
    },
    {
        "id": "storage_track_6",
        "title": "Ghadina Kata Gar Gar Fire Part 2 Ramakant Kapadnis, Shashikant Kachave",
        "singer": "Ramakant Kapadnis",
        "artist": "Ramakant Kapadnis",
        "vocals": "Ramakant Kapadnis",
        "singerName": "Ramakant Kapadnis",
        "artistName": "Ramakant Kapadnis",
        "category": "বাংলা গান",
        "filename": "Ghadina_Kata_Gar_Gar_Fire_Part_2_?????_????_?????_?_Ramakant_Kapadnis,_Shashikant_Kachave.mp3",
        "storagePath": "jay bangla/Ghadina_Kata_Gar_Gar_Fire_Part_2_?????_????_?????_?_Ramakant_Kapadnis,_Shashikant_Kachave.mp3",
        "audioUrl": "https://firebasestorage.googleapis.com/v0/b/bangla-f3985.firebasestorage.app/o/jay%20bangla%2FGhadina_Kata_Gar_Gar_Fire_Part_2_%3F%3F%3F%3F%3F_%3F%3F%3F%3F_%3F%3F%3F%3F%3F_%3F_Ramakant_Kapadnis%2C_Shashikant_Kachave.mp3?alt=media",
        "duration": "--:--",
        "cover": "assets/images/vinyl-record.svg",
        "isFirebaseStorage": true
    },
    {
        "id": "storage_track_7",
        "title": "Girana Kathale Mana Gaav",
        "singer": "বাংলা সঙ্গীত",
        "artist": "বাংলা সঙ্গীত",
        "vocals": "বাংলা সঙ্গীত",
        "singerName": "বাংলা সঙ্গীত",
        "artistName": "বাংলা সঙ্গীত",
        "category": "বাংলা গান",
        "filename": "Girana_Kathale_Mana_Gaav.mp3",
        "storagePath": "jay bangla/Girana_Kathale_Mana_Gaav.mp3",
        "audioUrl": "https://firebasestorage.googleapis.com/v0/b/bangla-f3985.firebasestorage.app/o/jay%20bangla%2FGirana_Kathale_Mana_Gaav.mp3?alt=media",
        "duration": "--:--",
        "cover": "assets/images/vinyl-record.svg",
        "isFirebaseStorage": true
    },
    {
        "id": "storage_track_8",
        "title": "Haat Mehandi Na",
        "singer": "বাংলা সঙ্গীত",
        "artist": "বাংলা সঙ্গীত",
        "vocals": "বাংলা সঙ্গীত",
        "singerName": "বাংলা সঙ্গীত",
        "artistName": "বাংলা সঙ্গীত",
        "category": "বাংলা গান",
        "filename": "Haat_Mehandi_Na.mp3",
        "storagePath": "jay bangla/Haat_Mehandi_Na.mp3",
        "audioUrl": "https://firebasestorage.googleapis.com/v0/b/bangla-f3985.firebasestorage.app/o/jay%20bangla%2FHaat_Mehandi_Na.mp3?alt=media",
        "duration": "--:--",
        "cover": "assets/images/vinyl-record.svg",
        "isFirebaseStorage": true
    },
    {
        "id": "storage_track_9",
        "title": "Hai Khandeshi Tam Tam",
        "singer": "বাংলা সঙ্গীত",
        "artist": "বাংলা সঙ্গীত",
        "vocals": "বাংলা সঙ্গীত",
        "singerName": "বাংলা সঙ্গীত",
        "artistName": "বাংলা সঙ্গীত",
        "category": "বাংলা গান",
        "filename": "Hai_Khandeshi_Tam_Tam.mp3",
        "storagePath": "jay bangla/Hai_Khandeshi_Tam_Tam.mp3",
        "audioUrl": "https://firebasestorage.googleapis.com/v0/b/bangla-f3985.firebasestorage.app/o/jay%20bangla%2FHai_Khandeshi_Tam_Tam.mp3?alt=media",
        "duration": "--:--",
        "cover": "assets/images/vinyl-record.svg",
        "isFirebaseStorage": true
    },
    {
        "id": "storage_track_10",
        "title": "Hai Saali Pyaar Karna",
        "singer": "বাংলা সঙ্গীত",
        "artist": "বাংলা সঙ্গীত",
        "vocals": "বাংলা সঙ্গীত",
        "singerName": "বাংলা সঙ্গীত",
        "artistName": "বাংলা সঙ্গীত",
        "category": "বাংলা গান",
        "filename": "Hai_Saali_Pyaar_Karna.mp3",
        "storagePath": "jay bangla/Hai_Saali_Pyaar_Karna.mp3",
        "audioUrl": "https://firebasestorage.googleapis.com/v0/b/bangla-f3985.firebasestorage.app/o/jay%20bangla%2FHai_Saali_Pyaar_Karna.mp3?alt=media",
        "duration": "--:--",
        "cover": "assets/images/vinyl-record.svg",
        "isFirebaseStorage": true
    },
    {
        "id": "storage_track_11",
        "title": "Kanbai Chalni Gangevari",
        "singer": "বাংলা সঙ্গীত",
        "artist": "বাংলা সঙ্গীত",
        "vocals": "বাংলা সঙ্গীত",
        "singerName": "বাংলা সঙ্গীত",
        "artistName": "বাংলা সঙ্গীত",
        "category": "বাংলা গান",
        "filename": "Kanbai_Chalni_Gangevari.mp3",
        "storagePath": "jay bangla/Kanbai_Chalni_Gangevari.mp3",
        "audioUrl": "https://firebasestorage.googleapis.com/v0/b/bangla-f3985.firebasestorage.app/o/jay%20bangla%2FKanbai_Chalni_Gangevari.mp3?alt=media",
        "duration": "--:--",
        "cover": "assets/images/vinyl-record.svg",
        "isFirebaseStorage": true
    },
    {
        "id": "storage_track_12",
        "title": "Kar Man Lagan",
        "singer": "বাংলা সঙ্গীত",
        "artist": "বাংলা সঙ্গীত",
        "vocals": "বাংলা সঙ্গীত",
        "singerName": "বাংলা সঙ্গীত",
        "artistName": "বাংলা সঙ্গীত",
        "category": "বাংলা গান",
        "filename": "Kar_Man_Lagan.mp3",
        "storagePath": "jay bangla/Kar_Man_Lagan.mp3",
        "audioUrl": "https://firebasestorage.googleapis.com/v0/b/bangla-f3985.firebasestorage.app/o/jay%20bangla%2FKar_Man_Lagan.mp3?alt=media",
        "duration": "--:--",
        "cover": "assets/images/vinyl-record.svg",
        "isFirebaseStorage": true
    },
    {
        "id": "storage_track_13",
        "title": "Khandeshi Band Mix Pawri, Pt. 3",
        "singer": "বাংলা সঙ্গীত",
        "artist": "বাংলা সঙ্গীত",
        "vocals": "বাংলা সঙ্গীত",
        "singerName": "বাংলা সঙ্গীত",
        "artistName": "বাংলা সঙ্গীত",
        "category": "বাংলা গান",
        "filename": "Khandeshi_Band_Mix_Pawri,_Pt._3.mp3",
        "storagePath": "jay bangla/Khandeshi_Band_Mix_Pawri,_Pt._3.mp3",
        "audioUrl": "https://firebasestorage.googleapis.com/v0/b/bangla-f3985.firebasestorage.app/o/jay%20bangla%2FKhandeshi_Band_Mix_Pawri%2C_Pt._3.mp3?alt=media",
        "duration": "--:--",
        "cover": "assets/images/vinyl-record.svg",
        "isFirebaseStorage": true
    },
    {
        "id": "storage_track_14",
        "title": "Laganma Machadu Dhum Ra Dhum",
        "singer": "বাংলা সঙ্গীত",
        "artist": "বাংলা সঙ্গীত",
        "vocals": "বাংলা সঙ্গীত",
        "singerName": "বাংলা সঙ্গীত",
        "artistName": "বাংলা সঙ্গীত",
        "category": "বাংলা গান",
        "filename": "Laganma_Machadu_Dhum_Ra_Dhum.mp3",
        "storagePath": "jay bangla/Laganma_Machadu_Dhum_Ra_Dhum.mp3",
        "audioUrl": "https://firebasestorage.googleapis.com/v0/b/bangla-f3985.firebasestorage.app/o/jay%20bangla%2FLaganma_Machadu_Dhum_Ra_Dhum.mp3?alt=media",
        "duration": "--:--",
        "cover": "assets/images/vinyl-record.svg",
        "isFirebaseStorage": true
    },
    {
        "id": "storage_track_15",
        "title": "Lak Lak Chamakana Nanduri Na Gad",
        "singer": "বাংলা সঙ্গীত",
        "artist": "বাংলা সঙ্গীত",
        "vocals": "বাংলা সঙ্গীত",
        "singerName": "বাংলা সঙ্গীত",
        "artistName": "বাংলা সঙ্গীত",
        "category": "বাংলা গান",
        "filename": "Lak_Lak_Chamakana_Nanduri_Na_Gad.mp3",
        "storagePath": "jay bangla/Lak_Lak_Chamakana_Nanduri_Na_Gad.mp3",
        "audioUrl": "https://firebasestorage.googleapis.com/v0/b/bangla-f3985.firebasestorage.app/o/jay%20bangla%2FLak_Lak_Chamakana_Nanduri_Na_Gad.mp3?alt=media",
        "duration": "--:--",
        "cover": "assets/images/vinyl-record.svg",
        "isFirebaseStorage": true
    },
    {
        "id": "storage_track_16",
        "title": "Mani Darling",
        "singer": "বাংলা সঙ্গীত",
        "artist": "বাংলা সঙ্গীত",
        "vocals": "বাংলা সঙ্গীত",
        "singerName": "বাংলা সঙ্গীত",
        "artistName": "বাংলা সঙ্গীত",
        "category": "বাংলা গান",
        "filename": "Mani_Darling.mp3",
        "storagePath": "jay bangla/Mani_Darling.mp3",
        "audioUrl": "https://firebasestorage.googleapis.com/v0/b/bangla-f3985.firebasestorage.app/o/jay%20bangla%2FMani_Darling.mp3?alt=media",
        "duration": "--:--",
        "cover": "assets/images/vinyl-record.svg",
        "isFirebaseStorage": true
    },
    {
        "id": "storage_track_17",
        "title": "Mani Dilbar Tu Bhaiya More Vinod Kumavat",
        "singer": "Bhaiya More",
        "artist": "Bhaiya More",
        "vocals": "Bhaiya More",
        "singerName": "Bhaiya More",
        "artistName": "Bhaiya More",
        "category": "বাংলা গান",
        "filename": "Mani_Dilbar_Tu_???_?????_??_khandeshi_Superhit_Song_Singer_Bhaiya_More_Vinod_Kumavat.mp3",
        "storagePath": "jay bangla/Mani_Dilbar_Tu_???_?????_??_khandeshi_Superhit_Song_Singer_Bhaiya_More_Vinod_Kumavat.mp3",
        "audioUrl": "https://firebasestorage.googleapis.com/v0/b/bangla-f3985.firebasestorage.app/o/jay%20bangla%2FMani_Dilbar_Tu_%3F%3F%3F_%3F%3F%3F%3F%3F_%3F%3F_khandeshi_Superhit_Song_Singer_Bhaiya_More_Vinod_Kumavat.mp3?alt=media",
        "duration": "--:--",
        "cover": "assets/images/vinyl-record.svg",
        "isFirebaseStorage": true
    },
    {
        "id": "storage_track_18",
        "title": "May Mani Khandesh Ni Malan",
        "singer": "বাংলা সঙ্গীত",
        "artist": "বাংলা সঙ্গীত",
        "vocals": "বাংলা সঙ্গীত",
        "singerName": "বাংলা সঙ্গীত",
        "artistName": "বাংলা সঙ্গীত",
        "category": "বাংলা গান",
        "filename": "May_Mani_Khandesh_Ni_Malan.mp3",
        "storagePath": "jay bangla/May_Mani_Khandesh_Ni_Malan.mp3",
        "audioUrl": "https://firebasestorage.googleapis.com/v0/b/bangla-f3985.firebasestorage.app/o/jay%20bangla%2FMay_Mani_Khandesh_Ni_Malan.mp3?alt=media",
        "duration": "--:--",
        "cover": "assets/images/vinyl-record.svg",
        "isFirebaseStorage": true
    },
    {
        "id": "storage_track_19",
        "title": "Me Ragush Tu Mani Maina",
        "singer": "বাংলা সঙ্গীত",
        "artist": "বাংলা সঙ্গীত",
        "vocals": "বাংলা সঙ্গীত",
        "singerName": "বাংলা সঙ্গীত",
        "artistName": "বাংলা সঙ্গীত",
        "category": "বাংলা গান",
        "filename": "Me_Ragush_Tu_Mani_Maina.mp3",
        "storagePath": "jay bangla/Me_Ragush_Tu_Mani_Maina.mp3",
        "audioUrl": "https://firebasestorage.googleapis.com/v0/b/bangla-f3985.firebasestorage.app/o/jay%20bangla%2FMe_Ragush_Tu_Mani_Maina.mp3?alt=media",
        "duration": "--:--",
        "cover": "assets/images/vinyl-record.svg",
        "isFirebaseStorage": true
    },
    {
        "id": "storage_track_20",
        "title": "Mi Tuna Divana S",
        "singer": "বাংলা সঙ্গীত",
        "artist": "বাংলা সঙ্গীত",
        "vocals": "বাংলা সঙ্গীত",
        "singerName": "বাংলা সঙ্গীত",
        "artistName": "বাংলা সঙ্গীত",
        "category": "বাংলা গান",
        "filename": "Mi_Tuna_Divana_S.mp3",
        "storagePath": "jay bangla/Mi_Tuna_Divana_S.mp3",
        "audioUrl": "https://firebasestorage.googleapis.com/v0/b/bangla-f3985.firebasestorage.app/o/jay%20bangla%2FMi_Tuna_Divana_S.mp3?alt=media",
        "duration": "--:--",
        "cover": "assets/images/vinyl-record.svg",
        "isFirebaseStorage": true
    },
    {
        "id": "storage_track_21",
        "title": "Na Bhulau Raja Tula (feat. Bhagyashree Sathe)",
        "singer": "Bhagyashree Sathe",
        "artist": "Bhagyashree Sathe",
        "vocals": "Bhagyashree Sathe",
        "singerName": "Bhagyashree Sathe",
        "artistName": "Bhagyashree Sathe",
        "category": "বাংলা গান",
        "filename": "Na_Bhulau_Raja_Tula_(feat._Bhagyashree_Sathe).mp3",
        "storagePath": "jay bangla/Na_Bhulau_Raja_Tula_(feat._Bhagyashree_Sathe).mp3",
        "audioUrl": "https://firebasestorage.googleapis.com/v0/b/bangla-f3985.firebasestorage.app/o/jay%20bangla%2FNa_Bhulau_Raja_Tula_%28feat._Bhagyashree_Sathe%29.mp3?alt=media",
        "duration": "--:--",
        "cover": "assets/images/vinyl-record.svg",
        "isFirebaseStorage": true
    },
    {
        "id": "storage_track_22",
        "title": "New Aadiwasi Song Zing Lak Lak Pawri Arun Ahire",
        "singer": "Arun Ahire",
        "artist": "Arun Ahire",
        "vocals": "Arun Ahire",
        "singerName": "Arun Ahire",
        "artistName": "Arun Ahire",
        "category": "বাংলা গান",
        "filename": "New_Aadiwasi_Song_????_??_??_?????_Zing_Lak_Lak_Pawri_Arun_Ahire_Official_Song.mp3",
        "storagePath": "jay bangla/New_Aadiwasi_Song_????_??_??_?????_Zing_Lak_Lak_Pawri_Arun_Ahire_Official_Song.mp3",
        "audioUrl": "https://firebasestorage.googleapis.com/v0/b/bangla-f3985.firebasestorage.app/o/jay%20bangla%2FNew_Aadiwasi_Song_%3F%3F%3F%3F_%3F%3F_%3F%3F_%3F%3F%3F%3F%3F_Zing_Lak_Lak_Pawri_Arun_Ahire_Official_Song.mp3?alt=media",
        "duration": "--:--",
        "cover": "assets/images/vinyl-record.svg",
        "isFirebaseStorage": true
    },
    {
        "id": "storage_track_23",
        "title": "Paisa Wali Tai",
        "singer": "বাংলা সঙ্গীত",
        "artist": "বাংলা সঙ্গীত",
        "vocals": "বাংলা সঙ্গীত",
        "singerName": "বাংলা সঙ্গীত",
        "artistName": "বাংলা সঙ্গীত",
        "category": "বাংলা গান",
        "filename": "Paisa_Wali_Tai.mp3",
        "storagePath": "jay bangla/Paisa_Wali_Tai.mp3",
        "audioUrl": "https://firebasestorage.googleapis.com/v0/b/bangla-f3985.firebasestorage.app/o/jay%20bangla%2FPaisa_Wali_Tai.mp3?alt=media",
        "duration": "--:--",
        "cover": "assets/images/vinyl-record.svg",
        "isFirebaseStorage": true
    },
    {
        "id": "storage_track_24",
        "title": "Phiri Phiri Nach Pori",
        "singer": "বাংলা সঙ্গীত",
        "artist": "বাংলা সঙ্গীত",
        "vocals": "বাংলা সঙ্গীত",
        "singerName": "বাংলা সঙ্গীত",
        "artistName": "বাংলা সঙ্গীত",
        "category": "বাংলা গান",
        "filename": "Phiri_Phiri_Nach_Pori.mp3",
        "storagePath": "jay bangla/Phiri_Phiri_Nach_Pori.mp3",
        "audioUrl": "https://firebasestorage.googleapis.com/v0/b/bangla-f3985.firebasestorage.app/o/jay%20bangla%2FPhiri_Phiri_Nach_Pori.mp3?alt=media",
        "duration": "--:--",
        "cover": "assets/images/vinyl-record.svg",
        "isFirebaseStorage": true
    },
    {
        "id": "storage_track_25",
        "title": "Phiri phiri nach pora new khandeshi song babu more shrawani more",
        "singer": "Babu More",
        "artist": "Babu More",
        "vocals": "Babu More",
        "singerName": "Babu More",
        "artistName": "Babu More",
        "category": "বাংলা গান",
        "filename": "Phiri_phiri_nach_pora_new_ahirani_song_female_version_khandeshi_song_babu_more_shrawani_more.mp3",
        "storagePath": "jay bangla/Phiri_phiri_nach_pora_new_ahirani_song_female_version_khandeshi_song_babu_more_shrawani_more.mp3",
        "audioUrl": "https://firebasestorage.googleapis.com/v0/b/bangla-f3985.firebasestorage.app/o/jay%20bangla%2FPhiri_phiri_nach_pora_new_ahirani_song_female_version_khandeshi_song_babu_more_shrawani_more.mp3?alt=media",
        "duration": "--:--",
        "cover": "assets/images/vinyl-record.svg",
        "isFirebaseStorage": true
    },
    {
        "id": "storage_track_26",
        "title": "Pori Tuni Payal",
        "singer": "বাংলা সঙ্গীত",
        "artist": "বাংলা সঙ্গীত",
        "vocals": "বাংলা সঙ্গীত",
        "singerName": "বাংলা সঙ্গীত",
        "artistName": "বাংলা সঙ্গীত",
        "category": "বাংলা গান",
        "filename": "Pori_Tuni_Payal.mp3",
        "storagePath": "jay bangla/Pori_Tuni_Payal.mp3",
        "audioUrl": "https://firebasestorage.googleapis.com/v0/b/bangla-f3985.firebasestorage.app/o/jay%20bangla%2FPori_Tuni_Payal.mp3?alt=media",
        "duration": "--:--",
        "cover": "assets/images/vinyl-record.svg",
        "isFirebaseStorage": true
    },
    {
        "id": "storage_track_27",
        "title": "Pyar M Tuna Sajani",
        "singer": "বাংলা সঙ্গীত",
        "artist": "বাংলা সঙ্গীত",
        "vocals": "বাংলা সঙ্গীত",
        "singerName": "বাংলা সঙ্গীত",
        "artistName": "বাংলা সঙ্গীত",
        "category": "বাংলা গান",
        "filename": "Pyar_M_Tuna_Sajani.mp3",
        "storagePath": "jay bangla/Pyar_M_Tuna_Sajani.mp3",
        "audioUrl": "https://firebasestorage.googleapis.com/v0/b/bangla-f3985.firebasestorage.app/o/jay%20bangla%2FPyar_M_Tuna_Sajani.mp3?alt=media",
        "duration": "--:--",
        "cover": "assets/images/vinyl-record.svg",
        "isFirebaseStorage": true
    },
    {
        "id": "storage_track_28",
        "title": "Raja Re (Raja Tu, Tu Mana Raja Re)",
        "singer": "বাংলা সঙ্গীত",
        "artist": "বাংলা সঙ্গীত",
        "vocals": "বাংলা সঙ্গীত",
        "singerName": "বাংলা সঙ্গীত",
        "artistName": "বাংলা সঙ্গীত",
        "category": "বাংলা গান",
        "filename": "Raja_Re_(Raja_Tu,_Tu_Mana_Raja_Re).mp3",
        "storagePath": "jay bangla/Raja_Re_(Raja_Tu,_Tu_Mana_Raja_Re).mp3",
        "audioUrl": "https://firebasestorage.googleapis.com/v0/b/bangla-f3985.firebasestorage.app/o/jay%20bangla%2FRaja_Re_%28Raja_Tu%2C_Tu_Mana_Raja_Re%29.mp3?alt=media",
        "duration": "--:--",
        "cover": "assets/images/vinyl-record.svg",
        "isFirebaseStorage": true
    },
    {
        "id": "storage_track_29",
        "title": "Rani Mana Khandesh Say Kamal",
        "singer": "বাংলা সঙ্গীত",
        "artist": "বাংলা সঙ্গীত",
        "vocals": "বাংলা সঙ্গীত",
        "singerName": "বাংলা সঙ্গীত",
        "artistName": "বাংলা সঙ্গীত",
        "category": "বাংলা গান",
        "filename": "Rani_Mana_Khandesh_Say_Kamal.mp3",
        "storagePath": "jay bangla/Rani_Mana_Khandesh_Say_Kamal.mp3",
        "audioUrl": "https://firebasestorage.googleapis.com/v0/b/bangla-f3985.firebasestorage.app/o/jay%20bangla%2FRani_Mana_Khandesh_Say_Kamal.mp3?alt=media",
        "duration": "--:--",
        "cover": "assets/images/vinyl-record.svg",
        "isFirebaseStorage": true
    },
    {
        "id": "storage_track_30",
        "title": "Sali Mi Nadan Sa",
        "singer": "বাংলা সঙ্গীত",
        "artist": "বাংলা সঙ্গীত",
        "vocals": "বাংলা সঙ্গীত",
        "singerName": "বাংলা সঙ্গীত",
        "artistName": "বাংলা সঙ্গীত",
        "category": "বাংলা গান",
        "filename": "Sali_Mi_Nadan_Sa.mp3",
        "storagePath": "jay bangla/Sali_Mi_Nadan_Sa.mp3",
        "audioUrl": "https://firebasestorage.googleapis.com/v0/b/bangla-f3985.firebasestorage.app/o/jay%20bangla%2FSali_Mi_Nadan_Sa.mp3?alt=media",
        "duration": "--:--",
        "cover": "assets/images/vinyl-record.svg",
        "isFirebaseStorage": true
    },
    {
        "id": "storage_track_31",
        "title": "Tule Jai Ti Dhoka Disan",
        "singer": "বাংলা সঙ্গীত",
        "artist": "বাংলা সঙ্গীত",
        "vocals": "বাংলা সঙ্গীত",
        "singerName": "বাংলা সঙ্গীত",
        "artistName": "বাংলা সঙ্গীত",
        "category": "বাংলা গান",
        "filename": "Tule_Jai_Ti_Dhoka_Disan.mp3",
        "storagePath": "jay bangla/Tule_Jai_Ti_Dhoka_Disan.mp3",
        "audioUrl": "https://firebasestorage.googleapis.com/v0/b/bangla-f3985.firebasestorage.app/o/jay%20bangla%2FTule_Jai_Ti_Dhoka_Disan.mp3?alt=media",
        "duration": "--:--",
        "cover": "assets/images/vinyl-record.svg",
        "isFirebaseStorage": true
    },
    {
        "id": "storage_track_32",
        "title": "Vadi Vadi Chandan Vadi (feat. Sachin Kumavat,Ankita Raut)",
        "singer": "Sachin Kumavat",
        "artist": "Sachin Kumavat",
        "vocals": "Sachin Kumavat",
        "singerName": "Sachin Kumavat",
        "artistName": "Sachin Kumavat",
        "category": "বাংলা গান",
        "filename": "Vadi_Vadi_Chandan_Vadi_(feat._Sachin_Kumavat,Ankita_Raut).mp3",
        "storagePath": "jay bangla/Vadi_Vadi_Chandan_Vadi_(feat._Sachin_Kumavat,Ankita_Raut).mp3",
        "audioUrl": "https://firebasestorage.googleapis.com/v0/b/bangla-f3985.firebasestorage.app/o/jay%20bangla%2FVadi_Vadi_Chandan_Vadi_%28feat._Sachin_Kumavat%2CAnkita_Raut%29.mp3?alt=media",
        "duration": "--:--",
        "cover": "assets/images/vinyl-record.svg",
        "isFirebaseStorage": true
    },
    {
        "id": "storage_track_33",
        "title": "Vicky Bhagya Ni Pawari s Khandeshi",
        "singer": "বাংলা সঙ্গীত",
        "artist": "বাংলা সঙ্গীত",
        "vocals": "বাংলা সঙ্গীত",
        "singerName": "বাংলা সঙ্গীত",
        "artistName": "বাংলা সঙ্গীত",
        "category": "বাংলা গান",
        "filename": "Vicky_Bhagya_Ni_Pawari_Ahirani_songs_Khandeshi_Dance_performance_Nakalp_cam_vision_studio.mp3",
        "storagePath": "jay bangla/Vicky_Bhagya_Ni_Pawari_Ahirani_songs_Khandeshi_Dance_performance_Nakalp_cam_vision_studio.mp3",
        "audioUrl": "https://firebasestorage.googleapis.com/v0/b/bangla-f3985.firebasestorage.app/o/jay%20bangla%2FVicky_Bhagya_Ni_Pawari_Ahirani_songs_Khandeshi_Dance_performance_Nakalp_cam_vision_studio.mp3?alt=media",
        "duration": "--:--",
        "cover": "assets/images/vinyl-record.svg",
        "isFirebaseStorage": true
    },
    {
        "id": "storage_track_34",
        "title": "Zim Zim Pani Ma",
        "singer": "বাংলা সঙ্গীত",
        "artist": "বাংলা সঙ্গীত",
        "vocals": "বাংলা সঙ্গীত",
        "singerName": "বাংলা সঙ্গীত",
        "artistName": "বাংলা সঙ্গীত",
        "category": "বাংলা গান",
        "filename": "Zim_Zim_Pani_Ma.mp3",
        "storagePath": "jay bangla/Zim_Zim_Pani_Ma.mp3",
        "audioUrl": "https://firebasestorage.googleapis.com/v0/b/bangla-f3985.firebasestorage.app/o/jay%20bangla%2FZim_Zim_Pani_Ma.mp3?alt=media",
        "duration": "--:--",
        "cover": "assets/images/vinyl-record.svg",
        "isFirebaseStorage": true
    }
  ]
};

defaultPlaylists.jaybangla = defaultPlaylists.ahirani;
defaultPlaylists.arjit = [];
defaultPlaylists.sanu = [];

const PLAYLIST_CONFIG = {
  arjit: {
    id: 'arjit',
    name: 'Arijit Express',
    icon: '🎤',
    folderCandidates: [
      'Arjit Bangla Hit', 'arjit bangla hit', 'Arjit Bangla Hits', 'arjit bangla hits',
      'Arjit_Bangla_Hit', 'arjit_bangla_hit', 'Arjit_Bangla_Hits', 'arjit_bangla_hits',
      'ArjitBanglaHit', 'ArjitBanglaHits', 'Arijit Bangla Hit', 'arijit bangla hit',
      'Arijit Bangla Hits', 'arijit bangla hits', 'Arijit Singh', 'arijit singh',
      'arijit', 'Arijit', 'arjit', 'Arjit'
    ],
    defaultArtist: 'Arijit Singh',
    category: 'Arijit Express'
  },
  sanu: {
    id: 'sanu',
    name: 'Hindi Melodies',
    icon: '🎧',
    folderCandidates: [
      'Sanu Hindi Hits', 'sanu hindi hits', 'Sanu Hindi Hit', 'sanu hindi hit',
      'Sanu_Hindi_Hits', 'sanu_hindi_hits', 'Sanu_Hindi_Hit', 'sanu_hindi_hit',
      'SanuHindiHits', 'SanuHindiHit', 'Kumar Sanu', 'kumar sanu',
      'Sanu', 'sanu'
    ],
    defaultArtist: 'Kumar Sanu',
    category: 'Hindi Melodies'
  },
  jaybangla: {
    id: 'jaybangla',
    name: 'Rewind 2000s',
    icon: '🎵',
    folderCandidates: [
      'jay bangla', 'Jay Bangla', 'jay_bangla', 'Jay_Bangla',
      'jaybangla', 'music', 'ahirani', 'songs', 'Ahirani', 'Music'
    ],
    defaultArtist: 'বাংলা সঙ্গীত',
    category: 'Rewind 2000s'
  }
};

const initialPlaylist = defaultPlaylists.ahirani;

/* --------------------------------------------------------------------------
   8. Music Player Core Engine (Firebase Cloud Storage MP3 Streaming)
   -------------------------------------------------------------------------- */
let isShuffleOn = false;

class MiniMusicPlayer {
  constructor(songList = initialPlaylist) {
    this.isLoadingPlaylist = {
      arjit: false,
      sanu: false,
      jaybangla: false
    };

    // Instant zero-delay load from localStorage cache if available
    const cachedArjit = this.loadCachedPlaylist('arjit');
    const cachedSanu = this.loadCachedPlaylist('sanu');
    const cachedJayBangla = this.loadCachedPlaylist('jaybangla') || this.loadCachedPlaylist('ahirani');

    this.playlists = {
      arjit: (cachedArjit && cachedArjit.length > 0) ? cachedArjit : [],
      sanu: (cachedSanu && cachedSanu.length > 0) ? cachedSanu : [],
      jaybangla: (cachedJayBangla && cachedJayBangla.length > 0) ? cachedJayBangla : [...defaultPlaylists.ahirani]
    };

    this.currentPlaylistId = localStorage.getItem('kj_active_playlist') || 'arjit';
    if (!this.playlists[this.currentPlaylistId]) {
      this.currentPlaylistId = 'arjit';
    }

    this.playlist = [...(this.playlists[this.currentPlaylistId] || [])];
    this.currentIndex = 0;
    this.isPlaying = false;
    this.isMuted = false;
    this.isShuffleOn = isShuffleOn;
    this.volume = parseFloat(localStorage.getItem('kj_volume') || '0.85');

    // DOM References
    this.audio = document.getElementById('audioElement');
    this.playBtn = document.getElementById('playBtn');
    this.playIcon = document.getElementById('playIcon');
    this.pauseIcon = document.getElementById('pauseIcon');
    this.prevBtn = document.getElementById('prevBtn');
    this.nextBtn = document.getElementById('nextBtn');
    this.shuffleBtn = document.getElementById('shuffleBtn');
    this.playerPlaylistBtn = document.getElementById('playerPlaylistBtn');
    
    this.trackTitle = document.getElementById('trackTitle');
    this.trackArtist = document.getElementById('trackArtist') || document.getElementById('playerCategoryElement');
    this.playerCategoryElement = this.trackArtist;
    this.trackCoverImg = document.getElementById('trackCoverImg');
    this.miniSoundwave = document.getElementById('miniSoundwave');

    // Scrubber
    this.progressBarWrapper = document.getElementById('progressBarWrapper');
    this.progressSlider = document.getElementById('progressSlider');
    this.progressFill = document.getElementById('progressFill');
    this.progressBuffered = document.getElementById('progressBuffered');
    this.currentTimeEl = document.getElementById('currentTime');
    this.totalDurationEl = document.getElementById('totalDuration');
    this.scrubTooltip = document.getElementById('scrubTooltip');
    this.isDragging = false;

    // Volume
    this.volumeBtn = document.getElementById('volumeBtn');
    this.volumeIcon = document.getElementById('volumeIcon');
    this.volumeSlider = document.getElementById('volumeSlider');

    // Playlist Modal / Drawer References
    this.playerBar = document.getElementById('playerBar');
    this.trackInfoSection = document.getElementById('trackInfoSection') || document.querySelector('.track-info-section');
    this.playlistToggleBtn = document.getElementById('playlistToggleBtn');
    this.playlistModalBackdrop = document.getElementById('playlistModalBackdrop');
    this.playlistDrawer = document.getElementById('playlistDrawer');
    this.playlistCloseBtn = document.getElementById('playlistCloseBtn');
    this.playlistCountBadge = document.getElementById('playlistCountBadge');
    this.playlistSearchInput = document.getElementById('playlistSearchInput');
    this.playlistSearchClear = document.getElementById('playlistSearchClear');
    this.playlistItemsContainer = document.getElementById('playlistItemsContainer');
    this.isPlaylistOpen = false;
    this.isRevertingHistory = false;

    this.init();
  }

  /**
   * Loads cached playlist from localStorage for 0ms instant display
   */
  loadCachedPlaylist(playlistId = 'arjit') {
    try {
      const raw = localStorage.getItem(`kj_cached_playlist_${playlistId}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.tracks) && parsed.tracks.length > 0) {
        return parsed.tracks;
      }
    } catch (e) {
      console.warn(`Cache read notice for ${playlistId}:`, e);
    }
    return null;
  }

  /**
   * Saves playlist metadata and pre-resolved download URLs to localStorage
   */
  saveCachedPlaylist(playlistId = 'arjit', tracks) {
    if (!Array.isArray(tracks) || tracks.length === 0) return;
    try {
      const config = PLAYLIST_CONFIG[playlistId] || PLAYLIST_CONFIG.arjit;
      const serializableTracks = tracks.map(t => ({
        id: t.id,
        title: t.title,
        singer: t.singer || t.artist || t.vocals || config.defaultArtist,
        artist: t.artist || t.singer || config.defaultArtist,
        vocals: t.vocals || t.singer || config.defaultArtist,
        singerName: t.singerName || t.singer || config.defaultArtist,
        artistName: t.artistName || t.artist || config.defaultArtist,
        category: t.category || config.category,
        filename: t.filename,
        storagePath: t.storagePath || (t.itemRef ? t.itemRef.fullPath : ''),
        audioUrl: t.audioUrl || null,
        duration: t.duration || '--:--',
        cover: t.cover || 'assets/images/vinyl-record.svg',
        isFirebaseStorage: true
      }));

      localStorage.setItem(`kj_cached_playlist_${playlistId}`, JSON.stringify({
        timestamp: Date.now(),
        tracks: serializableTracks
      }));
    } catch (e) {
      console.warn(`Cache save notice for ${playlistId}:`, e);
    }
  }

  applyPlaylistVisuals(playlistId = 'arjit') {
    const config = PLAYLIST_CONFIG[playlistId] || PLAYLIST_CONFIG.arjit;
    const labelEl = document.getElementById('playlistCurrentLabel');
    const iconEl = document.getElementById('currentPlaylistIcon');
    if (labelEl) {
      labelEl.textContent = config.name;
    }
    if (iconEl) {
      iconEl.textContent = config.icon;
    }

    document.querySelectorAll('.playlist-option-item').forEach(btn => {
      const isMatch = btn.getAttribute('data-playlist') === playlistId;
      btn.classList.toggle('active', isMatch);
      btn.setAttribute('aria-selected', isMatch ? 'true' : 'false');
    });
  }

  async switchPlaylist(playlistId, autoPlay = false) {
    if (!PLAYLIST_CONFIG[playlistId]) return;
    if (!this.playlists[playlistId]) this.playlists[playlistId] = [];

    this.currentPlaylistId = playlistId;
    localStorage.setItem('kj_active_playlist', playlistId);

    // Stop current playback when switching playlists unless explicitly requested
    if (!autoPlay && this.audio) {
      this.audio.pause();
      this.setPlayState(false);
    }

    // Apply visual topbar label immediately
    this.applyPlaylistVisuals(playlistId);

    // Close Dropdown
    const dropdown = document.getElementById('playlistDropdownMenu');
    const wrapper = document.getElementById('playlistSelectorWrapper');
    const selectBtn = document.getElementById('playlistSelectBtn');
    if (dropdown) dropdown.style.display = 'none';
    if (wrapper) wrapper.classList.remove('open');
    if (selectBtn) selectBtn.setAttribute('aria-expanded', 'false');

    // Switch active tracks list
    this.playlist = [...(this.playlists[playlistId] || [])];
    this.currentIndex = 0;
    this.updatePlaylistCountBadge();

    if (this.isPlaylistOpen) {
      this.renderPlaylistItems(this.playlistSearchInput ? this.playlistSearchInput.value : '');
    }

    if (this.playlist.length > 0) {
      await this.loadTrack(this.currentIndex, autoPlay);
    } else {
      const config = PLAYLIST_CONFIG[playlistId];
      if (this.trackTitle) this.trackTitle.textContent = `${config.name} লোড হচ্ছে...`;
      if (this.trackArtist) this.trackArtist.textContent = config.defaultArtist;
      if (this.totalDurationEl) this.totalDurationEl.textContent = '--:--';
    }

    // Always fetch fresh tracks from Firebase Storage
    await this.loadFromFirebaseStorage(playlistId);

    if (this.playlist.length > 0 && (!this.audio.src || (this.trackTitle && this.trackTitle.textContent.includes('লোড')))) {
      await this.loadTrack(this.currentIndex, autoPlay);
    }
  }

  init() {
    if (this.volumeSlider) this.volumeSlider.value = this.volume;
    this.updateVolumeIcon();

    try {
      isShuffleOn = localStorage.getItem('kj_shuffle') === '1';
      this.isShuffleOn = isShuffleOn;
    } catch (e) {}
    this.updateShuffleUI();

    // Apply saved playlist visuals (topbar label & icon)
    this.applyPlaylistVisuals(this.currentPlaylistId);

    // Pick a random starting song index if playlist is available
    if (this.playlist && this.playlist.length > 0) {
      this.currentIndex = Math.floor(Math.random() * this.playlist.length);
    } else {
      this.currentIndex = 0;
    }

    this.loadTrack(this.currentIndex, false);
    this.bindEvents();
    this.updatePlaylistCountBadge();

    // Fetch Firebase Cloud Storage audio files dynamically for all 3 playlists
    this.loadFromFirebaseStorage('arjit');
    this.loadFromFirebaseStorage('sanu');
    this.loadFromFirebaseStorage('jaybangla');
  }

  toggleShuffle() {
    isShuffleOn = !isShuffleOn;
    this.isShuffleOn = isShuffleOn;
    try {
      localStorage.setItem('kj_shuffle', isShuffleOn ? '1' : '0');
    } catch (e) {}
    this.updateShuffleUI();
  }

  updateShuffleUI() {
    if (this.shuffleBtn) {
      if (isShuffleOn) {
        this.shuffleBtn.classList.add('active');
        this.shuffleBtn.setAttribute('aria-pressed', 'true');
        this.shuffleBtn.title = 'Shuffle: ON (S)';
      } else {
        this.shuffleBtn.classList.remove('active');
        this.shuffleBtn.setAttribute('aria-pressed', 'false');
        this.shuffleBtn.title = 'Shuffle: OFF (S)';
      }
    }
  }

  /**
   * Intelligently parses MP3 filenames into clean Title, Singer, Artist, Vocals and Category
   */
  parseSongMetadata(filename, index, playlistId = 'arjit') {
    const config = PLAYLIST_CONFIG[playlistId] || PLAYLIST_CONFIG.arjit;

    if (!filename) {
      return {
        id: `storage_track_${playlistId}_${index + 1}`,
        title: `গান নং ${index + 1}`,
        singer: config.defaultArtist,
        artist: config.defaultArtist,
        vocals: config.defaultArtist,
        singerName: config.defaultArtist,
        artistName: config.defaultArtist,
        category: config.category,
        filename: filename || '',
        itemRef: null,
        audioUrl: null,
        isFirebaseStorage: true,
        duration: '--:--',
        cover: 'assets/images/vinyl-record.svg'
      };
    }

    let cleanName = filename.replace(/\.(mp3|wav|m4a|aac|ogg|flac)$/i, '').trim();
    cleanName = cleanName.replace(/^[0-9]+[\.\-\_\s]+/, '').trim();
    cleanName = cleanName.replace(/[_\-]+/g, ' ').replace(/\s+/g, ' ').trim();

    let recognizedSinger = extractSingerKeyword(cleanName) || extractSingerKeyword(filename);
    let title = cleanName;
    let singer = recognizedSinger || config.defaultArtist;
    let category = config.category;

    if (cleanName.includes(' - ')) {
      const parts = cleanName.split(' - ');
      if (parts.length >= 2) {
        const potentialSinger = parts[0].trim();
        const potentialTitle = parts.slice(1).join(' - ').trim();
        if (extractSingerKeyword(potentialSinger)) {
          singer = potentialSinger;
          title = potentialTitle;
        } else {
          title = potentialTitle || potentialSinger;
          singer = recognizedSinger || potentialSinger;
        }
      }
    }

    if (playlistId === 'arjit') {
      singer = 'Arijit Singh';
      category = 'Arjit Bangla Hit';
    } else if (playlistId === 'sanu') {
      singer = 'Kumar Sanu';
      category = 'Sanu Hindi Hits';
    }

    return {
      id: `storage_track_${playlistId}_${index + 1}_${encodeURIComponent(filename.substring(0, 16))}`,
      title: title,
      singer: singer || config.defaultArtist,
      artist: singer || config.defaultArtist,
      vocals: singer || config.defaultArtist,
      singerName: singer || config.defaultArtist,
      artistName: singer || config.defaultArtist,
      category: category,
      filename: filename,
      itemRef: null,
      audioUrl: null,
      isFirebaseStorage: true,
      duration: '--:--',
      cover: 'assets/images/vinyl-record.svg'
    };
  }

  /**
   * Connects to Firebase Cloud Storage and loads all MP3 tracks dynamically with Promise.all and local caching
   */
  async loadFromFirebaseStorage(targetPlaylist = null) {
    if (typeof firebase === 'undefined' || !firebase.storage) {
      console.info('ℹ️ Firebase Storage SDK not active.');
      return;
    }

    const playlistId = targetPlaylist || this.currentPlaylistId || 'arjit';
    const config = PLAYLIST_CONFIG[playlistId] || PLAYLIST_CONFIG.arjit;
    this.isLoadingPlaylist[playlistId] = true;

    // If viewing an empty playlist in drawer, immediately render skeleton state
    if (this.isPlaylistOpen && this.currentPlaylistId === playlistId && (!this.playlist || this.playlist.length === 0)) {
      this.renderPlaylistItems();
    }

    let folderNames = [...config.folderCandidates];

    try {
      if (!firebase.apps || !firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
      }

      const storage = firebase.storage();

      // Dynamic folder prefix discovery from root storage bucket
      try {
        const rootRef = storage.ref();
        const rootResult = await rootRef.listAll();
        if (rootResult && rootResult.prefixes && rootResult.prefixes.length > 0) {
          const discoveredFolders = [];
          rootResult.prefixes.forEach((p) => {
            const pName = p.name;
            const pLower = pName.toLowerCase().replace(/[\s\-_]/g, '');
            if (playlistId === 'arjit' && (pLower.includes('arjit') || pLower.includes('arijit'))) {
              discoveredFolders.push(pName);
            } else if (playlistId === 'sanu' && (pLower.includes('sanu') || pLower.includes('kumar'))) {
              discoveredFolders.push(pName);
            } else if (playlistId === 'jaybangla') {
              if (pLower.includes('jay') || pLower === 'jaybangla' || pLower === 'ahirani' || (pLower.includes('bangla') && !pLower.includes('arjit') && !pLower.includes('arijit'))) {
                discoveredFolders.push(pName);
              }
            }
          });
          if (discoveredFolders.length > 0) {
            folderNames = [...new Set([...discoveredFolders, ...folderNames])];
          }
        }
      } catch (rootErr) {
        // Root listAll error (permissions), fallback to candidate list
      }

      for (const folder of folderNames) {
        try {
          const folderRef = storage.ref().child(folder);
          const listResult = await folderRef.listAll();

          if (listResult && listResult.items && listResult.items.length > 0) {
            const audioItems = listResult.items.filter(item => {
              const lower = item.name.toLowerCase();
              return lower.endsWith('.mp3') || lower.endsWith('.wav') || lower.endsWith('.m4a') || lower.endsWith('.aac') || lower.endsWith('.ogg') || lower.endsWith('.flac') || !lower.includes('.');
            });

            // Concurrent URL resolution for all tracks using Promise.all()
            const storageTracks = await Promise.all(audioItems.map(async (item, i) => {
              const name = item.name;
              const parsed = this.parseSongMetadata(name, i, playlistId);
              parsed.itemRef = item;
              parsed.storagePath = item.fullPath;
              parsed.cover = 'assets/images/jay-bangla-bg.png';
              parsed.category = config.category;

              // Direct Google Cloud CDN media URL (0ms latency)
              const fullStoragePath = item.fullPath || `${folder}/${name}`;
              parsed.storagePath = fullStoragePath;
              parsed.audioUrl = `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/${encodeURIComponent(fullStoragePath)}?alt=media`;

              return parsed;
            }));

            if (storageTracks.length > 0) {
              storageTracks.sort((a, b) => a.filename.localeCompare(b.filename, undefined, { numeric: true, sensitivity: 'base' }));
              console.log(`🎶 Firebase Cloud Storage: Concurrently loaded ${storageTracks.length} tracks from "${folder}/" for playlist [${playlistId}].`);
              
              this.playlists[playlistId] = storageTracks;
              this.saveCachedPlaylist(playlistId, storageTracks);
              if (playlistId === 'jaybangla') {
                this.saveCachedPlaylist('ahirani', storageTracks);
              }
              this.isLoadingPlaylist[playlistId] = false;

              if (this.currentPlaylistId === playlistId) {
                this.playlist = storageTracks;
                this.updatePlaylistCountBadge();

                if (this.isPlaylistOpen) {
                  this.renderPlaylistItems(this.playlistSearchInput ? this.playlistSearchInput.value : '');
                }

                // If current song is not playing, or is empty/loading, load track 0
                const curSong = this.playlist[this.currentIndex];
                const needsLoad = !this.isPlaying || 
                                  !this.audio.src || 
                                  this.audio.src.includes('blob:null') || 
                                  (this.trackTitle && this.trackTitle.textContent.includes('লোড'));
                
                if (needsLoad && this.playlist.length > 0) {
                  if (this.currentIndex >= this.playlist.length || this.currentIndex < 0) {
                    this.currentIndex = Math.floor(Math.random() * this.playlist.length);
                  }
                  await this.loadTrack(this.currentIndex, false);
                }
              }
              return; // Found tracks, exit folder search
            }
          }
        } catch (fErr) {
          if (fErr.code === 'storage/unauthorized') {
            console.warn(`⚠️ Firebase Storage Security Rule Notice for [${folder}]: Please set Firebase Storage rules to allow read on /{allPaths=**}.`, fErr.message);
          }
        }
      }

      // Fallback for jaybangla if no remote files returned
      if (playlistId === 'jaybangla' && (!this.playlists.jaybangla || this.playlists.jaybangla.length === 0)) {
        const fallback = defaultPlaylists.jaybangla || defaultPlaylists.ahirani;
        if (fallback && fallback.length > 0) {
          this.playlists.jaybangla = [...fallback];
          if (this.currentPlaylistId === 'jaybangla') {
            this.playlist = [...fallback];
            this.updatePlaylistCountBadge();
            if (this.isPlaylistOpen) {
              this.renderPlaylistItems(this.playlistSearchInput ? this.playlistSearchInput.value : '');
            }
          }
        }
      }
    } catch (err) {
      console.warn('Firebase Storage connection note:', err);
    } finally {
      this.isLoadingPlaylist[playlistId] = false;
      if (this.isPlaylistOpen && this.currentPlaylistId === playlistId && (!this.playlist || this.playlist.length === 0)) {
        this.renderPlaylistItems(this.playlistSearchInput ? this.playlistSearchInput.value : '');
      }
    }
  }

  /**
   * Prefetches download URL for smooth instantaneous track transitions
   */
  prefetchDownloadUrl(index) {
    if (index < 0 || index >= this.playlist.length) return;
    const track = this.playlist[index];
    if (track && track.isFirebaseStorage && !track.audioUrl && track.itemRef) {
      track.itemRef.getDownloadURL()
        .then((url) => { track.audioUrl = url; })
        .catch(() => {});
    }
  }

  async loadTrack(index, autoPlay = true) {
    if (index < 0 || index >= this.playlist.length) return;
    this.currentIndex = index;
    const currentSong = this.playlist[this.currentIndex];

    // 1. Resolve Song Title
    const titleText = currentSong.title || currentSong.songName || currentSong.name || currentSong.filename || 'বাংলা গান';
    if (this.trackTitle) {
      this.trackTitle.textContent = titleText;
    }

    // 2. Extract singer dynamically from all possible properties
    let actualSinger = currentSong.singer || 
                       currentSong.artist || 
                       currentSong.vocals || 
                       currentSong.singerName || 
                       currentSong.artistName || 
                       currentSong.creator || 
                       currentSong.author;

    // 3. Check customMetadata if present
    if (!actualSinger && currentSong.customMetadata) {
      actualSinger = currentSong.customMetadata.singer || 
                     currentSong.customMetadata.artist || 
                     currentSong.customMetadata.vocals;
    }

    // 4. Keyword Fallback: Extract singer name directly from song title / filename
    if (!actualSinger || actualSinger === 'खान्देशी कलाकार' || actualSinger === 'अहिराणी खजिना' || actualSinger === 'বাংলা সঙ্গীত') {
      const keywordExtracted = extractSingerKeyword(currentSong.filename || '') || 
                               extractSingerKeyword(titleText) || 
                               extractSingerKeyword(currentSong.title || '');
      if (keywordExtracted) {
        actualSinger = keywordExtracted;
        currentSong.singer = keywordExtracted;
        currentSong.artist = keywordExtracted;
        currentSong.vocals = keywordExtracted;
      }
    }

    // Final fallback if no singer could be extracted
    if (!actualSinger || actualSinger === 'खान्देशी कलाकार') {
      actualSinger = 'বাংলা সঙ্গীত';
    }

    // 5. Display only currentSong singer name (no category)
    const singerDisplay = actualSinger;

    if (this.playerCategoryElement) {
      this.playerCategoryElement.innerText = singerDisplay;
    }
    if (this.trackArtist && this.trackArtist !== this.playerCategoryElement) {
      this.trackArtist.textContent = singerDisplay;
    }

    this.currentTimeEl.textContent = '00:00';
    this.totalDurationEl.textContent = currentSong.duration || '--:--';
    this.progressFill.style.width = '0%';
    if (this.progressSlider) this.progressSlider.value = '0';
    this.isDragging = false;

    if (this.trackCoverImg) {
      const playlistCover = 'assets/images/vinyl-record.svg';
      this.trackCoverImg.src = currentSong.cover || playlistCover;
    }

    // Update Media Session Metadata
    this.updateMediaSession();

    // Fetch URL and metadata on-demand if not already pre-resolved
    if (currentSong.isFirebaseStorage) {
      if (!currentSong.audioUrl) {
        if (currentSong.itemRef) {
          try {
            currentSong.audioUrl = await currentSong.itemRef.getDownloadURL();
          } catch (err) {
            console.warn(`Failed to fetch audio stream for ${currentSong.filename}:`, err);
            return;
          }
        } else if (currentSong.storagePath && typeof firebase !== 'undefined' && firebase.storage) {
          try {
            currentSong.audioUrl = await firebase.storage().ref(currentSong.storagePath).getDownloadURL();
          } catch (err) {
            console.warn(`Failed to fetch audio stream for ${currentSong.storagePath}:`, err);
          }
        }
      }

      // Read customMetadata attached in Firebase Storage if any
      if (!currentSong._metadataFetched && currentSong.itemRef) {
        currentSong._metadataFetched = true;
        currentSong.itemRef.getMetadata().then((meta) => {
          if (meta && meta.customMetadata) {
            const metaSinger = meta.customMetadata.singer || meta.customMetadata.artist || meta.customMetadata.vocals;
            const metaTitle = meta.customMetadata.title || meta.customMetadata.song;
            let updated = false;

            if (metaSinger && metaSinger !== currentSong.singer) {
              currentSong.singer = metaSinger;
              currentSong.artist = metaSinger;
              currentSong.vocals = metaSinger;
              updated = true;
            }
            if (metaTitle && metaTitle !== currentSong.title) {
              currentSong.title = metaTitle;
              if (this.trackTitle) this.trackTitle.textContent = metaTitle;
            }
            if (updated && this.playerCategoryElement) {
              this.playerCategoryElement.innerText = currentSong.singer || 'বাংলা সঙ্গীত';
            }
          }
        }).catch(() => {});
      }
    }

    // 3. Prefetch next track download URL in background
    const nextIdx = (this.currentIndex + 1) % this.playlist.length;
    this.prefetchDownloadUrl(nextIdx);

    // 4. Synchronize playlist item active state
    this.highlightActivePlaylistItem();

    // 5. Stream audio on demand with safe onloadedmetadata wrapping
    const directAudio = currentSong.audioUrl || currentSong.url;
    if (directAudio) {
      this.audio.src = directAudio;
      this.audio.loop = false;

      // Safe onloadedmetadata listener before updating durations
      this.audio.onloadedmetadata = () => {
        if (this.audio.duration && !isNaN(this.audio.duration)) {
          currentSong.duration = this.formatTime(this.audio.duration);
          this.totalDurationEl.textContent = currentSong.duration;
          this.syncMediaSessionPositionState();
        }
      };

      this.audio.load();
      if (autoPlay) {
        this.playAudio();
      }
    }
  }

  updateMediaSession() {
    if (!('mediaSession' in navigator)) return;

    const currentSong = this.playlist[this.currentIndex];
    if (!currentSong) return;

    try {
      const artworkSrc = currentSong.cover || 'assets/images/vinyl-record.svg';
      const absoluteArtwork = artworkSrc.startsWith('http')
        ? artworkSrc
        : new URL(artworkSrc, window.location.href).href;

      const singerName = currentSong.singer || currentSong.artist || currentSong.vocals || 'বাংলা সঙ্গীত';

      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentSong.title,
        artist: singerName,
        album: 'জয় বাংলা',
        artwork: [
          { src: absoluteArtwork, sizes: '96x96', type: 'image/jpeg' },
          { src: absoluteArtwork, sizes: '128x128', type: 'image/jpeg' },
          { src: absoluteArtwork, sizes: '192x192', type: 'image/jpeg' },
          { src: absoluteArtwork, sizes: '256x256', type: 'image/jpeg' },
          { src: absoluteArtwork, sizes: '384x384', type: 'image/jpeg' },
          { src: absoluteArtwork, sizes: '512x512', type: 'image/jpeg' }
        ]
      });

      this.syncMediaSessionPositionState();
    } catch (e) {
      console.warn('Error updating MediaMetadata:', e);
    }
  }

  syncMediaSessionPositionState() {
    if (!('mediaSession' in navigator) || !('setPositionState' in navigator.mediaSession)) return;

    try {
      const dur = this.audio && this.audio.duration && !isNaN(this.audio.duration) ? this.audio.duration : 0;
      const pos = this.audio && this.audio.currentTime ? this.audio.currentTime : 0;

      if (dur > 0 && pos >= 0 && pos <= dur) {
        navigator.mediaSession.setPositionState({
          duration: Math.max(0, dur),
          playbackRate: this.audio.playbackRate || 1,
          position: Math.max(0, Math.min(pos, dur))
        });
      }
    } catch (e) {}
  }

  playAudio() {
    const track = this.playlist[this.currentIndex];
    if (!track) return;
    const directAudio = track.audioUrl || track.url;

    if (!this.audio.src || this.audio.src.startsWith('data:') || this.audio.src !== directAudio) {
      if (directAudio) {
        this.audio.src = directAudio;
        this.audio.loop = false;
      }
    }

    const playPromise = this.audio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          this.setPlayState(true);
          this.updateMediaSession();
          this.logSongPlay(track);
        })
        .catch(() => this.setPlayState(false));
    }
  }

  logSongPlay(track) {
    if (!track) return;
    try {
      const songTitle = track.title || 'বাংলা গান';
      const singer = track.singer || track.artist || 'বাংলা সঙ্গীত';
      const sanitizedKey = songTitle.replace(/[\.\#\$\[\]\/]/g, '_');

      // 1. Local Persistent Song Stats
      const raw = localStorage.getItem('kj_song_analytics') || '{}';
      const stats = JSON.parse(raw);
      if (!stats[sanitizedKey]) {
        stats[sanitizedKey] = { title: songTitle, singer: singer, plays: 0, lastPlayed: Date.now() };
      }
      stats[sanitizedKey].plays += 1;
      stats[sanitizedKey].lastPlayed = Date.now();
      localStorage.setItem('kj_song_analytics', JSON.stringify(stats));

      // 2. Cloud Firestore Modular v10+ Analytics (increment(1))
      if (typeof window.trackSongPlayModular === 'function') {
        window.trackSongPlayModular(songTitle, singer);
      }
      if (typeof firebase !== 'undefined' && firebase.firestore) {
        try {
          const firestore = (firebase.app && typeof firebase.app().firestore === 'function')
            ? (function() { try { return firebase.app().firestore(); } catch(e) { return firebase.firestore(); } })()
            : firebase.firestore();
          const docId = songTitle.trim().replace(/[\/\\]/g, '_');
          firestore.collection('song_analytics').doc(docId).set({
            title: songTitle,
            singer: singer,
            plays: firebase.firestore.FieldValue.increment(1),
            last_played: firebase.firestore.FieldValue.serverTimestamp()
          }, { merge: true }).then(() => {
            console.log(`✅ [Firestore Compat] Logged song play: "${songTitle}" on database "bangla-f3985"`);
          }).catch((e) => console.info('Firestore song_analytics notice:', e.message));
        } catch (e) {}
      }

      // 3. Firebase Realtime Database
      if (typeof firebase !== 'undefined' && firebase.database) {
        const db = firebase.database();
        db.ref(`analytics/song_plays/${sanitizedKey}`).transaction((curr) => {
          if (!curr) {
            return { title: songTitle, singer: singer, plays: 1, lastPlayed: firebase.database.ServerValue.TIMESTAMP };
          }
          return {
            title: songTitle,
            singer: singer,
            plays: (curr.plays || 0) + 1,
            lastPlayed: firebase.database.ServerValue.TIMESTAMP
          };
        });
        db.ref('analytics/total_streams').transaction((curr) => (curr || 0) + 1);
      }
    } catch (e) {
      console.debug('Song play logging notice:', e);
    }
  }

  pauseAudio() {
    try {
      this.audio.pause();
    } catch (e) {}
    this.setPlayState(false);
  }

  togglePlay() {
    if (this.isPlaying) {
      this.pauseAudio();
    } else {
      this.playAudio();
    }
  }

  setPlayState(playing) {
    this.isPlaying = playing;
    const trackThumb = document.getElementById('trackThumb');
    const playerContainer = document.querySelector('.player-container');
    if (playing) {
      this.playIcon.style.display = 'none';
      this.pauseIcon.style.display = 'block';
      this.playBtn.classList.add('playing');
      if (this.miniSoundwave) this.miniSoundwave.classList.add('active');
      if (trackThumb) trackThumb.classList.add('spinning');
      if (playerContainer) playerContainer.classList.add('is-playing');
    } else {
      this.playIcon.style.display = 'block';
      this.pauseIcon.style.display = 'none';
      this.playBtn.classList.remove('playing');
      if (this.miniSoundwave) this.miniSoundwave.classList.remove('active');
      if (trackThumb) trackThumb.classList.remove('spinning');
      if (playerContainer) playerContainer.classList.remove('is-playing');
    }

    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
    }
    this.syncMediaSessionPositionState();
    this.highlightActivePlaylistItem();
  }

  prevTrack() {
    if (!this.playlist || this.playlist.length === 0) return;

    let nextIndex;
    if (isShuffleOn) {
      if (this.playlist.length === 1) {
        nextIndex = 0;
      } else {
        do {
          nextIndex = Math.floor(Math.random() * this.playlist.length);
        } while (nextIndex === this.currentIndex && this.playlist.length > 1);
      }
    } else {
      nextIndex = this.currentIndex - 1;
      if (nextIndex < 0) {
        nextIndex = this.playlist.length - 1;
      }
    }
    this.loadTrack(nextIndex, true);
  }

  nextTrack() {
    if (!this.playlist || this.playlist.length === 0) return;

    let nextIndex;
    if (isShuffleOn) {
      if (this.playlist.length === 1) {
        nextIndex = 0;
      } else {
        do {
          nextIndex = Math.floor(Math.random() * this.playlist.length);
        } while (nextIndex === this.currentIndex && this.playlist.length > 1);
      }
    } else {
      nextIndex = this.currentIndex + 1;
      if (nextIndex >= this.playlist.length) {
        nextIndex = 0;
      }
    }
    this.loadTrack(nextIndex, true);
  }

  updateProgress(currentTime, duration) {
    if (this.isDragging) return;
    if (!duration || isNaN(duration) || duration <= 0) return;
    const percent = Math.min(100, Math.max(0, (currentTime / duration) * 100));
    this.progressFill.style.width = `${percent}%`;
    if (this.progressSlider) {
      this.progressSlider.value = percent;
    }
    this.currentTimeEl.textContent = this.formatTime(currentTime);
    this.totalDurationEl.textContent = this.formatTime(duration);
  }

  seekToPercent(percent) {
    if (this.audio.duration && !isNaN(this.audio.duration)) {
      this.audio.currentTime = (percent / 100) * this.audio.duration;
    }
    this.syncMediaSessionPositionState();
  }

  seekRelative(seconds) {
    if (this.audio.duration && !isNaN(this.audio.duration)) {
      const target = Math.max(0, Math.min(this.audio.currentTime + seconds, this.audio.duration));
      this.audio.currentTime = target;
    }
    this.syncMediaSessionPositionState();
  }

  seekToTime(seconds) {
    if (this.audio.duration && !isNaN(this.audio.duration)) {
      const target = Math.max(0, Math.min(seconds, this.audio.duration));
      this.audio.currentTime = target;
    }
    this.syncMediaSessionPositionState();
  }

  setVolume(val) {
    this.volume = Math.max(0, Math.min(1, val));
    this.audio.volume = this.volume;
    if (this.volumeSlider) this.volumeSlider.value = this.volume;
    localStorage.setItem('kj_volume', this.volume);

    this.isMuted = this.volume === 0;
    this.updateVolumeIcon();
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.audio.muted = true;
      if (this.volumeSlider) this.volumeSlider.value = 0;
    } else {
      this.audio.muted = false;
      if (this.volumeSlider) this.volumeSlider.value = this.volume;
    }
    this.updateVolumeIcon();
  }

  updateVolumeIcon() {
    if (!this.volumeIcon) return;
    if (this.isMuted || this.volume === 0) {
      this.volumeIcon.innerHTML = `
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
        <line x1="23" y1="9" x2="17" y2="15"></line>
        <line x1="17" y1="9" x2="23" y2="15"></line>
      `;
    } else if (this.volume < 0.5) {
      this.volumeIcon.innerHTML = `
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
      `;
    } else {
      this.volumeIcon.innerHTML = `
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
      `;
    }
  }

  formatTime(secs) {
    if (isNaN(secs) || secs < 0) return '00:00';
    const minutes = Math.floor(secs / 60);
    const remainingSeconds = Math.floor(secs % 60);
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  }

  /**
   * Updates total songs count in the playlist drawer header badge
   */
  updatePlaylistCountBadge() {
    if (this.playlistCountBadge) {
      this.playlistCountBadge.textContent = `${this.playlist.length}টি গান`;
    }
  }

  /**
   * Opens the glassmorphic playlist drawer
   */
  openPlaylist() {
    if (!this.playlistModalBackdrop) return;
    if (this.isPlaylistOpen) return;

    this.isPlaylistOpen = true;
    this.playlistModalBackdrop.classList.add('open');
    this.playlistModalBackdrop.setAttribute('aria-hidden', 'false');
    this.updatePlaylistCountBadge();
    this.renderPlaylistItems(this.playlistSearchInput ? this.playlistSearchInput.value : '');

    // 1. Push history state so device/browser physical back button closes the overlay
    try {
      if (!history.state || !history.state.playlistOpen) {
        history.pushState({ playlistOpen: true }, '');
      }
    } catch (e) {
      console.warn('History pushState notice:', e);
    }

    // Auto-scroll active track into view
    setTimeout(() => {
      const activeElem = this.playlistItemsContainer?.querySelector('.playlist-item.active');
      if (activeElem) {
        activeElem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }, 100);
  }

  /**
   * Closes the playlist drawer
   * @param {boolean} fromPopState - True if triggered by browser back button (popstate event)
   */
  closePlaylist(fromPopState = false) {
    if (!this.playlistModalBackdrop) return;
    if (!this.isPlaylistOpen && !this.playlistModalBackdrop.classList.contains('open')) return;

    this.isPlaylistOpen = false;
    this.playlistModalBackdrop.classList.remove('open');
    this.playlistModalBackdrop.setAttribute('aria-hidden', 'true');

    // 3. If closed using UI close icon/backdrop/esc, revert history state cleanly without double-navigation
    if (!fromPopState) {
      try {
        if (history.state && history.state.playlistOpen) {
          this.isRevertingHistory = true;
          history.back();
        }
      } catch (e) {
        console.warn('History back notice:', e);
      }
    }
  }

  /**
   * Toggles the playlist drawer open/closed state
   */
  togglePlaylist() {
    if (this.isPlaylistOpen) {
      this.closePlaylist();
    } else {
      this.openPlaylist();
    }
  }

  /**
   * Renders the playlist track list with optional search query filter
   */
  renderPlaylistItems(filterQuery = '') {
    if (!this.playlistItemsContainer) return;

    const q = filterQuery.trim().toLowerCase();

    // 1. Show smooth animated shimmer skeleton placeholders during first-time loading
    const currentLoading = this.isLoadingPlaylist ? this.isLoadingPlaylist[this.currentPlaylistId] : this.isLoading;
    if (currentLoading && (!this.playlist || this.playlist.length === 0)) {
      const currentConfig = (typeof PLAYLIST_CONFIG !== 'undefined' && PLAYLIST_CONFIG[this.currentPlaylistId]) ? PLAYLIST_CONFIG[this.currentPlaylistId] : { name: 'গান', icon: '🎶' };
      const skeletonCount = 6;
      let skeletonsHtml = '<div class="playlist-skeleton-container" aria-label="Loading tracks">';
      for (let i = 0; i < skeletonCount; i++) {
        skeletonsHtml += `
          <div class="playlist-skeleton-item" aria-hidden="true">
            <div class="skeleton-shimmer skeleton-idx"></div>
            <div class="skeleton-shimmer skeleton-thumb"></div>
            <div class="skeleton-details">
              <div class="skeleton-shimmer skeleton-title-line"></div>
              <div class="skeleton-shimmer skeleton-singer-line"></div>
            </div>
            <div class="skeleton-shimmer skeleton-play-icon"></div>
          </div>
        `;
      }
      skeletonsHtml += `
        <div style="text-align: center; padding: 0.8rem 0.5rem 0.3rem;">
          <p style="font-size: 0.84rem; color: var(--gold-300); font-weight: 600;">
            ${currentConfig.icon || '🎶'} ${currentConfig.name} লোড হচ্ছে...
          </p>
          <p style="font-size: 0.72rem; opacity: 0.7; margin-top: 2px;">Firebase Cloud Storage থেকে গান সংযুক্ত হচ্ছে</p>
        </div>
      </div>`;
      this.playlistItemsContainer.innerHTML = skeletonsHtml;
      return;
    }

    const filtered = this.playlist.map((track, originalIndex) => ({
      ...track,
      originalIndex
    })).filter((item) => {
      if (!q) return true;
      const matchTitle = (item.title || '').toLowerCase().includes(q);
      const matchSinger = (item.singer || item.artist || item.vocals || '').toLowerCase().includes(q);
      const matchFile = (item.filename || '').toLowerCase().includes(q);
      return matchTitle || matchSinger || matchFile;
    });

    if (filtered.length === 0) {
      this.playlistItemsContainer.innerHTML = `
        <div class="playlist-empty-state" style="padding: 2.5rem 1rem; text-align: center;">
          <p style="font-size: 1.6rem; margin-bottom: 0.5rem;">🔍</p>
          <p style="font-weight: 700; color: var(--gold-200); font-size: 0.92rem;">কোনো গান পাওয়া যায়নি</p>
          <p style="font-size: 0.76rem; opacity: 0.75; margin-top: 0.35rem;">অনুগ্রহ করে অনুসন্ধানের শব্দটি পরীক্ষা করুন</p>
        </div>
      `;
      return;
    }

    const PLAY_ICON_SVG = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"></polygon></svg>`;
    const PAUSE_ICON_SVG = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"></rect><rect x="14" y="4" width="4" height="16" rx="1"></rect></svg>`;

    const songsHtml = filtered.map((item) => {
      const isActive = item.originalIndex === this.currentIndex;
      const isItemPlaying = isActive && this.isPlaying;
      const singerName = item.singer || item.artist || item.vocals || 'বাংলা সঙ্গীত';
      const coverImg = item.cover || 'assets/images/vinyl-record.svg';
      const actionIconSvg = isItemPlaying ? PAUSE_ICON_SVG : PLAY_ICON_SVG;

      return `
        <div class="playlist-item ${isActive ? 'active' : ''} ${isItemPlaying ? 'item-playing' : ''}" data-index="${item.originalIndex}" role="button" tabindex="0" aria-label="${item.title}">
          <div class="item-index-wrap">
            <span class="item-num">${item.originalIndex + 1}</span>
            <div class="item-playing-equalizer" aria-hidden="true">
              <span></span><span></span><span></span>
            </div>
          </div>
          <img src="${coverImg}" alt="${item.title}" class="item-thumb" loading="lazy">
          <div class="item-details">
            <span class="item-title">${item.title}</span>
            <span class="item-singer">${singerName}</span>
          </div>
          <div class="item-action-icon ${isItemPlaying ? 'playing' : ''}" aria-hidden="true">
            ${actionIconSvg}
          </div>
        </div>
      `;
    }).join('');

    this.playlistItemsContainer.innerHTML = songsHtml;

    // Attach click listeners to list items
    const items = this.playlistItemsContainer.querySelectorAll('.playlist-item');
    items.forEach((elem) => {
      elem.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(elem.getAttribute('data-index'), 10);
        if (!isNaN(idx)) {
          if (idx === this.currentIndex) {
            // Toggles play/pause state seamlessly if currently loaded song is clicked
            this.togglePlay();
          } else {
            // Immediately loads and plays the new track
            this.loadTrack(idx, true);
          }
          this.highlightActivePlaylistItem();
        }
      });
    });
  }

  /**
   * Highlights current active playing track in playlist drawer and synchronizes Play/Pause icons
   */
  highlightActivePlaylistItem() {
    if (!this.playlistItemsContainer) return;
    const PLAY_ICON_SVG = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"></polygon></svg>`;
    const PAUSE_ICON_SVG = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"></rect><rect x="14" y="4" width="4" height="16" rx="1"></rect></svg>`;

    const items = this.playlistItemsContainer.querySelectorAll('.playlist-item');
    items.forEach((elem) => {
      const idx = parseInt(elem.getAttribute('data-index'), 10);
      const actionIcon = elem.querySelector('.item-action-icon');
      const isActive = idx === this.currentIndex;
      const isItemPlaying = isActive && this.isPlaying;

      if (isActive) {
        elem.classList.add('active');
        if (this.isPlaylistOpen) {
          elem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
      } else {
        elem.classList.remove('active');
      }

      if (isItemPlaying) {
        elem.classList.add('item-playing');
      } else {
        elem.classList.remove('item-playing');
      }

      if (actionIcon) {
        if (isItemPlaying) {
          actionIcon.classList.add('playing');
          actionIcon.innerHTML = PAUSE_ICON_SVG;
        } else {
          actionIcon.classList.remove('playing');
          actionIcon.innerHTML = PLAY_ICON_SVG;
        }
      }
    });
  }

  bindEvents() {
    this.playBtn.addEventListener('click', () => this.togglePlay());
    this.prevBtn.addEventListener('click', () => this.prevTrack());
    this.nextBtn.addEventListener('click', () => this.nextTrack());
    if (this.shuffleBtn) {
      this.shuffleBtn.addEventListener('click', () => this.toggleShuffle());
    }
    if (this.volumeBtn) {
      this.volumeBtn.addEventListener('click', () => this.toggleMute());
    }

    // Open/Toggle Playlist on clicking player track info or playlist button
    if (this.trackInfoSection) {
      this.trackInfoSection.addEventListener('click', (e) => {
        e.stopPropagation();
        this.togglePlaylist();
      });
    }

    if (this.playlistToggleBtn) {
      this.playlistToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.togglePlaylist();
      });
    }

    if (this.playerPlaylistBtn) {
      this.playerPlaylistBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openPlaylist();
      });
    }

    if (this.playlistCloseBtn) {
      this.playlistCloseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.closePlaylist();
      });
    }

    if (this.playlistModalBackdrop) {
      this.playlistModalBackdrop.addEventListener('click', (e) => {
        if (e.target === this.playlistModalBackdrop) {
          this.closePlaylist();
        }
      });
    }

    if (this.playlistSearchInput) {
      this.playlistSearchInput.addEventListener('input', (e) => {
        const val = e.target.value;
        if (this.playlistSearchClear) {
          this.playlistSearchClear.style.display = val ? 'block' : 'none';
        }
        this.renderPlaylistItems(val);
      });
    }

    if (this.playlistSearchClear) {
      this.playlistSearchClear.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.playlistSearchInput) {
          this.playlistSearchInput.value = '';
          this.playlistSearchInput.focus();
        }
        this.playlistSearchClear.style.display = 'none';
        this.renderPlaylistItems('');
      });
    }

    if (this.volumeSlider) {
      this.volumeSlider.addEventListener('input', (e) => {
        this.setVolume(parseFloat(e.target.value));
      });
    }

    // HTML5 Audio events
    this.audio.addEventListener('play', () => {
      this.setPlayState(true);
      this.updateMediaSession();
    });

    this.audio.addEventListener('pause', () => {
      this.setPlayState(false);
    });

    this.audio.addEventListener('timeupdate', () => {
      this.updateProgress(this.audio.currentTime, this.audio.duration);
      this.syncMediaSessionPositionState();
    });

    this.audio.addEventListener('loadedmetadata', () => {
      if (this.audio.duration && !isNaN(this.audio.duration)) {
        this.totalDurationEl.textContent = this.formatTime(this.audio.duration);
        this.syncMediaSessionPositionState();
      }
    });

    this.audio.addEventListener('durationchange', () => {
      if (this.audio.duration && !isNaN(this.audio.duration)) {
        this.totalDurationEl.textContent = this.formatTime(this.audio.duration);
        this.syncMediaSessionPositionState();
      }
    });

    this.audio.addEventListener('ended', () => {
      this.nextTrack();
    });

    // Scrubber / Progress Range Slider (Smooth Seeking Engine)
    if (this.progressSlider) {
      // 1. input event: while dragging, smoothly update visual timestamp and progress fill
      this.progressSlider.addEventListener('input', (e) => {
        this.isDragging = true;
        if (this.progressBarWrapper) this.progressBarWrapper.classList.add('seeking');

        const percent = parseFloat(e.target.value);
        this.progressFill.style.width = `${percent}%`;

        const duration = this.audio.duration || 0;
        if (duration > 0 && !isNaN(duration)) {
          const projectedTime = (percent / 100) * duration;
          this.currentTimeEl.textContent = this.formatTime(projectedTime);

          if (this.scrubTooltip) {
            this.scrubTooltip.style.left = `${percent}%`;
            this.scrubTooltip.textContent = this.formatTime(projectedTime);
          }
        }
      });

      // 2. change event: when user releases slider thumb, calculate new time ((slider.value / 100) * audio.duration) and update audio.currentTime instantly
      this.progressSlider.addEventListener('change', (e) => {
        const percent = parseFloat(e.target.value);
        if (this.audio.duration && !isNaN(this.audio.duration)) {
          const newTime = (percent / 100) * this.audio.duration;
          this.audio.currentTime = newTime;
          this.currentTimeEl.textContent = this.formatTime(newTime);
        }
        this.isDragging = false;
        if (this.progressBarWrapper) this.progressBarWrapper.classList.remove('seeking');
        this.syncMediaSessionPositionState();
      });
    }

    if (this.progressBarWrapper) {
      this.progressBarWrapper.addEventListener('mousemove', (e) => {
        const rect = this.progressBarWrapper.getBoundingClientRect();
        const pos = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const percent = (pos / rect.width) * 100;
        if (this.scrubTooltip) {
          this.scrubTooltip.style.left = `${percent}%`;
          const duration = this.audio.duration || 0;
          this.scrubTooltip.textContent = this.formatTime((percent / 100) * duration);
        }
      });
    }

    // 2. Intercept device/browser Back button via window.onpopstate
    window.addEventListener('popstate', (e) => {
      if (this.isRevertingHistory) {
        this.isRevertingHistory = false;
        return;
      }
      if (this.isPlaylistOpen) {
        this.closePlaylist(true);
      }
    });

    // Dynamically update mobile/desktop background image on window resize
    window.addEventListener('resize', () => {
      this.applyPlaylistVisuals(this.currentPlaylistId);
    });

    // Global Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape' && this.isPlaylistOpen) {
        this.closePlaylist();
        return;
      }
      // If typing in search box, don't trigger media shortcuts
      if (document.activeElement === this.playlistSearchInput) {
        return;
      }
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          this.togglePlay();
          break;
        case 'KeyN':
          this.nextTrack();
          break;
        case 'KeyP':
          this.prevTrack();
          break;
        case 'KeyS':
          this.toggleShuffle();
          break;
        case 'KeyA':
          if (e.shiftKey || e.ctrlKey) {
            window.open('admin.html', '_blank');
          }
          break;
      }
    });

    // Media Session API registration - Lockscreen controls
    if ('mediaSession' in navigator) {
      const registerAction = (action, handler) => {
        try {
          navigator.mediaSession.setActionHandler(action, handler);
        } catch (err) {}
      };

      registerAction('play', () => this.playAudio());
      registerAction('pause', () => this.pauseAudio());
      registerAction('previoustrack', () => this.prevTrack());
      registerAction('nexttrack', () => this.nextTrack());
    }

    // Ensure audio resumes smoothly on visibility restore
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.isPlaying) {
        if (this.audio && this.audio.paused && !this.audio.ended) {
          this.audio.play().catch(() => {});
        }
        if ('mediaSession' in navigator) {
          navigator.mediaSession.playbackState = 'playing';
          this.syncMediaSessionPositionState();
        }
      }
    });
  }
}

/* --------------------------------------------------------------------------
   7. Interactive Background Click/Tap Hearts & "जय खान्देश" (Every 10 Clicks)
   -------------------------------------------------------------------------- */
function initClickHeartInteraction() {
  let clickCount = 0;
  let isTouchHandled = false;

  const handleInteraction = (clientX, clientY, target) => {
    if (!target) return;
    // Exclude clicks on player, badges, tagline, buttons, sliders, links, inputs, playlist drawer
    if (target.closest('button, input, a, .mini-player-bar, .top-badge, .player-container, .playlist-drawer, .playlist-modal-backdrop, [role="slider"], [role="region"], [role="dialog"]')) {
      return;
    }

    clickCount++;

    // 1. Create Heart Element
    const heart = document.createElement('div');
    heart.className = 'click-heart-element';
    heart.textContent = '❤️';
    heart.style.left = `${clientX}px`;
    heart.style.top = `${clientY}px`;

    const rot = (Math.random() * 26 - 13).toFixed(1);
    const driftX = (Math.random() * 32 - 16).toFixed(1);
    heart.style.setProperty('--rot', `${rot}deg`);
    heart.style.setProperty('--drift-x', `${driftX}px`);

    document.body.appendChild(heart);
    setTimeout(() => heart.remove(), 1050);

    // 2. Every 10th Click -> Special "जय खान्देश"
    if (clickCount >= 10) {
      const text = document.createElement('div');
      text.className = 'click-khandesh-text';
      text.textContent = 'জয় বাংলা';
      text.style.left = `${clientX}px`;
      text.style.top = `${clientY}px`;

      document.body.appendChild(text);
      setTimeout(() => text.remove(), 1850);

      clickCount = 0; // Reset counter for continuous 10-click cycle
    }
  };

  // Support touch & click cleanly without double counts
  window.addEventListener('touchstart', (e) => {
    if (e.touches && e.touches[0]) {
      isTouchHandled = true;
      const t = e.touches[0];
      handleInteraction(t.clientX, t.clientY, e.target);
      setTimeout(() => { isTouchHandled = false; }, 350);
    }
  }, { passive: true });

  window.addEventListener('click', (e) => {
    if (isTouchHandled) return;
    handleInteraction(e.clientX, e.clientY, e.target);
  });
}

/* --------------------------------------------------------------------------
   8. Scroll Experience & Section Reveal Observer
   -------------------------------------------------------------------------- */
function initScrollReveal() {
  const revealElements = document.querySelectorAll('[data-reveal]');
  if (!revealElements.length) return;

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
        }
      });
    }, {
      root: null,
      rootMargin: '0px 0px -40px 0px',
      threshold: 0.12
    });

    revealElements.forEach((el) => observer.observe(el));
  } else {
    // Fallback for older browsers
    revealElements.forEach((el) => el.classList.add('is-visible'));
  }
}

function initScrollIndicator() {
  const indicator = document.getElementById('scrollIndicator');
  if (!indicator) return;

  const handleScroll = () => {
    const scrollY = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    if (scrollY > 10) {
      indicator.classList.add('hidden-on-scroll');
    } else {
      indicator.classList.remove('hidden-on-scroll');
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  document.addEventListener('scroll', handleScroll, { passive: true });
  window.addEventListener('touchmove', handleScroll, { passive: true });
  handleScroll();

  indicator.addEventListener('click', (e) => {
    e.preventDefault();
    const target = document.getElementById('welcomeSection');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  });
}

/* --------------------------------------------------------------------------
   9. Fullscreen Toggle Engine (Cross-Browser Web & Mobile Fullscreen API)
   -------------------------------------------------------------------------- */
function initFullscreenToggle() {
  const fullscreenBtn = document.getElementById('fullscreenBtn');
  if (!fullscreenBtn) return;

  const iconEnter = fullscreenBtn.querySelector('.icon-enter');
  const iconExit = fullscreenBtn.querySelector('.icon-exit');
  const fullscreenText = document.getElementById('fullscreenText');

  const isFullscreen = () => {
    return !!(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.webkitCurrentFullScreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement
    );
  };

  const updateUI = () => {
    const active = isFullscreen();
    if (active) {
      if (iconEnter) iconEnter.style.display = 'none';
      if (iconExit) iconExit.style.display = 'inline-block';
      if (fullscreenText) fullscreenText.textContent = 'Exit Fullscreen';
      fullscreenBtn.setAttribute('aria-label', 'Exit Fullscreen');
      fullscreenBtn.setAttribute('title', 'Exit Fullscreen');
      fullscreenBtn.classList.add('is-fullscreen');
    } else {
      if (iconEnter) iconEnter.style.display = 'inline-block';
      if (iconExit) iconExit.style.display = 'none';
      if (fullscreenText) fullscreenText.textContent = 'Go Fullscreen';
      fullscreenBtn.setAttribute('aria-label', 'Go Fullscreen');
      fullscreenBtn.setAttribute('title', 'Go Fullscreen');
      fullscreenBtn.classList.remove('is-fullscreen');
    }
  };

  const toggleFullscreen = () => {
    const docEl = document.documentElement;

    if (!isFullscreen()) {
      if (docEl.requestFullscreen) {
        docEl.requestFullscreen().catch(() => {});
      } else if (docEl.webkitRequestFullscreen) {
        docEl.webkitRequestFullscreen();
      } else if (docEl.webkitRequestFullScreen) {
        docEl.webkitRequestFullScreen();
      } else if (docEl.mozRequestFullScreen) {
        docEl.mozRequestFullScreen();
      } else if (docEl.msRequestFullscreen) {
        docEl.msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.webkitCancelFullScreen) {
        document.webkitCancelFullScreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
  };

  fullscreenBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleFullscreen();
  });

  // Listen for fullscreen change events across standard & prefixed APIs
  const changeEvents = [
    'fullscreenchange',
    'webkitfullscreenchange',
    'mozfullscreenchange',
    'MSFullscreenChange'
  ];

  changeEvents.forEach((evt) => {
    document.addEventListener(evt, updateUI);
  });

  updateUI();
}

function initTopTitleScrollFade() {
  const title = document.getElementById('topMainTitle');
  const banner = document.getElementById('festiveAdBanner');
  if (!title && !banner) return;

  const handleScroll = () => {
    const scrollY = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    if (scrollY > 10) {
      if (title) title.classList.add('hidden-on-scroll');
      if (banner) banner.classList.add('hidden-on-scroll');
    } else {
      if (title) title.classList.remove('hidden-on-scroll');
      if (banner) banner.classList.remove('hidden-on-scroll');
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  document.addEventListener('scroll', handleScroll, { passive: true });
  window.addEventListener('touchmove', handleScroll, { passive: true });
  handleScroll();
}

function initPlayerScrollHide() {
  const playerContainer = document.getElementById('playerContainer');
  if (!playerContainer) return;

  const handleScroll = () => {
    const scrollY = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    if (scrollY > 10) {
      playerContainer.classList.add('player-hidden');
    } else {
      playerContainer.classList.remove('player-hidden');
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  document.addEventListener('scroll', handleScroll, { passive: true });
  window.addEventListener('touchmove', handleScroll, { passive: true });
  handleScroll();
}

/**
 * Firebase Realtime Database Active Users Presence Tracker & Telemetry
 * Tracks live_users/count, live_users/sessions, and analytics/page_views
 */
function initFirebaseRealtimeUserTracking() {
  if (typeof firebase === 'undefined' || !firebase.database) return;

  try {
    const db = firebase.database();
    const connectedRef = db.ref('.info/connected');
    const liveCountRef = db.ref('live_users/count');
    
    // Persistent UID per device/visitor
    let userUid = localStorage.getItem('kj_user_uid');
    if (!userUid) {
      userUid = 'user_' + Math.random().toString(36).substring(2, 10);
      localStorage.setItem('kj_user_uid', userUid);
    }
    const mySessionRef = db.ref(`live_users/sessions/${userUid}`);

    // Detect device type
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isTablet = /iPad|Tablet/i.test(navigator.userAgent);
    const deviceType = isTablet ? 'Tablet' : (isMobile ? 'Mobile' : 'Desktop');

    connectedRef.on('value', (snap) => {
      if (snap.val() === true) {
        // Register session on connect without duplicate keys
        mySessionRef.onDisconnect().remove();
        mySessionRef.set({
          uid: userUid,
          device: deviceType,
          joinedAt: firebase.database.ServerValue.TIMESTAMP,
          userAgent: (navigator.userAgent || '').substring(0, 100),
          lastActive: firebase.database.ServerValue.TIMESTAMP
        });

        // Increment live count on connection and decrement onDisconnect
        liveCountRef.transaction((curr) => (curr || 0) + 1);
        liveCountRef.onDisconnect().transaction((curr) => Math.max(0, (curr || 1) - 1));
      }
    });

    // Realtime count synchronizer
    db.ref('live_users/sessions').on('value', (snap) => {
      const activeSessions = snap.numChildren();
      if (activeSessions > 0) {
        liveCountRef.set(activeSessions);
      }
    });
  } catch (err) {
    console.warn('Firebase user presence tracking notice:', err);
  }
}

/**
 * Cloud Firestore Persistent User Record Sync under users/{uid}
 * Re-visits from the same browser/device update the existing document, NOT creating duplicates.
 */
async function trackUserVisitLocationFirestore() {
  try {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isTablet = /iPad|Tablet/i.test(navigator.userAgent);
    const deviceType = isTablet ? 'Tablet' : (isMobile ? 'Mobile' : 'Desktop');

    const uid = (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser)
      ? firebase.auth().currentUser.uid
      : (localStorage.getItem('kj_user_uid') || 'user_guest');

    let locationString = 'Maharashtra, India';

    try {
      const response = await fetch('https://ipapi.co/json/');
      if (response.ok) {
        const data = await response.json();
        if (data.city && data.region) {
          locationString = `${data.city}, ${data.region}`;
        } else if (data.region) {
          locationString = `${data.region}, India`;
        }
      }
    } catch (apiErr) {
      try {
        const fbRes = await fetch('https://ipwho.is/');
        if (fbRes.ok) {
          const fbData = await fbRes.json();
          if (fbData.city && fbData.region) {
            locationString = `${fbData.city}, ${fbData.region}`;
          }
        }
      } catch (e) {}
    }

    if (typeof firebase !== 'undefined' && firebase.firestore) {
      const firestore = (firebase.app && typeof firebase.app().firestore === 'function')
        ? (function() { try { return firebase.app().firestore(); } catch(e) { return firebase.firestore(); } })()
        : firebase.firestore();

      // Store/update under users/{uid} using merge to prevent duplicate docs
      await firestore.collection('users').doc(uid).set({
        uid: uid,
        location: locationString,
        device_type: deviceType,
        last_visited: firebase.firestore.FieldValue.serverTimestamp(),
        visit_count: firebase.firestore.FieldValue.increment(1),
        user_agent: (navigator.userAgent || '').substring(0, 100)
      }, { merge: true });

      console.log(`📍 [Firestore Compat] Synced user record in users/${uid}:`, locationString, deviceType);
    }
  } catch (err) {
    console.info('Firestore users/{uid} logging note:', err.message);
  }
}

/**
 * Real-time Announcement Badge Sync (siteSettings/announcement + BroadcastChannel + LocalStorage)
 */
function initRealtimeAnnouncementSync() {
  const bannerEl = document.getElementById('festiveAdBanner');
  const textEl = document.getElementById('billboardText');
  if (!bannerEl || !textEl) return;

  function applyData(data) {
    if (!data) return;
    if (data.enabled === false) {
      bannerEl.style.display = 'none';
    } else {
      bannerEl.style.display = '';
      if (data.text) textEl.textContent = data.text;
    }
  }

  // 1. Initial cached state
  try {
    const cached = localStorage.getItem('kj_announcement_override');
    if (cached) applyData(JSON.parse(cached));
  } catch (e) {}

  // 2. BroadcastChannel
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel('kj_announcement_broadcast');
      bc.onmessage = (ev) => { if (ev.data) applyData(ev.data); };
    }
  } catch (e) {}

  // 3. Storage event
  window.addEventListener('storage', (e) => {
    if (e.key === 'kj_announcement_override' && e.newValue) {
      try { applyData(JSON.parse(e.newValue)); } catch (err) {}
    }
  });

  // 4. Firestore listener
  try {
    if (typeof firebase !== 'undefined' && firebase.app) {
      const fs = (function() { try { return firebase.app().firestore(); } catch(e) { return firebase.firestore(); } })();
      if (fs) {
        fs.collection('siteSettings').doc('announcement').onSnapshot((docSnap) => {
          if (docSnap.exists) {
            const data = docSnap.data();
            applyData(data);
            try { localStorage.setItem('kj_announcement_override', JSON.stringify(data)); } catch (e) {}
          }
        }, (err) => {
          console.info('Announcement sync note:', err.message);
        });
      }
    }
  } catch (e) {}
}

/**
 * Playlist Selector Dropdown Interactions (Dynamic Firebase Storage Folders)
 */
function initPlaylistSelectorDropdown(player) {
  const selectBtn = document.getElementById('playlistSelectBtn');
  const dropdown = document.getElementById('playlistDropdownMenu');
  const wrapper = document.getElementById('playlistSelectorWrapper');
  if (!selectBtn || !dropdown || !wrapper || !player) return;

  selectBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isVisible = dropdown.style.display === 'flex';
    if (isVisible) {
      dropdown.style.display = 'none';
      wrapper.classList.remove('open');
      selectBtn.setAttribute('aria-expanded', 'false');
    } else {
      dropdown.style.display = 'flex';
      wrapper.classList.add('open');
      selectBtn.setAttribute('aria-expanded', 'true');
    }
  });

  document.querySelectorAll('.playlist-option-item').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const playlistId = btn.getAttribute('data-playlist');
      if (playlistId) {
        player.switchPlaylist(playlistId, false);
      }
    });
  });

  document.addEventListener('click', (e) => {
    if (!wrapper.contains(e.target)) {
      dropdown.style.display = 'none';
      wrapper.classList.remove('open');
      selectBtn.setAttribute('aria-expanded', 'false');
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && dropdown.style.display === 'flex') {
      dropdown.style.display = 'none';
      wrapper.classList.remove('open');
      selectBtn.setAttribute('aria-expanded', 'false');
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initDateTimeWidget();
  initFullscreenToggle();
  initTopTitleScrollFade();
  initPlayerScrollHide();
  initNightSkyStars();
  initFestiveDustParticles();
  initSubtleParallax();
  initClickHeartInteraction();
  initScrollReveal();
  initScrollIndicator();
  initFirebaseRealtimeUserTracking();
  trackUserVisitLocationFirestore();
  initRealtimeAnnouncementSync();
  window.presenceTracker = new RealtimePresenceTracker();
  window.khandeshiPlayer = new MiniMusicPlayer(initialPlaylist);
  initPlaylistSelectorDropdown(window.khandeshiPlayer);
});

// Global alias for next track advancement
function playNextSong() {
  if (window.khandeshiPlayer) {
    window.khandeshiPlayer.nextTrack();
  }
}
window.playNextSong = playNextSong;

