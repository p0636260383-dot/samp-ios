// ============================================================================
// ROT CITY — CYBER-BLUE SYNDICATE & PARTY CONTROLLER (app.js)
// ============================================================================
(function () {
  "use strict";

  const overlay = document.getElementById("guild-overlay");
  const myMeritEl = document.getElementById("my-merit");
  const myCpEl = document.getElementById("my-cp");
  const toastEl = document.getElementById("guild-toast");
  const tabMemCountEl = document.getElementById("tab-mem-count");

  const noGuildView = document.getElementById("no-guild-view");
  const hasGuildView = document.getElementById("has-guild-view");

  const inviteBoxEmpty = document.getElementById("invite-box-empty");
  const inviteBoxActive = document.getElementById("invite-box-active");
  const inviteTitleText = document.getElementById("invite-title-text");

  const guildTagBadge = document.getElementById("guild-tag-badge");
  const guildLevelPill = document.getElementById("guild-level-pill");
  const guildRolePill = document.getElementById("guild-role-pill");
  const guildNameTitle = document.getElementById("guild-name-title");
  const guildLeaderName = document.getElementById("guild-leader-name");
  const guildExpText = document.getElementById("guild-exp-text");
  const guildExpFill = document.getElementById("guild-exp-fill");
  const inputGuildNotice = document.getElementById("input-guild-notice");
  const ffStatusDesc = document.getElementById("ff-status-desc");
  const bankMpVal = document.getElementById("bank-mp-val");
  const bankCpVal = document.getElementById("bank-cp-val");

  const membersTbody = document.getElementById("members-tbody");
  const playersTbody = document.getElementById("players-tbody");
  const directoryTbody = document.getElementById("directory-tbody");

  let myGuildId = 0;
  let myRole = 0;
  let toastTimer = null;

  function decodeStr(v) {
    if (typeof window.rotThai === "function") return window.rotThai(v);
    return String(v == null ? "" : v);
  }

  function encSafe(str, maxEncodedLen = 640) {
    const clean = String(str == null ? '' : str).replace(/[\r\n\t]+/g, ' ');
    let out = encodeURIComponent(clean);
    if (out.length <= maxEncodedLen) return out;
    const chars = Array.from(clean);
    while (chars.length > 0) {
      chars.pop();
      out = encodeURIComponent(chars.join(''));
      if (out.length <= maxEncodedLen) return out;
    }
    return '';
  }

  function decUriSafe(str) {
    const s = String(str == null ? '' : str);
    try {
      return decodeURIComponent(s);
    } catch (_) {
      return s;
    }
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
    toastEl.className = "guild-toast " + (ok ? "ok" : "err");
    toastEl.classList.remove("hidden");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.classList.add("hidden");
    }, 4000);
  }

  function roleLabel(role) {
    const r = Number(role) || 0;
    if (r >= 2) return "👑 หัวหน้ากิลด์";
    if (r === 1) return "⭐ รองหัวหน้า";
    return "🛡️ สมาชิก";
  }

  // Tab switching
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-tab");
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));
      btn.classList.add("active");
      const pane = document.getElementById("tab-" + target);
      if (pane) pane.classList.add("active");
    });
  });

  // Buttons
  document.getElementById("btn-close").addEventListener("click", () => emitCef("rotguild.close"));
  document.getElementById("btn-refresh").addEventListener("click", () => emitCef("rotguild.action", "refresh"));

  document.getElementById("btn-create-guild").addEventListener("click", () => {
    const tag = (document.getElementById("input-guild-tag").value || "").trim();
    const name = (document.getElementById("input-guild-name").value || "").trim();
    if (tag.length < 2 || name.length < 3) {
      showToast(false, "กรุณากรอกตัวย่อกิลด์ (2-6 ตัว) และชื่อกิลด์ (3-32 ตัว)");
      return;
    }
    emitCef("rotguild.action", `create|${encSafe(tag, 120)}|${encSafe(name, 500)}`);
  });

  document.getElementById("btn-accept-invite").addEventListener("click", () => emitCef("rotguild.action", "accept"));
  document.getElementById("btn-deny-invite").addEventListener("click", () => emitCef("rotguild.action", "deny"));
  document.getElementById("btn-accept-party-top").addEventListener("click", () => emitCef("rotguild.action", "accept"));
  document.getElementById("btn-leave-party").addEventListener("click", () => emitCef("rotguild.action", "party_leave"));

  document.getElementById("btn-save-notice").addEventListener("click", () => {
    const val = (inputGuildNotice.value || "").trim();
    emitCef("rotguild.action", `notice|${encSafe(val, 620)}`);
  });

  document.getElementById("btn-toggle-ff").addEventListener("click", () => emitCef("rotguild.action", "toggle_ff"));
  document.getElementById("btn-upgrade-guild").addEventListener("click", () => emitCef("rotguild.action", "upgrade"));
  document.getElementById("btn-leave-guild").addEventListener("click", () => emitCef("rotguild.action", "leave"));

  document.getElementById("btn-send-chat").addEventListener("click", () => {
    const chatInput = document.getElementById("input-guild-chat");
    const txt = (chatInput.value || "").trim();
    if (!txt) return;
    emitCef("rotguild.action", `chat|${encSafe(txt, 620)}`);
    chatInput.value = "";
    showToast(true, "ส่งข้อความเข้าวิทยุสื่อสารกิลด์แล้ว");
  });

  document.getElementById("btn-deposit-mp").addEventListener("click", () => {
    const amt = parseInt(document.getElementById("input-bank-mp").value, 10) || 0;
    if (amt > 0) emitCef("rotguild.action", `deposit_mp|${amt}`);
  });
  document.getElementById("btn-withdraw-mp").addEventListener("click", () => {
    const amt = parseInt(document.getElementById("input-bank-mp").value, 10) || 0;
    if (amt > 0) emitCef("rotguild.action", `withdraw_mp|${amt}`);
  });
  document.getElementById("btn-deposit-cp").addEventListener("click", () => {
    const amt = parseInt(document.getElementById("input-bank-cp").value, 10) || 0;
    if (amt > 0) emitCef("rotguild.action", `deposit_cp|${amt}`);
  });
  document.getElementById("btn-withdraw-cp").addEventListener("click", () => {
    const amt = parseInt(document.getElementById("input-bank-cp").value, 10) || 0;
    if (amt > 0) emitCef("rotguild.action", `withdraw_cp|${amt}`);
  });

  window.addEventListener("keydown", e => {
    if (e.key === "Escape") emitCef("rotguild.close");
  });

  // CEF Subscriptions
  subscribeCef("rotguild.open", () => {
    overlay.classList.remove("hidden");
  });

  subscribeCef("rotguild.closed", () => {
    overlay.classList.add("hidden");
  });

  subscribeCef("rotguild.notice", (ok, text) => {
    showToast(Number(ok) === 1, text);
  });

  subscribeCef("rotguild.state", (gid, role, tag, name, leader, level, exp, bankMp, bankCp, ff, noticeOrInvite, myMp, myCp) => {
    overlay.classList.remove("hidden");
    myGuildId = Number(gid) || 0;
    myRole = Number(role) || 0;

    myMeritEl.textContent = (Number(myMp) || 0).toLocaleString();
    myCpEl.textContent = (Number(myCp) || 0).toLocaleString();

    if (myGuildId <= 0) {
      noGuildView.classList.remove("hidden");
      hasGuildView.classList.add("hidden");
      tabMemCountEl.textContent = "0";
      membersTbody.innerHTML = '<tr><td colspan="4">คุณยังไม่ได้สังกัดกิลด์ใด</td></tr>';

      const invStr = String(noticeOrInvite || "").trim();
      if (invStr.length > 0) {
        inviteBoxEmpty.classList.add("hidden");
        inviteBoxActive.classList.remove("hidden");
        inviteTitleText.textContent = invStr;
      } else {
        inviteBoxEmpty.classList.remove("hidden");
        inviteBoxActive.classList.add("hidden");
      }
    } else {
      noGuildView.classList.add("hidden");
      hasGuildView.classList.remove("hidden");

      const lv = Math.max(1, Number(level) || 1);
      const curExp = Number(exp) || 0;
      const needExp = lv * 500;
      const pct = Math.min(100, Math.round((curExp / needExp) * 100));

      guildTagBadge.textContent = tag || "TAG";
      guildLevelPill.textContent = `LEVEL ${lv}`;
      guildRolePill.textContent = roleLabel(myRole);
      guildNameTitle.textContent = name || "กองกำลังกิลด์";
      guildLeaderName.textContent = leader || "-";
      guildExpText.textContent = `${curExp.toLocaleString()} / ${needExp.toLocaleString()} EXP (อัปเกรดขั้นถัดไป: ${(lv * 10000).toLocaleString()} แต้ม)`;
      guildExpFill.style.width = `${pct}%`;

      inputGuildNotice.value = noticeOrInvite || "";
      bankMpVal.textContent = (Number(bankMp) || 0).toLocaleString();
      bankCpVal.textContent = (Number(bankCp) || 0).toLocaleString();

      const isFf = Number(ff) === 1;
      ffStatusDesc.textContent = isFf
        ? "สถานะ: เปิดยิงกันเอง (สมาชิกกิลด์ทำดาเมจใส่กันได้)"
        : "สถานะ: ปิดดาเมจพวกเดียวกัน (ปกป้องเพื่อนร่วมกิลด์ 100%)";
      ffStatusDesc.style.color = isFf ? "#f87171" : "#34d399";
    }
  });

  subscribeCef("rotguild.members", packed => {
    const raw = String(packed || "").trim();
    if (!raw) {
      membersTbody.innerHTML = '<tr><td colspan="4">ไม่มีข้อมูลสมาชิก</td></tr>';
      tabMemCountEl.textContent = "0";
      return;
    }
    const rows = raw.split(";").filter(Boolean);
    tabMemCountEl.textContent = String(rows.length);
    membersTbody.innerHTML = "";

    rows.forEach(r => {
      const [charIdStr, mName, mRoleStr, onlinePidStr] = r.split("|");
      const charId = parseInt(charIdStr, 10) || 0;
      const mRole = parseInt(mRoleStr, 10) || 0;
      const onlinePid = parseInt(onlinePidStr, 10);
      const isOnline = !isNaN(onlinePid) && onlinePid >= 0;

      const tr = document.createElement("tr");
      let actionsHtml = "-";
      if (myRole >= 2 && mRole < 2) {
        const promoText = mRole === 1 ? "ลดขั้น" : "ตั้งรองฯ";
        actionsHtml = `
          <button class="cyber-btn outline" data-promote="${charId}" style="padding:5px 10px;font-size:11px;">${promoText}</button>
          <button class="cyber-btn danger" data-kick="${charId}" style="padding:5px 10px;font-size:11px;">เตะออก</button>
        `;
      } else if (myRole === 1 && mRole === 0) {
        actionsHtml = `<button class="cyber-btn danger" data-kick="${charId}" style="padding:5px 10px;font-size:11px;">เตะออก</button>`;
      }

      tr.innerHTML = `
        <td><strong>${mName || "-"}</strong></td>
        <td>${roleLabel(mRole)}</td>
        <td>${isOnline ? `<span class="status-online">● ออนไลน์ (ID: ${onlinePid})</span>` : `<span class="status-offline">○ ออฟไลน์</span>`}</td>
        <td class="right">${actionsHtml}</td>
      `;
      membersTbody.appendChild(tr);
    });

    membersTbody.querySelectorAll("[data-promote]").forEach(btn => {
      btn.addEventListener("click", () => emitCef("rotguild.action", `promote|${btn.getAttribute("data-promote")}`));
    });
    membersTbody.querySelectorAll("[data-kick]").forEach(btn => {
      btn.addEventListener("click", () => emitCef("rotguild.action", `kick|${btn.getAttribute("data-kick")}`));
    });
  });

  subscribeCef("rotguild.players", packed => {
    const raw = String(packed || "").trim();
    playersTbody.innerHTML = "";
    if (!raw) {
      playersTbody.innerHTML = '<tr><td colspan="5">ไม่พบผู้เล่นออนไลน์</td></tr>';
      return;
    }
    raw.split(";").filter(Boolean).forEach(r => {
      const [pidStr, pName, gTag, inPartyStr] = r.split("|");
      const pid = parseInt(pidStr, 10);
      const inParty = Number(inPartyStr) === 1;
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>#${pid}</td>
        <td><strong>${pName || "-"}</strong></td>
        <td>${gTag && gTag !== "-" ? `[${gTag}]` : "ไร้สังกัด"}</td>
        <td>${inParty ? '<span class="status-online">⚡ อยู่ปาร์ตี้เดียวกัน</span>' : "-"}</td>
        <td class="right">
          ${myGuildId > 0 && myRole >= 1 ? `<button class="cyber-btn primary" data-ginvite="${pid}" style="padding:5px 10px;font-size:11px;">+ เชิญกิลด์</button>` : ""}
          <button class="cyber-btn secondary" data-pinvite="${pid}" style="padding:5px 10px;font-size:11px;">⚡ ชวนปาร์ตี้</button>
        </td>
      `;
      playersTbody.appendChild(tr);
    });

    playersTbody.querySelectorAll("[data-ginvite]").forEach(btn => {
      btn.addEventListener("click", () => emitCef("rotguild.action", `invite|${btn.getAttribute("data-ginvite")}`));
    });
    playersTbody.querySelectorAll("[data-pinvite]").forEach(btn => {
      btn.addEventListener("click", () => emitCef("rotguild.action", `party_invite|${btn.getAttribute("data-pinvite")}`));
    });
  });

  subscribeCef("rotguild.directory", packed => {
    const raw = String(packed || "").trim();
    directoryTbody.innerHTML = "";
    if (!raw) {
      directoryTbody.innerHTML = '<tr><td colspan="6">ยังไม่มีกิลด์ที่ก่อตั้งในเซิร์ฟเวอร์</td></tr>';
      return;
    }
    const list = raw.split(";").filter(Boolean).map(r => {
      const [id, tag, name, lv, mems, leader] = r.split("|");
      return { id, tag, name, lv: Number(lv) || 1, mems: Number(mems) || 1, leader };
    });
    list.sort((a, b) => (b.lv - a.lv) || (b.mems - a.mems));
    list.forEach((g, idx) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>#${idx + 1}</td>
        <td><span class="lv-pill">[${g.tag}]</span></td>
        <td><strong>${g.name}</strong></td>
        <td>Lv.${g.lv}</td>
        <td>${g.mems} / 24 คน</td>
        <td>${g.leader}</td>
      `;
      directoryTbody.appendChild(tr);
    });
  });

  // Notify server ready
  emitCef("rotguild.ready");
})();
