(() => {
  const cef = window.cef || null;
  const el = (id) => document.getElementById(id);
  let state = { boss: { active: 0, name: 'Titan Bio-Boss', hp: 0, maxHp: 5000, x: 0, y: 0, z: 0 }, myDmg: 0, damagers: [], topPlayers: [], topGuilds: [] };
  let toastTimer = null;

  function emit(action) { if (cef && typeof cef.emit === 'function') cef.emit('rotraid.action', String(action)); }
  function showToast(type, msg) {
    const t = el('toast');
    t.className = 'toast ' + (type === 'error' ? 'error' : 'success');
    t.textContent = msg;
    t.hidden = !msg;
    clearTimeout(toastTimer);
    if (msg) toastTimer = setTimeout(() => { t.hidden = true; }, 4000);
  }
  function esc(s) { return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  function render() {
    const b = state.boss || {};
    el('bossName').textContent = b.name || 'Titan Bio-Boss';
    el('bossStatus').textContent = b.active ? `กำลังอาละวาดอยู่ที่พิกัด (${Number(b.x||0).toFixed(1)}, ${Number(b.y||0).toFixed(1)})` : 'ยังไม่มีบอสเกิดในขณะนี้ (แอดมินใช้ /startraid)';
    const maxHp = Math.max(1, Number(b.maxHp || 5000));
    const hp = Math.max(0, Number(b.hp || 0));
    el('bossHpFill').style.width = (b.active ? Math.round((hp / maxHp) * 100) : 0) + '%';
    el('bossHpText').textContent = `${hp.toLocaleString()} / ${maxHp.toLocaleString()} HP`;
    el('myDmg').textContent = Number(state.myDmg || 0).toLocaleString();

    const dl = el('damagerList');
    dl.innerHTML = (state.damagers && state.damagers.length)
      ? state.damagers.map((d, i) => `<div class="rank-row"><span><span class="rank-num">#${i+1}</span>${esc(d.n)}</span><strong>${Number(d.d||0).toLocaleString()} DMG</strong></div>`).join('')
      : '<div class="rank-row"><span>ยังไม่มีผู้ทำดาเมจในรอบนี้</span></div>';

    const tp = el('topPlayers');
    tp.innerHTML = (state.topPlayers && state.topPlayers.length)
      ? state.topPlayers.map((p, i) => `<div class="rank-row"><span><span class="rank-num">#${i+1}</span>${esc(p.n)}</span><span>ฆ่าซอมบี้ <strong>${Number(p.k||0).toLocaleString()}</strong> • ${Number(p.m||0).toLocaleString()} แต้ม</span></div>`).join('')
      : '<div class="rank-row"><span>ยังไม่มีข้อมูลผู้เล่น</span></div>';

    const tg = el('topGuilds');
    tg.innerHTML = (state.topGuilds && state.topGuilds.length)
      ? state.topGuilds.map((g, i) => `<div class="rank-row"><span><span class="rank-num">#${i+1}</span>[${esc(g.t)}] ${esc(g.n)}</span><span>LV.${g.l} (${Number(g.e||0).toLocaleString()} EXP)</span></div>`).join('')
      : '<div class="rank-row"><span>ยังไม่มีข้อมูลกิลด์</span></div>';
  }

  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.dataset.tab;
      el('tab-boss').hidden = target !== 'boss';
      el('tab-players').hidden = target !== 'players';
      el('tab-guilds').hidden = target !== 'guilds';
    });
  });

  el('btnGps').addEventListener('click', () => emit('gps'));
  el('btnClose').addEventListener('click', () => emit('close'));
  el('btnRefresh').addEventListener('click', () => emit('refresh'));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') emit('close'); });

  if (cef) {
    cef.on('rotraid.sync', (p) => { try { state = { ...state, ...(typeof p === 'string' ? JSON.parse(p) : p) }; render(); } catch (e) {} });
    cef.on('rotraid.notify', (p) => { try { const n = typeof p === 'string' ? JSON.parse(p) : p; showToast(n.type, n.msg); } catch (e) {} });
    cef.emit('rotraid.ready');
  } else {
    render();
  }
})();
