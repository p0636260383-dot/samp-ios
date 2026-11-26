/**
 * ROT CITY - 3D FLOATING INTERACTION BILLBOARD / SIGN UI (CEF Client)
 * Handles:
 * - Dynamic 12 Banner Presets (Airdrop, Storage, Quest, Vehicle, Shop, Camp, etc.)
 * - 3D World Target Positioning (--screen-x, --screen-y, --scale)
 * - Instant State Switching: Green (Ready/In-Range) vs Red (Locked/Out-of-Range)
 * - Dual Input Interaction: Keyboard [N] & Mobile Touch Tap on Sign
 */

(function () {
  'use strict';

  const cef = window.cef;

  // DOM Elements
  const signCard = document.getElementById('signCard');
  const bannerImgGreen = document.getElementById('bannerImgGreen');
  const bannerImgRed = document.getElementById('bannerImgRed');
  const actionButton = document.getElementById('signActionButton');
  const distValue = document.getElementById('distValue');

  // State
  let currentSignId = -1;
  let currentTypeName = 'interact';
  let currentStatus = 0; // 0 = Locked/Red, 1 = Ready/Green
  let isVisible = false;
  let tapCooldown = 0;

  // Web Audio feedback
  let audioCtx = null;
  function getAudioContext() {
    if (!audioCtx) {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (AudioCtxClass) audioCtx = new AudioCtxClass();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function playUiTone(frequency, type, duration, gainValue) {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);
      gain.gain.setValueAtTime(gainValue || 0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      // Audio fallback
    }
  }

  function playClickSound(success) {
    if (success) {
      playUiTone(620, 'sine', 0.08, 0.18);
      setTimeout(() => playUiTone(920, 'triangle', 0.12, 0.22), 60);
    } else {
      playUiTone(180, 'sawtooth', 0.15, 0.20);
      setTimeout(() => playUiTone(140, 'sawtooth', 0.18, 0.22), 80);
    }
  }

  // Preload Cache
  const imageCache = {};
  function preloadImage(url) {
    if (!imageCache[url]) {
      const img = new Image();
      img.src = url;
      imageCache[url] = img;
    }
  }

  // Precise pin anchor points calibrated to exact pixel centers of callout leader lines
  const PIN_ANCHORS = {
    interact: { x: 2.7, y: 87.3 },
    veh_access: { x: 4.0, y: 75.2 },
    garage: { x: 4.3, y: 76.3 },
    supply: { x: 3.8, y: 79.7 },
    quest: { x: 4.3, y: 72.0 },
    storage: { x: 4.3, y: 71.3 },
    safezone: { x: 3.9, y: 72.8 },
    mission: { x: 4.1, y: 71.1 },
    airdrop: { x: 4.1, y: 71.5 },
    camp: { x: 4.2, y: 71.4 },
    shop: { x: 4.3, y: 72.0 },
    guild: { x: 4.1, y: 72.6 }
  };

  const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || Boolean(window.Android);
  if (isTouchDevice && document.body) {
    document.body.classList.add('is-touch');
  }

  function updateAnchor(typeName) {
    const anchor = PIN_ANCHORS[typeName] || { x: 4.0, y: 74.0 };
    signCard.style.setProperty('--anchor-x', anchor.x + '%');
    signCard.style.setProperty('--anchor-y', anchor.y + '%');
  }

  let hudPositionMode = 'center'; // Default center: 50%, 38% (above target)

  function setHudPosition(mode) {
    hudPositionMode = mode || 'center';
    if (hudPositionMode === 'right') {
      signCard.style.setProperty('--hud-x', '74%');
      signCard.style.setProperty('--hud-y', '46%');
    } else if (hudPositionMode === 'bottom') {
      signCard.style.setProperty('--hud-x', '50%');
      signCard.style.setProperty('--hud-y', '72%');
    } else { // default 'center'
      signCard.style.setProperty('--hud-x', '50%');
      signCard.style.setProperty('--hud-y', '38%');
    }
  }

  // 3D World Tracking mode: tracks 3D coordinates in real-time as camera pans (like Legend CEF)
  let TRACK_3D = true;

  function applyScreenPosition(screenX, screenY) {
    if (!TRACK_3D) {
      signCard.classList.remove('tracked-3d');
      setHudPosition(hudPositionMode);
      return;
    }
    if (screenX !== undefined && screenY !== undefined && screenX !== null && screenY !== null) {
      const sx = parseFloat(screenX);
      const sy = parseFloat(screenY);
      if (!isNaN(sx) && !isNaN(sy) && sx > 0 && sy > 0) {
        // Direct 3D World-to-Screen Projection
        // Clamp within safe margins so banner never clips off-screen
        const clampedX = Math.min(Math.max(sx, 4.0), 72.0);
        const clampedY = Math.min(Math.max(sy, 10.0), 85.0);
        signCard.style.setProperty('--hud-x', clampedX.toFixed(1) + '%');
        signCard.style.setProperty('--hud-y', clampedY.toFixed(1) + '%');
        signCard.classList.add('tracked-3d');
        return;
      }
    }
    signCard.classList.remove('tracked-3d');
    setHudPosition(hudPositionMode);
  }

  function applyScale(scale) {
    if (!TRACK_3D) { signCard.style.setProperty('--scale', '1'); return; } // ขนาดคงที่ ไม่ย่อ/ขยายตามระยะ
    const sc = parseFloat(scale);
    const finalScale = (!isNaN(sc) && sc > 0.5 && sc < 1.6) ? sc.toFixed(2) : '1.0';
    signCard.style.setProperty('--scale', finalScale);
  }

  // Show Sign Function
  function showSign(signId, typeName, status, dist, arg5, arg6, arg7) {
    currentSignId = Number(signId);
    currentTypeName = typeName || 'interact';
    currentStatus = Number(status) === 1 ? 1 : 0;

    let scale = 1.0;
    let screenX = null;
    let screenY = null;

    if (arg7 !== undefined) {
      scale = arg5;
      screenX = arg6;
      screenY = arg7;
    } else if (arg6 !== undefined) {
      scale = arg5;
      screenX = arg6;
    } else if (arg5 !== undefined) {
      scale = arg5;
    }

    updateAnchor(currentTypeName);

    const greenSrc = `img/${currentTypeName}_green.png`;
    const redSrc = `img/${currentTypeName}_red.png`;

    preloadImage(greenSrc);
    preloadImage(redSrc);

    if (bannerImgGreen.getAttribute('src') !== greenSrc) {
      bannerImgGreen.src = greenSrc;
    }
    if (bannerImgRed.getAttribute('src') !== redSrc) {
      bannerImgRed.src = redSrc;
    }

    applyStatusClass(currentStatus);
    updateDistance(dist);
    applyScale(scale);
    applyScreenPosition(screenX, screenY);

    signCard.classList.remove('hidden');
    signCard.classList.add('visible');
    isVisible = true;
  }

  function applyStatusClass(status) {
    signCard.classList.remove('state-ready', 'state-locked');
    if (status === 1) {
      signCard.classList.add('state-ready');
    } else {
      signCard.classList.add('state-locked');
    }
  }

  function updateDistance(dist) {
    if (distValue) {
      const d = parseFloat(dist);
      if (!isNaN(d)) {
        distValue.textContent = d.toFixed(1) + 'm';
      }
    }
  }

  function updateStatus(signId, status, dist, arg4, arg5, arg6) {
    currentSignId = Number(signId);
    currentStatus = Number(status) === 1 ? 1 : 0;
    applyStatusClass(currentStatus);
    updateDistance(dist);

    let scale = 1.0;
    let screenX = null;
    let screenY = null;

    if (arg6 !== undefined) {
      scale = arg4;
      screenX = arg5;
      screenY = arg6;
    } else if (arg5 !== undefined) {
      scale = arg4;
      screenX = arg5;
    } else if (arg4 !== undefined) {
      scale = arg4;
    }

    applyScale(scale);
    applyScreenPosition(screenX, screenY);

    if (!isVisible) {
      signCard.classList.remove('hidden');
      signCard.classList.add('visible');
      isVisible = true;
    }
  }

  function hideSign() {
    if (!isVisible) return;
    signCard.classList.remove('visible');
    signCard.classList.add('hidden');
    isVisible = false;
    currentSignId = -1;
  }

  // Handle User Interaction (Tap on Mobile or Click on PC)
  function handleInteract() {
    if (!isVisible || currentSignId < 0) return;

    const now = Date.now();
    if (now - tapCooldown < 300) return;
    tapCooldown = now;

    signCard.classList.add('tapped');
    setTimeout(() => signCard.classList.remove('tapped'), 120);

    if (currentStatus === 1) {
      playClickSound(true);
      signCard.classList.remove('shake');
      signCard.classList.add('success-pop');
      setTimeout(() => signCard.classList.remove('success-pop'), 350);

      sendInteractToServer(currentSignId, 1);
    } else {
      playClickSound(false);
      signCard.classList.remove('shake');
      void signCard.offsetWidth; // Reflow
      signCard.classList.add('shake');
      setTimeout(() => signCard.classList.remove('shake'), 450);

      sendInteractToServer(currentSignId, 0);
    }
  }

  function sendInteractToServer(signId, status) {
    if (cef && typeof cef.emit === 'function') {
      cef.emit('rotsign.interact', String(signId), Number(status));
    }
    if (window.Android && typeof window.Android.executeCommand === 'function') {
      window.Android.executeCommand(`/dweb =rotsign.interact|${signId.toString(16)}`);
    }
  }

  // Touch & Click listeners
  if (actionButton) {
    actionButton.addEventListener('click', (e) => {
      e.stopPropagation();
      handleInteract();
    });
    actionButton.addEventListener('touchend', (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleInteract();
    });
  }

  if (signCard) {
    signCard.addEventListener('click', () => {
      handleInteract();
    });
    signCard.addEventListener('touchend', (e) => {
      e.preventDefault();
      handleInteract();
    });
  }

  // Keyboard shortcut listener on PC (Press N)
  window.addEventListener('keydown', (e) => {
    if (e.key === 'n' || e.key === 'N' || e.keyCode === 78) {
      if (isVisible) {
        handleInteract();
      }
    }
  });

  // CEF Event Listeners
  if (cef && typeof cef.on === 'function') {
    cef.on('rotsign.show', (signId, typeName, status, dist, a5, a6, a7) => {
      showSign(signId, typeName, status, dist, a5, a6, a7);
    });

    cef.on('rotsign.status', (signId, status, dist, a4, a5, a6) => {
      updateStatus(signId, status, dist, a4, a5, a6);
    });

    cef.on('rotsign.pos_mode', (mode) => {
      setHudPosition(mode);
    });

    cef.on('rotsign.track_3d', (enabled) => {
      TRACK_3D = Boolean(enabled);
      if (!TRACK_3D) {
        signCard.classList.remove('tracked-3d');
        setHudPosition(hudPositionMode);
      }
    });

    cef.on('rotsign.hide', () => {
      hideSign();
    });

    if (typeof cef.emit === 'function') {
      cef.emit('rotsign.ready');
    }
  }

  // Developer APIs
  window.RotSignShow = showSign;
  window.RotSignStatus = updateStatus;
  window.RotSignPosMode = setHudPosition;
  window.RotSignHide = hideSign;
  window.RotSignInteract = handleInteract;

  console.log('[ROT SIGN] 3D Floating Billboard UI initialized.');
})();
