(() => {
  "use strict";

  const API = "https://admpanel.doc-amaz.online/api/shop";
  const featuredGrid = document.querySelector("#featured-grid");
  const productGrid = document.querySelector("#product-grid");
  const message = document.querySelector("#catalog-message");
  const detailsModal = document.querySelector("#details-modal");
  const purchaseModal = document.querySelector("#purchase-modal");
  const guideModal = document.querySelector("#guide-modal");
  const detailsContent = document.querySelector("#details-content");
  const purchaseSummary = document.querySelector("#purchase-summary");
  const purchaseResult = document.querySelector("#purchase-result");
  const accountSlot = document.querySelector("#account-slot");

  let catalog = { store: {}, products: [] };
  let serverFilter = "all";
  let pendingPurchase = null;
  let currentUser = null;

  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[char]));

  const money = (value) => new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0
  }).format(Number(value || 0));

  const fallbackImage = "/assets/logo.png";
  const cartIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h2l2 10h9l2-7H7M9 19h.01M17 19h.01"/></svg>`;

  async function loadAccount() {
    if (!accountSlot) return;
    try {
      const response = await fetch("/api/store-auth/me", { cache: "no-store", credentials: "same-origin" });
      const data = await response.json();
      if (!response.ok || !data.authenticated) return;
      const user = data.user;
      currentUser = user;
      const nameInput = document.querySelector("#purchase-name");
      const steamInput = document.querySelector("#purchase-steam");
      if (nameInput) nameInput.value = user.personaName || "";
      if (steamInput) steamInput.value = user.steamId || "";
      accountSlot.innerHTML = `<a class="account-user" href="/store/profile.html" aria-label="Открыть профиль ${esc(user.personaName)}">
        <span class="account-balance">${money(user.balance)}</span>
        <img class="account-avatar" src="${esc(user.avatarMedium || user.avatar || fallbackImage)}" alt="" onerror="this.onerror=null;this.src='${fallbackImage}'">
      </a>`;
    } catch {
      // Кнопка входа остаётся доступна при временной недоступности профиля.
    }
  }

  function productCard(product, index, featured) {
    const offer = (product.offers || [])[0] || { id: "", label: "—", price: 0 };
    const cover = product.coverUrl || "";
    const server = String(product.server || "main").toUpperCase();
    const accent = String(product.cardStyle?.accent || "#258bff");
    return `<article class="shop-card${featured ? " shop-card--featured" : ""}" data-product="${esc(product.id)}" style="--delay:${index * 35}ms">
      <button class="shop-card__visual${cover ? "" : " shop-card__visual--empty"}" type="button" data-details aria-label="Подробнее: ${esc(product.name)}" style="--tier-accent:${esc(accent)}">
        ${cover ? `<img src="${esc(cover)}" alt="${esc(product.name)}" loading="lazy" onerror="this.onerror=null;this.hidden=true">` : `<span class="shop-card__tier">${esc(product.name)}</span>`}
        <span class="shop-card__server">${esc(server)}</span>
      </button>
      <div class="shop-card__meta">
        <div><span>${money(offer.price)}</span><strong>${esc(product.name)}</strong></div>
        <button type="button" data-buy aria-label="Купить: ${esc(product.name)}">${cartIcon}</button>
      </div>
    </article>`;
  }

  function bindCards(root) {
    root.querySelectorAll(".shop-card").forEach((card) => {
      const product = catalog.products.find((item) => String(item.id) === card.dataset.product);
      if (!product) return;
      const offerId = product.offers?.[0]?.id;
      card.querySelector("[data-details]")?.addEventListener("click", () => openDetails(product, offerId));
      card.querySelector("[data-buy]")?.addEventListener("click", () => openPurchase(product, offerId));
    });
  }

  function renderProducts() {
    const productOrder = { snow: 0, premium: 1, vip: 2, razban: 100 };
    const products = catalog.products.filter((product) => {
      const server = String(product.server || "main").toLowerCase();
      return serverFilter === "all" || server === "both" || server === serverFilter;
    }).sort((left, right) => {
      const leftOrder = productOrder[String(left.slug || "").toLowerCase()] ?? 50;
      const rightOrder = productOrder[String(right.slug || "").toLowerCase()] ?? 50;
      return leftOrder - rightOrder;
    });

    featuredGrid.innerHTML = "";
    productGrid.innerHTML = "";

    if (!products.length) {
      message.textContent = "Для выбранного сервера пока нет опубликованных товаров.";
      return;
    }

    message.textContent = "";
    const featured = products.slice(0, 4);
    const regular = products.slice(4);
    featuredGrid.innerHTML = featured.map((product, index) => productCard(product, index, true)).join("");
    productGrid.innerHTML = regular.map((product, index) => productCard(product, index + 4, false)).join("");
    bindCards(featuredGrid);
    bindCards(productGrid);
  }

  function openDetails(product, selectedOfferId) {
    const offers = product.offers || [];
    const offer = offers.find((item) => item.id === selectedOfferId) || offers[0] || { id: "", label: "—", price: 0 };
    const cover = product.coverUrl || "";
    const benefits = product.benefits || [];

    detailsContent.innerHTML = `<div class="details-hero${cover ? "" : " details-hero--empty"}"${cover ? ` style="background-image:linear-gradient(90deg,rgba(36,36,36,.35),#242424),url('${esc(cover)}')"` : ""}>
      <div>
        <span class="modal-kicker">${esc(product.badge || "Java Rust")} · ${esc(product.server || "main").toUpperCase()}</span>
        <h2 id="details-title">${esc(product.name)}</h2>
        <p>${esc(product.fullDescription || product.shortDescription || "")}</p>
      </div>
    </div>
    <div class="details-layout">
      <div>
        ${benefits.length ? `<section class="details-section"><h3>Преимущества</h3><ul class="full-benefits">${benefits.map((benefit) => `<li><strong>${esc(benefit.title)}</strong>${benefit.description ? `<br><span>${esc(benefit.description)}</span>` : ""}</li>`).join("")}</ul></section>` : ""}
      </div>
      <aside class="details-side">
        <div class="offer-field">
          <span>Срок</span>
          <div class="custom-offer-picker" data-offer-picker>
            <button class="custom-offer-trigger" type="button" data-offer-trigger aria-haspopup="listbox" aria-expanded="false">
              <span data-offer-label>${esc(offer.label)}</span>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 9 5 5 5-5"/></svg>
            </button>
            <div class="custom-offer-menu" role="listbox" aria-label="Срок привилегии">
              ${offers.map((item) => `<button class="custom-offer-option${item.id === offer.id ? " active" : ""}" type="button" role="option" aria-selected="${item.id === offer.id}" data-offer-id="${esc(item.id)}"><span>${esc(item.label)}</span><strong>${money(item.price)}</strong></button>`).join("")}
            </div>
          </div>
        </div>
        <div class="details-price"><small>Стоимость</small><strong data-detail-price>${money(offer.price)}</strong></div>
        <button type="button" data-detail-buy>Выбрать</button>
        <p>После подтверждения покупки привилегия автоматически привязывается к указанному Steam ID.</p>
      </aside>
    </div>`;

    showModal(detailsModal);
    const picker = detailsContent.querySelector("[data-offer-picker]");
    const trigger = picker?.querySelector("[data-offer-trigger]");
    const label = picker?.querySelector("[data-offer-label]");
    let activeOfferId = offer.id;
    trigger?.addEventListener("click", () => {
      const opened = picker.classList.toggle("open");
      trigger.setAttribute("aria-expanded", String(opened));
    });
    picker?.querySelectorAll("[data-offer-id]").forEach((option) => {
      option.addEventListener("click", () => {
        activeOfferId = option.dataset.offerId;
        const next = offers.find((item) => item.id === activeOfferId);
        picker.querySelectorAll("[data-offer-id]").forEach((item) => {
          const active = item === option;
          item.classList.toggle("active", active);
          item.setAttribute("aria-selected", String(active));
        });
        label.textContent = next?.label || "—";
        detailsContent.querySelector("[data-detail-price]").textContent = money(next?.price);
        picker.classList.remove("open");
        trigger.setAttribute("aria-expanded", "false");
      });
    });
    detailsContent.querySelector("[data-detail-buy]")?.addEventListener("click", () => {
      hideModal(detailsModal);
      openPurchase(product, activeOfferId);
    });
  }

  function openPurchase(product, offerId) {
    const offers = product.offers || [];
    const offer = offers.find((item) => item.id === offerId) || offers[0] || { id: "", label: "—", price: 0 };
    pendingPurchase = { product, offer };
    purchaseSummary.innerHTML = `<strong>${esc(product.name)}</strong><br><span>${esc(offer.label)} · ${money(offer.price)} · ${esc(product.server || "main").toUpperCase()}</span>`;
    purchaseResult.textContent = !currentUser
      ? "Сначала войдите через Steam — привилегия выдаётся только на вошедший аккаунт."
      : catalog.store.purchasesEnabled ? `Баланс: ${money(currentUser.balance)}` : "Покупки временно отключены.";
    purchaseResult.className = currentUser ? "purchase-result" : "purchase-result error";
    const submit = document.querySelector("#purchase-submit");
    if (submit) submit.disabled = !currentUser || !catalog.store.purchasesEnabled;
    showModal(purchaseModal);
  }

  function showModal(modal) {
    modal.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function hideModal(modal) {
    modal.hidden = true;
    if ([detailsModal, purchaseModal, guideModal].every((item) => item.hidden)) document.body.style.overflow = "";
  }

  document.querySelectorAll("[data-close]").forEach((button) => {
    button.addEventListener("click", () => hideModal(button.closest(".modal-backdrop")));
  });

  [detailsModal, purchaseModal, guideModal].forEach((modal) => {
    modal.addEventListener("mousedown", (event) => { if (event.target === modal) hideModal(modal); });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    [detailsModal, purchaseModal, guideModal].forEach((modal) => { if (!modal.hidden) hideModal(modal); });
  });

  document.querySelector("[data-open-guide]")?.addEventListener("click", () => showModal(guideModal));

  document.querySelectorAll("[data-server]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-server]").forEach((item) => item.classList.toggle("active", item === button));
      serverFilter = button.dataset.server;
      renderProducts();
    });
  });

  document.querySelector("#purchase-submit")?.addEventListener("click", async () => {
    if (!pendingPurchase) return;
    if (!currentUser) {
      purchaseResult.textContent = "Сначала войдите через Steam.";
      purchaseResult.className = "purchase-result error";
      return;
    }

    purchaseResult.textContent = "Проверяем доступность покупки…";
    purchaseResult.className = "purchase-result";

    try {
      const response = await fetch("/api/store-auth/purchase", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: pendingPurchase.product.id,
          offerId: pendingPurchase.offer.id,
          requestId: crypto.randomUUID()
        })
      });
      const data = await response.json();
      purchaseResult.textContent = data.message || data.error || "Покупка временно недоступна.";
      purchaseResult.className = response.ok ? "purchase-result" : "purchase-result error";
      if (Number.isFinite(Number(data.balance))) {
        currentUser.balance = Number(data.balance);
        const balance = accountSlot?.querySelector(".account-balance");
        if (balance) balance.textContent = money(currentUser.balance);
      }
    } catch {
      purchaseResult.textContent = "Не удалось связаться с магазином. Попробуйте позже.";
      purchaseResult.className = "purchase-result error";
    }
  });

  fetch(`${API}/catalog`, { cache: "no-store" })
    .then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Каталог недоступен");
      catalog = data;
      renderProducts();
    })
    .catch((error) => {
      message.textContent = error.message || "Каталог временно недоступен.";
    });

  loadAccount();
})();
