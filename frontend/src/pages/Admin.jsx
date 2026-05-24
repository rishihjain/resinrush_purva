import React, { useEffect } from 'react';
import '../css/admin.css';

export default function Admin() {
  useEffect(() => {
    // Force light theme on admin page
    document.documentElement.setAttribute('data-theme', 'light');

    const script = document.createElement('script');
    script.src = '/js/admin.js';
    script.async = false;
    document.body.appendChild(script);
    return () => {
      if (script.parentNode) {
        document.body.removeChild(script);
      }
    };
  }, []);

  return (
    <>
      <div className="admin-panel">
        <div className="admin-header">
          <div>
            <h1>ResinRush Admin</h1>
            <p className="admin-note">Add, edit, or delete product entries used by the gallery.</p>
          </div>
          <a href="/" className="btn btn-primary">View Store</a>
        </div>

        <section className="admin-card">
          <h2>Add / Edit Product</h2>
          <form id="product-form" className="admin-form" noValidate>
            <div className="form-group">
              <label htmlFor="product-name">Product Name *</label>
              <input type="text" id="product-name" name="name" required />
            </div>
            <div className="form-group">
              <label htmlFor="product-category">Category *</label>
              <select id="product-category" name="category" defaultValue="" required>
                <option value="" disabled>Select category</option>
                <option value="coasters">Coasters</option>
                <option value="trays">Trays</option>
                <option value="wall-art">Frames</option>
                <option value="keychains">Keychains</option>
                <option value="jewelry">Jewelry</option>
                <option value="custom">Custom Pieces</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="product-images">Product Images * (you can add multiple)</label>
              <input type="file" id="product-images" name="images" accept="image/*" multiple />
            </div>
            <div className="form-group" id="image-preview-panel" style={{ display: 'none' }}>
              <label>Selected Images</label>
              <div id="image-preview-info" style={{ fontSize: '0.95rem', marginBottom: '0.75rem', color: 'var(--text-secondary)' }}></div>
              <div id="image-preview-container" className="image-preview-grid"></div>
            </div>
            <div className="form-group">
              <label htmlFor="product-desc">Description</label>
              <textarea id="product-desc" name="desc"></textarea>
            </div>
            <div className="form-group">
              <label htmlFor="product-details">Details (one per line, format: Key: Value)</label>
              <textarea id="product-details" name="details" placeholder="Size: 30cm x 30cm\nFinish: High gloss"></textarea>
            </div>
            <div className="admin-actions">
              <button type="submit" className="btn btn-primary" id="save-product-btn">Save Product</button>
              <button type="button" className="btn btn-outline" id="cancel-edit-btn">Cancel Edit</button>
            </div>
          </form>
          <div id="product-message" className="admin-note"></div>
        </section>

        <section className="admin-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2>Existing Products</h2>
            <button className="btn btn-primary" id="refresh-products-btn">Refresh</button>
          </div>
          <table className="admin-table" id="products-table">
            <thead>
              <tr>
                <th>Image</th>
                <th>Name</th>
                <th>Category</th>
                <th>Description</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </section>
      </div>
    </>
  );
}
