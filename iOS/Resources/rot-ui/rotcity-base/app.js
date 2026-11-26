/* ROT CITY Base Build CEF — client */
(function () {
  "use strict";

  const NAME_TH = {
    0: "ผนังไม้", 1: "รั้วไม้", 2: "ผนังเหล็ก", 3: "ประตู", 4: "ประตูใหญ่",
    5: "แผงกั้น", 6: "ลังเก็บของ", 7: "หน้าต่าง", 8: "เสา", 9: "พื้นรอง"
  };
  const CAT = {
    all: () => true,
    struct: (p) => [0, 1, 2, 5, 8, 9].indexOf(p.id) >= 0,
    door: (p) => [3, 4, 7].indexOf(p.id) >= 0,
    storage: (p) => p.id === 6,
  };

  const state = {
    open: false,
    inBase: false,
    isOwner: false,
    used: 0,
    max: 40,
    owner: "",
    pieces: [], // {id,name,can,costs:[{item,qty,have}]}
    mats: [],   // {item,qty}
    selected: -1,
    cat: "all",
  };

  const $ = (id) => document.getElementById(id);
  const shell = $("shell");
  const grid = $("grid");
  const dName = $("dName");
  const dDesc = $("dDesc");
  const dCost = $("dCost");
  const dStatus = $("dStatus");
  const btnPlace = $("btnPlace");
  const matsEl = $("mats");

  function emit(event, payload) {
    try {
      if (typeof cef !== "undefined" && cef.emit) {
        if (payload === undefined || payload === null || payload === "") cef.emit(event);
        else cef.emit(event, String(payload));
        return;
      }
    } catch (e) {}
    console.log("[rotbase emit]", event, payload);
  }

  function itemLabel(id) {
    if (window.RotItems && typeof RotItems.name === "function") return RotItems.name(id);
    if (window.RotItems && RotItems.NAMES_TH && RotItems.NAMES_TH[id] != null) return RotItems.NAMES_TH[id];
    return "ไอเทม #" + id;
  }

  function itemIconHTML(id) {
    if (window.RotItems && typeof RotItems.iconHTML === "function") return RotItems.iconHTML(id);
    return '<span class="fallback">#' + id + "</span>";
  }

  function openUI() {
    state.open = true;
    shell.classList.add("is-open");
    shell.setAttribute("aria-hidden", "false");
  }

  function closeUI(notifyServer) {
    state.open = false;
    shell.classList.remove("is-open");
    shell.setAttribute("aria-hidden", "true");
    if (notifyServer !== false) emit("rotbase.close");
  }

  function renderDetail() {
    const p = state.pieces.find((x) => x.id === state.selected);
    if (!p) {
      dName.textContent = "เลือกชิ้นส่วน";
      dDesc.textContent = "คลิกการ์ดเพื่อดูวัตถุดิบและวาง";
      dCost.innerHTML = "";
      dStatus.textContent = "";
      dStatus.className = "status";
      btnPlace.disabled = true;
      return;
    }
    dName.textContent = p.name;
    dDesc.textContent = state.isOwner && state.inBase
      ? "วางข้างหน้าตัวละคร (ต้องอยู่ในรัศมีฐาน)"
      : "ต้องเป็นเจ้าของและยืนในรัศมีฐาน";

    dCost.innerHTML = "";
    let can = !!p.can && state.isOwner && state.inBase && state.used < state.max;
    (p.costs || []).forEach((c) => {
      if (c.item < 0) return;
      const ok = c.have >= c.qty;
      if (!ok) can = false;
      const li = document.createElement("li");
      li.innerHTML =
        itemIconHTML(c.item) +
        "<span>" + itemLabel(c.item) + " ×" + c.qty + "</span>" +
        '<span class="have ' + (ok ? "ok" : "no") + '">' + c.have + "/" + c.qty + "</span>";
      dCost.appendChild(li);
    });

    if (!state.inBase) {
      dStatus.textContent = "ไม่อยู่ในรัศมีฐาน";
      dStatus.className = "status warn";
    } else if (!state.isOwner) {
      dStatus.textContent = "คุณไม่ใช่เจ้าของฐานนี้";
      dStatus.className = "status bad";
    } else if (state.used >= state.max) {
      dStatus.textContent = "ฐานเต็มแล้ว";
      dStatus.className = "status bad";
    } else if (!p.can) {
      dStatus.textContent = "วัตถุดิบไม่พอ";
      dStatus.className = "status bad";
    } else {
      dStatus.textContent = "พร้อมวาง";
      dStatus.className = "status ok";
    }
    btnPlace.disabled = !can;
  }

  function renderGrid() {
    const filter = CAT[state.cat] || CAT.all;
    const list = state.pieces.filter(filter);
    grid.innerHTML = "";
    $("emptyHint").classList.toggle("hidden", list.length > 0);
    list.forEach((p) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "card" + (p.id === state.selected ? " selected" : "") + (p.can ? "" : " locked");
      card.innerHTML =
        (p.can ? "" : '<span class="lock">✕</span>') +
        '<div class="ico">' + itemIconHTML(p.previewItem != null ? p.previewItem : (p.costs[0] && p.costs[0].item) || 4) + "</div>" +
        '<div class="name">' + p.name + "</div>" +
        '<div class="tag">' + (p.can ? "สร้างได้" : "ของไม่พอ") + "</div>";
      card.addEventListener("click", () => {
        state.selected = p.id;
        renderGrid();
        renderDetail();
      });
      grid.appendChild(card);
    });
  }

  function renderMats() {
    matsEl.innerHTML = "";
    if (!state.mats.length) {
      matsEl.innerHTML = "<span>ไม่มีวัสดุก่อสร้างในกระเป๋า</span>";
      return;
    }
    state.mats.forEach((m) => {
      const s = document.createElement("span");
      s.innerHTML = itemLabel(m.item) + " <b>" + m.qty + "</b>";
      matsEl.appendChild(s);
    });
  }

  function renderAll() {
    $("subOwner").textContent = state.owner
      ? "เจ้าของ: " + state.owner + (state.inBase ? " · ในรัศมีฐาน" : " · นอกฐาน")
      : "ยังไม่มีข้อมูลฐาน";
    $("objUsed").textContent = String(state.used);
    $("objMax").textContent = String(state.max);
    renderGrid();
    renderDetail();
    renderMats();
  }

  // ---- CEF / window handlers ----
  function onBegin(owner, used, max, inBase, isOwner) {
    state.owner = owner || "";
    state.used = parseInt(used, 10) || 0;
    state.max = parseInt(max, 10) || 40;
    state.inBase = String(inBase) === "1" || inBase === true;
    state.isOwner = String(isOwner) === "1" || isOwner === true;
    state.pieces = [];
    state.mats = [];
    state.selected = -1;
    openUI();
    renderAll();
  }

  function onPiece(id, name, can, c0i, c0q, c0h, c1i, c1q, c1h, c2i, c2q, c2h) {
    const costs = [];
    const push = (i, q, h) => {
      i = parseInt(i, 10); q = parseInt(q, 10); h = parseInt(h, 10);
      if (isNaN(i) || i < 0) return;
      costs.push({ item: i, qty: q || 0, have: h || 0 });
    };
    push(c0i, c0q, c0h);
    push(c1i, c1q, c1h);
    push(c2i, c2q, c2h);
    const pid = parseInt(id, 10);
    state.pieces = state.pieces.filter((x) => x.id !== pid);
    state.pieces.push({
      id: pid,
      name: NAME_TH[pid] || name || ("ชิ้นส่วน " + pid),
      can: String(can) === "1",
      costs: costs,
    });
    state.pieces.sort((a, b) => a.id - b.id);
  }

  function onMat(item, qty) {
    item = parseInt(item, 10);
    qty = parseInt(qty, 10) || 0;
    if (isNaN(item) || item < 0) return;
    state.mats = state.mats.filter((m) => m.item !== item);
    if (qty > 0) state.mats.push({ item, qty });
  }

  function onEnd() {
    if (state.selected < 0 && state.pieces.length) state.selected = state.pieces[0].id;
    renderAll();
  }

  function onResult(ok, msg) {
    dStatus.textContent = msg || (ok ? "สำเร็จ" : "ล้มเหลว");
    dStatus.className = "status " + (String(ok) === "1" || ok === true ? "ok" : "bad");
  }

  // bind window
  window.rotbase = {
    begin: onBegin,
    piece: onPiece,
    mat: onMat,
    end: onEnd,
    result: onResult,
    open: openUI,
    close: closeUI,
  };

  // CEF event subscriptions (samp-cef style)
  function bindCef() {
    try {
      if (typeof cef === "undefined" || !cef.on) return;
      cef.on("rotbase.begin", function () {
        const a = arguments;
        onBegin(a[0], a[1], a[2], a[3], a[4]);
      });
      cef.on("rotbase.piece", function () {
        const a = arguments;
        onPiece(a[0], a[1], a[2], a[3], a[4], a[5], a[6], a[7], a[8], a[9], a[10], a[11]);
      });
      cef.on("rotbase.mat", function () {
        onMat(arguments[0], arguments[1]);
      });
      cef.on("rotbase.end", onEnd);
      cef.on("rotbase.result", function () {
        onResult(arguments[0], arguments[1]);
      });
      cef.on("rotbase.open", openUI);
      cef.on("rotbase.closeui", function () {
        closeUI(false);
      });
    } catch (e) {
      console.warn(e);
    }
  }

  document.querySelectorAll(".cat").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".cat").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.cat = btn.getAttribute("data-cat") || "all";
      renderGrid();
    });
  });

  $("btnClose").addEventListener("click", closeUI);
  $("btnPlace").addEventListener("click", () => {
    if (state.selected < 0 || btnPlace.disabled) return;
    emit("rotbase.place", String(state.selected));
  });
  $("btnRemove").addEventListener("click", () => emit("rotbase.remove"));

  document.addEventListener("keydown", (ev) => {
    if (!state.open) return;
    if (ev.key === "Escape") {
      ev.preventDefault();
      closeUI();
    }
  });

  bindCef();
  // ready after load
  setTimeout(() => emit("rotbase.ready"), 50);
})();
