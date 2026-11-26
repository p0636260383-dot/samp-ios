// ============================================================================
// ROT CITY — CYBER-BLUE SURVIVOR SKILL TREE & WORLD BOSS CONTROLLER (app.js)
// ============================================================================
(function () {
  "use strict";

  const overlay = document.getElementById("skills-overlay");
  const valLevel = document.getElementById("val-level");
  const valSp = document.getElementById("val-sp");
  const valMp = document.getElementById("val-mp");
  const valXp = document.getElementById("val-xp");
  const valBossKills = document.getElementById("val-boss-kills");
  const toastEl = document.getElementById("skills-toast");
  const perksList = document.getElementById("perks-list");

  const bossStatusBadge = document.getElementById("boss-status-badge");
  const bossHpText = document.getElementById("boss-hp-text");
  const bossHpFill = document.getElementById("boss-hp-fill");
  const bossLocText = document.getElementById("boss-loc-text");

  const PERK_DEFS = [
    {
      id: 0,
      icon: "🎒",
      name: "นักคุ้ยซาก (Scavenger)",
      desc: "กระเป๋า +10 ช่อง (+3 kg) & ค้นของไวขึ้น 15% & ดรอป x2 +6% ต่อเลเวล (ส่ง: เศษเหล็ก x3 + เศษผ้า x2)"
    },
    {
      id: 1,
      icon: "⚡",
      name: "นักวิ่งเอาตัวรอด (Sprinter)",
      desc: "ลดการสูญเสียพลังงาน และชะลอความหิว/กระหายน้ำ 8% ต่อเลเวล (ส่ง: น้ำดื่ม x2 + แครกเกอร์ x1)"
    },
    {
      id: 2,
      icon: "🔧",
      name: "ช่างฝีมือ (Crafter)",
      desc: "ลดปืนสึกหรอ 3% • ซ่อมปืน/ฐานแรงขึ้น (+8 Dura/+100 HP) ต่อเลเวล (ส่ง: ไม้ x3 + ตะปู x3)"
    },
    {
      id: 3,
      icon: "🛡️",
      name: "เกราะชีวภาพ (Toughness)",
      desc: "ลดดาเมจซอมบี้/พิษบอส 6% & เกิดพร้อมเกราะ +10 ต่อเลเวล (ส่ง: เศษเหล็ก x4 + พลาสติก x2)"
    },
    {
      id: 4,
      icon: "🩺",
      name: "แพทย์สนาม (Field Medic)",
      desc: "เพิ่มประสิทธิภาพการรักษา & ต้านเชื้อต่อเลเวล (ส่ง: สมุนไพร x2 + ผ้าพันแผล x1)"
    }
  ];

  const PROF_DEFS = [
    { id: 1, icon: "🪖", name: "ทหาร / นักล่าซอมบี้", desc: "เกิดพร้อมเกราะ +25 • ต้านติดเชื้อ • ยิงบอสแรง +20%" },
    { id: 2, icon: "🩺", name: "แพทย์สนาม", desc: "ฮีลจากยาแรงขึ้น +35% • ต้านติดเชื้อ +15%" },
    { id: 3, icon: "🔧", name: "วิศวกร / ช่าง", desc: "คราฟต์คืนวัตถุดิบ 25% • ซ่อมรถ/ฐานแรงขึ้น" },
    { id: 4, icon: "🎒", name: "นักคุ้ยซาก", desc: "+10 ช่อง / +10 kg • ค้นของไว +30% • ดรอปเบิ้ล +15%" },
    { id: 5, icon: "⚡", name: "นักวิ่งเอาตัวรอด", desc: "หิว/น้ำลดช้าลง 30% • ทนพิษบอสโลก" }
  ];

  let availSp = 0;
  let curProf = 0;
  let skillLevels = [0, 0, 0, 0, 0];
  let skillProgs = [0, 0, 0, 0, 0];
  let skillReqs = [100, 100, 100, 100, 100];
  let toastTimer = null;
  const profList = document.getElementById("prof-list");
  const profBadge = document.getElementById("val-prof-badge");

  function decodeStr(v) {
    if (typeof window.rotThai === "function") return window.rotThai(v);
    return String(v == null ? "" : v);
  }

  function emitCef(eventName, ...args) {
    if (window.cef && typeof window.cef.emit === "function") {
      window.cef.emit(eventName, ...args);
    }
  }

  function subscribeCef(eventName, cb) {
    if (window.cef && typeof window.cef.on === "function") {
      window.cef.on(eventName, (...args) => {
        cb(...args.map(a => (typeof a === "string" ? decodeStr(a) : a)));
      });
    } else {
      window.addEventListener(eventName, e => cb(...(e.detail || [])));
    }
  }

  function showToast(ok, text) {
    if (!toastEl) return;
    toastEl.textContent = text;
    toastEl.className = "skills-toast " + (ok ? "ok" : "err");
    toastEl.classList.remove("hidden");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.classList.add("hidden");
    }, 3800);
  }

  function renderProfs() {
    if (!profList) return;
    const active = PROF_DEFS.find(p => p.id === curProf);
    if (profBadge) {
      profBadge.textContent = active ? `${active.icon} ${active.name}` : "ยังไม่เลือกสายอาชีพ";
    }
    profList.innerHTML = "";
    PROF_DEFS.forEach(p => {
      const isCur = curProf === p.id;
      const card = document.createElement("div");
      card.className = "prof-card" + (isCur ? " active" : "");
      card.innerHTML = `
        <div class="prof-top">
          <span class="prof-ico">${p.icon}</span>
          <strong class="prof-name">${p.name}</strong>
        </div>
        <p class="prof-desc">${p.desc}</p>
        <button class="cyber-btn ${isCur ? "" : "primary"}" data-prof="${p.id}" ${isCur ? "disabled" : ""}>
          ${isCur ? "✓ สายอาชีพปัจจุบัน" : (curProf === 0 ? "เลือกฟรี" : "เปลี่ยน (2,500)")}
        </button>
      `;
      profList.appendChild(card);
    });
    profList.querySelectorAll("[data-prof]").forEach(btn => {
      btn.addEventListener("click", () => {
        emitCef("rotskills.action", `prof|${btn.getAttribute("data-prof")}`);
      });
    });
  }

  function renderPerks() {
    perksList.innerHTML = "";
    PERK_DEFS.forEach((p, idx) => {
      const lv = Number(skillLevels[idx]) || 0;
      const prog = Number(skillProgs[idx]) || 0;
      const req = Number(skillReqs[idx]) || 0;
      const pct = lv >= 5 ? 100 : (req > 0 ? Math.min(100, Math.round((prog / req) * 100)) : 0);

      let pipsHtml = "";
      for (let i = 1; i <= 5; i++) {
        pipsHtml += `<span class="pip ${i <= lv ? "filled" : ""}"></span>`;
      }

      const row = document.createElement("div");
      row.className = "perk-row";
      row.innerHTML = `
        <div class="perk-icon">${p.icon}</div>
        <div class="perk-info">
          <div class="perk-top">
            <span class="perk-title">${p.name}</span>
            <span class="perk-lv">Lv.${lv} / 5 (${lv >= 5 ? "MAX" : `${prog}% / ${req}%`})</span>
          </div>
          <p class="perk-desc">${p.desc}</p>
          <div class="skill-prog-track"><div class="skill-prog-fill" style="width:${pct}%"></div></div>
          <div class="perk-pips">${pipsHtml}</div>
        </div>
        <button class="cyber-btn primary" data-gps="${p.id}">
          ${lv >= 5 ? "MAX LEVEL" : "📍 ปักหมุด NPC"}
        </button>
      `;
      perksList.appendChild(row);
    });

    perksList.querySelectorAll("[data-gps]").forEach(btn => {
      btn.addEventListener("click", () => {
        emitCef("rotskills.action", `gps|${btn.getAttribute("data-gps")}`);
      });
    });
  }

  document.getElementById("btn-close").addEventListener("click", () => emitCef("rotskills.close"));
  document.getElementById("btn-refresh").addEventListener("click", () => emitCef("rotskills.action", "refresh"));
  document.getElementById("btn-reset-skills").addEventListener("click", () => emitCef("rotskills.action", "reset"));
  document.getElementById("btn-track-boss").addEventListener("click", () => emitCef("rotskills.action", "track_boss"));

  window.addEventListener("keydown", e => {
    if (e.key === "Escape") emitCef("rotskills.close");
  });

  subscribeCef("rotskills.open", () => {
    overlay.classList.remove("hidden");
  });

  subscribeCef("rotskills.closed", () => {
    overlay.classList.add("hidden");
  });

  subscribeCef("rotskills.notice", (ok, text) => {
    showToast(Number(ok) === 1, text);
  });

  subscribeCef("rotskills.state", (lv, xp, sp, s1, s2, s3, s4, s5, bossKills, mp, cp, bossActive, bossHp, bossMaxHp, bossLoc, profId) => {
    overlay.classList.remove("hidden");
    availSp = Number(sp) || 0;
    curProf = Number(profId) || 0;
    // Order matches NPC 0..4: Scavenger(s3), Sprinter(s2), Crafter(s4), Toughness(s5), Medic(s1)
    skillLevels = [Number(s3) || 0, Number(s2) || 0, Number(s4) || 0, Number(s5) || 0, Number(s1) || 0];

    valLevel.textContent = `Lv.${Number(lv) || 1}`;
    valSp.textContent = `${availSp} SP`;
    valMp.textContent = (Number(mp) || 0).toLocaleString();
    valXp.textContent = `${(Number(xp) || 0).toLocaleString()} EXP`;
    valBossKills.textContent = `${Number(bossKills) || 0} ครั้ง`;

    const isBoss = Number(bossActive) === 1;
    const curHp = Number(bossHp) || 0;
    const maxHp = Math.max(1, Number(bossMaxHp) || 2500);
    const pct = isBoss ? Math.min(100, Math.round((curHp / maxHp) * 100)) : 0;

    bossStatusBadge.textContent = isBoss ? "🚨 ACTIVE RAID: บอสกลายพันธุ์ปรากฏตัวแล้ว!" : "📡 สถานะ: บอสยังไม่ปรากฏตัว (เกิดทุก 45 นาที)";
    bossStatusBadge.className = "boss-badge " + (isBoss ? "active" : "inactive");
    bossHpText.textContent = isBoss ? `${curHp.toLocaleString()} / ${maxHp.toLocaleString()} HP (${pct}%)` : `0 / ${maxHp.toLocaleString()} HP`;
    bossHpFill.style.width = `${pct}%`;
    bossLocText.textContent = isBoss ? (bossLoc || "พื้นที่สีม่วงบนเรดาร์") : "รอสัญญาณการเกิดรอบถัดไป";

    renderProfs();
    renderPerks();
  });

  subscribeCef("rotskills.progress", (p0, r0, p1, r1, p2, r2, p3, r3, p4, r4) => {
    skillProgs = [Number(p0) || 0, Number(p1) || 0, Number(p2) || 0, Number(p3) || 0, Number(p4) || 0];
    skillReqs = [Number(r0) || 0, Number(r1) || 0, Number(r2) || 0, Number(r3) || 0, Number(r4) || 0];
    renderPerks();
  });

  emitCef("rotskills.ready");
})();
