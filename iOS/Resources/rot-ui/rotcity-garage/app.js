(() => {
  const cef = window.cef || null;
  const el = (id) => document.getElementById(id);

  let state = {
    merit: 0,
    scrap: 0,
    recoverMerit: 500,
    recoverScrap: 5,
    vehicles: []
  };
  let toastTimer = null;

  function emitAction(action) {
    if (cef && typeof cef.emit === 'function') {
      cef.emit('rotgarage.action', String(action));
    }
  }

  function showToast(type, message) {
    const t = el('toast');
    if (!t) return;
    t.className = 'toast ' + (type === 'error' ? 'error' : 'success');
    t.textContent = String(message || '');
    t.hidden = !message;
    clearTimeout(toastTimer);
    if (message) {
      toastTimer = setTimeout(() => { t.hidden = true; }, 4200);
    }
  }

  function render() {
    el('meritValue').textContent = Number(state.merit || 0).toLocaleString();
    el('scrapValue').textContent = Number(state.scrap || 0).toLocaleString();
    el('recoverCostText').textContent = `${state.recoverMerit} แต้มผลงาน + ${state.recoverScrap} เศษเหล็ก`;

    const list = Array.isArray(state.vehicles) ? state.vehicles : [];
    const stored = list.filter((v) => v.s === 1).length;
    const world = list.filter((v) => v.s === 0).length;
    const wreck = list.filter((v) => v.s === 2).length;

    el('totalCount').textContent = String(list.length);
    el('storedCount').textContent = String(stored);
    el('worldCount').textContent = String(world);
    el('wreckCount').textContent = String(wreck);

    const grid = el('vehicleList');
    grid.innerHTML = '';

    if (list.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML = '<strong>ยังไม่มีรถถาวรในบัญชี</strong><br/>คุณสามารถคราฟต์รถได้ที่อู่ประกอบยานพาหนะ แล้วนำมาเก็บในโรงรถนี้ได้';
      grid.appendChild(empty);
      return;
    }

    for (const v of list) {
      const card = document.createElement('article');
      card.className = 'vehicle-card';

      const hpRaw = Math.max(0, Math.min(1000, Number(v.h || 0)));
      const hpPct = Math.round((hpRaw / 1000) * 100);
      const fuelPct = Math.max(0, Math.min(100, Math.round(Number(v.f || 0))));

      let statusText = 'อยู่ในโลกเกม';
      let statusCls = 'world';
      if (v.s === 1) { statusText = 'เก็บในโรงรถ'; statusCls = 'stored'; }
      else if (v.s === 2 || hpRaw <= 250) { statusText = 'ซากรถพัง'; statusCls = 'wrecked'; }

      card.innerHTML = `
        <div class="card-head">
          <div>
            <div class="veh-title">${escapeHtml(v.n || ('Model #' + v.m))}</div>
            <div class="veh-sub">ID #${v.id} • รุ่น ${v.m} • ${v.l ? 'ล็อกอยู่' : 'ปลดล็อก'}</div>
          </div>
          <span class="status-pill ${statusCls}">${statusText}</span>
        </div>
        <div class="meter-row">
          <div class="meter-label"><span>น้ำมันเชื้อเพลิง</span><span>${fuelPct}%</span></div>
          <div class="meter-track"><div class="meter-fill fuel" style="width:${fuelPct}%"></div></div>
          <div class="meter-label"><span>สภาพตัวถัง</span><span>${hpPct}% (${hpRaw} HP)</span></div>
          <div class="meter-track"><div class="meter-fill hp ${hpPct <= 30 ? 'low' : ''}" style="width:${hpPct}%"></div></div>
        </div>
        <div class="coords">พิกัดล่าสุด: X ${Number(v.x || 0).toFixed(1)} • Y ${Number(v.y || 0).toFixed(1)} • Z ${Number(v.z || 0).toFixed(1)}</div>
      `;

      const actions = document.createElement('div');
      actions.className = 'card-actions';

      if (v.s === 1) {
        const btnSpawn = makeBtn('เบิกรถออกโรงรถ', 'btn btn-primary', () => emitAction('spawn:' + v.id));
        actions.appendChild(btnSpawn);
      } else if (v.s === 2 || hpRaw <= 250) {
        const btnRecover = makeBtn(`กู้ซากรถ (${state.recoverMerit} แต้ม / ${state.recoverScrap} เหล็ก)`, 'btn btn-recover', () => emitAction('recover:' + v.id));
        actions.appendChild(btnRecover);
      } else {
        const btnStore = makeBtn(v.cs ? 'เก็บเข้าโรงรถ' : 'เก็บรถ (จอดใกล้ 35 ม.)', 'btn btn-store', () => emitAction('store:' + v.id));
        btnStore.disabled = !v.cs;
        actions.appendChild(btnStore);

        const btnGps = makeBtn('ปักหมุด GPS', 'btn btn-gps', () => emitAction('locate:' + v.id));
        actions.appendChild(btnGps);
      }

      card.appendChild(actions);
      grid.appendChild(card);
    }
  }

  function makeBtn(label, cls, onClick) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = cls;
    b.textContent = label;
    b.addEventListener('click', onClick);
    return b;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  el('btnClose').addEventListener('click', () => emitAction('close'));
  el('btnRefresh').addEventListener('click', () => emitAction('refresh'));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') emitAction('close');
  });

  if (cef) {
    cef.on('rotgarage.sync', (payload) => {
      try {
        const data = typeof payload === 'string' ? JSON.parse(payload) : payload;
        if (data && typeof data === 'object') {
          state = { ...state, ...data };
          render();
        }
      } catch (e) {}
    });
    cef.on('rotgarage.notify', (payload) => {
      try {
        const n = typeof payload === 'string' ? JSON.parse(payload) : payload;
        if (n && n.msg) showToast(n.type, n.msg);
      } catch (e) {}
    });
    cef.emit('rotgarage.ready');
  } else {
    state.vehicles = [
      { id: 1, m: 560, n: 'Sultan', f: 78, h: 920, s: 1, x: 1480.2, y: -1720.5, z: 13.5, l: 1, cs: 0 },
      { id: 2, m: 522, n: 'NRG-500', f: 42, h: 180, s: 2, x: 2100.0, y: -1100.4, z: 24.1, l: 0, cs: 0 }
    ];
    render();
  }
})();
