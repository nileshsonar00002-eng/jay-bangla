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

// Firebase Realtime Database Configuration
const firebaseConfig = {
  apiKey: "AIzaSyDummyKeyForKhandeshiJatraPresence2026",
  authDomain: "khandeshi-jatra.firebaseapp.com",
  databaseURL: "https://khandeshi-jatra-default-rtdb.firebaseio.com",
  projectId: "khandeshi-jatra",
  storageBucket: "khandeshi-jatra.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};

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
    // 1. Always display initial minimum count immediately: 110 + 1 = 111 LISTENING
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
    this.badgeEl.textContent = `${finalCount} LISTENING`;
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
   6. Internal Songs Data (33 Tracks from Playlist PLSfT4KKW5Dcw)
   -------------------------------------------------------------------------- */
const songs = [
  {
    id: 1,
    title: "Zim Zim Pani Ma",
    artist: "Bhaiya More",
    url: "https://www.youtube.com/watch?v=BojP1rmXpA4",
    videoId: "BojP1rmXpA4",
    duration: "03:45",
    cover: "https://i.ytimg.com/vi/BojP1rmXpA4/hqdefault.jpg"
  },
  {
    id: 2,
    title: "Vadi Vadi Chandan Vadi",
    artist: "Hiten Shivde, Sachin Kumavat, Ankita Raut",
    url: "https://www.youtube.com/watch?v=T4jU3x12udo",
    videoId: "T4jU3x12udo",
    duration: "03:50",
    cover: "https://i.ytimg.com/vi/T4jU3x12udo/hqdefault.jpg"
  },
  {
    id: 3,
    title: "Raja Re (Raja Tu, Tu Mana Raja Re)",
    artist: "Jagdish Sandhanshiv, Anjana Barlekar",
    url: "https://www.youtube.com/watch?v=63SA4fiMwTs",
    videoId: "63SA4fiMwTs",
    duration: "04:30",
    cover: "https://i.ytimg.com/vi/63SA4fiMwTs/hqdefault.jpg"
  },
  {
    id: 4,
    title: "झिंग लक लक पावरी (Zing Lak Lak Pawri)",
    artist: "Arun Ahire Official",
    url: "https://www.youtube.com/watch?v=adnX3ID2p4I",
    videoId: "adnX3ID2p4I",
    duration: "03:40",
    cover: "https://i.ytimg.com/vi/adnX3ID2p4I/hqdefault.jpg"
  },
  {
    id: 5,
    title: "Mi Tuna Divana S",
    artist: "Khandeshi Superhit",
    url: "https://www.youtube.com/watch?v=bEz9xF7yY1k",
    videoId: "bEz9xF7yY1k",
    duration: "04:12",
    cover: "https://i.ytimg.com/vi/bEz9xF7yY1k/hqdefault.jpg"
  },
  {
    id: 6,
    title: "Phiri Phiri Nach Pora (अहिराणी गीत)",
    artist: "Babu More, Shrawani More",
    url: "https://www.youtube.com/watch?v=4r0yTPx6F7k",
    videoId: "4r0yTPx6F7k",
    duration: "03:25",
    cover: "https://i.ytimg.com/vi/4r0yTPx6F7k/hqdefault.jpg"
  },
  {
    id: 7,
    title: "Mani Darling",
    artist: "Bhaiya More",
    url: "https://www.youtube.com/watch?v=Xl71Ta8_wN0",
    videoId: "Xl71Ta8_wN0",
    duration: "03:55",
    cover: "https://i.ytimg.com/vi/Xl71Ta8_wN0/hqdefault.jpg"
  },
  {
    id: 8,
    title: "Hai Khandeshi Tam Tam",
    artist: "Anna Surwade",
    url: "https://www.youtube.com/watch?v=jTiVwaIsT74",
    videoId: "jTiVwaIsT74",
    duration: "04:05",
    cover: "https://i.ytimg.com/vi/jTiVwaIsT74/hqdefault.jpg"
  },
  {
    id: 9,
    title: "Char Varis Na Pyar (चार वरिस ना प्यार)",
    artist: "Ajay Mali, Anshuman More",
    url: "https://www.youtube.com/watch?v=4_HHpVeZHpg",
    videoId: "4_HHpVeZHpg",
    duration: "04:10",
    cover: "https://i.ytimg.com/vi/4_HHpVeZHpg/hqdefault.jpg"
  },
  {
    id: 10,
    title: "Sali Mi Nadan Sa",
    artist: "Naval Mali",
    url: "https://www.youtube.com/watch?v=V6C8NnX2TQk",
    videoId: "V6C8NnX2TQk",
    duration: "03:35",
    cover: "https://i.ytimg.com/vi/V6C8NnX2TQk/hqdefault.jpg"
  },
  {
    id: 11,
    title: "Khandeshi Bhawani Powerfull Duff",
    artist: "DJ Bhaiya Jalgaon",
    url: "https://www.youtube.com/watch?v=_LCCv3ajiR8",
    videoId: "_LCCv3ajiR8",
    duration: "04:45",
    cover: "https://i.ytimg.com/vi/_LCCv3ajiR8/hqdefault.jpg"
  },
  {
    id: 12,
    title: "May Mani Khandesh Ni Malan",
    artist: "Madhuri Koli",
    url: "https://www.youtube.com/watch?v=HhwbZ78bEME",
    videoId: "HhwbZ78bEME",
    duration: "04:18",
    cover: "https://i.ytimg.com/vi/HhwbZ78bEME/hqdefault.jpg"
  },
  {
    id: 13,
    title: "Laganma Machadu Dhum Ra Dhum",
    artist: "Ganesh Gujar",
    url: "https://www.youtube.com/watch?v=qwlu7cTTkWI",
    videoId: "qwlu7cTTkWI",
    duration: "03:42",
    cover: "https://i.ytimg.com/vi/qwlu7cTTkWI/hqdefault.jpg"
  },
  {
    id: 14,
    title: "Hai Saali Pyaar Karna",
    artist: "Raju Bagul",
    url: "https://www.youtube.com/watch?v=b3VyX3jvBXQ",
    videoId: "b3VyX3jvBXQ",
    duration: "04:20",
    cover: "https://i.ytimg.com/vi/b3VyX3jvBXQ/hqdefault.jpg"
  },
  {
    id: 15,
    title: "Na Bhulau Raja Tula",
    artist: "Dipak Wagh, Bhagyashree Sathe",
    url: "https://www.youtube.com/watch?v=FRNzEweNjR8",
    videoId: "FRNzEweNjR8",
    duration: "03:52",
    cover: "https://i.ytimg.com/vi/FRNzEweNjR8/hqdefault.jpg"
  },
  {
    id: 16,
    title: "Dang Maa Chalay Pori",
    artist: "Anil Kuvar",
    url: "https://www.youtube.com/watch?v=VaWj6gl0OKk",
    videoId: "VaWj6gl0OKk",
    duration: "03:48",
    cover: "https://i.ytimg.com/vi/VaWj6gl0OKk/hqdefault.jpg"
  },
  {
    id: 17,
    title: "Kar Man Lagan",
    artist: "Bhaiya More, Megha Musale",
    url: "https://www.youtube.com/watch?v=NZaYXblSaYI",
    videoId: "NZaYXblSaYI",
    duration: "03:58",
    cover: "https://i.ytimg.com/vi/NZaYXblSaYI/hqdefault.jpg"
  },
  {
    id: 18,
    title: "Pyar M Tuna Sajani",
    artist: "Raju Wagh",
    url: "https://www.youtube.com/watch?v=jP3C57dEj7c",
    videoId: "jP3C57dEj7c",
    duration: "04:15",
    cover: "https://i.ytimg.com/vi/jP3C57dEj7c/hqdefault.jpg"
  },
  {
    id: 19,
    title: "Haat Mehandi Na",
    artist: "Bhaiya More",
    url: "https://www.youtube.com/watch?v=y2QNtft2VW8",
    videoId: "y2QNtft2VW8",
    duration: "03:50",
    cover: "https://i.ytimg.com/vi/y2QNtft2VW8/hqdefault.jpg"
  },
  {
    id: 20,
    title: "Khandeshi Band Mix Pawri, Pt. 3",
    artist: "Dj Ritesh Rs",
    url: "https://www.youtube.com/watch?v=2VHsq9uG7F4",
    videoId: "2VHsq9uG7F4",
    duration: "03:38",
    cover: "https://i.ytimg.com/vi/2VHsq9uG7F4/hqdefault.jpg"
  },
  {
    id: 21,
    title: "Jeev Pisatala (खान्देशी स्पेशल)",
    artist: "Jasraj Joshi",
    url: "https://www.youtube.com/watch?v=c6E4HHbMdJI",
    videoId: "c6E4HHbMdJI",
    duration: "03:45",
    cover: "https://i.ytimg.com/vi/c6E4HHbMdJI/hqdefault.jpg"
  },
  {
    id: 22,
    title: "Pori Tuni Payal",
    artist: "Vinod Kumavat",
    url: "https://www.youtube.com/watch?v=PtlO7hE8yp8",
    videoId: "PtlO7hE8yp8",
    duration: "03:40",
    cover: "https://i.ytimg.com/vi/PtlO7hE8yp8/hqdefault.jpg"
  },
  {
    id: 23,
    title: "Mani Dilbar Tu (मनी दिलबर तू)",
    artist: "Bhaiya More, Vinod Kumavat",
    url: "https://www.youtube.com/watch?v=gNxAjo5NGxA",
    videoId: "gNxAjo5NGxA",
    duration: "04:05",
    cover: "https://i.ytimg.com/vi/gNxAjo5NGxA/hqdefault.jpg"
  },
  {
    id: 24,
    title: "Dena Tuni Sath",
    artist: "Bhaiya More",
    url: "https://www.youtube.com/watch?v=nSVH6ULbpMg",
    videoId: "nSVH6ULbpMg",
    duration: "03:52",
    cover: "https://i.ytimg.com/vi/nSVH6ULbpMg/hqdefault.jpg"
  },
  {
    id: 25,
    title: "Me Ragush Tu Mani Maina",
    artist: "Bhaiya More",
    url: "https://www.youtube.com/watch?v=P58bWqlitww",
    videoId: "P58bWqlitww",
    duration: "04:10",
    cover: "https://i.ytimg.com/vi/P58bWqlitww/hqdefault.jpg"
  },
  {
    id: 26,
    title: "Girana Kathale Mana Gaav",
    artist: "Anil Kuvar",
    url: "https://www.youtube.com/watch?v=lQGyFRMivwk",
    videoId: "lQGyFRMivwk",
    duration: "03:55",
    cover: "https://i.ytimg.com/vi/lQGyFRMivwk/hqdefault.jpg"
  },
  {
    id: 27,
    title: "Kanbai Chalni Gangevari",
    artist: "Rucha Birari",
    url: "https://www.youtube.com/watch?v=SuevDYFGlZ0",
    videoId: "SuevDYFGlZ0",
    duration: "04:22",
    cover: "https://i.ytimg.com/vi/SuevDYFGlZ0/hqdefault.jpg"
  },
  {
    id: 28,
    title: "Kanbai Hit Songs (कानबाई गीत)",
    artist: "Ahirani Latest Jukebox",
    url: "https://www.youtube.com/watch?v=fFO47NMLfSI",
    videoId: "fFO47NMLfSI",
    duration: "05:15",
    cover: "https://i.ytimg.com/vi/fFO47NMLfSI/hqdefault.jpg"
  },
  {
    id: 29,
    title: "Aaj Lagani Tile Hayad (आज लगनी तिले हळद)",
    artist: "VG Khandesh",
    url: "https://www.youtube.com/watch?v=h4JG1AqZO60",
    videoId: "h4JG1AqZO60",
    duration: "03:48",
    cover: "https://i.ytimg.com/vi/h4JG1AqZO60/hqdefault.jpg"
  },
  {
    id: 30,
    title: "Lak Lak Chamakana Nanduri Na Gad",
    artist: "Kunal Pawar",
    url: "https://www.youtube.com/watch?v=4gU_n5_vQ0c",
    videoId: "4gU_n5_vQ0c",
    duration: "04:12",
    cover: "https://i.ytimg.com/vi/4gU_n5_vQ0c/hqdefault.jpg"
  },
  {
    id: 31,
    title: "Vicky Bhagya Ni Pawari",
    artist: "Khandeshi Dance Performance",
    url: "https://www.youtube.com/watch?v=n5Ol6-BmG3U",
    videoId: "n5Ol6-BmG3U",
    duration: "04:35",
    cover: "https://i.ytimg.com/vi/n5Ol6-BmG3U/hqdefault.jpg"
  },
  {
    id: 32,
    title: "Tule Jai Ti Dhoka Disan",
    artist: "Jagdish Sandhanshiv, Anjana Barlekar",
    url: "https://www.youtube.com/watch?v=Svbv7QK7Lug",
    videoId: "Svbv7QK7Lug",
    duration: "04:15",
    cover: "https://i.ytimg.com/vi/Svbv7QK7Lug/hqdefault.jpg"
  },
  {
    id: 33,
    title: "Rani Mana Khandesh Say Kamal",
    artist: "Raju Kalme, Machindra More",
    url: "https://www.youtube.com/watch?v=HCEoIJG55bI",
    videoId: "HCEoIJG55bI",
    duration: "03:50",
    cover: "https://i.ytimg.com/vi/HCEoIJG55bI/hqdefault.jpg"
  }
];

/* --------------------------------------------------------------------------
   7. Music Player Core Engine
   -------------------------------------------------------------------------- */
const SILENT_AUDIO_DATA = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';

class MiniMusicPlayer {
  constructor(songList) {
    this.playlist = [...songList];
    this.currentIndex = 0;
    this.isPlaying = false;
    this.isMuted = false;
    this.volume = parseFloat(localStorage.getItem('kj_volume') || '0.85');
    this.playbackEngine = 'youtube';

    // DOM References
    this.audio = document.getElementById('audioElement');
    this.playBtn = document.getElementById('playBtn');
    this.playIcon = document.getElementById('playIcon');
    this.pauseIcon = document.getElementById('pauseIcon');
    this.prevBtn = document.getElementById('prevBtn');
    this.nextBtn = document.getElementById('nextBtn');
    
    this.trackTitle = document.getElementById('trackTitle');
    this.trackArtist = document.getElementById('trackArtist');
    this.trackCoverImg = document.getElementById('trackCoverImg');
    this.miniSoundwave = document.getElementById('miniSoundwave');

    // Scrubber
    this.progressBarWrapper = document.getElementById('progressBarWrapper');
    this.progressFill = document.getElementById('progressFill');
    this.progressBuffered = document.getElementById('progressBuffered');
    this.currentTimeEl = document.getElementById('currentTime');
    this.totalDurationEl = document.getElementById('totalDuration');
    this.scrubTooltip = document.getElementById('scrubTooltip');

    // Volume
    this.volumeBtn = document.getElementById('volumeBtn');
    this.volumeIcon = document.getElementById('volumeIcon');
    this.volumeSlider = document.getElementById('volumeSlider');

    // YouTube Integration
    this.ytPlayer = null;
    this.isYTReady = false;
    this.ytCheckInterval = null;
    this.pendingPlay = false;

    this.init();
  }

  init() {
    this.audio.volume = this.volume;
    if (this.volumeSlider) this.volumeSlider.value = this.volume;
    this.updateVolumeIcon();

    this.loadTrack(this.currentIndex, false);
    this.bindEvents();
    this.initYouTubeAPI();
  }

  getYouTubeVideoId(url) {
    if (!url) return null;
    if (url.startsWith('yt:')) return url.replace('yt:', '');
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : (url.length === 11 ? url : null);
  }

  initYouTubeAPI() {
    const setupPlayer = () => {
      if (this.ytPlayer || !window.YT || !window.YT.Player) return;
      try {
        this.ytPlayer = new YT.Player('youtubePlayerContainer', {
          height: '200',
          width: '200',
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            rel: 0,
            enablejsapi: 1,
            playsinline: 1,
            origin: window.location.origin
          },
          events: {
            onReady: () => {
              this.isYTReady = true;
              this.ytPlayer.setVolume(this.volume * 100);
              if (this.isMuted) this.ytPlayer.mute();

              const currentTrack = this.playlist[this.currentIndex];
              const videoId = currentTrack.videoId || this.getYouTubeVideoId(currentTrack.url);
              if (videoId) {
                this.ytPlayer.cueVideoById(videoId);
              }

              if (this.pendingPlay) {
                this.pendingPlay = false;
                this.playAudio();
              }
            },
            onStateChange: (event) => {
              if (event.data === YT.PlayerState.ENDED) {
                this.nextTrack();
              } else if (event.data === YT.PlayerState.PLAYING) {
                this.setPlayState(true);
                const dur = this.ytPlayer.getDuration();
                if (dur && dur > 0) {
                  this.totalDurationEl.textContent = this.formatTime(dur);
                }
              } else if (event.data === YT.PlayerState.PAUSED) {
                if (!document.hidden) {
                  this.setPlayState(false);
                }
              }
            },
            onError: (err) => {
              console.warn('YouTube playback error, attempting next track:', err);
              setTimeout(() => this.nextTrack(), 800);
            }
          }
        });
      } catch (e) {
        console.error('Error creating YouTube player:', e);
      }
    };

    window.onYouTubeIframeAPIReady = setupPlayer;
    if (window.YT && window.YT.Player) {
      setupPlayer();
    } else if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }
  }

  loadTrack(index, autoPlay = true) {
    if (index < 0 || index >= this.playlist.length) return;
    this.currentIndex = index;
    const track = this.playlist[this.currentIndex];

    this.trackTitle.textContent = track.title;
    this.trackArtist.textContent = track.artist;
    this.currentTimeEl.textContent = '00:00';
    this.totalDurationEl.textContent = track.duration || '03:30';
    this.progressFill.style.width = '0%';
    this.progressBarWrapper.setAttribute('aria-valuenow', '0');

    if (this.trackCoverImg && track.cover) {
      this.trackCoverImg.src = track.cover;
    }

    // 1. Update Media Session Metadata
    this.updateMediaSession();

    // Check for direct audio URL (e.g. mp3/m4a/audio stream)
    const directAudio = track.audioUrl || (track.url && (track.url.endsWith('.mp3') || track.url.endsWith('.m4a') || track.url.endsWith('.aac') || track.url.includes('audio') || track.url.includes('archive.org')) ? track.url : null);
    const videoId = track.videoId || this.getYouTubeVideoId(track.url);

    if (directAudio) {
      this.playbackEngine = 'audio';
      if (this.ytPlayer && this.isYTReady) {
        try { this.ytPlayer.stopVideo(); } catch (e) {}
      }
      this.audio.src = directAudio;
      this.audio.loop = false;
      this.audio.load();
      if (autoPlay) {
        this.playAudio();
      }
    } else if (videoId) {
      this.playbackEngine = 'youtube';
      if (this.ytPlayer && this.isYTReady) {
        if (autoPlay) {
          this.ytPlayer.loadVideoById(videoId);
          this.setPlayState(true);
        } else {
          this.ytPlayer.cueVideoById(videoId);
        }
        this.startYTProgressTracker();
      } else if (autoPlay) {
        this.pendingPlay = true;
      }
    } else {
      this.playbackEngine = 'audio';
      if (this.ytPlayer && this.isYTReady) {
        try { this.ytPlayer.stopVideo(); } catch (e) {}
      }
      this.audio.src = track.url;
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
      const artworkSrc = currentSong.cover || currentSong.artwork || 'assets/khandeshi-jatra-bg.jpg';
      const absoluteArtwork = artworkSrc.startsWith('http')
        ? artworkSrc
        : new URL(artworkSrc, window.location.href).href;

      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentSong.title,
        artist: currentSong.artist || 'Ahirani Ganyancha Khajina',
        album: 'Ahirani Ganyancha Khajina',
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
      let dur = 0;
      let pos = 0;
      if (this.playbackEngine === 'youtube' && this.ytPlayer && this.isYTReady) {
        dur = this.ytPlayer.getDuration() || 0;
        pos = this.ytPlayer.getCurrentTime() || 0;
      } else if (this.audio && this.audio.duration && !isNaN(this.audio.duration)) {
        dur = this.audio.duration;
        pos = this.audio.currentTime || 0;
      }

      if (dur > 0 && pos >= 0 && pos <= dur) {
        navigator.mediaSession.setPositionState({
          duration: Math.max(0, dur),
          playbackRate: this.audio.playbackRate || 1,
          position: Math.max(0, Math.min(pos, dur))
        });
      }
    } catch (e) {
      // Ignore position state sync issues
    }
  }

  playAudio() {
    const track = this.playlist[this.currentIndex];
    const directAudio = track.audioUrl || (track.url && (track.url.endsWith('.mp3') || track.url.endsWith('.m4a') || track.url.endsWith('.aac') || track.url.includes('audio') || track.url.includes('archive.org')) ? track.url : null);
    const videoId = track.videoId || this.getYouTubeVideoId(track.url);

    if (directAudio || this.playbackEngine === 'audio') {
      if (this.ytPlayer && this.isYTReady) {
        try { this.ytPlayer.stopVideo(); } catch (e) {}
      }
      if (!this.audio.src || this.audio.src.startsWith('data:') || this.audio.src !== directAudio) {
        this.audio.src = directAudio || track.url;
        this.audio.loop = false;
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
    } else if (videoId) {
      // Maintain native browser AudioSession carrier so Android / iOS creates MediaSession notification
      if (!this.audio.src || this.audio.src.startsWith('data:')) {
        if (this.audio.src !== SILENT_AUDIO_DATA) {
          this.audio.src = SILENT_AUDIO_DATA;
          this.audio.loop = true;
        }
      }
      const silentPromise = this.audio.play();
      if (silentPromise !== undefined) {
        silentPromise.catch(() => {});
      }

      if (this.ytPlayer && this.isYTReady) {
        try {
          const state = this.ytPlayer.getPlayerState();
          if (state === YT.PlayerState.PLAYING) {
            this.setPlayState(true);
            return;
          }
          if (state === YT.PlayerState.PAUSED) {
            this.ytPlayer.playVideo();
          } else {
            this.ytPlayer.loadVideoById(videoId);
          }
          this.setPlayState(true);
          this.startYTProgressTracker();
        } catch (e) {
          try {
            this.ytPlayer.loadVideoById(videoId);
            this.setPlayState(true);
            this.startYTProgressTracker();
          } catch (err) {}
        }
      } else {
        this.pendingPlay = true;
      }
    } else {
      this.audio.src = track.url;
      this.audio.loop = false;
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

    this.updateMediaSession();
  }

  pauseAudio() {
    if (this.playbackEngine === 'youtube' && this.ytPlayer && this.isYTReady) {
      try {
        this.ytPlayer.pauseVideo();
      } catch (e) {}
    }
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
    if (!duration || isNaN(duration) || duration <= 0) return;
    const percent = Math.min(100, (currentTime / duration) * 100);
    this.progressFill.style.width = `${percent}%`;
    this.progressBarWrapper.setAttribute('aria-valuenow', Math.round(percent));
    this.currentTimeEl.textContent = this.formatTime(currentTime);
    this.totalDurationEl.textContent = this.formatTime(duration);
  }

  seekToPercent(percent) {
    if (this.playbackEngine === 'youtube' && this.ytPlayer && this.isYTReady) {
      const duration = this.ytPlayer.getDuration();
      if (duration) {
        this.ytPlayer.seekTo((percent / 100) * duration, true);
      }
    } else {
      if (this.audio.duration) {
        this.audio.currentTime = (percent / 100) * this.audio.duration;
      }
    }
    this.syncMediaSessionPositionState();
  }

  seekRelative(seconds) {
    if (this.playbackEngine === 'youtube' && this.ytPlayer && this.isYTReady) {
      const cur = this.ytPlayer.getCurrentTime() || 0;
      const dur = this.ytPlayer.getDuration() || 0;
      const target = Math.max(0, Math.min(cur + seconds, dur));
      this.ytPlayer.seekTo(target, true);
    } else if (this.audio.duration) {
      const target = Math.max(0, Math.min(this.audio.currentTime + seconds, this.audio.duration));
      this.audio.currentTime = target;
    }
    this.syncMediaSessionPositionState();
  }

  seekToTime(seconds) {
    if (this.playbackEngine === 'youtube' && this.ytPlayer && this.isYTReady) {
      const dur = this.ytPlayer.getDuration() || 0;
      const target = Math.max(0, Math.min(seconds, dur));
      this.ytPlayer.seekTo(target, true);
    } else if (this.audio.duration) {
      const target = Math.max(0, Math.min(seconds, this.audio.duration));
      this.audio.currentTime = target;
    }
    this.syncMediaSessionPositionState();
  }

  startYTProgressTracker() {
    if (this.ytCheckInterval) clearInterval(this.ytCheckInterval);
    this.ytCheckInterval = setInterval(() => {
      if (this.playbackEngine === 'youtube' && this.ytPlayer && this.isYTReady && this.isPlaying) {
        const cur = this.ytPlayer.getCurrentTime() || 0;
        const dur = this.ytPlayer.getDuration() || 0;
        this.updateProgress(cur, dur);
        this.syncMediaSessionPositionState();

        try {
          const loaded = this.ytPlayer.getVideoLoadedFraction() || 0;
          this.progressBuffered.style.width = `${loaded * 100}%`;
        } catch (e) {}
      }
    }, 400);
  }

  setVolume(val) {
    this.volume = Math.max(0, Math.min(1, val));
    this.audio.volume = this.volume;
    if (this.volumeSlider) this.volumeSlider.value = this.volume;
    localStorage.setItem('kj_volume', this.volume);

    if (this.ytPlayer && this.isYTReady) {
      this.ytPlayer.setVolume(this.volume * 100);
    }

    this.isMuted = this.volume === 0;
    this.updateVolumeIcon();
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.audio.muted = true;
      if (this.ytPlayer && this.isYTReady) this.ytPlayer.mute();
      if (this.volumeSlider) this.volumeSlider.value = 0;
    } else {
      this.audio.muted = false;
      if (this.ytPlayer && this.isYTReady) {
        this.ytPlayer.unMute();
        this.ytPlayer.setVolume(this.volume * 100);
      }
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

  bindEvents() {
    this.playBtn.addEventListener('click', () => this.togglePlay());
    this.prevBtn.addEventListener('click', () => this.prevTrack());
    this.nextBtn.addEventListener('click', () => this.nextTrack());
    this.volumeBtn.addEventListener('click', () => this.toggleMute());

    if (this.volumeSlider) {
      this.volumeSlider.addEventListener('input', (e) => {
        this.setVolume(parseFloat(e.target.value));
      });
    }

    // HTML5 Audio events for background playback
    this.audio.addEventListener('play', () => {
      this.setPlayState(true);
      this.updateMediaSession();
    });

    this.audio.addEventListener('pause', () => {
      this.setPlayState(false);
    });

    this.audio.addEventListener('timeupdate', () => {
      if (this.playbackEngine === 'audio') {
        this.updateProgress(this.audio.currentTime, this.audio.duration);
        this.syncMediaSessionPositionState();
      }
    });

    this.audio.addEventListener('loadedmetadata', () => {
      if (this.playbackEngine === 'audio' && this.audio.duration) {
        this.totalDurationEl.textContent = this.formatTime(this.audio.duration);
        this.syncMediaSessionPositionState();
      }
    });

    this.audio.addEventListener('ended', () => {
      this.nextTrack();
    });

    // Scrubber
    this.progressBarWrapper.addEventListener('click', (e) => {
      const rect = this.progressBarWrapper.getBoundingClientRect();
      const clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
      const pos = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const percent = (pos / rect.width) * 100;
      this.seekToPercent(percent);
    });

    this.progressBarWrapper.addEventListener('mousemove', (e) => {
      const rect = this.progressBarWrapper.getBoundingClientRect();
      const pos = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const percent = (pos / rect.width) * 100;
      this.scrubTooltip.style.left = `${percent}%`;

      let duration = this.audio.duration || 0;
      if (this.playbackEngine === 'youtube' && this.ytPlayer && this.isYTReady) {
        duration = this.ytPlayer.getDuration() || 0;
      }
      this.scrubTooltip.textContent = this.formatTime((percent / 100) * duration);
    });

    // Global Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          this.togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          this.seekRelative(-5);
          break;
        case 'ArrowRight':
          e.preventDefault();
          this.seekRelative(5);
          break;
        case 'ArrowUp':
          e.preventDefault();
          this.setVolume(this.volume + 0.05);
          break;
        case 'ArrowDown':
          e.preventDefault();
          this.setVolume(this.volume - 0.05);
          break;
        case 'KeyM':
          this.toggleMute();
          break;
        case 'KeyN':
          this.nextTrack();
          break;
        case 'KeyP':
          this.prevTrack();
          break;
      }
    });

    // Media Session API registration - Only Play & Pause in system notification overlay
    if ('mediaSession' in navigator) {
      const registerAction = (action, handler) => {
        try {
          navigator.mediaSession.setActionHandler(action, handler);
        } catch (err) {
          // Action not supported by this browser
        }
      };

      // Explicitly hook Play and Pause
      registerAction('play', () => this.playAudio());
      registerAction('pause', () => this.pauseAudio());

      // Reset all other handlers to null so only Play and Pause buttons are rendered in overlay
      registerAction('previoustrack', null);
      registerAction('nexttrack', null);
      registerAction('seekbackward', null);
      registerAction('seekforward', null);
      registerAction('seekto', null);
      registerAction('stop', null);
    }

    // Ensure audio and media player resume immediately on visibility restore / unlock
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.isPlaying) {
        if (this.playbackEngine === 'youtube' && this.ytPlayer && this.isYTReady) {
          try {
            const state = this.ytPlayer.getPlayerState();
            if (state !== YT.PlayerState.PLAYING) {
              this.ytPlayer.playVideo();
            }
          } catch (e) {}
        } else if (this.audio && this.audio.paused && !this.audio.ended) {
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
    // Exclude clicks on player, badges, tagline, buttons, sliders, links, inputs
    if (target.closest('button, input, a, .mini-player-bar, .top-badge, .player-container, [role="slider"], [role="region"]')) {
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

  // Fade out scroll indicator once scrolled past hero
  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY || document.documentElement.scrollTop;
    if (scrollY > 120) {
      indicator.style.opacity = '0';
      indicator.style.pointerEvents = 'none';
    } else {
      indicator.style.opacity = '1';
      indicator.style.pointerEvents = 'auto';
    }
  }, { passive: true });

  indicator.addEventListener('click', (e) => {
    e.preventDefault();
    const target = document.getElementById('welcomeSection');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initDateTimeWidget();
  initNightSkyStars();
  initFestiveDustParticles();
  initSubtleParallax();
  initClickHeartInteraction();
  initScrollReveal();
  initScrollIndicator();
  window.presenceTracker = new RealtimePresenceTracker(BASE_LISTENER_COUNT);
  window.khandeshiPlayer = new MiniMusicPlayer(songs);
});

