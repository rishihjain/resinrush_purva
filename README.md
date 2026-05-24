# ResinRush Backend

This project now includes a lightweight Node.js backend for ResinRush.

## What it provides

- Serves the static website from the project root
- Stores custom order enquiries in `data/orders.json`
- Stores contact form submissions in `data/contacts.json`
- Exposes API endpoints:
  - `POST /api/orders` — save an order enquiry and return WhatsApp/Instagram links
  - `POST /api/contact` — save a contact message
  - `GET /api/orders` — read stored orders
  - `GET /api/contacts` — read stored contacts

## Run locally

1. Install dependencies:

```bash
npm install
```

2. Start the server:

```bash
npm start
```

3. Open `http://localhost:3000`

## Notes

- The custom order form now only asks for name, phone, category, and additional details.
- Enquiries are saved on the backend and then redirected to WhatsApp or Instagram.
