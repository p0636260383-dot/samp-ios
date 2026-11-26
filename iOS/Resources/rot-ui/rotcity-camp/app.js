(() => {
  const cef = window.cef || null;
  const el = (id) => document.getElementById(id);

  function emit(act) {
    if (cef && typeof cef.emit === 'function') cef.emit('rotcamp.action', String(act));
  }

  function render(s) {
    if (!s) return;
    el('rScrap').textContent = Number(s.scrap || 0);
    el('rRag').textContent = Number(s.rag || 0);
    el('rWood').textContent = Number(s.wood || 0);
    el('rRaw').textContent = Number(s.rawMeat || 0);
    el('rCooked').textContent = Number(s.cookedMeat || 0);
    el('rMoney').textContent = '$' + Number(s.money || 0).toLocaleString();

    const wpnId = Number(s.wpnId || 0);
    const lv = Number(s.wpnLv || 1);
    const dura = Number(s.dura || 0);
    const maxD = Math.max(1, Number(s.maxDura || 100));
    el('wpnLvBadge').textContent = 'LV.' + lv;
    el('wpnName').textContent = wpnId > 0 ? ('อาวุธที่ถือ (Weapon ID: ' + wpnId + ')') : 'กรุณาถืออาวุธไว้ในมือ';
    el('wpnBonus').textContent = `ความทนทานสูงสุด ${maxD} • ลดสึกหรอ -${(lv - 1) * 4}%`;
    el('duraFill').style.width = Math.min(100, Math.round((dura / maxD) * 100)) + '%';
    el('duraText').textContent = `ความทนทาน: ${dura} / ${maxD}`;
    el('upgCostText').textContent = lv >= 5
      ? 'ระดับสูงสุดแล้ว (Lv.5)'
      : `อัปเกรดถัดไป: เศษเหล็ก ${s.scrapCost} + $${Number(s.meritCost || 0).toLocaleString()}`;

    const items = [
      { id: 23, name: 'ไม้ (Wood)', qty: s.wood, out: 'เศษเหล็ก +2' },
      { id: 24, name: 'ตะปู (Nail)', qty: s.nail, out: 'เศษเหล็ก +2' },
      { id: 6,  name: 'น้ำมัน (Fuel)', qty: s.fuel, out: 'เศษเหล็ก +2' },
      { id: 0,  name: 'น้ำดื่ม (Water)', qty: s.water, out: 'เศษเหล็ก +1' },
      { id: 1,  name: 'อาหาร (Food)', qty: s.food, out: 'เศษเหล็ก +1' },
      { id: 2,  name: 'ผ้าพันแผล (Bandage)', qty: s.bandage, out: 'ผ้า +2' }
    ];
    el('recycleList').innerHTML = items.map((it) => `
      <div class="rec-row">
        <div>
          <span>${it.name} (มี ${Number(it.qty || 0)} ชิ้น)</span>
          <small>ย่อย 1 ชิ้น → ${it.out}</small>
        </div>
        <button class="btn btn-cyan" onclick="window.__recycle(${it.id})" ${Number(it.qty || 0) < 1 ? 'disabled style="opacity:0.4"' : ''}>ย่อย x1</button>
      </div>
    `).join('');
  }

  window.__recycle = (id) => emit('recycle:' + id);

  document.querySelectorAll('.tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
      btn.classList.add('active');
      const target = btn.dataset.tab;
      ['bench', 'fire', 'recycle'].forEach((n) => {
        el('tab-' + n).hidden = n !== target;
      });
    });
  });

  el('btnClose').addEventListener('click', () => emit('close'));
  el('btnRefresh').addEventListener('click', () => emit('refresh'));
  el('btnUpgrade').addEventListener('click', () => emit('upgrade_wpn'));
  el('btnRepair').addEventListener('click', () => emit('repair_wpn'));
  el('btnPlaceFire').addEventListener('click', () => emit('place_fire'));
  el('btnCookMeat').addEventListener('click', () => emit('cook_meat'));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') emit('close'); });

  if (cef) {
    cef.on('rotcamp.state', (raw) => {
      try { render(typeof raw === 'string' ? JSON.parse(raw) : raw); } catch (_) {}
    });
    if (typeof cef.emit === 'function') cef.emit('rotcamp.ready', '1');
  }
})();
