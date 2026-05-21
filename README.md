# ⚽ FutbolBantz — Premier League's Most Unhinged Football Blog

A full-stack football blog website with:
- Comic book / fanzine design system
- User authentication (login, register, admin roles)
- AI-powered YouTube-to-article generation
- Admin panel with video upload + article management

---

## 🚀 Quick Start

1. **Unzip** this folder somewhere on your computer
2. **Open** `index.html` in a browser — it works entirely in the browser, no server needed!
3. **Log in** with the demo accounts (shown on the login page)

---

## 🗂️ File Structure

```
futbolbantz/
├── index.html          ← The whole site (all pages/routing in one file)
├── css/
│   └── style.css       ← Full design system (comic fanzine theme)
├── js/
│   └── app.js          ← Auth, routing, state, AI engine, page renderers
└── README.md
```

---

## 🔐 Auth System

### Demo Accounts
| Role  | Email                    | Password   |
|-------|--------------------------|------------|
| Admin | admin@futbolbantz.com    | admin123   |
| Fan   | fan@futbolbantz.com      | fan123     |

### Admin Secret Code
To register a new admin account, the secret code is: **BANTZ2024**

### How Auth Works
- All users/articles stored in `localStorage` (browser-side)
- For production, replace `localStorage` with a real backend (Node.js + MongoDB, Supabase, etc.)
- Admin-only routes are protected — non-admins get bounced to the login page

---

## ⚡ Admin Panel Features

1. **Dashboard** — Stats overview, recent articles
2. **Video Machine** — Enter YouTube URLs or topics → AI generates blog articles
3. **All Articles** — Publish/unpublish/delete any article
4. **Users** — View all registered users

### Generating Articles
- Enter a YouTube channel URL like `https://youtube.com/@SkySports`
- Or enter a topic like `"Arsenal vs Man City tactical breakdown"`
- Or drag & drop video files (describe the content when prompted)
- Choose tone (Banter/Serious/Tactical/Fan) and length
- Hit the big yellow button — Claude generates the article
- Review → Publish!

---

## 🎨 Design System

Based on the **Comic Fanzine** aesthetic:
- **Fonts**: Bangers (headlines), Archivo Black (subheads), DM Sans (body), Space Mono (meta)
- **Colours**: Cream `#FFFDF6`, Charcoal `#1C1917`, Mustard `#FFC72C`, Orange `#FF6B35`
- **Borders**: Thick 3-4px solid borders everywhere
- **Shadows**: Hard `5px 5px 0px #1C1917` box-shadows (no blur)
- **Halftone**: Dot-grid background pattern
- **Speech Bubbles**: CSS-only triangle bubbles for quotes

---

## 🛠️ Production Deployment

### Option 1: Static Hosting (simplest)
Upload to Netlify, Vercel, or GitHub Pages.
Replace `localStorage` with a backend API.

### Option 2: Add a Real Backend
Recommended stack:
```
Frontend: This HTML/CSS/JS (as-is)
Backend:  Node.js + Express
Database: MongoDB or Supabase (Postgres)
Auth:     JWT tokens or Supabase Auth
Storage:  Cloudinary or AWS S3 for videos
AI:       Anthropic Claude API (already integrated)
```

### Environment Variables Needed for Production
```
ANTHROPIC_API_KEY=sk-ant-...
JWT_SECRET=your-jwt-secret
MONGO_URI=mongodb+srv://...
```

---

## 📺 YouTube Integration (Production)

For real YouTube transcript fetching, add these to your backend:
```javascript
// 1. YouTube Data API v3 — get video list from channel
// 2. youtube-transcript npm package — fetch transcripts
// 3. Pass transcript text to Claude API
```

The frontend `AIEngine.generateFromSource(sourceText, sourceName, tone, length)`
already handles the Claude call — just feed it the real transcript text.

---

## 🤩 Credits

Built with ❤️ (and an unreasonable amount of football opinions) using:
- Claude (Anthropic) — AI article generation
- Google Fonts — Bangers, Archivo Black, DM Sans, Space Mono
- Zero external JS dependencies (pure vanilla JS)

---

*VAR is still rubbish. Come on you yellows.*
# futbolbantz
