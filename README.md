## SiteScope (An authenticated SEO audit platform that analyzes any website with PageSpeed Insights, on-page SEO checks, report history, PDF export, and Cloudinary-powered user profiles.)

This project includes:

- Next.js 16 App Router frontend with Tailwind CSS
- Express.js backend with MongoDB
- Email/password signup and login
- JWT authentication stored in HTTP-only cookies
- Google OAuth and GitHub OAuth using Passport.js
- Protected frontend and backend routes
- Website analysis with Google PageSpeed Insights + basic on-page SEO checks
- Saved report history per user with delete-one and delete-all actions
- Animated circular score visuals, PDF report export, and Cloudinary-backed profile avatars

## Project Structure

- `app/` - Next.js pages
- `components/` - shared frontend UI and auth provider
- `lib/` - frontend fetch helpers and shared types
- `proxy.ts` - Next.js 16 route protection redirects
- `server/src/config` - database and Passport config
- `server/src/controllers` - auth controller logic
- `server/src/middleware` - JWT protection and error handling
- `server/src/models` - MongoDB user model
- `server/src/routes` - auth API routes

## Environment Variables

Create these files before running the app:

### Frontend `.env.local`

```bash
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### Backend `server/.env`

```bash
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/seo-geo-auth
JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:5000
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
PAGESPEED_API_KEY=your_google_pagespeed_api_key_optional
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

For OAuth providers, set callback URLs to:

- `http://localhost:5000/api/auth/google/callback`
- `http://localhost:5000/api/auth/github/callback`

## Install

```bash
npm install
cd server
npm install
cd ..
```

## Run

Run both apps together from the project root:

```bash
npm run dev
```

This starts:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5000`

## Auth Routes

### Backend

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/google`
- `GET /api/auth/google/callback`
- `GET /api/auth/github`
- `GET /api/auth/github/callback`
- `GET /api/auth/me`
- `POST /api/analysis`
- `GET /api/analysis/history`
- `DELETE /api/analysis/history`
- `DELETE /api/analysis/history/:id`
- `POST /api/profile/avatar`

### Frontend

- `/login`
- `/signup`
- `/`

## Notes

- JWTs are stored in the `auth_token` HTTP-only cookie.
- `proxy.ts` redirects unauthenticated users away from `/` and redirects authenticated users away from `/login` and `/signup`.
- The homepage re-checks the session through `/api/auth/me` after load so stale cookies still fall back safely to `/login`.
- The analysis endpoint combines PageSpeed Insights data with HTML-level checks for title tags, meta descriptions, headings, images, page size, and suggestions.
- Each analysis is stored in a dedicated reports collection and surfaced in the dashboard history panel.
- The report view includes animated circular score indicators and can be exported to PDF from the dashboard.
- Profile details and logout are grouped into a dedicated profile section, and avatar uploads are stored in Cloudinary.
