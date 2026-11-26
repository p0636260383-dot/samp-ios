/**
 * ROT CITY - ITEM NOTIFICATION TOAST SYSTEM (CEF Client)
 * Handles Toast Notifications for:
 * 1 = Received (ได้รับไอเทม)
 * 2 = Dropped  (ทิ้งไอเทม)
 * 3 = Used     (ใช้ไอเทม)
 * 4 = Stored   (เก็บไอเทม / เก็บขึ้นเก็บ)
 * 5 = Given    (ให้ไอเทม)
 * 6 = Sold     (ขายไอเทม)
 */

(function () {
  'use strict';

  // 1. Action Type Configuration
  var ACTION_CONFIG = {
    1: {
      type: 'receive',
      title: 'ได้รับไอเทม',
      sub: 'ITEM RECEIVED',
      theme: 'theme-receive',
      icon: 'img/icon_receive.svg'
    },
    2: {
      type: 'drop',
      title: 'ทิ้งไอเทม',
      sub: 'ITEM DROPPED',
      theme: 'theme-drop',
      icon: 'img/icon_drop.svg'
    },
    3: {
      type: 'use',
      title: 'ใช้ไอเทม',
      sub: 'ITEM USED',
      theme: 'theme-use',
      icon: 'img/icon_use.svg'
    },
    4: {
      type: 'store',
      title: 'เก็บไอเทม',
      sub: 'ITEM STORED',
      theme: 'theme-store',
      icon: 'img/icon_store.svg'
    },
    5: {
      type: 'give',
      title: 'ให้ไอเทม',
      sub: 'ITEM GAVE',
      theme: 'theme-give',
      icon: 'img/icon_give.svg'
    },
    6: {
      type: 'sell',
      title: 'ขายไอเทม',
      sub: 'ITEM SOLD',
      theme: 'theme-sell',
      icon: 'img/icon_sell.svg'
    }
  };

  // 2. Full Standard ROT CITY Item Registry (111 items in pure UTF-8 Thai)
  var ITEM_REGISTRY = {
    0: { name: 'น้ำดื่ม', icon: 'img/water.png' },
    1: { name: 'อาหารกระป๋อง', icon: 'img/food.svg' },
    2: { name: 'ผ้าพันแผล', icon: 'img/bandage.png' },
    3: { name: 'ยาต้านเชื้อ', icon: 'img/medkit.png' },
    4: { name: 'เศษเหล็ก', icon: 'img/scrap.png' },
    5: { name: 'กระสุน', icon: 'img/ammo.png' },
    6: { name: 'น้ำมัน', icon: 'img/fuel.png' },
    7: { name: 'น้ำดื่มขวดใหญ่', icon: 'img/water.png' },
    8: { name: 'น้ำอัดลม', icon: 'img/food.svg' },
    9: { name: 'เครื่องดื่มชูกำลัง', icon: 'img/food.svg' },
    10: { name: 'ถั่วกระป๋อง', icon: 'img/food.svg' },
    11: { name: 'ปลาทูน่ากระป๋อง', icon: 'img/food.svg' },
    12: { name: 'แครกเกอร์', icon: 'img/food.svg' },
    13: { name: 'ช็อกโกแลต', icon: 'img/food.svg' },
    14: { name: 'ชุดอาหารสนาม', icon: 'img/food.svg' },
    15: { name: 'แอปเปิล', icon: 'img/food.svg' },
    16: { name: 'เนื้อดิบ', icon: 'img/food.svg' },
    17: { name: 'เนื้อปรุงสุก', icon: 'img/food.svg' },
    18: { name: 'ยาแก้ปวด', icon: 'img/medkit.png' },
    19: { name: 'ชุดปฐมพยาบาล', icon: 'img/medkit.png' },
    20: { name: 'น้ำยาฆ่าเชื้อ', icon: 'img/medkit.png' },
    21: { name: 'วิตามิน', icon: 'img/medkit.png' },
    22: { name: 'เศษผ้า', icon: 'img/bandage.png' },
    23: { name: 'ไม้', icon: 'img/tool.svg' },
    24: { name: 'ตะปู', icon: 'img/scrap.png' },
    25: { name: 'เทปกาว', icon: 'img/tool.svg' },
    26: { name: 'เชือก', icon: 'img/tool.svg' },
    27: { name: 'แบตเตอรี่', icon: 'img/tool.svg' },
    28: { name: 'ไฟฉาย', icon: 'img/tool.svg' },
    29: { name: 'กล่องเครื่องมือ', icon: 'img/tool.svg' },
    30: { name: 'เครื่องกรองน้ำ', icon: 'img/water.png' },
    31: { name: 'หน้ากาก', icon: 'img/mask.svg' },
    32: { name: 'สมุนไพร', icon: 'img/food.svg' },
    33: { name: 'ไม้ขีดไฟ', icon: 'img/flare.svg' },
    34: { name: 'พลาสติก', icon: 'img/scrap.png' },
    35: { name: 'ลวด', icon: 'img/scrap.png' },

    // Weapons (36 - 82)
    36: { name: 'ไม่มีอาวุธ', icon: 'img/crate.svg' },
    37: { name: 'สนับมือ', icon: 'img/weapon.svg' },
    38: { name: 'ไม้กอล์ฟ', icon: 'img/weapon.svg' },
    39: { name: 'กระบอง', icon: 'img/weapon.svg' },
    40: { name: 'มีด', icon: 'img/weapon.svg' },
    41: { name: 'ไม้เบสบอล', icon: 'img/weapon.svg' },
    42: { name: 'พลั่ว', icon: 'img/weapon.svg' },
    43: { name: 'ไม้พูล', icon: 'img/weapon.svg' },
    44: { name: 'ดาบคาตานะ', icon: 'img/weapon.svg' },
    45: { name: 'เลื่อยยนต์', icon: 'img/weapon.svg' },
    46: { name: 'ดิลโด้สีม่วง', icon: 'img/weapon.svg' },
    47: { name: 'ดิลโด้', icon: 'img/weapon.svg' },
    48: { name: 'ไวเบรเตอร์', icon: 'img/weapon.svg' },
    49: { name: 'ไวเบรเตอร์เงิน', icon: 'img/weapon.svg' },
    50: { name: 'ดอกไม้', icon: 'img/food.svg' },
    51: { name: 'ไม้เท้า', icon: 'img/weapon.svg' },
    52: { name: 'ระเบิดมือ', icon: 'img/weapon.svg' },
    53: { name: 'แก๊สน้ำตา', icon: 'img/weapon.svg' },
    54: { name: 'โมโลตอฟ', icon: 'img/flare.svg' },
    55: { name: 'อาวุธสำรอง 19', icon: 'img/weapon.svg' },
    56: { name: 'อาวุธสำรอง 20', icon: 'img/weapon.svg' },
    57: { name: 'อาวุธสำรอง 21', icon: 'img/weapon.svg' },
    58: { name: 'ปืนพก 9mm', icon: 'img/weapon.svg' },
    59: { name: 'ปืนพกเก็บเสียง', icon: 'img/weapon.svg' },
    60: { name: 'Desert Eagle', icon: 'img/weapon.svg' },
    61: { name: 'ปืนลูกซอง', icon: 'img/weapon.svg' },
    62: { name: 'ลูกซองสั้น', icon: 'img/weapon.svg' },
    63: { name: 'ลูกซองต่อเนื่อง', icon: 'img/weapon.svg' },
    64: { name: 'Micro Uzi', icon: 'img/weapon.svg' },
    65: { name: 'MP5', icon: 'img/weapon.svg' },
    66: { name: 'AK-47', icon: 'img/weapon.svg' },
    67: { name: 'M4', icon: 'img/weapon.svg' },
    68: { name: 'Tec-9', icon: 'img/weapon.svg' },
    69: { name: 'ไรเฟิล', icon: 'img/weapon.svg' },
    70: { name: 'สไนเปอร์', icon: 'img/weapon.svg' },
    71: { name: 'RPG', icon: 'img/weapon.svg' },
    72: { name: 'จรวดล็อกเป้า', icon: 'img/weapon.svg' },
    73: { name: 'เครื่องพ่นไฟ', icon: 'img/weapon.svg' },
    74: { name: 'มินิกัน', icon: 'img/weapon.svg' },
    75: { name: 'ระเบิดติดตั้ง', icon: 'img/weapon.svg' },
    76: { name: 'ตัวจุดระเบิด', icon: 'img/tool.svg' },
    77: { name: 'สเปรย์', icon: 'img/tool.svg' },
    78: { name: 'ถังดับเพลิง', icon: 'img/tool.svg' },
    79: { name: 'กล้องถ่ายรูป', icon: 'img/tool.svg' },
    80: { name: 'กล้องมองกลางคืน', icon: 'img/mask.svg' },
    81: { name: 'กล้องจับความร้อน', icon: 'img/mask.svg' },
    82: { name: 'ร่มชูชีพ', icon: 'img/crate.svg' },

    // Ammunition (83 - 96)
    83: { name: 'กระสุน 9mm', icon: 'img/ammo.png' },
    84: { name: 'กระสุน 9mm เก็บเสียง', icon: 'img/ammo.png' },
    85: { name: 'กระสุน .50 AE', icon: 'img/ammo.png' },
    86: { name: 'กระสุนลูกซอง', icon: 'img/ammo.png' },
    87: { name: 'กระสุน SMG', icon: 'img/ammo.png' },
    88: { name: 'กระสุนไรเฟิลจู่โจม', icon: 'img/ammo.png' },
    89: { name: 'กระสุนไรเฟิลแม่นยำ', icon: 'img/ammo.png' },
    90: { name: 'จรวด RPG', icon: 'img/ammo.png' },
    91: { name: 'จรวดติดตามเป้า', icon: 'img/ammo.png' },
    92: { name: 'เชื้อเพลิงพ่นไฟ', icon: 'img/fuel.png' },
    93: { name: 'กระสุนมินิกัน', icon: 'img/ammo.png' },
    94: { name: 'กระป๋องสีสเปรย์', icon: 'img/tool.svg' },
    95: { name: 'น้ำยาดับเพลิง', icon: 'img/tool.svg' },
    96: { name: 'ฟิล์มกล้อง', icon: 'img/tool.svg' },

    // Gas Masks (97 - 99)
    97: { name: 'หน้ากากกันแก๊ส LV.1', icon: 'img/mask.svg' },
    98: { name: 'หน้ากากกันแก๊ส LV.2', icon: 'img/mask.svg' },
    99: { name: 'หน้ากากกันแก๊ส LV.3', icon: 'img/mask.svg' },

    // Base & Vehicle Parts (100 - 109)
    100: { name: 'แผ่นเหล็ก', icon: 'img/scrap.png' },
    101: { name: 'อิฐ', icon: 'img/scrap.png' },
    102: { name: 'ปูนซีเมนต์', icon: 'img/tool.svg' },
    103: { name: 'บานพับ', icon: 'img/tool.svg' },
    104: { name: 'ยางรถ', icon: 'img/tool.svg' },
    105: { name: 'ชิ้นส่วนเครื่องยนต์', icon: 'img/tool.svg' },
    106: { name: 'แบตเตอรี่รถ', icon: 'img/tool.svg' },
    107: { name: 'กุญแจรถ', icon: 'img/tool.svg' },
    108: { name: 'ชุดซ่อมรถ', icon: 'img/tool.svg' },
    109: { name: 'แผ่นกระจก', icon: 'img/tool.svg' },

    // Airdrop Flare (110)
    110: { name: 'พลุสัญญาณแอร์ดรอป', icon: 'img/flare.svg' }
  };

  // Robust CP874 / Windows-1251 -> Thai Unicode decoder for fallback custom strings
  function decodeThai(str) {
    if (!str || typeof str !== 'string') return '';
    if (/[\u0E00-\u0E7F]/.test(str)) return str;

    var out = '';
    for (var i = 0; i < str.length; i++) {
      var code = str.charCodeAt(i);
      if (code >= 0x0410 && code <= 0x044F) {
        var byteVal = code - 0x0410 + 0xC0;
        if (byteVal >= 0xA1 && byteVal <= 0xFB) {
          out += String.fromCharCode(0x0E00 + (byteVal - 0xA0));
          continue;
        }
      }
      if (code === 0x040E) { out += String.fromCharCode(0x0E01); continue; }
      if (code === 0x00A7) { out += String.fromCharCode(0x0E07); continue; }
      if (code === 0x0406) { out += String.fromCharCode(0x0E08); continue; }
      if (code === 0x0456) { out += String.fromCharCode(0x0E28); continue; }
      if (code === 0x045E) { out += String.fromCharCode(0x0E21); continue; }
      if (code === 0x0404) { out += String.fromCharCode(0x0E14); continue; }
      if (code === 0x0454) { out += String.fromCharCode(0x0E34); continue; }
      if (code === 0x0407) { out += String.fromCharCode(0x0E08); continue; }
      if (code === 0x0457) { out += String.fromCharCode(0x0E2F); continue; }
      if (code === 0x2116) { out += String.fromCharCode(0x0E2A); continue; }
      if (code >= 0x00A1 && code <= 0x00FB) {
        out += String.fromCharCode(0x0E00 + (code - 0xA0));
        continue;
      }
      out += str[i];
    }
    return out;
  }

  // Queue to smoothly cascade multiple toasts
  var notifyQueue = [];
  var isProcessingQueue = false;

  function processQueue() {
    if (notifyQueue.length === 0) {
      isProcessingQueue = false;
      return;
    }
    isProcessingQueue = true;
    var item = notifyQueue.shift();
    renderToastCard(item.actionType, item.itemId, item.amount, item.customName);
    setTimeout(processQueue, 150);
  }

  function renderToastCard(actionType, itemId, amount, customName) {
    var container = document.getElementById('notifyContainer');
    if (!container) return;

    var act = ACTION_CONFIG[actionType] || ACTION_CONFIG[1];
    var itemEntry = ITEM_REGISTRY[itemId];

    var itemName = '';
    var itemIcon = 'img/crate.svg';

    // 1. ALWAYS PRIORITIZE pure UTF-8 registry if itemId is valid!
    if (itemEntry && itemEntry.name) {
      itemName = itemEntry.name;
    } else if (customName && String(customName).trim().length > 0) {
      itemName = decodeThai(String(customName).trim());
    } else {
      itemName = 'ไอเทมรหัส #' + itemId;
    }

    if (itemEntry && itemEntry.icon) {
      itemIcon = itemEntry.icon;
    }

    var qty = parseInt(amount, 10);
    if (isNaN(qty) || qty < 1) qty = 1;

    // Create Card DOM element - Only ONE quantity pill showing the real item amount!
    var card = document.createElement('div');
    card.className = 'toast-card ' + act.theme;

    card.innerHTML =
      '<img class="toast-bg" src="img/toast_card_bg_v2.png?v=7" alt="Card Frame" draggable="false">' +
      '<div class="toast-badge">' +
        '<img class="toast-badge-icon" src="' + act.icon + '" alt="Action Icon" draggable="false">' +
      '</div>' +
      '<div class="toast-action-info">' +
        '<div class="toast-action-title">' + act.title + '</div>' +
        '<div class="toast-action-sub">' + act.sub + '</div>' +
      '</div>' +
      '<div class="toast-item-slot">' +
        '<img class="toast-item-img" src="' + itemIcon + '" alt="Item Graphic" draggable="false">' +
      '</div>' +
      '<div class="toast-item-name" title="' + itemName + '">' + itemName + '</div>' +
      '<div class="toast-qty-pill">x' + qty + '</div>' +
      '<div class="toast-stripes">' +
        '<span></span><span></span><span></span><span></span><span></span>' +
      '</div>';

    // Maximum 5 cards visible at any time
    while (container.children.length >= 5) {
      var oldest = container.firstElementChild;
      if (oldest) {
        oldest.classList.remove('show');
        oldest.classList.add('hide');
        oldest.remove();
      }
    }

    container.appendChild(card);

    // Trigger smooth slide-in
    requestAnimationFrame(function () {
      card.classList.add('show');
    });

    // Auto dismiss after 4 seconds
    setTimeout(function () {
      card.classList.remove('show');
      card.classList.add('hide');
      setTimeout(function () {
        if (card.parentNode) {
          card.parentNode.removeChild(card);
        }
      }, 350);
    }, 4000);
  }

  function pushNotification(actionType, itemId, amount, customName) {
    notifyQueue.push({
      actionType: actionType,
      itemId: itemId,
      amount: amount,
      customName: customName
    });
    if (!isProcessingQueue) {
      processQueue();
    }
  }

  // Bind to SA-MP open.mp CEF Event System
  if (typeof cef !== 'undefined' && cef.on) {
    cef.on('rotnotify.push', function (actionType, itemId, amount, customName) {
      pushNotification(actionType, itemId, amount, customName);
    });
  }

  // Expose global function for developer testing and external calls
  window.RotItemNotify = pushNotification;

  console.log('[ROT NOTIFY] Item Notification HUD initialized.');
})();
