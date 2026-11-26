(() => {
  const cef = window.cef || null;
  const el = (id) => document.getElementById(id);

  let currentRankTab = 'kills';
  let ranks = { kills: [], levels: [], money: [], guilds: [] };

  function emit(action) {
    if (cef && typeof cef.emit === 'function') cef.emit('rotpda.action', String(action));
  }

  function esc(s) {
    return String(s || '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function renderProfile(p) {
    if (!p) return;
    el('pName').textContent = p.name || 'Survivor';
    el('pGuild').textContent = 'กิลด์: ' + (p.guild || 'ไม่มีกิลด์');
    el('pLevel').textContent = Number(p.level || 1);
    el('pExp').textContent = Number(p.exp || 0).toLocaleString() + ' EXP';
    el('pKills').textContent = Number(p.kills || 0).toLocaleString();
    el('pBossKills').textContent = Number(p.bossKills || 0).toLocaleString();
    el('pMoney').textContent = '$' + Number(p.money || 0).toLocaleString();
    el('pPoints').textContent = Number(p.points || 0).toLocaleString() + ' CP';
    el('pHp').textContent = Number(p.hp || 100);
    el('pDeaths').textContent = Number(p.deaths || 0).toLocaleString();
    el('btnToggleHud').textContent = p.hudHidden ? 'แสดง HUD' : 'ซ่อน HUD';
    el('btnToggleSigns').textContent = p.signHidden ? 'แสดงป้าย' : 'ซ่อนป้าย';
  }

  function renderRanks() {
    const list = ranks[currentRankTab] || [];
    const box = el('rankList');
    if (!list.length) {
      box.innerHTML = '<div class="rank-row"><span>ยังไม่มีข้อมูลอันดับในระบบ</span></div>';
      return;
    }
    box.innerHTML = list.map((item, idx) => {
      const cls = idx === 0 ? 'rank-row top1' : 'rank-row';
      let left = '';
      let right = '';
      if (currentRankTab === 'kills') {
        left = `<span class="rank-num">#${idx + 1}</span>${esc(item.n)}`;
        right = `<strong>${Number(item.v || 0).toLocaleString()}</strong> ตัว`;
      } else if (currentRankTab === 'levels') {
        left = `<span class="rank-num">#${idx + 1}</span>${esc(item.n)}`;
        right = `Score <strong>${Number(item.v || 0).toLocaleString()}</strong> • ฆ่า ${Number(item.s || 0).toLocaleString()}`;
      } else if (currentRankTab === 'money') {
        left = `<span class="rank-num">#${idx + 1}</span>${esc(item.n)}`;
        right = `<strong class="green">$${Number(item.v || 0).toLocaleString()}</strong> • ${Number(item.s || 0).toLocaleString()} CP`;
      } else {
        left = `<span class="rank-num">#${idx + 1}</span>[${esc(item.t)}] ${esc(item.n)}`;
        right = `LV.<strong>${Number(item.v || 1)}</strong> (${Number(item.s || 0).toLocaleString()} EXP)`;
      }
      return `<div class="${cls}"><span>${left}</span><span>${right}</span></div>`;
    }).join('');
  }

  document.querySelectorAll('.tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
      btn.classList.add('active');
      const target = btn.dataset.tab;
      ['profile', 'leaderboard', 'guide', 'settings'].forEach((name) => {
        el('tab-' + name).hidden = name !== target;
      });
    });
  });

  document.querySelectorAll('.sub-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.sub-tab').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentRankTab = btn.dataset.rank;
      renderRanks();
    });
  });

  el('btnClose').addEventListener('click', () => emit('close'));
  el('btnRefresh').addEventListener('click', () => emit('refresh'));
  el('btnToggleHud').addEventListener('click', () => emit('toggle_hud'));
  el('btnToggleSigns').addEventListener('click', () => emit('toggle_signs'));
  document.querySelectorAll('[data-act]').forEach((b) => {
    b.addEventListener('click', () => emit(b.dataset.act));
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') emit('close');
  });

  if (cef) {
    cef.on('rotpda.profile', (raw) => {
      try { renderProfile(typeof raw === 'string' ? JSON.parse(raw) : raw); } catch (_) {}
    });
    cef.on('rotpda.ranks', (raw) => {
      try {
        ranks = Object.assign({ kills: [], levels: [], money: [], guilds: [] }, typeof raw === 'string' ? JSON.parse(raw) : raw);
        renderRanks();
      } catch (_) {}
    });
    if (typeof cef.emit === 'function') cef.emit('rotpda.ready', '1');
  }
})();
