/* Diamond Admin Panel V1 - no external dependencies.
 * Production events: cef.emit("diamond:ready"), cef.emit("diamond:refresh"),
 * cef.emit("diamond:profile", playerid), cef.emit("diamond:action", action, playerid, note).
 * All data and permissions are authoritative on the Pawn server.
 */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const cefAvailable = !!(window.cef && typeof window.cef.on === 'function' && typeof window.cef.emit === 'function');
  const isDemo = !cefAvailable;
  const navNames = {dashboard:'DASHBOARD',players:'PLAYER MANAGEMENT',inspector:'PLAYER INSPECTOR',punish:'PUNISHMENT',reports:'REPORTS & TICKETS',vehicles:'VEHICLE MANAGEMENT',duty:'ADMIN DUTY',anticheat:'ANTI-CHEAT CENTER',map:'LIVE MAP',economy:'ECONOMY',properties:'PROPERTIES',logs:'ADMIN LOGS',settings:'SETTINGS'};
  const state = { page:'dashboard', admin:{name:'—',level:0}, players:[], selected:-1, profiles:{}, reports:[], selectedReport:-1, logs:[], duty:false, dutySeconds:0, online:0, staff:0, pendingReports:0, onDutyCount:0, uptime:0, lastUpdate:0, pendingConfirm:null };
  let timerReference = Date.now();
  const escapeHTML = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (v) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[v]));
  const fmt = (n) => Number(n||0).toLocaleString('en-US');
  const timeFmt = (seconds) => { const s=Math.max(0,Math.floor(Number(seconds)||0));return [Math.floor(s/3600),Math.floor(s%3600/60),s%60].map(v=>String(v).padStart(2,'0')).join(':'); };
  const emit = (name,...args) => { if (cefAvailable) window.cef.emit(name,...args); else console.info('[DEMO] Event:',name,...args); };
  const on = (name,cb) => { if (cefAvailable) window.cef.on(name,cb); };
  function toast(message,error=false) {const el=document.createElement('div');el.className='toast'+(error?' error':'');el.textContent=message;$('toastZone').append(el);setTimeout(()=>el.remove(),4000);}
  function confirmAction(text, cb) {state.pendingConfirm=cb;$('confirmText').textContent=text;$('confirmModal').hidden=false;}
  $('acceptConfirm').addEventListener('click',()=>{const callback=state.pendingConfirm;state.pendingConfirm=null;$('confirmModal').hidden=true;if(callback)callback();});
  $('cancelConfirm').addEventListener('click',()=>{state.pendingConfirm=null;$('confirmModal').hidden=true;});
  function go(page) {if(!navNames[page])return;state.page=page;document.querySelectorAll('.page').forEach(el=>el.classList.toggle('active',el.id==='page-'+page));document.querySelectorAll('.nav').forEach(el=>el.classList.toggle('active',el.dataset.page===page));$('currentTitle').textContent=navNames[page];if(['players','dashboard'].includes(page))requestPlayers();if(page==='inspector'&&state.selected>=0)requestProfile(state.selected);if(page==='reports')requestReports();if(page==='logs')requestLogs();}
  document.querySelectorAll('[data-page]').forEach(btn=>btn.addEventListener('click',()=>go(btn.dataset.page)));
  document.querySelectorAll('[data-jump]').forEach(btn=>btn.addEventListener('click',()=>go(btn.dataset.jump)));
  let closing = false;
   function close() {
     if (closing) return;
     closing = true;
     // Browser focus must also be released server-side by cef_focus_browser(..., false).
     // Some client integrations provide set_focus; do not assume it exists.
     if (cefAvailable) {
       try { if (typeof window.cef.set_focus === 'function') window.cef.set_focus(false); } catch (error) { console.warn('[Diamond Admin] Client focus release failed', error); }
       emit('diamond:close');
     } else {
       toast('โหมดทดสอบ: ปิดเมนูได้ในเกมผ่าน CEF');
       closing = false;
     }
   }
  $('topClose').addEventListener('click',close);
  document.addEventListener('keydown',(event)=>{if(event.key==='Escape') {if(!$('confirmModal').hidden){$('cancelConfirm').click();return;}close();}});
  const requestPlayers=()=>emit('diamond:refresh'); const requestProfile=(id)=>emit('diamond:profile', Number(id)); const requestReports=()=>emit('diamond:reports'); const requestLogs=()=>emit('diamond:logs');
  $('refreshPlayers').addEventListener('click',requestPlayers);$('refreshReports').addEventListener('click',requestReports);$('refreshLogs').addEventListener('click',requestLogs);$('inspectRefresh').addEventListener('click',()=>state.selected>=0?requestProfile(state.selected):toast('เลือกผู้เล่นก่อน',true));
  $('playerSearch').addEventListener('input',renderPlayers);
  function renderStats(){ $('statPlayers').textContent=fmt(state.online);$('statAdmins').textContent=fmt(state.staff);$('statReports').textContent=fmt(state.pendingReports);$('statDuty').textContent=fmt(state.onDutyCount);$('graphOnline').textContent=fmt(state.online);$('uptime').textContent='UPTIME '+timeFmt(state.uptime);$('onlineBadge').textContent=fmt(state.online);$('reportBadge').textContent=fmt(state.pendingReports);$('adminName').textContent=state.admin.name;$('adminLevel').textContent='LV. '+state.admin.level;$('sidebarConnection').textContent=isDemo?'DEMO PREVIEW':'CEF CONNECTED';$('bridgeTag').textContent=isDemo?'DEMO · PREVIEW':'CEF • CONNECTED';$('bridgeTag').style.color=isDemo?'#ffdf7b':'#40edbc';}
  function renderPlayers(){const term=$('playerSearch').value.trim().toLowerCase();const rows=state.players.filter(p=>String(p.id).includes(term)||p.name.toLowerCase().includes(term));$('playerCounter').textContent=rows.length+' รายการ';$('playerTable').innerHTML=rows.length?rows.map(p=>`<tr data-select="${p.id}" class="${p.id===state.selected?'selected':''}"><td><b>${p.id}</b></td><td>${escapeHTML(p.name)}</td><td>${p.ping} ms</td><td>${p.admin?`LV.${p.admin}`:'—'}</td><td>${p.level}</td><td>${p.world} / ${p.interior}</td><td class="status-online">● ออนไลน์</td></tr>`).join(''):'<tr><td colspan="7"><div class="empty small">ไม่พบผู้เล่น</div></td></tr>';
    document.querySelectorAll('[data-select]').forEach(el=>el.addEventListener('click',()=>selectPlayer(Number(el.dataset.select))));}
function sendAdminReason(action, targetId, reason) {
    const encodedReason = encodeURIComponent(reason);

    cef.emit(
        "diamond:action",
        action,
        Number(targetId),
        encodedReason
    );
}
  function selectPlayer(id){state.selected=id;const p=state.players.find(x=>x.id===id);if(!p)return;$('selectedName').textContent=p.name;$('selectedSubtitle').textContent=`ID ${p.id} • LV.${p.level} • Admin ${p.admin}`;$('selectedPing').textContent=p.ping+' ms';$('selectedState').textContent='ONLINE';$('punishTarget').value=id;renderPlayers();requestProfile(id);}
  function updateProfile(data){const id=Number(data.id);state.profiles[id]=data;if(id!==state.selected)return;$('selectedName').textContent=data.name;$('selectedHp').textContent=Math.round(data.hp)+'/100';$('selectedArmour').textContent=Math.round(data.armour)+'/100';$('selectedCash').textContent='$'+fmt(data.money);$('selectedPing').textContent=data.ping+' ms';$('selectedLoc').textContent=`${Number(data.x).toFixed(1)}, ${Number(data.y).toFixed(1)}, ${Number(data.z).toFixed(1)}`;$('inspectorName').textContent=data.name;$('inspectorId').textContent=`ID ${id} · LV.${data.level} · Admin ${data.admin}`;const items=[['Health',Math.round(data.hp)+'/100'],['Armour',Math.round(data.armour)+'/100'],['Money','$'+fmt(data.money)],['Bank','$'+fmt(data.bank)],['Ping',data.ping+' ms'],['World/Interior',data.world+' / '+data.interior],['Position',`${Number(data.x).toFixed(2)}, ${Number(data.y).toFixed(2)}, ${Number(data.z).toFixed(2)}`],['Vehicle',data.vehicle||'—']];$('inspectorStats').innerHTML=items.map(row=>`<div>${row[0]}<b>${escapeHTML(row[1])}</b></div>`).join('');}
  function sendAction(action,id,reason=''){id=Number(id);if(!Number.isInteger(id)||id<0||(!['spectateoff','repairvehicle','flipvehicle','spawn'].includes(action)&&!state.players.some(p=>p.id===id))){toast('กรุณาเลือกผู้เล่นเป้าหมายที่ออนไลน์',true);return;}if(!isDemo&&state.admin.level<1){toast('ไม่พบสิทธิ์แอดมิน',true);return;}emit('diamond:action',action,id,encodeURIComponent(String(reason).slice(0,90)));if(isDemo)toast('[DEMO] ส่งคำสั่ง '+action+' ID '+id);}
  document.querySelectorAll('[data-action]').forEach(button=>button.addEventListener('click',()=>{const action=button.dataset.action;const id=state.selected;if(['spectateoff','repairvehicle','flipvehicle'].includes(action)){sendAction(action,Math.max(0,id));return;}if(id<0){toast('กรุณาเลือกผู้เล่นจากเมนู Players ก่อน',true);return;}sendAction(action,id);}));
  $('punishSubmit').addEventListener('click',()=>{const id=Number($('punishTarget').value),action=$('punishType').value,reason=$('punishReason').value.trim();if(!state.players.some(p=>p.id===id)){toast('ID ผู้เล่นไม่ออนไลน์',true);return;}if(reason.length<3||new TextEncoder().encode(reason).length>90){toast('กรอกเหตุผล 3–90 ไบต์ (ภาษาไทยประมาณไม่เกิน 30 ตัวอักษร)',true);return;}const target=state.players.find(p=>p.id===id);confirmAction(`ต้องการ ${action.toUpperCase()} ผู้เล่น ${target.name} (ID ${id}) ใช่หรือไม่?\nเหตุผล: ${reason}`,()=>sendAction(action,id,reason));});
  $('spawnVehicle').addEventListener('click',()=>{const model=Number($('vehicleModel').value),color=Number($('vehicleColor').value);if(!Number.isInteger(model)||model<400||model>611||!Number.isInteger(color)||color<0||color>255){toast('Model ต้อง 400–611 และสีต้อง 0–255',true);return;}sendAction('spawn',Math.max(0,state.selected),`${model},${color}`);});
  $('dutyToggle').addEventListener('click',()=>emit('diamond:duty'));
  function renderDuty(){const elapsed=state.duty?state.dutySeconds+Math.floor((Date.now()-timerReference)/1000):0;$('dutyLabel').textContent=state.duty?'ON DUTY':'OFF DUTY';$('dutyLabel').style.color=state.duty?'#48e7ae':'#bfcce0';$('dutyTimer').textContent=timeFmt(elapsed);$('dutyToggle').textContent=state.duty?'สิ้นสุดการเข้าเวร':'เริ่มเข้าเวร';}
  function renderReports(){const reports=state.reports.slice().reverse();$('reportList').innerHTML=reports.length?reports.map(r=>`<div class="report-row ${r.id===state.selectedReport?'selected':''}" data-report="${r.id}"><b>#${r.id} · ${escapeHTML(r.name)}</b><small>${r.status===0?'รอดำเนินการ':r.status===1?'กำลังดำเนินการ':'ปิดเคสแล้ว'}</small><p>${escapeHTML(r.reason)}</p></div>`).join(''):'<div class="empty small">ยังไม่มีรายงานใหม่ในรอบนี้</div>';
   document.querySelectorAll('[data-report]').forEach(el=>el.addEventListener('click',()=>{state.selectedReport=Number(el.dataset.report);renderReports();}));const chosen=state.reports.find(r=>r.id===state.selectedReport);$('chosenReportId').textContent=chosen?'#'+chosen.id:'—';$('chosenReportName').textContent=chosen?chosen.name:'—';$('chosenReportStatus').textContent=chosen?['รอดำเนินการ','กำลังดำเนินการ','ปิดแล้ว'][chosen.status]:'—';$('chosenReportText').textContent=chosen?chosen.reason:'เลือกเคสจากด้านซ้าย';}
  const reportAction=(mode)=>{if(state.selectedReport<0)return toast('เลือกเคสก่อน',true);emit('diamond:report:action',mode,state.selectedReport);if(isDemo){const r=state.reports.find(x=>x.id===state.selectedReport);if(r)r.status=mode==='claim'?1:2;renderReports();}};
  $('claimReport').addEventListener('click',()=>reportAction('claim'));$('resolveReport').addEventListener('click',()=>reportAction('resolve'));
  function renderLogs(){const format=(log)=>`<div class="feed-item"><span class="time">${escapeHTML(log.time)}</span><div><b>${escapeHTML(log.actor)}</b> · <span style="color:#31ccff">${escapeHTML(log.action)}</span><small>${escapeHTML(log.target)} ${escapeHTML(log.detail)}</small></div></div>`;$('logList').innerHTML=state.logs.length?state.logs.slice().reverse().map(format).join(''):'<div class="empty small">ไม่มี Log ในรอบนี้</div>';$('recentLogs').innerHTML=state.logs.length?state.logs.slice(-6).reverse().map(format).join(''):'<div class="empty small">ยังไม่มีรายการ</div>';}
  const saveSetting=(key,value)=>{try{localStorage.setItem('dap_'+key,String(value));}catch(e){}};
  const loadSetting=(key,defaultValue)=>{try{const x=localStorage.getItem('dap_'+key);return x===null?defaultValue:x==='true';}catch(e){return defaultValue;}};
  const settings=[['glowToggle','no-glow','glow'],['compactToggle','compact','compact']];settings.forEach(([id,css,key])=>{const val=loadSetting(key,key==='glow');$(id).checked=val;document.body.classList.toggle(css,key==='glow'?!val:val);$(id).addEventListener('change',()=>{saveSetting(key,$(id).checked);document.body.classList.toggle(css,key==='glow'?!$(id).checked:$(id).checked);});});
  on('diamond:bootstrap',(name,level,online,admins,pending,duty,uptime,staffOnDuty)=>{state.admin={name:String(name),level:Number(level)};state.online=Number(online);state.staff=Number(admins);state.pendingReports=Number(pending);state.duty=Boolean(Number(duty));state.onDutyCount=Number(staffOnDuty);state.uptime=Number(uptime);timerReference=Date.now();renderStats();renderDuty();});
  on('diamond:players:clear',()=>{state.players=[];renderPlayers();});
  on('diamond:player:row',(id,name,admin,ping,level,world,interior,playerState)=>{id=Number(id);const item={id,name:String(name),admin:Number(admin),ping:Number(ping),level:Number(level),world:Number(world),interior:Number(interior),state:Number(playerState)};state.players=state.players.filter(p=>p.id!==id);state.players.push(item);state.players.sort((a,b)=>a.id-b.id);renderPlayers();});
  on('diamond:profile:data',(id,name,hp,armour,money,bank,x,y,z,admin,level,ping,world,interior,vehicle)=>updateProfile({id,name,hp:Number(hp),armour:Number(armour),money:Number(money),bank:Number(bank),x:Number(x),y:Number(y),z:Number(z),admin:Number(admin),level:Number(level),ping:Number(ping),world:Number(world),interior:Number(interior),vehicle:Number(vehicle)}));
  on('diamond:reports:clear',()=>{state.reports=[];renderReports();});
  on('diamond:report:row',(id,name,reason,status)=>{const item={id:Number(id),name:String(name),reason:String(reason),status:Number(status)};state.reports=state.reports.filter(r=>r.id!==item.id);state.reports.push(item);renderReports();});
  on('diamond:report:notice',()=>{toast('มีรายงานใหม่จากผู้เล่น');requestReports();});
  on('diamond:logs:clear',()=>{state.logs=[];renderLogs();});
  on('diamond:log:row',(time,actor,action,target,detail)=>{state.logs.push({time,actor,action,target,detail});renderLogs();});
  on('diamond:duty:state',(enabled,elapsed)=>{state.duty=!!Number(enabled);state.dutySeconds=Number(elapsed);timerReference=Date.now();renderDuty();});
  on('diamond:result',(ok,message)=>{toast(String(message),!Number(ok));if(Number(ok)){requestPlayers();requestReports();requestLogs();if(state.selected>=0)requestProfile(state.selected);}});
  on('diamond:forceclose',()=>{document.body.style.display='none';});
  if(isDemo){state.admin={name:'Diamond_Demo',level:5};state.players=[{id:1,name:'Diamond_Test',admin:5,ping:28,level:24,world:0,interior:0,state:1},{id:12,name:'Player_Example',admin:0,ping:48,level:8,world:0,interior:0,state:1},{id:37,name:'Staff_Helper',admin:2,ping:35,level:20,world:1,interior:0,state:1}];state.online=3;state.staff=2;state.pendingReports=1;state.onDutyCount=1;state.uptime=15367;state.reports=[{id:1,name:'Player_Example',reason:'ตัวอย่างหน้ารายงานสำหรับทดสอบในเบราว์เซอร์',status:0}];state.logs=[{time:'12:30',actor:'Demo_Admin',action:'PREVIEW',target:'-',detail:'ตัวอย่าง UI เท่านั้น'}];renderPlayers();selectPlayer(1);updateProfile({id:1,name:'Diamond_Test',hp:100,armour:50,money:250000,bank:1200000,x:1524.1,y:-1664.2,z:13.4,admin:5,level:24,ping:28,world:0,interior:0,vehicle:0});renderReports();renderLogs();}
  renderStats();renderPlayers();renderReports();renderLogs();renderDuty();setInterval(()=>{if(state.duty)renderDuty();if(!isDemo){state.uptime++;$('uptime').textContent='UPTIME '+timeFmt(state.uptime);}},1000);

  // V3: new modules listen to the existing ZOTTCE event bridge.
  const v3={economy:[],houses:[],map:[],alerts:[],selectedHouse:null,selectedPlayer:null,selectedAlert:null};
  const v3Safe=(v)=>escapeHTML(String(v==null?'':v));
  function v3EconomyRender(){const term=($('v3EconomySearch').value||'').toLowerCase();$('v3EconomyRows').innerHTML=v3.economy.filter(p=>(p.name+' '+p.id).toLowerCase().includes(term)).map(p=>`<tr data-v3money="${p.id}"><td>${p.id}</td><td>${v3Safe(p.name)}</td><td>$${fmt(p.cash)}</td><td>$${fmt(p.bank)}</td></tr>`).join('')||'<tr><td colspan="4">ไม่มีข้อมูล</td></tr>';document.querySelectorAll('[data-v3money]').forEach(row=>row.onclick=()=>{$('v3MoneyTarget').value=row.dataset.v3money;});}
  function v3HouseRender(){const term=($('v3HouseSearch').value||'').toLowerCase();$('v3HouseRows').innerHTML=v3.houses.filter(h=>(h.address+' '+h.houseid+' '+h.slot).toLowerCase().includes(term)).map(h=>`<tr data-v3house="${h.slot}"><td>${h.slot} / ${h.houseid}</td><td>${v3Safe(h.address)}</td><td>${h.owner}</td><td>$${fmt(h.price)}</td><td>${h.locked?'ล็อก':'ปลดล็อก'}</td></tr>`).join('')||'<tr><td colspan="5">ไม่พบบ้าน</td></tr>';document.querySelectorAll('[data-v3house]').forEach(row=>row.onclick=()=>{v3.selectedHouse=Number(row.dataset.v3house);const h=v3.houses.find(x=>x.slot===v3.selectedHouse);$('v3HouseDetail').innerHTML=Object.entries({ 'House ID':h.houseid,'Address':h.address,'Owner Account ID':h.owner,'Price':'$'+fmt(h.price),'Coordinates':[h.x,h.y,h.z].map(n=>Number(n).toFixed(2)).join(', '),'World':h.world}).map(([k,v])=>`<div>${k}<b>${v3Safe(v)}</b></div>`).join('');});}
  function v3MapRender(){const term=($('v3MapSearch').value||'').toLowerCase();$('v3MapList').innerHTML=v3.map.filter(p=>(p.name+' '+p.id).toLowerCase().includes(term)).map(p=>`<button class="btn secondary v3-map-person" data-v3player="${p.id}">${v3Safe(p.name)} · ${p.id}</button>`).join('');document.querySelectorAll('[data-v3player]').forEach(el=>el.onclick=()=>v3MapSelect(Number(el.dataset.v3player)));const surface=$('v3MapSurface');surface.querySelectorAll('.v3-map-dot').forEach(el=>el.remove());v3.map.filter(p=>p.world===0&&p.interior===0).forEach(p=>{const dot=document.createElement('button');dot.className='v3-map-dot '+(p.admin?'is-admin':'');dot.title=p.name+' ('+p.id+')';dot.style.left=Math.max(0,Math.min(100,(p.x+3000)/60))+'%';dot.style.top=Math.max(0,Math.min(100,(3000-p.y)/60))+'%';dot.onclick=()=>v3MapSelect(p.id);surface.appendChild(dot);});}
  function v3MapSelect(id){const p=v3.map.find(p=>p.id===id);if(!p)return;v3.selectedPlayer=id;state.selected=id;$('v3MapDetail').innerHTML=Object.entries({'Player':p.name,'ID':p.id,'X':p.x,'Y':p.y,'Z':p.z,'World':p.world,'Interior':p.interior}).map(([k,v])=>`<div>${k}<b>${v3Safe(v)}</b></div>`).join('');}
  function v3AlertsRender(){$('v3AlertList').innerHTML=v3.alerts.map((a,i)=>`<div class="report-row" data-v3alert="${i}"><b>${v3Safe(a.name)} (ID ${a.id})</b><p>${v3Safe(a.detail)}</p></div>`).join('')||'<div class="empty small">ยังไม่มี Alert ในรอบนี้</div>';document.querySelectorAll('[data-v3alert]').forEach(el=>el.onclick=()=>{v3.selectedAlert=v3.alerts[Number(el.dataset.v3alert)];$('v3AlertDetail').innerHTML=`<div>ผู้เล่น<b>${v3Safe(v3.selectedAlert.name)}</b></div><div>ข้อมูล<b>${v3Safe(v3.selectedAlert.detail)}</b></div>`;});}
  on('diamond:v3:economy:clear',()=>{v3.economy=[];v3EconomyRender();});
  on('diamond:v3:economy:row',(id,name,cash,bank,admin)=>{v3.economy.push({id:Number(id),name:String(name),cash:Number(cash),bank:Number(bank),admin:Number(admin)});v3EconomyRender();});
  on('diamond:v3:properties:clear',()=>{v3.houses=[];v3HouseRender();});
  on('diamond:v3:property:row',(slot,houseid,owner,address,price,locked,x,y,z,world)=>{v3.houses.push({slot:Number(slot),houseid:Number(houseid),owner:Number(owner),address:String(address),price:Number(price),locked:Number(locked),x:Number(x),y:Number(y),z:Number(z),world:Number(world)});v3HouseRender();});
  on('diamond:v3:map:clear',()=>{v3.map=[];v3MapRender();});
  on('diamond:v3:map:row',(id,name,x,y,z,world,interior,admin)=>{v3.map.push({id:Number(id),name:String(name),x:Number(x),y:Number(y),z:Number(z),world:Number(world),interior:Number(interior),admin:Number(admin)});v3MapRender();});
  on('diamond:v3:alerts:clear',()=>{v3.alerts=[];v3AlertsRender();});
  on('diamond:v3:alert:row',(id,name,detail,level,time)=>{v3.alerts.push({id:Number(id),name:String(name),detail:String(detail),level:Number(level),time:Number(time)});v3AlertsRender();});
  $('v3EconomyRefresh').onclick=()=>emit('diamond:v3:economy');$('v3EconomySearch').oninput=v3EconomyRender;
  $('v3PropertyRefresh').onclick=()=>emit('diamond:v3:properties');$('v3HouseSearch').oninput=v3HouseRender;
  $('v3MapRefresh').onclick=()=>emit('diamond:v3:map');$('v3MapSearch').oninput=v3MapRender;
  $('v3AlertsRefresh').onclick=()=>emit('diamond:v3:alerts');
  $('v3HouseGoto').onclick=()=>{if(v3.selectedHouse===null)return toast('เลือกบ้านก่อน',true);emit('diamond:v3:property:goto',v3.selectedHouse);};
  $('v3MapGoto').onclick=()=>{if(v3.selectedPlayer===null)return toast('เลือกผู้เล่นก่อน',true);sendAction('goto',v3.selectedPlayer);};
  $('v3AlertSpectate').onclick=()=>{if(!v3.selectedAlert)return toast('เลือก Alert ก่อน',true);sendAction('spectate',v3.selectedAlert.id);};
  $('v3MoneySubmit').onclick=()=>{const id=Number($('v3MoneyTarget').value),amount=Number($('v3MoneyAmount').value),reason=$('v3MoneyReason').value.trim();if(!Number.isInteger(id)||!Number.isInteger(amount)||amount<0||amount>2000000000||!/^\S{3,90}$/.test(reason))return toast('ตรวจสอบ ID ยอดเงิน และเหตุผลภาษาอังกฤษที่ไม่มีช่องว่าง',true);const p=v3.economy.find(x=>x.id===id);if(!p)return toast('Player ID ไม่ออนไลน์',true);confirmAction(`กำหนดเงินสดของ ${p.name} เป็น $${fmt(amount)}? เหตุผล: ${reason}`,()=>emit('diamond:v3:money:set',id,amount,reason));};
  // Call new module handlers when entering each page.
  document.querySelectorAll('.nav[data-page], [data-jump]').forEach(el=>el.addEventListener('click',()=>{const dest=el.dataset.page||el.dataset.jump;const evt={economy:'diamond:v3:economy',properties:'diamond:v3:properties',map:'diamond:v3:map',anticheat:'diamond:v3:alerts'}[dest];if(evt)emit(evt); }));

  // V4 advanced buttons use one protocol, with UTF-8 encoded as ASCII percent escapes.
  // This avoids Thai whitespace/IME splitting in the Pawn CEF bridge.
  const v4TargetLabel=$('v4Selected');
  function v4Sync(){ const p=state.players.find(p=>p.id===state.selected);v4TargetLabel.textContent=p?`${p.name} (ID ${p.id})`:'กรุณาเลือกผู้เล่น'; }
  document.querySelector('#playerTable').addEventListener('click',()=>setTimeout(v4Sync,0));
  const v4ValueActions=new Set(['jail','givecash','setcash','sethp','setarmour','setfaction','setrank','setadmin','healall','armourall']);
  document.querySelectorAll('[data-v4]').forEach(btn=>btn.addEventListener('click',()=>{
    const action=btn.dataset.v4;
    const id=state.selected;
    const reason=$('v4Reason').value.trim();
    const raw=$('v4Amount').value.trim();
    const value=Number(raw);
    if(id<0||!state.players.some(p=>p.id===id))return toast('กรุณาเลือกผู้เล่นก่อน',true);
    if(reason.length<3||new TextEncoder().encode(reason).length>480)return toast('กรอกเหตุผล 3–480 ไบต์ (รองรับภาษาไทย)',true);
    if(v4ValueActions.has(action)&&(!raw||!Number.isSafeInteger(value)))return toast('กรอกตัวเลขจำนวนเต็ม',true);
    const actual=v4ValueActions.has(action)?value:0;
    const player=state.players.find(p=>p.id===id);
    confirmAction(`ยืนยัน ${btn.textContent.trim()}\nเป้าหมาย: ${player.name} (ID ${id})\nค่า: ${actual}\nเหตุผล: ${reason}`,()=>{
      emit('diamond:v4:action',action,id,actual,encodeURIComponent(reason));
    });
  }));
  // A legacy UI validation incorrectly required one word only.
  $('v3MoneySubmit').onclick=()=>{
    const id=Number($('v3MoneyTarget').value), amount=Number($('v3MoneyAmount').value);
    const reason=$('v3MoneyReason').value.trim();
    if(!Number.isInteger(id)||!Number.isSafeInteger(amount)||amount<0||amount>1000000000||reason.length<3||new TextEncoder().encode(reason).length>480)return toast('ตรวจ ID ยอดเงินและเหตุผล (ใช้ภาษาไทยได้)',true);
    const p=v3.economy.find(p=>p.id===id);if(!p)return toast('ไม่พบผู้เล่นออนไลน์',true);
    confirmAction(`กำหนดเงินสดของ ${p.name} เป็น $${fmt(amount)}?\nเหตุผล: ${reason}`,()=>emit('diamond:v4:action','setcash',id,amount,encodeURIComponent(reason)));
  };
  on('diamond:v4:profile',(id,cuffed,frozen,jail,faction,rank)=>{
    if(Number(id)!==state.selected)return;
    v4TargetLabel.textContent=`ID ${id} · Freeze ${Number(frozen)?'ON':'OFF'} · Cuff ${Number(cuffed)?'ON':'OFF'} · Jail ${jail}s · Group ${faction} / Rank ${rank}`;
  });
  if(cefAvailable) emit('diamond:ready');
})();