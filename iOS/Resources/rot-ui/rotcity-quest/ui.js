(function () {
  'use strict';

  const board = document.getElementById('board');
  const list = document.getElementById('missions');
  const accept = document.getElementById('accept');
  const assets = 'assets/icons/';
  const states = { idle: 'ว่าง', active: 'กำลังทำ', complete: 'เสร็จแล้ว' };
  const icons = ['water', 'walker', 'runner', 'brute', 'horde', 'scrap', 'toxic', 'mutant'];
  const rewardIcons = ['reward_water', 'reward_parts', 'reward_reputation'];
  const demoRewards = [
    { icon: 'reward_water', text: 'น้ำดื่ม ×3' },
    { icon: 'reward_parts', text: 'ชิ้นส่วน ×50' },
    { icon: 'reward_reputation', text: 'ค่าชื่อเสียง +25' }
  ];
  let missions = [
    ['water', 'ส่งน้ำเข้าค่าย', 'นำน้ำสะอาดไปส่งยังค่ายผู้รอดชีวิตทางตะวันตกของเมือง', 'active', 0, 3],
    ['walker', 'กวาดวอล์คเกอร์', 'กำจัดวอล์คเกอร์รอบจุดตรวจ', 'idle', 0, 8],
    ['runner', 'หยุดรันเนอร์', 'กำจัดรันเนอร์ที่เข้ามาในเขตค่าย', 'idle', 0, 5],
    ['brute', 'ล้มบรูท', 'กำจัดบรูทในเขตอุตสาหกรรม', 'idle', 0, 1],
    ['horde', 'รอดฝูงคืน', 'เอาตัวรอดจากฝูงซอมบี้ในเวลากลางคืน', 'idle', 0, 1],
    ['scrap', 'เก็บเศษโลหะ', 'ค้นหาเศษโลหะแล้วนำกลับมาที่ค่าย', 'active', 4, 10],
    ['toxic', 'ล่าท็อกซิก', 'กำจัดผู้ติดเชื้อในเขตพิษ', 'idle', 0, 4],
    ['mutant', 'ล่ามิวแทนท์', 'กำจัดมิวแทนท์ในพื้นที่กักกัน', 'complete', 1, 1]
  ].map(([icon, title, description, state, current, total]) => ({
    id: icon, icon, title, description, state, current, total, rewards: demoRewards
  }));
  let selected = missions[0].id;

  function image(icon) {
    const img = document.createElement('img');
    img.src = assets + icon + '.png';
    img.alt = '';
    return img;
  }

  function render() {
    list.replaceChildren();
    const mission = missions.find(item => item.id === selected) || missions[0];
    selected = mission ? mission.id : null;
    list.hidden = !mission;
    document.querySelector('.detail').hidden = !mission;
    accept.disabled = !mission || mission.state !== 'idle';
    if (!mission) return;
    missions.forEach(item => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'mission' + (item.id === selected ? ' selected' : '');
      button.setAttribute('aria-pressed', String(item.id === selected));
      const title = document.createElement('span');
      title.className = 'mission-name';
      title.textContent = item.title;
      const state = document.createElement('span');
      state.className = 'state ' + item.state;
      state.textContent = states[item.state] || states.idle;
      button.append(image(item.icon), title, state);
      button.addEventListener('click', () => {
        selected = item.id;
        render();
        list.querySelector('[aria-pressed="true"]').focus();
      });
      list.append(button);
    });
    document.getElementById('hero').src = assets + (mission.icon === 'water' ? 'water_large' : mission.icon) + '.png';
    document.getElementById('mission-title').textContent = mission.title;
    document.getElementById('description').textContent = mission.description;
    const total = Math.max(1, Number(mission.total) || 1);
    const current = Math.max(0, Math.min(total, Number(mission.current) || 0));
    document.getElementById('progress').max = total;
    document.getElementById('progress').value = current;
    document.getElementById('count').textContent = current + '/' + total;
    const rewards = document.getElementById('rewards');
    rewards.replaceChildren();
    mission.rewards.forEach(reward => {
      const card = document.createElement('div');
      card.className = 'reward';
      const label = document.createElement('span');
      label.textContent = reward.text;
      const icon = image(reward.icon);
      icon.src = 'assets/glyphs/' + reward.icon + '.png';
      card.append(icon, label);
      rewards.append(card);
    });
  }

  // แผนที่ id ตัวเลขจากเซิร์ฟ ↔ ไอคอนในแพ็ก
  const ID_ICON = {0:'water',1:'walker',2:'runner',3:'brute',4:'horde',5:'scrap',6:'toxic',7:'mutant'};
  const ICON_ID = Object.fromEntries(Object.entries(ID_ICON).map(([k,v]) => [v, Number(k)]));
  const META = {
    0: { title:'ส่งน้ำเข้าค่าย', description:'มีน้ำดื่มอย่างน้อย 3 ขวด แล้วกดส่งของในค่ายผู้รอดชีวิต' },
    1: { title:'กวาดวอล์คเกอร์', description:'ฆ่าซอมบี้ธรรมดา (Walker) ให้ครบตามเป้าหมาย' },
    2: { title:'หยุดรันเนอร์', description:'ฆ่าซอมบี้วิ่งเร็ว (Runner) ให้ครบตามเป้าหมาย' },
    3: { title:'ล้มบรูท', description:'ฆ่าซอมบี้ร่างยักษ์ (Brute) ให้ครบตามเป้าหมาย' },
    4: { title:'รอดฝูงคืน', description:'อยู่นอกค่ายตอนกลางคืนให้ครบเวลาที่กำหนด' },
    5: { title:'เก็บเศษโลหะ', description:'ค้นหาเศษเหล็กจากการลูทตามเป้าหมายขณะรับภารกิจ' },
    6: { title:'ล่าท็อกซิก', description:'ฆ่าซอมบี้พิษ (Toxic) ให้ครบตามเป้าหมาย' },
    7: { title:'ล่ามิวแทนท์', description:'ฆ่าซอมบี้กลายพันธุ์ (Mutant) ให้ครบตามเป้าหมาย' }
  };
  let pendingRows = [];

  function emit() {
    if (!window.cef || typeof window.cef.emit !== 'function') return;
    try { window.cef.emit.apply(window.cef, arguments); } catch (e) {}
  }

  function close() {
    board.hidden = true;
    emit('rotcity:missions:close');
    emit('rotquest.close');
  }

  accept.addEventListener('click', () => {
    const mission = missions.find(item => item.id === selected);
    if (!mission || mission.state !== 'idle') return;
    const qid = (typeof mission.qid === 'number') ? mission.qid : (ICON_ID[mission.icon] ?? mission.id);
    emit('rotcity:missions:accept', String(mission.id));
    emit('rotquest.take', String(qid));
  });
  document.getElementById('cancel').addEventListener('click', close);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !board.hidden) close();
  });

  window.RotCityMissions = {
    setMissions(items) {
      if (!Array.isArray(items)) return;
      missions = items.filter(item => item && item.id != null).slice(0, 8).map(item => {
        const qid = Number(item.qid != null ? item.qid : (ICON_ID[item.icon] ?? item.id));
        const icon = icons.includes(item.icon) ? item.icon : (ID_ICON[qid] || 'water');
        return {
          ...item,
          id: item.id,
          qid: Number.isFinite(qid) ? qid : 0,
          state: Object.prototype.hasOwnProperty.call(states, item.state) ? item.state : 'idle',
          icon,
          rewards: Array.isArray(item.rewards) ? item.rewards.filter(reward => reward && rewardIcons.includes(reward.icon)).slice(0, 3) : demoRewards
        };
      });
      if (missions.length) selected = missions[0].id;
      render();
    },
    show() { board.hidden = false; },
    hide() { board.hidden = true; }
  };

  function applyRotquestRows(rows) {
    const items = rows.map(r => {
      const qid = Number(r.id);
      const icon = ID_ICON[qid] || 'water';
      const meta = META[qid] || { title: 'ภารกิจ '+qid, description: '' };
      let state = 'idle';
      if (r.done) state = 'complete';
      else if (r.active) state = 'active';
      const rewards = [];
      if (r.rewardItem >= 0 && r.rewardQty > 0) rewards.push({ icon: 'reward_water', text: 'ไอเทม #'+r.rewardItem+' ×'+r.rewardQty });
      if (r.rewardScrap > 0) rewards.push({ icon: 'reward_parts', text: 'เศษเหล็ก ×'+r.rewardScrap });
      if (!rewards.length) rewards.push(...demoRewards);
      return {
        id: icon,
        qid,
        icon,
        title: meta.title,
        description: meta.description,
        state,
        current: r.progress || 0,
        total: r.need || 1,
        rewards
      };
    });
    window.RotCityMissions.setMissions(items);
  }

  if (window.cef && typeof window.cef.on === 'function') {
    board.hidden = true;
    window.cef.on('rotcity:missions:data', payload => {
      try { window.RotCityMissions.setMissions(JSON.parse(payload)); }
      catch (error) { console.error('Invalid mission data', error); }
    });
    window.cef.on('rotcity:missions:show', window.RotCityMissions.show);
    window.cef.on('rotcity:missions:hide', window.RotCityMissions.hide);
    // โปรโตคอลเดิมจากเซิร์ฟ ROT CITY
    window.cef.on('rotquest.begin', () => { pendingRows = []; });
    window.cef.on('rotquest.row', (id, need, progress, done, active, rewardItem, rewardQty, rewardScrap, typeCode) => {
      pendingRows.push({
        id: Number(id), need: Number(need), progress: Number(progress),
        done: Number(done) === 1, active: Number(active) === 1,
        rewardItem: Number(rewardItem), rewardQty: Number(rewardQty),
        rewardScrap: Number(rewardScrap), typeCode: Number(typeCode)
      });
    });
    window.cef.on('rotquest.end', () => {
      applyRotquestRows(pendingRows);
      window.RotCityMissions.show();
      pendingRows = [];
    });
    window.cef.on('rotquest.closeui', () => window.RotCityMissions.hide());
    window.cef.on('rotquest.notice', msg => {
      try { console.log('[quest]', msg); } catch (e) {}
    });
    window.cef.on('rotquest.progress', (id, progress, need) => {
      const qid = Number(id);
      const m = missions.find(x => x.qid === qid);
      if (m) { m.current = Number(progress); m.total = Number(need) || m.total; if (m.current >= m.total) m.state = 'complete'; render(); }
    });
    // แจ้งเซิร์ฟว่า CEF พร้อม
    try { emit('rotquest.ready'); } catch (e) {}
  }
  function fit() {
    board.style.setProperty('--board-scale', Math.min(innerWidth / 1168, innerHeight / 784, 1));
  }
  window.addEventListener('resize', fit);
  fit();
  render();
}());
