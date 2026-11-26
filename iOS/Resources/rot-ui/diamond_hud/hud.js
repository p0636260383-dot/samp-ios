/* DiamondHUD - CEF bridge + standalone demo support */
(()=>{
'use strict';
const state={id:1024,name:'Diamond_Demonlord',health:100,armour:100,hunger:100,thirst:100,money:25000,online:128,maxPlayers:500,speaking:false};
const $=id=>document.getElementById(id);
const clip=(n)=>Math.max(0,Math.min(100,Number(n)||0));
const safeInt=(n,def=0)=>Number.isFinite(Number(n))?Math.trunc(Number(n)):def;
const fmt=new Intl.NumberFormat('en-US',{maximumFractionDigits:0});
function setValue(id,v){const el=$(id);if(el)el.textContent=String(v)}
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
function update(p){
  if(!p||typeof p!=='object')return;
  for(const [k,v] of Object.entries(p)){if(k in state)state[k]=v}
  setValue('player-id',safeInt(state.id));
  const formattedName = decodeCP874(String(state.name || '')).replace(/_/g, ' ').trim();
  setValue('player-name', formattedName.slice(0, 36));
  const hp=clip(state.health), ar=clip(state.armour), hunger=clip(state.hunger),thirst=clip(state.thirst);
  $('clip-health').style.width=String(813*hp/100)+'px';
  $('clip-armour').style.width=String(754*ar/100)+'px';
  setValue('health-text',Math.round(hp)+'%');setValue('armour-text',Math.round(ar)+'%');
  setValue('hunger-text',Math.round(hunger)+'%');setValue('thirst-text',Math.round(thirst)+'%');
  $('burger-icon').style.opacity=String(.25+.75*hunger/100);
  $('water-icon').style.opacity=String(.25+.75*thirst/100);
  setValue('online',safeInt(state.online));setValue('maxplayers',safeInt(state.maxPlayers,500));
  setValue('money','$'+fmt.format(safeInt(state.money)));
  $('hud').classList.toggle('is-speaking',!!state.speaking);
}
const months=['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
function clock(){const d=new Date(); const pad=n=>String(n).padStart(2,'0');
  setValue('hud-date',pad(d.getDate())+' '+months[d.getMonth()]+' '+d.getFullYear());
  setValue('hud-time',[d.getHours(),d.getMinutes(),d.getSeconds()].map(pad).join(':'));}

function rescale() {
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;

    // ขนาด HUD ต้นฉบับ
    const originalW = 1536;
    const originalH = 432;

    // พื้นที่ที่อนุญาตให้ HUD แสดงใต้ Minimap
    // อ้างอิงหน้าจอ 1650x928
    const maxWidth = screenW * 0.22;
    const maxHeight = screenH * (100 / 928);

    // คำนวณขนาดให้พอดีพื้นที่โดยรักษาสัดส่วนเดิม
    const scale = Math.min(
        maxWidth / originalW,
        maxHeight / originalH
    );

    // ตำแหน่งใต้ Minimap
    const left = screenW * (10 / 1650);
    const bottom = screenH * (-5 / 928);

    // ส่งค่าให้ CSS
    document.documentElement.style.setProperty(
        "--ui-scale",
        String(scale)
    );

    document.documentElement.style.setProperty(
        "--hud-left",
        left + "px"
    );

    document.documentElement.style.setProperty(
        "--hud-bottom",
        bottom + "px"
    );
}

let avatarReqId = 0;
function setAvatar(url){
  const img=$('player-avatar');
  if(!img)return;
  const src=String(url||'').trim();
  const req=++avatarReqId;
  if(!/^https?:\/\/[^\s]+/i.test(src)){
    img.hidden=true;img.removeAttribute('src');return;
  }
  img.hidden=true;
  img.onload=()=>{if(req===avatarReqId)img.hidden=false;};
  img.onerror=()=>{if(req===avatarReqId){img.hidden=true;img.removeAttribute('src');}};
  img.referrerPolicy='no-referrer';
  img.src=src;
}

window.DiamondHUD={update,setAvatar,setShowMoney(show){$('hud').classList.toggle('hide-money',!show)},getState:()=>({...state})};
if(typeof cef!=='undefined'&&typeof cef.on==='function'){
  // Types: hp,armour,hunger,thirst,playerid,playername,online,maxPlayers,money,voice
  cef.on('diamondhud:set',(hp,arm,food,water,id,name,online,maxPlayers,money,voice)=>{
    update({health:hp,armour:arm,hunger:food,thirst:water,id,name,online,maxPlayers,money,speaking:safeInt(voice)!==0});
  });
  cef.on('diamondhud:voice',(active)=>update({speaking:safeInt(active)!==0}));
  cef.on('rothud.avatar',(url)=>setAvatar(url));
  if(typeof cef.emit==='function'){try{cef.emit('rothud.ready');}catch(e){}}
}
window.addEventListener('resize',rescale);rescale();clock();setInterval(clock,1000);update(state);
})();
