/**
 * ROT CITY Shared Item Icons — ใช้ร่วมคลัง / ระบบใหม่
 * กระเป๋าเดิม (inventory v2.7) ยังใช้ไอคอนของตัวเอง
 * คลังใช้ชุดนี้ให้โทนใกล้เคียง (น้ำ / กระป๋อง / แอปเปิล / อาวุธ)
 */
(function (global) {
  /* Simple inline SVG icons matching inventory style */
  function svgWrap(inner, color) {
    return '<svg viewBox="0 0 64 64" width="40" height="40" xmlns="http://www.w3.org/2000/svg">' +
      '<g fill="none" stroke="' + color + '" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' +
      inner + '</g></svg>';
  }

  const SVG = {
    water: svgWrap(
      '<path d="M32 8 C32 8 18 28 18 38 a14 14 0 0 0 28 0 C46 28 32 8 32 8z" fill="rgba(70,180,255,0.25)"/>' +
      '<path d="M32 8 C32 8 18 28 18 38 a14 14 0 0 0 28 0 C46 28 32 8 32 8z"/>',
      "#4db8ff"),
    can: svgWrap(
      '<rect x="18" y="14" width="28" height="38" rx="4" fill="rgba(220,90,70,0.2)"/>' +
      '<path d="M18 22 h28 M18 44 h28"/><ellipse cx="32" cy="14" rx="14" ry="5"/>' +
      '<ellipse cx="32" cy="52" rx="14" ry="5"/>',
      "#e07050"),
    apple: svgWrap(
      '<path d="M32 22 c-10 0-16 10-16 20 0 10 8 16 16 16s16-6 16-16c0-10-6-20-16-20z" fill="rgba(220,70,70,0.2)"/>' +
      '<path d="M32 22 c-10 0-16 10-16 20 0 10 8 16 16 16s16-6 16-16c0-10-6-20-16-20z"/>' +
      '<path d="M32 22 c2-8 8-10 10-10"/><path d="M28 18 c4-2 8 0 10 4"/>',
      "#e05050"),
    weapon: svgWrap(
      '<path d="M20 40 L36 24 M28 32 L44 16"/><path d="M18 42 l6 6 M40 20 l6-6"/>' +
      '<circle cx="22" cy="44" r="3"/><circle cx="44" cy="18" r="3"/>',
      "#c0d0e0"),
    med: svgWrap(
      '<rect x="14" y="22" width="36" height="28" rx="4" fill="rgba(240,240,240,0.1)"/>' +
      '<path d="M14 22 h36 v28 h-36z"/><path d="M32 28 v16 M24 36 h16"/>',
      "#e8e8f0"),
    scrap: svgWrap(
      '<circle cx="32" cy="32" r="14"/><path d="M32 18 v8 M32 38 v8 M18 32 h8 M38 32 h8"/>' +
      '<circle cx="32" cy="32" r="4"/>',
      "#a0a8b0"),
    ammo: svgWrap(
      '<rect x="26" y="12" width="12" height="40" rx="3" fill="rgba(208,176,80,0.15)"/>' +
      '<path d="M26 12 h12 v40 h-12z"/><path d="M26 20 h12 M26 44 h12"/>',
      "#d0b050"),
    tool: svgWrap(
      '<path d="M20 44 L36 28 l6 6 L26 50z"/><path d="M38 26 l8-8 4 4-8 8"/><path d="M18 46 l4 4"/>',
      "#a0b0c0"),
    mask: svgWrap(
      '<path d="M16 30 c0-10 8-16 16-16s16 6 16 16 v8 c0 6-6 12-16 12s-16-6-16-12z"/>' +
      '<circle cx="24" cy="32" r="4"/><circle cx="40" cy="32" r="4"/>',
      "#d0d8e0"),
    battery: svgWrap(
      '<rect x="22" y="16" width="20" height="34" rx="3"/><path d="M28 12 h8 v4 h-8z"/><path d="M28 28 h8 M28 36 h8"/>',
      "#50c070"),
    box: svgWrap(
      '<path d="M12 24 L32 14 L52 24 L32 34 Z" fill="rgba(100,140,100,0.15)"/>' +
      '<path d="M12 24 L32 34 V52 L12 42 Z"/><path d="M52 24 L32 34 V52 L52 42 Z"/>',
      "#90a070"),
    default: svgWrap(
      '<rect x="16" y="16" width="32" height="32" rx="4"/><path d="M24 32 h16 M32 24 v16"/>',
      "#8090a0")
  };

  const ICONS = {};
  function set(id, svg, color, label) {
    ICONS[id] = { svg: svg, color: color, label: label, icon: "" };
  }

  set(0, SVG.water, "#4db8ff", "WATER");
  set(1, SVG.can, "#e07050", "FOOD");
  set(2, SVG.med, "#f0e0d0", "BANDAGE");
  set(3, SVG.med, "#70e0a0", "ANTIDOTE");
  set(4, SVG.scrap, "#a0a8b0", "SCRAP");
  set(5, SVG.ammo, "#d0c060", "AMMO");
  set(6, SVG.tool, "#e09030", "FUEL");
  set(7, SVG.water, "#5bc0ff", "WATER_L");
  set(8, SVG.can, "#ff6080", "SODA");
  set(9, SVG.battery, "#f0d040", "ENERGY");
  set(10, SVG.can, "#c09050", "BEANS");
  set(11, SVG.can, "#80b0d0", "TUNA");
  set(12, SVG.box, "#d0b080", "CRACKER");
  set(13, SVG.box, "#8b5a2b", "CHOC");
  set(14, SVG.box, "#90a070", "MRE");
  set(15, SVG.apple, "#e05050", "APPLE");
  set(16, SVG.box, "#c06060", "RAW");
  set(17, SVG.box, "#c08050", "COOKED");
  set(18, SVG.med, "#e0e0f0", "PAIN");
  set(19, SVG.med, "#e05050", "MEDKIT");
  set(20, SVG.med, "#70d0c0", "ANTISEP");
  set(21, SVG.med, "#f0c040", "VITAMIN");
  set(22, SVG.scrap, "#c0b0a0", "RAG");
  set(23, SVG.box, "#a07040", "WOOD");
  set(24, SVG.scrap, "#909090", "NAIL");
  set(25, SVG.scrap, "#606878", "TAPE");
  set(26, SVG.tool, "#b09060", "ROPE");
  set(27, SVG.battery, "#50c070", "BATTERY");
  set(28, SVG.tool, "#f0e080", "FLASH");
  set(29, SVG.tool, "#a0b0c0", "TOOLS");
  set(30, SVG.med, "#60c0e0", "FILTER");
  set(31, SVG.mask, "#d0d8e0", "MASK");
  set(32, SVG.apple, "#50b060", "HERB");
  set(33, SVG.tool, "#e08040", "MATCH");
  set(34, SVG.scrap, "#80a0c0", "PLASTIC");
  set(35, SVG.scrap, "#9098a0", "WIRE");

  for (let w = 0; w <= 46; w++) set(36 + w, SVG.weapon, "#c0d0e0", "WPN" + w);
  for (let a = 0; a < 14; a++) set(83 + a, SVG.ammo, "#d0b050", "AMMO" + a);
  set(97, SVG.mask, "#70c090", "MASK1");
  set(98, SVG.mask, "#50b0e0", "MASK2");
  set(99, SVG.mask, "#e0c050", "MASK3");
  set(100, SVG.scrap, "#8a9aaa", "STEEL");
  set(101, SVG.box, "#a08060", "BRICK");
  set(102, SVG.box, "#909090", "CEMENT");
  set(103, SVG.tool, "#b0b8c0", "HINGE");
  set(104, SVG.box, "#303030", "TIRE");
  set(105, SVG.tool, "#607080", "ENGINE");
  set(106, SVG.battery, "#50a060", "CARBAT");
  set(107, SVG.tool, "#d0c060", "CARKEY");
  set(108, SVG.tool, "#e09040", "REPAIR");
  set(109, SVG.box, "#80c0e0", "GLASS");

    const NAMES_TH = {
    0: "น้ำดื่ม",
    1: "อาหารกระป๋อง",
    2: "ผ้าพันแผล",
    3: "ยาต้านเชื้อ",
    4: "เศษเหล็ก",
    5: "กระสุน",
    6: "น้ำมัน",
    7: "น้ำดื่มขวดใหญ่",
    8: "น้ำอัดลม",
    9: "เครื่องดื่มชูกำลัง",
    10: "ถั่วกระป๋อง",
    11: "ปลาทูน่ากระป๋อง",
    12: "แครกเกอร์",
    13: "ช็อกโกแลต",
    14: "ชุดอาหารสนาม",
    15: "แอปเปิล",
    16: "เนื้อดิบ",
    17: "เนื้อปรุงสุก",
    18: "ยาแก้ปวด",
    19: "ชุดปฐมพยาบาล",
    20: "น้ำยาฆ่าเชื้อ",
    21: "วิตามิน",
    22: "เศษผ้า",
    23: "ไม้",
    24: "ตะปู",
    25: "เทปกาว",
    26: "เชือก",
    27: "แบตเตอรี่",
    28: "ไฟฉาย",
    29: "กล่องเครื่องมือ",
    30: "เครื่องกรองน้ำ",
    31: "หน้ากาก",
    32: "สมุนไพร",
    33: "ไม้ขีดไฟ",
    34: "พลาสติก",
    35: "ลวด",
    36: "ไม่มีอาวุธ",
    37: "สนับมือ",
    38: "ไม้กอล์ฟ",
    39: "กระบอง",
    40: "มีด",
    41: "ไม้เบสบอล",
    42: "พลั่ว",
    43: "ไม้พูล",
    44: "ดาบคาตานะ",
    45: "เลื่อยยนต์",
    46: "ดิลโด้สีม่วง",
    47: "ดิลโด้",
    48: "ไวเบรเตอร์",
    49: "ไวเบรเตอร์เงิน",
    50: "ดอกไม้",
    51: "ไม้เท้า",
    52: "ระเบิดมือ",
    53: "แก๊สน้ำตา",
    54: "โมโลตอฟ",
    55: "อาวุธสำรอง 19",
    56: "อาวุธสำรอง 20",
    57: "อาวุธสำรอง 21",
    58: "ปืนพก 9mm",
    59: "ปืนพกเก็บเสียง",
    60: "Desert Eagle",
    61: "ปืนลูกซอง",
    62: "ลูกซองสั้น",
    63: "ลูกซองต่อเนื่อง",
    64: "Micro Uzi",
    65: "MP5",
    66: "AK-47",
    67: "M4",
    68: "Tec-9",
    69: "ไรเฟิล",
    70: "สไนเปอร์",
    71: "RPG",
    72: "จรวดล็อกเป้า",
    73: "เครื่องพ่นไฟ",
    74: "มินิกัน",
    75: "ระเบิดติดตั้ง",
    76: "ตัวจุดระเบิด",
    77: "สเปรย์",
    78: "ถังดับเพลิง",
    79: "กล้องถ่ายรูป",
    80: "กล้องมองกลางคืน",
    81: "กล้องจับความร้อน",
    82: "ร่มชูชีพ",
    83: "กระสุน 9mm",
    84: "กระสุน 9mm เก็บเสียง",
    85: "กระสุน .50 AE",
    86: "กระสุนลูกซอง",
    87: "กระสุน SMG",
    88: "กระสุนไรเฟิลจู่โจม",
    89: "กระสุนไรเฟิลแม่นยำ",
    90: "จรวด RPG",
    91: "จรวดติดตามเป้า",
    92: "เชื้อเพลิงเครื่องพ่นไฟ",
    93: "กระสุนมินิกัน",
    94: "กระป๋องสีสเปรย์",
    95: "น้ำยาถังดับเพลิง",
    96: "ฟิล์มกล้อง",
    97: "หน้ากากกันแก๊สพิษ LV.1",
    98: "หน้ากากกันแก๊สพิษ LV.2",
    99: "หน้ากากกันแก๊สพิษ LV.3",
    100: "แผ่นเหล็ก", 101: "อิฐ", 102: "ปูนซีเมนต์", 103: "บานพับ", 104: "ยางรถ",
    105: "ชิ้นส่วนเครื่องยนต์", 106: "แบตเตอรี่รถ", 107: "กุญแจรถ", 108: "ชุดซ่อมรถ", 109: "แผ่นกระจก"
  };

  /*
   * ใส่รูปไอเทมจริงที่นี่ (path ใต้ CEF resources หรือ URL)
   * ตัวอย่าง:
   *   ICON_URLS[4] = "assets/items/scrap.png";
   *   ICON_URLS[6] = "https://cdn.example.com/rotcity/fuel.png";
   * ถ้ามี URL จะใช้ <img> แทน SVG อัตโนมัติ
   */
      const ICON_URLS = {
    0: "../rotcity-shared/assets/items/item_001.png",
    1: "../rotcity-shared/assets/items/item_002.png",
    2: "../rotcity-shared/assets/items/item_003.png",
    3: "../rotcity-shared/assets/items/item_004.png",
    4: "../rotcity-shared/assets/items/item_005.png",
    5: "../rotcity-shared/assets/items/item_006.png",
    6: "../rotcity-shared/assets/items/item_007.png",
    7: "../rotcity-shared/assets/items/item_008.png",
    8: "../rotcity-shared/assets/items/item_009.png",
    9: "../rotcity-shared/assets/items/item_010.png",
    10: "../rotcity-shared/assets/items/item_011.png",
    11: "../rotcity-shared/assets/items/item_012.png",
    12: "../rotcity-shared/assets/items/item_013.png",
    13: "../rotcity-shared/assets/items/item_014.png",
    14: "../rotcity-shared/assets/items/item_015.png",
    15: "../rotcity-shared/assets/items/item_016.png",
    16: "../rotcity-shared/assets/items/item_017.png",
    17: "../rotcity-shared/assets/items/item_018.png",
    18: "../rotcity-shared/assets/items/item_019.png",
    19: "../rotcity-shared/assets/items/item_020.png",
    20: "../rotcity-shared/assets/items/item_021.png",
    21: "../rotcity-shared/assets/items/item_022.png",
    22: "../rotcity-shared/assets/items/item_023.png",
    23: "../rotcity-shared/assets/items/item_024.png",
    24: "../rotcity-shared/assets/items/item_025.png",
    25: "../rotcity-shared/assets/items/item_026.png",
    26: "../rotcity-shared/assets/items/item_027.png",
    27: "../rotcity-shared/assets/items/item_028.png",
    28: "../rotcity-shared/assets/items/item_029.png",
    29: "../rotcity-shared/assets/items/item_030.png",
    30: "../rotcity-shared/assets/items/item_031.png",
    31: "../rotcity-shared/assets/items/item_032.png",
    32: "../rotcity-shared/assets/items/item_033.png",
    33: "../rotcity-shared/assets/items/item_034.png",
    34: "../rotcity-shared/assets/items/item_035.png",
    35: "../rotcity-shared/assets/items/item_036.png",
    36: "../rotcity-shared/assets/items/item_094.png",
    37: "../rotcity-shared/assets/items/item_061.png",
    38: "../rotcity-shared/assets/items/item_055.png",
    39: "../rotcity-shared/assets/items/item_057.png",
    40: "../rotcity-shared/assets/items/item_053.png",
    41: "../rotcity-shared/assets/items/item_054.png",
    42: "../rotcity-shared/assets/items/item_056.png",
    43: "../rotcity-shared/assets/items/item_058.png",
    44: "../rotcity-shared/assets/items/item_060.png",
    45: "../rotcity-shared/assets/items/item_051.png",
    46: "../rotcity-shared/assets/items/item_096.png",
    47: "../rotcity-shared/assets/items/item_096.png",
    48: "../rotcity-shared/assets/items/item_095.png",
    49: "../rotcity-shared/assets/items/item_095.png",
    50: "../rotcity-shared/assets/items/item_033.png",
    51: "../rotcity-shared/assets/items/item_057.png",
    52: "../rotcity-shared/assets/items/item_063.png",
    53: "../rotcity-shared/assets/items/item_069.png",
    54: "../rotcity-shared/assets/items/item_064.png",
    55: "../rotcity-shared/assets/items/item_065.png",
    56: "../rotcity-shared/assets/items/item_066.png",
    57: "../rotcity-shared/assets/items/item_068.png",
    58: "../rotcity-shared/assets/items/item_037.png",
    59: "../rotcity-shared/assets/items/item_037.png",
    60: "../rotcity-shared/assets/items/item_038.png",
    61: "../rotcity-shared/assets/items/item_042.png",
    62: "../rotcity-shared/assets/items/item_042.png",
    63: "../rotcity-shared/assets/items/item_043.png",
    64: "../rotcity-shared/assets/items/item_039.png",
    65: "../rotcity-shared/assets/items/item_039.png",
    66: "../rotcity-shared/assets/items/item_040.png",
    67: "../rotcity-shared/assets/items/item_041.png",
    68: "../rotcity-shared/assets/items/item_039.png",
    69: "../rotcity-shared/assets/items/item_044.png",
    70: "../rotcity-shared/assets/items/item_044.png",
    71: "../rotcity-shared/assets/items/item_047.png",
    72: "../rotcity-shared/assets/items/item_048.png",
    73: "../rotcity-shared/assets/items/item_049.png",
    74: "../rotcity-shared/assets/items/item_050.png",
    75: "../rotcity-shared/assets/items/item_065.png",
    76: "../rotcity-shared/assets/items/item_068.png",
    77: "../rotcity-shared/assets/items/item_071.png",
    78: "../rotcity-shared/assets/items/item_099.png",
    79: "../rotcity-shared/assets/items/item_098.png",
    80: "../rotcity-shared/assets/items/item_098.png",
    81: "../rotcity-shared/assets/items/item_098.png",
    82: "../rotcity-shared/assets/items/item_100.png",
    83: "../rotcity-shared/assets/items/item_074.png",
    84: "../rotcity-shared/assets/items/item_075.png",
    85: "../rotcity-shared/assets/items/item_076.png",
    86: "../rotcity-shared/assets/items/item_077.png",
    87: "../rotcity-shared/assets/items/item_078.png",
    88: "../rotcity-shared/assets/items/item_087.png",
    89: "../rotcity-shared/assets/items/item_088.png",
    90: "../rotcity-shared/assets/items/item_079.png",
    91: "../rotcity-shared/assets/items/item_080.png",
    92: "../rotcity-shared/assets/items/item_084.png",
    93: "../rotcity-shared/assets/items/item_085.png",
    94: "../rotcity-shared/assets/items/item_086.png",
    95: "../rotcity-shared/assets/items/item_083.png",
    96: "../rotcity-shared/assets/items/item_090.png",
    97: "../rotcity-shared/assets/items/item_091.png",
    98: "../rotcity-shared/assets/items/item_092.png",
    99: "../rotcity-shared/assets/items/item_093.png"
  };

  function getIcon(id) {
    const base = ICONS[id] || { svg: SVG.default, color: "#8090a0", label: "#" + id, icon: "•" };
    const url = ICON_URLS[id] || base.url || "";
    return { svg: base.svg, color: base.color, label: base.label, icon: base.icon, url: url };
  }
  function getName(id) {
    if (NAMES_TH[id]) return NAMES_TH[id];
    if (id >= 36 && id <= 82) return "อาวุธ #" + (id - 36);
    if (id >= 83 && id <= 96) return "กระสุนพิเศษ";
    if (id >= 97 && id <= 99) return "หน้ากากกันแก๊ส LV." + (id - 96);
    if (id >= 100 && id <= 109) {
      const base = ["แผ่นเหล็ก","อิฐ","ปูนซีเมนต์","บานพับ","ยางรถ","ชิ้นส่วนเครื่องยนต์","แบตเตอรี่รถ","กุญแจรถ","ชุดซ่อมรถ","แผ่นกระจก"];
      return base[id - 100];
    }
    return "ไอเทม #" + id;
  }
  function iconHTML(id, size) {
    const ic = getIcon(id);
    const s = size || 40;
    const fallback = ic.svg || ('<span style="font-size:' + Math.round(s * 0.55) + 'px">' + (ic.icon || "📦") + '</span>');
    if (ic.url) {
      const escapedFallback = fallback.replace(/"/g, '&quot;').replace(/'/g, "\\'");
      return '<img class="ri-img" src="' + ic.url + '" width="' + s + '" height="' + s +
        '" alt="" style="object-fit:contain;image-rendering:auto;" onerror="this.onerror=null;this.parentElement.innerHTML=\'' + escapedFallback + '\'"/>';
    }
    return fallback;
  }
  function slotHTML(id, amount) {
    const name = getName(id);
    return (
      '<div class="ri-icon">' + iconHTML(id, 40) + '</div>' +
      '<div class="ri-name">' + name + '</div>' +
      '<div class="ri-qty">x' + amount + '</div>'
    );
  }

  global.RotItems = {
    ICONS: ICONS,
    ICON_URLS: ICON_URLS,
    getIcon: getIcon,
    getName: getName,
    iconHTML: iconHTML,
    slotHTML: slotHTML,
    setIconUrl: function (id, url) { ICON_URLS[id] = url; }
  };
  global.RotItemIcons = {
    name: getName,
    iconHtml: iconHTML,
    getIcon: getIcon,
    getName: getName,
    iconHTML: iconHTML
  };
})(typeof window !== "undefined" ? window : this);
