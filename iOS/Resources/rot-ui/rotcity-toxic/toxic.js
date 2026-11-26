(()=>{
'use strict';
const cef = window.cef;
const panel = document.getElementById('panel');
const levelText = document.getElementById('level');
const levels = [...document.querySelectorAll('#levels i')];
const maskName = document.getElementById('mask-name');
const maskLevel = document.getElementById('mask-level');
const durabilityText = document.getElementById('durability-text');
const durabilityBar = document.getElementById('durability-bar');
const protection = document.getElementById('protection');
const damageText = document.getElementById('damage');

const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));

function render(level, damage, durability, mask) {
  level = clamp(level, 0, 5);
  damage = clamp(damage, 0, 100);
  durability = clamp(durability, 0, 100);
  mask = clamp(mask, 0, 3);

  if (level === 0) {
    if (panel) panel.hidden = true;
    return;
  }
  if (panel) panel.hidden = false;

  if (levelText) levelText.textContent = String(level);
  levels.forEach((bar, index) => bar.classList.toggle('on', index < level));

  const protectedNow = mask > 0 && durability > 0;
  if (maskName) maskName.textContent = mask > 0 ? `หน้ากากกรองพิษระดับ ${mask}` : 'ยังไม่ได้สวมหน้ากาก';
  if (maskLevel) maskLevel.textContent = mask > 0 ? `LV. ${mask}` : 'ไม่มี';
  if (durabilityText) durabilityText.textContent = `${durability}%`;
  if (durabilityBar) {
    durabilityBar.style.width = `${durability}%`;
    durabilityBar.style.background = durability <= 20 ? 'linear-gradient(90deg,#d95f56,#f0a05f)' : '';
  }
  if (protection) {
    protection.textContent = protectedNow ? 'ไส้กรองกำลังทำงาน' : 'ไม่ได้ป้องกัน — ออกจากเขตหรือเปลี่ยนไส้กรอง';
    protection.classList.toggle('safe', protectedNow);
  }
  if (damageText) damageText.textContent = `เสียเลือด ${damage} HP / 5 วินาที`;
}

window.rotToxRender = render;

// Subscribe to BOTH event names for 100% compatibility
if (cef && typeof cef.on === 'function') {
  cef.on('rottox.panel.status', render);
  cef.on('rottox.status', render);
}

// Support query string initialization
try {
  const params = new URLSearchParams(location.search);
  if (params.has('level')) {
    render(
      params.get('level'),
      params.get('damage'),
      params.get('durability'),
      params.get('mask')
    );
  }
} catch (e) {}

// Emit BOTH ready event names
if (cef && typeof cef.emit === 'function') {
  cef.emit('rottox.panel.ready');
  cef.emit('rottox.ready');
}
})();
