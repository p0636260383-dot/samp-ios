/* ROT CITY HUD v2.25 - รับข้อมูลจริงจาก Pawn ผ่าน cef.on
 * rothud.stats(name, playerId, level, exp, hp, armour, hunger, thirst, energy, infected)
 * rothud.immunity(shield, infected)  - ภูมิคุ้มกัน หลอดบนสุด
 * rothud.avatar(httpsURL)
 * อย่าส่ง HP, เกราะ หรือภูมิคุ้มกันจาก client กลับไปเซิร์ฟเวอร์
 */
(() => {
  'use strict';
  // [2.29] ป้องกันการเปิด HUD ซ้ำ หากผู้เล่นวางไฟล์นี้ผิดในโฟลเดอร์กระเป๋า
  // หน้านี้ต้องติดตั้งใน cef/assets/rotcity-hud/ เท่านั้น
  if (location.pathname.replace(/\\/g, '/').includes('/rotcity-inventory/')) {
    document.body.style.display = 'none';
    return;
  }

  const el = (id) => document.getElementById(id);
  const cef = window.cef && typeof window.cef.on === 'function' && typeof window.cef.emit === 'function' ? window.cef : null;
  const clamp = (v) => { const n=Number(v);return Number.isFinite(n) ? Math.max(0,Math.min(100,n)) : 0; };
  const pct = (value) => Math.round(clamp(value))+'%';
  const setBar = (fillId,textId,value) => { el(fillId).style.width=pct(value); if(textId)el(textId).textContent=pct(value); };
  const infected = (value) => {el('infectionAlert').hidden=Number(value)!==1;};
  const decodeCP874 = (str) => {
    if (!str) return '';
    str = String(str);
    if (/[\u0E00-\u0E7F]/.test(str)) return str;
    if (/[\u00E0][\u00B8\u00B9]/.test(str)) {
      try {
        const decoded = decodeURIComponent(escape(str));
        if (/[\u0E00-\u0E7F]/.test(decoded)) return decoded;
      } catch(e) {}
    }
    let res = '';
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      if (code >= 0xA1 && code <= 0xFB) {
        res += String.fromCharCode(code - 0xA0 + 0x0E00);
      } else {
        res += str[i];
      }
    }
    return res;
  };
  const formatPlayerName = (name) => {
    if (!name) return 'SURVIVOR';
    const decoded = decodeCP874(String(name));
    return decoded.replace(/_/g, ' ').trim();
  };
  function setStats(name,id,level,exp,hp,armour,hunger,thirst,energy,infectedState){
    const formatted = formatPlayerName(name);
    el('playerName').textContent = formatted.slice(0, 48);
    el('playerName').title = formatted;
    el('playerId').textContent=String(id ?? '—');
    el('level').textContent=String(Math.max(1,Number(level)||1));
    el('xp').textContent=pct(exp);
    setBar('hpFill','hpText',hp);
    setBar('armourFill','armourText',armour);
    for(const [key,value] of [['hunger',hunger],['thirst',thirst],['energy',energy]])el(key).textContent=pct(value);
    infected(infectedState);
  }
  function setImmunity(shield,infectedState){
    setBar('rotHudImmunityFill',null,shield);
    el('rotHudImmunityFill').setAttribute('aria-label','ภูมิคุ้มกัน '+pct(shield));
    if(infectedState!==undefined) infected(infectedState);
  }
  // รูปโปรไฟล์ใช้ URL HTTPS โดยตรงเท่านั้น ตามข้อกำหนดของระบบ Pawn
  // รหัสรูปหรือ Hash เช่น f7491b... ไม่ใช่ URL จึงไม่สามารถนำไปใส่ <img> ได้
  let avatarRequest = 0;
  function setAvatar(url){
    const img=el('avatar'), fallback=el('avatarFallback');
    const src=String(url||'').trim();
    avatarRequest++;
    const request=avatarRequest;
    if(!/^https?:\/\/[^\s]+/i.test(src)){
      img.hidden=true;img.removeAttribute('src');fallback.hidden=false;
      return;
    }
    // แสดงรูปใหม่เฉพาะหลังเบราว์เซอร์โหลดสำเร็จ เพื่อไม่ให้ภาพเก่าค้าง
    img.hidden=true;img.removeAttribute('src');fallback.hidden=false;
    img.referrerPolicy='no-referrer';
    img.onload=()=>{if(request!==avatarRequest)return;img.hidden=false;fallback.hidden=true;};
    img.onerror=()=>{
      if(request!==avatarRequest)return;
      img.hidden=true;fallback.hidden=false;
      const msg='CEF โหลดรูปไม่ได้: URL อาจไม่ใช่รูปโดยตรง, หมดอายุ หรือถูกเว็บปฏิเสธ';
      if(!el('avatarEditor').hidden)el('editorFeedback').textContent=msg;
    };
    // หาก URL เดิมถูกส่งซ้ำหลังบันทึก: ลองรีโหลดด้วย URL เดิมก่อน
    // ไม่เติม query เพื่อไม่ให้ลิงก์รูปแบบ signed URL เสียลายเซ็น
    img.src=src;
  }
  // โหลดพรีวิวอิสระจากรูป HUD จริง ไม่เปลี่ยนรูป HUD จนกว่า MySQL จะยืนยัน
  let previewVersion=0;
  let previewTimer=null;
  function previewAvatar(url){
    const src=String(url||'').trim();
    const preview=el('avatarPreview');
    const fallback=el('avatarPreviewFallback');
    const status=el('avatarPreviewStatus');
    const version=++previewVersion;
    preview.hidden=true;
    preview.removeAttribute('src');
    fallback.hidden=false;
    if(!src){fallback.textContent='ยังไม่มีภาพตัวอย่าง';status.textContent='วางลิงก์รูปภาพ HTTP/HTTPS เพื่อดูตัวอย่าง';return;}
    if(!/^https?:\/\/[^\s]+/i.test(src)){
      fallback.textContent='ลิงก์ไม่ถูกต้อง';
      status.textContent='ต้องใช้ลิงก์ HTTP/HTTPS รูปภาพจริง ไม่ใช่รหัสไฟล์หรือ URL หน้าดูภาพ';
      return;
    }
    fallback.textContent='กำลังโหลด...';status.textContent='กำลังตรวจภาพผ่าน CEF';
    preview.referrerPolicy='no-referrer';
    preview.onload=()=>{
      if(version!==previewVersion)return;
      preview.hidden=false;fallback.hidden=true;
      status.textContent='โหลดภาพสำเร็จ กดบันทึกเพื่อใช้ภาพนี้';
    };
    preview.onerror=()=>{
      if(version!==previewVersion)return;
      preview.hidden=true;fallback.hidden=false;
      fallback.textContent='โหลดภาพไม่สำเร็จ';
      status.textContent='ลองใช้ลิงก์ .jpg / .png แบบตรง เว็บไซต์บางแห่งบล็อก CEF';
    };
    preview.src=src;
  }
  el('avatarURL').addEventListener('input',()=>{
    clearTimeout(previewTimer);
    const url=el('avatarURL').value;
    previewTimer=setTimeout(()=>previewAvatar(url),280);
  });
  function openEditor(url){
    const src=String(url||'').trim();
    el('avatarURL').value=/^https?:\/\//i.test(src)?src:'';
    el('editorFeedback').textContent=src&&!/^https?:\/\//i.test(src)?'ค่ารูปที่บันทึกไว้ไม่ใช่ URL HTTP/HTTPS โดยตรง โปรดใช้ลิงก์ https://...jpg หรือ .png':'';
    el('avatarEditor').hidden=false;previewAvatar(el('avatarURL').value);el('avatarURL').focus();
  }
  function closeEditor(){el('avatarEditor').hidden=true;}
  el('avatarForm').addEventListener('submit',(e)=>{
    e.preventDefault();const u=el('avatarURL').value.trim();
    if(u && (!/^https?:\/\/[^\s]+/i.test(u)||u.length>480)){el('editorFeedback').textContent='กรุณาใส่ URL รูปภาพ HTTP/HTTPS แบบเต็ม ไม่ใช่รหัสภาพ (ไม่เกิน 480 ตัวอักษร)';return;}
    if(cef){el('editorFeedback').textContent='กำลังบันทึก...';cef.emit('rothud.avatar.save',u);}else{setAvatar(u);closeEditor();}
  });
  el('avatarCancel').addEventListener('click',()=>{if(cef)cef.emit('rothud.avatar.cancel');else closeEditor();});
  window.addEventListener('keydown',e=>{if(e.key==='Escape'&&!el('avatarEditor').hidden){e.preventDefault();el('avatarCancel').click();}});
  const sfxLast={};
  function playSfx(raw){
    try{
      const parts=String(raw||'').split('|');
      const name=parts[0]||'';
      const vol=Math.max(0.05,Math.min(1.0,parseFloat(parts[1]||'0.8')||0.8));
      const now=Date.now();
      if(sfxLast[name]&&now-sfxLast[name]<1200)return;
      sfxLast[name]=now;
      let file='';
      if(name==='zombie1')file='sfx/zombie_groan1.wav';
      else if(name==='zombie2')file='sfx/zombie_groan2.wav';
      else if(name==='zombie')file=Math.random()<0.5?'sfx/zombie_groan1.wav':'sfx/zombie_groan2.wav';
      if(!file)return;
      const a=new Audio(file);
      a.volume=vol;
      a.play().catch(()=>{});
    }catch(e){}
  }
  if(cef){
    cef.on('rothud.stats',setStats);cef.on('rothud.immunity',setImmunity);cef.on('rothud.avatar',setAvatar);
    cef.on('rothud.avatar.open',openEditor);cef.on('rothud.avatar.close',closeEditor);
    cef.on('rothud.avatar.saved',url=>{setAvatar(url);closeEditor();});
    cef.on('rothud.avatar.feedback',msg=>{el('editorFeedback').textContent=String(msg||'').slice(0,140);});
    cef.on('rothud.sfx',playSfx);
    cef.emit('rothud.ready');
  } else {
    // ข้อมูลตัวอย่างเฉพาะเวลาเปิด HTML ใน Browser; ไม่ใช้ในเกม
    setStats('Diamond_Demonlord',2,1,0,100,0,91,82,96,0);setImmunity(85,0);
  }
})();
