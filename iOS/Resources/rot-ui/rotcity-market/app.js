// =============================================================================
// ROT CITY - SURVIVOR MARKETPLACE CONTROLLER (app.js)
// =============================================================================

document.addEventListener("DOMContentLoaded", () => {
  // Audio Synth for micro-interactions
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
        osc.frequency.exponentialRampToValueAtTime(1100, t + 0.04);
        gain.gain.setValueAtTime(0.08, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
        osc.start(t);
        osc.stop(t + 0.04);
      } else if (type === "buy") {
        osc.frequency.setValueAtTime(523, t);
        osc.frequency.setValueAtTime(1046, t + 0.1);
        gain.gain.setValueAtTime(0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
        osc.start(t);
        osc.stop(t + 0.22);
      }
    } catch (e) {}
  }

  // State
  let currentTab = "browse"; // "browse" | "create" | "my-stalls"
  let currencyFilter = "all";
  let searchQuery = "";
  let marketListings = [];
  let playerInventory = [];
  let playerMoney = 0;
  let playerPoints = 0;
  let pendingEarnings = 0;
  let selectedInvItem = null;

  // DOM Elements
  const playerMeritEl = document.getElementById("player-merit");
  const playerBiocoreEl = document.getElementById("player-biocore");
  const pendingEarningsEl = document.getElementById("pending-earnings");
  const btnClaimEarnings = document.getElementById("btn-claim-earnings");
  const tabBrowse = document.getElementById("tab-browse");
  const tabCreate = document.getElementById("tab-create");
  const tabMyStalls = document.getElementById("tab-my-stalls");
  const browseContainer = document.getElementById("browse-container");
  const createContainer = document.getElementById("create-container");
  const marketGrid = document.getElementById("market-grid");
  const emptyState = document.getElementById("empty-state");
  const filterCurrency = document.getElementById("filter-currency");
  const searchInput = document.getElementById("search-input");
  const btnClose = document.getElementById("btn-close");
  const btnExit = document.getElementById("btn-exit");
  const btnRefresh = document.getElementById("btn-refresh");

  // Create Form Elements
  const invItemList = document.getElementById("inv-item-list");
  const previewImg = document.getElementById("preview-img");
  const previewName = document.getElementById("preview-name");
  const previewOwned = document.getElementById("preview-owned");
  const createQty = document.getElementById("create-qty");
  const btnCreateMax = document.getElementById("btn-create-max");
  const pillCurrMoney = document.getElementById("pill-curr-money");
  const pillCurrBarter = document.getElementById("pill-curr-barter");
  const groupMoneyPrice = document.getElementById("group-money-price");
  const groupBarterPrice = document.getElementById("group-barter-price");
  const createPriceMoney = document.getElementById("create-price-money");
  const createBarterItem = document.getElementById("create-barter-item");
  const createBarterQty = document.getElementById("create-barter-qty");
  const btnSubmitListing = document.getElementById("btn-submit-listing");

  // Item PNG Helper
  function getItemPng(itemId) {
    let num = itemId + 1;
    if (itemId >= 36 && itemId <= 82) num = 50 + (itemId % 30);
    else if (itemId >= 83 && itemId <= 96) num = 6;
    else if (itemId >= 97) num = 32;
    const str = String(num).padStart(3, "0");
    return `../rotcity-shared/assets/items/item_${str}.png`;
  }

  // CEF Event Helpers
  function subscribeCef(eventName, callback) {
    if (window.cef && typeof window.cef.on === "function") {
      window.cef.on(eventName, (...args) => callback(...args.map(arg => typeof arg === "string" ? rotThai(arg) : arg)));
    } else {
      window.addEventListener(eventName, (e) => callback(...(e.detail || [])));
    }
  }

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
  subscribeCef("rotmarket.reset", (money, bagCount, capacity) => {
    playerMoney = Number(money) || 0;
    playerMeritEl.textContent = playerMoney.toLocaleString();
    marketListings = [];
    playerInventory = [];
    selectedInvItem = null;
    previewName.textContent = "ยังไม่ได้เลือกไอเทม";
    previewOwned.textContent = "";
    createBarterItem.replaceChildren();
  });

  subscribeCef("rotmarket.barter_item", (id, name) => createBarterItem.add(new Option(name, id)));

  subscribeCef("rotmarket.item", (listId, sellerName, isSelf, item, amt, curr, price, barterItem, barterAmt, itemName, barterName) => {
    const existing = marketListings.find(l => l.listId === Number(listId));
    const itemData = {
      listId: Number(listId),
      sellerName: String(sellerName),
      isSelf: Number(isSelf) === 1,
      item: Number(item),
      amt: Number(amt),
      curr: Number(curr),
      price: Number(price),
      barterItem: Number(barterItem),
      barterAmt: Number(barterAmt),
      itemName: String(itemName),
      barterName: String(barterName)
    };

    if (existing) {
      Object.assign(existing, itemData);
    } else {
      marketListings.push(itemData);
    }
  });

  subscribeCef("rotmarket.inventory", (item, amount, name) => {
    const existing = playerInventory.find(i => i.item === Number(item));
    if (existing) {
      existing.amount = Number(amount);
    } else {
      playerInventory.push({
        item: Number(item),
        amount: Number(amount),
        name: String(name)
      });
    }
  });

  subscribeCef("rotmarket.end", () => { renderMarket(); renderInventorySelector(); });

  subscribeCef("rotmarket.earnings", (earnings, items, core) => {
    pendingEarnings = Number(earnings) || 0;
    pendingEarningsEl.textContent = pendingEarnings.toLocaleString() + " แต้ม · " + Number(items).toLocaleString() + " ชิ้น";
    playerBiocoreEl.textContent = Number(core).toLocaleString();
    if (pendingEarnings > 0) {
      btnClaimEarnings.classList.remove("hidden");
    } else {
      btnClaimEarnings.classList.remove("hidden");
    }
  });

  // ---------------------------------------------------------------------------
  // Render Market Listings
  // ---------------------------------------------------------------------------
  function renderMarket() {
    marketGrid.innerHTML = "";
    let list = marketListings.filter(l => {
      if (currentTab === "my-stalls" && !l.isSelf) return false;
      if (currencyFilter === "money" && l.curr !== 0) return false;
      if (currencyFilter === "barter" && l.curr !== 1) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchName = l.itemName.toLowerCase().includes(q);
        const matchSeller = l.sellerName.toLowerCase().includes(q);
        if (!matchName && !matchSeller) return false;
      }
      return true;
    });

    if (list.length === 0) {
      emptyState.classList.remove("hidden");
      return;
    }
    emptyState.classList.add("hidden");

    list.forEach(l => {
      const card = document.createElement("div");
      card.className = "listing-card";

      const imgSrc = getItemPng(l.item);
      const isMoney = (l.curr === 0);

      card.innerHTML = `
        <div class="listing-top">
          <div class="item-img-frame">
            <img src="${imgSrc}" alt="${l.itemName}" class="item-png" onerror="this.src='../rotcity-shared/assets/items/item_001.png'">
            <span class="item-qty-tag">x${l.amt}</span>
          </div>
          <div class="listing-meta">
            <div class="item-name" title="${l.itemName}">${l.itemName}</div>
            <div class="seller-badge ${l.isSelf ? 'is-self' : ''}">
              <span>👤 </span>
            </div>
          </div>
        </div>
        <div class="listing-bottom">
          <div class="price-box">
            ${isMoney ? `
              <img src="../rotcity-shared/assets/icons/merit.png" alt="Merit" class="price-icon">
              <span class="price-text">${l.price.toLocaleString()} แต้ม</span>
            ` : `
              <span class="barter-text">🔄 แลก: ${l.barterName} x${l.barterAmt}</span>
            `}
          </div>
          ${l.isSelf ? `
            <button class="btn-cancel-listing" data-id="${l.listId}">ยกเลิกขาย</button>
          ` : `
            <button class="btn-buy-listing" data-id="${l.listId}">ซื้อเลย</button>
          `}
        </div>
      `;

      card.querySelector(".seller-badge span").textContent = l.isSelf ? "สินค้าของคุณ" : l.sellerName;
      if (l.isSelf) {
        card.querySelector(".btn-cancel-listing").addEventListener("click", () => {
          emitCef("rotmarket.cancel", l.listId);
        });
      } else {
        card.querySelector(".btn-buy-listing").addEventListener("click", () => {
          playSound("buy");
          emitCef("rotmarket.buy", l.listId);
        });
      }

      marketGrid.appendChild(card);
    });
  }

  // ---------------------------------------------------------------------------
  // Render Inventory Selector in Create Listing Tab
  // ---------------------------------------------------------------------------
  function renderInventorySelector() {
    invItemList.innerHTML = "";
    if (playerInventory.length === 0) {
      invItemList.innerHTML = `<p style="grid-column: 1/-1; color: var(--text-dim); text-align: center; padding: 20px;">ไม่มีไอเทมในกระเป๋าที่สามารถลงขายได้</p>`;
      return;
    }

    // Populate barter select dropdown as well


    playerInventory.forEach(inv => {
      const slot = document.createElement("div");
      slot.className = "inv-pick-slot";
      if (selectedInvItem && selectedInvItem.item === inv.item) {
        slot.classList.add("selected");
      }

      slot.innerHTML = `
        <img src="${getItemPng(inv.item)}" alt="${inv.name}" onerror="this.src='../rotcity-shared/assets/items/item_001.png'">
        <span class="inv-pick-name" title="${inv.name}">${inv.name}</span>
        <span class="inv-pick-qty">x${inv.amount}</span>
      `;

      slot.addEventListener("click", () => {
        playSound("click");
        selectedInvItem = inv;
        document.querySelectorAll(".inv-pick-slot").forEach(s => s.classList.remove("selected"));
        slot.classList.add("selected");

        previewImg.src = getItemPng(inv.item);
        previewName.textContent = inv.name;
        previewOwned.textContent = `มีในตัว: ${inv.amount} ชิ้น`;

        createQty.max = inv.amount;
        createQty.value = 1;
      });

      invItemList.appendChild(slot);
    });
  }

  btnCreateMax.addEventListener("click", () => {
    if (selectedInvItem) {
      createQty.value = selectedInvItem.amount;
    }
  });

  // Radio Currency Switch
  pillCurrMoney.addEventListener("click", () => {
    playSound("click");
    pillCurrMoney.classList.add("active");
    pillCurrBarter.classList.remove("active");
    pillCurrMoney.querySelector("input").checked = true;
    groupMoneyPrice.classList.remove("hidden");
    groupBarterPrice.classList.add("hidden");
  });

  pillCurrBarter.addEventListener("click", () => {
    playSound("click");
    pillCurrBarter.classList.add("active");
    pillCurrMoney.classList.remove("active");
    pillCurrBarter.querySelector("input").checked = true;
    groupMoneyPrice.classList.add("hidden");
    groupBarterPrice.classList.remove("hidden");
  });

  // Submit Listing
  btnSubmitListing.addEventListener("click", () => {
    if (!selectedInvItem) {
      alert("กรุณาเลือกไอเทมที่ต้องการลงขายก่อน");
      return;
    }
    const qty = parseInt(createQty.value) || 1;
    const isMoney = pillCurrMoney.classList.contains("active");

    if (isMoney) {
      const price = parseInt(createPriceMoney.value) || 0;
      if (price <= 0) {
        alert("กรุณาระบุราคาขายให้ถูกต้อง (มากกว่า 0 แต้ม)");
        return;
      }
      playSound("buy");
      emitCef("rotmarket.list", selectedInvItem.item, qty, 0, price, -1, 0);
    } else {
      const barterId = parseInt(createBarterItem.value) || 0;
      const barterQty = parseInt(createBarterQty.value) || 1;
      playSound("buy");
      emitCef("rotmarket.list", selectedInvItem.item, qty, 1, 0, barterId, barterQty);
    }

    // Switch back to Browse
    tabBrowse.click();
  });

  // Claim Earnings
  btnClaimEarnings.addEventListener("click", () => {
    playSound("buy");
    emitCef("rotmarket.claim");
  });

  // ---------------------------------------------------------------------------
  // Tab Switching
  // ---------------------------------------------------------------------------
  tabBrowse.addEventListener("click", () => {
    playSound("click");
    currentTab = "browse";
    tabBrowse.classList.add("active");
    tabCreate.classList.remove("active");
    tabMyStalls.classList.remove("active");
    browseContainer.classList.remove("hidden");
    createContainer.classList.add("hidden");
    renderMarket();
  });

  tabCreate.addEventListener("click", () => {
    playSound("click");
    currentTab = "create";
    tabCreate.classList.add("active");
    tabBrowse.classList.remove("active");
    tabMyStalls.classList.remove("active");
    browseContainer.classList.add("hidden");
    createContainer.classList.remove("hidden");
    renderInventorySelector();
  });

  tabMyStalls.addEventListener("click", () => {
    playSound("click");
    currentTab = "my-stalls";
    tabMyStalls.classList.add("active");
    tabBrowse.classList.remove("active");
    tabCreate.classList.remove("active");
    browseContainer.classList.remove("hidden");
    createContainer.classList.add("hidden");
    renderMarket();
  });

  // Search & Filters
  filterCurrency.addEventListener("change", (e) => {
    currencyFilter = e.target.value;
    renderMarket();
  });

  searchInput.addEventListener("input", (e) => {
    searchQuery = e.target.value.trim();
    renderMarket();
  });

  // Close & Refresh
  function closeWindow() {
    emitCef("rotmarket.close");
  }

  btnClose.addEventListener("click", closeWindow);
  btnExit.addEventListener("click", closeWindow);
  btnRefresh.addEventListener("click", () => {
    emitCef("rotmarket.ready");
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeWindow();
  });

  // Browser Fallback Mock Data
  if (!window.cef) {
    marketListings = [
      { listId: 1, sellerName: "Ghost_Rider", isSelf: false, item: 2, amt: 5, curr: 0, price: 200, barterItem: -1, barterAmt: 0, itemName: "ผ้าพันแผล", barterName: "เงินสด" },
      { listId: 2, sellerName: "Papaa_Survivor", isSelf: true, item: 6, amt: 2, curr: 0, price: 150, barterItem: -1, barterAmt: 0, itemName: "น้ำมัน", barterName: "เงินสด" },
      { listId: 3, sellerName: "Zombie_Hunter", isSelf: false, item: 83, amt: 30, curr: 1, price: 0, barterItem: 4, barterAmt: 10, itemName: "กระสุน 9mm", barterName: "เศษเหล็ก" }
    ];
    playerInventory = [
      { item: 0, amount: 6, name: "น้ำดื่ม" },
      { item: 4, amount: 20, name: "เศษเหล็ก" },
      { item: 23, amount: 12, name: "ไม้" }
    ];
    playerMoney = 3200;
    playerPoints = 50;
    pendingEarnings = 150;
    playerMeritEl.textContent = playerMoney.toLocaleString();
    playerBiocoreEl.textContent = playerPoints.toLocaleString();
    pendingEarningsEl.textContent = `${pendingEarnings.toLocaleString()} แต้ม`;
    btnClaimEarnings.classList.remove("hidden");
    renderMarket();
  }
  if (window.cef) emitCef("rotmarket.ready");
});
