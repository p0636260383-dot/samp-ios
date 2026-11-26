(()=>{
'use strict';

const cef = window.cef;
const downedRoot = document.getElementById('downedRoot');
const dialProgress = document.getElementById('dialProgress');
const timerMin = document.getElementById('timerMin');
const timerSec = document.getElementById('timerSec');
const dockCountdown = document.getElementById('dockCountdown');
const bpmText = document.getElementById('bpmText');
const hpPercent = document.getElementById('hpPercent');
const hpFill = document.getElementById('hpFill');
const armorPercent = document.getElementById('armorPercent');
const armorFill = document.getElementById('armorFill');
const onlineCount = document.getElementById('onlineCount');

const reviveBox = document.getElementById('reviveBox');
const reviveBar = document.getElementById('reviveBar');
const revivePercent = document.getElementById('revivePercent');
const rescuerName = document.getElementById('rescuerName');

const giveupBtn = document.getElementById('giveupBtn');
const callBtn = document.getElementById('callBtn');
const liveDate = document.getElementById('liveDate');
const liveClock = document.getElementById('liveClock');

// Circumference of r=95 circle: 2 * PI * 95 ≈ 596.90
const CIRCUMFERENCE = 596.90;
let totalTime = 300;
let currentRemaining = 300;
let countdownInterval = null;
let isRevivePaused = false;

// 1. Live Real-Time Date & Clock in Thai Format
const thaiMonths = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
function updateLiveClock() {
  const now = new Date();
  if (liveDate) {
    const d = now.getDate();
    const m = thaiMonths[now.getMonth()];
    const y = now.getFullYear() + 543; // พ.ศ.
    liveDate.textContent = `${d} ${m} ${y}`;
  }
  if (liveClock) {
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    liveClock.textContent = `${hh}:${mm}:${ss}`;
  }
}
setInterval(updateLiveClock, 1000);
updateLiveClock();

// 2. Format Seconds into MM:SS
function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return {
    mStr: String(m).padStart(2, '0'),
    sStr: String(s).padStart(2, '0'),
    combined: `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  };
}

// 3. Render Circular Progress & Vitals
function setCountdown(seconds) {
  seconds = Math.max(0, Math.min(300, Number(seconds) || 0));
  const t = formatTime(seconds);

  if (timerMin) timerMin.textContent = t.mStr;
  if (timerSec) timerSec.textContent = t.sStr;
  if (dockCountdown) dockCountdown.textContent = t.combined;

  if (dialProgress) {
    const fraction = totalTime > 0 ? (seconds / totalTime) : 0;
    const offset = CIRCUMFERENCE * (1 - fraction);
    dialProgress.style.strokeDasharray = `${CIRCUMFERENCE}`;
    dialProgress.style.strokeDashoffset = `${offset}`;

    if (seconds <= 30) {
      dialProgress.classList.add('urgent');
    } else {
      dialProgress.classList.remove('urgent');
    }
  }

  if (bpmText) {
    // Dynamic simulated heartbeat based on remaining seconds
    const bpm = Math.max(26, 28 + Math.round(seconds * 0.12));
    bpmText.textContent = `${bpm} BPM`;
  }
}

function showHud(isOpen) {
  if (downedRoot) {
    downedRoot.hidden = !isOpen;
    downedRoot.style.display = isOpen ? 'block' : 'none';
  }
}

function stopLocalCountdown() {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
}

function startLocalCountdown(initialSeconds) {
  stopLocalCountdown();
  currentRemaining = Math.max(0, Math.min(300, Number(initialSeconds) || 300));
  totalTime = 300;
  isRevivePaused = false;
  setCountdown(currentRemaining);

  countdownInterval = setInterval(() => {
    if (isRevivePaused) return;
    currentRemaining--;
    if (currentRemaining <= 0) {
      currentRemaining = 0;
      setCountdown(0);
      stopLocalCountdown();
      showHud(false);
      if (cef && typeof cef.emit === 'function') {
        cef.emit('rotdown.giveup');
      }
    } else {
      setCountdown(currentRemaining);
    }
  }, 1000);
}

// 4. Update Anatomy Vitals (HP / Armor) & Online Count
function updateVitals(hp, arm) {
  const h = Math.max(0, Math.min(100, Number(hp) || 0));
  const a = Math.max(0, Math.min(100, Number(arm) || 0));
  if (hpPercent) hpPercent.textContent = `${h} %`;
  if (hpFill) hpFill.style.width = `${h}%`;
  if (armorPercent) armorPercent.textContent = `${a} %`;
  if (armorFill) armorFill.style.width = `${a}%`;
}
updateVitals(0, 0);

function updateOnline(online, max) {
  if (onlineCount) {
    const o = Number(online) || 1;
    const m = Number(max) || 50;
    onlineCount.textContent = `${o} / ${m}`;
  }
}

// 5. Revive CPR Status Bar
function setReviveState(isReviving, percent, helper) {
  if (!reviveBox) return;
  const active = Number(isReviving) === 1 || isReviving === true;
  reviveBox.hidden = !active;
  reviveBox.style.display = active ? 'flex' : 'none';

  if (active) {
    const p = Math.max(0, Math.min(100, Number(percent) || 0));
    if (reviveBar) reviveBar.style.width = `${p}%`;
    if (revivePercent) revivePercent.textContent = `${p}%`;
    if (rescuerName && helper) {
      rescuerName.textContent = `${helper} กำลังทำ CPR และห้ามเลือดให้คุณ`;
    }
  }
}

// 6. Action Button Listeners
if (giveupBtn) {
  giveupBtn.addEventListener('click', () => {
    stopLocalCountdown();
    showHud(false);
    if (cef && typeof cef.emit === 'function') {
      cef.emit('rotdown.giveup');
    }
  });
}

if (callBtn) {
  callBtn.addEventListener('click', () => {
    // Visual feedback
    callBtn.style.transform = 'scale(0.96)';
    setTimeout(() => { callBtn.style.transform = ''; }, 150);
  });
}

// 7. Initial State Setup
// Default to hidden when running inside GTA SA CEF
showHud(false);
stopLocalCountdown();

// 8. CEF Network Event Handlers
if (cef && typeof cef.on === 'function') {
  cef.on('rotdown.open', (seconds, hp, arm, online, maxOnline) => {
    const s = Math.max(1, Number(seconds) || 300);
    showHud(true);
    startLocalCountdown(s);
    setReviveState(false, 0, '');
    updateVitals(hp || 0, arm || 0);
    updateOnline(online, maxOnline);
  });

  cef.on('rotdown.tick', (seconds) => {
    const s = Math.max(0, Math.min(300, Number(seconds) || 0));
    // Soft sync with server to prevent jitter while maintaining steady ticking
    if (Math.abs(currentRemaining - s) > 1 || s <= 3) {
      currentRemaining = s;
      setCountdown(s);
    }
    if (s <= 0) {
      stopLocalCountdown();
      showHud(false);
    }
  });

  cef.on('rotdown.reviving', (isReviving, percent, helper) => {
    const active = Number(isReviving) === 1 || isReviving === true;
    isRevivePaused = active;
    setReviveState(active, percent, helper);
  });

  cef.on('rotdown.close', () => {
    stopLocalCountdown();
    showHud(false);
    setReviveState(false, 0, '');
  });

  // Notify open.mp that CEF script is loaded and ready
  if (typeof cef.emit === 'function') {
    cef.emit('rotdown.ready');
  }
}

// 9. Browser / Standalone Preview Fallback
try {
  const isBrowser = !cef || typeof cef.on !== 'function';
  const params = new URLSearchParams(location.search);
  if (isBrowser || params.has('open') || params.has('test')) {
    const s = Number(params.get('time')) || 300;
    showHud(true);
    startLocalCountdown(s);
  }
} catch (e) {}

})();
