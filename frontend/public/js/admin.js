var productForm = document.getElementById('product-form');
var productsTableBody = document.querySelector('#products-table tbody');
var productMessage = document.getElementById('product-message');
var refreshProductsBtn = document.getElementById('refresh-products-btn');
var cancelEditBtn = document.getElementById('cancel-edit-btn');

var editProductId = null;
var currentImageFile = null;
var selectedFiles = [];

function resetForm() {
  editProductId = null;
  currentImageFile = null;
  selectedFiles = [];
  productForm.reset();
  if (imageInput) imageInput.value = '';
  productMessage.textContent = '';
  clearImagePreview();
}

function clearImagePreview() {
  const previewPanel = document.getElementById('image-preview-panel');
  const previewContainer = document.getElementById('image-preview-container');
  const previewInfo = document.getElementById('image-preview-info');
  if (previewContainer) previewContainer.innerHTML = '';
  if (previewInfo) previewInfo.textContent = '';
  if (previewPanel) previewPanel.style.display = 'none';
}

function parseDetails(text) {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const [key, ...rest] = line.split(':');
      return { key: key.trim(), value: rest.join(':').trim() };
    })
    .filter(item => item.key && item.value);
}

function formatCategory(category) {
  if (!category) return 'Unknown';
  if (category === 'wall-art') return 'Frames';
  return category.charAt(0).toUpperCase() + category.slice(1);
}

async function loadProducts() {
  try {
    const response = await fetch('/api/products');
    if (!response.ok) throw new Error('Unable to fetch products');
    const data = await response.json();
    renderProducts(data.products || []);
  } catch (error) {
    console.error(error);
    productsTableBody.innerHTML = '<tr><td colspan="5">Unable to load products.</td></tr>';
  }
}

function renderProducts(products) {
  if (!products.length) {
    productsTableBody.innerHTML = '<tr><td colspan="5">No products available.</td></tr>';
    return;
  }

  productsTableBody.innerHTML = products.map(product => {
    const imageUrl = product.images?.[0] || 'assets/images/default.jpg';
    return `
      <tr>
        <td><img src="${imageUrl}" alt="${product.name}" /></td>
        <td>${product.name}</td>
        <td>${formatCategory(product.category)}</td>
        <td>${product.desc || '—'}</td>
        <td>
          <button class="btn btn-outline btn-small" data-action="edit" data-id="${product.id}">Edit</button>
          <button class="btn btn-danger btn-small" data-action="delete" data-id="${product.id}">Delete</button>
        </td>
      </tr>
    `;
  }).join('');
}

function showMessage(message, isError = false) {
  productMessage.textContent = message;
  productMessage.style.color = isError ? '#ff6b6b' : '#7dd3fc';
}

async function uploadImagesToCloudinary(files) {
  const preset = 'resin_rush_purva'; // Using hardcoded preset since process.env is not available in static script
  const cloudName = 'dcumgslye';
  const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
  const uploadedUrls = [];

  for (const file of files) {
    // If it's already a URL string (from edit), keep it
    if (typeof file === 'string') {
      uploadedUrls.push(file);
      continue;
    }
    const form = new FormData();
    form.append('file', file);
    form.append('upload_preset', preset);
    try {
      const res = await fetch(url, { method: 'POST', body: form });
      if (!res.ok) throw new Error('Cloudinary upload failed');
      const data = await res.json();
      uploadedUrls.push(data.secure_url || data.url);
    } catch (err) {
      console.error(err);
      throw new Error('Failed to upload image to Cloudinary');
    }
  }
  return uploadedUrls;
}

productForm.addEventListener('submit', async event => {
  event.preventDefault();
  const name = productForm.name.value?.trim();
  const category = productForm.category.value;
  const desc = productForm.desc.value?.trim();
  const details = productForm.details.value || '';

  const currentFileInput = document.getElementById('product-images');
  if (!selectedFiles.length && currentFileInput && currentFileInput.files && currentFileInput.files.length) {
    selectedFiles = Array.from(currentFileInput.files);
  }

  if (!name || !category) {
    showMessage('Please add a valid name and category.', true);
    return;
  }
  
  if (!selectedFiles || !selectedFiles.length) {
    showMessage('Please select at least one image before saving.', true);
    return;
  }

  showMessage('Uploading images and saving product...');
  const submitBtn = document.getElementById('save-product-btn');
  if (submitBtn) submitBtn.disabled = true;

  try {
    let images = await uploadImagesToCloudinary(selectedFiles);

    const payload = {
      name,
      category,
      desc,
      details,
      images
    };

    if (editProductId) {
      await updateProduct(payload);
    } else {
      await createProduct(payload);
    }
  } catch (err) {
    showMessage(err.message, true);
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
});

const categorySelect = document.getElementById('product-category');
var defaultDescriptions = {
  'clocks': 'Handcrafted resin clocks. Unique designs with reliable mechanisms.',
  'coasters': 'Hand-poured coaster set. Size: 10cm diameter. Finish: High gloss.',
  'trays': 'Decorative tray, multiple sizes available. Perfect for serving or display.',
  'wall-art': 'Framed resin wall piece, ready to hang. Size varies by design.',
  'keychains': 'Lightweight resin keychains. Durable finish and customisable.',
  'custom': 'Custom piece — provide details about size, colours and style you want.'
};

var lastAutoFilled = null;
if (categorySelect) {
  categorySelect.addEventListener('change', (e) => {
    const val = e.target.value;
    const currentDesc = productForm.desc.value ? productForm.desc.value.trim() : '';
    const isAnyDefault = Object.values(defaultDescriptions).some(d => d === currentDesc);
    if (val && defaultDescriptions[val] && (currentDesc === '' || currentDesc.length < 10 || isAnyDefault)) {
      productForm.desc.value = defaultDescriptions[val];
      lastAutoFilled = val;
    }
  });
}

var imageInput = document.getElementById('product-images');
var imagePreviewContainer = document.getElementById('image-preview-container');
var imagePreviewPanel = document.getElementById('image-preview-panel');
var imagePreviewInfo = document.getElementById('image-preview-info');

if (imageInput) {
  imageInput.addEventListener('change', () => {
    selectedFiles = Array.from(imageInput.files || []);
    renderImagePreview();
  });
}

function renderImagePreview() {
  if (!imagePreviewContainer || !imagePreviewInfo || !imagePreviewPanel) return;

  if (!selectedFiles.length) {
    clearImagePreview();
    return;
  }

  imagePreviewPanel.style.display = 'block';
  imagePreviewInfo.textContent = `${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''} selected`;
  imagePreviewContainer.innerHTML = selectedFiles.map((file, index) => {
    return `
      <div class="image-preview-item" data-index="${index}">
        <img src="" alt="Selected image ${index + 1}" id="preview-${index}" />
        <div class="image-preview-meta">
          <span>#${index + 1}</span>
          <div class="image-preview-actions">
            <button type="button" data-action="move-left" data-index="${index}">←</button>
            <button type="button" data-action="move-right" data-index="${index}">→</button>
            <button type="button" data-action="remove" data-index="${index}">×</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  selectedFiles.forEach((file, index) => {
    const imgEl = document.getElementById(`preview-${index}`);
    if (!imgEl) return;
    if (typeof file === 'string') {
      imgEl.src = file; // URL
    } else {
      const reader = new FileReader();
      reader.onload = () => { imgEl.src = reader.result; };
      reader.readAsDataURL(file);
    }
  });
}

function movePreviewItem(index, direction) {
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= selectedFiles.length) return;
  [selectedFiles[index], selectedFiles[nextIndex]] = [selectedFiles[nextIndex], selectedFiles[index]];
  renderImagePreview();
}

function removePreviewItem(index) {
  selectedFiles.splice(index, 1);
  renderImagePreview();
}

if (imagePreviewContainer) {
  imagePreviewContainer.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    const action = button.dataset.action;
    const index = Number(button.dataset.index);
    if (Number.isNaN(index)) return;
    if (action === 'move-left') movePreviewItem(index, -1);
    if (action === 'move-right') movePreviewItem(index, 1);
    if (action === 'remove') removePreviewItem(index);
  });
}

cancelEditBtn.addEventListener('click', () => {
  resetForm();
});

refreshProductsBtn.addEventListener('click', () => loadProducts());

productsTableBody.addEventListener('click', async event => {
  const button = event.target.closest('button');
  if (!button) return;
  const action = button.dataset.action;
  const productId = button.dataset.id;
  if (action === 'edit') {
    await startEditProduct(productId);
  } else if (action === 'delete') {
    await deleteProduct(productId);
  }
});

async function createProduct(payload) {
  try {
    const response = await fetch('/api/products', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload) 
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || result.error || 'Create failed');
    showMessage('Product created successfully');
    resetForm();
    loadProducts();
  } catch (error) {
    console.error(error);
    showMessage(error.message || 'Could not create product', true);
  }
}

async function startEditProduct(productId) {
  try {
    const response = await fetch(`/api/products/${productId}`);
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Product not found');
    const product = result.product;
    editProductId = product.id;
    productForm.name.value = product.name || '';
    productForm.category.value = product.category || '';
    productForm.desc.value = product.desc || '';
    
    // Details handling for old object vs array format
    if (Array.isArray(product.details)) {
      productForm.details.value = product.details.map(item => `${item.key}: ${item.value}`).join('\n');
    } else if (product.details && typeof product.details === 'object') {
      productForm.details.value = Object.entries(product.details).map(([k,v]) => `${k}: ${v}`).join('\n');
    } else {
      productForm.details.value = '';
    }

    selectedFiles = product.images || [];
    renderImagePreview();

    showMessage('Editing product. Upload a new image to add or remove existing ones.');
  } catch (error) {
    console.error(error);
    showMessage(error.message || 'Unable to load product for edit', true);
  }
}

async function updateProduct(payload) {
  try {
    const response = await fetch(`/api/products/${editProductId}`, { 
      method: 'PUT', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload) 
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || result.error || 'Update failed');
    showMessage('Product updated successfully');
    resetForm();
    loadProducts();
  } catch (error) {
    console.error(error);
    showMessage(error.message || 'Could not update product', true);
  }
}

async function deleteProduct(productId) {
  if (!confirm('Delete this product?')) return;
  try {
    const response = await fetch(`/api/products/${productId}`, { method: 'DELETE' });
    const contentType = response.headers.get('content-type') || '';
    let result;
    if (contentType.includes('application/json')) {
      result = await response.json();
    } else {
      const txt = await response.text();
      try { result = JSON.parse(txt); } catch (e) { result = { message: txt }; }
    }
    if (!response.ok) throw new Error(result.message || result.error || 'Delete failed');
    showMessage('Product deleted successfully');
    loadProducts();
  } catch (error) {
    console.error(error);
    showMessage(error.message || 'Could not delete product', true);
  }
}

loadProducts();
