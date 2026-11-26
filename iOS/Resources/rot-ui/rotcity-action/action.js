(()=>{
'use strict';

const cef = window.cef;

const actionRoot = document.getElementById('actionRoot');
const actionBar = document.getElementById('actionBar');
const actionIcon = document.getElementById('actionIcon');
const actionTitle = document.getElementById('actionTitle');
const actionSubtitle = document.getElementById('actionSubtitle');
const subPrefix = document.getElementById('subPrefix');
const subText = document.getElementById('subText');
const barFill = document.getElementById('barFill');
const actionPct = document.getElementById('actionPct');

let currentActionId = 0;
let progressInterval = null;
let closeTimeout = null;
let currentPct = 0;

const ICONS = {
  'medkit': 'icons/medkit.png',
  'repair_veh': 'icons/repair_veh.svg',
  'repair_gun': 'icons/repair_gun.svg',
  'craft': 'icons/craft.svg',
  'airdrop': 'icons/airdrop.svg',
  'loot': 'icons/loot.svg'
};

// Preset configurations in clean UTF-8 Thai
const ACTION_PRESETS = {
  // 1: ROT_ACTION_LOOT (เก็บฟาร์มหาของ)
  1: {
    title: '/// กำลังเก็บไอเทม...',
    subPrefix: '[+]',
    subText: (param) => {
      const tiers = ['ทั่วไป', 'ที่พักอาศัย', 'การแพทย์', 'อุตสาหกรรม', 'ทหาร'];
      const tierName = tiers[Number(param)] || 'ทั่วไป';
      return `ค้นหา: กล่องเสบียง (${tierName})  |  โปรดรอสักครู่...`;
    },
    icon: (param) => (Number(param) === 2 ? 'icons/medkit.png' : 'icons/loot.svg')
  },
  // 2: ROT_ACTION_AIRDROP (กล่องแอร์ดรอปเสบียงฉุกเฉิน)
  2: {
    title: '/// กำลังเปิดกล่องเสบียง...',
    subPrefix: '[🪂]',
    subText: () => 'กล่องเสบียงทางอากาศ  |  ระวังฝูงซอมบี้โจมตี!',
    icon: () => 'icons/airdrop.svg'
  },
  // 3: ROT_ACTION_CRAFT (คราฟต์ไอเทม)
  3: {
    title: '/// กำลังคราฟต์ไอเทม...',
    subPrefix: '[🛠️]',
    subText: (param, param2, customStr) => {
      if (customStr) return customStr;
      return 'กำลังคราฟต์ไอเทม...  |  โปรดรอสักครู่';
    },
    icon: () => 'icons/craft.svg'
  },
  // 4: ROT_ACTION_REPAIR_VEH (ซ่อมรถ)
  4: {
    title: '/// กำลังซ่อมแซม...',
    subPrefix: '[🔧]',
    subText: () => 'ซ่อมบำรุงยานพาหนะ  |  ชุดซ่อมรถ',
    icon: () => 'icons/repair_veh.svg'
  },
  // 5: ROT_ACTION_REPAIR_GUN (ซ่อมปืน)
  5: {
    title: '/// กำลังซ่อมแซม...',
    subPrefix: '[🔫]',
    subText: () => 'ขัดสีและซ่อมบำรุงอาวุธ  |  เศษโลหะ 10 ชิ้น',
    icon: () => 'icons/repair_gun.svg'
  }
};

// CP874 / Windows-1251 to Thai Unicode decoder for custom strings
function decodeThai(str) {
  if (!str || typeof str !== 'string') return '';
  // If string is already valid Thai Unicode (0x0E01..0x0E5B)
  if (/[\u0E00-\u0E7F]/.test(str)) return str;

  let out = '';
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    // 1. Cyrillic range from Windows-1251
    if (code >= 0x0410 && code <= 0x044F) {
      const byte = code - 0x0410 + 0xC0;
      if (byte >= 0xA1 && byte <= 0xFB) {
        out += String.fromCharCode(0x0E00 + (byte - 0xA0));
        continue;
      }
    }
    // 2. Specific Cyrillic Windows-1251 mappings
    if (code === 0x040E) { out += String.fromCharCode(0x0E01); continue; } // Ў -> ก
    if (code === 0x00A7) { out += String.fromCharCode(0x0E07); continue; } // § -> ง
    // 3. Raw Latin-1 / CP874 byte
    if (code >= 0x00A1 && code <= 0x00FB) {
      out += String.fromCharCode(0x0E00 + (code - 0xA0));
      continue;
    }
    out += str[i];
  }
  return out;
}

function showAction(show) {
  if (!actionRoot) return;
  if (show) {
    if (closeTimeout) { clearTimeout(closeTimeout); closeTimeout = null; }
    if (actionBar) {
      actionBar.classList.remove('slide-down', 'interrupted', 'success');
    }
    actionRoot.style.display = 'flex';
  } else {
    if (actionBar) {
      actionBar.classList.add('slide-down');
      setTimeout(() => {
        actionRoot.style.display = 'none';
        actionBar.classList.remove('slide-down');
      }, 300);
    } else {
      actionRoot.style.display = 'none';
    }
    if (progressInterval) { clearInterval(progressInterval); progressInterval = null; }
  }
}

function setProgress(pct) {
  currentPct = Math.max(0, Math.min(100, Math.round(pct)));
  if (barFill) barFill.style.width = currentPct + '%';
  if (actionPct) actionPct.textContent = currentPct + '%';
}

function startAction(type, param, param2, durationMs, customTitle, customSubtitle, customIcon) {
  currentActionId = Date.now();
  currentPct = 0;
  setProgress(0);

  const actType = Number(type) || 1;
  const dur = Number(durationMs) || 60000;
  const preset = ACTION_PRESETS[actType] || ACTION_PRESETS[1];

  // Set Title
  if (actionTitle) {
    if (customTitle && typeof customTitle === 'string' && customTitle.trim() !== '') {
      actionTitle.textContent = decodeThai(customTitle);
    } else {
      actionTitle.textContent = preset.title;
    }
  }

  // Set Subtitle
  if (subPrefix && subText) {
    subPrefix.textContent = preset.subPrefix || '[+]';
    if (customSubtitle && typeof customSubtitle === 'string' && customSubtitle.trim() !== '') {
      subText.textContent = decodeThai(customSubtitle);
    } else {
      subText.textContent = preset.subText(param, param2, '');
    }
  }

  // Set Icon
  if (actionIcon) {
    let iconSrc = '';
    if (customIcon && typeof customIcon === 'string' && customIcon.trim() !== '') {
      iconSrc = ICONS[customIcon.toLowerCase()] || customIcon;
    } else {
      iconSrc = preset.icon(param);
    }
    actionIcon.src = iconSrc;
  }

  showAction(true);

  // Local ultra-smooth interpolation (40ms ticks)
  if (progressInterval) { clearInterval(progressInterval); progressInterval = null; }
  if (dur > 0) {
    const startTime = Date.now();
    const endTime = startTime + dur;
    progressInterval = setInterval(() => {
      const now = Date.now();
      if (now >= endTime) {
        setProgress(100);
        clearInterval(progressInterval);
        progressInterval = null;
      } else {
        const pct = ((now - startTime) / dur) * 100;
        setProgress(pct);
      }
    }, 40);
  }
}

function updateAction(pct, subtitle) {
  setProgress(pct);
  if (subtitle && subText) {
    subText.textContent = decodeThai(subtitle);
  }
}

function stopAction(success) {
  if (progressInterval) { clearInterval(progressInterval); progressInterval = null; }

  const isSuccess = Number(success) === 1 || success === true;
  if (actionBar) {
    if (isSuccess) {
      setProgress(100);
      actionBar.classList.add('success');
      closeTimeout = setTimeout(() => { showAction(false); }, 750);
    } else {
      actionBar.classList.add('interrupted');
      if (actionTitle) actionTitle.textContent = '/// ถูกขัดจังหวะ! / CANCELLED';
      if (subText) subText.textContent = 'การกระทำถูกยกเลิก (โดนโจมตีหรือขยับตัว)';
      closeTimeout = setTimeout(() => { showAction(false); }, 900);
    }
  } else {
    showAction(false);
  }
}

// Native CEF Listeners
if (cef && typeof cef.on === 'function') {
  // Support flexible argument combinations:
  // rotaction.start(type, param, param2, durationMs, title, subtitle, icon)
  cef.on('rotaction.start', (arg1, arg2, arg3, arg4, arg5, arg6, arg7) => {
    // If first argument is an object / stringified json
    if (typeof arg1 === 'object') {
      startAction(arg1.type, arg1.param, arg1.param2, arg1.durationMs, arg1.title, arg1.subtitle, arg1.icon);
    } else {
      startAction(arg1, arg2, arg3, arg4, arg5, arg6, arg7);
    }
  });

  cef.on('rotaction.progress', (pct, subtitle) => {
    updateAction(pct, subtitle);
  });

  cef.on('rotaction.stop', (success) => {
    stopAction(success);
  });

  cef.on('rotaction.close', () => {
    showAction(false);
  });

  if (typeof cef.emit === 'function') {
    cef.emit('rotaction.ready', '1');
  }
}

// Global debug APIs
window.rotActionStart = startAction;
window.rotActionUpdate = updateAction;
window.rotActionStop = stopAction;

})();