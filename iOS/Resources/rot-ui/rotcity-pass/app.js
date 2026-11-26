(() => {
  const cef = window.cef || null;
  const el = (id) => document.getElementById(id);
  let state = { xp: 0, xpMax: 100, level: 1, maxLevel: 10, premium: 0, claimFree: 0, claimPrem: 0, merit: 0, cp: 0, premCost: 2500, stdCost: 500, bioCost: 10 };
  let toastTimer = null;

  function emit(action) { if (cef && typeof cef.emit === 'function') cef.emit('rotpass.action', String(action)); }
  function showToast(type, msg) {
    const t = el('toast');
    t.className = 'toast ' + (type === 'error' ? 'error' : 'success');
    t.textContent = msg;
    t.hidden = !msg;
    clearTimeout(toastTimer);
    if (msg) toastTimer = setTimeout(() => { t.hidden = true; }, 4000);
  }

  function render() {
    el('meritVal').textContent = Number(state.merit || 0).toLocaleString();
    el('cpVal').textContent = Number(state.cp || 0).toLocaleString();
    el('passLevel').textContent = 'LV.' + (state.level || 1);
    const pct = Math.min(100, Math.round(((state.xp || 0) / Math.max(1, state.xpMax || 100)) * 100));
    el('passXpFill').style.width = pct + '%';
    el('passXpText').textContent = `${state.xp || 0} / ${state.xpMax || 100} XP (ฆ่าซอมบี้เพื่อสะสม Pass XP)`;
    const premBtn = el('btnUnlockPrem');
    premBtn.disabled = !!state.premium;
    premBtn.textContent = state.premium ? 'ปลดล็อก Premium Pass แล้ว' : `ปลดล็อก Premium Pass (${Number(state.premCost||2500).toLocaleString()} แต้ม)`;

    const grid = el('tierList');
    grid.innerHTML = '';
    const maxT = Number(state.maxLevel || 10);
    for (let t = 1; t <= maxT; t++) {
      const bit = 1 << (t - 1);
      const reached = (state.level || 1) >= t;
      const gotFree = (state.claimFree & bit) !== 0;
      const gotPrem = (state.claimPrem & bit) !== 0;
      const card = document.createElement('div');
      card.className = 'tier-card' + (reached ? ' unlocked' : '');
      card.innerHTML = `<div class="tier-title">Tier ${t}</div><div class="sub">ฟรี: +${150 + t * 50} แต้ม</div><div class="sub">พรีเมียม: +${350 + t * 100} แต้ม${t >= 5 ? ' +3 CP' : ''}</div>`;

      const bFree = document.createElement('button');
      bFree.className = 'btn btn-primary';
      bFree.textContent = gotFree ? 'รับฟรีแล้ว' : 'รับรางวัลฟรี';
      bFree.disabled = !reached || gotFree;
      bFree.onclick = () => emit('claim_free:' + t);

      const bPrem = document.createElement('button');
      bPrem.className = 'btn btn-amber';
      bPrem.textContent = gotPrem ? 'รับพรีเมียมแล้ว' : 'รับพรีเมียม';
      bPrem.disabled = !reached || !state.premium || gotPrem;
      bPrem.onclick = () => emit('claim_prem:' + t);

      card.appendChild(bFree);
      card.appendChild(bPrem);
      grid.appendChild(card);
    }
  }

  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.dataset.tab;
      el('tab-pass').hidden = target !== 'pass';
      el('tab-crate').hidden = target !== 'crate';
    });
  });

  el('btnUnlockPrem').addEventListener('click', () => emit('unlock_premium'));
  el('btnCrateStd').addEventListener('click', () => emit('crate_std'));
  el('btnCrateBio').addEventListener('click', () => emit('crate_bio'));
  el('btnClose').addEventListener('click', () => emit('close'));
  el('btnRefresh').addEventListener('click', () => emit('refresh'));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') emit('close'); });

  if (cef) {
    cef.on('rotpass.sync', (p) => { try { state = { ...state, ...(typeof p === 'string' ? JSON.parse(p) : p) }; render(); } catch (e) {} });
    cef.on('rotpass.notify', (p) => { try { const n = typeof p === 'string' ? JSON.parse(p) : p; showToast(n.type, n.msg); } catch (e) {} });
    cef.on('rotpass.crate', (p) => {
      try {
        const r = typeof p === 'string' ? JSON.parse(p) : p;
        el('crateRewardName').textContent = r.name || '-';
        el('crateResult').hidden = false;
      } catch (e) {}
    });
    cef.emit('rotpass.ready');
  } else {
    render();
  }
})();
