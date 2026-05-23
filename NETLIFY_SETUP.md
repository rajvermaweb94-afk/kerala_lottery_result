# Kerala Lottery — Netlify + Supabase Setup Guide

## Step 1 — Create Supabase Project (5 minutes)

1. Go to https://supabase.com → Sign up free
2. Click **New Project** → give it a name → set a password → Create
3. Wait ~2 minutes for it to start
4. Go to **Settings → API**
5. Copy:
   - **Project URL** (looks like: `https://abcdefgh.supabase.co`)
   - **anon public** key (long string starting with `eyJ...`)

---

## Step 2 — Create Database Tables

1. In Supabase → click **SQL Editor** → **New Query**
2. Copy ALL the SQL from `supabase-config.js` (the big block between the comments)
3. Paste it and click **Run**
4. You should see: "Success. No rows returned"

---

## Step 3 — Configure Your Project

Open `supabase-config.js` and replace the placeholders:

```js
const SUPABASE_URL  = 'https://abcdefgh.supabase.co';   // ← your URL
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIs...';        // ← your anon key
const ADMIN_PASSWORD = 'your-secure-password';           // ← change this!
```

---

## Step 4 — Push to GitHub

1. Create a new repository on https://github.com
2. In your project folder, open terminal:

```bash
git init
git add .
git commit -m "Kerala Lottery v1"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

---

## Step 5 — Deploy on Netlify

1. Go to https://netlify.com → Sign up free
2. Click **Add new site → Import an existing project**
3. Connect GitHub → select your repository
4. Build settings:
   - Build command: *(leave empty)*
   - Publish directory: `.`
5. Click **Deploy site**
6. Done! Your site is live at `https://random-name.netlify.app`

---

## Step 6 — Access Admin Panel

```
Frontend:  https://your-site.netlify.app/
Admin:     https://your-site.netlify.app/admin/login.html
Password:  whatever you set in supabase-config.js
```

---

## How It Works

```
Netlify (hosts HTML/CSS/JS)
    ↕ direct API calls
Supabase (PostgreSQL database)
    - draws table
    - prizes table  
    - winners table
```

- Admin adds a draw → saved to Supabase instantly
- Frontend loads → fetches from Supabase → shows live data
- No server, no PHP, no Node.js needed
- Everything runs in the browser

---

## File Structure for Netlify

```
/ (root — all uploaded to Netlify)
├── index.html          ← Frontend
├── styles.css
├── app.js
├── supabase-config.js  ← YOUR CREDENTIALS HERE
├── supabase-api.js     ← Supabase helper
├── netlify.toml        ← Netlify config
├── admin/
│   ├── index.html      ← Admin dashboard
│   ├── login.html      ← Admin login
│   └── admin.js        ← Admin logic
└── backend/
    └── admin/
        └── admin.css   ← Shared styles
```

---

## Free Tier Limits (Supabase)

| Resource | Free Limit |
|---|---|
| Database | 500 MB |
| API requests | 50,000/month |
| Bandwidth | 5 GB/month |

More than enough for a Kerala lottery result website.
