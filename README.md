# StayNest Homestay Marketplace

A Vite, React, and Tailwind CSS UI prototype for a modern homestay booking marketplace.

## Features

- Responsive homepage with hero search
- Search controls for location, dates, and guests
- Homestay cards with image, price, rating, and location
- Filter sidebar for price, rating, and amenities
- Homestay detail page
- Host listing form for rent or sale
- Clean reusable React components

## Run

```bash
npm install
npm run dev
```

## Docker Deployment With One Public Port

This setup serves the React/Vite frontend through Nginx on port `4173` and proxies all backend calls from `/api/*` to the backend container on the private Docker network. The backend and MongoDB are not published directly.

Public flow:

```text
Browser
-> https://staynest.nniisworking1606.id.vn
-> Cloudflare Tunnel
-> http://192.168.0.110:4173
-> frontend Nginx container
-> /api/* proxy to backend:5000
-> mongodb:27017 inside Docker
```

### Required Environment

Set these values in your shell or a root `.env` file before starting Docker Compose:

```bash
JWT_SECRET=replace_this_with_a_long_random_secret
SESSION_SECRET=replace_this_with_a_long_random_session_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your_gmail_address@gmail.com
SMTP_PASS=your_gmail_app_password
SMTP_FROM="StayNest <your_gmail_address@gmail.com>"
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

The Docker deployment builds the frontend with:

```bash
VITE_API_URL=/api
VITE_APP_VERSION=0.1.0
```

That makes browser API requests same-origin, for example:

```text
https://staynest.nniisworking1606.id.vn/api/health
```

### Run

```bash
docker compose up --build
```

Detached mode:

```bash
docker compose up --build -d
```

Stop:

```bash
docker compose down
```

Reset containers and named volumes:

```bash
docker compose down -v
```

MongoDB data is stored in the bind-mounted `./mongo-data` folder. To fully reset the database when using this compose file, stop the stack and remove that folder.

### LAN And Public URLs

- LAN frontend: `http://192.168.0.110:4173`
- LAN backend health through Nginx: `http://192.168.0.110:4173/api/health`
- Public frontend: `https://staynest.nniisworking1606.id.vn`
- Public backend health through Nginx: `https://staynest.nniisworking1606.id.vn/api/health`

Cloudflare Tunnel should point only to:

```text
http://192.168.0.110:4173
```

Do not create separate tunnels or public forwards for backend port `5000` or MongoDB port `27017`.

### Google OAuth

Add this authorized redirect URI in Google Cloud Console:

```text
https://staynest.nniisworking1606.id.vn/api/auth/google/callback
```

The backend reads the same value from `GOOGLE_CALLBACK_URL`.

### Stripe Redirects

Stripe success and cancel redirects use:

```bash
FRONTEND_URL=https://staynest.nniisworking1606.id.vn
```

The success page calls the backend through `/api`, so it works through the same public domain and Cloudflare Tunnel.

## SEO Sitemap

Generate the static sitemap with public routes only:

```bash
npm run generate:sitemap
```

The build command runs sitemap generation automatically through `prebuild`:

```bash
npm run build
```

To include visible homestay detail URLs from the backend, run the generator with the public sitemap API endpoint:

```powershell
$env:SITEMAP_API_URL="http://localhost:5000/api/public/homestays-sitemap"; npm run generate:sitemap
```

The sitemap generator always includes:

```text
https://staynest.nniisworking1606.id.vn/
https://staynest.nniisworking1606.id.vn/homestays
```

When the API is reachable, it also adds canonical homestay detail URLs in this format:

```text
https://staynest.nniisworking1606.id.vn/hosts/:hostId/homestays/:homestayId/:slug
```

Private pages such as `/admin`, `/host`, `/account`, `/wishlist`, `/booking-history`, `/notifications`, `/payment`, and `/auth` are excluded.
