/* ROT CITY CEF only. Never cache passwords or accept client-side success as authorization. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const cef = window.cef && typeof window.cef.on === 'function' && typeof window.cef.emit === 'function' ? window.cef : null;
  const validPassword = /^[\x21-\x7e]{8,64}$/;
  const months = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
  let currentMode = 'loading';
  let working = false;
  const option = (select, text, value) => {const o=document.createElement('option');o.value=value;o.textContent=text;select.appendChild(o);};
  for(let d=1; d<=31; d++) option($('birthDay'),String(d),String(d));
  months.forEach((m,i)=>option($('birthMonth'),m,String(i+1)));
  const currentThaiYear = (new Date()).getFullYear() + 543;
  for(let year=currentThaiYear;year>=currentThaiYear-100;year--) option($('birthYear'),String(year),String(year));

  function notice(message, success=false){const node=$('notice');node.textContent=message||'';node.hidden=!message;node.classList.toggle('success',success);}
  function busy(enabled,message=''){
    working=enabled;
    $('registerBtn').disabled=enabled;
    $('loginBtn').disabled=enabled;
    if(message) notice(message,true);
  }
  function decodeCP874(str){
    if(!str) return '';
    str = String(str);
    if (/[\u0E00-\u0E7F]/.test(str)) return str;
    if (/[\u00E0][\u00B8\u00B9]/.test(str)) {
      try {
        const decoded = decodeURIComponent(escape(str));
        if (/[\u0E00-\u0E7F]/.test(decoded)) return decoded;
      } catch(e) {}
    }
    let res='';
    for(let i=0;i<str.length;i++){
      const c=str.charCodeAt(i);
      res += (c>=0xA1 && c<=0xFB) ? String.fromCharCode(c-0xA0+0x0E00) : str[i];
    }
    return res;
  }
  function formatPlayerName(name){
    if(!name) return '';
    return decodeCP874(String(name)).replace(/_/g, ' ').trim();
  }
  function show(mode,playerName=''){
    currentMode=mode;
    busy(false);notice('');
    $('registerForm').hidden=mode!=='register';
    $('loginForm').hidden=mode!=='login';
    $('loadingPanel').hidden=mode==='register'||mode==='login';
    $('screenTitle').textContent=mode==='register'?'สมัครตัวละคร':mode==='login'?'เข้าสู่ระบบ':'กำลังเชื่อมต่อ';
    $('screenSubtitle').textContent=mode==='register'?'CREATE SURVIVOR':mode==='login'?'IDENTIFY SURVIVOR':'SURVIVOR AUTHENTICATION';
    $('ribbonText').textContent=mode==='register'?'ผู้เล่นใหม่ • กรอกข้อมูลเพื่อสร้างตัวละคร':mode==='login'?'มีบัญชีแล้ว • กรอกรหัสผ่านเพื่อเข้าเมือง':'กำลังตรวจสอบตัวละครกับฐานข้อมูล...';
    const displayName = formatPlayerName(playerName) || 'รอข้อมูลจากเซิร์ฟเวอร์';
    $('regName').value=displayName;
    $('loginName').value=displayName;
    $('regPassword').value='';$('regConfirm').value='';$('loginPassword').value='';
    if(mode==='login')setTimeout(()=>$('loginPassword').focus(),120);
  }
  function send(event,...args){
    if(!cef){busy(false);notice('CEF ไม่พร้อม กรุณาเปิดหน้านี้ผ่านเกม ROT CITY');return;}
    try{cef.emit(event,...args);}catch(e){busy(false);notice('ไม่สามารถส่งข้อมูลไปยังเซิร์ฟเวอร์ CEF');}
  }

  $('registerForm').addEventListener('submit',ev=>{
    ev.preventDefault();if(currentMode!=='register'||working)return;
    const d=$('birthDay').value,m=$('birthMonth').value,y=$('birthYear').value;
    const gender=document.querySelector('input[name="gender"]:checked');
    const pass=$('regPassword').value,confirm=$('regConfirm').value;
    if(!d||!m||!y||!gender){notice('กรุณาเลือกวันเกิดและเพศ');return;}
    if(!validPassword.test(pass)){notice('รหัสผ่านต้องมี 8–64 ตัวอักษร โดยไม่เว้นวรรค');return;}
    if(pass!==confirm){notice('ยืนยันรหัสผ่านไม่ตรงกัน');return;}
    busy(true,'กำลังสร้างบัญชีอย่างปลอดภัย...');
    send('rotui.register',d,m,y,gender.value,pass,confirm);
  });
  $('loginForm').addEventListener('submit',ev=>{
    ev.preventDefault();if(currentMode!=='login'||working)return;
    const pass=$('loginPassword').value;
    if(!validPassword.test(pass)){notice('กรุณากรอกรหัสผ่าน 8–64 ตัวอักษร');return;}
    busy(true,'กำลังตรวจสอบรหัสผ่าน...');send('rotui.login',pass);
  });
  document.querySelectorAll('[data-toggle]').forEach(button=>button.addEventListener('click',()=>{
    const input=$(button.dataset.toggle);input.type=input.type==='password'?'text':'password';
  }));

  if(cef){
    cef.on('rotui.show',(mode,name)=>show(String(mode||'loading'),rotThai(name)));
    cef.on('rotui.error',message=>{busy(false);notice((rotThai(message)||'เกิดข้อผิดพลาด'));});
    cef.on('rotui.busy',message=>busy(true,(rotThai(message)||'กรุณารอสักครู่')));
    cef.on('rotui.auth.ok',message=>{
      currentMode='finishing';
      $('registerForm').hidden=true;$('loginForm').hidden=true;$('loadingPanel').hidden=false;
      $('loadingPanel').querySelector('p').textContent=(rotThai(message)||'เข้าสู่ระบบสำเร็จ กำลังเข้าเมือง...');
      notice('');busy(true);
    });
    $('connection').textContent='CEF พร้อมใช้งาน';
    cef.emit('rotui.ready');
  } else {
    $('connection').textContent='PREVIEW • ไม่มี CEF Client';
    show(new URLSearchParams(location.search).get('mode')==='register'?'register':'login','Diamond_Demonlord');
  }
})();
