# 🟣 LastBench Deployment Guide

This guide walks you through deploying the LastBench platform to a live, production-ready state using modern hosting services with generous free tiers.

---

## 🏗️ Deployment Architecture

We will split the deployment into four managed cloud services:
1. **Database (PostgreSQL)**: Hosted on **Supabase** or **Neon.tech** (Free Tier).
2. **Cache & Queue (Redis)**: Hosted on **Upstash** (Free Serverless Redis).
3. **Backend API (Express)**: Hosted on **Render** or **Railway** (Node.js runtime).
4. **Frontend (Vite / React)**: Hosted on **Vercel** or **Netlify** (Static hosting).

---

## 🌐 Step 1: Deploy Databases (Postgres & Redis)

### A. Deploy PostgreSQL on Supabase
1. Go to [supabase.com](https://supabase.com) and create a free account.
2. Create a new project named `lastbench-db`. Set a secure database password.
3. Once the project is ready, navigate to **Project Settings** -> **Database**.
4. Copy the **URI Connection String** under "Transaction Connection Pooler" (usually uses port `6543`). It looks like:
   `postgres://postgres.[your-id]:[password]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true`
5. Keep this URL safe; this will be your production `DATABASE_URL`.

### B. Deploy Redis on Upstash
1. Go to [upstash.com](https://upstash.com) and sign up.
2. Click **Create Database**. Name it `lastbench-redis`, select your nearest region, and click **Create**.
3. Under the **Details** tab, copy the **Redis URL** (the connection string starting with `rediss://`).
4. Keep this safe; this will be your production `REDIS_URL`.

---

## 🚀 Step 2: Deploy the Express Backend

We will deploy the backend to **Railway.app** (which supports persistent WebSockets for Socket.IO out of the box).

### A. Push Code to GitHub
1. Make sure all your local changes are committed and pushed to a repository on your GitHub account:
   ```bash
   git init
   git add .
   git commit -m "feat: initial production deployment"
   # Create a repository on GitHub, then copy-paste the remote setup commands:
   git remote add origin git@github.com:YOUR_USERNAME/lastbench.git
   git branch -M main
   git push -u origin main
   ```

### B. Setup Railway Service
1. Go to [railway.app](https://railway.app) and log in.
2. Click **New Project +** -> **Deploy from GitHub repo**.
3. Select your `lastbench` repository.
4. Click on the newly created service block to configure it:
   - Go to the **Settings** tab.
   - Set **Root Directory**: `/` (Leave as root to allow access to shared monorepo packages).
   - Set **Custom Build Command**: `pnpm install --node-linker=hoisted && pnpm build`
   - Set **Start Command**: `node apps/api/dist/index.js`
5. Go to the **Variables** tab to add **Environment Variables**:
   - `NODE_ENV`: `production`
   - `PORT`: `3001`
   - `DATABASE_URL`: *(Your Supabase connection string copied in Step 1A)*
   - `REDIS_URL`: *(Your Upstash connection string copied in Step 1B)*
   - `CORS_ORIGIN`: `https://your-frontend-app.vercel.app` *(You will update this once frontend is deployed)*
   - `BETTER_AUTH_SECRET`: *(Run `openssl rand -hex 32` or type a long random string)*
   - `BETTER_AUTH_URL`: `https://YOUR_BACKEND_URL` *(Use the URL Railway assigns to your service)*
6. In the **Settings** tab under **Networking**, click **Generate Domain** to get your public API URL (e.g. `https://lastbench-production.up.railway.app`). Keep this as your `YOUR_BACKEND_URL`!

### 📡 Realtime Infrastructure Notes
LastBench uses Socket.IO for realtime comments, notifications, and lounge chats.
The backend must run on a persistent Node.js server that supports WebSocket connections.
* **Recommended hosting**: **Railway** (configured above), **Render**, or **Fly.io**.
* **Avoid** deploying the Express API to serverless-only platforms (like Vercel Serverless Functions or AWS Lambda) because persistent WebSocket connections are required for realtime features.

---

## 💻 Step 3: Run Database Migrations in Production

Once the backend is linked to Supabase, run your migrations and database seeds:
1. Locally in your project root, temporarily update your `.env` file's `DATABASE_URL` with your Supabase transaction string.
2. Run the migration command to construct tables in Supabase:
   ```bash
   pnpm db:generate
   pnpm db:migrate
   ```
3. Seed demo users, posts, and communities:
   ```bash
   pnpm db:seed
   ```
4. Restore your local `.env` database URL back to localhost (`postgresql://lastbench:lastbench_secret@localhost:5432/...`) to keep local development clean.

---

## ⚡ Step 4: Deploy the React Frontend

We will deploy the frontend to **Vercel** (highly optimized for Vite/React applications).

### A. Update API Client Endpoint
The `ApiClient` in `apps/web/src/lib/api-client.ts` uses relative paths (`/api`). To make this work seamlessly on Vercel:
1. Change the base URL initialization in `apps/web/src/lib/api-client.ts`:
   ```typescript
   const API_URL = import.meta.env.VITE_API_URL || '/api';
   ```

### B. Configure Vercel Project
1. Go to [vercel.com](https://vercel.com) and log in.
2. Click **Add New** -> **Project**.
3. Select your `lastbench` repository.
4. Configure the project settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `apps/web`
   - **Build Command**: `cd ../.. && pnpm install && pnpm --filter @lastbench/web build`
   - **Output Directory**: `dist`
5. Under **Environment Variables**, add:
   - `VITE_API_URL`: `https://YOUR_BACKEND_URL/api` *(Your live backend API URL)*
6. Click **Deploy**. Vercel will build the frontend and assign a live URL (e.g., `https://lastbench-web.vercel.app`).

---

## 🔄 Step 5: Complete CORS Configuration

1. Copy your new live Vercel URL (e.g., `https://lastbench-web.vercel.app`).
2. Go back to your Railway Dashboard -> Select your API service -> **Variables**.
3. Update the `CORS_ORIGIN` variable to match your Vercel URL.
4. Save changes. Railway will automatically redeploy the backend with the correct CORS rules.

🎉 **Congratulations! Your multi-campus social network (LastBench) is now live, seeded, and ready for your portfolio!**
