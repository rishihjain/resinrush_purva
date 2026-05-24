/* ============================================
   GALLERY.JS — Masonry Grid, Filters, Modal
   ============================================ */

let PRODUCTS = [];

async function loadProducts() {
  try {
    const response = await fetch('/api/products');
    if (!response.ok) throw new Error('Unable to load products');
    const data = await response.json();
    PRODUCTS = data.products || [];
    renderGallery(activeFilter);
  } catch (error) {
    console.error(error);
    PRODUCTS = [];
    renderGallery(activeFilter);
  }
}

let activeFilter = 'all';
let currentProductId = null;
let currentSlide = 0;

document.addEventListener('DOMContentLoaded', () => {
  initFilters();
  initModal();
  loadProducts();
});

/* ---- RENDER GALLERY ---- */
function renderGallery(filter) {
  const grid = document.getElementById('masonry-grid');
  if (!grid) return;

  const filtered = filter === 'all'
    ? PRODUCTS
    : PRODUCTS.filter(p => p.category === filter);

  grid.innerHTML = '';

  filtered.forEach((product, i) => {
    const item = document.createElement('div');
    item.className = 'masonry-item reveal';
    item.dataset.delay = (i % 3) * 100;
    item.setAttribute('role', 'button');
    item.setAttribute('tabindex', '0');
    item.setAttribute('aria-label', `View ${product.name}`);
    item.onclick = () => openModal(product.id);
    item.onkeydown = e => { if (e.key === 'Enter') openModal(product.id); };


    item.innerHTML = `
      <div class="product-card">
        <div class="product-card-img">
          <img src="${product.images[0]}" alt="${product.name}" loading="lazy" />
          <div class="product-card-overlay">
            <div class="product-card-overlay-content">
              <span class="product-card-tag tag-price">
                Available on request
              </span>
              <div style="color:white; font-size:0.8rem; margin-top:4px; opacity:0.85">
                ${product.images && product.images.length > 1 ? `${product.images.length} images • Tap to explore →` : 'Tap to explore →'}
              </div>
            </div>
          </div>
        </div>
          <div class="product-card-info">
            <div class="product-card-category">${formatCategory(product.category)}</div>
            <div class="product-card-name">${product.name}</div>
            <div class="product-card-price">Available on request</div>
          </div>
      </div>
    `;
    grid.appendChild(item);

    // no thumbnails here — keep simple masonry tiles
  });

  // Re-trigger scroll reveal
  setTimeout(() => {
    document.querySelectorAll('.masonry-item.reveal').forEach(el => {
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const delay = entry.target.dataset.delay || 0;
            setTimeout(() => entry.target.classList.add('revealed'), parseInt(delay));
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1 });
      observer.observe(el);
    });
  }, 50);
}

function formatCategory(cat) {
  const map = {
    'coasters': 'Coasters',
    'trays': 'Trays',
    'wall-art': 'Frames',
    'keychains': 'Keychains',
    'jewelry': 'Jewelry',
    'custom': 'Custom Piece'
  };
  return map[cat] || cat;
}

/* ---- FILTERS ---- */
function initFilters() {
  const tabs = document.querySelectorAll('.filter-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const filter = tab.dataset.filter;
      activeFilter = filter;
      renderGallery(filter);
    });
  });
}

/* ---- MODAL ---- */
function initModal() {
  const overlay = document.getElementById('product-modal');
  if (!overlay) return;

  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeModal();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });

  const closeBtn = document.getElementById('modal-close');
  if (closeBtn) closeBtn.addEventListener('click', closeModal);

  const prevBtn = document.getElementById('carousel-prev');
  const nextBtn = document.getElementById('carousel-next');
  if (prevBtn) prevBtn.addEventListener('click', () => changeSlide(-1));
  if (nextBtn) nextBtn.addEventListener('click', () => changeSlide(1));
}

function openModal(productId, slideIndex = 0) {
  const product = PRODUCTS.find(p => p.id === productId);
  if (!product) return;
  currentProductId = productId;
  currentSlide = slideIndex || 0;

  const overlay = document.getElementById('product-modal');
  const track = document.getElementById('carousel-track');
  const dots = document.getElementById('carousel-dots');
  const catEl = document.getElementById('modal-category');
  const nameEl = document.getElementById('modal-name');
  const priceEl = document.getElementById('modal-price');
  const descEl = document.getElementById('modal-desc');
  const detailsEl = document.getElementById('modal-details');
  const waBtn = document.getElementById('modal-wa-btn');
  const igBtn = document.getElementById('modal-ig-btn');

  if (!overlay) return;

  // Populate carousel
  if (track) {
    track.innerHTML = product.images.map(img => `
      <div class="carousel-slide">
        <img src="${img}" alt="${product.name}" />
      </div>
    `).join('');
    track.style.transform = `translateX(-${currentSlide * 100}%)`;
  }

  // Dots
  if (dots) {
    dots.innerHTML = product.images.map((_, i) =>
      `<div class="carousel-dot ${i === currentSlide ? 'active' : ''}" data-index="${i}" onclick="goToSlide(${i})"></div>`
    ).join('');
  }

  // Info
  if (catEl) catEl.textContent = formatCategory(product.category);
  if (nameEl) nameEl.textContent = product.name;
  if (priceEl) {
    priceEl.textContent = 'Available on request';
    priceEl.className = 'modal-price ' + (product.isCustom ? 'price-custom' : 'price-fixed');
  }
  if (descEl) descEl.textContent = product.desc;

  // Details
  if (detailsEl) {
    detailsEl.innerHTML = Object.entries(product.details).map(([k, v]) => `
      <div class="modal-detail-item">
        <span class="modal-detail-label">${k}</span>
        <span class="modal-detail-value">${v}</span>
      </div>
    `).join('');
  }

  // Make modal linkable: update URL param without reloading
  try {
    const url = new URL(window.location);
    url.searchParams.set('product', productId);
    window.history.replaceState({}, '', url.toString());
  } catch (e) {}

  // CTA buttons: include a direct product link in WhatsApp message
  const productLink = `${window.location.origin}${window.location.pathname}?product=${productId}`;
  const waMsg = encodeURIComponent(`Hi! I'm interested in "${product.name}" (${formatCategory(product.category)}). Could you share more details? Product: ${productLink}`);
  if (waBtn) waBtn.href = `https://wa.me/918975741553?text=${waMsg}`;
  if (igBtn) igBtn.href = 'https://www.instagram.com/resin_.rush?igsh=Z2l1bWsyeTV2azZ3';

  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

// expose openModal so inline thumbnail onclick works
window.openModal = openModal;

function closeModal() {
  const overlay = document.getElementById('product-modal');
  if (overlay) overlay.classList.remove('open');
  document.body.style.overflow = '';
  currentProductId = null;
  // remove product param from URL
  try {
    const url = new URL(window.location);
    url.searchParams.delete('product');
    window.history.replaceState({}, '', url.toString());
  } catch (e) {}
}

function changeSlide(dir) {
  const product = PRODUCTS.find(p => p.id === currentProductId);
  if (!product) return;
  const total = product.images.length;
  currentSlide = (currentSlide + dir + total) % total;
  updateCarousel();
}

window.goToSlide = function(index) {
  currentSlide = index;
  updateCarousel();
};

function updateCarousel() {
  const track = document.getElementById('carousel-track');
  const dots = document.querySelectorAll('.carousel-dot');
  if (track) track.style.transform = `translateX(-${currentSlide * 100}%)`;
  dots.forEach((d, i) => d.classList.toggle('active', i === currentSlide));
}
