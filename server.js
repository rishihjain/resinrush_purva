require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs/promises');
const fsSync = require('fs');
const { MongoClient } = require('mongodb');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;
const rootDir = path.join(__dirname);
const reactDistDir = path.join(__dirname, 'frontend', 'dist');

// Data paths for local fallback
const dataDir = path.join(__dirname, 'data');
const ordersPath = path.join(dataDir, 'orders.json');
const contactsPath = path.join(dataDir, 'contacts.json');
const productsPath = path.join(dataDir, 'products.json');
const uploadsDir = path.join(__dirname, 'uploads');
const upload = multer({ storage: multer.memoryStorage() });
const whatsappNumber = '918975741553';
const instagramProfile = 'https://www.instagram.com/resin_.rush?igsh=Z2l1bWsyeTV2azZ3';

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Static files
if (fsSync.existsSync(reactDistDir)) {
  app.use(express.static(reactDistDir));
} else {
  app.use(express.static(rootDir));
}
app.use('/uploads', express.static(uploadsDir));

// --- Database Logic ---
let cachedDb = null;

async function getDb() {
  if (cachedDb) return cachedDb;
  if (!process.env.MONGODB_URI) return null;
  try {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    cachedDb = client.db('resinrush');
    console.log('Connected to MongoDB');
    return cachedDb;
  } catch (e) {
    console.error('MongoDB connection failed:', e.message);
    return null;
  }
}

async function readData(collectionName) {
  const db = await getDb();
  if (db) {
    return await db.collection(collectionName).find({}).toArray();
  }
  // Local fallback
  const file = collectionName === 'products' ? productsPath : collectionName === 'orders' ? ordersPath : contactsPath;
  try {
    const raw = await fs.readFile(file, 'utf8');
    return JSON.parse(raw || '[]');
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw new Error('Database not configured. Please add MONGODB_URI in Vercel.');
  }
}

async function writeData(collectionName, data) {
  const db = await getDb();
  if (db) {
    await db.collection(collectionName).deleteMany({});
    if (data.length > 0) {
      await db.collection(collectionName).insertMany(data);
    }
    return;
  }
  // Local fallback
  const file = collectionName === 'products' ? productsPath : collectionName === 'orders' ? ordersPath : contactsPath;
  try {
    await fs.mkdir(dataDir, { recursive: true }).catch(() => {});
    await fs.writeFile(file, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    throw new Error('Database not configured. Please add MONGODB_URI in Vercel.');
  }
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

// --- Routes ---

app.post('/api/orders', async (req, res) => {
  const { name, phone, type, notes, channel } = req.body || {};
  if (!name || !phone || !type || !notes) return res.status(400).json({ error: 'Missing fields' });

  const order = { id: Date.now(), name: name.trim(), phone: phone.trim(), type: type.trim(), notes: notes.trim(), channel: channel || 'whatsapp', createdAt: new Date().toISOString() };

  try {
    const orders = await readData('orders');
    orders.push(order);
    await writeData('orders', orders);

    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Hi ResinRush! I am ${order.name}. I would like a custom ${order.type}. Details: ${order.notes}`)}`;
    return res.json({ order, whatsappUrl, instagramUrl: instagramProfile });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to save order' });
  }
});

app.post('/api/contact', async (req, res) => {
  const { name, email, message } = req.body || {};
  if (!name || !email || !message) return res.status(400).json({ error: 'Missing fields' });

  const contact = { id: Date.now(), name: name.trim(), email: email.trim(), message: message.trim(), createdAt: new Date().toISOString() };
  try {
    const contacts = await readData('contacts');
    contacts.push(contact);
    await writeData('contacts', contacts);
    return res.json({ contact, message: 'Saved' });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to save' });
  }
});

app.get('/api/products', async (req, res) => {
  try {
    const products = await readData('products');
    return res.json({ products });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to read products' });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const products = await readData('products');
    const product = products.find(p => p.id === parseInt(req.params.id, 10));
    if (!product) return res.status(404).json({ error: 'Not found' });
    return res.json({ product });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Error' });
  }
});

// app.post('/api/products', async (req, res) => {
//   const { name, category, desc, details, images } = req.body || {};
//   if (!name || !category || !images || !images.length) {
//     return res.status(400).json({ error: 'Name, category and images are required.' });
//   }

//   const product = {
//     id: Date.now(),
//     name: name.trim(),
//     category: category.trim(),
//     desc: (desc || '').trim(),
//     details: parseDetails(details),
//     images: images,
//     createdAt: new Date().toISOString()
//   };

//   try {
//     const products = await readData('products');
//     products.push(product);
//     await writeData('products', products);
//     return res.json({ product });
//   } catch (error) {
//     return res.status(500).json({ error: error.message || 'Save failed' });
//   }
// });

app.post('/api/products', upload.array('images', 10), async (req, res) => {
  const { name, category, desc, details } = req.body || {};
  const images = (req.files || []).map((file, i) => {
    const base64 = file.buffer.toString('base64');
    return `data:${file.mimetype};base64,${base64}`;
  });

  if (!name || !category || !images.length) {
    return res.status(400).json({ error: 'Name, category and images are required.' });
  }

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
    const products = await readData('products');
    products.push(product);
    await writeData('products', products);
    return res.json({ product });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Save failed' });
  }
});

// app.put('/api/products/:id', async (req, res) => {
//   const id = parseInt(req.params.id, 10);
//   const { name, category, desc, details, images } = req.body || {};
  
//   try {
//     const products = await readData('products');
//     const index = products.findIndex(item => item.id === id);
//     if (index === -1) return res.status(404).json({ error: 'Not found' });

//     const product = products[index];
//     if (name) product.name = name.trim();
//     if (category) product.category = category.trim();
//     if (typeof desc !== 'undefined') product.desc = desc.trim();
//     if (typeof details !== 'undefined') product.details = parseDetails(details);
//     if (images && images.length) {
//       product.images = images;
//     }
//     products[index] = product;
//     await writeData('products', products);
//     return res.json({ product });
//   } catch (error) {
//     return res.status(500).json({ error: error.message || 'Update failed' });
//   }
// });

app.put('/api/products/:id', upload.array('images', 10), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { name, category, desc, details } = req.body || {};
  const images = (req.files || []).map((file) => {
    const base64 = file.buffer.toString('base64');
    return `data:${file.mimetype};base64,${base64}`;
  });

  try {
    const products = await readData('products');
    const index = products.findIndex(item => item.id === id);
    if (index === -1) return res.status(404).json({ error: 'Not found' });

    const product = products[index];
    if (name) product.name = name.trim();
    if (category) product.category = category.trim();
    if (typeof desc !== 'undefined') product.desc = desc.trim();
    if (typeof details !== 'undefined') product.details = parseDetails(details);
    if (images.length) product.images = images;

    products[index] = product;
    await writeData('products', products);
    return res.json({ product });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Update failed' });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const products = await readData('products');
    const index = products.findIndex(item => item.id === id);
    if (index === -1) return res.status(404).json({ error: 'Not found' });
    products.splice(index, 1);
    await writeData('products', products);
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Delete failed' });
  }
});

app.get('/api/orders', async (req, res) => {
  try {
    const orders = await readData('orders');
    return res.json({ orders });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Error' });
  }
});

app.get('/api/contacts', async (req, res) => {
  try {
    const contacts = await readData('contacts');
    return res.json({ contacts });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Error' });
  }
});

// Admin fallback
app.get('/admin.html', (req, res) => {
  res.sendFile(path.join(rootDir, 'admin.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(rootDir, 'index.html'));
});

app.use((err, req, res, next) => {
  console.error(err);
  if (req.path.startsWith('/api/')) return res.status(500).json({ error: 'Server error' });
  next(err);
});

// Export app for Vercel, or listen locally if not in Vercel
if (process.env.VERCEL) {
  module.exports = app;
} else {
  app.listen(PORT, () => console.log(`Running on http://localhost:${PORT}`));
}
