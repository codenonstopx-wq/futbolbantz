# ⚽ FutbolBantz — Setup Guide
## GitHub Actions Auto-Refresh + Supabase Integration

---

## PART 1 — GitHub Actions (Auto-refresh PL data)

### Step 1: Put your site on GitHub
```bash
# In your futbolbantz folder:
git init
git add .
git commit -m "Initial FutbolBantz commit"

# Create a repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/futbolbantz.git
git push -u origin main
```

### Step 2: Get a free football data API key
1. Go to **https://www.football-data.org**
2. Click **Register** → free tier gives you PL standings, results, scorers
3. Copy your API key (looks like `abc123def456...`)

### Step 3: Add secrets to GitHub
Go to your repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Add these secrets:

| Secret name | Value |
|-------------|-------|
| `SUPABASE_URL` | `https://xxxxx.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Your Supabase service_role key (NOT anon) |
| `NETLIFY_AUTH_TOKEN` | From netlify.com → User settings → Personal access tokens |
| `NETLIFY_SITE_ID` | From your Netlify site → Site configuration → Site ID |

### Step 4: Push the workflow file
The file `.github/workflows/refresh-pl-data.yml` tells GitHub when to run.
It will now run automatically after every matchday. Done!

### Step 5: Test it manually
Go to your repo → **Actions** tab → **Refresh Premier League Data** → **Run workflow**

---

## PART 2 — Supabase Setup

### Step 1: Create a Supabase project
1. Go to **https://supabase.com** → Sign up free
2. Click **New Project**
3. Name it `futbolbantz`, pick a region close to your users (London = `eu-west-2`)
4. Set a strong database password, save it somewhere

### Step 2: Run the database schema
1. In your Supabase project → go to **SQL Editor**
2. Click **New query**
3. Copy the entire contents of `supabase/migrations/001_schema.sql`
4. Paste it in and click **Run**

This creates all your tables: profiles, articles, pl_standings, pl_results, pl_fixtures, pl_scorers, pl_meta.

### Step 3: Get your API keys
Go to **Project Settings** → **API**:

- **Project URL** → this is your `SUPABASE_URL`
- **anon / public** key → use this in the frontend HTML
- **service_role / secret** key → use this in GitHub Actions only (never in frontend!)

### Step 4: Connect your site to Supabase

In your `futbolbantz-standalone.html`, add to `<head>`:
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
```

Then add this just before your closing `</script>` tag:
```javascript
const SUPABASE_URL  = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON = 'YOUR_ANON_PUBLIC_KEY';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
```

### Step 5: Enable Email Auth
1. Go to **Authentication** → **Providers**
2. Make sure **Email** is enabled
3. Optional: turn off **Confirm email** while testing (Auth → Settings → Email Confirmations)

### Step 6: Set up Realtime (optional — makes articles update live)
1. Go to **Database** → **Replication**
2. Enable replication for the `articles` table
3. Your site will now update live when you publish an article — no page refresh needed

---

## PART 3 — Netlify Deployment

### Step 1: Deploy to Netlify
1. Go to **https://netlify.com** → Sign up free
2. Click **Add new site** → **Import an existing project** → GitHub
3. Select your `futbolbantz` repo
4. Build settings:
   - Build command: (leave blank — GitHub Actions builds it)
   - Publish directory: `public`
5. Click **Deploy site**

### Step 2: Get your Netlify tokens (for GitHub Actions)
- **NETLIFY_AUTH_TOKEN**: netlify.com → User settings → Applications → Personal access tokens → New token
- **NETLIFY_SITE_ID**: Your site → Site configuration → Site ID

---

## HOW IT ALL WORKS TOGETHER

```
Every Saturday 6pm UTC:
  GitHub Actions wakes up
    → Calls football-data.org API
    → Gets live standings, results, scorers
    → Saves data to Supabase database
    → Rebuilds public/index.html with fresh data
    → Commits updated file to GitHub
    → Deploys to Netlify automatically

Your site visitors:
    → Load the site (served from Netlify CDN — super fast)
    → Auth goes through Supabase Auth (real JWT sessions)
    → Articles load from Supabase database (real-time capable)
    → PL data already baked into HTML (fast, no extra API calls)

Admin publishes article:
    → Saved to Supabase
    → Realtime subscription fires
    → Home page updates without refresh
```

---

## COSTS (Everything is free tier)

| Service | Free tier |
|---------|-----------|
| GitHub Actions | 2,000 minutes/month |
| football-data.org | 10 req/min, PL included |
| Supabase | 500MB DB, 50k auth users, 2GB bandwidth |
| Netlify | 100GB bandwidth, 300 build minutes |

For a football blog, you won't hit any of these limits. Total cost: **£0/month**.

---

## TROUBLESHOOTING

**"football-data.org returns 429"** → You hit the rate limit (10 req/min). The script uses Promise.all() for 4 requests which is fine, but don't run it more than twice a minute.

**"Supabase RLS blocking writes"** → Make sure you're using the `service_role` key in GitHub Actions, not the `anon` key.

**"GitHub Actions can't push"** → Go to repo Settings → Actions → General → Workflow permissions → set to "Read and write permissions".

**"Netlify deploy failing"** → Check your NETLIFY_SITE_ID is the Site ID (not the site name). Find it in Netlify → Site configuration.
