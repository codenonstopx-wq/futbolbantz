// ============================================================
// futbolbantz-supabase-auth.js
// Drop this into your HTML to replace localStorage auth
// with real Supabase Auth + live PL data from Supabase DB
// ============================================================

// 1. Add this to your <head>:
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>

// 2. Replace these with your actual Supabase project values:
const SUPABASE_URL  = 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_ANON = 'YOUR_ANON_PUBLIC_KEY';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

// ── AUTH: Replace the existing Auth object ─────────────────────────────────────
const Auth = {

  // Sign in with email + password
  async login(email, password) {
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    // Fetch profile (includes is_admin)
    const profile = await this._getProfile(data.user.id);
    FB.currentUser = { ...data.user, ...profile };
    Nav.update();
    return FB.currentUser;
  },

  // Register new user
  async register(name, email, password, isAdmin, adminCode) {
    if (isAdmin && adminCode !== 'BANTZ2024') throw new Error('Wrong admin code. Nice try.');
    const { data, error } = await sb.auth.signUp({
      email, password,
      options: { data: { name, avatar: isAdmin ? '👑' : '⚽', is_admin: isAdmin } }
    });
    if (error) throw new Error(error.message);
    Toast.show('✅ Check your email to confirm your account!', 'success');
    return data.user;
  },

  // Sign out
  async logout() {
    await sb.auth.signOut();
    FB.currentUser = null;
    Nav.update();
    Router.go('home');
  },

  // Get current session on page load
  async init() {
    const { data: { session } } = await sb.auth.getSession();
    if (session) {
      const profile = await this._getProfile(session.user.id);
      FB.currentUser = { ...session.user, ...profile };
    }
    // Listen for auth changes
    sb.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        const profile = await this._getProfile(session.user.id);
        FB.currentUser = { ...session.user, ...profile };
      } else {
        FB.currentUser = null;
      }
      Nav.update();
    });
  },

  // Fetch profile from profiles table
  async _getProfile(userId) {
    const { data } = await sb.from('profiles').select('*').eq('id', userId).single();
    return data || { name: 'Fan', avatar: '⚽', is_admin: false };
  },

  requireAdmin() {
    if (!FB.currentUser?.is_admin) {
      Toast.show('🚫 Admins only!', 'error');
      Router.go('auth');
      return false;
    }
    return true;
  },

  requireAuth() {
    if (!FB.currentUser) {
      Toast.show('Log in first, chief.', 'info');
      Router.go('auth');
      return false;
    }
    return true;
  }
};

// ── ARTICLES: Load from Supabase instead of localStorage ──────────────────────
const ArticlesDB = {

  async getPublished() {
    const { data, error } = await sb
      .from('articles')
      .select('*')
      .eq('published', true)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async getAll() {
    const { data, error } = await sb
      .from('articles')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async save(article) {
    const { data, error } = await sb
      .from('articles')
      .upsert(article)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async togglePublish(id, published) {
    const { error } = await sb
      .from('articles')
      .update({ published })
      .eq('id', id);
    if (error) throw error;
  },

  async delete(id) {
    const { error } = await sb.from('articles').delete().eq('id', id);
    if (error) throw error;
  },

  async incrementViews(id) {
    await sb.rpc('increment_views', { article_id: id });
  }
};

// ── PL DATA: Load from Supabase ───────────────────────────────────────────────
const PLData = {

  async getStandings() {
    const { data } = await sb
      .from('pl_standings')
      .select('*')
      .order('position');
    return data || [];
  },

  async getResults() {
    const { data } = await sb
      .from('pl_results')
      .select('*')
      .order('match_date', { ascending: false })
      .limit(8);
    return data || [];
  },

  async getFixtures() {
    const { data } = await sb
      .from('pl_fixtures')
      .select('*')
      .order('match_date')
      .limit(10);
    return data || [];
  },

  async getTopScorers() {
    const { data } = await sb
      .from('pl_scorers')
      .select('*')
      .order('position')
      .limit(8);
    return data || [];
  },

  async getLastUpdated() {
    const { data } = await sb
      .from('pl_meta')
      .select('last_updated, season')
      .eq('id', 1)
      .single();
    return data;
  }
};

// ── REALTIME: Subscribe to article changes ────────────────────────────────────
// This makes the home page update live when admin publishes an article
function subscribeToArticles(callback) {
  return sb
    .channel('articles')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'articles' },
      callback
    )
    .subscribe();
}

// ── INCREMENT VIEWS RPC (run this in Supabase SQL editor) ─────────────────────
/*
create or replace function increment_views(article_id uuid)
returns void as $$
  update articles set views = views + 1 where id = article_id;
$$ language sql security definer;
*/
