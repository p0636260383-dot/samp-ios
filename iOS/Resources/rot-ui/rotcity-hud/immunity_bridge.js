/*
 ROT CITY 2.23 - ชุดเชื่อมภูมิคุ้มกันกับหลอดเดิมบน HUD
 วิธีใช้: ใส่ id="rotHudImmunityFill" ใน <div> ที่เป็นแถบสีฟ้าอันบนสุดเดิม
 อย่าสร้างหลอดเพิ่ม และอย่าใส่ ID นี้ในหลอดเกราะด้านล่าง
 จากนั้นใส่ <script src="immunity_bridge.js"></script> ก่อน </body>
*/
(() => {
  'use strict';
  const clamp = n => Math.max(0, Math.min(100, Number(n) || 0));
  function updateImmunity(value, infected) {
    // ใช้แถบเดิมเท่านั้น ป้องกันไม่ให้ปรับผิดไปโดนหลอดเกราะ
    const fill = document.getElementById('rotHudImmunityFill');
    if (!fill) return;
    const percent = clamp(value);
    fill.style.width = percent + '%';
    fill.style.maxWidth = '100%';
    fill.style.background = 'linear-gradient(180deg,#8deaff,#00c0ea 55%,#087a9c)';
    fill.setAttribute('aria-label', 'ภูมิคุ้มกัน ' + percent + '%');
    const label = document.getElementById('rotHudImmunityPercent');
    if (label) label.textContent = percent + '%';
    const status = document.getElementById('rotHudInfectedLabel');
    if (status) status.textContent = Number(infected) === 1 ? 'ติดเชื้อ' : 'ปกติ';
  }
  if (window.cef && typeof window.cef.on === 'function') {
    window.cef.on('rothud.immunity', updateImmunity);
  }
})();
