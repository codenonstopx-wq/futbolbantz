/* ============================================================
   FUTBOLBANTZ — Core JS: Auth, State, Utils
   ============================================================ */

// ── STATE ──────────────────────────────────────────────────
const FB = {
  currentUser: null,
  currentPage: 'home',
  articles: [],
  users: [],

  init() {
    this.loadState();
    this.seedData();
    Router.init();
  },

  loadState() {
    try {
      const u = localStorage.getItem('fb_user');
      this.currentUser = u ? JSON.parse(u) : null;
      const arts = localStorage.getItem('fb_articles');
      this.articles = arts ? JSON.parse(arts) : [];
      const users = localStorage.getItem('fb_users');
      this.users = users ? JSON.parse(users) : [];
    } catch(e) { console.warn('State load error', e); }
  },

  saveArticles() {
    localStorage.setItem('fb_articles', JSON.stringify(this.articles));
  },

  saveUsers() {
    localStorage.setItem('fb_users', JSON.stringify(this.users));
  },

  seedData() {
    if (this.articles.length === 0) {
      this.articles = [
        {
          id: 'a1', title: "Haaland Does It AGAIN — How Many Is Too Many?",
          tag: "Match Report", channel: "@ManCityTV", summary: "Erling Haaland has once again made goalkeepers question their career choices, slotting home his 47th league goal and apparently still hungry. The man doesn't walk to training — he runs, uphill, backwards, with a defender on his back.",
          keypoints: ["Hat-trick inside 22 minutes like he was bored", "Third keeper this season reduced to tears", "Pep's post-match face was pure smug", "Fantasy football managers weeping with joy"],
          conclusion: "At this rate Haaland will need a separate trophy cabinet just for Golden Boots.",
          date: new Date(Date.now()-3600000*2).toISOString(), published: true, views: 4821
        },
        {
          id: 'a2', title: "VAR Watch: 18 Minutes To Spot A Toenail Offside",
          tag: "Hot Take", channel: "@RefereeTalk", summary: "Eighteen. Whole. Minutes. While thirty thousand fans stood in existential dread, the VAR team apparently needed to recalibrate the camera, phone a friend, and have a quiet cry before ruling the goal out for a toenail.",
          keypoints: ["Offside margin: 0.3 centimetres", "Draw the line, they said. It'll be fun, they said.", "Match effectively ruined. Tea gone cold.", "PGMOL issued a statement nobody read"],
          conclusion: "Football: the beautiful game. Until technology gets involved.",
          date: new Date(Date.now()-3600000*6).toISOString(), published: true, views: 9214
        },
        {
          id: 'a3', title: "Arsenal's Title Charge: Bottled It Faster Than A Craft Beer",
          tag: "Banter", channel: "@ArsenalFanTV", summary: "It was going so well. Four points clear, ten games to go, the internet full of Arsenal fans being absolutely NORMAL about things. And then, as is tradition, the wheels fell off spectacularly.",
          keypoints: ["Dropped 14 points in 7 games somehow", "Mikel Arteta press conference lasted 40 minutes of sighing", "Fan cam footage now classified as distressing content", "Still technically in fourth. Silver linings."],
          conclusion: "Next year is definitely the year. It's always next year.",
          date: new Date(Date.now()-3600000*12).toISOString(), published: true, views: 18740
        },
        {
          id: 'a4', title: "The £85M Signing Who's Touched The Ball 4 Times This Season",
          tag: "Transfers", channel: "@TransferGossip", summary: "He arrived to fanfare, a full stadium, a replica shirt photoshoot, and a manager talking about 'world class'. Seven months later he's been subbed off at half time three times and blamed a slight hamstring twinge.",
          keypoints: ["Contribution: 1 goal, 1 assist, 14 disappearing acts", "Was described as 'still settling in' in November", "Agent already making calls apparently", "Club insists he's 'not for sale at any price' (£45m will do)"],
          conclusion: "A bargain at £85m — if you squint, stand very far back, and have very low standards.",
          date: new Date(Date.now()-3600000*24).toISOString(), published: true, views: 7331
        },
      ];
      this.saveArticles();
    }
    if (this.users.length === 0) {
      this.users = [
        { id:'u1', email:'admin@futbolbantz.com', password:'admin123', name:'The Gaffer', isAdmin:true, joined: new Date().toISOString(), avatar:'🧔' },
        { id:'u2', email:'fan@futbolbantz.com', password:'fan123', name:'BigMouthBarry', isAdmin:false, joined: new Date().toISOString(), avatar:'🤩' }
      ];
      this.saveUsers();
    }
  }
};

// ── AUTH ───────────────────────────────────────────────────
const Auth = {
  login(email, password) {
    const user = FB.users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    if (!user) throw new Error("Wrong email or password, mate. Try again.");
    FB.currentUser = user;
    localStorage.setItem('fb_user', JSON.stringify(user));
    return user;
  },

  register(name, email, password, isAdmin, adminCode) {
    if (!name || !email || !password) throw new Error("Fill in all the fields, you muppet.");
    if (password.length < 6) throw new Error("Password needs to be at least 6 characters. 'pass' won't cut it.");
    if (FB.users.find(u => u.email.toLowerCase() === email.toLowerCase())) throw new Error("That email's already registered. Forget your password again?");
    if (isAdmin && adminCode !== 'BANTZ2024') throw new Error("Wrong admin code. It's not 'password'. Nice try.");
    const user = {
      id: 'u' + Date.now(), email, password, name, isAdmin,
      joined: new Date().toISOString(),
      avatar: isAdmin ? '👑' : '⚽'
    };
    FB.users.push(user);
    FB.saveUsers();
    FB.currentUser = user;
    localStorage.setItem('fb_user', JSON.stringify(user));
    return user;
  },

  logout() {
    FB.currentUser = null;
    localStorage.removeItem('fb_user');
    Router.go('home');
  },

  requireAdmin() {
    if (!FB.currentUser || !FB.currentUser.isAdmin) {
      Toast.show("🚫 Admins only, pal. Log in with an admin account.", 'error');
      Router.go('auth');
      return false;
    }
    return true;
  },

  requireAuth() {
    if (!FB.currentUser) {
      Toast.show("You need to log in first, chief.", 'info');
      Router.go('auth');
      return false;
    }
    return true;
  }
};

// ── ROUTER ─────────────────────────────────────────────────
const Router = {
  routes: ['home','auth','admin','article'],

  init() {
    const hash = location.hash.replace('#','') || 'home';
    this.go(hash, false);
    window.addEventListener('hashchange', () => {
      const page = location.hash.replace('#','') || 'home';
      this.go(page, false);
    });
  },

  go(page, updateHash = true) {
    if (updateHash) location.hash = page;
    FB.currentPage = page;

    // Hide all pages
    document.querySelectorAll('[data-page]').forEach(el => el.classList.add('hidden'));

    const target = document.querySelector(`[data-page="${page}"]`);
    if (target) target.classList.remove('hidden');

    // Special page setups
    if (page === 'home')  Pages.renderHome();
    if (page === 'admin') Pages.renderAdmin();
    if (page === 'auth')  Pages.renderAuth();

    Nav.update();
    window.scrollTo(0, 0);
  }
};

// ── NAV ────────────────────────────────────────────────────
const Nav = {
  update() {
    const u = FB.currentUser;
    document.getElementById('nav-auth-link').innerHTML = u
      ? `<span style="color:#888; font-family:'Space Mono',monospace; font-size:12px;">${u.avatar} ${u.name}</span>`
      : '<a href="#auth" class="nav-links-a">Login / Sign Up</a>';

    const adminLink = document.getElementById('nav-admin-link');
    if (adminLink) adminLink.style.display = u?.isAdmin ? 'block' : 'none';

    const logoutBtn = document.getElementById('nav-logout');
    if (logoutBtn) logoutBtn.style.display = u ? 'flex' : 'none';
  }
};

// ── TOAST ──────────────────────────────────────────────────
const Toast = {
  container: null,

  init() {
    this.container = document.createElement('div');
    this.container.className = 'toast-container';
    document.body.appendChild(this.container);
  },

  show(msg, type = 'info') {
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = msg;
    this.container.appendChild(el);
    setTimeout(() => el.remove(), 3800);
  }
};

// ── AI ARTICLE ENGINE ──────────────────────────────────────
const AIEngine = {
  statuses: [
    "📡 Hacking into the YouTube mainframe...",
    "🎙️ Transcribing 400 'to be fairs'...",
    "🤖 Asking the AI to have opinions...",
    "✂️ Cutting out 'SMASH THAT LIKE BUTTON'...",
    "🧠 Translating football man to English...",
    "☕ Hot takes brewing at dangerous temperatures...",
    "⚽ Summoning the spirit of Martin Tyler...",
    "📝 Writing headlines that aren't clickbait (failing)...",
    "🔍 Fact-checking: 1 fact found, 0 checked...",
    "✨ Polishing until it sparkles like a new kit..."
  ],

  async generateFromSource(sourceText, sourceName, tone, length) {
    const toneMap = {
      banter: 'absolute banter — witty, sharp, football-fan humour with jokes',
      serious: 'serious football journalism with analysis and insight',
      tactical: 'tactical deep-dive with formations, pressing patterns, and analysis',
      fan: "passionate supporter's perspective, emotional and authentic"
    };
    const lengthMap = { short: '200-300 words', medium: '400-500 words', long: '600-800 words' };

    const prompt = `You are FutbolBantz, Britain's most entertaining Premier League football blog. 

Write a blog article based on this football content source: "${sourceName}"

Content/Topic/Transcript: "${sourceText}"

Tone: ${toneMap[tone] || toneMap.banter}
Length: ${lengthMap[length] || lengthMap.medium}

Respond ONLY with valid JSON (no markdown, no backticks, no preamble):
{
  "title": "Punchy, funny headline under 12 words",
  "tag": "one of: Match Report | Hot Take | Banter | Transfers | Tactical | Opinion",
  "summary": "Two punchy sentences (the lede). Make it sing.",
  "keypoints": ["Point 1", "Point 2", "Point 3", "Point 4", "Point 5"],
  "conclusion": "One killer closing line. Funny or insightful — your call.",
  "fullBody": "The full article body (${lengthMap[length] || lengthMap.medium}). Multiple paragraphs. No headers. Pure football writing."
}`;

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (!resp.ok) throw new Error(`API error: ${resp.status}`);
    const data = await resp.json();
    let raw = data.content?.map(b => b.text || '').join('') || '';
    raw = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(raw);
  }
};

// ── PAGE RENDERERS ─────────────────────────────────────────
const Pages = {

  renderHome() {
    const grid = document.getElementById('articles-grid');
    const featured = document.getElementById('featured-article');
    const sidebar = document.getElementById('sidebar-articles');
    if (!grid) return;

    const published = FB.articles.filter(a => a.published).sort((a,b) => new Date(b.date)-new Date(a.date));

    if (featured && published.length > 0) {
      const f = published[0];
      featured.innerHTML = `
        <div class="card card-dark" style="height:100%; cursor:pointer; position:relative; overflow:hidden;" onclick="Pages.openArticle('${f.id}')">
          <div class="diag-badge">MUST READ!</div>
          <div style="padding:32px; height:100%; display:flex; flex-direction:column; justify-content:space-between;">
            <div>
              <div class="flex gap-8 mb-16"><span class="tag tag-mustard">${f.tag}</span></div>
              <h2 style="font-size:52px; color:var(--cream); margin-bottom:16px; line-height:0.92;">${f.title}</h2>
              <p style="color:#aaa; font-size:15px; line-height:1.7; font-style:italic;">${f.summary}</p>
            </div>
            <div style="border-top:2px solid rgba(255,255,255,0.15); padding-top:16px; margin-top:20px; display:flex; justify-content:space-between; align-items:center;">
              <span style="font-family:'Space Mono',monospace; font-size:11px; color:#666;">📺 ${f.channel} • ${Pages.timeAgo(f.date)}</span>
              <button class="btn btn-mustard btn-sm">Read the Rant →</button>
            </div>
          </div>
        </div>`;
    }

    if (sidebar && published.length > 1) {
      sidebar.innerHTML = published.slice(1,5).map((a,i) => `
        <div class="sidebar-item" onclick="Pages.openArticle('${a.id}')">
          <span class="sidebar-num">${String(i+1).padStart(2,'0')}</span>
          <div>
            <span class="tag tag-${i%2===0?'mustard':'orange'} mb-8">${a.tag}</span>
            <div style="font-family:'Archivo Black',sans-serif; font-size:15px; line-height:1.2; margin-top:4px;">${a.title}</div>
            <div style="font-family:'Space Mono',monospace; font-size:11px; color:#888; margin-top:4px;">${a.channel} • ${Pages.timeAgo(a.date)} • 👁 ${a.views?.toLocaleString()}</div>
          </div>
        </div>`).join('');
    }

    if (grid) {
      const rest = published.slice(5);
      if (rest.length === 0) {
        grid.innerHTML = published.slice(0,3).map(a => Pages.articleCard(a)).join('');
      } else {
        grid.innerHTML = rest.map(a => Pages.articleCard(a)).join('');
      }
    }
  },

  articleCard(a) {
    const tagColors = { 'Match Report':'mustard', 'Hot Take':'orange', 'Banter':'mustard', 'Transfers':'charcoal', 'Tactical':'orange', 'Opinion':'charcoal' };
    const tc = tagColors[a.tag] || 'mustard';
    return `
      <div class="card" style="cursor:pointer;" onclick="Pages.openArticle('${a.id}')">
        <div style="background:var(--charcoal); padding:6px 16px; display:flex; justify-content:space-between; align-items:center;">
          <span class="tag tag-${tc}">${a.tag}</span>
          <span style="font-family:'Space Mono',monospace; font-size:10px; color:#888;">${Pages.timeAgo(a.date)}</span>
        </div>
        <div style="padding:20px;">
          <h3 style="font-size:24px; margin-bottom:10px; line-height:1.05;">${a.title}</h3>
          <p style="font-size:13px; color:#666; line-height:1.7; font-style:italic; margin-bottom:16px;">${a.summary.substring(0,130)}...</p>
          <div style="display:flex; justify-content:space-between; align-items:center; border-top:2px solid var(--charcoal); padding-top:12px;">
            <span style="font-family:'Space Mono',monospace; font-size:10px; color:#888;">📺 ${a.channel}</span>
            <span style="font-family:'Space Mono',monospace; font-size:10px; color:#888;">👁 ${a.views?.toLocaleString()}</span>
          </div>
        </div>
      </div>`;
  },

  openArticle(id) {
    const a = FB.articles.find(x => x.id === id);
    if (!a) return;
    a.views = (a.views || 0) + 1;
    FB.saveArticles();

    const page = document.getElementById('article-page');
    if (!page) return;

    page.innerHTML = `
      <div style="max-width:820px; margin:0 auto; padding:40px 32px;">
        <button class="btn btn-outline btn-sm mb-24" onclick="Router.go('home')">← Back to Bantz</button>
        <div style="margin-bottom:20px; display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
          <span class="tag tag-mustard">${a.tag}</span>
          <span style="font-family:'Space Mono',monospace; font-size:11px; color:#888;">📺 ${a.channel} • ${Pages.timeAgo(a.date)} • ☕ ~3 min read</span>
        </div>
        <h1 style="font-size:64px; line-height:0.92; margin-bottom:24px;">${a.title}</h1>
        <div class="speech-bubble mb-32" style="max-width:560px;">
          <p style="font-size:16px; font-style:italic; line-height:1.8; color:var(--charcoal);">"${a.summary}"</p>
          <p style="font-family:'Space Mono',monospace; font-size:11px; color:#888; margin-top:8px;">— FutbolBantz Editorial Team</p>
        </div>
        <div style="font-size:16px; line-height:1.9; color:#333; margin-bottom:28px;">
          ${a.fullBody || a.keypoints.map(k=>`<p style="margin-bottom:16px;">${k}</p>`).join('')}
        </div>
        <div style="background:var(--charcoal); border:var(--border-thick); border-radius:var(--radius); padding:24px; box-shadow:var(--shadow);">
          <h3 style="color:var(--mustard); font-size:22px; margin-bottom:16px;">The Key Points (For Those Who Skipped)</h3>
          <ul class="key-points">
            ${a.keypoints.map(k=>`<li style="color:var(--cream);">${k}</li>`).join('')}
          </ul>
          <div style="border-top:2px solid rgba(255,255,255,0.15); padding-top:16px; margin-top:16px;">
            <p style="font-family:'Space Mono',monospace; font-size:13px; color:var(--mustard); font-style:italic;">"${a.conclusion}"</p>
          </div>
        </div>
        <div style="margin-top:32px; padding:20px; border:var(--border); border-radius:var(--radius); background:var(--cream-dk); text-align:center;">
          <p style="font-family:'Archivo Black',sans-serif; font-size:14px; text-transform:uppercase; letter-spacing:1px; margin-bottom:12px;">Enjoyed this nonsense?</p>
          <div style="display:flex; gap:12px; justify-content:center; flex-wrap:wrap;">
            <button class="btn btn-mustard btn-sm">🔥 Share This Banger</button>
            <button class="btn btn-outline btn-sm" onclick="Router.go('home')">Read More Bantz →</button>
          </div>
        </div>
      </div>`;

    Router.go('article');
  },

  timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff/60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins/60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs/24)}d ago`;
  },

  renderAuth() {
    const emailIn = document.getElementById('auth-email');
    const passIn  = document.getElementById('auth-password');
    if (emailIn) emailIn.value = '';
    if (passIn)  passIn.value = '';
  },

  renderAdmin() {
    if (!Auth.requireAdmin()) return;
    this.updateAdminStats();
    this.renderAdminArticles();
  },

  updateAdminStats() {
    const published = FB.articles.filter(a=>a.published).length;
    const totalViews = FB.articles.reduce((s,a)=>s+(a.views||0),0);
    const el = (id,v) => { const e=document.getElementById(id); if(e) e.textContent=v; };
    el('stat-articles', published);
    el('stat-views', totalViews.toLocaleString());
    el('stat-users', FB.users.length);
    el('stat-channels', '12');
  },

  renderAdminArticles() {
    const list = document.getElementById('admin-articles-list');
    if (!list) return;
    const sorted = [...FB.articles].sort((a,b)=>new Date(b.date)-new Date(a.date));
    list.innerHTML = sorted.map(a=>`
      <div class="card mb-16" style="cursor:default;">
        <div style="padding:16px 20px; display:flex; align-items:center; justify-content:space-between; gap:16px; flex-wrap:wrap;">
          <div style="flex:1; min-width:200px;">
            <div class="flex gap-8 mb-8"><span class="tag tag-${a.published?'mustard':'charcoal'}">${a.published?'✅ Live':'⏸ Draft'}</span><span class="tag tag-orange">${a.tag}</span></div>
            <div style="font-family:'Archivo Black',sans-serif; font-size:15px;">${a.title}</div>
            <div style="font-family:'Space Mono',monospace; font-size:10px; color:#888; margin-top:4px;">${a.channel} • ${Pages.timeAgo(a.date)} • 👁 ${(a.views||0).toLocaleString()} views</div>
          </div>
          <div class="flex gap-8" style="flex-shrink:0;">
            <button class="btn btn-sm btn-outline" onclick="Pages.openArticle('${a.id}'); Router.go('article');">👁 View</button>
            <button class="btn btn-sm ${a.published?'btn-charcoal':'btn-mustard'}" onclick="Admin.togglePublish('${a.id}')">${a.published?'Unpublish':'Publish'}</button>
            <button class="btn btn-sm" style="background:var(--orange);color:white;box-shadow:var(--shadow-sm);" onclick="Admin.deleteArticle('${a.id}')">🗑 Delete</button>
          </div>
        </div>
      </div>`).join('') || '<p style="text-align:center;color:#888;padding:40px;font-style:italic;">No articles yet. Generate some from the Video Machine! 🎬</p>';
  }
};

// ── ADMIN ACTIONS ──────────────────────────────────────────
const Admin = {
  togglePublish(id) {
    const a = FB.articles.find(x=>x.id===id);
    if (a) { a.published = !a.published; FB.saveArticles(); Pages.renderAdminArticles(); Pages.updateAdminStats(); Toast.show(a.published ? '✅ Article published!' : '⏸ Article unpublished.', a.published?'success':'info'); }
  },

  deleteArticle(id) {
    if (!confirm('Delete this article? Gone forever, like Spurs\' title hopes.')) return;
    FB.articles = FB.articles.filter(x=>x.id!==id);
    FB.saveArticles();
    Pages.renderAdminArticles();
    Pages.updateAdminStats();
    Toast.show('🗑 Article deleted.', 'error');
  },

  async generateFromVideo() {
    const sources = Array.from(document.querySelectorAll('.video-source-input')).map(i=>i.value.trim()).filter(Boolean);
    const tone   = document.getElementById('gen-tone')?.value || 'banter';
    const length = document.getElementById('gen-length')?.value || 'medium';
    const btn    = document.getElementById('generate-btn');
    const results = document.getElementById('gen-results');
    const statusEl = document.getElementById('gen-status');

    if (sources.length === 0) { Toast.show('Add at least one video URL or topic!', 'error'); return; }

    btn.disabled = true;
    btn.textContent = '⏳ Generating...';
    results.innerHTML = '';

    let statusIdx = 0;
    const statuses = AIEngine.statuses;
    statusEl.textContent = statuses[0];
    const interval = setInterval(()=>{ statusIdx=(statusIdx+1)%statuses.length; statusEl.textContent=statuses[statusIdx]; }, 1600);

    // progress bar
    const pb = document.getElementById('gen-progress');
    if (pb) { pb.style.display='block'; pb.querySelector('.progress-fill').style.animation='progress-stripes 0.8s linear infinite, progress-grow 8s ease-out forwards'; }

    for (const src of sources) {
      try {
        const result = await AIEngine.generateFromSource(src, src, tone, length);
        const article = {
          id: 'a'+Date.now()+Math.random().toString(36).slice(2,6),
          title: result.title, tag: result.tag,
          channel: src.includes('@') ? src : '📺 FutbolBantz',
          summary: result.summary, keypoints: result.keypoints,
          conclusion: result.conclusion, fullBody: result.fullBody,
          date: new Date().toISOString(), published: false, views: 0
        };
        FB.articles.unshift(article);
        FB.saveArticles();

        // Render result card
        const card = document.createElement('div');
        card.className = 'article-result';
        card.innerHTML = `
          <div class="article-result-header">
            <div class="flex gap-8"><span class="tag tag-orange">${article.tag}</span><span style="font-family:'Space Mono',monospace;font-size:11px;color:#888;">⏸ Draft — not published yet</span></div>
            <div class="flex gap-8">
              <button class="btn btn-mustard btn-sm" onclick="Admin.togglePublish('${article.id}'); this.textContent='✅ Published!'; this.disabled=true;">🚀 Publish</button>
              <button class="btn btn-sm btn-charcoal" onclick="Pages.openArticle('${article.id}'); Router.go('article');">Preview</button>
            </div>
          </div>
          <div class="article-result-body">
            <h3>${article.title}</h3>
            <p><em>${article.summary}</em></p>
            <ul class="key-points">${article.keypoints.map(k=>`<li>${k}</li>`).join('')}</ul>
            <div style="background:var(--mustard);border:var(--border);border-radius:var(--radius);padding:12px 16px;box-shadow:var(--shadow-sm);">
              <p style="font-family:'Space Mono',monospace;font-size:13px;"><strong>Conclusion:</strong> ${article.conclusion}</p>
            </div>
          </div>`;
        results.appendChild(card);
        Pages.updateAdminStats();
      } catch(e) {
        Toast.show(`Error generating for "${src}": ${e.message}`, 'error');
        console.error(e);
      }
    }

    clearInterval(interval);
    statusEl.textContent = `✅ Done! Generated ${sources.length} article(s). Review and publish above.`;
    if (pb) pb.style.display='none';
    btn.disabled = false;
    btn.textContent = '⚡ Generate Articles';
    Toast.show(`🎉 ${sources.length} article(s) created!`, 'success');
    Pages.renderAdminArticles();
  },

  addVideoSource() {
    const list = document.getElementById('video-sources-list');
    const div = document.createElement('div');
    div.style.cssText = 'display:flex;gap:10px;align-items:center;animation:popIn 0.2s ease;';
    div.innerHTML = `<input class="form-input video-source-input" placeholder="YouTube URL, @channel, or topic (e.g. 'Arsenal vs Man City analysis')" style="flex:1;">
      <button class="btn btn-sm" style="background:var(--orange);color:white;flex-shrink:0;" onclick="this.parentElement.remove()">✕</button>`;
    list.appendChild(div);
  }
};

// ── AUTH UI HANDLERS ───────────────────────────────────────
function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.toggle('active', t.dataset.tab===tab));
  document.getElementById('login-form').classList.toggle('hidden', tab!=='login');
  document.getElementById('register-form').classList.toggle('hidden', tab!=='register');
}

function doLogin() {
  const email = document.getElementById('login-email').value;
  const pass  = document.getElementById('login-pass').value;
  try {
    const user = Auth.login(email, pass);
    Toast.show(`🎉 Welcome back, ${user.name}! Right, let's get bantering.`, 'success');
    Router.go(user.isAdmin ? 'admin' : 'home');
  } catch(e) { Toast.show(e.message, 'error'); }
}

function doRegister() {
  const name    = document.getElementById('reg-name').value;
  const email   = document.getElementById('reg-email').value;
  const pass    = document.getElementById('reg-pass').value;
  const isAdmin = document.getElementById('reg-admin').checked;
  const code    = document.getElementById('reg-code').value;
  try {
    const user = Auth.register(name, email, pass, isAdmin, code);
    Toast.show(`🏆 Account created! Welcome to FutbolBantz, ${user.name}!`, 'success');
    Router.go(user.isAdmin ? 'admin' : 'home');
  } catch(e) { Toast.show(e.message, 'error'); }
}

function toggleAdminCode(show) {
  const row = document.getElementById('admin-code-row');
  if (row) row.classList.toggle('hidden', !show);
}

function switchAdminPanel(panel) {
  document.querySelectorAll('.admin-page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById(`admin-${panel}`);
  if (target) target.classList.add('active');
  document.querySelectorAll('.admin-nav-item').forEach(i => i.classList.toggle('active', i.dataset.panel===panel));
  document.getElementById('admin-page-title').textContent = {
    dashboard:'📊 Dashboard', generate:'⚡ Video Machine', articles:'📄 All Articles', users:'👥 Users'
  }[panel] || 'Admin';
}
