# E-Commerce realtime starter (Next.js + Node.js + MySQL)

This repo contains a minimal starter for the shopping flow (Login → Browse → Detail → Add to Cart → Checkout → Order Success) and the basic role foundation for BUYER, SELLER, and ADMIN.

- Frontend: Next.js
- Backend: Node.js (Express)
- Database: MySQL

Quick setup (backend):

1. Create a MySQL database and user, then update `backend/.env.example` (copy to `.env`).
2. Run migrations and seed demo data:

```bash
cd backend
npm run migrate
npm run seed
```

3. Install and run backend:

```bash
cd backend
npm install
cp .env.example .env
# edit .env to set DB credentials
npm run dev
```

Quick setup (frontend):

```bash
cd frontend
npm install
npm run dev
```

Notes:

- The backend has simple JWT auth at `/api/auth`.
- Buyer features now have backend support for profile, addresses, password change, cancel order, order history, and reviews.
- Seller features now have backend support for dashboard, product creation, and order status updates.
- Admin features now have backend support for user moderation, seller verification, product moderation, banners, and monitoring stats.
- Payment is still a simple dummy checkout flow in `/api/orders/checkout/:userId` — integrate Stripe or another provider later.
- Demo users after seed: `buyer@demo.com`, `seller@demo.com`, `admin@demo.com` with password `password`.

Frontend pages now available:

- `/` browse + search + filter + sort products
- `/product/:id` detail + add to cart + review/rating
- `/cart` checkout flow
- `/dashboard/buyer` buyer profile, addresses, orders, tracking, cancel, payment dummy
- `/dashboard/seller` seller product management + incoming orders
- `/dashboard/admin` user moderation + seller verification + product moderation + banners + stats
