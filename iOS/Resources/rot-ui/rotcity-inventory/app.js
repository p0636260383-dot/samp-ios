(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const cef = window.cef && typeof window.cef.emit === 'function' && typeof window.cef.on === 'function' ? window.cef : null;
  const items = new Map();
  const catalogItems = new Map();
  let catalogMode = false, characterId = 'none', positions = Array(50).fill(null);
  let capacitySize = 50;
  const icons = {WATER:'💧',FOOD:'🥫',BANDAGE:'🩹',ANTIDOTE:'💉',SCRAP:'🔩',AMMO:'📦',FUEL:'⛽',WATER_LARGE:'🚰',SODA:'🥤',ENERGY:'⚡',BEANS:'🥫',TUNA:'🐟',CRACKER:'🍞',CHOCOLATE:'🍫',MRE:'🎖️',APPLE:'🍎',RAW_MEAT:'🥩',COOKED_MEAT:'🍖',PAINKILLER:'💊',MEDKIT:'🧰',ANTISEPTIC:'🧪',VITAMIN:'💊',RAG:'🧵',WOOD:'🪵',NAIL:'📌',TAPE:'🧷',ROPE:'🪢',BATTERY:'🔋',FLASHLIGHT:'🔦',TOOLKIT:'🧰',FILTER:'🧴',MASK:'😷',HERB:'🌿',MATCH:'🔥',PLASTIC:'🧴',WIRE:'🔌',ATT_BARREL:'🔫',ATT_SILENCER:'🔇',ATT_SPRING:'⚙️',ATT_SLING:'🛡️'};
  const categories = ['อาหาร','เครื่องดื่ม','เวชภัณฑ์','วัสดุ','อุปกรณ์','อาวุธ','กระสุน'];
  let category = 'all', selected = -1;
  let inventoryOpen = false;
  // เริ่มต้นเป็น false เสมอ: ห้ามช่องลัดปรากฏก่อนเซิร์ฟเวอร์อนุญาต
  let hotbarAuthorized = false;
  function setHotbarAuthorized(value) {
    hotbarAuthorized = value === true;
    if(!hotbarAuthorized) {for(let i=0;i<5;i++) quick[i]={id:-1,key:'',name:'',quantity:0,usable:false};}
    document.body.classList.toggle('hotbar-authorized', hotbarAuthorized);
    $('hotbar').hidden = !hotbarAuthorized;
  }
  let toastTimer = null;
  const quick = Array.from({length:5},()=>({id:-1,key:'',name:'',quantity:0,usable:false}));
  const send = (event, ...parts) => { if (cef) cef.emit(event, ...parts); };
  const isTyping = node => node && (['INPUT','TEXTAREA','SELECT'].includes(node.tagName) || node.isContentEditable);
  const canUse = item => item && item.quantity > 0 && item.usable;
  const niceWeight = n => (Number(n || 0)/10).toFixed(1);
  function icon(item) {
    // Prefer shared PNG icons (item_001..item_100) via RotItems
    const id = item && Number.isInteger(item.id) ? item.id : -1;
    if (id >= 0 && window.RotItems && typeof RotItems.iconHTML === 'function') {
      const html = RotItems.iconHTML(id, 40);
      if (html) return { html: html };
    }
    if (item && item.id>=97 && item.id<=100) return '😷';
    if (item && item.id>=83 && item.id<=96) return '📦';
    if (item && item.id>=36 && item.id<=82) return item.id>=58 && item.id<=74 ? '🔫' : (item.id>=52 && item.id<=54 ? '💣' : '⚔️');
    return icons[item?.key] || '📦';
  }
  function applyIcon(el, item) {
    const ic = icon(item);
    if (ic && typeof ic === 'object' && ic.html) {
      el.innerHTML = ic.html;
      const img = el.querySelector('img');
      if (img) {
        img.addEventListener('error', function() {
          this.onerror = null;
          el.textContent = icons[item?.key] || '📦';
        }, { once: true });
      }
      return;
    }
    el.textContent = String(ic || '📦');
  }
  function notice(text) { $('notice').textContent = String(text || '').slice(0,180); }
  // ชื่อภาษาไทยเก็บเป็น UTF-8 ใน CEF ป้องกันชื่อเพี้ยนจาก Pawn CP874
  const thaiNames = ['น้ำดื่ม','อาหารกระป๋อง','ผ้าพันแผล','ยาต้านเชื้อ','เศษเหล็ก','กระสุน','น้ำมัน','น้ำดื่มขวดใหญ่','น้ำอัดลม','เครื่องดื่มชูกำลัง','ถั่วกระป๋อง','ปลาทูน่า','ขนมปังกรอบ','ช็อกโกแลต','อาหารทหาร','แอปเปิล','เนื้อดิบ','เนื้อปรุงสุก','ยาแก้ปวด','ชุดปฐมพยาบาล','น้ำยาฆ่าเชื้อ','วิตามิน','เศษผ้า','ไม้','ตะปู','เทปกาว','เชือก','แบตเตอรี่','ไฟฉาย','กล่องเครื่องมือ','เครื่องกรองน้ำ','หน้ากาก','สมุนไพร','ไม้ขีดไฟ','พลาสติก','ลวด'];
  // Item ID 36..82 = Weapon ID 0..46; ป้องกันแสดงชื่อผิดเมื่อ Pawn ใช้ CP874
  const weaponNames = ["ไม่มีอาวุธ", "สนับมือ", "ไม้กอล์ฟ", "กระบอง", "มีด", "ไม้เบสบอล", "พลั่ว", "ไม้พูล", "ดาบคาตานะ", "เลื่อยยนต์", "ดิลโด้สีม่วง", "ดิลโด้", "ไวเบรเตอร์", "ไวเบรเตอร์เงิน", "ดอกไม้", "ไม้เท้า", "ระเบิดมือ", "แก๊สน้ำตา", "โมโลตอฟ", "อาวุธสำรอง 19", "อาวุธสำรอง 20", "อาวุธสำรอง 21", "ปืนพก 9mm", "ปืนพกเก็บเสียง", "Desert Eagle", "ปืนลูกซอง", "ลูกซองสั้น", "ลูกซองต่อเนื่อง", "Micro Uzi", "MP5", "AK-47", "M4", "Tec-9", "ไรเฟิล", "สไนเปอร์", "RPG", "จรวดล็อกเป้า", "เครื่องพ่นไฟ", "มินิกัน", "ระเบิดติดตั้ง", "ตัวจุดระเบิด", "สเปรย์", "ถังดับเพลิง", "กล้องถ่ายรูป", "กล้องมองกลางคืน", "กล้องจับความร้อน", "ร่มชูชีพ"];
  const ammoNames = ['กระสุน 9mm','กระสุน 9mm เก็บเสียง','กระสุน .50 AE','กระสุนลูกซอง','กระสุน SMG','กระสุนไรเฟิลจู่โจม','กระสุนไรเฟิลแม่นยำ','จรวด RPG','จรวดติดตามเป้า','เชื้อเพลิงเครื่องพ่นไฟ','กระสุนมินิกัน','กระป๋องสีสเปรย์','น้ำยาถังดับเพลิง','ฟิล์มกล้อง'];
  const weaponDamage = {1:8,2:10,3:12,4:18,5:13,6:12,7:12,8:25,9:35,15:8,16:40,22:18,23:20,24:42,25:12,26:9,27:13,28:13,29:14,30:22,31:24,32:13,33:35,34:65};
  const ammoByWeapon = {22:0,23:1,24:2,25:3,26:3,27:3,28:4,29:4,32:4,30:5,31:5,33:6,34:6,35:7,36:8,37:9,38:10,41:11,42:12,43:13};
  const extraNames = {
    100:'แผ่นเหล็ก', 101:'อิฐ', 102:'ปูนซีเมนต์', 103:'บานพับ', 104:'ยางรถ',
    105:'ชิ้นส่วนเครื่องยนต์', 106:'แบตเตอรี่รถ', 107:'กุญแจรถ', 108:'ชุดซ่อมรถ',
    109:'แผ่นกระจก', 110:'พลุสัญญาณแอร์ดรอป', 111:'ลำกล้องเสริม',
    112:'ชุดเก็บเสียง', 113:'สปริงและชุดลั่นไก', 114:'สายสะพาย/เกราะกันกระสุน', 115:'ชะแลง'
  };
  const itemName = item => extraNames[item.id] ? extraNames[item.id] : item.id >= 97 && item.id <= 99 ? 'หน้ากากกันแก๊สพิษ LV.'+(item.id-96) : item.id >= 83 && item.id <= 96 ? ammoNames[item.id-83] : item.id >= 36 && item.id <= 82 ? weaponNames[item.id - 36] : (thaiNames[item.id] || item.key || ('ITEM #'+item.id));
  const ammoExplanation = item => {
    if(!item) return '';
    if(item.id>=97 && item.id<=99) return ' • ลดพิษจาก Toxic '+((item.id-96)*30)+'% • กดใช้เพื่อสวม/ถอด';
    if(item.id>=83 && item.id<=96) return ' • ใช้กับ: '+Object.keys(ammoByWeapon).filter(id=>ammoByWeapon[id]===item.id-83).map(id=>weaponNames[Number(id)]).join(', ');
    if(item.id>=36 && item.id<=82) { const type=ammoByWeapon[item.id-36]; return (type===undefined?' • ไม่ใช้แพ็กกระสุน':' • กระสุนที่ใช้: '+ammoNames[type]+' (Item ID '+(83+type)+')')+(weaponDamage[item.id-36]!==undefined?' • ดาเมจตั้งต้น: '+weaponDamage[item.id-36]:' • ดาเมจ: ค่าเกมเดิม'); }
    return '';
  };
  const storageKey = () => 'rotcity.inv.positions.v23.' + characterId;
  function loadPositions() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey()));
      positions = Array.from({length:Math.max(50,capacitySize)}, (_,i) => Number.isInteger(saved?.[i]) ? saved[i] : null);
    } catch (_) {positions = Array(Math.max(50,capacitySize)).fill(null);}
  }
  function reconcilePositions() {
    // จำนวนไอเทมต้องมาจากเซิร์ฟเวอร์เท่านั้น; ข้อมูลบนเครื่องเก็บแค่ลำดับ
    // เรียงชิดซ้ายบน — ไม่เว้นช่องว่างระหว่างไอเทม
    const owned = new Set([...items.values()].filter(x=>x.quantity>0).map(x=>x.id));
    const used = new Set();
    const packed = [];
    for (const id of positions) {
      if (id == null || !owned.has(id) || used.has(id)) continue;
      used.add(id);
      packed.push(id);
    }
    for (const id of owned) {
      if (used.has(id)) continue;
      used.add(id);
      packed.push(id);
    }
    const size = Math.max(capacitySize, packed.length);
    positions = Array.from({length: size}, (_, i) => i < packed.length ? packed[i] : null);
    try {localStorage.setItem(storageKey(),JSON.stringify(positions));} catch (_) {}
  }
  function setCatalogMode(v) {
    catalogMode=Boolean(v); selected=-1;
    $('gridHint').textContent=catalogMode?'รายการไอเทมทั้งหมด • ID / รูป / น้ำหนัก / Stack':'ลากไอเทมเพื่อสลับช่อง • แสดงเฉพาะของที่มี';
    $('useBtn').hidden=catalogMode; $('dropBtn').hidden=catalogMode;
    document.querySelector('.quick-assign').hidden=catalogMode;
    document.querySelector('.give-panel').hidden=catalogMode;
    $('adminSetPanel').hidden=!catalogMode;
    $('adminSetNotice').textContent='';
    $('inventoryVersion').textContent=catalogMode?'ROT CITY • ADMIN ITEM LIST':'ROT CITY • INVENTORY v2.7';
    document.querySelector('.headcopy h1').textContent=catalogMode?'ADMIN ITEM LIST':'กระเป๋าผู้รอดชีวิต';
    render();
  }
  function swapPositions(from,to) {
    if(catalogMode || from===to || !Number.isInteger(from) || !Number.isInteger(to) ||
       from<0 || to<0 || from>=positions.length || to>=positions.length || positions[from]===null) return;
    [positions[from],positions[to]]=[positions[to],positions[from]];
    reconcilePositions(); render();
  }
  function makeTile(item,slot,allowDrag) {
    const node=document.createElement('button');node.type='button';
    node.className='tile' + (item&&selected===item.id?' selected':'') + (!item?' empty':'') + (catalogMode?' catalog-tile':'');
    if(item) {
      node.title=itemName(item)+(catalogMode?(' • ID '+item.id):'');
      const itemIcon=document.createElement('div');itemIcon.className='icon';applyIcon(itemIcon, item);
      const title=document.createElement('div');title.className='title';title.textContent=itemName(item);
      // กระเป๋า: แสดงจำนวนอย่างเดียว | รายการแอดมิน: แสดง ID ด้านล่าง (ไม่มีเลขมุม 00/01)
      const qty=document.createElement('span');qty.className='qty';
      qty.textContent=catalogMode?('ID '+item.id):('x'+item.quantity);
      node.append(itemIcon,title,qty);
      node.addEventListener('click',()=>{selected=item.id;render();});
    }
    if(allowDrag) {
      node.draggable=Boolean(item);
      node.addEventListener('dragstart',ev=>{if(!item){ev.preventDefault();return;} ev.dataTransfer.effectAllowed='move';ev.dataTransfer.setData('application/x-rot-item', String(item.id));ev.dataTransfer.setData('text/plain',String(slot));});
      node.addEventListener('dragover',ev=>{ev.preventDefault();node.classList.add('drop-target');});
      node.addEventListener('dragleave',()=>node.classList.remove('drop-target'));
      node.addEventListener('drop',ev=>{
        ev.preventDefault();node.classList.remove('drop-target');
        const sourceHotbar=ev.dataTransfer.getData('application/x-rot-hotbar');
        if(sourceHotbar!=='') { unbindSlot(Number(sourceHotbar)); return; }
        swapPositions(Number(ev.dataTransfer.getData('text/plain')),slot);
      });
      node.addEventListener('dragend',()=>document.querySelectorAll('.drop-target').forEach(el=>el.classList.remove('drop-target')));
    }
    return node;
  }
  function render() {
    const grid=$('inventoryGrid');grid.replaceChildren();
    const source=catalogMode?catalogItems:items;
    const visible=item => item && (catalogMode || item.quantity>0) && (category==='all'||String(item.category)===category);
    if(catalogMode) {
      for(const item of source.values()) if(visible(item)) grid.append(makeTile(item,item.id,false));
    } else {
      reconcilePositions();
      if (category === 'all') {
        // ไอเทมชิดกันด้านหน้า ช่องว่างเฉพาะท้ายตามความจุ
        const limit = Math.max(capacitySize, positions.length);
        for (let i = 0; i < limit; i++) {
          const item = items.get(positions[i]);
          grid.append(makeTile(item && item.quantity > 0 ? item : null, i, true));
        }
      } else {
        // แท็บหมวด — แสดงเฉพาะของในหมวด เรียงชิด ไม่ใส่ช่องว่างคั่น
        for (let i = 0; i < positions.length; i++) {
          const item = items.get(positions[i]);
          if (visible(item)) grid.append(makeTile(item, i, true));
        }
      }
    }
    const item=source.get(selected);
    if(item) applyIcon($('detailIcon'), item); else $('detailIcon').textContent='🎒';
    $('detailName').textContent=item?itemName(item):'เลือกไอเทม';
    $('detailKey').textContent=item?((item.id>=36&&item.id<=82)?'Weapon ID '+(item.id-36)+' • '+item.key:'ID '+item.id+' • '+item.key):'NO ITEM SELECTED';
    $('detailInfo').textContent=item?categories[item.category]+(item.usable?' • ใช้งานได้':' • วัสดุหรือของสะสม')+ammoExplanation(item):'เลือกไอเทมทางซ้าย';
    $('detailQty').textContent=item?(catalogMode?'รายการแค็ตตาล็อก':item.quantity+' ชิ้น'):'—';
    $('detailWeight').textContent=item?niceWeight(item.weight)+' กก.':'—';
    $('catalogDetails').hidden=!catalogMode;
    $('catalogDetails').textContent=catalogMode&&item?'ITEM ID: '+item.id+' | STACK: '+item.stack+' | KEY: '+item.key:'';
    $('useBtn').disabled=catalogMode||!canUse(item);
    $('dropBtn').disabled=catalogMode||!item||!item.quantity;
    $('giveBtn').disabled=catalogMode||!item||!item.quantity;
    $('adminSetSubmit').disabled=!catalogMode||!item;
    renderBindSlots(catalogMode?null:item);
  }
  function setStatus(count, capacity, weight, max, hunger, thirst) {
    capacitySize=Math.max(1,Number(capacity)||50);
    $('capacity').textContent=Number(count)+'/'+capacitySize;
    $('weight').textContent=niceWeight(weight)+' / '+niceWeight(max)+' กก.';
    $('weightBar').style.width=Math.min(100,100*(Number(weight)/Math.max(Number(max),1)))+'%';
    $('hunger').textContent=Number(hunger)+'%'; $('thirst').textContent=Number(thirst)+'%';
  }
  function showToast(msg) {
    $('hotbarToast').textContent = String(msg || '').slice(0,90);
    $('hotbarToast').classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(()=>$('hotbarToast').classList.remove('show'),2400);
  }
  // ผูก/ถอดผ่านเซิร์ฟเวอร์เท่านั้น ป้องกันไอเทมปลอมและการซิงก์ไม่ตรงกัน
  function assignSlot(slot, id) {
    if(!inventoryOpen || catalogMode || !Number.isInteger(slot) || slot<0 || slot>=5) return;
    const item=items.get(id);
    if(!canUse(item)) return notice('ไม่มีไอเทมนี้ในกระเป๋าจริง');
    send('rotinv.assign', `${slot} ${id}`);
  }
  function unbindSlot(slot) {
    if(!inventoryOpen || catalogMode || !Number.isInteger(slot) || slot<0 || slot>=5) return;
    send('rotinv.unbind', String(slot));
  }
  function renderQuick() {
    const root = $('quickbarSlots'); root.replaceChildren();
    for (let slot=0; slot<5; slot++) {
      const item=quick[slot];
      const owned=items.get(item.id);
      const isEmpty = !owned || !owned.quantity || item.id<0 || item.quantity<=0;
      const el=document.createElement('button'); el.type='button';
      el.className='quick-cell' + (isEmpty?' unassigned':'');
      el.title=isEmpty?'ช่อง '+(slot+1)+' ว่าง':`${item.name} x${owned.quantity}`;
      el.innerHTML=`<span class="qnum">${slot+1}</span><span class="qicon"></span><span class="qname"></span><span class="qcount"></span>`;
      if(isEmpty) el.querySelector('.qicon').textContent=''; else applyIcon(el.querySelector('.qicon'), item);
      el.querySelector('.qname').textContent=isEmpty?'':item.name;
      el.querySelector('.qcount').textContent=isEmpty?'':'x'+owned.quantity;
      el.draggable=inventoryOpen && !isEmpty;
      el.addEventListener('dragstart',ev=>{
        if(!inventoryOpen || isEmpty) return ev.preventDefault();
        ev.dataTransfer.effectAllowed='move';
        ev.dataTransfer.setData('application/x-rot-hotbar',String(slot));
        ev.dataTransfer.setData('text/plain',String(slot));
      });
      el.addEventListener('dragover',ev=>{if(inventoryOpen){ev.preventDefault();el.classList.add('drop-target');}});
      el.addEventListener('dragleave',()=>el.classList.remove('drop-target'));
      el.addEventListener('drop',ev=>{
        ev.preventDefault();el.classList.remove('drop-target');
        if(!inventoryOpen)return;
        const itemId=ev.dataTransfer.getData('application/x-rot-item');
        if(itemId!=='') assignSlot(slot,Number(itemId));
        else {const from=ev.dataTransfer.getData('application/x-rot-hotbar'); if(from!=='' && Number(from)!==slot){
          const source=quick[Number(from)]; if(source && source.id>=0){assignSlot(slot,source.id);unbindSlot(Number(from));}
        }}
      });
      el.addEventListener('click',()=>{
        if(inventoryOpen){
          const chosen=items.get(selected);
          if(canUse(chosen)) assignSlot(slot,chosen.id);
          else if(!isEmpty) unbindSlot(slot);
        } else useQuick(slot);
      });
      root.append(el);
    }
  }
  function renderBindSlots(item) {
    const root=$('bindSlots');root.replaceChildren();
    for(let i=0;i<5;i++) {
      const btn=document.createElement('button');btn.type='button';btn.textContent=String(i+1);
      btn.className='bind-button' + (item && quick[i].id===item.id?' attached':'');
      btn.disabled=!item || !canUse(item);
      btn.addEventListener('click',()=>{
        if(!canUse(item)) return;
        send('rotinv.assign', String(i)+' '+String(item.id));
        notice(quick[i].id===item.id ? 'กำลังยกเลิกผูกช่อง '+(i+1)+'...' : 'กำลังผูกช่อง '+(i+1)+'...');
      });
      root.append(btn);
    }
  }
  function useQuick(index) {
    if (inventoryOpen) return;
    if (!Number.isInteger(index) || index < 0 || index > 4) return;
    if (!hotbarAuthorized) {
      showToast('ช่องลัดยังไม่พร้อม — รอโหลดตัวละคร');
      return;
    }
    // ส่งให้เซิร์ฟเป็นผู้ตัดสินเสมอ (ไม่บล็อกด้วยสถานะ CEF ที่อาจคลาดเคลื่อน)
    send('rotinv.hotkey', String(index));
    const item = quick[index];
    if (!item || item.id < 0) showToast('ช่อง '+(index+1)+' ว่าง — เปิดกระเป๋า เลือกของ แล้วกด '+ (index+1) +' เพื่อผูก');
  }
  function setOpen(open) {
    inventoryOpen=Boolean(open);
    $('inventoryShell').classList.toggle('is-open',inventoryOpen);
    renderQuick();
    document.body.classList.toggle('inventory-open',inventoryOpen);
  }
  function close() {
    if (cef) {
      if (typeof cef.set_focus === 'function') cef.set_focus(false);
      cef.emit('rotinv.close');
    } else setOpen(false);
  }
  $('closeBtn').addEventListener('click', close);
  function slotFromKeyEvent(ev) {
    // รองรับ: Digit1-5, Numpad1-5, key 1-5, keyCode 49-53,
    // และแถวตัวเลขตอนคีย์บอร์ดไทย (ๅ / - ภ ถ)
    const code = String(ev.code || '');
    let m = /^Digit([1-5])$/.exec(code) || /^Numpad([1-5])$/.exec(code);
    if (m) return Number(m[1]);
    const k = String(ev.key || '');
    if (/^[1-5]$/.test(k)) return Number(k);
    // แป้นพิมพ์ไทย (Kedmanee) แถวบน
    const thaiRow = {'ๅ':1,'/':2,'-':3,'ภ':4,'ถ':5};
    if (thaiRow[k]) return thaiRow[k];
    const kc = Number(ev.keyCode || ev.which || 0);
    if (kc >= 49 && kc <= 53) return kc - 48;      // top row 1-5
    if (kc >= 97 && kc <= 101) return kc - 96;     // numpad 1-5
    return 0;
  }
  function handleSlotKey(ev) {
    if (isTyping(ev.target)) return false;
    if (inventoryOpen && (ev.key==='Escape' || (ev.key && ev.key.toLowerCase()==='h'))) {
      ev.preventDefault(); close(); return true;
    }
    if (ev.repeat) return false;
    if (!inventoryOpen && (ev.code === 'KeyU' || (ev.key && ev.key.toLowerCase() === 'u'))) {
      ev.preventDefault();
      ev.stopPropagation();
      if (cef) cef.emit('rotradio.togglefocus', '1');
      return true;
    }
    const value = slotFromKeyEvent(ev);
    if (value < 1 || value > 5) return false;
    ev.preventDefault();
    ev.stopPropagation();
    if (inventoryOpen && !catalogMode) {
      const item = items.get(selected);
      if (canUse(item)) {
        assignSlot(value - 1, item.id);
        notice('กำลังผูก/ยกเลิกช่อง ' + value + '...');
      } else {
        notice('เลือกไอเทมที่ใช้งานได้ก่อน แล้วกด ' + value + ' เพื่อผูกช่องลัด');
      }
    } else if (!inventoryOpen) {
      useQuick(value - 1);
    }
    return true;
  }
  window.addEventListener('keydown', handleSlotKey, true);
  document.addEventListener('keydown', handleSlotKey, true);
  $('tabs').addEventListener('click', ev => {const btn=ev.target.closest('[data-category]');if(!btn)return; category=btn.dataset.category; for(const x of $('tabs').querySelectorAll('button'))x.classList.toggle('active',x===btn); render();});
  $('useBtn').addEventListener('click', () => {const item=items.get(selected);if (canUse(item) && cef) cef.emit('rotinv.use',String(item.id));});
  $('dropBtn').addEventListener('click', () => {const item=items.get(selected);if (item && item.quantity && cef) cef.emit('rotinv.drop',String(item.id));});
  // CEF แค่ส่งความต้องการ Server ตรวจยศและจำนวนจริงเสมอ
  $('adminSetSubmit').addEventListener('click',()=>{
    if(!catalogMode || !cef) return;
    const item=catalogItems.get(selected);
    const target=$('adminSetTarget').value.trim();
    const delta=$('adminSetAmount').value.trim();
    if(!item || !/^\d{1,4}$/.test(target) || !/^-?\d{1,3}$/.test(delta) ||
      Number(delta)===0 || Math.abs(Number(delta))>100 || Number(target)>999) {
      $('adminSetNotice').textContent='กรุณาเลือกไอเทม และกรอก Player ID กับจำนวน ±1 ถึง ±100';
      return;
    }
    $('adminSetSubmit').disabled=true;
    $('adminSetNotice').textContent='กำลังตรวจและบันทึกลง MySQL...';
    send('rotinv.admin.setitem',`${target} ${item.id} ${delta}`);
    // อนุญาตส่งอีกครั้งหลังได้รับผล/คำสั่งหมดเวลา เพื่อไม่ให้ปุ่มค้างตลอด
    setTimeout(()=>{if(catalogMode) $('adminSetSubmit').disabled=!catalogItems.has(selected);},1800);
  });
  $('giveBtn').addEventListener('click',()=>{
    const item=items.get(selected);
    const target=$('giveTarget').value.trim();
    const amount=$('giveAmount').value.trim();
    if(!item||item.quantity<1||!/^\d{1,4}$/.test(target)||!/^\d{1,3}$/.test(amount)||Number(amount)<1||Number(amount)>item.quantity){
      notice('ตรวจ ID ผู้รับและจำนวนไอเทมให้ถูกต้อง');return;
    }
    send('rotinv.give',`${target} ${item.id} ${amount}`);
    notice('กำลังตรวจและบันทึกการส่งไอเทม...');
  });
  if (cef) {
    cef.on('rotinv.identity', id => {const next=String(id);if(next!==characterId){characterId=next;loadPositions();for(let i=0;i<5;i++)quick[i]={id:-1,key:'',name:'',quantity:0,usable:false};renderQuick();}});
    // ทุกครั้งที่เซิร์ฟเวอร์อัปเดตช่องลัด ให้รับรายการไอเทมที่มีจริงใหม่ทั้งหมด
    // ข้อมูลนี้แสดงรายการกระเป๋าและตรวจรูปช่องลัดจากแหล่งเดียวกัน
    cef.on('rotinv.owned.begin', () => {items.clear();});
    cef.on('rotinv.owned.item', (id,cat,count,weight,usable) => {
      const i=Number(id), qty=Number(count);
      if(!Number.isInteger(i)||i<0||i>255||!Number.isFinite(qty)||qty<=0)return;
      const key=i<36 ? Object.keys(icons)[i]||'ITEM_'+i : i<83 ? 'WEAPON_'+(i-36) : i<97 ? 'AMMO_'+(i-83) : i<100 ? 'GASMASK_'+(i-96) : 'EXTRA_'+(i-100);
      items.set(i,{id:i,key,name:itemName({id:i,key}),category:Number(cat)||0,
        quantity:qty,weight:Number(weight)||0,usable:Number(usable)===1});
    });
    cef.on('rotinv.owned.end', () => {
      // ป้องกันรูปไอเทมที่เคยผูกไว้ค้าง เมื่อไม่มีของแล้ว
      for (let i=0;i<5;i++) {
        const x=items.get(quick[i].id);
        if(!x || x.quantity<=0) quick[i]={id:-1,key:'',name:'',quantity:0,usable:false};
        else quick[i].quantity=x.quantity;
      }
      renderQuick();
      if(inventoryOpen&&!catalogMode)render();
    });
    cef.on('rotinv.begin', (...args) => {setCatalogMode(false);items.clear(); setStatus(...args);});
    cef.on('rotinv.item', (id,key,name,cat,count,weight,usable) => {
      const i=Number(id);if (!Number.isInteger(i)||i<0||i>255)return;
      const qty=Math.max(0,Number(count)||0);
      if(qty>0)items.set(i,{id:i,key:String(key),name:itemName({id:i,key:String(key)}),category:Number(cat),quantity:qty,weight:Number(weight)||0,usable:Number(usable)===1});
    });
    // ข้อมูลตัวเลขล้วนจาก Pawn 2.10: ชื่อไทยอ่านจาก CEF UTF-8
    cef.on('rotinv.itemv3', (id,cat,count,weight,usable) => {
      const i=Number(id),qty=Number(count);
      if(!Number.isInteger(i)||i<0||i>255||!Number.isFinite(qty)||qty<=0)return;
      const key=i<36 ? Object.keys(icons)[i]||'ITEM_'+i : i<83 ? 'WEAPON_'+(i-36) : i<97 ? 'AMMO_'+(i-83) : i<100 ? 'GASMASK_'+(i-96) : 'EXTRA_'+(i-100);
      items.set(i,{id:i,key,name:itemName({id:i,key}),category:Number(cat)||0,
        quantity:qty,weight:Number(weight)||0,usable:Number(usable)===1});
    });
    cef.on('rotinv.end', () => {reconcilePositions();render();});
    cef.on('rotinv.catalog.begin',()=>{
      catalogItems.clear(); category='all';
      for(const b of $('tabs').querySelectorAll('button')) b.classList.toggle('active',b.dataset.category==='all');
      setCatalogMode(true);
    });
    cef.on('rotinv.catalog.item',(id,key,cat,weight,stack,usable)=>{
      const i=Number(id);if(!Number.isInteger(i)||i<0||i>255)return;
      catalogItems.set(i,{id:i,key:String(key),category:Number(cat),weight:Number(weight)||0,stack:Number(stack)||0,usable:Number(usable)===1});
    });
    cef.on('rotinv.catalog.end',render);
    cef.on('rotinv.admin.result', ok=>{
      $('adminSetNotice').textContent=Number(ok)===1?'เซิร์ฟเวอร์บันทึกไอเทมแล้ว':'ไม่สำเร็จ โปรดตรวจข้อความแชต';
      $('adminSetSubmit').disabled=!catalogItems.has(selected);
    });
    cef.on('rotinv.notice', notice);
    cef.on('rotinv.mode', (open)=>setOpen(Number(open)===1));
    // Event นี้มาจาก Pawn หลัง Login + Spawn สำเร็จเท่านั้น
    // หมอกบรรยากาศในเขตพิษ (แผงสถานะแสดงผลผ่าน rotcity-toxic แผงใหญ่)
    cef.on('rottox.status',(lv,hp,dur,mask)=>{
      const level=Math.max(0,Math.min(5,Number(lv)||0));
      const fog=$('toxicFog'), hud=$('toxicHud');
      if (fog) {
        fog.classList.toggle('active',level>0);
        fog.style.setProperty('--fog-opacity',String((0.10+level*0.055).toFixed(2)));
      }
      if (hud) hud.style.display = 'none';
    });
    // หลอดป้องกันติดเชื้อ: ข้อมูลจริงจากเซิร์ฟเวอร์ ไม่เชื่อค่าจาก Client
    cef.on('rotinv.shield', (amount, infected) => {
      const value=Math.max(0,Math.min(100,Number(amount)||0));
      const bar=$('infectionShieldFill');
      if(!bar) return;
      bar.style.width=value+'%';
      $('infectionShieldValue').textContent=Number(infected)===1?'ติดเชื้อ • '+value+'%':value+'%';
      $('infectionShield').classList.toggle('infected',Number(infected)===1);
    });
    cef.on('rotinv.hotbar', value => setHotbarAuthorized(Number(value) === 1));
    // ผูกช่องได้เฉพาะไอเทมที่อยู่ใน snapshot จริง; ไม่ใช้จำนวนเก่าจาก CEF
    cef.on('rotinv.quickv2',(slot,id,qty,usable)=>{
      const n=Number(slot), i=Number(id);
      if(!Number.isInteger(n)||n<0||n>=5)return;
      // เชื่อค่าจากเซิร์ฟ — อย่าบังคับให้มีใน Map items ก่อน (กันช่องลัดหายตอนกระเป๋าปิด)
      if (!Number.isInteger(i) || i < 0 || Number(qty) < 1) {
        quick[n]={id:-1,key:'',name:'',quantity:0,usable:false};
      } else {
        const owned=items.get(i);
        quick[n]={
          id:i,
          key: owned && owned.key ? owned.key : '',
          name: owned ? itemName(owned) : ('ITEM #'+i),
          quantity: Number(qty),
          usable: Number(usable) === 1
        };
      }
      renderQuick();
      if(inventoryOpen){renderBindSlots(items.get(selected));}
    });
    // ส่ง ready หลังตั้งต้นค่า UI ทุกอย่าง เพื่อไม่ทับ hotbar=true ที่เซิร์ฟเวอร์ตอบกลับทันที
  } else {
    // เปิดหน้า UI ดูตัวอย่างได้ แต่ไม่มีไอเทมจำลอง (ไม่ใช่ข้อมูลจริงจาก MySQL)
    characterId='preview';loadPositions();setStatus(0,50,0,350,100,100);
    setOpen(true);render();
  }

  renderQuick();
  // ถึงจะมีข้อมูลช่องลัดใน DOM ก็ยังซ่อนอยู่จนได้รับ rotinv.hotbar=1
  setHotbarAuthorized(false);
  if (cef) cef.emit('rotinv.ready');
})();
