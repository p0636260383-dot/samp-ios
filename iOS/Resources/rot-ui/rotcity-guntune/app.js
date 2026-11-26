(function () {
  const WPN_NAMES = {
    22: '9mm Pistol', 23: 'Silenced 9mm', 24: 'Desert Eagle',
    25: 'Pump Shotgun', 26: 'Sawed-off Shotgun', 27: 'Combat Shotgun',
    28: 'Micro Uzi', 29: 'MP5', 30: 'AK-47', 31: 'M4 Carbine',
    32: 'Tec-9', 33: 'Country Rifle', 34: 'Sniper Rifle',
    35: 'RPG', 36: 'Heat-Seeker', 37: 'Flamethrower', 38: 'Minigun'
  };

  const SLOTS = [
    {
      slot: 0,
      name: 'ลำกล้องเสริม (Extended Barrel)',
      desc: 'เพิ่มความแรงกระสุน +5% ต่อเลเวล (Lv.1–Lv.5 สูงสุด +25%)',
      invKey: 'itB',
      lvKey: 'bLv',
      effectText: (lv) => lv > 0 ? `ดาเมจ +${lv * 5}%` : 'ยังไม่ติดตั้ง (Lv.1 = +5%)',
      svg: `<svg width="32" height="32" viewBox="0 0 32 32" fill="none"><path d="M4 14h18l4-2h2v8h-2l-4-2H4v-4z" stroke="#38bdf8" stroke-width="2" fill="rgba(56,189,248,0.18)"/><line x1="9" y1="14" x2="9" y2="18" stroke="#bae6fd" stroke-width="2"/><line x1="15" y1="14" x2="15" y2="18" stroke="#bae6fd" stroke-width="2"/></svg>`
    },
    {
      slot: 1,
      name: 'ชุดเก็บเสียง (Tactical Suppressor)',
      desc: 'ลดระยะเสียงปืนดึงดูดซอมบี้ จาก 95 ม. เหลือ 25 ม. (Lv.5 = 5 ม.)',
      invKey: 'itS',
      lvKey: 'sLv',
      effectText: (lv) => lv > 0 ? `ระยะเสียง ${Math.max(5, 30 - lv * 5)} ม.` : 'ปกติ 95 ม. (Lv.1 = 25 ม.)',
      svg: `<svg width="32" height="32" viewBox="0 0 32 32" fill="none"><rect x="4" y="12" width="19" height="8" rx="3" stroke="#34d399" stroke-width="2" fill="rgba(52,211,153,0.18)"/><path d="M25 13c2 1.5 2 4.5 0 6" stroke="#6ee7b7" stroke-width="2" stroke-linecap="round"/><line x1="9" y1="12" x2="9" y2="20" stroke="#a7f3d0" stroke-width="1.5"/></svg>`
    },
    {
      slot: 2,
      name: 'สปริงและชุดลั่นไก (Match Trigger)',
      desc: 'ลดโอกาสปืนสึกหรอ/ขัดลำกล้อง -4% ต่อเลเวล (Lv.5 = -20%)',
      invKey: 'itR',
      lvKey: 'rLv',
      effectText: (lv) => lv > 0 ? `ลดสึกหรอ -${lv * 4}%` : 'ยังไม่ติดตั้ง (Lv.1 = -4%)',
      svg: `<svg width="32" height="32" viewBox="0 0 32 32" fill="none"><path d="M8 8l4 4-4 4 4 4-4 4" stroke="#fbbf24" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="21" cy="16" r="5" stroke="#fde68a" stroke-width="2" fill="rgba(251,191,36,0.18)"/></svg>`
    },
    {
      slot: 3,
      name: 'สายสะพาย/เกราะกันกระสุน (Armor Sling)',
      desc: 'ลดดาเมจที่ได้รับจากซอมบี้และผู้เล่น -5% ต่อเลเวล (Lv.5 = -25%)',
      invKey: 'itA',
      lvKey: 'aLv',
      effectText: (lv) => lv > 0 ? `ลดดาเมจที่ได้รับ -${lv * 5}%` : 'ยังไม่ติดตั้ง (Lv.1 = -5%)',
      svg: `<svg width="32" height="32" viewBox="0 0 32 32" fill="none"><path d="M16 4l9 4v7c0 6-3.8 10.6-9 13-5.2-2.4-9-7-9-13V8l9-4z" stroke="#a78bfa" stroke-width="2" fill="rgba(167,139,250,0.18)"/><path d="M12 16l3 3 5-6" stroke="#ddd6fe" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`
    }
  ];

  const $ = (id) => document.getElementById(id);

  function sendAction(act) {
    if (typeof cef !== 'undefined' && cef && typeof cef.emit === 'function') {
      cef.emit('rotguntune.action', act);
    }
  }

  function render(st) {
    const wId = Number(st.wpnId || 0);
    const wLv = Number(st.wpnLv || 1);
    const dura = Number(st.dura || 0);
    const maxDura = Math.max(1, Number(st.maxDura || 100));
    const heldGun = wId >= 22 && wId <= 38;

    $('resScrap').textContent = String(st.scrap || 0);
    $('resMerit').textContent = String(st.merit || 0);
    $('wpnLvBadge').textContent = `LV.${wLv}`;
    $('wpnName').textContent = heldGun ? (WPN_NAMES[wId] || `Weapon #${wId}`) : 'ยังไม่ได้ถือปืนในมือ';
    $('wpnHint').textContent = heldGun
      ? 'พร้อมติดตั้ง/อัปเกรดชุดแต่ง (เสริมความสามารถตามระดับ Lv.1–Lv.5)'
      : 'กรุณาถือปืน (ID 22–38) ในมือ แล้วกดรีเฟรช';
    $('wpnDuraText').textContent = `${dura} / ${maxDura}`;
    $('wpnDuraBar').style.width = `${Math.min(100, Math.round((dura / maxDura) * 100))}%`;

    $('wpnPreviewIcon').innerHTML = `<svg width="72" height="44" viewBox="0 0 72 44" fill="none">
      <path d="M8 18h36l6-4h14v6H52l-4 4H34l-3 10h-7l2-10H16l-4 6H6l2-12z" stroke="${heldGun ? '#22d3ee' : '#475569'}" stroke-width="2" fill="rgba(34,211,238,0.12)"/>
    </svg>`;

    const bLv = Number(st.bLv || 0);
    const sLv = Number(st.sLv || 0);
    const rLv = Number(st.rLv || 0);
    const aLv = Number(st.aLv || 0);
    const noiseDist = sLv > 0 ? Math.max(5, 30 - sLv * 5) : 95;

    $('statDmg').textContent = `+${bLv * 5}%`;
    $('barDmg').style.width = `${(bLv / 5) * 100}%`;
    $('statNoise').textContent = `${noiseDist} ม.`;
    $('barNoise').style.width = `${sLv > 0 ? Math.min(100, 40 + sLv * 12) : 10}%`;
    $('statWear').textContent = `-${rLv * 4}%`;
    $('barWear').style.width = `${(rLv / 5) * 100}%`;
    $('statDef').textContent = `-${aLv * 5}%`;
    $('barDef').style.width = `${(aLv / 5) * 100}%`;

    const grid = $('slotsGrid');
    grid.innerHTML = '';
    SLOTS.forEach((cfg) => {
      const lv = Number(st[cfg.lvKey] || 0);
      const owned = Number(st[cfg.invKey] || 0);
      const nextLv = lv + 1;
      const isMax = lv >= 5;
      const scrapNeed = nextLv * 2;
      const meritNeed = nextLv * 100;
      const canInstall = heldGun && !isMax && owned >= 1 && (st.scrap || 0) >= scrapNeed && (st.merit || 0) >= meritNeed;

      const card = document.createElement('div');
      card.className = `slot-card ${lv > 0 ? 'installed' : ''}`;
      let pipsHtml = '';
      for (let i = 1; i <= 5; i++) {
        pipsHtml += `<div class="pip ${i <= lv ? 'on' : ''}"></div>`;
      }

      card.innerHTML = `
        <div class="slot-top">
          <div class="slot-ico">${cfg.svg}</div>
          <div>
            <div class="slot-name">${cfg.name} ${lv > 0 ? `<span style="color:#22d3ee">[Lv.${lv}]</span>` : ''}</div>
            <div class="slot-desc">${cfg.desc}</div>
            <div class="slot-effect">ผลลัพธ์ปัจจุบัน: ${cfg.effectText(lv)}</div>
          </div>
        </div>
        <div class="pips">${pipsHtml}</div>
        <div class="slot-meta">
          <span>ชิ้นส่วนในกระเป๋า: <strong>${owned}</strong></span>
          <span>${isMax ? 'ระดับสูงสุดแล้ว' : `อัปเกรด Lv.${nextLv}: เศษเหล็ก ${scrapNeed} + ${meritNeed} แต้ม`}</span>
        </div>
        <div class="slot-actions">
          <button class="btn-primary" ${canInstall ? '' : 'disabled'}>${isMax ? 'MAX LV.5' : (lv === 0 ? 'ติดตั้ง (Lv.1)' : `อัปเกรด (Lv.${nextLv})`)}</button>
          <button class="btn-remove" ${heldGun && lv > 0 ? '' : 'disabled'}>ถอด</button>
        </div>
      `;

      const [btnInstall, btnRemove] = card.querySelectorAll('button');
      btnInstall.addEventListener('click', () => sendAction(`install:${cfg.slot}`));
      btnRemove.addEventListener('click', () => sendAction(`remove:${cfg.slot}`));
      grid.appendChild(card);
    });
  }

  $('btnClose').addEventListener('click', () => sendAction('close'));
  $('btnRefresh').addEventListener('click', () => sendAction('refresh'));
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') sendAction('close');
  });

  if (typeof cef !== 'undefined' && cef && typeof cef.on === 'function') {
    cef.on('rotguntune.state', (raw) => {
      try {
        const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
        render(data);
      } catch (e) { console.error(e); }
    });
    cef.emit('rotguntune.ready', '1');
  } else {
    render({ wpnId: 31, wpnLv: 2, dura: 110, maxDura: 125, bLv: 2, sLv: 1, rLv: 1, aLv: 0, itB: 2, itS: 1, itR: 1, itA: 0, scrap: 18, merit: 520 });
  }
})();
