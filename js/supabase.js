// ── Supabase Config ──────────────────────────────────────
const SUPABASE_URL = 'https://acylsytogrgyesrcbthx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_sTp-NwKK2dqaMjjMDcqDsA_HSl45kVD';

// ── Загрузка товаров ─────────────────────────────────────
async function loadProducts() {
  const grid = document.getElementById('products-grid');
  const loading = document.getElementById('products-loading');

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/products?order=created_at.desc`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });

    if (!res.ok) throw new Error('Ошибка загрузки');
    const products = await res.json();

    if (loading) loading.remove();

    if (products.length === 0) {
      grid.innerHTML = `
        <div class="products-empty">
          <p>Товары скоро появятся</p>
        </div>`;
      return;
    }

    products.forEach((p, i) => {
      const card = createProductCard(p, i);
      grid.appendChild(card);
    });

    // Обновляем счётчик
    const counter = document.querySelector('.btn--outline');
    if (counter) counter.textContent = `Смотреть все ${products.length} позиции`;

    // Запускаем анимации reveal если есть в script.js
    if (typeof initReveal === 'function') initReveal();

  } catch (err) {
    console.error(err);
    if (loading) loading.innerHTML = '<p style="color:#8A7869;padding:2rem">Не удалось загрузить товары</p>';
  }
}

function createProductCard(p, index) {
  const article = document.createElement('article');
  article.className = 'product-card reveal';
  article.dataset.category = p.category || 'all';
  article.dataset.delay = index % 4;

  const price = Number(p.price).toLocaleString('ru-RU');
  const oldPrice = p.old_price
    ? `<span class="product-old-price">${Number(p.old_price).toLocaleString('ru-RU')} ₽</span>`
    : '';

  const badge = p.old_price
    ? `<div class="product-badge product-badge--sale">−${Math.round((1 - p.price / p.old_price) * 100)}%</div>`
    : (!p.in_stock ? `<div class="product-badge product-badge--out">Нет в наличии</div>` : '');

  const imgStyle = p.image_url
    ? `background-image:url('${p.image_url}');background-size:cover;background-position:center;`
    : '';

  article.innerHTML = `
    <div class="product-img-wrap">
      <div class="product-img" style="${imgStyle}"></div>
      <div class="product-actions">
        <button class="wishlist-btn" aria-label="В избранное">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4">
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
          </svg>
        </button>
        <button class="quick-add-btn"
          data-id="${p.id}"
          data-name="${p.name}"
          data-price="${p.price}"
          ${p.in_stock ? '' : 'disabled'}>
          ${p.in_stock ? 'Быстрый заказ' : 'Нет в наличии'}
        </button>
      </div>
      ${badge}
    </div>
    <div class="product-info">
      <p class="product-brand">Aura Pink</p>
      <h3 class="product-name">${p.name}</h3>
      <p class="product-material">${p.description || ''}</p>
      <div class="product-footer">
        <span class="product-price">${price} ₽ ${oldPrice}</span>
      </div>
    </div>`;

  return article;
}

// Запуск
document.addEventListener('DOMContentLoaded', loadProducts);

// ── Счётчики по категориям + клик на карточки ────────────
async function loadCategoryCounts() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/products?select=category`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    const data = await res.json();

    const counts = { dress: 0, suit: 0, blouse: 0, skirt: 0 };
    data.forEach(p => { if (counts[p.category] !== undefined) counts[p.category]++; });

    const labels = { dress: 'Платья', suit: 'Костюмы', blouse: 'Блузы', skirt: 'Юбки' };

    Object.entries(counts).forEach(([cat, count]) => {
      const el = document.getElementById(`count-${cat}`);
      if (el) el.textContent = count > 0 ? `${count} ${plural(count, 'модель', 'модели', 'моделей')} →` : 'Скоро →';
    });

    // Обновляем кнопку "Смотреть все"
    const btnAll = document.getElementById('btn-show-all');
    if (btnAll) {
      const total = data.length;
      btnAll.textContent = `Смотреть все ${total} ${plural(total, 'позицию', 'позиции', 'позиций')}`;
    }

  } catch(e) {
    // При ошибке показываем заглушку
    ['dress','suit','blouse'].forEach(cat => {
      const el = document.getElementById(`count-${cat}`);
      if (el) el.textContent = 'Смотреть →';
    });
  }
}

function plural(n, one, few, many) {
  const mod10 = n % 10, mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}

// ── Клик на категорию → фильтр + скролл ─────────────────
function initCategoryClicks() {
  document.querySelectorAll('[data-category-filter]').forEach(card => {
    const handler = () => {
      const filter = card.dataset.categoryFilter;

      // Скроллим к каталогу
      const section = document.getElementById('collection');
      if (section) section.scrollIntoView({ behavior: 'smooth' });

      // Активируем фильтр через небольшую задержку (ждём скролл)
      setTimeout(() => {
        const btn = document.querySelector(`.filter-btn[data-filter="${filter}"]`);
        if (btn) btn.click();
      }, 600);
    };

    card.addEventListener('click', handler);
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') handler(); });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  loadCategoryCounts();
  initCategoryClicks();
});

// ── Загрузка изображений сайта ───────────────────────────
async function loadSiteImages() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/site_images?select=id,image_url`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    const rows = await res.json();

    rows.forEach(row => {
      if (!row.image_url) return;
      const url = row.image_url;

      // Категории
      if (row.id === 'category-dress') {
        document.querySelectorAll('.category-img--1').forEach(el => {
          el.style.backgroundImage = `url('${url}')`;
          el.style.backgroundSize = 'cover';
          el.style.backgroundPosition = 'center';
        });
      }
      if (row.id === 'category-suit') {
        document.querySelectorAll('.category-img--2').forEach(el => {
          el.style.backgroundImage = `url('${url}')`;
          el.style.backgroundSize = 'cover';
          el.style.backgroundPosition = 'center';
        });
      }
      if (row.id === 'category-blouse') {
        document.querySelectorAll('.category-img--3').forEach(el => {
          el.style.backgroundImage = `url('${url}')`;
          el.style.backgroundSize = 'cover';
          el.style.backgroundPosition = 'center';
        });
      }

      // О марке
      if (row.id === 'about-main') {
        document.querySelectorAll('.about-img').forEach(el => {
          el.style.backgroundImage = `url('${url}')`;
          el.style.backgroundSize = 'cover';
          el.style.backgroundPosition = 'center';
        });
      }

      // Lookbook
      const lookMatch = row.id.match(/^look-(\d+)$/);
      if (lookMatch) {
        const n = lookMatch[1];
        document.querySelectorAll(`.look--${n}`).forEach(el => {
          el.style.backgroundImage = `url('${url}')`;
          el.style.backgroundSize = 'cover';
          el.style.backgroundPosition = 'center';
        });
      }
    });

  } catch(e) {
    console.warn('Не удалось загрузить изображения сайта', e);
  }
}

document.addEventListener('DOMContentLoaded', loadSiteImages);
