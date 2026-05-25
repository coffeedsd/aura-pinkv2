/**
 * AURA PINK — script.js
 * ─────────────────────────────────────────────────────
 * Модули:
 *  1. Header scroll behaviour
 *  2. Burger / mobile nav
 *  3. Reveal animations (IntersectionObserver)
 *  4. Product filters
 *  5. Wishlist
 *  6. Cart (state + DOM)
 *  7. Quick-add modal (size picker)
 *  8. Toast notifications
 *  9. Subscribe form
 * 10. ЮKassa payment integration (структура + виджет)
 * ─────────────────────────────────────────────────────
 */

'use strict';

/* ═══════════════════════════════════════════════════
   1. HEADER SCROLL
═══════════════════════════════════════════════════ */
(function initHeader() {
  const header = document.getElementById('site-header');
  if (!header) return;

  let ticking = false;

  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(() => {
        header.classList.toggle('scrolled', window.scrollY > 24);
        ticking = false;
      });
      ticking = true;
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
})();


/* ═══════════════════════════════════════════════════
   2. BURGER / MOBILE NAV
═══════════════════════════════════════════════════ */
(function initBurger() {
  const burger    = document.getElementById('burger');
  const mobileNav = document.getElementById('mobile-nav');
  if (!burger || !mobileNav) return;

  let isOpen = false;

  function toggle() {
    isOpen = !isOpen;
    burger.classList.toggle('open', isOpen);
    mobileNav.classList.toggle('open', isOpen);
    mobileNav.setAttribute('aria-hidden', String(!isOpen));
    burger.setAttribute('aria-expanded', String(isOpen));
    document.body.style.overflow = isOpen ? 'hidden' : '';
  }

  burger.addEventListener('click', toggle);

  // Закрыть по клику на ссылку
  mobileNav.querySelectorAll('.mobile-nav-link').forEach(link => {
    link.addEventListener('click', () => {
      if (isOpen) toggle();
    });
  });
})();


/* ═══════════════════════════════════════════════════
   3. REVEAL ANIMATIONS
   Jakub-style: opacity + translateY + blur
═══════════════════════════════════════════════════ */
(function initReveal() {
  const elements = document.querySelectorAll('.reveal');
  if (!elements.length) return;

  // Respect prefers-reduced-motion
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) {
    elements.forEach(el => el.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -40px 0px',
  });

  elements.forEach(el => observer.observe(el));
})();


/* ═══════════════════════════════════════════════════
   4. PRODUCT FILTERS
═══════════════════════════════════════════════════ */
(function initFilters() {
  const buttons = document.querySelectorAll('.filter-btn');
  const cards   = document.querySelectorAll('.product-card');
  if (!buttons.length) return;

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const filter = btn.dataset.filter;

      // Active button
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Filter cards
      cards.forEach((card, i) => {
        const match = filter === 'all' || card.dataset.category === filter;

        if (match) {
          card.style.display = '';
          // Stagger re-reveal
          requestAnimationFrame(() => {
            card.style.transitionDelay = `${(i % 6) * 60}ms`;
            card.classList.add('is-visible');
          });
        } else {
          card.classList.remove('is-visible');
          // Hide after transition
          card.addEventListener('transitionend', function hide() {
            if (!card.classList.contains('is-visible')) {
              card.style.display = 'none';
            }
            card.removeEventListener('transitionend', hide);
          });
        }
      });
    });
  });
})();


/* ═══════════════════════════════════════════════════
   5. WISHLIST (UI toggle only)
═══════════════════════════════════════════════════ */
(function initWishlist() {
  document.addEventListener('click', e => {
    const btn = e.target.closest('.wishlist-btn');
    if (!btn) return;

    btn.classList.toggle('active');
    const isActive = btn.classList.contains('active');

    // Micro-animation: heartbeat
    btn.animate([
      { transform: 'scale(1)' },
      { transform: 'scale(1.3)' },
      { transform: 'scale(0.95)' },
      { transform: 'scale(1)' },
    ], { duration: 360, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' });

    Toast.show(
      isActive ? '♡ Добавлено в избранное' : 'Удалено из избранного',
      isActive ? 'success' : 'default'
    );
  });
})();


/* ═══════════════════════════════════════════════════
   6. CART STATE + DOM
═══════════════════════════════════════════════════ */
const Cart = (function() {

  /** @type {Array<{id: string, name: string, price: number, size: string, qty: number, img: string}>} */
  let items = [];

  // DOM refs
  const sidebar    = document.getElementById('cart-sidebar');
  const cartCount  = document.getElementById('cart-count');
  const cartBody   = document.getElementById('cart-body');
  const cartItems  = document.getElementById('cart-items');
  const cartEmpty  = document.getElementById('cart-empty');
  const cartFooter = document.getElementById('cart-footer');
  const cartTotal  = document.getElementById('cart-total');

  function getTotal() {
    return items.reduce((sum, item) => sum + item.price * item.qty, 0);
  }

  function formatPrice(n) {
    return n.toLocaleString('ru-RU') + ' ₽';
  }

  function getItemKey(id, size) {
    return `${id}_${size}`;
  }

  function add(product) {
    const key = getItemKey(product.id, product.size);
    const existing = items.find(i => getItemKey(i.id, i.size) === key);

    if (existing) {
      existing.qty += 1;
    } else {
      items.push({ ...product, qty: 1 });
    }

    renderDOM();
    updateCount();
    open();
  }

  function remove(id, size) {
    items = items.filter(i => !(i.id === id && i.size === size));
    renderDOM();
    updateCount();
  }

  function changeQty(id, size, delta) {
    const item = items.find(i => i.id === id && i.size === size);
    if (!item) return;
    item.qty = Math.max(1, item.qty + delta);
    renderDOM();
    updateCount();
  }

  function updateCount() {
    const total = items.reduce((s, i) => s + i.qty, 0);
    cartCount.textContent = total;
    cartCount.classList.toggle('has-items', total > 0);

    // Micro-animation on badge
    cartCount.animate([
      { transform: 'scale(1.4)', background: '#A07060' },
      { transform: 'scale(1)',   background: '#C4927A' },
    ], { duration: 300, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' });
  }

  function renderDOM() {
    if (!cartItems) return;
    cartItems.innerHTML = '';

    const isEmpty = items.length === 0;
    cartEmpty.style.display  = isEmpty ? '' : 'none';
    cartFooter.style.display = isEmpty ? 'none' : '';

    if (isEmpty) return;

    items.forEach(item => {
      const li = document.createElement('li');
      li.className = 'cart-item';
      li.innerHTML = `
        <div class="cart-item-img product-img--${item.img}"></div>
        <div class="cart-item-body">
          <p class="cart-item-name">${item.name}</p>
          <p class="cart-item-meta">Размер: ${item.size}</p>
          <div class="cart-item-qty">
            <button class="qty-btn" data-action="dec" data-id="${item.id}" data-size="${item.size}" aria-label="Уменьшить">−</button>
            <span class="qty-val">${item.qty}</span>
            <button class="qty-btn" data-action="inc" data-id="${item.id}" data-size="${item.size}" aria-label="Увеличить">+</button>
          </div>
        </div>
        <div class="cart-item-right">
          <button class="cart-remove-btn" data-id="${item.id}" data-size="${item.size}" aria-label="Удалить">×</button>
          <p class="cart-item-price">${formatPrice(item.price * item.qty)}</p>
        </div>
      `;
      cartItems.appendChild(li);
    });

    cartTotal.textContent = formatPrice(getTotal());
  }

  function open() {
    sidebar.classList.add('open');
    sidebar.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    sidebar.classList.remove('open');
    sidebar.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  // Event delegation for cart interactions
  cartItems && cartItems.addEventListener('click', e => {
    const qtyBtn    = e.target.closest('.qty-btn');
    const removeBtn = e.target.closest('.cart-remove-btn');

    if (qtyBtn) {
      const { id, size, action } = qtyBtn.dataset;
      changeQty(id, size, action === 'inc' ? 1 : -1);
    }
    if (removeBtn) {
      const { id, size } = removeBtn.dataset;
      remove(id, size);
      Toast.show('Товар удалён из корзины');
    }
  });

  // Open/close triggers
  document.getElementById('cart-toggle') &&
    document.getElementById('cart-toggle').addEventListener('click', open);

  document.getElementById('cart-close') &&
    document.getElementById('cart-close').addEventListener('click', close);

  document.getElementById('cart-backdrop') &&
    document.getElementById('cart-backdrop').addEventListener('click', close);

  // Checkout button → open payment modal
  document.getElementById('checkout-btn') &&
    document.getElementById('checkout-btn').addEventListener('click', () => {
      close();
      Payment.open(items, getTotal(), formatPrice);
    });

  return { add, open, close, getItems, getTotal, formatPrice };

  function getItems() { return [...items]; }
})();


/* ═══════════════════════════════════════════════════
   7. QUICK-ADD MODAL (size picker)
═══════════════════════════════════════════════════ */
(function initQuickAdd() {
  const modal        = document.getElementById('size-modal');
  const modalName    = document.getElementById('modal-name');
  const modalPrice   = document.getElementById('modal-price');
  const modalImg     = document.getElementById('modal-img');
  const sizeSelector = document.getElementById('size-selector');
  const addBtn       = document.getElementById('modal-add-btn');
  const closeBtn     = document.getElementById('modal-close');

  if (!modal) return;

  let currentProduct = null;
  let selectedSize   = 'M';

  function openModal(product) {
    currentProduct = product;
    selectedSize = 'M';

    modalName.textContent  = product.name;
    modalPrice.textContent = Number(product.price).toLocaleString('ru-RU') + ' ₽';

    // Reset img class
    modalImg.className = `modal-product-img product-img--${product.img}`;

    // Reset size selection
    sizeSelector.querySelectorAll('.size-option').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.size === selectedSize);
    });

    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    // Focus trap
    setTimeout(() => addBtn.focus(), 50);
  }

  function closeModal() {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    currentProduct = null;
  }

  // Quick-add buttons on product cards
  document.addEventListener('click', e => {
    const btn = e.target.closest('.quick-add-btn');
    if (!btn) return;
    openModal({
      id:    btn.dataset.id,
      name:  btn.dataset.name,
      price: btn.dataset.price,
      img:   btn.dataset.img,
    });
  });

  // Size selection
  sizeSelector && sizeSelector.addEventListener('click', e => {
    const btn = e.target.closest('.size-option');
    if (!btn) return;
    selectedSize = btn.dataset.size;
    sizeSelector.querySelectorAll('.size-option').forEach(b =>
      b.classList.toggle('active', b === btn)
    );
  });

  // Add to cart
  addBtn && addBtn.addEventListener('click', () => {
    if (!currentProduct) return;
    Cart.add({ ...currentProduct, size: selectedSize });
    closeModal();
    Toast.show(`«${currentProduct.name}» добавлено в корзину`, 'success');
  });

  // Close
  closeBtn && closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', e => {
    if (e.target === modal) closeModal();
  });

  // Escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (modal.classList.contains('open')) closeModal();
    }
  });
})();


/* ═══════════════════════════════════════════════════
   8. TOAST NOTIFICATIONS
   Emil-style: fast, minimal, purposeful
═══════════════════════════════════════════════════ */
const Toast = (function() {
  const container = document.getElementById('toast-container');
  let queue = [];

  function show(message, type = 'default', duration = 3000) {
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.setAttribute('role', 'status');
    toast.textContent = message;
    container.appendChild(toast);

    // Enter
    requestAnimationFrame(() => {
      requestAnimationFrame(() => toast.classList.add('show'));
    });

    // Exit
    const timer = setTimeout(() => dismiss(toast), duration);
    toast._timer = timer;

    return toast;
  }

  function dismiss(toast) {
    if (!toast || !toast.parentNode) return;
    clearTimeout(toast._timer);
    toast.classList.remove('show');
    toast.classList.add('hide');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  }

  return { show, dismiss };
})();


/* ═══════════════════════════════════════════════════
   9. SUBSCRIBE FORM
═══════════════════════════════════════════════════ */
(function initSubscribe() {
  const form  = document.getElementById('subscribe-form');
  const input = form && form.querySelector('.subscribe-input');
  if (!form || !input) return;

  form.addEventListener('submit', e => {
    e.preventDefault();
    const email = input.value.trim();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      input.style.borderColor = '#C47070';
      input.focus();

      input.animate([
        { transform: 'translateX(-6px)' },
        { transform: 'translateX(6px)' },
        { transform: 'translateX(-4px)' },
        { transform: 'translateX(4px)' },
        { transform: 'translateX(0)' },
      ], { duration: 320, easing: 'ease-out' });

      return;
    }

    input.style.borderColor = '';

    // TODO: реальный API-запрос
    // await fetch('/api/subscribe', { method: 'POST', body: JSON.stringify({ email }) })

    Toast.show('Вы подписаны! Спасибо ✓', 'success');
    input.value = '';
  });
})();


/* ═══════════════════════════════════════════════════
   10. ЮKASSA PAYMENT INTEGRATION
   ─────────────────────────────────────────────────
   Структура:
   1. Payment.open()  — открыть модалку с формой
   2. Payment.submit() — создать платёж через ваш backend
   3. YooKassa.initWidget() — встроить виджет ЮKassa
   
   ВАЖНО: Для работы требуется:
   a) Ваш backend (Node.js / PHP / Python / etc.),
      который создаёт платёж через ЮKassa API
      и возвращает { confirmation_token, payment_id }
   b) Подключить SDK ЮKassa:
      <script src="https://yookassa.ru/checkout-widget/v1/checkout-widget.js"></script>
   c) Установить реальный YUKASSA_SHOP_ID в конфиге ниже
═══════════════════════════════════════════════════ */
const Payment = (function() {

  // ── Конфигурация ──────────────────────────────────
  const CONFIG = {
    /**
     * Замените на реальный Shop ID из личного кабинета ЮKassa
     * https://yookassa.ru/my/settings
     */
    shopId: 'YOUR_SHOP_ID',

    /**
     * URL вашего backend-эндпоинта для создания платежа.
     * Ожидает POST { amount, currency, description, metadata, items[] }
     * Возвращает { confirmation_token, payment_id }
     *
     * Пример на Node.js/Express — см. docs/yokassa-backend-example.js
     */
    createPaymentUrl: '/api/payment/create',

    currency: 'RUB',
    locale: 'ru',
  };

  // ── DOM refs ──────────────────────────────────────
  const modal          = document.getElementById('payment-modal');
  const closeBtn       = document.getElementById('payment-modal-close');
  const submitBtn      = document.getElementById('payment-submit-btn');
  const summaryEl      = document.getElementById('payment-summary');
  const totalDisplay   = document.getElementById('payment-total-display');
  const widgetContainer = document.getElementById('yokassa-widget-container');

  // ── State ─────────────────────────────────────────
  let currentItems     = [];
  let currentTotal     = 0;
  let currentFormatFn  = n => n + ' ₽';
  let yokassaWidget    = null;

  // ── Payment method selector ───────────────────────
  document.querySelectorAll('.pay-method').forEach(label => {
    label.addEventListener('click', () => {
      document.querySelectorAll('.pay-method').forEach(l => l.classList.remove('active'));
      label.classList.add('active');
    });
  });

  // ── Open modal ────────────────────────────────────
  function open(items, total, formatPrice) {
    currentItems    = items;
    currentTotal    = total;
    currentFormatFn = formatPrice;

    // Render order summary
    renderSummary(items, total, formatPrice);

    // Show modal
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    // Clear previous widget
    if (widgetContainer) widgetContainer.innerHTML = '';
    yokassaWidget = null;
  }

  function close() {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (widgetContainer) widgetContainer.innerHTML = '';
    yokassaWidget = null;
  }

  function renderSummary(items, total, fmt) {
    if (!summaryEl) return;
    summaryEl.innerHTML = items.map(item =>
      `<div style="display:flex;justify-content:space-between;">
        <span>${item.name} × ${item.qty} (${item.size})</span>
        <span>${fmt(item.price * item.qty)}</span>
       </div>`
    ).join('') +
      `<div style="display:flex;justify-content:space-between;border-top:1px solid var(--color-parchment);margin-top:8px;padding-top:8px;font-weight:600;color:var(--color-ink);">
        <span>Итого</span><span>${fmt(total)}</span>
       </div>`;

    if (totalDisplay) totalDisplay.textContent = fmt(total);
  }

  // ── Validate contact form ─────────────────────────
  function validateForm() {
    const name    = document.getElementById('pay-name')?.value.trim();
    const email   = document.getElementById('pay-email')?.value.trim();
    const phone   = document.getElementById('pay-phone')?.value.trim();
    const city    = document.getElementById('pay-city')?.value.trim();
    const address = document.getElementById('pay-address')?.value.trim();

    const errors = [];
    if (!name)                                              errors.push('Введите имя');
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Введите корректный email');
    if (!phone)                                             errors.push('Введите телефон');
    if (!city)                                              errors.push('Введите город');
    if (!address)                                           errors.push('Введите адрес доставки');

    return errors;
  }

  // ── Collect order data ────────────────────────────
  function collectOrderData() {
    const payMethod = document.querySelector('.pay-method.active input')?.value || 'bank_card';

    return {
      amount: {
        value: (currentTotal / 100).toFixed(2), // если цены в копейках — скорректируйте
        currency: CONFIG.currency,
      },
      // Для рублёвых цен:
      amountRub: currentTotal,
      payment_method_type: payMethod,
      description: `Заказ Aura Pink — ${currentItems.map(i => i.name).join(', ')}`,
      metadata: {
        shop: 'aura-pink',
        customer_name:  document.getElementById('pay-name')?.value.trim(),
        customer_email: document.getElementById('pay-email')?.value.trim(),
        customer_phone: document.getElementById('pay-phone')?.value.trim(),
        delivery_city:  document.getElementById('pay-city')?.value.trim(),
        delivery_addr:  document.getElementById('pay-address')?.value.trim(),
        delivery_zip:   document.getElementById('pay-zip')?.value.trim(),
      },
      items: currentItems.map(item => ({
        description:   item.name,
        quantity:      item.qty,
        amount: {
          value:    (item.price / 100).toFixed(2),
          currency: CONFIG.currency,
        },
        vat_code:   1, // НДС — уточните у бухгалтера
        payment_mode:    'full_prepayment',
        payment_subject: 'commodity',
      })),
    };
  }

  /**
   * createPayment — вызывает ваш backend,
   * который создаёт платёж через ЮKassa REST API и
   * возвращает { confirmation_token, payment_id }
   *
   * @returns {Promise<{confirmation_token: string, payment_id: string}>}
   */
  async function createPayment(orderData) {
    const res = await fetch(CONFIG.createPaymentUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `HTTP ${res.status}`);
    }

    return res.json();
  }

  /**
   * initYooKassaWidget — встраивает виджет ЮKassa
   * Требует подключённого SDK:
   * <script src="https://yookassa.ru/checkout-widget/v1/checkout-widget.js"></script>
   *
   * @param {string} confirmationToken — токен из createPayment
   */
  function initYooKassaWidget(confirmationToken) {
    if (typeof window.YooMoneyCheckoutWidget === 'undefined') {
      console.error('[Aura Pink] ЮKassa SDK не подключён. Добавьте в <head>: ' +
        '<script src="https://yookassa.ru/checkout-widget/v1/checkout-widget.js"><\/script>');
      Toast.show('Ошибка загрузки виджета оплаты', 'error');
      return;
    }

    if (widgetContainer) widgetContainer.innerHTML = '';

    yokassaWidget = new window.YooMoneyCheckoutWidget({
      confirmation_token: confirmationToken,
      return_url: window.location.origin + '/order-success.html',
      // customization
      customization: {
        colors: {
          controlPrimary:     '#2A2118', // --color-ink
          controlPrimaryContent: '#FAF7F2',
        },
      },
      error_callback: function(error) {
        console.error('[ЮKassa] Ошибка виджета:', error);
        Toast.show('Ошибка при оплате. Попробуйте ещё раз.', 'error');
      },
    });

    yokassaWidget.render('yokassa-widget-container')
      .then(() => {
        // Виджет загружен — скрываем кнопку "Перейти к оплате"
        if (submitBtn) submitBtn.style.display = 'none';
      })
      .catch(err => {
        console.error('[ЮKassa] render error:', err);
        Toast.show('Не удалось загрузить форму оплаты', 'error');
      });
  }

  // ── Submit handler ────────────────────────────────
  async function handleSubmit() {
    const errors = validateForm();
    if (errors.length) {
      Toast.show(errors[0], 'error');
      return;
    }

    // Loading state
    submitBtn.disabled   = true;
    submitBtn.textContent = 'Создаём заказ…';

    const orderData = collectOrderData();

    try {
      // 1. Создаём платёж на backend
      const { confirmation_token, payment_id } = await createPayment(orderData);

      // 2. Сохраняем payment_id локально (для отслеживания статуса)
      sessionStorage.setItem('aura_payment_id', payment_id);

      // 3. Встраиваем ЮKassa виджет
      initYooKassaWidget(confirmation_token);

      Toast.show('Переходим к оплате…', 'success');

    } catch (err) {
      console.error('[Aura Pink] Payment error:', err);
      Toast.show('Ошибка создания заказа: ' + err.message, 'error');
      submitBtn.disabled   = false;
      submitBtn.textContent = 'Перейти к оплате через ЮKassa';
    }
  }

  // ── Event bindings ────────────────────────────────
  submitBtn && submitBtn.addEventListener('click', handleSubmit);
  closeBtn  && closeBtn.addEventListener('click', close);
  modal     && modal.addEventListener('click', e => {
    if (e.target === modal) close();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modal?.classList.contains('open')) close();
  });

  return { open, close };
})();


/* ═══════════════════════════════════════════════════
   УТИЛИТЫ
═══════════════════════════════════════════════════ */

/** Debounce */
function debounce(fn, ms) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), ms);
  };
}

/** Прокрутка к секции при клике на якорные ссылки */
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', e => {
    const id = link.getAttribute('href').slice(1);
    const target = id ? document.getElementById(id) : null;
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});


/* ═══════════════════════════════════════════════════
   BACKEND ПРИМЕР (СПРАВОЧНО)
   ─────────────────────────────────────────────────
   Создайте файл /server/payment.js:

   const { YooCheckout } = require('@a2seven/yoo-checkout');
   
   const checkout = new YooCheckout({
     shopId:    process.env.YUKASSA_SHOP_ID,
     secretKey: process.env.YUKASSA_SECRET_KEY,
   });

   app.post('/api/payment/create', async (req, res) => {
     try {
       const payment = await checkout.createPayment({
         amount:           req.body.amount,
         payment_method_type: req.body.payment_method_type,
         confirmation: {
           type:       'embedded',  // для виджета
           return_url: 'https://your-domain.ru/order-success',
         },
         description:  req.body.description,
         metadata:     req.body.metadata,
         receipt: {
           customer: {
             email: req.body.metadata.customer_email,
             phone: req.body.metadata.customer_phone,
           },
           items: req.body.items,
         },
         capture: true,
       }, { idempotenceKey: Date.now().toString() });
   
       res.json({
         confirmation_token: payment.confirmation.confirmation_token,
         payment_id:         payment.id,
       });
     } catch (err) {
       res.status(500).json({ message: err.message });
     }
   });

   npm install @a2seven/yoo-checkout
   Документация: https://yookassa.ru/developers/api
═══════════════════════════════════════════════════ */


/* ═══════════════════════════════════════════════════
   12. SUPPORT WIDGET (FAB + ЧАТ) — Supabase
═══════════════════════════════════════════════════ */
(function initSupportWidget() {
  const widget    = document.getElementById('support-widget');
  const fab       = document.getElementById('support-fab');
  const chat      = document.getElementById('support-chat');
  const closeBtn  = document.getElementById('support-chat-close');
  const input     = document.getElementById('support-input');
  const sendBtn   = document.getElementById('support-send');
  const messages  = document.getElementById('support-messages');
  const badge     = document.getElementById('support-badge');
  const perkSupport = document.getElementById('perk-support');
  if (!widget || !fab) return;

  let isOpen = false;
  let sessionId = null;
  let pollInterval = null;
  let lastMessageTime = null;

  // Уникальный ID клиента
  let clientId = localStorage.getItem('ap_client_id');
  if (!clientId) {
    clientId = 'client_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    localStorage.setItem('ap_client_id', clientId);
  }

  const SB_URL = 'https://acylsytogrgyesrcbthx.supabase.co';
  const SB_KEY = 'sb_publishable_sTp-NwKK2dqaMjjMDcqDsA_HSl45kVD';
  const headers = { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' };

  async function getOrCreateSession() {
    // Ищем открытую сессию клиента
    const r = await fetch(`${SB_URL}/rest/v1/chat_sessions?client_id=eq.${encodeURIComponent(clientId)}&status=eq.open&order=created_at.desc&limit=1`, { headers });
    const data = await r.json();
    if (data && data.length > 0) return data[0].id;
    // Создаём новую
    const r2 = await fetch(`${SB_URL}/rest/v1/chat_sessions`, {
      method: 'POST', headers,
      body: JSON.stringify({ client_id: clientId, status: 'open', last_message: '' })
    });
    const s = await r2.json();
    return Array.isArray(s) ? s[0].id : s.id;
  }

  async function loadMessages(sid) {
    const r = await fetch(`${SB_URL}/rest/v1/chat_messages?session_id=eq.${sid}&order=created_at.asc`, { headers });
    return await r.json();
  }

  async function saveMessage(sid, sender, text) {
    await fetch(`${SB_URL}/rest/v1/chat_messages`, {
      method: 'POST', headers,
      body: JSON.stringify({ session_id: sid, sender, text })
    });
    await fetch(`${SB_URL}/rest/v1/chat_sessions?id=eq.${sid}`, {
      method: 'PATCH', headers,
      body: JSON.stringify({ last_message: text, updated_at: new Date().toISOString() })
    });
  }

  function open() {
    isOpen = true;
    widget.classList.add('is-open');
    chat.setAttribute('aria-hidden', 'false');
    fab.setAttribute('aria-expanded', 'true');
    badge.classList.add('hidden');
    setTimeout(() => input && input.focus(), 400);
    initSession();
  }

  function close() {
    isOpen = false;
    widget.classList.remove('is-open');
    chat.setAttribute('aria-hidden', 'true');
    fab.setAttribute('aria-expanded', 'false');
    if (pollInterval) clearInterval(pollInterval);
  }

  function toggle() { isOpen ? close() : open(); }

  fab.addEventListener('click', toggle);
  closeBtn && closeBtn.addEventListener('click', close);
  perkSupport && perkSupport.addEventListener('click', open);
  perkSupport && perkSupport.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
  });

  function scrollToBottom() {
    if (messages) messages.scrollTop = messages.scrollHeight;
  }

  function renderMessage(text, type) {
    const div = document.createElement('div');
    div.className = `support-msg support-msg--${type}`;
    text.split('\n').forEach(line => {
      const p = document.createElement('p');
      p.textContent = line;
      div.appendChild(p);
    });
    messages.appendChild(div);
    scrollToBottom();
  }

  async function initSession() {
    if (sessionId) { pollForReplies(); return; }
    try {
      sessionId = await getOrCreateSession();
      const msgs = await loadMessages(sessionId);
      // Очищаем placeholder и рендерим историю
      if (msgs && msgs.length > 0) {
        messages.innerHTML = '';
        msgs.forEach(m => {
          renderMessage(m.text, m.sender === 'client' ? 'out' : 'in');
          lastMessageTime = m.created_at;
        });
      }
      pollForReplies();
    } catch(e) { console.error('Chat init error', e); }
  }

  function pollForReplies() {
    if (pollInterval) clearInterval(pollInterval);
    pollInterval = setInterval(async () => {
      if (!sessionId || !isOpen) return;
      try {
        let url = `${SB_URL}/rest/v1/chat_messages?session_id=eq.${sessionId}&sender=eq.admin&order=created_at.asc`;
        if (lastMessageTime) url += `&created_at=gt.${encodeURIComponent(lastMessageTime)}`;
        const r = await fetch(url, { headers });
        const newMsgs = await r.json();
        if (newMsgs && newMsgs.length > 0) {
          newMsgs.forEach(m => {
            renderMessage(m.text, 'in');
            lastMessageTime = m.created_at;
          });
          if (!isOpen) badge.classList.remove('hidden');
        }
      } catch(e) {}
    }, 3000);
  }

  async function sendMessage() {
    const text = input.value.trim();
    if (!text) return;
    renderMessage(text, 'out');
    input.value = '';
    sendBtn.animate([{ transform: 'scale(1)' },{ transform: 'scale(0.85)' },{ transform: 'scale(1)' }], { duration: 200, easing: 'ease-out' });
    try {
      if (!sessionId) sessionId = await getOrCreateSession();
      await saveMessage(sessionId, 'client', text);
    } catch(e) { console.error('Send error', e); }
  }

  sendBtn && sendBtn.addEventListener('click', sendMessage);
  input && input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && isOpen) close();
  });
})();

/* ═══════════════════════════════════════════════════
   11. LOOKBOOK — бесконечная лента с инерцией
═══════════════════════════════════════════════════ */
(function initLookbook() {
  const strip = document.getElementById('lookbook-strip');
  const track = document.getElementById('lookbook-track');
  if (!strip || !track) return;

  track.style.animation = 'none';
  track.style.transition = 'none';

  const setSize = 6;
  const origCards = Array.from(track.children).slice(0, setSize);

  // Убираем HTML-дубли, клонируем через JS
  while (track.children.length > setSize) track.removeChild(track.lastChild);
  for (let i = 0; i < 3; i++) {
    origCards.forEach(card => {
      const clone = card.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      track.appendChild(clone);
    });
  }

  let pos = 0;
  let autoSpeed = 0.7;     // авто-скорость px/кадр
  let velocity = 0;        // инерция после броска
  let isDragging = false;
  let dragStartX = 0;
  let dragStartPos = 0;
  let lastX = 0;
  let lastTime = 0;
  let oneSetWidth = 0;
  const friction = 0.95;   // затухание инерции (0.9 = быстро, 0.98 = долго)

  function measureSet() {
    const cards = track.querySelectorAll('.look');
    let w = 0;
    for (let i = 0; i < setSize; i++) w += cards[i].getBoundingClientRect().width;
    const gap = parseFloat(window.getComputedStyle(track).gap) || 16;
    w += gap * setSize;
    return w;
  }

  function normalise() {
    if (oneSetWidth <= 0) return;
    while (pos <= -oneSetWidth) pos += oneSetWidth;
    while (pos > 0) pos -= oneSetWidth;
  }

  function animate() {
    if (isDragging) {
      // во время drag — ничего не добавляем, позиция управляется мышью
    } else if (Math.abs(velocity) > 0.3) {
      // инерция после броска
      pos += velocity;
      velocity *= friction;
    } else {
      // авто-прокрутка
      velocity = 0;
      pos -= autoSpeed;
    }

    normalise();
    track.style.transform = `translateX(${pos}px)`;
    requestAnimationFrame(animate);
  }

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      oneSetWidth = measureSet();
      animate();
    });
  });

  // ── Hover ────────────────────────────────────────────────
  strip.addEventListener('mouseenter', () => { autoSpeed = 0; });
  strip.addEventListener('mouseleave', () => { if (!isDragging) autoSpeed = 0.7; });

  // ── Mouse drag ───────────────────────────────────────────
  strip.addEventListener('mousedown', e => {
    e.preventDefault();
    isDragging = true;
    dragStartX = e.clientX;
    dragStartPos = pos;
    lastX = e.clientX;
    lastTime = Date.now();
    velocity = 0;
    autoSpeed = 0;
    strip.style.cursor = 'grabbing';
  });

  window.addEventListener('mousemove', e => {
    if (!isDragging) return;
    const now = Date.now();
    const dt = now - lastTime || 1;
    velocity = (e.clientX - lastX) / dt * 16; // px/frame при 60fps
    lastX = e.clientX;
    lastTime = now;
    pos = dragStartPos + (e.clientX - dragStartX);
  });

  window.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;
    strip.style.cursor = 'grab';
    // velocity уже посчитан в mousemove — инерция продолжится
    // если бросили медленно — включаем авто
    if (Math.abs(velocity) < 0.5) autoSpeed = 0.7;
  });

  // ── Touch ────────────────────────────────────────────────
  strip.addEventListener('touchstart', e => {
    dragStartX = e.touches[0].clientX;
    dragStartPos = pos;
    lastX = e.touches[0].clientX;
    lastTime = Date.now();
    isDragging = true;
    velocity = 0;
    autoSpeed = 0;
  }, { passive: true });

  strip.addEventListener('touchmove', e => {
    if (!isDragging) return;
    const now = Date.now();
    const dt = now - lastTime || 1;
    velocity = (e.touches[0].clientX - lastX) / dt * 16;
    lastX = e.touches[0].clientX;
    lastTime = now;
    pos = dragStartPos + (e.touches[0].clientX - dragStartX);
  }, { passive: true });

  strip.addEventListener('touchend', () => {
    isDragging = false;
    if (Math.abs(velocity) < 0.5) autoSpeed = 0.7;
  });
})();

/* ═══════════════════════════════════════════════════
   12. SUPPORT WIDGET (FAB + ЧАТ) — Supabase
═══════════════════════════════════════════════════ */
(function initSupportWidget() {
  const widget    = document.getElementById('support-widget');
  const fab       = document.getElementById('support-fab');
  const chat      = document.getElementById('support-chat');
  const closeBtn  = document.getElementById('support-chat-close');
  const input     = document.getElementById('support-input');
  const sendBtn   = document.getElementById('support-send');
  const messages  = document.getElementById('support-messages');
  const badge     = document.getElementById('support-badge');
  const perkSupport = document.getElementById('perk-support');
  if (!widget || !fab) return;

  let isOpen = false;
  let sessionId = null;
  let pollInterval = null;
  let lastMessageTime = null;

  // Уникальный ID клиента
  let clientId = localStorage.getItem('ap_client_id');
  if (!clientId) {
    clientId = 'client_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    localStorage.setItem('ap_client_id', clientId);
  }

  const SB_URL = 'https://acylsytogrgyesrcbthx.supabase.co';
  const SB_KEY = 'sb_publishable_sTp-NwKK2dqaMjjMDcqDsA_HSl45kVD';
  const headers = { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' };

  async function getOrCreateSession() {
    // Ищем открытую сессию клиента
    const r = await fetch(`${SB_URL}/rest/v1/chat_sessions?client_id=eq.${encodeURIComponent(clientId)}&status=eq.open&order=created_at.desc&limit=1`, { headers });
    const data = await r.json();
    if (data && data.length > 0) return data[0].id;
    // Создаём новую
    const r2 = await fetch(`${SB_URL}/rest/v1/chat_sessions`, {
      method: 'POST', headers,
      body: JSON.stringify({ client_id: clientId, status: 'open', last_message: '' })
    });
    const s = await r2.json();
    return Array.isArray(s) ? s[0].id : s.id;
  }

  async function loadMessages(sid) {
    const r = await fetch(`${SB_URL}/rest/v1/chat_messages?session_id=eq.${sid}&order=created_at.asc`, { headers });
    return await r.json();
  }

  async function saveMessage(sid, sender, text) {
    await fetch(`${SB_URL}/rest/v1/chat_messages`, {
      method: 'POST', headers,
      body: JSON.stringify({ session_id: sid, sender, text })
    });
    await fetch(`${SB_URL}/rest/v1/chat_sessions?id=eq.${sid}`, {
      method: 'PATCH', headers,
      body: JSON.stringify({ last_message: text, updated_at: new Date().toISOString() })
    });
  }

  function open() {
    isOpen = true;
    widget.classList.add('is-open');
    chat.setAttribute('aria-hidden', 'false');
    fab.setAttribute('aria-expanded', 'true');
    badge.classList.add('hidden');
    setTimeout(() => input && input.focus(), 400);
    initSession();
  }

  function close() {
    isOpen = false;
    widget.classList.remove('is-open');
    chat.setAttribute('aria-hidden', 'true');
    fab.setAttribute('aria-expanded', 'false');
    if (pollInterval) clearInterval(pollInterval);
  }

  function toggle() { isOpen ? close() : open(); }

  fab.addEventListener('click', toggle);
  closeBtn && closeBtn.addEventListener('click', close);
  perkSupport && perkSupport.addEventListener('click', open);
  perkSupport && perkSupport.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
  });

  function scrollToBottom() {
    if (messages) messages.scrollTop = messages.scrollHeight;
  }

  function renderMessage(text, type) {
    const div = document.createElement('div');
    div.className = `support-msg support-msg--${type}`;
    text.split('\n').forEach(line => {
      const p = document.createElement('p');
      p.textContent = line;
      div.appendChild(p);
    });
    messages.appendChild(div);
    scrollToBottom();
  }

  async function initSession() {
    if (sessionId) { pollForReplies(); return; }
    try {
      sessionId = await getOrCreateSession();
      const msgs = await loadMessages(sessionId);
      // Очищаем placeholder и рендерим историю
      if (msgs && msgs.length > 0) {
        messages.innerHTML = '';
        msgs.forEach(m => {
          renderMessage(m.text, m.sender === 'client' ? 'out' : 'in');
          lastMessageTime = m.created_at;
        });
      }
      pollForReplies();
    } catch(e) { console.error('Chat init error', e); }
  }

  function pollForReplies() {
    if (pollInterval) clearInterval(pollInterval);
    pollInterval = setInterval(async () => {
      if (!sessionId || !isOpen) return;
      try {
        let url = `${SB_URL}/rest/v1/chat_messages?session_id=eq.${sessionId}&sender=eq.admin&order=created_at.asc`;
        if (lastMessageTime) url += `&created_at=gt.${encodeURIComponent(lastMessageTime)}`;
        const r = await fetch(url, { headers });
        const newMsgs = await r.json();
        if (newMsgs && newMsgs.length > 0) {
          newMsgs.forEach(m => {
            renderMessage(m.text, 'in');
            lastMessageTime = m.created_at;
          });
          if (!isOpen) badge.classList.remove('hidden');
        }
      } catch(e) {}
    }, 3000);
  }

  async function sendMessage() {
    const text = input.value.trim();
    if (!text) return;
    renderMessage(text, 'out');
    input.value = '';
    sendBtn.animate([{ transform: 'scale(1)' },{ transform: 'scale(0.85)' },{ transform: 'scale(1)' }], { duration: 200, easing: 'ease-out' });
    try {
      if (!sessionId) sessionId = await getOrCreateSession();
      await saveMessage(sessionId, 'client', text);
    } catch(e) { console.error('Send error', e); }
  }

  sendBtn && sendBtn.addEventListener('click', sendMessage);
  input && input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && isOpen) close();
  });
})();

/* ═══════════════════════════════════════════════════
   11. LOOKBOOK — бесконечная лента
   JS marquee: клонируем один набор, сдвигаем на его ширину,
   сбрасываем без анимации — идеальный цикл.
═══════════════════════════════════════════════════ */
(function initLookbook() {
  const strip = document.getElementById('lookbook-strip');
  const track = document.getElementById('lookbook-track');
  if (!strip || !track) return;

  // Убираем CSS-анимацию полностью
  track.style.animation = 'none';
  track.style.transition = 'none';

  // Оставляем только ОДИН оригинальный набор карточек,
  // клонируем его дважды динамически — чисто и надёжно
  const origCards = Array.from(track.children);
  const setSize = 6; // кол-во оригинальных карточек

  // Убираем все aria-hidden дубли из HTML, оставим только первые 6
  while (track.children.length > setSize) {
    track.removeChild(track.lastChild);
  }

  // Клонируем 3 доп набора чтобы хватало на любой экран
  for (let i = 0; i < 3; i++) {
    origCards.forEach(card => {
      const clone = card.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      track.appendChild(clone);
    });
  }

  let pos = 0;
  let speed = 0.7;
  let isDragging = false;
  let dragStartX = 0;
  let dragStartPos = 0;
  let oneSetWidth = 0;

  // Вычисляем ширину одного набора (6 карточек + gaps)
  function measureSet() {
    const cards = track.querySelectorAll('.look');
    let w = 0;
    for (let i = 0; i < setSize; i++) {
      const rect = cards[i].getBoundingClientRect();
      w += rect.width;
    }
    // Добавляем gap между карточками
    const gap = parseFloat(window.getComputedStyle(track).gap) || 16;
    w += gap * setSize;
    return w;
  }

  function animate() {
    if (!isDragging) {
      pos -= speed;
    }

    // Как только прокрутили на ширину одного набора — сбрасываем на 0
    // Это происходит мгновенно (без transition) — телепортации не видно
    if (Math.abs(pos) >= oneSetWidth) {
      pos += oneSetWidth; // телепортируемся назад на один набор
    }

    track.style.transform = `translateX(${pos}px)`;
    requestAnimationFrame(animate);
  }

  // Ждём рендер чтобы размеры были правильные
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      oneSetWidth = measureSet();
      animate();
    });
  });

  // Пауза при hover
  strip.addEventListener('mouseenter', () => { speed = 0; });
  strip.addEventListener('mouseleave', () => { if (!isDragging) speed = 0.7; });

  // Drag мышью
  strip.addEventListener('mousedown', e => {
    isDragging = true;
    dragStartX = e.clientX;
    dragStartPos = pos;
    strip.style.cursor = 'grabbing';
    speed = 0;
  });

  window.addEventListener('mousemove', e => {
    if (!isDragging) return;
    pos = dragStartPos + (e.clientX - dragStartX);
  });

  window.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;
    strip.style.cursor = 'grab';
    speed = 0.7;
  });

  // Тач
  strip.addEventListener('touchstart', e => {
    dragStartX = e.touches[0].clientX;
    dragStartPos = pos;
    isDragging = true;
    speed = 0;
  }, { passive: true });

  strip.addEventListener('touchmove', e => {
    pos = dragStartPos + (e.touches[0].clientX - dragStartX);
  }, { passive: true });

  strip.addEventListener('touchend', () => {
    isDragging = false;
    speed = 0.7;
  });
})();

/* ═══════════════════════════════════════════════════
   12. SUPPORT WIDGET (FAB + ЧАТ) — Supabase
═══════════════════════════════════════════════════ */
(function initSupportWidget() {
  const widget    = document.getElementById('support-widget');
  const fab       = document.getElementById('support-fab');
  const chat      = document.getElementById('support-chat');
  const closeBtn  = document.getElementById('support-chat-close');
  const input     = document.getElementById('support-input');
  const sendBtn   = document.getElementById('support-send');
  const messages  = document.getElementById('support-messages');
  const badge     = document.getElementById('support-badge');
  const perkSupport = document.getElementById('perk-support');
  if (!widget || !fab) return;

  let isOpen = false;
  let sessionId = null;
  let pollInterval = null;
  let lastMessageTime = null;

  // Уникальный ID клиента
  let clientId = localStorage.getItem('ap_client_id');
  if (!clientId) {
    clientId = 'client_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    localStorage.setItem('ap_client_id', clientId);
  }

  const SB_URL = 'https://acylsytogrgyesrcbthx.supabase.co';
  const SB_KEY = 'sb_publishable_sTp-NwKK2dqaMjjMDcqDsA_HSl45kVD';
  const headers = { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' };

  async function getOrCreateSession() {
    // Ищем открытую сессию клиента
    const r = await fetch(`${SB_URL}/rest/v1/chat_sessions?client_id=eq.${encodeURIComponent(clientId)}&status=eq.open&order=created_at.desc&limit=1`, { headers });
    const data = await r.json();
    if (data && data.length > 0) return data[0].id;
    // Создаём новую
    const r2 = await fetch(`${SB_URL}/rest/v1/chat_sessions`, {
      method: 'POST', headers,
      body: JSON.stringify({ client_id: clientId, status: 'open', last_message: '' })
    });
    const s = await r2.json();
    return Array.isArray(s) ? s[0].id : s.id;
  }

  async function loadMessages(sid) {
    const r = await fetch(`${SB_URL}/rest/v1/chat_messages?session_id=eq.${sid}&order=created_at.asc`, { headers });
    return await r.json();
  }

  async function saveMessage(sid, sender, text) {
    await fetch(`${SB_URL}/rest/v1/chat_messages`, {
      method: 'POST', headers,
      body: JSON.stringify({ session_id: sid, sender, text })
    });
    await fetch(`${SB_URL}/rest/v1/chat_sessions?id=eq.${sid}`, {
      method: 'PATCH', headers,
      body: JSON.stringify({ last_message: text, updated_at: new Date().toISOString() })
    });
  }

  function open() {
    isOpen = true;
    widget.classList.add('is-open');
    chat.setAttribute('aria-hidden', 'false');
    fab.setAttribute('aria-expanded', 'true');
    badge.classList.add('hidden');
    setTimeout(() => input && input.focus(), 400);
    initSession();
  }

  function close() {
    isOpen = false;
    widget.classList.remove('is-open');
    chat.setAttribute('aria-hidden', 'true');
    fab.setAttribute('aria-expanded', 'false');
    if (pollInterval) clearInterval(pollInterval);
  }

  function toggle() { isOpen ? close() : open(); }

  fab.addEventListener('click', toggle);
  closeBtn && closeBtn.addEventListener('click', close);
  perkSupport && perkSupport.addEventListener('click', open);
  perkSupport && perkSupport.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
  });

  function scrollToBottom() {
    if (messages) messages.scrollTop = messages.scrollHeight;
  }

  function renderMessage(text, type) {
    const div = document.createElement('div');
    div.className = `support-msg support-msg--${type}`;
    text.split('\n').forEach(line => {
      const p = document.createElement('p');
      p.textContent = line;
      div.appendChild(p);
    });
    messages.appendChild(div);
    scrollToBottom();
  }

  async function initSession() {
    if (sessionId) { pollForReplies(); return; }
    try {
      sessionId = await getOrCreateSession();
      const msgs = await loadMessages(sessionId);
      // Очищаем placeholder и рендерим историю
      if (msgs && msgs.length > 0) {
        messages.innerHTML = '';
        msgs.forEach(m => {
          renderMessage(m.text, m.sender === 'client' ? 'out' : 'in');
          lastMessageTime = m.created_at;
        });
      }
      pollForReplies();
    } catch(e) { console.error('Chat init error', e); }
  }

  function pollForReplies() {
    if (pollInterval) clearInterval(pollInterval);
    pollInterval = setInterval(async () => {
      if (!sessionId || !isOpen) return;
      try {
        let url = `${SB_URL}/rest/v1/chat_messages?session_id=eq.${sessionId}&sender=eq.admin&order=created_at.asc`;
        if (lastMessageTime) url += `&created_at=gt.${encodeURIComponent(lastMessageTime)}`;
        const r = await fetch(url, { headers });
        const newMsgs = await r.json();
        if (newMsgs && newMsgs.length > 0) {
          newMsgs.forEach(m => {
            renderMessage(m.text, 'in');
            lastMessageTime = m.created_at;
          });
          if (!isOpen) badge.classList.remove('hidden');
        }
      } catch(e) {}
    }, 3000);
  }

  async function sendMessage() {
    const text = input.value.trim();
    if (!text) return;
    renderMessage(text, 'out');
    input.value = '';
    sendBtn.animate([{ transform: 'scale(1)' },{ transform: 'scale(0.85)' },{ transform: 'scale(1)' }], { duration: 200, easing: 'ease-out' });
    try {
      if (!sessionId) sessionId = await getOrCreateSession();
      await saveMessage(sessionId, 'client', text);
    } catch(e) { console.error('Send error', e); }
  }

  sendBtn && sendBtn.addEventListener('click', sendMessage);
  input && input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && isOpen) close();
  });
})();

/* ═══════════════════════════════════════════════════
   11. LOOKBOOK — бесконечная лента (JS-анимация)
   Плавный бесконечный цикл без телепортации.
   Drag мышью и тач — тянешь ленту вручную.
═══════════════════════════════════════════════════ */
(function initLookbook() {
  const strip = document.getElementById('lookbook-strip');
  const track = document.getElementById('lookbook-track');
  if (!strip || !track) return;

  // Отключаем CSS-анимацию, берём управление на JS
  track.style.animation = 'none';

  let pos = 0;          // текущая позиция px
  let speed = 0.6;      // px за кадр
  let raf = null;
  let isDragging = false;
  let dragStartX = 0;
  let dragStartPos = 0;

  // Ширина одного «сета» карточек (половина track, т.к. дубли)
  function getHalfWidth() {
    return track.scrollWidth / 2;
  }

  function tick() {
    if (!isDragging) {
      pos -= speed;
      // Когда прошли ровно половину — сбрасываем без рывка
      const half = getHalfWidth();
      if (pos <= -half) pos += half;
    }
    track.style.transform = `translateX(${pos}px)`;
    raf = requestAnimationFrame(tick);
  }

  raf = requestAnimationFrame(tick);

  // Пауза при hover
  strip.addEventListener('mouseenter', () => { speed = 0; });
  strip.addEventListener('mouseleave', () => { if (!isDragging) speed = 0.6; });

  // Drag мышью
  strip.addEventListener('mousedown', e => {
    isDragging = true;
    dragStartX = e.clientX;
    dragStartPos = pos;
    strip.style.cursor = 'grabbing';
    speed = 0;
  });

  window.addEventListener('mousemove', e => {
    if (!isDragging) return;
    const delta = e.clientX - dragStartX;
    pos = dragStartPos + delta;
    // Нормализуем чтобы не уйти далеко
    const half = getHalfWidth();
    if (pos > 0) pos -= half;
    if (pos < -half * 2) pos += half;
  });

  window.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;
    strip.style.cursor = 'grab';
    speed = 0.6;
  });

  // Тач
  strip.addEventListener('touchstart', e => {
    dragStartX = e.touches[0].clientX;
    dragStartPos = pos;
    isDragging = true;
    speed = 0;
  }, { passive: true });

  strip.addEventListener('touchmove', e => {
    const delta = e.touches[0].clientX - dragStartX;
    pos = dragStartPos + delta;
    const half = getHalfWidth();
    if (pos > 0) pos -= half;
    if (pos < -half * 2) pos += half;
  }, { passive: true });

  strip.addEventListener('touchend', () => {
    isDragging = false;
    speed = 0.6;
  });
})();


/* ═══════════════════════════════════════════════════
   12. ПОИСК — панель сверху
═══════════════════════════════════════════════════ */
(function initSearch() {
  const overlay   = document.getElementById('search-overlay');
  const toggleBtn = document.getElementById('search-toggle');
  const closeBtn  = document.getElementById('search-close');
  const input     = document.getElementById('search-input');
  if (!overlay || !toggleBtn) return;

  // Создаём backdrop
  const backdrop = document.createElement('div');
  backdrop.className = 'search-backdrop';
  document.body.appendChild(backdrop);

  let isOpen = false;

  function open() {
    isOpen = true;
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    backdrop.classList.add('open');
    toggleBtn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    setTimeout(() => input && input.focus(), 350);
  }

  function close() {
    isOpen = false;
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    backdrop.classList.remove('open');
    toggleBtn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  toggleBtn.addEventListener('click', () => isOpen ? close() : open());
  closeBtn  && closeBtn.addEventListener('click', close);
  backdrop.addEventListener('click', close);

  // Теги — вставляют текст в поле поиска
  overlay.querySelectorAll('.search-tag').forEach(tag => {
    tag.addEventListener('click', () => {
      if (input) {
        input.value = tag.textContent;
        input.focus();
      }
    });
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && isOpen) close();
  });
})();


/* ═══════════════════════════════════════════════════
   13. ИЗБРАННОЕ — сайдбар + счётчик
═══════════════════════════════════════════════════ */
const Wishlist = (function() {
  // DOM
  const sidebar   = document.getElementById('wishlist-sidebar');
  const backdrop  = document.getElementById('wishlist-backdrop');
  const closeBtn  = document.getElementById('wishlist-close');
  const toggleBtn = document.getElementById('wishlist-toggle');
  const countEl   = document.getElementById('wishlist-count');
  const itemsList = document.getElementById('wishlist-items');
  const emptyEl   = document.getElementById('wishlist-empty');

  // Хранилище: { id, name, price, img, cardEl }
  let items = [];

  // ── Открыть / закрыть ─────────────────────────────
  function open() {
    sidebar.classList.add('open');
    sidebar.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
  function close() {
    sidebar.classList.remove('open');
    sidebar.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  toggleBtn && toggleBtn.addEventListener('click', open);
  closeBtn  && closeBtn.addEventListener('click', close);
  backdrop  && backdrop.addEventListener('click', close);

  // ── Счётчик в хедере ──────────────────────────────
  function updateCount() {
    const n = items.length;
    if (!countEl) return;
    countEl.textContent = n > 0 ? n : '';
    countEl.classList.toggle('has-items', n > 0);
    countEl.animate([
      { transform: 'scale(1.4)' },
      { transform: 'scale(1)' },
    ], { duration: 280, easing: 'cubic-bezier(0.16,1,0.3,1)' });
  }

  // ── Рендер списка ─────────────────────────────────
  function render() {
    if (!itemsList) return;
    itemsList.innerHTML = '';
    const isEmpty = items.length === 0;
    emptyEl && (emptyEl.style.display = isEmpty ? '' : 'none');

    items.forEach(item => {
      const li = document.createElement('li');
      li.className = 'cart-item';
      li.dataset.id = item.id;
      li.innerHTML = `
        <div class="cart-item-img product-img--${item.img}"></div>
        <div class="cart-item-body">
          <p class="cart-item-name">${item.name}</p>
          <p class="cart-item-meta">${item.price ? Number(item.price).toLocaleString('ru-RU') + ' ₽' : '— ₽'}</p>
          <button class="btn btn--ghost" style="margin-top:0.5rem;padding:0.4rem 1rem;font-size:0.7rem;"
            data-move-to-cart="${item.id}">В корзину</button>
        </div>
        <div class="cart-item-right">
          <button class="cart-remove-btn" data-remove-wish="${item.id}" aria-label="Удалить из избранного">×</button>
        </div>
      `;
      itemsList.appendChild(li);
    });
  }

  // ── Добавить / убрать ─────────────────────────────
  function add(product) {
    if (items.find(i => i.id === product.id)) return;
    items.push(product);
    updateCount();
    render();
  }

  function remove(id) {
    items = items.filter(i => i.id !== id);
    // Снять активное состояние с кнопки на карточке
    const btn = document.querySelector(`.wishlist-btn[data-product-id="${id}"]`);
    if (btn) {
      btn.classList.remove('active');
      btn.querySelector('svg') && (btn.querySelector('svg').style.fill = '');
    }
    updateCount();
    render();
  }

  // Делегирование кликов внутри списка избранного
  itemsList && itemsList.addEventListener('click', e => {
    const removeBtn = e.target.closest('[data-remove-wish]');
    const cartBtn   = e.target.closest('[data-move-to-cart]');

    if (removeBtn) {
      remove(removeBtn.dataset.removeWish);
      Toast.show('Удалено из избранного');
    }
    if (cartBtn) {
      const item = items.find(i => i.id === cartBtn.dataset.moveToCart);
      if (item) {
        Cart.add({ ...item, size: 'M' });
        Toast.show('Добавлено в корзину', 'success');
      }
    }
  });

  // ── Слушаем клики по сердечкам на карточках ───────
  document.addEventListener('click', e => {
    const btn = e.target.closest('.wishlist-btn');
    if (!btn) return;

    const card    = btn.closest('.product-card');
    if (!card) return;

    const addBtn  = card.querySelector('.quick-add-btn');
    const id      = addBtn?.dataset.id;
    const name    = addBtn?.dataset.name || 'Товар';
    const price   = addBtn?.dataset.price;
    const img     = addBtn?.dataset.img || '1';
    const isActive = btn.classList.contains('active');

    // Простановить data-product-id для поиска при удалении
    btn.dataset.productId = id;

    if (isActive) {
      add({ id, name, price, img });
      Toast.show('♡ Добавлено в избранное', 'success');
    } else {
      remove(id);
      Toast.show('Удалено из избранного');
    }
  });

  return { open, close, add, remove };
})();


/* ═══════════════════════════════════════════════════
   14. COOKIE БАННЕР
   Показываем если пользователь ещё не принял.
   Храним согласие в localStorage под ключом
   'aura_cookie_consent' = 'accepted' | 'minimal'
═══════════════════════════════════════════════════ */
(function initCookieBanner() {
  const banner     = document.getElementById('cookie-banner');
  const acceptBtn  = document.getElementById('cookie-accept');
  const declineBtn = document.getElementById('cookie-decline');
  if (!banner) return;

  const STORAGE_KEY = 'aura_cookie_consent';

  function getConsent() {
    try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
  }

  function saveConsent(value) {
    try { localStorage.setItem(STORAGE_KEY, value); } catch {}
  }

  function hideBanner() {
    banner.classList.remove('show');
    banner.classList.add('hide');
    banner.addEventListener('transitionend', () => {
      banner.setAttribute('aria-hidden', 'true');
      banner.style.display = 'none';
    }, { once: true });
  }

  /**
   * Подключение Яндекс.Метрики — только после согласия пользователя.
   * Когда получишь счётчик — замени XXXXXXXX на свой номер.
   */
  function loadMetrika() {
    if (typeof window._metrikaLoaded !== 'undefined') return;
    window._metrikaLoaded = true;
    // (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
    // m[i].l=1*new Date();
    // for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}
    // k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
    // (window,document,'script','https://mc.yandex.ru/metrika/tag.js','ym');
    // ym(XXXXXXXX,'init',{clickmap:true,trackLinks:true,accurateTrackBounce:true,webvisor:true});
    console.info('[Aura Pink] Метрика подключится после вставки счётчика');
  }

  // Показываем СРАЗУ при загрузке — до любой аналитики (требование 152-ФЗ)
  if (!getConsent()) {
    banner.setAttribute('aria-hidden', 'false');
    // requestAnimationFrame нужен чтобы CSS transition успел сработать
    requestAnimationFrame(() => {
      requestAnimationFrame(() => banner.classList.add('show'));
    });
  } else if (getConsent() === 'accepted') {
    // Пользователь уже принял ранее — грузим метрику сразу
    loadMetrika();
  }

  acceptBtn && acceptBtn.addEventListener('click', () => {
    saveConsent('accepted');
    hideBanner();
    loadMetrika(); // загружаем аналитику только после явного согласия
  });

  declineBtn && declineBtn.addEventListener('click', () => {
    saveConsent('minimal');
    hideBanner();
    // аналитику НЕ грузим
  });
})();
