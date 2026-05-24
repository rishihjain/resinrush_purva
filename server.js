const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs/promises');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;
const rootDir = path.join(__dirname);
const reactDistDir = path.join(__dirname, 'frontend', 'dist');
const dataDir = path.join(__dirname, 'data');
const ordersPath = path.join(dataDir, 'orders.json');
const contactsPath = path.join(dataDir, 'contacts.json');
const productsPath = path.join(dataDir, 'products.json');
const uploadsDir = path.join(__dirname, 'uploads');
const whatsappNumber = '918975741553';
const instagramProfile = 'https://www.instagram.com/resin_.rush?igsh=Z2l1bWsyeTV2azZ3';

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, name);
  }
});

const upload = multer({ storage });

app.use(cors());
app.use(express.json());

// Serve static files from React build if available, else fallback to root
const fsSync = require('fs');
if (fsSync.existsSync(reactDistDir)) {
  app.use(express.static(reactDistDir));
} else {
  app.use(express.static(rootDir));
}

async function ensureDataFiles() {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.mkdir(uploadsDir, { recursive: true });
  for (const file of [ordersPath, contactsPath]) {
    try {
      await fs.access(file);
    } catch (error) {
      await fs.writeFile(file, '[]', 'utf8');
    }
  }
  try {
    await fs.access(productsPath);
  } catch (error) {
    await fs.writeFile(productsPath, '[]', 'utf8');
  }
}

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw || '[]');
}

function parseDetails(details) {
  if (!details) return {};
  if (typeof details === 'object') return details;
  const parsed = {};
  details.split('\n').forEach(line => {
    const [key, ...rest] = line.split(':');
    if (!key) return;
    parsed[key.trim()] = rest.join(':').trim();
  });
  return parsed;
}

async function writeJson(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function buildWhatsAppMessage(order) {
  const base = `Hi ResinRush! I am ${order.name}. I would like a custom ${order.type}.`;
  const details = order.notes ? ` Details: ${order.notes}` : '';
  return base + details;
}

app.post('/api/orders', async (req, res) => {
  const { name, phone, type, notes, channel } = req.body || {};

  if (!name || !phone || !type || !notes) {
    return res.status(400).json({ error: 'Name, phone, category and details are required.' });
  }

  const order = {
    id: Date.now(),
    name: name.trim(),
    phone: phone.trim(),
    type: type.trim(),
    notes: notes.trim(),
    channel: channel || 'whatsapp',
    createdAt: new Date().toISOString()
  };

  try {
    const orders = await readJson(ordersPath);
    orders.push(order);
    await writeJson(ordersPath, orders);

    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(buildWhatsAppMessage(order))}`;
    const instagramUrl = instagramProfile;

    return res.json({ order, whatsappUrl, instagramUrl });
  } catch (error) {
    console.error('Order save failed:', error);
    return res.status(500).json({ error: 'Unable to save order inquiry.' });
  }
});

app.post('/api/contact', async (req, res) => {
  const { name, email, message } = req.body || {};

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email and message are required.' });
  }

  const contact = {
    id: Date.now(),
    name: name.trim(),
    email: email.trim(),
    message: message.trim(),
    createdAt: new Date().toISOString()
  };

  try {
    const contacts = await readJson(contactsPath);
    contacts.push(contact);
    await writeJson(contactsPath, contacts);
    return res.json({ contact, message: 'Contact request saved.' });
  } catch (error) {
    console.error('Contact save failed:', error);
    return res.status(500).json({ error: 'Unable to save contact message.' });
  }
});

app.get('/api/products', async (req, res) => {
  try {
    const products = await readJson(productsPath);
    return res.json({ products });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to read products.' });
  }
});

app.get('/api/products/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const products = await readJson(productsPath);
    const product = products.find(item => item.id === id);
    if (!product) return res.status(404).json({ error: 'Product not found.' });
    return res.json({ product });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to read product.' });
  }
});

app.post('/api/products', upload.any(), async (req, res) => {
  const { name, category, desc, details } = req.body || {};
  const imageFiles = (req.files || []).filter(f => f.fieldname === 'images');
  if (!name || !category || !imageFiles.length) {
    return res.status(400).json({ error: 'Name, category and at least one image are required.' });
  }

  const images = imageFiles.map(f => `/uploads/${f.filename}`);

  const product = {
    id: Date.now(),
    name: name.trim(),
    category: category.trim(),
    desc: (desc || '').trim(),
    details: parseDetails(details),
    images,
    createdAt: new Date().toISOString()
  };

  try {
    const products = await readJson(productsPath);
    products.push(product);
    await writeJson(productsPath, products);
    return res.json({ product });
  } catch (error) {
    console.error('Product save failed:', error);
    return res.status(500).json({ error: 'Unable to save product.' });
  }
});

app.put('/api/products/:id', upload.any(), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { name, category, desc, details } = req.body || {};
  const imageFiles = (req.files || []).filter(f => f.fieldname === 'images');
  try {
    const products = await readJson(productsPath);
    const index = products.findIndex(item => item.id === id);
    if (index === -1) return res.status(404).json({ error: 'Product not found.' });

    const product = products[index];
    if (name) product.name = name.trim();
    if (category) product.category = category.trim();
    if (typeof desc !== 'undefined') product.desc = desc.trim();
    if (typeof details !== 'undefined') product.details = parseDetails(details);
    if (imageFiles.length) {
      // Optionally remove old images from disk
      try {
        if (product.images && product.images.length) {
          for (const img of product.images) {
            const p = path.join(__dirname, img.replace(/^\//, ''));
            try { await fs.unlink(p); } catch (_) {}
          }
        }
      } catch (_) {}
      product.images = imageFiles.map(f => `/uploads/${f.filename}`);
    }
    products[index] = product;
    await writeJson(productsPath, products);
    return res.json({ product });
  } catch (error) {
    console.error('Product update failed:', error);
    return res.status(500).json({ error: 'Unable to update product.' });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const products = await readJson(productsPath);
    const index = products.findIndex(item => item.id === id);
    if (index === -1) return res.status(404).json({ error: 'Product not found.' });
    const [removed] = products.splice(index, 1);
    if (removed.images && removed.images.length) {
      const imagePath = path.join(__dirname, removed.images[0].replace(/^\//, ''));
      try { await fs.unlink(imagePath); } catch (_) {}
    }
    await writeJson(productsPath, products);
    return res.json({ success: true });
  } catch (error) {
    console.error('Product delete failed:', error);
    return res.status(500).json({ error: 'Unable to delete product.' });
  }
});

app.use('/uploads', express.static(uploadsDir));

app.get('/api/orders', async (req, res) => {
  try {
    const orders = await readJson(ordersPath);
    return res.json({ orders });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to read orders.' });
  }
});

app.get('/api/contacts', async (req, res) => {
  try {
    const contacts = await readJson(contactsPath);
    return res.json({ contacts });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to read contacts.' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(rootDir, 'index.html'));
});

// Generic error handler that returns JSON for API routes
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err && err.stack ? err.stack : err);
  if (req.path && req.path.startsWith('/api/')) {
    const status = err && err.status ? err.status : 500;
    return res.status(status).json({ error: err.message || 'Server error' });
  }
  next(err);
});

ensureDataFiles()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`ResinRush backend running on http://localhost:${PORT}`);
    });
  })
  .catch(error => {
    console.error('Failed to initialize data files:', error);
    process.exit(1);
  });
