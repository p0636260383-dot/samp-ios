// =============================================================================
// ROT CITY - SAFEZONE MERCHANT CONTROLLER (app.js)
// =============================================================================

document.addEventListener("DOMContentLoaded", () => {
  // Sound FX Generator (Zero external assets needed)
  const audioCtx = (window.AudioContext || window.webkitAudioContext) ? new (window.AudioContext || window.webkitAudioContext)() : null;
  function playSound(type) {
    if (!audioCtx) return;
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      const t = audioCtx.currentTime;

      if (type === "click") {
        osc.frequency.setValueAtTime(600, t);
        osc.frequency.exponentialRampToValueAtTime(1200, t + 0.05);
        gain.gain.setValueAtTime(0.08, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
        osc.start(t);
        osc.stop(t + 0.05);
      } else if (type === "buy") {
        osc.frequency.setValueAtTime(440, t);
        osc.frequency.setValueAtTime(880, t + 0.08);
        gain.gain.setValueAtTime(0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        osc.start(t);
        osc.stop(t + 0.2);
      } else if (type === "error") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(180, t);
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        osc.start(t);
        osc.stop(t + 0.15);
      }
    } catch (e) {}
  }

  // State
  let currentTab = "buy"; // "buy" | "sell"
  let currentCategory = "all";
  let searchQuery = "";
  let catalogItems = []; // { id, cat, buy, sell, maxQ, name, weight }
  let inventoryItems = []; // { id, amount, sellPrice, name }
  let playerMoney = 0; // แต้มผลงาน
  let playerPoints = 0; // ไบโอคอร์ CP
  let playerBagWeight = 0;
  let playerBagMax = 50;

  // Selected Action Modal State
  let activeActionItem = null;
  let activeActionMode = "buy"; // "buy" | "sell"

  // DOM Elements
  const playerMeritEl = document.getElementById("player-merit");
  const playerBiocoreEl = document.getElementById("player-biocore");
  const playerBagEl = document.getElementById("player-bag");
  const tabBuyBtn = document.getElementById("tab-buy");
  const tabSellBtn = document.getElementById("tab-sell");
  const categoryBar = document.getElementById("category-bar");
  const searchInput = document.getElementById("search-input");
  const itemsGrid = document.getElementById("items-grid");
  const emptyState = document.getElementById("empty-state");
  const btnClose = document.getElementById("btn-close");
  const btnExit = document.getElementById("btn-exit");
  const btnRefresh = document.getElementById("btn-refresh");

  // Modal Elements
  const actionModal = document.getElementById("action-modal");
  const modalTitle = document.getElementById("modal-title");
  const modalItemImg = document.getElementById("modal-item-img");
  const modalItemName = document.getElementById("modal-item-name");
  const modalItemDesc = document.getElementById("modal-item-desc");
  const inputQty = document.getElementById("input-qty");
  const btnQtyMinus = document.getElementById("btn-qty-minus");
  const btnQtyPlus = document.getElementById("btn-qty-plus");
  const btnQtyMax = document.getElementById("btn-qty-max");
  const modalUnitPrice = document.getElementById("modal-unit-price");
  const modalTotalPrice = document.getElementById("modal-total-price");
  const modalConfirmBtn = document.getElementById("modal-confirm-btn");
  const modalCloseAction = document.getElementById("modal-close-action");
  const modalCancelBtn = document.getElementById("modal-cancel-btn");

  // Item PNG Helper (maps item ID to item_001.png..item_100.png)
  function getItemPng(itemId) {
    // Simple mapping: each item ID maps directly to a sequential PNG file.
    // File naming: item_001.png, item_002.png, ... up to the maximum ID.
    const num = Number(itemId) + 1;
    const str = String(num).padStart(3, "0");
    return `../rotcity-shared/assets/items/item_${str}.png`;
  }

  const categoryNames = { 0: "อาหารและเครื่องดื่ม", 1: "ยาและเวชภัณฑ์", 2: "วัตถุดิบและของใช้" };

  function subscribeCef(eventName, callback) {
    if (window.cef && typeof window.cef.on === "function") window.cef.on(eventName, (...args) => callback(...args.map(arg => typeof arg === "string" ? rotThai(arg) : arg)));
    else window.addEventListener(eventName, event => callback(...(event.detail || [])));
  }

  // CEF Emit Helper
  function emitCef(eventName, ...args) {
    playSound("click");
    if (window.cef && typeof window.cef.emit === "function") {
      window.cef.emit(eventName, ...args);
    } else {
      console.log(`[CEF EMIT] ${eventName}`, args);
    }
  }

  // ---------------------------------------------------------------------------
  // CEF Listeners
  // ---------------------------------------------------------------------------
  subscribeCef("rotshop.open", (money, bagCount, capacity, points) => {
    playerMoney = Number(money) || 0;
    playerBagWeight = Number(bagCount) || 0;
    playerBagMax = Number(capacity) || 50;
    playerPoints = Number(points) || 0;
    updateHeaderStats();
    catalogItems = [];
    inventoryItems = [];
  });

  subscribeCef("rotshop.end", renderItems);

  subscribeCef("rotshop.item", (item, cat, buy, sell, maxQ, name, weight) => {
    const existing = catalogItems.find(i => i.id === Number(item));
    if (!existing) {
      catalogItems.push({
        id: Number(item),
        cat: Number(cat),
        buy: Number(buy),
        sell: Number(sell),
        maxQ: Number(maxQ),
        name: String(name),
        weight: Number(weight)
      });
      renderItems();
    }
  });

  subscribeCef("rotshop.inventory", (item, amount, sellPrice, name) => {
    const existing = inventoryItems.find(i => i.id === Number(item));
    if (existing) {
      existing.amount = Number(amount);
      existing.sellPrice = Number(sellPrice);
    } else {
      inventoryItems.push({
        id: Number(item),
        amount: Number(amount),
        sellPrice: Number(sellPrice),
        name: String(name)
      });
    }
    if (currentTab === "sell") renderItems();
  });

  function updateHeaderStats() {
    playerMeritEl.textContent = playerMoney.toLocaleString();
    playerBiocoreEl.textContent = playerPoints.toLocaleString();
    playerBagEl.textContent = `${playerBagWeight.toLocaleString()} / ${playerBagMax.toLocaleString()} ชิ้น`;
  }

  // ---------------------------------------------------------------------------
  // Render Item Cards
  // ---------------------------------------------------------------------------
  function renderItems() {
    itemsGrid.innerHTML = "";
    let list = [];

    if (currentTab === "buy") {
      list = catalogItems.filter(item => {
        const matchCat = (currentCategory === "all" || item.cat === Number(currentCategory));
        const matchSearch = (!searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchCat && matchSearch;
      });
    } else {
      list = inventoryItems.filter(item => {
        return (!searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase())) && item.amount > 0;
      });
    }

    if (list.length === 0) {
      emptyState.classList.remove("hidden");
      return;
    }
    emptyState.classList.add("hidden");

    list.forEach(item => {
      const card = document.createElement("div");
      card.className = "item-card";

      const imgSrc = getItemPng(item.id);
      const isBuy = (currentTab === "buy");
      const priceVal = isBuy ? item.buy : item.sellPrice;
      const catLabel = isBuy ? (categoryNames[item.cat] || "เสบียง") : `ในกระเป๋า: ${item.amount} ชิ้น`;
      const actionText = isBuy ? "ซื้อเสบียง" : "ขายไอเทม";
      const btnClass = isBuy ? "btn-card-action" : "btn-card-action btn-sell";

      card.innerHTML = `
        <div class="card-top">
          <div class="item-img-frame">
            <img src="${imgSrc}" alt="${item.name}" class="item-png" onerror="this.src='../rotcity-shared/assets/items/item_001.png'">
          </div>
          <div class="item-meta">
            <div class="item-name" title="${item.name}">${item.name}</div>
            <span class="item-badge">${catLabel}</span>
            ${isBuy ? `<div class="item-weight-hint">น้ำหนัก: ${item.weight || 100} g</div>` : ""}
          </div>
        </div>
        <div class="card-bottom">
          <div class="price-box">
            <img src="../rotcity-shared/assets/icons/merit.png" alt="Merit" class="price-icon">
            <span class="price-text">${priceVal.toLocaleString()} แต้ม</span>
          </div>
          <button class="${btnClass}">${actionText}</button>
        </div>
      `;

      card.querySelector("button").addEventListener("click", () => {
        openActionModal(item, isBuy ? "buy" : "sell");
      });

      itemsGrid.appendChild(card);
    });
  }

  // ---------------------------------------------------------------------------
  // Action Modal (Buy / Sell Quantity)
  // ---------------------------------------------------------------------------
  function openActionModal(item, mode) {
    playSound("click");
    activeActionItem = item;
    activeActionMode = mode;

    modalTitle.textContent = mode === "buy" ? `ซื้อ: ${item.name}` : `ขาย: ${item.name}`;
    modalItemName.textContent = item.name;
    modalItemDesc.textContent = mode === "buy" 
      ? `ราคาซื้อ: ${item.buy.toLocaleString()} แต้มผลงาน • น้ำหนัก ${item.weight || 100}g`
      : `ราคารับซื้อ: ${item.sellPrice.toLocaleString()} แต้มผลงาน • มีในตัว ${item.amount} ชิ้น`;

    modalItemImg.src = getItemPng(item.id);
    modalItemImg.onerror = () => { modalItemImg.src = '../rotcity-shared/assets/items/item_001.png'; };

    inputQty.value = 1;
    inputQty.min = 1;

    let maxLimit = 99;
    if (mode === "buy") {
      const affordable = item.buy > 0 ? Math.floor(playerMoney / item.buy) : 99;
      maxLimit = Math.max(1, Math.min(item.maxQ || 20, affordable || 1));
    } else {
      maxLimit = item.amount || 1;
    }
    inputQty.max = maxLimit;

    updateModalCalculations();
    actionModal.classList.remove("hidden");
  }

  function updateModalCalculations() {
    if (!activeActionItem) return;
    const qty = Math.max(1, parseInt(inputQty.value) || 1);
    const unitPrice = activeActionMode === "buy" ? activeActionItem.buy : activeActionItem.sellPrice;
    const total = qty * unitPrice;

    modalUnitPrice.textContent = `${unitPrice.toLocaleString()} แต้ม`;
    modalTotalPrice.textContent = `${total.toLocaleString()} แต้ม`;
  }

  btnQtyMinus.addEventListener("click", () => {
    let v = parseInt(inputQty.value) || 1;
    if (v > 1) {
      inputQty.value = v - 1;
      updateModalCalculations();
    }
  });

  btnQtyPlus.addEventListener("click", () => {
    let v = parseInt(inputQty.value) || 1;
    let max = parseInt(inputQty.max) || 99;
    if (v < max) {
      inputQty.value = v + 1;
      updateModalCalculations();
    }
  });

  btnQtyMax.addEventListener("click", () => {
    inputQty.value = inputQty.max;
    updateModalCalculations();
  });

  inputQty.addEventListener("input", updateModalCalculations);

  function closeActionModal() {
    actionModal.classList.add("hidden");
    activeActionItem = null;
  }

  modalCancelBtn.addEventListener("click", closeActionModal);
  modalCloseAction.addEventListener("click", closeActionModal);

  modalConfirmBtn.addEventListener("click", () => {
    if (!activeActionItem) return;
    const qty = Math.max(1, parseInt(inputQty.value) || 1);
    if (activeActionMode === "buy") {
      playSound("buy");
      emitCef("rotshop.buy", activeActionItem.id, qty);
    } else {
      playSound("buy");
      emitCef("rotshop.sell", activeActionItem.id, qty);
    }
    closeActionModal();
  });

  // ---------------------------------------------------------------------------
  // Tab Switching
  // ---------------------------------------------------------------------------
  tabBuyBtn.addEventListener("click", () => {
    playSound("click");
    currentTab = "buy";
    tabBuyBtn.classList.add("active");
    tabSellBtn.classList.remove("active");
    categoryBar.style.display = "flex";
    renderItems();
  });

  tabSellBtn.addEventListener("click", () => {
    playSound("click");
    currentTab = "sell";
    tabSellBtn.classList.add("active");
    tabBuyBtn.classList.remove("active");
    categoryBar.style.display = "none";
    renderItems();
  });

  // ---------------------------------------------------------------------------
  // Category Filtering
  // ---------------------------------------------------------------------------
  document.querySelectorAll(".cat-pill").forEach(pill => {
    pill.addEventListener("click", () => {
      playSound("click");
      document.querySelectorAll(".cat-pill").forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      currentCategory = pill.dataset.cat;
      renderItems();
    });
  });

  // ---------------------------------------------------------------------------
  // Search Box
  // ---------------------------------------------------------------------------
  searchInput.addEventListener("input", (e) => {
    searchQuery = e.target.value.trim();
    renderItems();
  });

  // ---------------------------------------------------------------------------
  // Window Close & Actions
  // ---------------------------------------------------------------------------
  function closeWindow() {
    emitCef("rotshop.close");
  }

  btnClose.addEventListener("click", closeWindow);
  btnExit.addEventListener("click", closeWindow);
  btnRefresh.addEventListener("click", () => {
    emitCef("rotshop.ready");
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (!actionModal.classList.contains("hidden")) {
        closeActionModal();
      } else {
        closeWindow();
      }
    }
  });

  // Sample data fallback for browser testing
  if (!window.cef) {
    catalogItems = [
      { id: 0, cat: 0, buy: 25, sell: 8, maxQ: 10, name: "น้ำดื่ม", weight: 250 },
      { id: 1, cat: 0, buy: 35, sell: 12, maxQ: 10, name: "อาหารกระป๋อง", weight: 400 },
      { id: 2, cat: 1, buy: 50, sell: 18, maxQ: 10, name: "ผ้าพันแผล", weight: 50 },
      { id: 3, cat: 1, buy: 180, sell: 65, maxQ: 5, name: "ยาต้านเชื้อ", weight: 80 },
      { id: 4, cat: 2, buy: 25, sell: 10, maxQ: 20, name: "เศษเหล็ก", weight: 500 },
      { id: 6, cat: 2, buy: 80, sell: 28, maxQ: 5, name: "น้ำมัน", weight: 1200 },
      { id: 40, cat: 3, buy: 120, sell: 40, maxQ: 1, name: "มีด", weight: 600 },
      { id: 83, cat: 3, buy: 150, sell: 50, maxQ: 10, name: "กระสุน 9mm", weight: 150 },
      { id: 97, cat: 4, buy: 450, sell: 150, maxQ: 1, name: "หน้ากากป้องกันแก๊ส", weight: 800 }
    ];
    inventoryItems = [
      { id: 0, amount: 4, sellPrice: 8, name: "น้ำดื่ม" },
      { id: 4, amount: 15, sellPrice: 10, name: "เศษเหล็ก" }
    ];
    playerMoney = 1500;
    playerPoints = 35;
    playerBagWeight = 19;
    updateHeaderStats();
    renderItems();
  }
  if (window.cef) emitCef("rotshop.ready");
});
