// ROT CITY - Secure Escrow Trade UI Controller
document.addEventListener("DOMContentLoaded", () => {
  // Elements
  const partnerNameEl = document.getElementById("partner-name");
  const partnerIdEl = document.getElementById("partner-id");
  const tradeFeeEl = document.getElementById("trade-fee");
  const myBcBalEl = document.getElementById("my-bc-bal");
  const myCpBalEl = document.getElementById("my-cp-bal");

  const inputMyBc = document.getElementById("input-my-bc");
  const inputMyCp = document.getElementById("input-my-cp");
  const btnUpdateCurr = document.getElementById("btn-update-curr");

  const partnerBcVal = document.getElementById("partner-bc-val");
  const partnerCpVal = document.getElementById("partner-cp-val");

  const myLockBadge = document.getElementById("my-lock-badge");
  const partnerLockBadge = document.getElementById("partner-lock-badge");

  const securityBanner = document.getElementById("security-banner");
  const securityAlertText = document.getElementById("security-alert-text");

  const countdownBox = document.getElementById("countdown-box");
  const countdownVal = document.getElementById("countdown-val");

  const btnLock = document.getElementById("btn-lock");
  const btnConfirm = document.getElementById("btn-confirm");
  const btnCancel = document.getElementById("btn-cancel");

  // CEF Event Subscription Helper
  function subscribeCef(eventName, callback) {
    if (window.cef && typeof window.cef.on === "function") {
      window.cef.on(eventName, (...args) => callback(...args.map(arg => typeof arg === "string" ? rotThai(arg) : arg)));
    } else {
      window.addEventListener(eventName, (e) => callback(...(e.detail || [])));
    }
  }

  // CEF Emit Helper
  function emitCef(eventName, ...args) {
    if (window.cef && typeof window.cef.emit === "function") {
      window.cef.emit(eventName, ...args);
    } else {
      console.log(`[CEF EMIT] ${eventName}`, args);
    }
  }


  // Event: sync_header
  subscribeCef("rottrade.sync_header", (pName, pId, myMoney, myPoints, feeCP, isInitiator) => {
    document.getElementById("trade-container").dataset.state = "active";
    document.getElementById("trade-lobby").hidden = true;
    partnerNameEl.textContent = pName || "ไม่ทราบชื่อ";
    partnerIdEl.textContent = pId;
    myBcBalEl.textContent = Number(myMoney).toLocaleString();
    myCpBalEl.textContent = Number(myPoints).toLocaleString();
    tradeFeeEl.textContent = `${feeCP} CP` + (Number(isInitiator) === 1 ? " (หักจากคุณ)" : " (คู่ค้าจ่าย)");
  });

  let hasConfirmed = false;
  // Event: sync_my_summary
  subscribeCef("rottrade.sync_my_summary", (bc, cp, isLocked, isConfirmed) => {
    inputMyBc.value = bc;
    inputMyCp.value = cp;

    hasConfirmed = Number(isConfirmed) === 1;
    if (Number(isLocked) === 1) {
      myLockBadge.className = "badge-status status-locked";
      myLockBadge.textContent = "🔒 ล็อกข้อเสนอแล้ว";
      btnLock.textContent = "🔓 ปลดล็อก";
      inputMyBc.disabled = true;
      inputMyCp.disabled = true;
      btnUpdateCurr.disabled = true;
    } else {
      myLockBadge.className = "badge-status status-unlocked";
      myLockBadge.textContent = "🔓 ยังไม่ล็อก";
      btnLock.textContent = "🔒 ล็อกข้อเสนอ";
      inputMyBc.disabled = false;
      inputMyCp.disabled = false;
      btnUpdateCurr.disabled = false;
    }

    if (hasConfirmed) {
      btnConfirm.textContent = "✔ ยืนยันแล้ว (รอคู่ค้า)";
      btnConfirm.disabled = true;
      btnConfirm.classList.add("disabled");
    }
  });

  // Event: sync_partner_summary
  subscribeCef("rottrade.sync_partner_summary", (bc, cp, isLocked, isConfirmed) => {
    partnerBcVal.textContent = `${Number(bc).toLocaleString()} แต้ม`;
    partnerCpVal.textContent = `${Number(cp).toLocaleString()} CP`;

    if (Number(isLocked) === 1) {
      partnerLockBadge.className = "badge-status status-locked";
      partnerLockBadge.textContent = "🔒 ล็อกข้อเสนอแล้ว";
    } else {
      partnerLockBadge.className = "badge-status status-unlocked";
      partnerLockBadge.textContent = "🔓 ยังไม่ล็อก";
    }
  });

  // Event: sync_my_slot
  subscribeCef("rottrade.sync_my_slot", (slot, itemId, itemName, amount) => {
    const slotEl = document.querySelector(`#my-slots-grid .trade-slot[data-slot="${slot}"]`);
    if (slotEl) {
      if (itemId !== -1 && amount > 0) {
        slotEl.className = "trade-slot filled";
        slotEl.innerHTML = `<strong>${itemName}</strong><div class="slot-label">x${amount}</div>`;
      } else {
        slotEl.className = "trade-slot empty";
        slotEl.innerHTML = `<span>${slot + 1}</span><div class="slot-label">ว่าง</div>`;
      }
    }
  });

  // Event: sync_partner_slot
  subscribeCef("rottrade.sync_partner_slot", (slot, itemId, itemName, amount) => {
    const slotEl = document.querySelector(`#partner-slots-grid .trade-slot[data-slot="${slot}"]`);
    if (slotEl) {
      if (itemId !== -1 && amount > 0) {
        slotEl.className = "trade-slot filled";
        slotEl.innerHTML = `<strong>${itemName}</strong><div class="slot-label">x${amount}</div>`;
      } else {
        slotEl.className = "trade-slot empty";
        slotEl.innerHTML = `<span>${slot + 1}</span><div class="slot-label">ว่าง</div>`;
      }
    }
  });

  // Event: sync_state
  subscribeCef("rottrade.sync_state", (state, countdownSecs) => {
    state = Number(state);
    countdownSecs = Number(countdownSecs);
    if (hasConfirmed) {
      countdownBox.classList.add("hidden");
      btnConfirm.disabled = true;
      return;
    }
    // State 4 = TRADE_STATE_COUNTDOWN
    if (state === 4 && countdownSecs > 0) {
      countdownBox.classList.remove("hidden");
      countdownVal.textContent = countdownSecs;
      btnConfirm.disabled = true;
      btnConfirm.classList.add("disabled");
      btnConfirm.textContent = `รอตรวจทาน (${countdownSecs} วินาที)`;
    } else if (state === 4 && countdownSecs === 0) {
      countdownBox.classList.add("hidden");
      btnConfirm.disabled = false;
      btnConfirm.classList.remove("disabled");
      btnConfirm.textContent = "✔ ยืนยันการแลกเปลี่ยน";
    } else {
      countdownBox.classList.add("hidden");
      btnConfirm.disabled = true;
      btnConfirm.classList.add("disabled");
      btnConfirm.textContent = "✔ ยืนยันการแลกเปลี่ยน";
    }
  });

  // Event: countdown_done
  subscribeCef("rottrade.countdown_done", () => {
    if (hasConfirmed) return;
    countdownBox.classList.add("hidden");
    btnConfirm.disabled = false;
    btnConfirm.classList.remove("disabled");
    btnConfirm.textContent = "✔ ยืนยันการแลกเปลี่ยน";
  });

  // Event: alert
  subscribeCef("rottrade.alert", (type, message) => {
    securityAlertText.textContent = message;
    securityBanner.classList.remove("hidden");
    setTimeout(() => {
      securityBanner.classList.add("hidden");
    }, 6000);
  });

  // User Action Handlers
  btnUpdateCurr.addEventListener("click", () => {
    const bc = parseInt(inputMyBc.value, 10) || 0;
    const cp = parseInt(inputMyCp.value, 10) || 0;
    emitCef("rottrade.offer_currency", `${bc} ${cp}`);
  });

  btnLock.addEventListener("click", () => {
    emitCef("rottrade.lock");
  });

  btnConfirm.addEventListener("click", () => {
    emitCef("rottrade.confirm");
  });

  btnCancel.addEventListener("click", () => {
    emitCef("rottrade.close");
  });
  const itemSlot = document.getElementById("item-slot");
  const itemId = document.getElementById("item-id");
  const itemQty = document.getElementById("item-qty");
  const vehicleId = document.getElementById("vehicle-id");
  for (let slot = 0; slot < 6; slot++) itemSlot.add(new Option(slot + 1, slot));
  document.getElementById("my-slots-grid").addEventListener("click", event => {
    const slot = event.target.closest(".trade-slot");
    if (slot) itemSlot.value = slot.dataset.slot;
  });
  document.getElementById("item-offer").addEventListener("submit", event => {
    event.preventDefault();
    emitCef("rottrade.offer_item", [itemSlot.value, itemId.value, itemQty.value].join(" "));
  });
  document.getElementById("item-remove").addEventListener("click", () => emitCef("rottrade.remove_item", itemSlot.value));
  document.getElementById("vehicle-offer").addEventListener("submit", event => {
    event.preventDefault();
    emitCef("rottrade.offer_vehicle", vehicleId.value);
  });
  subscribeCef("rottrade.asset_reset", () => {
    itemId.replaceChildren();
    vehicleId.replaceChildren(new Option("ไม่เสนอรถ", "0"));
  });
  subscribeCef("rottrade.inventory", (id, name, qty) => itemId.add(new Option(name + " ×" + qty, id)));
  subscribeCef("rottrade.owned_vehicle", (id, model) => vehicleId.add(new Option("รถ #" + id + " · รุ่น " + model, id)));
  subscribeCef("rottrade.vehicles", (mine, myModel, partner, partnerModel) => {
    const label = (id, model) => Number(id) > 0 ? "รถ #" + id + " · รุ่น " + model : "ไม่มีรถในข้อเสนอ";
    document.getElementById("my-vehicle").textContent = label(mine, myModel);
    document.getElementById("partner-vehicle").textContent = label(partner, partnerModel);
    vehicleId.value = String(mine);
  });
  const lobby = document.getElementById("trade-lobby");
  const target = document.getElementById("trade-target");
  const send = document.getElementById("trade-send");
  const outgoing = document.getElementById("trade-outgoing");
  const invite = document.getElementById("trade-invite");
  const logResults = document.getElementById("trade-log-results");
  const lobbyAction = action => emitCef("rottrade.action", action);
  subscribeCef("rottrade.lobby", (senderId, name, outgoingId, isAdmin) => {
    document.getElementById("trade-container").dataset.state = "lobby";
    lobby.hidden = false;
    invite.hidden = Number(senderId) < 0;
    document.getElementById("trade-invite-name").textContent = name + " · #" + senderId;
    outgoing.hidden = Number(outgoingId) < 0;
    document.getElementById("trade-audit").hidden = Number(isAdmin) !== 1;
    partnerNameEl.textContent = "เลือกผู้เล่นใกล้ตัว";
    partnerIdEl.textContent = "—";
    target.replaceChildren();
    send.disabled = true;
  });
  subscribeCef("rottrade.nearby", (id, name) => {
    target.add(new Option(name + " · #" + id, id));
    send.disabled = !outgoing.hidden;
  });
  subscribeCef("rottrade.log_reset", () => {
    document.getElementById("trade-audit").open = true;
    logResults.replaceChildren();
  });
  subscribeCef("rottrade.log_row", line => {
    const row = document.createElement("li");
    row.textContent = line;
    logResults.append(row);
  });
  document.getElementById("trade-log-form").addEventListener("submit", event => {
    event.preventDefault();
    lobbyAction("log " + document.getElementById("trade-log-target").value);
  });
  document.getElementById("trade-request").addEventListener("submit", event => {
    event.preventDefault();
    if (target.value !== "") lobbyAction("request " + target.value);
  });
  for (const action of ["accept", "deny", "withdraw", "refresh"]) {
    document.getElementById("trade-" + action).addEventListener("click", () => lobbyAction(action));
  }
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") emitCef("rottrade.close");
  });
  emitCef("rottrade.ready");
});
