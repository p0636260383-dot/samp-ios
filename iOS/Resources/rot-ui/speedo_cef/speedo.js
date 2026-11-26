/* Diamond Speedometer V4 — reference-video animations.
   UI never directly changes a vehicle. Only KONSHU server can authorize an action. */
(()=>{
'use strict';
const root=document.getElementById('speedo');
const $=id=>document.getElementById(id);
const cefBridge=window.cef;
const demo=!(cefBridge&&typeof cefBridge.on==='function');
const params=new URLSearchParams(location.search);
// Set to 'mint' to use the exact green/mint palette seen in the reference video.
const DEFAULT_THEME='blue';
const desiredTheme=params.get('theme')||DEFAULT_THEME;
document.documentElement.dataset.speedoTheme=desiredTheme==='mint'?'mint':'blue';
const clamp=(v,lo=0,hi=100)=>Math.max(lo,Math.min(hi,Number(v)||0));
const initial={visible:demo,speed:0,gear:'N',damage:100,fuel:-1,engine:0,lights:0,locked:0,signal:0,zone:'Los Santos',controls:false};
let state={...initial};
// WINGS: visibly slide outward when moving, slide inward when parked.
// 5 km/h open, <=1 km/h for 300ms close; opening a control menu overrides parking.
let bodyOpen = false;
let belowStopSince = null;
const WINGS_OPEN_AT_KMH = 5;
const WINGS_CLOSE_AT_KMH = 1;
const WINGS_CLOSE_DELAY_MS = 300;
function updateBodyOpenState() {
  const speed = Math.max(0,Number(state.speed)||0);
  if (!state.visible || !state.engine) {
    belowStopSince=null; bodyOpen=false; return;
  }
  if (state.controls) {
    belowStopSince=null; bodyOpen=true; return;
  }
  if (speed>=WINGS_OPEN_AT_KMH) {
    belowStopSince=null; bodyOpen=true; return;
  }
  if (speed>WINGS_CLOSE_AT_KMH) {
    belowStopSince=null; return; // hysteresis band: keep previous state
  }
  if (belowStopSince===null) belowStopSince=performance.now();
  if (performance.now()-belowStopSince>=WINGS_CLOSE_DELAY_MS) bodyOpen=false;
}
// Initial browser load must paint the collapsed state first. Otherwise opening
// the CEF Browser and receiving speed data in the same frame can skip transitions.
let pendingFirstSlide=false;
function paintWingState() {
  const initialReveal=state.visible && bodyOpen && !root.classList.contains('visible');
  if (initialReveal) {
    root.classList.remove('body-open');
    if (!pendingFirstSlide) {
      pendingFirstSlide=true;
      requestAnimationFrame(()=>requestAnimationFrame(()=>{
        pendingFirstSlide=false;
        if (state.visible && bodyOpen) root.classList.add('body-open');
      }));
    }
  } else if(!pendingFirstSlide) {
    root.classList.toggle('body-open',bodyOpen);
  }
}

let toastTimer=null,demoTick=0;
const layer=$('control-layer');
// The upper controls form the fan shown in the supplied video. Lower controls are in the status strip.
const controls=[
  ['engine',325,123,70,'ico_power.png','เครื่องยนต์'],
  ['lock',415,94,49,'ico_lock.png','ล็อกรถ'],
  ['door2',93,207,47,'ico_door.png','ประตูหลังซ้าย'],
  ['seat2',144,184,47,'ico_seat.png','เบาะหลังซ้าย'],
  ['seat0',198,165,47,'ico_seat.png','ที่นั่งคนขับ'],
  ['door0',252,153,47,'ico_door.png','ประตูหน้าซ้าย'],
  ['door1',420,153,47,'ico_door.png','ประตูหน้าขวา'],
  ['seat1',474,165,47,'ico_seat.png','เบาะหน้าขวา'],
  ['seat3',528,184,47,'ico_seat.png','เบาะหลังขวา'],
  ['door3',579,207,47,'ico_door.png','ประตูหลังขวา'],
  ['signalL',247,522,50,'ico_signal.png','ไฟเลี้ยวซ้าย'],
  ['signalR',405,522,50,'ico_signal.png','ไฟเลี้ยวขวา'],
  ['lights',464,522,50,'ico_headlight.png','ไฟหน้า']
];
// แปลงชื่อเมืองและรหัสแจ้งเตือนให้เป็นภาษาไทยที่ฝั่ง CEF (UTF-8)
const thaiZones={
 'Los Santos':'ลอสซานโตส',
 'Las Venturas':'ลาสเวนทูรัส',
 'San Fierro':'ซานฟิเอโร',
 'San Andreas':'ซานแอนเดรียส',
 'Red County':'เรดเคาน์ตี',
 'Flint County':'ฟลินต์เคาน์ตี',
 'Whetstone':'เวตสโตน',
 'Bone County':'โบนเคาน์ตี',
 'Tierra Robada':'เทียร์ราโรบาดา',
 'Conference Center':'ศูนย์ประชุม'
};
const CP1252_EXTRA={0x20AC:0x80,0x201A:0x82,0x0192:0x83,0x201E:0x84,0x2026:0x85,0x2020:0x86,0x2021:0x87,0x02C6:0x88,0x2030:0x89,0x0160:0x8A,0x2039:0x8B,0x0152:0x8C,0x017D:0x8E,0x2018:0x91,0x2019:0x92,0x201C:0x93,0x201D:0x94,0x2022:0x95,0x2013:0x96,0x2014:0x97,0x02DC:0x98,0x2122:0x99,0x0161:0x9A,0x203A:0x9B,0x0153:0x9C,0x017E:0x9E,0x0178:0x9F};
function decodeCp874(str){
 const s=String(str||'');
 if(s.includes('%')){
  const b=[];
  for(let i=0;i<s.length;i++){
   if(s[i]==='%'&&i+2<s.length){const v=parseInt(s.slice(i+1,i+3),16);if(!isNaN(v)){b.push(v);i+=2;continue;}}
   b.push(s.charCodeAt(i)&0xFF);
  }
  return new TextDecoder('utf-8',{fatal:false}).decode(new Uint8Array(b));
 }
 if(/[\u0E00-\u0E7F]/.test(s)) return s;
 try{
  const b=new Uint8Array(s.length);
  for(let i=0;i<s.length;i++){const c=s.charCodeAt(i);b[i]=c<=0xFF?c:(CP1252_EXTRA[c]!==undefined?CP1252_EXTRA[c]:0x3F);}
  const u=new TextDecoder('utf-8',{fatal:true}).decode(b);
  if(/[\u0E00-\u0E7F]/.test(u)) return u;
 }catch(_){}
 let out='';
 for(let i=0;i<s.length;i++){
  const c=s.charCodeAt(i);
  if((c>=0xA1&&c<=0xDA)||(c>=0xDF&&c<=0xFB)) out+=String.fromCharCode(c+0x0D60);
  else out+=s[i];
 }
 return out;
}
function localizeZone(v){
 const s=decodeCp874(v||'San Andreas');
 return thaiZones[s]||s;
}
const thaiNotices={
 'CEF_CONNECTED':'เชื่อมต่อระบบ CEF สำเร็จ',
 'NOT_PERMITTED':'ไม่สามารถสั่งงานได้ กรุณาตรวจสิทธิ์หรือการเชื่อมระบบรถ',
 'ACTION_ACCEPTED':'รับคำสั่งควบคุมรถแล้ว',
 'CEF channel connected':'เชื่อมต่อระบบ CEF สำเร็จ',
 'Not permitted / integration missing':'ไม่อนุญาตหรือยังไม่ได้เชื่อมระบบรถ',
 'Action accepted':'รับคำสั่งแล้ว'
};
function localizeNotice(v){
 const s=decodeCp874(v||'');
 return thaiNotices[s]||s;
}
const buttons=[];
function send(event,...args){
 if(!demo && typeof cefBridge.emit==='function') {cefBridge.emit(event,...args);return true;}
 return false;
}
function notice(message){
 const t=$('status-toast');if(!t)return;
 t.textContent=localizeNotice(message);t.classList.add('show');
 clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),1750);
}
function requestAction(action,button){
 if(!state.controls)return false;
 if(button){button.classList.add('pending');setTimeout(()=>button.classList.remove('pending'),350);}
 if(!send('speedo:action',action)){
   notice('โหมดทดลอง: '+action);
   if(action==='engine')render({engine:Number(state.engine)?0:1,controls:false});
   if(action==='lock')render({locked:Number(state.locked)?0:1});
   if(action==='lights')render({lights:Number(state.lights)?0:1});
   if(action==='signalL')render({signal:Number(state.signal)===1?0:1});
   if(action==='signalR')render({signal:Number(state.signal)===2?0:2});
 }
 return true;
}
controls.forEach(([action,x,y,size,img,label],idx)=>{
 const b=document.createElement('button');b.type='button';b.className='control-button';
 b.dataset.action=action;b.style.left=x+'px';b.style.top=y+'px';
 b.style.width=size+'px';b.style.height=size+'px';
 b.style.setProperty('--btn-delay',(0.02+idx*0.018).toFixed(3)+'s');
 b.title=label;b.setAttribute('aria-label',label);
 const i=document.createElement('img');i.src='img/'+img;i.alt='';b.appendChild(i);
 const hint=document.createElement('span');hint.className='btn-hint';hint.textContent=label;b.appendChild(hint);
 b.disabled=true;
 b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();requestAction(action,b);});
 layer.appendChild(b);buttons.push(b);
});
function arc(id,pct){const el=$(id);if(el)el.style.strokeDasharray=clamp(pct).toFixed(1)+' 100';}
function render(p){
 if(p&&typeof p==='object')state={...state,...p};
 state.engine=Number(state.engine)?1:0;
 if(!state.visible||!state.engine)state.controls=false;
 $('speed-value').textContent=Math.round(clamp(state.speed,0,999));
 $('gear-value').textContent=String(state.gear||'N').slice(0,2);
 $('damage-label').textContent=Math.round(clamp(state.damage))+'%';
 $('fuel-label').textContent=Number(state.fuel)<0?'--':Math.round(clamp(state.fuel))+'%';
 $('zone-label').textContent=localizeZone(state.zone);
 $('engine-status').textContent=state.engine?'เครื่องยนต์ติด':'เครื่องยนต์ดับ';
 $('warning-icon').classList.toggle('warn-on',clamp(state.damage)<35);
 $('fuel-icon').classList.toggle('fuel-low',Number(state.fuel)>=0&&Number(state.fuel)<15);
 $('lock-icon').classList.toggle('on',!!Number(state.locked));
 $('headlight-icon').classList.toggle('on',!!Number(state.lights));
 const speedPct=clamp(Number(state.speed)/240*100);
 arc('speed-ring-progress',speedPct);arc('speed-ring-halo',speedPct);
 arc('damage-meter-progress',clamp(state.damage));
 arc('fuel-meter-progress',Number(state.fuel)<0?0:clamp(state.fuel));
 const blink=Math.floor(Date.now()/340)%2===0;
 $('left-signal').classList.toggle('blink',blink&&[1,3].includes(Number(state.signal)));
 $('right-signal').classList.toggle('blink',blink&&[2,3].includes(Number(state.signal)));
 updateBodyOpenState();
 paintWingState();
 root.classList.toggle('visible',!!state.visible);
 root.classList.toggle('engine-on',!!state.engine);
 root.classList.toggle('menu-open',!!state.controls);
 document.body.classList.toggle('controls-active',!!state.controls);
 layer.setAttribute('aria-hidden',String(!state.controls));
 buttons.forEach(b=>b.disabled=!state.controls);
}
function fit(){
 const w=window.innerWidth,h=window.innerHeight;
 const ratio=Math.min(w/1650,h/928);
 const s=Math.max(.26,Math.min(.70,.53*ratio));
 const style=document.documentElement.style;
 style.setProperty('--speedo-scale',s.toFixed(4));
 style.setProperty('--speedo-left',Math.max(0,Math.round((w-720*s)/2))+'px');
 style.setProperty('--speedo-bottom',Math.max(9,Math.round(h*.026))+'px');
}
function closeMenu(){
 if(!state.controls)return;
 if(!send('speedo:menu','close'))render({controls:false});
}
window.addEventListener('keydown',e=>{
 const key=String(e.key).toLowerCase();
 if(state.controls&&(key==='n'||key==='escape'||e.code==='Digit2')){
   e.preventDefault();e.stopPropagation();closeMenu();return;
 }
 if(demo&&key==='n'){
   if(!state.engine){render({engine:1});notice('สตาร์ตรถแล้ว กด N อีกครั้งเพื่อเปิดเมนู');}
   else render({controls:!state.controls,visible:true});
   e.preventDefault();
 }
});
window.DiamondSpeedo={update:render,show:v=>render({visible:!!v}),setControls:v=>render({controls:!!v}),getState:()=>({...state}),requestAction,
  setTheme:theme=>{document.documentElement.dataset.speedoTheme=theme==='mint'?'mint':'blue';}};
if(!demo){
 cefBridge.on('speedo:data',(speed,gear,damage,fuel,engine,lights,locked,signal,damageName,zone,tires)=>render({
  speed:Number(speed),gear:String(gear),damage:Number(damage),fuel:Number(fuel),engine:Number(engine),
  lights:Number(lights),locked:Number(locked),signal:Number(signal),zone:String(zone)
 }));
 cefBridge.on('speedo:visible',v=>render({visible:Number(v)!==0}));
 cefBridge.on('speedo:controls',v=>render({controls:Number(v)!==0}));
 cefBridge.on('speedo:notice',text=>notice(String(text)));
}
window.addEventListener('resize',fit);
// Complete the 300ms parked hold even if the game sends no new speed packet.
setInterval(()=>{
 if(state.visible && state.engine && !state.controls && bodyOpen &&
    Number(state.speed)<=WINGS_CLOSE_AT_KMH) {
   updateBodyOpenState();
   paintWingState();
 }
},100);
setInterval(()=>{
 if(demo && params.get('animated')==='1' && state.engine){demoTick+=.04;render({speed:Math.max(0,Math.round(90+70*Math.sin(demoTick))),gear:'3'});}
 else if(Number(state.signal))render();
},340);
if(demo){
 state={...state,speed:params.get('engine')==='off'?0:69,gear:params.get('engine')==='off'?'N':'2',damage:84,fuel:64,
        engine:params.get('engine')==='off'?0:1,visible:true,zone:'Conference Center'};
 if(params.get('controls')==='1'&&state.engine)state.controls=true;
}
fit();render();
})();
