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

// Firebase Project Configuration (khaneshijatra)
const firebaseConfig = {
  apiKey: 'AIzaSyDnvjfQrfkspVnq570hjNios9Yd6A0EjSA',
  authDomain: 'khaneshijatra.firebaseapp.com',
  databaseURL: 'https://khaneshijatra-default-rtdb.firebaseio.com',
  projectId: 'khaneshijatra',
  storageBucket: 'khaneshijatra.firebasestorage.app',
  messagingSenderId: '762404305793',
  appId: '1:762404305793:web:8ec333a65b673211af8680'
};

// Safe Firebase App Initialization
if (typeof firebase !== 'undefined' && (!firebase.apps || !firebase.apps.length)) {
  try {
    firebase.initializeApp(firebaseConfig);
  } catch (e) {
    console.info('Firebase initialization notice:', e);
  }
}

const BASE_LISTENER_COUNT = 110;

/* --------------------------------------------------------------------------
   1. Real-Time Global Presence Engine (Multi-Device MQTT over WebSockets + LWT)
   -------------------------------------------------------------------------- */
class RealtimePresenceTracker {
  constructor(baseCount = 110) {
    this.baseCount = baseCount;
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

    this.init();
  }

  init() {
    // 1. Always display initial minimum count immediately: 110 + 1 = 111 LIVE
    this.updateBadge(this.baseCount + 1);

    // 2. Local multi-tab coordination (BroadcastChannel + LocalStorage)
    this.initLocalTabCoordinator();

    // 3. Global multi-device MQTT WebSocket presence
    this.initGlobalMQTTPresence();

    // 4. Periodic prune timer for dead devices
    setInterval(() => this.pruneStalePeers(), 1500);
  }

  updateBadge(totalCount) {
    if (!this.badgeEl) return;
    const finalCount = Math.max(this.baseCount + 1, totalCount);
    this.badgeEl.textContent = `${finalCount} LIVE`;
  }

  recalculateTotal() {
    // Ensure this device is always registered
    this.remotePeers.set(this.sessionId, Date.now());
    
    // Total real active visitors = unique global devices or local tabs
    const globalDeviceCount = this.remotePeers.size;
    const effectiveActiveCount = Math.max(globalDeviceCount, this.activeTabs, 1);
    this.updateBadge(this.baseCount + effectiveActiveCount);
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
   7. Initial Music Player State
   -------------------------------------------------------------------------- */
const initialPlaylist = [
  {
    id: 'kj_init_1',
    title: 'खान्देशी अहिराणी गाणी',
    singer: 'Bhaiya More',
    artist: 'Bhaiya More',
    vocals: 'Bhaiya More',
    category: 'खान्देशी अहिराणी',
    duration: '--:--',
    cover: 'assets/khandeshi-jatra-bg.jpg',
    isFirebaseStorage: true
  }
];

/* --------------------------------------------------------------------------
   8. Music Player Core Engine (Firebase Cloud Storage MP3 Streaming)
   -------------------------------------------------------------------------- */
class MiniMusicPlayer {
  constructor(songList = initialPlaylist) {
    this.playlist = [...songList];
    this.currentIndex = 0;
    this.isPlaying = false;
    this.isMuted = false;
    this.volume = parseFloat(localStorage.getItem('kj_volume') || '0.85');

    // DOM References
    this.audio = document.getElementById('audioElement');
    this.playBtn = document.getElementById('playBtn');
    this.playIcon = document.getElementById('playIcon');
    this.pauseIcon = document.getElementById('pauseIcon');
    this.prevBtn = document.getElementById('prevBtn');
    this.nextBtn = document.getElementById('nextBtn');
    
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

    this.init();
  }

  init() {
    this.audio.volume = this.volume;
    if (this.volumeSlider) this.volumeSlider.value = this.volume;
    this.updateVolumeIcon();

    this.loadTrack(this.currentIndex, false);
    this.bindEvents();
    this.updatePlaylistCountBadge();
    this.loadFromFirebaseStorage();
  }

  /**
   * Intelligently parses MP3 filenames into clean Title, Singer, Artist, Vocals and Category
   */
  parseSongMetadata(filename, index) {
    // 1. Strip file extensions (.mp3, .wav, .m4a, .aac, .ogg, .flac)
    let clean = filename.replace(/\.[^/.]+$/, '');
    // 2. Strip leading track order patterns (e.g. "01 - ", "01. ", "01_", "1. ", "Track 01 - ")
    clean = clean.replace(/^(?:track\s*)?\d+[\s\.\-_]+/i, '');
    // 3. Normalize underscores to spaces
    clean = clean.replace(/_+/g, ' ').trim();

    let title = clean;
    let singer = null;
    const category = "खान्देशी अहिराणी";

    // A. Check for keywords directly in the filename first (e.g. 'Ramakant', 'Bhaiya More')
    const kwSinger = extractSingerKeyword(clean);
    if (kwSinger) {
      singer = kwSinger;
    }

    // B. Check parentheses or brackets: "Title (Singer)" or "[Singer] Title"
    if (!singer) {
      const bracketMatch = clean.match(/^(.*?)\s*[\(\[](.*?)[\)\]]\s*(.*)$/);
      if (bracketMatch) {
        const left = bracketMatch[1].trim();
        const inside = bracketMatch[2].trim();
        const right = bracketMatch[3].trim();
        
        const singerInside = extractSingerKeyword(inside);
        if (singerInside) {
          singer = singerInside;
          title = (left + (right ? ' ' + right : '')).trim();
        } else if (inside.length >= 3 && inside.length <= 35 && !inside.toLowerCase().includes('remix') && !inside.toLowerCase().includes('dj')) {
          singer = inside;
          title = (left + (right ? ' ' + right : '')).trim();
        }
      }
    }

    // C. Check separator delimiter: " - ", " – ", " — ", " | "
    if (!singer && (clean.includes(' - ') || clean.includes(' – ') || clean.includes(' — ') || clean.includes(' | '))) {
      const parts = clean.split(/\s*[\-–—|]\s*/);
      if (parts.length >= 2) {
        const part0 = parts[0].trim();
        const part1 = parts.slice(1).join(' - ').trim();

        const s0 = extractSingerKeyword(part0);
        const s1 = extractSingerKeyword(part1);

        if (s0) {
          singer = s0;
          title = part1;
        } else if (s1) {
          singer = s1;
          title = part0;
        } else {
          // Default heuristic: part0 is Title, part1 is Singer
          title = part0;
          singer = part1;
        }
      }
    }

    // D. Clean up title if singer was extracted
    if (singer && title) {
      const esc = singer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      title = title.replace(new RegExp(`(?:\\s*[-–—|]?\\s*(?:by|singer|ft\\.?|feat\\.?)?\\s*)?${esc}\\s*`, 'gi'), '').trim();
      title = title.replace(/^[\-–—|\s\(\)\[\]]+|[\-–—|\s\(\)\[\]]+$/g, '').trim();
    }

    if (!title || title.length === 0) {
      title = clean;
    }

    // E. If still no singer found, check if title string contains any keywords
    if (!singer) {
      singer = extractSingerKeyword(title);
    }

    return {
      id: `fb_track_${index + 1}`,
      title: title || `खान्देशी गीत ${index + 1}`,
      singer: singer || "अहिराणी खजिना",
      artist: singer || "अहिराणी खजिना",
      vocals: singer || "अहिराणी खजिना",
      singerName: singer || "अहिराणी खजिना",
      artistName: singer || "अहिराणी खजिना",
      category: category,
      filename: filename,
      itemRef: null,
      audioUrl: null,
      isFirebaseStorage: true,
      duration: '--:--',
      cover: 'assets/khandeshi-jatra-bg.jpg'
    };
  }

  /**
   * Connects to Firebase Cloud Storage and loads all MP3 tracks in the 'music/' directory
   */
  async loadFromFirebaseStorage() {
    if (typeof firebase === 'undefined' || !firebase.storage) {
      console.info('ℹ️ Firebase Storage SDK not active.');
      return;
    }

    try {
      if (!firebase.apps || !firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
      }

      const storage = firebase.storage();
      const musicRef = storage.ref('music');

      const listResult = await musicRef.listAll();

      if (!listResult || !listResult.items || listResult.items.length === 0) {
        console.info('ℹ️ Firebase Storage music/ folder is empty. Upload your MP3 files to music/ in Firebase Console.');
        return;
      }

      const storageTracks = [];
      for (let i = 0; i < listResult.items.length; i++) {
        const item = listResult.items[i];
        const name = item.name;
        const lower = name.toLowerCase();

        // Match audio formats
        if (lower.endsWith('.mp3') || lower.endsWith('.wav') || lower.endsWith('.m4a') || lower.endsWith('.aac') || lower.endsWith('.ogg') || lower.endsWith('.flac')) {
          const parsed = this.parseSongMetadata(name, i);
          parsed.itemRef = item;
          storageTracks.push(parsed);
        }
      }

      if (storageTracks.length > 0) {
        storageTracks.sort((a, b) => a.filename.localeCompare(b.filename, undefined, { numeric: true, sensitivity: 'base' }));

        console.log(`🎶 Firebase Cloud Storage: Loaded ${storageTracks.length} tracks.`);
        this.playlist = storageTracks;
        this.currentIndex = 0;
        this.updatePlaylistCountBadge();

        if (this.isPlaylistOpen) {
          this.renderPlaylistItems(this.playlistSearchInput ? this.playlistSearchInput.value : '');
        }

        await this.loadTrack(0, false);

        if (storageTracks.length > 1) {
          this.prefetchDownloadUrl(1);
        }
      }
    } catch (err) {
      console.warn('Firebase Storage connection note:', err);
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
    const titleText = currentSong.title || currentSong.songName || currentSong.name || currentSong.filename || 'खान्देशी गाणे';
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

    // 4. Keyword Fallback: Extract singer name directly from song title / filename (e.g. 'Ramakant', 'Bhaiya More')
    if (!actualSinger || actualSinger === 'खान्देशी कलाकार' || actualSinger === 'अहिराणी खजिना') {
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
      actualSinger = 'अहिराणी खजिना';
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

    if (this.trackCoverImg && currentSong.cover) {
      this.trackCoverImg.src = currentSong.cover;
    }

    // Update Media Session Metadata
    this.updateMediaSession();

    // Fetch URL and metadata on-demand
    if (currentSong.isFirebaseStorage && currentSong.itemRef) {
      if (!currentSong.audioUrl) {
        try {
          currentSong.audioUrl = await currentSong.itemRef.getDownloadURL();
        } catch (err) {
          console.warn(`Failed to fetch audio stream for ${currentSong.filename}:`, err);
          return;
        }
      }

      // Read customMetadata attached in Firebase Storage if any
      if (!currentSong._metadataFetched) {
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
              this.playerCategoryElement.innerText = currentSong.singer || 'अहिराणी खजिना';
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
      const artworkSrc = currentSong.cover || 'assets/khandeshi-jatra-bg.jpg';
      const absoluteArtwork = artworkSrc.startsWith('http')
        ? artworkSrc
        : new URL(artworkSrc, window.location.href).href;

      const singerName = currentSong.singer || currentSong.artist || currentSong.vocals || 'अहिराणी खजिना';

      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentSong.title,
        artist: singerName,
        album: 'खान्देशी जत्रा',
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
        })
        .catch(() => this.setPlayState(false));
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
    if (playing) {
      this.playIcon.style.display = 'none';
      this.pauseIcon.style.display = 'block';
      this.playBtn.classList.add('playing');
      if (this.miniSoundwave) this.miniSoundwave.classList.add('active');
    } else {
      this.playIcon.style.display = 'block';
      this.pauseIcon.style.display = 'none';
      this.playBtn.classList.remove('playing');
      if (this.miniSoundwave) this.miniSoundwave.classList.remove('active');
    }

    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
    }
    this.syncMediaSessionPositionState();
  }

  prevTrack() {
    let nextIndex = this.currentIndex - 1;
    if (nextIndex < 0) {
      nextIndex = this.playlist.length - 1;
    }
    this.loadTrack(nextIndex, true);
  }

  nextTrack() {
    let nextIndex = this.currentIndex + 1;
    if (nextIndex >= this.playlist.length) {
      nextIndex = 0;
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
      this.playlistCountBadge.textContent = `${this.playlist.length} गाणी`;
    }
  }

  /**
   * Opens the glassmorphic playlist drawer
   */
  openPlaylist() {
    if (!this.playlistModalBackdrop) return;
    this.isPlaylistOpen = true;
    this.playlistModalBackdrop.classList.add('open');
    this.playlistModalBackdrop.setAttribute('aria-hidden', 'false');
    this.updatePlaylistCountBadge();
    this.renderPlaylistItems(this.playlistSearchInput ? this.playlistSearchInput.value : '');

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
   */
  closePlaylist() {
    if (!this.playlistModalBackdrop) return;
    this.isPlaylistOpen = false;
    this.playlistModalBackdrop.classList.remove('open');
    this.playlistModalBackdrop.setAttribute('aria-hidden', 'true');
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
        <div class="playlist-empty-state">
          <p>कोणतेही गाणे सापडले नाही 🔍</p>
        </div>
      `;
      return;
    }

    this.playlistItemsContainer.innerHTML = filtered.map((item) => {
      const isActive = item.originalIndex === this.currentIndex;
      const singerName = item.singer || item.artist || item.vocals || 'अहिराणी खजिना';
      const coverImg = item.cover || 'assets/khandeshi-jatra-bg.jpg';

      return `
        <div class="playlist-item ${isActive ? 'active' : ''}" data-index="${item.originalIndex}" role="button" tabindex="0" aria-label="${item.title}">
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
          <div class="item-action-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <polygon points="6 4 20 12 6 20 6 4"></polygon>
            </svg>
          </div>
        </div>
      `;
    }).join('');

    // Attach click listeners to list items
    const items = this.playlistItemsContainer.querySelectorAll('.playlist-item');
    items.forEach((elem) => {
      elem.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(elem.getAttribute('data-index'), 10);
        if (!isNaN(idx)) {
          this.loadTrack(idx, true);
          this.highlightActivePlaylistItem();
        }
      });
    });
  }

  /**
   * Highlights current active playing track in playlist drawer
   */
  highlightActivePlaylistItem() {
    if (!this.playlistItemsContainer) return;
    const items = this.playlistItemsContainer.querySelectorAll('.playlist-item');
    items.forEach((elem) => {
      const idx = parseInt(elem.getAttribute('data-index'), 10);
      if (idx === this.currentIndex) {
        elem.classList.add('active');
        if (this.isPlaylistOpen) {
          elem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
      } else {
        elem.classList.remove('active');
      }
    });
  }

  bindEvents() {
    this.playBtn.addEventListener('click', () => this.togglePlay());
    this.prevBtn.addEventListener('click', () => this.prevTrack());
    this.nextBtn.addEventListener('click', () => this.nextTrack());
    this.volumeBtn.addEventListener('click', () => this.toggleMute());

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
      text.textContent = 'जय खान्देश';
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

document.addEventListener('DOMContentLoaded', () => {
  initDateTimeWidget();
  initFullscreenToggle();
  initTopTitleScrollFade();
  initNightSkyStars();
  initFestiveDustParticles();
  initSubtleParallax();
  initClickHeartInteraction();
  initScrollReveal();
  initScrollIndicator();
  window.presenceTracker = new RealtimePresenceTracker(BASE_LISTENER_COUNT);
  window.khandeshiPlayer = new MiniMusicPlayer(initialPlaylist);
});

