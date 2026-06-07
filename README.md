# StayNest

StayNest is a full-stack homestay booking and management website developed as a university project. It provides a complete workflow for guests, hosts, and administrators, including homestay discovery, authentication, booking management, test payments, listing administration, and SEO-friendly public pages.

## Main Features

- Search for homestays and view detailed listing information
- Sign in and register with Google OAuth
- Create, view, and manage bookings
- Process test payments through Stripe Test Mode
- Create and manage homestay listings from the host dashboard
- Manage users, homestays, bookings, payments, and reviews from admin pages
- Generate canonical homestay URLs and `sitemap.xml` for SEO
- Upload and manage listing images with Cloudinary
- Send account-related emails through SMTP
- Run the application with Docker and serve it through Nginx

## Tech Stack

| Area | Technologies |
| --- | --- |
| Frontend | ReactJS, Vite, Tailwind CSS, TypeScript |
| Backend | Node.js, Express.js |
| Database | MongoDB, Mongoose |
| Authentication | Passport.js, Google OAuth 2.0, JWT |
| Payment | Stripe Test Mode |
| Media | Cloudinary |
| Deployment | Docker, Docker Compose, Nginx |
| SEO | Canonical URLs, generated `sitemap.xml` |

## Project Structure

```text
StayNest/
|-- backend/            # Express API, database models, and business logic
|-- public/             # Public assets and generated sitemap
|-- scripts/            # Sitemap generation script
|-- src/                # React frontend source code
|-- docker-compose.yml
|-- Dockerfile
`-- nginx.conf
```

## Prerequisites

- Node.js 20.19 or later
- npm
- MongoDB
- Docker and Docker Compose (optional)

## Local Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/Nhat22-archlinux/Staynest.git
   cd Staynest
   ```

2. Install frontend dependencies:

   ```bash
   npm install
   ```

3. Install backend dependencies:

   ```bash
   cd backend
   npm install
   cd ..
   ```

4. Create local environment files from the provided examples:

   ```bash
   cp .env.example .env
   cp backend/.env.example backend/.env
   ```

   On Windows PowerShell:

   ```powershell
   Copy-Item .env.example .env
   Copy-Item backend/.env.example backend/.env
   ```

5. Update the environment variables for your local MongoDB, Google OAuth, Stripe test account, and other services.

6. Start the backend:

   ```bash
   cd backend
   npm run dev
   ```

7. In a second terminal, start the frontend:

   ```bash
   npm run dev
   ```

The frontend runs at `http://localhost:5173` by default, and the backend API runs at `http://localhost:5000`.

## Environment Variables

Never commit real credentials or API keys. Use placeholder values in `.env.example` and keep actual secrets in local `.env` files.

### Frontend (`.env`)

```env
VITE_API_URL=http://localhost:5000/api
VITE_APP_VERSION=0.1.0
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key
```

### Backend (`backend/.env`)

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/homestay_db
CORS_ORIGIN=http://localhost:5173
FRONTEND_URL=http://localhost:5173

JWT_SECRET=replace_with_a_long_random_value
SESSION_SECRET=replace_with_a_long_random_value

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

STRIPE_SECRET_KEY=sk_test_your_secret_key

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

SMTP_HOST=smtp.example.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your_smtp_username
SMTP_PASS=your_smtp_password
SMTP_FROM="StayNest <no-reply@example.com>"
```

For Google OAuth, add the value of `GOOGLE_CALLBACK_URL` to the authorized redirect URIs in Google Cloud Console.

## Run With Docker

The Docker Compose configuration starts MongoDB, the Express backend, and the React frontend served by Nginx.

1. Add the required secret values to the root `.env` file.
2. Review the URLs and database connection in `docker-compose.yml` for your deployment environment.
3. Build and start the services:

   ```bash
   docker compose up --build
   ```

Run in the background:

```bash
docker compose up --build -d
```

Stop the services:

```bash
docker compose down
```

The frontend is exposed on `http://localhost:4173`. Nginx forwards `/api` requests to the backend service inside the Docker network.

## SEO and Sitemap

Generate `public/sitemap.xml` manually:

```bash
npm run generate:sitemap
```

The production build also generates the sitemap automatically:

```bash
npm run build
```

Set `SITEMAP_API_URL` when generating a sitemap that includes public homestay detail pages from a running backend.

## Notes

- Stripe integration must use test keys for development and demonstration.
- Third-party services such as Google OAuth, Stripe, Cloudinary, and SMTP require separate developer credentials.
- This repository is intended for educational and demonstration purposes.
