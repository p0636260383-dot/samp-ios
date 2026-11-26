(()=>{
'use strict';

const cef = window.cef;

const airdropRoot = document.getElementById('airdropRoot');
const airdropBanner = document.getElementById('airdropBanner');
const bannerTitle = document.getElementById('bannerTitle');
const bannerSubtitle = document.getElementById('bannerSubtitle');
const locNormalView = document.getElementById('locNormalView');
const locNameVal = document.getElementById('locNameVal');
const locLootView = document.getElementById('locLootView');
const miniBarFill = document.getElementById('miniBarFill');
const miniBarPct = document.getElementById('miniBarPct');
const timerLabel = document.getElementById('timerLabel');
const timerVal = document.getElementById('timerVal');
const statusPopup = document.getElementById('statusPopup');
const statusPopupText = document.getElementById('statusText');
const statusPopupIcon = document.getElementById('statusIcon');

let currentMode = 'none'; // 'incoming' | 'loot'
let activeTimer = null;
let closeTimeout = null;

function formatMMSS(sec) {
  sec = Math.max(0, Math.round(Number(sec) || 0));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function showBanner(show) {
  if (!airdropRoot) return;
  if (show) {
    if (closeTimeout) { clearTimeout(closeTimeout); closeTimeout = null; }
    if (airdropBanner) airdropBanner.classList.remove('slide-up');
    airdropRoot.style.display = 'flex';
  } else {
    if (airdropBanner) {
      airdropBanner.classList.add('slide-up');
      setTimeout(() => {
        airdropRoot.style.display = 'none';
        airdropBanner.classList.remove('slide-up');
      }, 400);
    } else {
      airdropRoot.style.display = 'none';
    }
    if (activeTimer) { clearInterval(activeTimer); activeTimer = null; }
  }
}

function resetBanner() {
  if (airdropBanner) {
    airdropBanner.classList.remove('interrupted', 'success', 'slide-up');
  }
  if (statusPopup) {
    statusPopup.style.display = 'none';
    statusPopup.classList.remove('interrupted', 'success');
  }
}

// ==========================================================================
// 1. INCOMING AIRDROP MODE (แจ้งเตือนแอร์ดรอปกำลังมา แสดงบนสุด ตรงกลาง)
// ==========================================================================
function startIncomingMode(locName, dropSeconds) {
  currentMode = 'incoming';
  resetBanner();
  showBanner(true);

  if (bannerTitle) bannerTitle.textContent = 'แอร์ดรอปกำลังมา!';
  if (bannerSubtitle) bannerSubtitle.textContent = 'กล่องเสบียงพิเศษจากทางการ';

  if (locNormalView) locNormalView.style.display = 'flex';
  if (locLootView) locLootView.style.display = 'none';
  if (locNameVal) locNameVal.textContent = locName || 'แบบสุ่มในแผนที่';

  if (timerLabel) timerLabel.textContent = 'กำลังมาถึง';

  let remaining = Number(dropSeconds) || 25;
  if (timerVal) timerVal.textContent = formatMMSS(remaining);

  if (activeTimer) clearInterval(activeTimer);
  activeTimer = setInterval(() => {
    remaining--;
    if (timerVal) timerVal.textContent = formatMMSS(remaining);

    if (remaining <= 0) {
      clearInterval(activeTimer);
      activeTimer = null;
      onLanded();
    }
  }, 1000);
}

function onLanded() {
  if (bannerTitle) bannerTitle.textContent = 'แอร์ดรอปแตะพื้นแล้ว!';
  if (bannerSubtitle) bannerSubtitle.textContent = 'ระวัง! มีฝูงซอมบี้ดุร้ายรุมล้อมเฝ้ากล่อง';
  if (timerLabel) timerLabel.textContent = 'สถานะ';
  if (timerVal) {
    timerVal.textContent = 'แตะพื้น';
    timerVal.style.color = '#00e676';
  }

  // ปิดแบนเนอร์แจ้งเตือนอัตโนมัติใน 6 วินาที
  closeTimeout = setTimeout(() => {
    showBanner(false);
  }, 6000);
}

// ==========================================================================
// 2. LOOTING MODE (เปิดกล่องเสบียง 1 นาที / 60 วินาที)
// ==========================================================================
function startLootMode(durationSec) {
  currentMode = 'loot';
  resetBanner();
  showBanner(true);

  const totalSec = Number(durationSec) || 60;
  if (bannerTitle) bannerTitle.textContent = 'กำลังเปิดกล่องเสบียง!';
  if (bannerSubtitle) bannerSubtitle.textContent = 'กล่องเสบียงพิเศษจากทางการ (ห้ามขยับตัว 1 นาที)';

  if (locNormalView) locNormalView.style.display = 'none';
  if (locLootView) locLootView.style.display = 'flex';
  if (miniBarFill) miniBarFill.style.width = '0%';
  if (miniBarPct) miniBarPct.textContent = '0%';

  if (timerLabel) timerLabel.textContent = 'เวลาที่เหลือ';
  if (timerVal) {
    timerVal.textContent = formatMMSS(totalSec);
    timerVal.style.color = '#00e5ff';
  }

  const startTime = Date.now();
  const totalMs = totalSec * 1000;

  if (activeTimer) clearInterval(activeTimer);
  activeTimer = setInterval(() => {
    const elapsed = Date.now() - startTime;
    const fraction = Math.min(1, elapsed / totalMs);
    const pct = Math.round(fraction * 100);
    const remaining = Math.max(0, Math.ceil((totalMs - elapsed) / 1000));

    if (miniBarFill) miniBarFill.style.width = `${pct}%`;
    if (miniBarPct) miniBarPct.textContent = `${pct}%`;
    if (timerVal) timerVal.textContent = formatMMSS(remaining);

    if (fraction >= 1) {
      clearInterval(activeTimer);
      activeTimer = null;
    }
  }, 50); // 20 FPS smooth progress fill
}

function onLootProgress(pct, remainSec) {
  if (currentMode !== 'loot') return;
  const p = Math.max(0, Math.min(100, Math.round(Number(pct) || 0)));
  if (miniBarFill) miniBarFill.style.width = `${p}%`;
  if (miniBarPct) miniBarPct.textContent = `${p}%`;
  if (timerVal && typeof remainSec !== 'undefined') {
    timerVal.textContent = formatMMSS(remainSec);
  }
}

function onLootSuccess() {
  if (activeTimer) { clearInterval(activeTimer); activeTimer = null; }

  if (airdropBanner) airdropBanner.classList.add('success');
  if (bannerTitle) bannerTitle.textContent = 'เปิดเสบียงสำเร็จ!';
  if (bannerSubtitle) bannerSubtitle.textContent = 'ได้รับยุทโธปกรณ์ระดับทหารครบถ้วน';
  if (miniBarFill) miniBarFill.style.width = '100%';
  if (miniBarPct) miniBarPct.textContent = '100%';
  if (timerLabel) timerLabel.textContent = 'สถานะ';
  if (timerVal) timerVal.textContent = 'SUCCESS';

  if (statusPopup && statusPopupText && statusPopupIcon) {
    statusPopup.className = 'status-popup success';
    statusPopupIcon.textContent = '🔓';
    statusPopupText.textContent = 'UNLOCKED! รับเสบียงสำเร็จ';
    statusPopup.style.display = 'flex';
  }

  closeTimeout = setTimeout(() => {
    showBanner(false);
  }, 2200);
}

function onLootInterrupted(reason) {
  if (activeTimer) { clearInterval(activeTimer); activeTimer = null; }

  if (airdropBanner) airdropBanner.classList.add('interrupted');
  if (bannerTitle) bannerTitle.textContent = 'INTERRUPTED!';
  if (bannerSubtitle) bannerSubtitle.textContent = reason || 'การเปิดกล่องถูกขัดจังหวะ! คุณถูกซอมบี้โจมตี';
  if (timerLabel) timerLabel.textContent = 'สถานะ';
  if (timerVal) timerVal.textContent = 'FAILED';

  if (statusPopup && statusPopupText && statusPopupIcon) {
    statusPopup.className = 'status-popup interrupted';
    statusPopupIcon.textContent = '⚠️';
    statusPopupText.textContent = reason || 'ถูกขัดจังหวะ!';
    statusPopup.style.display = 'flex';
  }

  closeTimeout = setTimeout(() => {
    showBanner(false);
  }, 1600);
}

// Initial State: Hidden
showBanner(false);

// Register CEF Network Event Handlers
if (cef && typeof cef.on === 'function') {
  // 1. Airdrop Incoming Broadcast
  cef.on('rotairdrop.incoming', (locName, dropSeconds) => {
    startIncomingMode(locName, dropSeconds);
  });

  // 2. Airdrop Landed Event
  cef.on('rotairdrop.landed', () => {
    onLanded();
  });

  // 3. Start 1-Minute Looting
  cef.on('rotairdrop.open', (durationSec) => {
    startLootMode(durationSec || 60);
  });

  // 4. Loot Progress Sync
  cef.on('rotairdrop.progress', (pct, remainSec) => {
    onLootProgress(pct, remainSec);
  });

  // 5. Loot Success
  cef.on('rotairdrop.success', () => {
    onLootSuccess();
  });

  // 6. Loot Interrupted
  cef.on('rotairdrop.interrupt', (reason) => {
    onLootInterrupted(reason);
  });

  // 7. Force Close
  cef.on('rotairdrop.close', () => {
    showBanner(false);
  });
}

// Browser Preview / Testing Helper
window.RotAirdropTest = {
  incoming: () => startIncomingMode('สวนสาธารณะ Glen Park', 25),
  landed: onLanded,
  loot: () => startLootMode(60),
  success: onLootSuccess,
  interrupt: () => onLootInterrupted('INTERRUPTED! ถูกซอมบี้โจมตี'),
  close: () => showBanner(false)
};
})();
