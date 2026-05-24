/* ============================================
   FORM.JS — Custom Order + Contact Form
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  initOrderForm();
  initContactForm();
  initFAQ();
});

/* ---- CUSTOM ORDER FORM ---- */
function initOrderForm() {
  const form = document.getElementById('order-form');
  if (!form) return;

  const whatsappBtn = document.getElementById('order-whatsapp-btn');
  const instagramBtn = document.getElementById('order-instagram-btn');
  const successEl = document.getElementById('order-success');

  async function submitOrder(channel) {
    const name = form.querySelector('#order-name')?.value.trim() || '';
    const phone = form.querySelector('#order-phone')?.value.trim() || '';
    const type = form.querySelector('#order-type')?.value || '';
    const notes = form.querySelector('#order-notes')?.value.trim() || '';

    if (!name || !phone || !type || !notes) {
      showToast('Please fill in all required fields before sending.', '⚠️');
      return;
    }

    if (whatsappBtn) whatsappBtn.disabled = true;
    if (instagramBtn) instagramBtn.disabled = true;

    try {
      const payload = { name, phone, type, notes, channel };
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Unable to send enquiry.');
      }

      const data = await response.json();
      if (successEl) {
        form.style.display = 'none';
        successEl.classList.add('show');
      }

      const targetUrl = channel === 'instagram' ? data.instagramUrl : data.whatsappUrl;
      if (targetUrl) {
        window.open(targetUrl, '_blank');
      } else {
        showToast('Inquiry saved — continue in your messaging app.', '✨');
      }
    } catch (error) {
      showToast(error.message || 'Something went wrong. Please try again.', '⚠️');
    } finally {
      if (whatsappBtn) whatsappBtn.disabled = false;
      if (instagramBtn) instagramBtn.disabled = false;
    }
  }

  if (whatsappBtn) whatsappBtn.addEventListener('click', () => submitOrder('whatsapp'));
  if (instagramBtn) instagramBtn.addEventListener('click', () => submitOrder('instagram'));
}

/* ---- CONTACT FORM ---- */
function initContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = form.querySelector('.btn-submit-contact');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner"></span> Sending...`;
    }

    const name = form.querySelector('#contact-name')?.value.trim() || '';
    const email = form.querySelector('#contact-email')?.value.trim() || '';
    const message = form.querySelector('#contact-message')?.value.trim() || '';

    if (!name || !email || !message) {
      showToast('Please fill in all required contact details.', '⚠️');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = 'Send Message ✦';
      }
      return;
    }

    try {
      await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message })
      });

      showToast('Message sent! We\'ll reply within 24 hours 💌', '✉️');
      form.reset();
    } catch (error) {
      showToast('Unable to send message right now. Please try again later.', '⚠️');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = 'Send Message ✦';
      }
    }
  });
}

/* ---- FAQ ACCORDION ---- */
function initFAQ() {
  const items = document.querySelectorAll('.faq-item');
  items.forEach(item => {
    const question = item.querySelector('.faq-question');
    if (!question) return;

    question.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');

      // Close all
      items.forEach(i => i.classList.remove('open'));

      // Toggle clicked
      if (!isOpen) item.classList.add('open');
    });

    // Keyboard
    question.setAttribute('tabindex', '0');
    question.setAttribute('role', 'button');
    question.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        question.click();
      }
    });
  });
}

/* ---- UTILS ---- */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
