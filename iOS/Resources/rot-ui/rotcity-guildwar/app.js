(() => {
  const cef = window.cef || null;
  const el = (id) => document.getElementById(id);
  let state = { warActive: 1, guildId: 0, guildName: '-', guildRole: 0, playerMerit: 0, bankMerit: 0, zones: [], bankItems: [], bagItems: [] };
  let toastTimer = null;

  function emit(action) {
    if (cef && typeof cef.emit === 'function') cef.emit('rotgwar.action', String(action));
  }

  function showToast(type, msg) {
    const t = el('toast');
    t.className = 'toast ' + (type === 'error' ? 'error' : 'success');
    t.textContent = msg;
    t.hidden = !msg;
    clearTimeout(toastTimer);
    if (msg) toastTimer = setTimeout(() => { t.hidden = true; }, 4000);
  }

  function render() {
    el('guildName').textContent = state.guildName || 'ยังไม่มีกิลด์';
    el('bankMerit').textContent = Number(state.bankMerit || 0).toLocaleString();
    el('bankMerit2').textContent = Number(state.bankMerit || 0).toLocaleString();
    el('playerMerit').textContent = Number(state.playerMerit || 0).toLocaleString();

    const zGrid = el('zoneList');
    zGrid.innerHTML = '';
    if (!state.zones || state.zones.length === 0) {
      zGrid.innerHTML = '<div class="card"><h3>ยังไม่มีโซนยึดพื้นที่</h3><p class="sub">แอดมินสามารถวางโซนได้ด้วยคำสั่ง /placezone [ชื่อ]</p></div>';
    } else {
      for (const z of state.zones) {
        const c = document.createElement('div');
        c.className = 'card';
        c.innerHTML = `<h3>${esc(z.n)}</h3><p class="sub">ผู้ครอบครอง: <strong>${esc(z.o)}</strong></p><p class="sub">ความคืบหน้า: ${z.p}% • พิกัด (${z.x}, ${z.y})</p><div class="bar"><div style="width:${z.p}%"></div></div>`;
        const b = document.createElement('button');
        b.className = 'btn btn-primary';
        b.textContent = 'ปักหมุด GPS ไปยังโซน';
        b.onclick = () => emit('locate:' + z.id);
        c.appendChild(b);
        zGrid.appendChild(c);
      }
    }

    const bList = el('bankItems');
    bList.innerHTML = '';
    if (!state.bankItems || state.bankItems.length === 0) {
      bList.innerHTML = '<div class="item-row"><span>ยังไม่มีไอเทมในคลังกิลด์</span></div>';
    } else {
      for (const it of state.bankItems) {
        const r = document.createElement('div');
        r.className = 'item-row';
        r.innerHTML = `<span>${esc(it.n)} (x${it.q})</span>`;
        const b = document.createElement('button');
        b.className = 'btn btn-amber';
        b.textContent = 'ถอน 1';
        b.onclick = () => emit('withdraw_item:' + it.id);
        r.appendChild(b);
        bList.appendChild(r);
      }
    }

    const bagList = el('bagItems');
    bagList.innerHTML = '';
    if (!state.bagItems || state.bagItems.length === 0) {
      bagList.innerHTML = '<div class="item-row"><span>ไม่มีไอเทมในกระเป๋า</span></div>';
    } else {
      for (const it of state.bagItems) {
        const r = document.createElement('div');
        r.className = 'item-row';
        r.innerHTML = `<span>${esc(it.n)} (x${it.q})</span>`;
        const b = document.createElement('button');
        b.className = 'btn btn-primary';
        b.textContent = 'ฝาก 1';
        b.onclick = () => emit('deposit_item:' + it.id);
        r.appendChild(b);
        bagList.appendChild(r);
      }
    }
  }

  function esc(s) {
    return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.dataset.tab;
      el('tab-zones').hidden = target !== 'zones';
      el('tab-bank').hidden = target !== 'bank';
    });
  });

  document.querySelectorAll('[data-act]').forEach((btn) => {
    btn.addEventListener('click', () => emit(btn.dataset.act));
  });

  el('btnClose').addEventListener('click', () => emit('close'));
  el('btnRefresh').addEventListener('click', () => emit('refresh'));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') emit('close'); });

  if (cef) {
    cef.on('rotgwar.sync', (p) => { try { state = { ...state, ...(typeof p === 'string' ? JSON.parse(p) : p) }; render(); } catch (e) {} });
    cef.on('rotgwar.notify', (p) => { try { const n = typeof p === 'string' ? JSON.parse(p) : p; showToast(n.type, n.msg); } catch (e) {} });
    cef.emit('rotgwar.ready');
  } else {
    render();
  }
})();
