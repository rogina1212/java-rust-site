(() => {
  "use strict";

  const fallbackImage = "/assets/logo.png";
  const loading = document.querySelector("#profile-loading");
  const authRequired = document.querySelector("#auth-required");
  const content = document.querySelector("#profile-content");
  const accountSlot = document.querySelector("#account-slot");
  const balanceModal = document.querySelector("#balance-modal");
  const promoInput = document.querySelector("#promo-input");
  const promoResult = document.querySelector("#promo-result");
  const applyPromo = document.querySelector("#apply-promo");
  let currentUser = null;

  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[char]));
  const money = (value) => new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(Number(value || 0));
  const dateTime = (value) => value ? new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";

  function setText(selector, value) {
    const element = document.querySelector(selector);
    if (element) element.textContent = value;
  }

  function renderAccount(user) {
    accountSlot.innerHTML = `<a class="account-user" href="/store/profile.html" aria-label="Профиль ${esc(user.personaName)}">
      <span class="account-balance">${money(user.balance)}</span>
      <img class="account-avatar" src="${esc(user.avatarMedium || user.avatar || fallbackImage)}" alt="" onerror="this.onerror=null;this.src='${fallbackImage}'">
    </a>`;
  }

  function renderLists(user) {
    const cart = Array.isArray(user.cart) ? user.cart : [];
    const history = Array.isArray(user.history) ? user.history : [];
    const cartList = document.querySelector("#cart-list");
    const historyList = document.querySelector("#history-list");

    if (cart.length) {
      cartList.className = "";
      cartList.innerHTML = cart.map((item) => `<div class="cart-item"><strong>${esc(item.title || "Товар")}</strong><span>${money(item.price)}</span></div>`).join("");
    }

    if (history.length) {
      historyList.className = "";
      historyList.innerHTML = history.map((item) => `<div class="history-item"><div><strong>${esc(item.title || "Операция")}</strong><br><span>${dateTime(item.createdAt)}</span></div><b>${Number(item.amount || 0) >= 0 ? "+" : ""}${money(item.amount)}</b></div>`).join("");
    }
  }

  function renderProfile(user) {
    currentUser = user;
    document.querySelector("#profile-main-avatar").src = user.avatarFull || user.avatarMedium || user.avatar || fallbackImage;
    setText("#profile-name", user.personaName || "Игрок");
    setText("#profile-steam-id", user.steamId || "—");
    setText("#profile-registered", dateTime(user.registeredAt));
    setText("#profile-server", user.server || "Покупок на серверы ещё нет");
    setText("#profile-activity", dateTime(user.lastSeenAt));
    setText("#profile-balance", money(user.balance));
    document.querySelector("#steam-link").href = user.profileUrl || `https://steamcommunity.com/profiles/${user.steamId}`;
    renderAccount(user);
    renderLists(user);
    loading.hidden = true;
    content.hidden = false;
  }

  async function loadProfile() {
    try {
      const response = await fetch("/api/store-auth/me", { cache: "no-store", credentials: "same-origin" });
      const data = await response.json();
      if (!response.ok || !data.authenticated) {
        loading.hidden = true;
        authRequired.hidden = false;
        accountSlot.innerHTML = `<a class="account-button" href="/api/store-auth/login?next=/store/profile.html"><span>Войти</span></a>`;
        return;
      }
      renderProfile(data.user);
    } catch {
      loading.textContent = "Не удалось загрузить профиль. Обновите страницу через несколько секунд.";
    }
  }

  document.querySelectorAll("[data-profile-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      const tab = button.dataset.profileTab;
      document.querySelectorAll("[data-profile-tab]").forEach((item) => item.classList.toggle("active", item === button));
      document.querySelectorAll("[data-profile-panel]").forEach((panel) => { panel.hidden = panel.dataset.profilePanel !== tab; });
    });
  });

  function selectBalanceTab(tab) {
    document.querySelectorAll("[data-balance-tab]").forEach((button) => button.classList.toggle("active", button.dataset.balanceTab === tab));
    document.querySelectorAll("[data-balance-panel]").forEach((panel) => { panel.hidden = panel.dataset.balancePanel !== tab; });
  }

  function openBalance(tab) {
    selectBalanceTab(tab);
    promoResult.textContent = "";
    promoResult.className = "promo-result";
    balanceModal.hidden = false;
    document.body.style.overflow = "hidden";
    if (tab === "promo") setTimeout(() => promoInput.focus(), 50);
  }

  function closeBalance() {
    balanceModal.hidden = true;
    document.body.style.overflow = "";
  }

  document.querySelectorAll("[data-open-balance]").forEach((button) => button.addEventListener("click", () => openBalance(button.dataset.openBalance)));
  document.querySelectorAll("[data-balance-tab]").forEach((button) => button.addEventListener("click", () => selectBalanceTab(button.dataset.balanceTab)));
  document.querySelector("[data-close-balance]")?.addEventListener("click", closeBalance);
  balanceModal.addEventListener("mousedown", (event) => { if (event.target === balanceModal) closeBalance(); });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !balanceModal.hidden) closeBalance(); });

  document.querySelector("#logout-button")?.addEventListener("click", async () => {
    await fetch("/api/store-auth/logout", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: "{}" }).catch(() => {});
    location.href = "/store/";
  });

  async function redeemPromo() {
    const code = promoInput.value.trim();
    if (!code) {
      promoResult.textContent = "Введите промокод.";
      promoResult.className = "promo-result error";
      return;
    }
    applyPromo.disabled = true;
    promoResult.textContent = "Проверяем промокод…";
    promoResult.className = "promo-result";
    try {
      const response = await fetch("/api/store-auth/promo", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code })
      });
      const data = await response.json();
      promoResult.textContent = data.message || data.error || "Не удалось активировать промокод.";
      promoResult.className = response.ok ? "promo-result" : "promo-result error";
      if (response.ok && currentUser) {
        currentUser.balance = data.balance;
        setText("#profile-balance", money(data.balance));
        renderAccount(currentUser);
      }
    } catch {
      promoResult.textContent = "Сервис временно недоступен. Попробуйте позже.";
      promoResult.className = "promo-result error";
    } finally {
      applyPromo.disabled = false;
    }
  }

  applyPromo.addEventListener("click", redeemPromo);
  promoInput.addEventListener("keydown", (event) => { if (event.key === "Enter") redeemPromo(); });

  loadProfile();
})();
